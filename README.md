# Society Water Bill Management System

A complete production-ready water bill management system for housing societies.

---

## Quick Start

### 1. Backend (already seeded, run once)
```powershell
# In one terminal:
cd backend
node src/index.js
```
Backend runs on **http://localhost:5000**

### 2. Frontend
```powershell
# In another terminal:
cd frontend
npx vite
```
Frontend runs on **http://localhost:5173**

---

## Login Credentials

| Role     | Email                           | Password     |
|----------|---------------------------------|--------------|
| Admin    | admin@pathiksco.com             | Admin@123    |
| Resident | resident10@pathiksco.com        | Resident@123 |
| Resident | resident11@pathiksco.com        | Resident@123 |
| Resident | resident12@pathiksco.com        | Resident@123 |
| Resident | resident13@pathiksco.com        | Resident@123 |

---

## Core Business Rules Implemented

### Monthly Carry-Forward Loop
```
Previous Month A.V
       ↓
Current Month H.V  (AUTO-FILLED — Admin does NOT enter this)
       ↓
Admin enters Current Month A.V
       ↓
UNIT = H.V − A.V  (auto-calculated, can be negative)
FALO = UNIT × 5   (auto-calculated)
V    = 600         (fixed, configurable)
TOTAL = V + FALO  (auto-calculated)
       ↓
Save → Current A.V becomes next month's H.V
```

### Confirmed Formulas (from bill)
| Field | Formula   | Example               |
|-------|-----------|----------------------|
| UNIT  | H.V − A.V | 768 − 666 = 102      |
| FALO  | UNIT × 5  | 102 × 5 = 510        |
| V     | Fixed 600 | 600                  |
| TOTAL | V + FALO  | 600 + 510 = 1110     |

### Negative Values
Preserved as-is. Example from bill:
```
H.V=2704, A.V=2663
UNIT = 2704 − 2663 = -41
FALO = -41 × 5 = -205
TOTAL = 600 + (-205) = 395
```
Admin sees a warning. Calculation is NOT altered.

---

## Acceptance Tests (All Pass)
```powershell
node acceptance-test.js
```
- T0: Admin login
- T1: Carry-forward (Aug A.V=768 → Sep H.V=768)
- T2: Calculation (H.V=768, A.V=700 → UNIT=68, FALO=340, TOTAL=940)
- T3: Second month loop (Sep A.V=700 → Oct H.V=700)
- T4: Negative values preserved (UNIT=-41, FALO=-205, TOTAL=395)
- T5: Resident auth — can only see own house, 404 on cross-access
- T6: UNIT formula is H.V−A.V, not reversed
- T7: Bill states DRAFT→PUBLISHED→CORRECTED
- T8: Historical data protection (Aug bill unchanged after Sep created)

**Result: 59/59 tests pass**

---

## Database
SQLite (no installation required). File: `backend/prisma/water_bill.db`

To reset and re-seed:
```powershell
cd backend
Remove-Item prisma/water_bill.db -ErrorAction SilentlyContinue
npx prisma db push
node prisma/seed.js
```

---

## Bill States
| State     | Who can see?      | Description                          |
|-----------|-------------------|--------------------------------------|
| DRAFT     | Admin only        | Being prepared                       |
| PUBLISHED | Admin + Resident  | Live — resident can view             |
| CORRECTED | Admin + Resident  | Admin edited after publish — visible |

---

## Configurable Fields
AA, B, DAN, WCH formulas are not established from the source bill.
Configure them via **Admin → Calc Config** using:
- `FIXED:200` — always ₹200
- `PERCENT:10` — 10% of UNIT
- `UNIT * 3` — expression

---

## Project Structure
```
pathik_sco/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   ├── seed.js              # Sample data (from bill)
│   │   └── water_bill.db        # SQLite database
│   ├── src/
│   │   ├── controllers/         # Route handlers
│   │   ├── services/
│   │   │   ├── bill.service.js  # Carry-forward logic
│   │   │   └── calculation.service.js  # UNIT/FALO/V/TOTAL
│   │   ├── middleware/          # Auth, validation
│   │   └── routes/              # Express routes
│   └── .env
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── admin/           # Admin screens
│       │   └── resident/        # Resident portal
│       └── context/             # Auth context
├── acceptance-test.js           # Automated tests
└── README.md
```
