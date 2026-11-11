# J-CARS

J-CARS System – evidencija i praćenje vozila: registracije, gume, servisi, kilometraža i podsjetnici.
Progressive Web App (React + Vite + TypeScript + Tailwind, Supabase, Vercel).

- Specifikacija: [J-CARS.md](J-CARS.md)
- Arhitektura, baza, faze i potrebni računi: [docs/ARHITEKTURA.md](docs/ARHITEKTURA.md)

## Pokretanje

Potreban je Node.js 22.12 ili noviji.

```bash
npm install
cp .env.example .env.local   # popuniti ključeve (od Faze 2)
npm run dev                  # http://localhost:5173
```

| Naredba | Opis |
|---|---|
| `npm run dev` | razvojni poslužitelj (izvršava i funkcije iz `/api`, s tajnama iz `.env.local`) |
| `npm run build` | provjera tipova + produkcijski build u `dist/` |
| `npm run preview` | lokalni pregled produkcijskog builda |
| `npm run lint` | oxlint |

## Push obavijesti

- `/api/cron/check-deadlines` – dnevna provjera rokova; Vercel Cron je pokreće svaki dan u 06:00 UTC (`vercel.json`).
  Ručno: `curl -H "Authorization: Bearer $CRON_SECRET" https://<domena>/api/cron/check-deadlines`
- `/api/notifications/test` – probna push obavijest (gumb u Postavke → Obavijesti).
- Potrebne varijable (Vercel → Settings → Environment Variables, bez prefiksa `VITE_` osim javnog VAPID ključa):
  `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`
  te `VITE_VAPID_PUBLIC_KEY` (isti kao `VAPID_PUBLIC_KEY`).

## Korisnici

Javna registracija je isključena. Novog korisnika dodaje administrator: Supabase → Authentication → Users → Add user →
Create new user (e-mail, lozinka, uključiti „Auto Confirm User”). Svaki korisnik vidi samo svoja vozila i aktivnosti.

## Izvoz podataka

Postavke → Izvoz podataka: vozila i aktivnosti kao CSV (za Excel, `;` i UTF-8) te sigurnosna kopija svih podataka u JSON-u.

## Objava na Vercelu

1. Vercel → Add New → Project → uvoz Git repozitorija (Framework: Vite, build `npm run build`, izlaz `dist`).
2. Prije prvog deploya: Settings → Environment Variables – sve varijable iz `.env.example`
   (`VITE_*` se ugrađuju u build, ostale su samo za `/api`).
3. Supabase → Authentication → URL Configuration: Site URL = adresa na Vercelu, Redirect URLs dodati `https://<domena>/**`
   (poveznica za novu lozinku).
4. Nakon promjene varijabli: Deployments → Redeploy. Svaki `git push` na `main` objavljuje novu verziju.
5. Push obavijesti treba ponovno uključiti na svakom uređaju (pretplata vrijedi samo za adresu na kojoj je nastala).
