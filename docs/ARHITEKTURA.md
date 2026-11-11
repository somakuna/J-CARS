# J-CARS – arhitektura i plan implementacije

Ovaj dokument je tehnička osnova projekta: struktura, baza, arhitektura, faze i potrebni servisi.
Specifikacija funkcionalnosti nalazi se u [J-CARS.md](../J-CARS.md).

---

## 1. Struktura projekta

```
J-CARS/
├─ api/                         Vercel serverless funkcije (Node) – SAMO serverska logika
│  ├─ _lib/                     zajednički serverski kod (Supabase admin klijent, push, podsjetnici)
│  ├─ cron/check-deadlines.ts   dnevna provjera rokova (Vercel Cron)
│  └─ notifications/
│     └─ test.ts                probna push obavijest (web-push + VAPID)
├─ shared/                      kod koji koriste i frontend i api (izračun rokova, statusi, datumi)
├─ public/                      statične datoteke: logo, PWA ikone
├─ src/
│  ├─ components/
│  │  ├─ layout/                AppLayout, bočna i donja navigacija, + gumb
│  │  └─ ui/                    Button, Card, StatusBadge, EmptyState, PageHeader, StatCard…
│  ├─ pages/                    ekrani (Nadzorna ploča, Vozila, Kalendar, Aktivnosti, Postavke…)
│  ├─ data/                     pristup Supabase bazi (upiti po entitetima) – od Faze 2
│  ├─ hooks/                    React hookovi (podaci, push pretplata…)
│  ├─ lib/                      tema, datumi, statusi, CSV izvoz, Supabase klijent
│  ├─ types/                    TypeScript tipovi baze
│  └─ main.tsx                  ulaz; registracija Service Workera (public/sw.js)
├─ supabase/migrations/         SQL migracije (tablice, indeksi, RLS)
├─ docs/ARHITEKTURA.md
├─ vercel.json                  rewrites za SPA + raspored Cron zadatka
└─ .env.example                 popis potrebnih varijabli okruženja
```

## 2. Arhitektura

```
 Preglednik / instalirana PWA                     Vercel                         Supabase
┌──────────────────────────────┐   HTTPS   ┌────────────────────────┐   ┌──────────────────────┐
│ React SPA (Vite, Tailwind)   │──────────▶│ statični build (dist)  │   │ Auth (više korisnika) │
│  • supabase-js (anon ključ)  │───────────┼────────────────────────┼──▶│ PostgreSQL + RLS      │
│  • Service Worker (push)     │           │ /api/* serverless      │──▶│                       │
└──────────────────────────────┘           │  • service role ključ  │   └──────────────────────┘
              ▲                                          │      Web Push (VAPID)      │  • VAPID privatni ključ│──▶ Push servisi (FCM, APNs, Mozilla)
              └────────────────────────────│ Vercel Cron 1×/dan     │
                                           └────────────────────────┘
```

**Načela**

- **CRUD ide izravno iz preglednika u Supabase** uz anon ključ. Sigurnost osigurava Row Level Security – svaki red ima `user_id` i dostupan je samo korisniku koji ga je unio. Korisnike dodaje administrator u Supabaseu.
- **Sve osjetljivo radi se na serveru** (`/api/*`): slanje push obavijesti, dnevna provjera. Secret ključ i VAPID privatni ključ postoje samo kao Vercel varijable okruženja.
- **Izvedeni podaci vozila računaju se u bazi**, ne u aplikaciji. Pogled `vehicle_overview` iz aktivnosti izračunava stvarni istek registracije, trenutne gume, kilometražu, zadnji i sljedeći servis. Zato brisanje ili ispravak aktivnosti nikad ne ostavlja neispravne podatke u profilu vozila.
- **Dnevna provjera** (`/api/cron/check-deadlines`) poziva Vercel Cron jednom dnevno, zaštićena tajnim `CRON_SECRET`. Radi neovisno o tome je li aplikacija otvorena.
- **Bez nepotrebnih slojeva**: nema vlastitog REST API-ja za CRUD, nema globalnog state managera. Za dohvat i keširanje podataka koristi se TanStack Query.

## 3. Baza podataka (prijedlog)

Sve tablice imaju `user_id uuid not null default auth.uid()` → RLS pravilo `user_id = auth.uid()`.
Javna registracija u Supabase Auth je isključena; korisnike dodaje administrator (Supabase → Authentication → Users → Add user, uz „Auto Confirm User”). Svaki korisnik vidi samo svoja vozila i aktivnosti.

