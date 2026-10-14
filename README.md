# Khata Desk — CNC business app

The app covers GST and simple invoices with **sq.ft pricing**, quotations, income and expenses, material stock (Acrylic, MDF, Corian, MS, SS…), vendor bills with photo upload, and team logins.

- **Frontend:** `public/` (HTML, CSS and JavaScript, no build step). It is an installable app (PWA) on Android.
- **Backend:** `src/` (Node.js + Express). It talks to **PostgreSQL** (Supabase now, your own server later).
- **Files** (bill photos, logo): Supabase Storage now, or a folder on your own server later.

```
khata-desk-cnc/
├─ api/index.js          Vercel entry (all /api/* requests)
├─ server.js             Own-server entry (npm start)
├─ src/
│  ├─ app.js             Express app (routes, security headers, static files)
│  ├─ db.js              PostgreSQL connection + auto-creates tables
│  ├─ auth.js            Login tokens (JWT), admin check
│  ├─ storage.js         Supabase Storage or local folder
│  └─ routes/            auth, users, data, files
├─ db/schema.sql         All tables (run once in Supabase SQL editor, or let the server do it)
├─ public/               The app screens
│  ├─ index.html
│  ├─ css/app.css
│  ├─ js/app.js          Main app (invoices, sq.ft maths, PDF, stock, vendors…)
│  ├─ js/rest.js         Connects the app to /api and shows the login screen
│  ├─ vendor/jspdf…      PDF generator (bundled, works without CDN)
│  ├─ manifest.webmanifest, sw.js, icons/   Install on phone
├─ .env.example          All settings you need to fill
├─ vercel.json           Vercel config
└─ package.json
```

---

## 1. Supabase setup (database + file storage)

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick region **South Asia (Mumbai)**. Save the database password.
2. **Tables:** open **SQL Editor** → paste all of `db/schema.sql` → **Run**. (Optional: the server also creates them on first start.)
3. **Storage bucket:** open **Storage** → **New bucket** → name `bills` → keep it **Private** → Create.
4. **Database URL:** click **Connect** (top bar) → **Connection string** → **Transaction pooler** (port `6543`). Copy it and put your password in place of `[YOUR-PASSWORD]`.
5. **Keys:** **Project Settings → API**. Copy the **Project URL** and the **service_role** (secret) key.

> ⚠️ The `service_role` key has full access to your Supabase project. Put it only in Vercel environment variables or `.env`. Never put it in frontend code and never share it.

## 2. Deploy on Vercel

1. Put this folder in a GitHub repo (or use the Vercel CLI: `npm i -g vercel` then `vercel`).
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo. Framework preset: **Other**. Keep the root folder as it is. You do not need a build command.
3. **Settings → Environment Variables**: add these.

| Name | Value |
|---|---|
| `DATABASE_URL` | Transaction pooler string from step 1.4 |
| `JWT_SECRET` | Any long random text, 40+ characters (e.g. from `openssl rand -hex 32`) |
| `STORAGE` | `supabase` |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
| `SUPABASE_BUCKET` | `bills` |

4. **Deploy**. Open the site. On the first visit it asks you to **create the admin account**. That's you or your brother.
5. Check that everything is connected: open `https://YOUR-SITE.vercel.app/api/health`. It should show `{"ok":true,"storage":"supabase"}`.

## 3. Install on Android

Open the site in **Chrome** → ⋮ menu → **Install app** (or **Add to Home screen**). It opens full-screen like a normal app.

## 4. Team logins

**Settings ⚙️ → Manage team logins → Add a person.**
- **Admin:** can do everything, including delete, company settings and team logins.
- **Staff:** can add and edit invoices, quotations, expenses, stock and bills. Staff **cannot delete** anything.

Every person sees the same data. Changes from other phones show up within about 20 seconds, or straight away when the app is reopened.

## 5. First things to fill in the app

Open **Settings ⚙️** and fill these in:
- Company name, address, state, GSTIN, logo, bank and UPI details. These are printed on the invoice PDF.
- **Default rate per sq.ft** for Acrylic, MDF, Corian, MS, SS and the others. The rate fills in automatically when you pick the material on an invoice line.
- **Default size unit** (inch / feet / mm). Each line can still change it.

