# 🚀 Pathik Society Water Bill System — Project Vibe & Agent Playbook

> **FOR AI AGENTS & DEVELOPERS:** Read this single file before touching any code. It contains the complete architectural map, live URLs, database schema, credentials, and deployment commands. **Do NOT run costly exploratory file scans or grep searches; everything you need is documented here.**

---

## 📌 1. Project Overview & Live Links

- **Application:** Society Water Billing & Resident Portal SaaS
- **Live URL:** [https://pathik-waterbill.smitpanchal734.workers.dev](https://pathik-waterbill.smitpanchal734.workers.dev)
- **Login Page:** [https://pathik-waterbill.smitpanchal734.workers.dev/login](https://pathik-waterbill.smitpanchal734.workers.dev/login)
- **Database Init Endpoint:** `https://pathik-waterbill.smitpanchal734.workers.dev/api/init-db`
- **GitHub Repo:** `student-smi/pathik_saas` (Branch: `main`)
- **Hosting Platform:** **100% Cloudflare Edge** (Zero Supabase, Zero Vercel, Zero monthly cost)

---

## ⚡ 2. Cloudflare Infrastructure & Secrets

- **Cloudflare Account ID:** `6bee60f0bc279ce71350c0066b8dbaf9` (`smitpanchal734@gmail.com`)
- **Worker Name:** `pathik-waterbill`
- **Subdomain:** `smitpanchal734.workers.dev`
- **D1 Database Name:** `pathik_db`
- **D1 Database ID:** `da10750f-67c4-4ae6-9568-61092fcc9141`
- **API Token:** Stored in local environment (`$env:CLOUDFLARE_API_TOKEN`) or `.env.local`
- **JWT Secret:** `pathik-sco-super-secret-jwt-key-2026` (Bound via `wrangler.jsonc`)

---

## 🔐 3. Default Login Credentials

All users are seeded directly into Cloudflare D1:

### Admin Account
- **Email:** `admin@pathiksco.com`
- **Password:** `Admin@123`
- **Role:** `ADMIN`

### Resident Accounts (All 89 Houses: 9 to 94, plus 67/1, 68/2, 69/3)
- **Primary Email Format:** `resident{HouseNo}@pathiksco.com` (e.g., `resident9@pathiksco.com`, `resident10@pathiksco.com`, `resident67-1@pathiksco.com`)
- **Alternative Email Format:** `house{HouseNo}@pathiksco.com` (e.g., `house10@pathiksco.com`)
- **Password:** `Resident@123` (Uniform for all residents)
- **Role:** `RESIDENT`

---

## 🏗️ 4. Architecture: Why & How (100% Cloudflare Native)

### Why Supabase Was Removed:
Supabase free tier automatically pauses databases after 7 days of inactivity, throwing `HTTP 530 Origin DNS Error`. The project was migrated entirely to **Cloudflare D1 + Edge JWT Auth** so it **never sleeps, never pauses, and runs 100% free forever**.

### Key Architectural Layers:
1. **Frontend & API Routes:** Next.js 16 (App Router) compiled for Edge via `@opennextjs/cloudflare`.
2. **Database:** Cloudflare D1 (Native SQLite inside the worker runtime).
3. **Database Adapter (`src/lib/d1/adapter.ts`):** 
   - A drop-in Supabase polyfill query builder (`from()`, `select()`, `insert()`, `update()`, `delete()`, `eq()`, `is()`, `ilike()`, `upsert()`, `order()`, `single()`, `maybeSingle()`).
   - All existing 18+ Next.js API routes use this adapter without rewriting their core business logic.
4. **Auth Engine (`src/lib/auth/`):**
   - `jwt.ts`: Edge-compatible JWT signing and verification using `jose`.
   - `password.ts`: Password hashing and verification using `bcryptjs`.
   - Cookies: Tokens are stored in HTTP-only `pathik_token` cookies.

---

## 🗄️ 5. Database Schema (D1 SQLite)

All tables are created via `initD1Tables()` in `src/lib/d1/db.ts`:

- `users` — `id`, `email`, `passwordHash`, `role` ('ADMIN' | 'RESIDENT'), `isActive`, `createdAt`, `updatedAt`
- `societies` — `id`, `name`, `address`, `city`, `adminId`, `isActive`, `createdAt`, `updatedAt`
- `houses` — `id`, `societyId`, `houseNo`, `floor`, `isActive`, `createdAt`, `updatedAt`
- `residents` — `id`, `name`, `phone`, `houseId`, `userId`, `createdAt`, `updatedAt`
- `monthly_bills` — `id`, `societyId`, `year`, `month`, `status` ('DRAFT' | 'PUBLISHED'), `notes`, `publishedAt`, timestamps
- `bill_entries` — `id`, `monthlyBillId`, `houseId`, `hv`, `av`, `hvAutoFilled`, `unit`, `falo`, `v`, `total`, `aa`, `b`, `dan`, `wch`, `isNegative`, `isManualHv`, timestamps
- `calc_configs` — `id`, `societyId`, `fieldName`, `formula`, `description`, `isActive`, timestamps

### Baseline Seed Data:
- **Period:** July - August 2026 (`year = 2026`, `month = 8`)
- **Status:** `PUBLISHED`
- **Total Bill Entries:** 66 entries from original statement sheet (Houses 9–94, 67/1, 68/2, 69/3).
- **Grand Total Amount:** `₹74,810` (Exact match with society audit PDF).

---

## 📁 6. Critical Files Map

```
pathik_sco/
├── AGENTS.md                          # <-- THIS FILE (Single source of truth)
├── package.json
└── next-app/
    ├── wrangler.jsonc                 # Cloudflare Worker, D1 Database & JWT bindings
    ├── open-next.config.ts            # OpenNext Edge bundling config
    ├── src/
    │   ├── app/
    │   │   ├── api/
    │   │   │   ├── auth/              # login, logout, me routes
    │   │   │   ├── bills/             # Admin monthly bill CRUD & publish
    │   │   │   ├── portal/            # Resident bills view & download
    │   │   │   ├── houses/            # House management
    │   │   │   ├── residents/         # Resident management
    │   │   │   ├── init-db/           # Database schema migration & seed endpoint
    │   │   │   └── export/            # Excel & PDF generation
    │   │   ├── admin/                 # Admin Dashboard pages
    │   │   ├── resident/              # Resident Portal pages
    │   │   └── login/                 # Shared Login page
    │   ├── lib/
    │   │   ├── d1/
    │   │   │   ├── db.ts              # D1 binding getter & batch seeder
    │   │   │   └── adapter.ts         # Supabase-compatible query builder for D1
    │   │   ├── auth/
    │   │   │   ├── jwt.ts             # jose JWT sign/verify
    │   │   │   └── password.ts        # bcryptjs compare/hash
    │   │   ├── supabase/
    │   │   │   ├── server.ts          # createClient & createAdminClient polyfill
    │   │   │   └── middleware.ts      # Auth route guard for Next.js
    │   │   ├── bill-service.ts        # Water bill calculations & business logic
    │   │   └── store.ts               # Data store bridging BillService with D1
```

---

## 🛠️ 7. Build & Deployment Commands

### Local Testing:
```powershell
cd next-app
npm run dev
```

### Production Build & Deploy to Cloudflare:
```powershell
cd next-app
$env:CLOUDFLARE_API_TOKEN="<YOUR_CLOUDFLARE_API_TOKEN>"
npx opennextjs-cloudflare build
npx wrangler deploy
```

### Trigger Database Seed on Live Cloudflare:
```powershell
curl.exe -s https://pathik-waterbill.smitpanchal734.workers.dev/api/init-db
```

### Git Commit & Push:
```powershell
git add .
git commit -m "feat: your change description"
git push origin main
```

---

## ⚠️ 8. Critical Rules for AI Agents

1. **NEVER add Supabase back:** Do not install `@supabase/supabase-js` or add Supabase URLs. The project is 100% Cloudflare D1.
2. **Windows PowerShell Syntax:** The user runs Windows PowerShell. Never use `&&` (use `;`). Never use raw double-quoted JSON in `curl` (use `Invoke-RestMethod` or single quotes).
3. **D1 Prepared Statements:** Avoid passing massive raw multi-statement SQL strings with comments to `db.exec()`. Always use `db.prepare().run()` or `db.batch()` to prevent syntax errors.
4. **OpenNext Windows Warning:** OpenNext prints a warning on Windows about WSL, which is normal and safe to ignore.
5. **Keep Passwords Standard:** Admin password must always be `Admin@123` and Resident passwords `Resident@123` unless user explicitly requests changes.