### `vehicles`
| stupac | tip | napomena |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| user_id | uuid | FK `auth.users`, RLS |
| make, model | text not null | |
| registration_number | text not null | jedinstveno po korisniku, spremljeno velikim slovima |
| year | smallint null | check 1950 – tekuća godina + 1 |
| current_mileage | integer null | ručno unesena kilometraža, check ≥ 0 |
| registration_expiry | date not null | datum unesen pri dodavanju vozila (početna vrijednost) |
| responsible_person | text null | |
| note | text null | |
| is_active | boolean default true | za karticu „aktivna vozila” i filtriranje |
| created_at, updated_at | timestamptz | `updated_at` puni okidač |

`current_tire_type` iz specifikacije **ne sprema se** kao stupac nego se izračunava u pogledu iz zadnje promjene guma. Tako brisanje promjene guma automatski vraća prethodno stanje.

### `activities`
| stupac | tip | napomena |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | RLS |
| vehicle_id | uuid not null | FK `vehicles` **on delete cascade** |
| activity_type | text | check: `registration`, `tires`, `service`, `other` |
| title | text null | obavezno za `other` (check) |
| description | text null | napomena / opis radova |
| activity_date | date not null | |
| mileage | integer null | check ≥ 0 |
| registration_expiry | date null | obavezno za `registration` (check) |
| tire_type | text null | check: `summer`, `winter`, `all_season`; obavezno za `tires` |
| tire_size | text null | |
| service_type | text null | check: `minor`, `major`, `repair`, `other`; obavezno za `service` |
| next_service_date | date null | |
| next_service_mileage | integer null | |
| reminder_enabled | boolean default false | podsjetnik za `other` aktivnosti s budućim datumom |
| created_at, updated_at | timestamptz | |

Indeksi: `(vehicle_id, activity_date desc)`, `(activity_type, activity_date)`.

### Pogled `vehicle_overview` (security_invoker)
Za svako vozilo vraća sve stupce iz `vehicles` i dodatno:
- `effective_registration_expiry` = najkasniji od datuma na vozilu i datuma iz aktivnosti registracije,
- `current_tire_type`, `current_tire_size`, `last_tire_change_date` – iz zadnje promjene guma,
- `effective_mileage` = najveća od ručno unesene i kilometraža iz aktivnosti,
- `last_service_date`, `last_service_mileage`, `next_service_date`, `next_service_mileage` – iz zadnjeg servisa.

### `settings` (jedan red po korisniku)
`id, user_id (unique), email_address, email_notifications_enabled, push_notifications_enabled, reminder_30_days, reminder_14_days, reminder_7_days, reminder_1_day, reminder_on_expiry, theme ('system'|'light'|'dark'), created_at, updated_at`

### `push_subscriptions`
`id, user_id, endpoint (unique), p256dh, auth, device_info, created_at, updated_at, last_success_at`
Nevažeće pretplate (HTTP 404/410 od push servisa) brišu se automatski.

### `notification_logs`
`id, user_id, vehicle_id (on delete cascade), activity_id (on delete set null), deadline_type ('registration'|'service'|'activity'), deadline_date, reminder_interval (30|14|7|1|0), notification_type ('email'|'push'), recipient, sent_at, status ('sent'|'failed'|'skipped'), error_message`

**Sprječavanje dvostrukog slanja:** djelomični jedinstveni indeks
`unique (vehicle_id, deadline_type, coalesce(activity_id, …), deadline_date, reminder_interval, notification_type) where status = 'sent'`.
Ako se rok promijeni (npr. nova registracija), mijenja se `deadline_date` pa podsjetnici kreću ispočetka.

### Prilozi – uklonjeno
Prilozi (PDF/fotografije) bili su u specifikaciji, ali ih korisnik ne treba (odluka 11.11.2026.).
Migracija `20261111000002_remove_attachments.sql` uklanja stupac `attachment_path` i pravila za bucket `attachments`.
Bucket je obrisan ručno u Dashboardu.

### Boja i slika vozila – isprobano pa uklonjeno
Migracija `20261111000003` dodala je boju vozila i sliku modela (CarImages API), a `20261111000004` ih uklanja:
besplatni plan na svaku sliku stavlja vodeni žig, pa korisnik ne želi tu funkciju (11.11.2026.).

## 4. Logika rokova i statusa

| Status | Uvjet | Boja |
|---|---|---|
| U redu | više od 30 dana do roka | zelena |
| Približava se | 8 – 30 dana | narančasta |
| Hitno / isteklo | 7 dana ili manje, odnosno rok prošao | crvena |

