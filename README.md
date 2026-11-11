# J-CARS

Evidencija i praćenje službenih vozila: registracije, gume, servisi, kilometraža i podsjetnici.
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

## Obavijesti (e-mail i push)

- `/api/cron/check-deadlines` – dnevna provjera rokova; Vercel Cron je pokreće svaki dan u 06:00 UTC (`vercel.json`).
  Ručno: `curl -H "Authorization: Bearer $CRON_SECRET" https://<domena>/api/cron/check-deadlines`
- `/api/notifications/test` – probna obavijest (gumbi u Postavke → Obavijesti).
- Potrebne varijable (Vercel → Settings → Environment Variables, bez prefiksa `VITE_` osim javnog VAPID ključa):
  `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT`, `CRON_SECRET`, `APP_URL` te `VITE_VAPID_PUBLIC_KEY` (isti kao `VAPID_PUBLIC_KEY`).
- Bez potvrđene domene u Resendu `EMAIL_FROM` mora biti `J-CARS <onboarding@resend.dev>`, a e-mail stiže samo na adresu vlasnika Resend računa.