### How sq.ft is calculated
Each invoice line can be **Per sq.ft** or **Per piece / unit**.

| Size unit | Formula |
|---|---|
| inch | L × W ÷ 144 × pieces |
| feet | L × W × pieces |
| mm | L × W ÷ 92,903.04 × pieces |

Amount = sq.ft (2 decimals) × rate per sq.ft. GST is added per line, as CGST+SGST in the same state or IGST for another state.

---

## 6. Moving to your own server later (after ~2 months)

The code is the same. Only the `.env` changes.

### a) Server basics (Ubuntu VPS)
```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
# copy this folder to the server, then:
npm install
cp .env.example .env     # fill it (see below)
npm start                # runs on http://localhost:3000
```
Keep it running with PM2: `sudo npm i -g pm2 && pm2 start server.js --name khata && pm2 save && pm2 startup`.
Put **Nginx** in front with **HTTPS** (`sudo apt install nginx certbot python3-certbot-nginx`, proxy to port 3000, then `sudo certbot --nginx`). The phone install needs HTTPS.

### b) Option 1: keep using the Supabase database
Use the same `DATABASE_URL`, `STORAGE=supabase` and Supabase keys in `.env`. Nothing else changes.

### c) Option 2: move everything to your own server
1. **Database:** install PostgreSQL, create a database, then copy the data:
   ```bash
   pg_dump "SUPABASE_DIRECT_CONNECTION_STRING" --no-owner --no-acl -t users -t settings -t invoices -t quotations \
     -t transactions -t materials -t stock_moves -t vendors -t vendor_bills -t files > khata.sql
   psql "postgresql://USER:PASS@localhost:5432/khata" < khata.sql
   ```
   Set `DATABASE_URL=postgresql://USER:PASS@localhost:5432/khata`.
2. **Files:** download everything from the Supabase `bills` bucket, keeping the same folder layout (e.g. `2026/10/abc.jpg`). Put it in `/var/khata/uploads`, then set:
   ```
   STORAGE=local
   UPLOAD_DIR=/var/khata/uploads
   UPLOAD_LIMIT=20mb
   ```
3. `pm2 restart khata`. Logins, invoices and bill photos all continue as before.

> ⚠️ Back up the database regularly (`pg_dump` daily via cron). The app also has **Settings → Download full backup (JSON)**.

---

## Run on your computer (for testing)
Needs Node 18+ and PostgreSQL.
```bash
npm install
cp .env.example .env
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/khata
# STORAGE=local
npm start   # open http://localhost:3000
```

## API (for developers)
All routes need `Authorization: Bearer <token>` except status/setup/login.

| Method | Path | What it does |
|---|---|---|
| GET | `/api/auth/status` | `{needsSetup}` |
| POST | `/api/auth/setup` | First admin `{name, username, password}` |
| POST | `/api/auth/login` | `{username, password}` → `{token, user}` |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/password` | `{current, next}` |
| GET/POST/PATCH | `/api/users`, `/api/users/:id` | Team (admin) |
| GET | `/api/data` | Everything + settings in one call |
| GET | `/api/data/:col` | One collection: `invoices, quotes, txns, materials, moves, vendors, bills` |
| POST / PUT / PATCH | `/api/data/:col[/:id]` | Create / replace / merge |
| DELETE | `/api/data/:col/:id` | Delete (admin) |
| PUT | `/api/data/settings` | Company settings (admin) |
| POST | `/api/files` | Raw body upload (JPG/PNG/WEBP/PDF), header `X-File-Name` |
| GET | `/api/files/:id?t=<token>` | View a file |

## Good to know
- **Vercel upload limit is 4 MB per file.** Photos are shrunk on the phone before upload (usually 300–600 KB), so this only matters for big PDFs. Your own server allows 20 MB.
- The PDF prints English text. Hindi or Gujarati letters in item names will not show in the PDF.
- The WhatsApp button opens a chat with the invoice details. Attach the downloaded PDF yourself.