Rokovi koji se prate: istek registracije, sljedeći servis po datumu (iz zadnjeg servisa), aktivnosti „Ostalo” s uključenim podsjetnikom.
Servis po kilometraži: upozorenje u sučelju kad je do zadane kilometraže ostalo 1.000 km ili manje.

**Dnevna provjera** za svaki rok bira najmanji uključeni interval (30/14/7/1/0) koji je dosegnut i šalje obavijest samo ako za taj interval još nije poslana. Ako se provjera jedan dan ne izvrši, sljedeći dan šalje propušteni podsjetnik umjesto da ga preskoči, a nikad ne šalje više podsjetnika odjednom.
„Danas” se računa u vremenskoj zoni Europe/Zagreb.

Obveze se računaju na jednom mjestu – `shared/obligations.ts` (nadzorna ploča sada, dnevna provjera obavijesti u Fazi 6):
istek registracije i sljedeći servis za **aktivna** vozila te aktivnosti „Ostalo” s današnjim ili budućim datumom.
Servis zadan i datumom i kilometražom dobiva lošiji od dva statusa. Nadzorna ploča prikazuje istekle/hitne rokove
i rokove u sljedećih 60 dana; kalendar uz rokove prikazuje sve aktivnosti (i neaktivnih vozila, kao povijest).

### Slanje podsjetnika (Faza 6)
`shared/reminders.ts`: za svaku obvezu s datumom bira se **najmanji uključeni interval koji je dosegnut**
(dana do roka ≤ interval: 30/14/7/1/0) i šalje se samo ako u `notification_logs` za isti rok, interval i kanal
još nema zapisa sa statusom `sent`. Propušteni dan ne gubi podsjetnik, a isti se nikad ne šalje dvaput;
istekli rok dobije najviše jedan zaostali podsjetnik. Servis zadan samo kilometražom nema push – upozorenje je u aplikaciji.
Jedan korisnik dobiva **jednu** push poruku dnevno (na svaki uređaj) sa svim rokovima. Svaka stavka se bilježi (`sent`/`failed`).
Push pretplate koje push servis odbije s 404/410 brišu se automatski.



| Faza | Sadržaj | Status |
|---|---|---|
| 1 | Vite + React + TS, Tailwind, dizajn sustav, tema, navigacija, responsive layout | ✅ |
| 2 | Supabase klijent, migracije (tablice, pogled, RLS, storage), prijava administratora, zaštita ruta | ✅ |
| 3 | Vozila: dodavanje, uređivanje, brisanje, popis, pretraga, filtri, profil | ✅ |
| 4 | Aktivnosti: 4 vrste, jedinstveni obrazac, povijest, uređivanje/brisanje (prilozi uklonjeni na zahtjev) | ✅ |
| 5 | Nadzorna ploča (statistike, obveze), kalendar (mjesečni prikaz, nadolazeće, prošlo) | ✅ |
| 6 | Postavke obavijesti, Web Push, Service Worker, dnevni Cron, evidencija (e-mail/Resend kasnije uklonjen) | ✅ |
| 7 | PWA: manifest, ikone, splash, instalacija, iOS napomene | ✅ |
| 8 | Testiranje, sigurnosna provjera, CSV/JSON izvoz, Vercel deployment | ✅ |

### Izvoz podataka (Faza 8)

Postavke → Izvoz podataka (`/postavke/izvoz`):

- **Vozila (CSV)** i **Aktivnosti (CSV)** – za Excel u hrvatskim postavkama: odvajanje `;`, UTF-8 s BOM-om, datumi DD.MM.YYYY,
  kilometri kao brojevi bez razdjelnika. Tekst koji počinje s `= + - @` dobiva apostrof (zaštita od CSV injectiona).
- **Sigurnosna kopija (JSON)** – izvorni zapisi (`vehicles`, `activities`, `settings`, `notification_logs`) s oznakom
  `format: "j-cars-backup"`, `version: 1`. Push pretplate se ne izvoze (vezane su uz uređaj i sadrže njegove ključeve).
- Dohvat ide po stranicama od 1000 redaka (ograničenje Supabasea), datoteka se izrađuje u pregledniku.
  Na iPhoneu/iPadu otvara se izbornik „Dijeli” (spremanje u Datoteke), drugdje obično preuzimanje.

### Samo push obavijesti, više korisnika (nakon Faze 8)

- E-mail obavijesti (Resend) uklonjene: migracija `20261111000005` briše `settings.email_address`,
  `settings.email_notifications_enabled` i e-mail zapise u evidenciji; `notification_type` može biti samo `push`.
