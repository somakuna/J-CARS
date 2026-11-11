# J-CARS – Aplikacija za evidenciju službenih vozila

## 1. Opis projekta

Izradi modernu, jednostavnu i responzivnu web aplikaciju pod nazivom **J-CARS** za evidenciju i praćenje službenih vozila.

Aplikacija mora biti razvijena kao **Progressive Web App (PWA)**, tako da se može instalirati na računalo, Android i iPhone te koristiti kao obična mobilna aplikacija.

Aplikaciju će koristiti samo jedna osoba – administrator. Nisu potrebni sustav zaposleničkih računa, različite korisničke uloge ni kompleksna prava pristupa.

Glavna svrha aplikacije je jednostavno praćenje:
- Vozila u vlasništvu ili korištenju tvrtke.
- Datuma registracije i isteka registracije.
- Stanja i promjena guma.
- Servisa i popravaka.
- Kilometraže.
- Ostalih aktivnosti vezanih uz vozila.
- Važnih rokova i podsjetnika.

Aplikacija mora biti jednostavna, pregledna, brza i prilagođena prvenstveno korištenju na mobitelu.

---

## 2. Tehnologije

Koristi sljedeće tehnologije:

- **Frontend:** React + Vite + TypeScript
- **CSS:** Tailwind CSS
- **Ikone:** Lucide React
- **Baza podataka:** Supabase PostgreSQL
- **Autentifikacija:** Supabase Auth
- **Pohrana dokumenata:** Supabase Storage
- **Hosting:** Vercel
- **E-mail obavijesti:** Resend API
- **Push obavijesti:** Web Push API + VAPID
- **PWA:** Service Worker + Web App Manifest
- **Automatske provjere rokova:** Vercel Cron ili odgovarajuće serversko zakazivanje zadataka.

Koristi aktualne stabilne verzije biblioteka i provjerene načine implementacije.

Nemoj koristiti nepotrebno kompliciranu arhitekturu.

---

## 3. Dizajn i korisničko sučelje

Dizajn treba biti moderan, minimalistički i profesionalan.

Vizualni smjer:
- Naziv aplikacije: J-CARS.
- Jednostavan logo ili tekstualni logotip J-CARS.
- Svijetla i tamna tema.
- Diskretne boje i jasna tipografija.
- Zaobljeni elementi i pregledne kartice.
- Jasno vidljivi statusi i rokovi.
- Lucide ikone.
- Bez nepotrebnih animacija i vizualnog nereda.

Aplikacija mora biti mobile-first, ali jednako dobro izgledati na desktop računalu.

Navigacija:
1. Nadzorna ploča
2. Vozila
3. Kalendar
4. Aktivnosti
5. Postavke

Na mobilnoj verziji koristi jednostavnu donju navigaciju ili drugi praktičan oblik navigacije.

Dodaj jasno vidljiv **+ gumb** za brzo dodavanje nove aktivnosti ili zapisa.

---

## 4. Nadzorna ploča

Početni ekran treba pružiti brz pregled stanja voznog parka.

Prikaži kartice sa sljedećim informacijama:

- Ukupan broj vozila.
- Broj aktivnih vozila.
- Registracije koje uskoro istječu.
- Istekle registracije.
- Nadolazeći servisi.
- Nedavne aktivnosti.

Prikaži i popis nadolazećih obveza s datumima.

Koristi sustav boja:
- Zeleno – sve je u redu.
- Narančasto – približava se rok.
- Crveno – rok je istekao ili je obveza hitna.

Klikom na pojedinu karticu ili obvezu treba biti moguće otvoriti detalje.

---

## 5. Evidencija vozila

Omogući dodavanje, uređivanje, pregled i brisanje vozila.

Svako vozilo treba imati sljedeća polja:

| Polje | Obavezno |
|---|---|
| Marka | Da |
| Model | Da |
| Registracijska oznaka | Da |
| Godina proizvodnje | Ne |
| Trenutna kilometraža | Ne |
| Datum isteka registracije | Da |
| Zadužena osoba / vozač | Ne |
| Napomena | Ne |

Nemoj dodavati VIN ili broj šasije.

Na popisu vozila prikaži:
- Marku i model.
- Registracijsku oznaku.
- Trenutnu kilometražu.
- Datum isteka registracije.
- Status registracije.
- Trenutno stanje guma.

