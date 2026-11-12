# Run SeedSphere (complete product, phases A–F)

Needs: Node 20+, Docker Desktop (for Postgres). Windows PowerShell commands shown.

## 1. Database
```
cd server
docker compose up -d
copy .env.example .env
```
(Postgres 16 starts on port 5433, user/password/db all `seedflow`.)

## 2. Install, migrate, load demo data
```
npm install
npm run migrate          # applies all 65 migrations
npm run seed:all         # logins, lots, lab, storage and compliance starter data
```
(`seed:demo` below needs the API running, so it comes after step 3.)

## 3. Start the API (leave running)
```
npm start                # http://localhost:5000
```

Then, in a second terminal in `server`, load a full season of demo records
(procurement, processing, warehouse, dealers, R&D, quality, farms, crop plans, harvests):
```
npm run seed:demo
```

## 4. Start the front end (new terminal, project root)
```
cd ..
npm install
npm run dev              # http://localhost:5173
```
`.env.local` already points the front end at the API.

## Logins (password `password123`)
| Area | Email | Start at |
|---|---|---|
| Everything (all modules) | superadmin@seedsphere.com | module picker after login |
| Procurement | manager@seedsphere.com | /procurement/dashboard |
| Processing | plantmanager@seedsphere.com | /processing/dashboard, /processing/planning |
| Warehouse | whmanager@seedsphere.com | /warehouse/dashboard, /warehouse/reports |
| R&D | rdexecutive@ / rdmanager@seedsphere.com | /rd/dashboard, /rd/release |
| Quality | qualityofficer@ / qualitymanager@seedsphere.com | /quality/recalls, /quality/audits, /quality/sathi |
| Admin | sysadmin@seedsphere.com | /admin/dashboard |
| Dealer portal | dealer@seedsphere.com | portal home |
| Grower portal | grower@seedsphere.com | portal home |
| Production planning | superadmin@seedsphere.com | /crop-planning, /farms, /harvests/approval, /inspections |
| Laboratory | superadmin@seedsphere.com | /lab/dashboard |
| Inspector | inspector@seedsphere.com (`Inspector123!`) | |

Public QR check (no login): /verify/<tag code> — the seed prints a real code.

## Tests (optional)
```
cd server
npm run db:test:migrate
npm test                 # full suite
```

## Notes
- SMS/WhatsApp messages are written to a log until MESSAGING_PROVIDER=webhook is configured.
- Check the SATHI export columns against the portal's current template before filing.
- If login says "too many attempts", restart the API.