- Varijable `RESEND_API_KEY`, `EMAIL_FROM` i `APP_URL` više nisu potrebne.
- Stanje „Uključeno na ovom uređaju” vrijedi samo ako pretplata pripada prijavljenom korisniku; ako ju je spremio drugi korisnik,
  pri uključivanju se izrađuje nova pretplata.
- U zaglavlju ispod „J-CARS” prikazuje se današnji datum (npr. „Srijeda, 11.11.2026”), osvježava se sam.

### Nove verzije instalirane aplikacije

- Service worker stranice učitava **prvo s mreže**, pa je svako pokretanje aplikacije (s internetom) odmah najnovija verzija;
  datoteke u `/assets` imaju hash u imenu, pa stare i nove ne mogu se pomiješati.
- Rupa: instalirana aplikacija može danima ostati otvorena u pozadini sa starim kodom. Zato build objavljuje `/version.json`
  (`{ build }`, ista oznaka kao `__BUILD_ID__` u kodu). Aplikacija ga provjerava pri povratku u prvi plan, kad se vrati veza
  i svakih 30 min; ako se razlikuje, prikazuje traku „Dostupna je nova verzija” s gumbom **Osvježi** (bez automatskog
  osvježavanja, da se ne izgubi napola ispunjen obrazac).
- Nakon izmjene `public/sw.js` treba povećati nazive spremišta (`jcars-shell-vN`, `jcars-assets-vN`).

### Sigurnosna provjera (Faza 8)

- RLS uključen na svim tablicama, pravila samo za `authenticated` i `(select auth.uid()) = user_id`;
  `anon` nema nikakve ovlasti; `vehicle_overview` je `security_invoker`.
- Registracija novih korisnika isključena (`disable_signup: true`), anonimna prijava isključena.
- Tajni ključevi samo u `/api` (provjereno pretraživanjem `dist/`), `.env.local` nije u Gitu.
- Cron: tajna se uspoređuje u konstantnom vremenu. Probne obavijesti: najviše jedna u 60 s (429).
- HTTP zaglavlja (`vercel.json`): `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy`, CSP `frame-ancestors 'none'`; `/api` bez predmemorije, `/assets` immutable.
- `npm audit`: 0 ranjivosti.

## 6. Računi, ključevi i servisi koje treba pripremiti

| Servis | Što treba | Gdje se koristi |
|---|---|---|
| **Supabase** (besplatni plan je dovoljan) | novi projekt; `Project URL`, publishable ključ (`sb_publishable_…`), secret ključ (`sb_secret_…`, zamjena za service_role); korisnici (Auth → Users → Add user); „Allow new users to sign up” ostaje isključeno | URL + publishable → frontend; secret → samo Vercel |
| **Vercel** | račun povezan s Git repozitorijem (GitHub/GitLab) | hosting + `/api` + Cron |
| **VAPID ključevi** | generiraju se jednom: `npx web-push generate-vapid-keys` | javni → frontend; privatni → samo Vercel |
| **CRON_SECRET** | nasumični niz od najmanje 16 znakova | zaštita Cron endpointa |
| **Git repozitorij** | za Vercel deployment | |

### Varijable okruženja

| Varijabla | Gdje | Tajna |
|---|---|---|
| `VITE_SUPABASE_URL` | frontend | ne |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend | ne (zaštićeno RLS-om) |
| `VITE_VAPID_PUBLIC_KEY` | frontend | ne |
| `SUPABASE_URL` | api | ne |
| `SUPABASE_SECRET_KEY` | api | **da** |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | api | privatni **da** |
| `CRON_SECRET` | api | **da** |

## 7. Push obavijesti – podrška po platformama

- **Android (Chrome, Edge, Samsung Internet, Firefox)**: rade u pregledniku i u instaliranoj PWA.
- **Windows / macOS / Linux (Chrome, Edge, Firefox, Safari 16+)**: rade u pregledniku i u instaliranoj aplikaciji.
- **iPhone / iPad (iOS/iPadOS 16.4+)**: rade **samo** ako je aplikacija dodana na početni zaslon (Safari → Dijeli → Dodaj na početni zaslon) i otvorena odatle. U običnoj kartici Safarija push nije dostupan. Dozvola se može zatražiti samo nakon dodira korisnika.
- Ako uređaj ne podržava push, aplikacija to jasno prikazuje u Postavke → Obavijesti. Podsjetnici se tada vide samo u aplikaciji (nadzorna ploča, kalendar).
- Pri odjavi se push na tom uređaju isključuje, kako drugi korisnik na istom uređaju ne bi dobivao tuđe podsjetnike.