Omogući pretraživanje i jednostavno filtriranje vozila.

---

## 6. Profil pojedinog vozila

Klikom na vozilo otvara se njegov detaljni profil.

Na vrhu profila prikaži:
- Marku i model.
- Registracijsku oznaku.
- Godinu proizvodnje.
- Trenutnu kilometražu.
- Zaduženu osobu.
- Datum isteka registracije.

Ispod prikaži pregled najvažnijih podataka:

- Registracija – datum isteka i status.
- Gume – trenutačno stanje i vrsta guma.
- Servis – datum i kilometraža posljednjeg servisa.
- Sljedeći planirani servis, ako postoji.

Na profilu mora biti vidljiva kronološka povijest svih aktivnosti vezanih uz vozilo.

Omogući uređivanje i brisanje pojedinih aktivnosti.

Dodaj vidljiv gumb **+ Dodaj aktivnost**.

---

## 7. Aktivnosti i evidencija

Sve aktivnosti moraju se unositi kroz jedan jednostavan sustav.

Prilikom dodavanja aktivnosti korisnik prvo bira vozilo, a zatim vrstu aktivnosti.

Podržane vrste aktivnosti:

### A) Registracija

Polja:
- Datum registracije.
- Datum isteka registracije.
- Napomena.
- Prilog (PDF ili fotografija).

Nakon spremanja automatski ažurirati datum isteka registracije u profilu vozila.

### B) Promjena guma

Polja:
- Datum promjene.
- Vrsta guma:
  - Ljetne.
  - Zimske.
  - Cjelogodišnje.
- Dimenzija guma (neobavezno).
- Kilometraža (neobavezno).
- Napomena.
- Fotografija (neobavezno).

Ažurirati trenutačno stanje guma na profilu vozila, ali zadržati sve prethodne promjene u povijesti.

### C) Servis

Polja:
- Datum servisa.
- Kilometraža.
- Vrsta servisa:
  - Mali servis.
  - Veliki servis.
  - Popravak.
  - Ostalo.
- Opis radova.
- Sljedeći servis po datumu (neobavezno).
- Sljedeći servis po kilometraži (neobavezno).
- Prilog (PDF ili fotografija).

### D) Ostalo

Za sve ostale aktivnosti koje nisu obuhvaćene prethodnim kategorijama.

Polja:
- Naslov aktivnosti.
- Datum.
- Opis.
- Kilometraža (neobavezno).
- Prilog (neobavezno).

Sve aktivnosti moraju biti povezane s odgovarajućim vozilom i prikazane u njegovoj povijesti.

---

## 8. Kalendar

Izradi poseban ekran za kalendarski pregled.

Omogući:
- Mjesečni prikaz.
- Popis nadolazećih događaja.
- Pregled prošlih aktivnosti.

U kalendaru prikazuj:
- Istek registracije.
- Planirane servise.
- Promjene guma.
- Ostale aktivnosti s datumom.

Koristi različite boje ili oznake za različite vrste događaja.

Klikom na događaj otvori detalje aktivnosti ili vozila.

---

## 9. Sustav obavijesti

Obavijesti su važan dio aplikacije i potrebno ih je predvidjeti već prilikom izrade baze podataka i arhitekture.

Implementirati dvije vrste obavijesti:

### A) E-mail obavijesti

Koristiti Resend API.

Omogućiti slanje e-mail obavijesti za:
- Približavanje isteka registracije.
- Planirane servise.
- Ostale aktivnosti koje imaju postavljen podsjetnik.

E-mail treba sadržavati:
- Naziv vozila.
- Registracijsku oznaku.
- Vrstu obveze.
- Datum roka.
- Koliko je dana preostalo.
- Kratku napomenu, ako postoji.

Dizajnirati jednostavan i pregledan HTML predložak e-maila.

### B) Push obavijesti

Koristiti Web Push API i VAPID autentifikaciju.

Push obavijesti moraju raditi putem PWA aplikacije, kada su podržane na uređaju i kada korisnik odobri dozvolu.

Implementirati:
- Service Worker.
- Registraciju push pretplate.
- Spremanje push pretplate u Supabase.
- Slanje push obavijesti s backend strane.
- Obradu nevažećih ili istečenih pretplata.

Ne oslanjati se na to da je aplikacija otvorena kako bi se podsjetnici slali.

### C) Vremenski podsjetnici

Početne vrijednosti podsjetnika:
- 30 dana prije roka.
- 14 dana prije roka.
- 7 dana prije roka.
- 1 dan prije roka.
- Na dan isteka.

Podsjetnike je potrebno moći zasebno uključiti ili isključiti.

Za planirane servise omogućiti podsjetnike prema datumu, a kada je definirana kilometraža, prikazati upozorenje kada se približava zadana kilometraža.

### D) Automatska provjera

Implementirati serverski zadatak koji se izvršava jednom dnevno.

Zadatak mora:
1. Provjeriti sve aktivne rokove.
2. Utvrditi koje obavijesti treba poslati.
3. Provjeriti je li određena obavijest već poslana.
4. Poslati e-mail i/ili push obavijest prema korisničkim postavkama.
5. Zabilježiti rezultat slanja.

Spriječiti višestruko slanje iste obavijesti za isti rok i isti interval podsjetnika.

Provjera mora raditi neovisno o tome je li aplikacija otvorena.

---

## 10. Postavke obavijesti

Izradi poseban ekran:

**Postavke → Obavijesti**

Na tom ekranu omogući:

- Unos i promjenu e-mail adrese za primanje obavijesti.
- Uključivanje i isključivanje e-mail obavijesti.
- Uključivanje i isključivanje push obavijesti.
- Zasebno uključivanje i isključivanje podsjetnika od 30, 14, 7 i 1 dan te na dan isteka.
- Gumb za testiranje e-mail obavijesti.
- Gumb za testiranje push obavijesti.
- Prikaz statusa push pretplate.
- Jasnu poruku ako preglednik ili uređaj ne podržava push obavijesti.

Sve postavke trajno spremati u Supabase.

Zahtjev za dozvolu push obavijesti prikazati na razumljiv način, a ne automatski bez objašnjenja.

---

## 11. Postavke aplikacije

Izradi jednostavan ekran postavki.

Uključiti:
- Postavke obavijesti.
- Svijetlu i tamnu temu.
- Osnovne podatke o aplikaciji.
- Izvoz podataka.
- Odjavu iz aplikacije.

---

## 12. Baza podataka – Supabase

Predvidjeti sljedeće tablice:

### vehicles
Podaci o vozilima:
- id
- make
- model
- registration_number
- year
- current_mileage
- registration_expiry
- responsible_person
- note
- current_tire_type
- created_at
- updated_at

### activities
Povijest svih aktivnosti:
- id
- vehicle_id
- activity_type
- title
- description
- activity_date
- mileage
- tire_type
- tire_size
- registration_expiry
- service_type
- next_service_date
- next_service_mileage
- attachment_path
- created_at
- updated_at

### settings
Postavke aplikacije:
- id
- email_address
- email_notifications_enabled
- push_notifications_enabled
- reminder_30_days
- reminder_14_days
- reminder_7_days
- reminder_1_day
- reminder_on_expiry
- theme
- created_at
- updated_at

### push_subscriptions
Podaci o push pretplatama:
- id
- endpoint
- p256dh
- auth
- device_info
- created_at
- updated_at

### notification_logs
Evidencija poslanih obavijesti:
- id
- vehicle_id
- activity_id
- notification_type
- reminder_interval
- recipient
- sent_at
- status
- error_message

Prilagodi strukturu ako je potrebno, ali zadrži jasne relacije i izbjegavaj nepotrebno dupliciranje podataka.

Postaviti odgovarajuće indekse, ograničenja i pravila integriteta podataka.

---

## 13. Sigurnost

Aplikacija ima samo jednog administratora.

Implementirati:
- Prijavu putem Supabase Auth.
- Zaštitu svih privatnih stranica.
- Row Level Security (RLS).
- Privatnu pohranu dokumenata i fotografija.
- Sigurno upravljanje API ključevima.

Nikada ne izlagati Supabase service role key, Resend API key ili VAPID privatni ključ u frontend kodu.

Sve osjetljive operacije obavljati na serverskoj strani.

---

## 14. PWA funkcionalnosti

Aplikacija mora biti instalabilna kao PWA.

Implementirati:
- Web App Manifest.
- Service Worker.
- Ikonu aplikacije.
- Splash screen gdje ga platforma podržava.
- Prilagodbu mobilnim ekranima.
- Ispravno ponašanje nakon instalacije.
- Push obavijesti na podržanim platformama.

Omogućiti da se aplikacija može dodati na početni zaslon mobitela i pokretati bez klasičnog prikaza preglednika.

Nemoj obećavati identično ponašanje push obavijesti na svim uređajima. Jasno obraditi razlike u podršci preglednika i operacijskih sustava, posebno na iOS-u.

---

## 15. Izvoz i sigurnosne kopije

Omogućiti jednostavan izvoz podataka o vozilima i aktivnostima u CSV formatu.

Predvidjeti mogućnost izvoza podataka za sigurnosnu kopiju.

Dokumenti i fotografije trebaju ostati povezani s odgovarajućim aktivnostima.

---

## 16. Važne smjernice za razvoj

Nemoj odmah generirati cijelu aplikaciju u jednom koraku.

Radi postupno i pregledno.

Prije početka implementacije:
1. Predloži strukturu projekta.
2. Predloži strukturu baze podataka.
3. Objasni arhitekturu aplikacije.
4. Prikaži plan implementacije po fazama.
5. Navedi koje je račune, API ključeve i servise potrebno pripremiti.

Nakon toga kreni s implementacijom fazu po fazu.

Predložene faze:

**Faza 1 – Osnova projekta**
- Postavljanje React/Vite projekta.
- TypeScript i Tailwind.
- Osnovni dizajn.
- Navigacija.
- Responsive layout.

**Faza 2 – Baza i autentifikacija**
- Supabase povezivanje.
- Izrada tablica.
- Prijava administratora.
- RLS pravila.

**Faza 3 – Vozila**
- Dodavanje vozila.
- Uređivanje i brisanje.
- Popis i pretraživanje.
- Detaljni profil vozila.

**Faza 4 – Aktivnosti**
- Registracije.
- Promjene guma.
- Servisi.
- Ostale aktivnosti.
- Povijest aktivnosti.
- Prilozi i dokumenti.

**Faza 5 – Nadzorna ploča i kalendar**
- Pregled stanja voznog parka.
- Nadolazeći rokovi.
- Kalendar.
- Statusi i upozorenja.

**Faza 6 – Obavijesti**
- Postavke obavijesti.
- Resend integracija.
- Push notifikacije.
- Service Worker.
- Automatska dnevna provjera rokova.
- Evidencija poslanih obavijesti.
- Testiranje slanja.

**Faza 7 – PWA**
- Manifest.
- Ikone.
- Instalacija.
- Mobilno ponašanje.
- Push podrška.

**Faza 8 – Završna obrada i objava**
- Testiranje svih funkcionalnosti.
- Provjera sigurnosti.
- Provjera mobilnog prikaza.
- Izvoz podataka.
- Priprema za Vercel deployment.

---

## 17. Način rada i kvaliteta

Posebno obrati pažnju na sljedeće:

- Aplikacija mora biti jednostavna za korištenje.
- Unos nove aktivnosti mora zahtijevati što manje klikova.
- Sve važne informacije moraju biti dostupne na prvi pogled.
- Podaci se moraju ispravno ažurirati nakon svake aktivnosti.
- Brisanje aktivnosti ne smije ostaviti neispravne podatke u profilu vozila.
- Datumi i vrijeme trebaju biti prikazani u hrvatskom formatu.
- Koristiti europski format datuma DD.MM.YYYY.
- Sučelje i sve poruke moraju biti na hrvatskom jeziku.
- Obraditi prazna stanja, greške i potvrde uspješnog spremanja.
- Dodati potvrdu prije brisanja važnih podataka.
- Ne dodavati funkcionalnosti koje nisu potrebne za osnovnu namjenu aplikacije.

Kod mora biti čist, modularan i jednostavan za održavanje.

Nemoj koristiti lažne podatke kao trajno rješenje. Ako koristiš demo podatke za prikaz sučelja, jasno ih odvoji od stvarnih podataka.

**Najvažnije: prvo napravi stabilnu i funkcionalnu osnovu, a zatim postupno dodaj ostale funkcionalnosti. Nemoj žrtvovati jednostavnost korištenja zbog nepotrebne kompleksnosti.**