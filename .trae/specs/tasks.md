# Pathik SCO - Next.js माइग्रेशन - इम्प्लीमेंटेशन प्लान

## Project Timeline Summary
| फेज | अनुमानित समय | Description |
|-----|-------------|-------------|
| फेज 1: प्रारंभिक सेटअप + फ्रंटएंड माइग्रेशन | 3-4 दिन | Next.js init + components/pages migration |
| फेज 2: बैकएंड इंटीग्रेशन (API Routes + Server Actions) | 4-5 दिन | Business logic + calculations carry-forward loop |
| फेज 3: Supabase इंटीग्रेशन | 2-3 दिन | Schema + RLS + Auth + Data migration |
| फेज 4: टेस्टिंग | 2 दिन | Acceptance tests + manual QA |
| फेज 5: Vercel डिप्लॉयमेंट | 1 दिन | Setup + Deploy + Smoke test |
| **कुल** | **~12-15 दिन** | **Quality check + bug fixes के साथ** |

---

## Task 1: Next.js 15 प्रोजेक्ट सेटअप (TypeScript + App Router)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - `npx create-next-app@latest` से नया project create करना — Name: pathik-sco-next, TypeScript: Yes, Tailwind: Yes, App Router: Yes, src-dir: Optional, import alias: @/*
  - मौजूदा dependencies install: react-router-dom (हटाना), axios (रख सकते हैं), react-hot-toast, lucide-react, date-fns install करना
  - Supabase dependencies: @supabase/ssr, @supabase/supabase-js install करना
  - Tailwind config को मौजूदा tailwind.config.js के colors/theme से sync करना
  - tsconfig.json strict mode: true
  - ESLint + Prettier configure करना
  - Folder structure बनाना:
    - `src/app/` - App Router pages
    - `src/app/api/` - Route Handlers (APIs)
    - `src/components/` - React components
    - `src/lib/` - Server actions, supabase client, utility functions
    - `src/types/` - TypeScript interfaces/types
    - `src/middleware.ts` - Next.js auth middleware
- **Acceptance Criteria Addressed**: AC-1, AC-14
- **Test Requirements**:
  - `rule` TR-1.1: `npm run dev` चलाने पर http://localhost:3000 पर बिना error के app open हो
  - `rule` TR-1.2: `npx tsc --noEmit` से कोई TypeScript error ना आये
  - `rule` TR-1.3: `npx eslint .` से 0 errors आयें (warnings चल सकती हैं)
  - `rubric` TR-1.4: Folder structure बनाना; Scale 1-5; 1 = no structure; 3 = basic structure; 5 = production-ready structure with clear separation; Threshold >= 4; Evidence: folder tree screenshot

---

## Task 2: मौजूदा फ्रंटएंड कंपोनेंट्स और पेजेस को माइग्रेट करना (UI लेयर)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - `frontend/src/index.css` को `src/app/globals.css` में copy + Tailwind directives check करना
  - `frontend/src/pages/LoginPage.jsx` → `src/app/login/page.tsx` (Client Component, "use client")
  - Admin Layout और Pages:
    - `src/app/admin/layout.tsx` - AdminLayout (protected)
    - `src/app/admin/page.tsx` - AdminDashboard
    - `src/app/admin/societies/page.tsx` - SocietyManagement
    - `src/app/admin/houses/page.tsx` - HouseManagement
    - `src/app/admin/residents/page.tsx` - ResidentManagement
    - `src/app/admin/bills/page.tsx` - MonthlyBillScreen
    - `src/app/admin/history/page.tsx` - BillHistory
    - `src/app/admin/config/page.tsx` - CalcConfigScreen
  - Resident Layout और Pages:
    - `src/app/resident/layout.tsx` - ResidentLayout (protected)
    - `src/app/resident/page.tsx` - ResidentDashboard
    - `src/app/resident/bill/[entryId]/page.tsx` - ResidentBillDetail
  - `frontend/src/components/ErrorBoundary.jsx` → `src/components/ErrorBoundary.tsx`
  - सभी JSX files को TypeScript में convert करना, props types define करना
  - सभी pages में "use client" directive जहां useState/useEffect हों
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-15
- **Test Requirements**:
  - `rule` TR-2.1: Admin के सभी 7 routes (admin, societies, houses, residents, bills, history, config) navigation से access हो सकें
  - `rule` TR-2.2: Resident के दोनों routes (resident, resident/bill/[id]) navigation से access हो सकें
  - `rule` TR-2.3: Login Page load होने पर कोई console error/warning ना आये
  - `rubric` TR-2.4: UI Consistency with old design; Scale 1-5; 1 = broken UI; 3 = usable but styling issues; 5 = pixel-perfect match; Threshold >= 4; Evidence: Side-by-side screenshot comparison (old vs new)

---

## Task 3: Auth Context और Routing Guards को Next.js में माइग्रेट करना
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - `AuthContext.jsx` को `src/app/providers.tsx` में convert करना (Client Provider)
  - Supabase SSR auth का native उपयोग करना (via @supabase/ssr package)
  - Session management: localStorage के बजाय Supabase cookies
  - Role-based guards:
    - `src/middleware.ts` - Public routes (/login) allow, protected routes (/admin, /resident) redirect to /login if no session
    - Server Component level guards - User के role की validation Server Action या Server Component में
  - `ProtectedRoute` pattern को Next.js Layouts + middleware के साथ replace करना
  - Root page (/) redirect करे: logged in → role के अनुसार /admin या /resident, नहीं तो /login
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-10
- **Test Requirements**:
  - `rule` TR-3.1: बिना login किए /admin पर जाने पर /login पर redirect हो जाए
  - `rule` TR-3.2: Admin user login के बाद /admin पर पहुंचे, Resident login के बाद /resident पर पहुंचे
  - `rule` TR-3.3: Logout करने पर session clear हो और /login पर आ जाए
  - `rule` TR-3.4: Resident को /admin route manually access करने पर 403 या redirect हो
  - `rubric` TR-3.5: Auth flow security; Scale 1-5; 1 = no security; 3 = basic redirect only; 5 = full SSR auth + middleware + RLS; Threshold >= 4; Evidence: Auth flow test steps + Middleware config review

---

## Task 4: कोर बिजनेस लॉजिक (Calculation Engine) को माइग्रेट करना
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - `backend/src/services/calculation.service.js` → `src/lib/calculation.ts` में पोर्ट करना
  - Functions: calculateEntry, evaluateFormula, loadConfigs (DB के बजाय Supabase)
  - Formula engine: FIXED:, PERCENT:, expression evaluation त्रुटिरहित होनी चाहिए
  - FALO_RATE default 5, V default 600 configuration बनाए रखें
  - UNIT = H.V - A.V (नेगेटिव allowed)
  - TypeScript interfaces: CalcConfig, BillEntryCalculation types define करना
- **Acceptance Criteria Addressed**: AC-5, AC-6
- **Test Requirements**:
  - `rule` TR-4.1: H.V=768, A.V=700 → UNIT=68, FALO=340, V=600, TOTAL=940 (unit test)
  - `rule` TR-4.2: H.V=2704, A.V=2663 → UNIT=-41, FALO=-205, TOTAL=395 (negative test)
  - `rule` TR-4.3: evaluateFormula("FIXED:200", {}) → 200 return करे
  - `rule` TR-4.4: evaluateFormula("PERCENT:10", {UNIT: 100}) → 10 return करे
  - `rule` TR-4.5: evaluateFormula("UNIT * 3", {UNIT: 5}) → 15 return करे
  - `rubric` TR-4.6: Calculation code quality; Scale 1-5; 1 = messy JS port; 3 = works but no types; 5 = clean TS + pure functions + comprehensive tests; Threshold >= 4

---

## Task 5: Bill Service - Carry-Forward और Monthly Bill Logic माइग्रेट करना
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - `backend/src/services/bill.service.js` का core logic port करना:
    - createMonthlyBill function
    - findPreviousBill function
    - updateBillEntry function
    - setManualHv function
    - publishBill / unpublishBill functions
    - addHouseToDraftBills function
    - monthLabel, previousMonth helpers
  - Bi-monthly mapping (Jan-Feb, Mar-Apr, etc.) का logic बनाए रखें
  - Carry-forward: पिछले बिल का A.V → अगले बिल का H.V logic intact रहे
  - सब functions को Server Actions या lib functions के रूप में लिखना
  - Bug fix: bill.service.js में duplicate code block (lines 104-119) को इसी गलती से दोहराया नहीं जाए (line क्रिएट करते समय ठीक करके
- **Acceptance Criteria Addressed**: AC-4, AC-7, AC-8, AC-15
- **Test Requirements**:
  - `rule` TR-5.1: August A.V=768 → create September बिल create करने पर September H.V=768 auto-fill हो
  - `rule` TR-5.2: September A.V=700 save करने पर October बिल create करने पर October H.V=700 हो
  - `rule` TR-5.3: DRAFT bill publish करने पर state PUBLISHED हो
  - `rule` TR-5.4: PUBLISHED bill की entry edit करने पर state CORRECTED हो
  - `rule` TR-5.5: August bill PUBLISHED होने के बाद उसमें कोई बदलाव ना आये जब September create/edit हो
  - `rule` TR-5.6: नया House add होने पर सभी DRAFT bills में उसकी entry auto-create हो

---

## Task 6: Next.js Route Handlers (APIs) बनाना - सभी Backend Endpoints
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 4, Task 5
- **Description**:
  सभी Express routes को Next.js Route Handlers में बनाएं:
  - `src/app/api/auth/login/route.ts` - POST login/logout/me
  - `src/app/api/societies/route.ts` - GET societies list, POST create
  - `src/app/api/societies/[id]/route.ts` - PATCH, DELETE
  - `src/app/api/houses/route.ts` - CRUD
  - `src/app/api/residents/route.ts` - CRUD
  - `src/app/api/bills/route.ts` - GET list, POST create bill
  - `src/app/api/bills/[societyId]/[year]/[month]/route.ts` - GET single, PATCH publish
  - `src/app/api/bills/entries/[entryId]/route.ts` - PATCH update entry (A.V/HV)
  - `src/app/api/portal/bills/route.ts` - Resident के अपने bills
  - `src/app/api/portal/bills/[entryId]/route.ts` - Resident single bill detail
  - `src/app/api/config/route.ts` - CalcConfig CRUD
  - `src/app/api/export/excel/route.ts` - GET Excel export
  - `src/app/api/export/pdf/route.ts` - GET PDF export
  - `src/app/api/health/route.ts` - GET health check
  - हर endpoint में auth check + role validation (admin/resident)
  - Error handling: proper HTTP status codes (400, 401, 403, 404, 409, 500)
- **Acceptance Criteria Addressed**: AC-1, AC-4, AC-5, AC-7, AC-15
- **Test Requirements**:
  - `rule` TR-6.1: सभी API endpoints 2xx response दें valid request पर
  - `rule` TR-6.2: Invalid auth के साथ API 401 दे
  - `rule` TR-6.3: Admin endpoint को Resident access करने की कोशिश करे तो 403 मिले
  - `rule` TR-6.4: किसी भी endpoint में validation error होने पर 400 + error message के साथ response मिले
  - `rubric` TR-6.5: API Design consistency; Scale 1-5; 1 = inconsistent responses; 3 = mostly consistent; 5 = RESTful best practices + uniform response shape + error codes; Threshold >= 4

---

## Task 7: Supabase प्रोजेक्ट सेटअप और Schema Migration
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Supabase Dashboard पर नया Project create करना (name: Pathik SCO Production)
  - `schema.prisma` को Supabase SQL Editor में SQL में convert करना:
    - users table (id uuid default uuid_generate_v4(), email unique, password_hash, role default 'RESIDENT', is_active default true)
    - societies table (id, name, address, city, is_active, admin_id fk → users.id
    - houses table (id, house_no, floor, is_active, society_id fk)
    - residents table (id, name, phone, house_id fk unique, user_id fk unique)
    - monthly_bills table (id, year int, month int, status default 'DRAFT', notes, published_at, society_id fk)
    - bill_entries table (id, monthly_bill_id fk, house_id fk, hv float, av float, hv_auto_filled bool, unit, falo, v, total, aa, b, dan, wch, is_negative, is_manual_hv)
    - calc_configs table (id, society_id, field_name, formula, description, is_active)
  - Unique constraints: (society_id, year, month), (society_id, house_no), (monthly_bill_id, house_id), (society_id, field_name)
  - Foreign keys cascade delete
  - Seed data को Supabase seed.sql के रूप में तैयार करना (users, societies, houses, residents, monthly_bills, bill_entries)
  - SQL script: admin user + 4 residents + sample bills create करने वाला
- **Acceptance Criteria Addressed**: AC-13
- **Test Requirements**:
  - `rule` TR-7.1: सभी 8 tables Supabase में create हो जाएं
  - `rule` TR-7.2: Seed script चलाने पर sample data populate हो जाए (admin + 4 residents)
  - `rule` TR-7.3: Foreign key + Unique constraints काम करें (duplicate पर error)
  - `rubric` TR-7.4: Schema design; Scale 1-5; 1 = missing fields/types; 3 = works but missing indexes; 5 = proper types + indexes + constraints match Prisma schema exactly; Threshold >= 4

---

## Task 8: Supabase Auth Configuration + RLS Policies
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 7
- **Description**:
  - Supabase Auth: Email provider enable करना
  - RLS (Row Level Security) सभी 8 tables पर enable करना
  - Policies बनाना:
    - **users table**: self read (own profile only
    - **societies table**: Admin = society's admin user को CRUD; Resident = society के members को देखने की इजाजत
    - **houses table**: Admin = society के admin को CRUD; Resident = अपना ही house देख सके
    - **residents table**: Admin = CRUD; Resident = अपना ही resident profile
    - **monthly_bills table**: Admin = CRUD; Resident = PUBLISHED/CORRECTED bills ही अपनी society के देख सकें
    - **bill_entries table**: Admin = CRUD; Resident = अपने ही house के entries PUBLISHED/CORRECTED
    - **calc_configs table**: Admin = CRUD; Resident = कोई access नहीं
  - Service Role key backend में प्रयोग (Server Actions के लिए)
  - Anon key frontend का प्रयोग (सिर्फ RLS के साथ)
- **Acceptance Criteria Addressed**: AC-9, AC-10, AC-13
- **Test Requirements**:
  - `rule` TR-8.1: बिना login किए किसी भी table को anon key से query करने पर कोई data ना आये
  - `rule` TR-8.2: Resident दूसरे Resident की bill entry access करने की कोशिश करे तो empty/null मिले
  - `rule` TR-8.3: Admin अपनी society का सारा data access कर सके
  - `rule` TR-8.4: Resident को DRAFT बिल कभी दिखाई ना दें
  - `rule` TR-8.5: Email/Password login काम करे (Supabase Auth)
  - `rubric` TR-8.6: RLS coverage completeness; Scale 1-5; 1 = no RLS; 3 = some policies but gaps; 5 = all tables covered, no leaks, proper CRUD checks; Threshold >= 5

---

## Task 9: Supabase Client कॉन्फिगरेशन + Queries
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 7, Task 8
- **Description**:
  - `src/lib/supabase/server.ts` - Server side Supabase client (Server Components + Route Handlers के लिए)
  - `src/lib/supabase/client.ts` - Client side Supabase client (Client Components के लिए)
  - `src/lib/supabase/middleware.ts` - Middleware के लिए Supabase client
  - Environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
  - सभी DB operations को Supabase client से करना (Prisma हटाना):
    - getMonthlyBill, createMonthlyBill (via Supabase)
    - updateBillEntry, publish/unpublish, listBills
    - getSocieties, createSociety, etc.
    - getAllResidentBills
    - calcConfig CRUD
  - Auth flow: Supabase signInWithPassword → session → user role fetch
- **Acceptance Criteria Addressed**: AC-9, AC-10
- **Test Requirements**:
  - `rule` TR-9.1: Server Supabase client DB से data fetch कर सके
  - `rule` TR-9.2: Client Supabase client RLS के साथ data fetch कर सके
  - `rule` TR-9.3: Sign in valid credentials के साथ काम करता है
  - `rule` TR-9.4: Invalid credentials के साथ error आता है
  - `rubric` TR-9.5: DB Query efficiency; Scale 1-5; 1 = N+1 queries; 3 = works but unoptimized; 5 = proper joins, no N+1, typed queries; Threshold >= 4

---

## Task 10: Frontend Pages को Data Fetching से जोड़ना (Server Actions + State)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2, Task 6, Task 9
- **Description**:
  - Login Page: को actual login API/Server action से जोड़ना
  - Admin Dashboard: societies list + stats API से लाना
  - Society Management: CRUD operations wire करना
  - House Management: add/edit/delete + addHouseToDraftBills logic
  - Resident Management: resident + user account create करना (Supabase user create करना)
  - Monthly Bill Screen: create bill, HV autofill, A.V entry, realtime calculations, publish
  - Bill History: past bills list
  - Calc Config: formula save/load
  - Resident Dashboard: resident के published bills list
  - Resident Bill Detail: single bill detail
  - React Hot Toast notifications integrate करना (success/error)
  - Loading states + Error handling UI
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-15
- **Test Requirements**:
  - `rule` TR-10.1: Login page से सही credentials के साथ login हो जाए
  - `rule` TR-10.2: Admin Dashboard पर societies list show हो
  - `rule` TR-10.3: New Society create करने पर DB में entry बने
  - `rule` TR-10.4: Bill create करने पर HV auto-fill show हो
  - `rule` TR-10.5: A.V enter करने पर calculations realtime calculate हों
  - `rule` TR-10.6: Bill publish करने पर status बदले
  - `rubric` TR-10.7: User experience smoothness; Scale 1-5; 1 = buggy/unresponsive; 3 = works but slow/UX issues; 5 = smooth transitions, loaders, toasts, intuitive; Threshold >= 4

---

## Task 11: Export Functions (Excel/PDF) माइग्रेट करना
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 6
- **Description**:
  - Excel export: exceljs याSheetJS (xlsx) इस्तेमाल
  - PDF export: pdfkit या @react-pdf/renderer या pdf-lib इस्तेमाल
  - Admin Bill download के लिए Export button wire करना
  - Excel: House-wise report with all columns (HV, AV, UNIT, FALO, V, TOTAL)
  - PDF: Individual house bill format (same as original bill structure)
- **Acceptance Criteria Addressed**: AC-15
- **Test Requirements**:
  - `rule` TR-11.1: Excel download करने पर valid .xlsx file generate हो और उसमें सही data हो
  - `rule` TR-11.2: PDF download करने पर valid PDF generate हो
  - `rubric` TR-11.3: Export quality; Scale 1-5; 1 = broken; 3 = works but formatting issues; 5 = professional formatting + correct data; Threshold >= 4

---

## Task 12: Acceptance Tests माइग्रेट या Rewrite करना
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 6, Task 9, Task 10
- **Description**:
  - `acceptance-test.js` को migrate करना या Playwright/Cypress/Vitest में rewrite करना
  - All 9 test scenarios (T0-T8) + 59 test cases:
    - T0: Admin login
    - T1: Carry-forward Aug AV=768 → Sep HV=768
    - T2: Calculation HV=768, AV=700 → UNIT=68, FALO=340, TOTAL=940
    - T3: Second month Sep AV=700 → Oct HV=700
    - T4: Negative UNIT=-41, FALO=-205, TOTAL=395
    - T5: Resident auth - own house only, cross-access 404
    - T6: UNIT formula direction HV−AV correct
    - T7: Bill states DRAFT→PUBLISHED→CORRECTED
    - T8: Historical data protection (Aug bill unchanged after Sep creation
  - Test environment setup: test Supabase project + seed data reset
- **Acceptance Criteria Addressed**: AC-12, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9
- **Test Requirements**:
  - `rule` TR-12.1: 59/59 tests pass हों (कोई fail नहीं)
  - `rule` TR-12.2: Test suite idempotent हो (same seed data पर same result)
  - `rubric` TR-12.3: Test coverage; Scale 1-5; 1 = smoke tests only; 3 = all scenarios covered; 5 = edge cases + negative + error paths; Threshold >= 4

---

## Task 13: Manual QA और Bug Fixes
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 10, Task 11, Task 12
- **Description**:
  - End-to-end manual testing:
    - Admin: login/logout flow
    - Society CRUD सभी operations
    - House + Resident CRUD
    - Bill creation full flow: create → enter AV → calc → publish → correct
    - Calc Config: formulas evaluate correctly
    - Resident: login → dashboard → bill detail
    - Edge cases: negative values, manual HV entry, empty societies, duplicate bills
  - Console errors/warnings zero करना
  - Mobile responsive check
  - Cross-browser testing (Chrome, Firefox, Safari)
  - Bug logging और fixing
- **Acceptance Criteria Addressed**: AC-15, AC-2, AC-3
- **Test Requirements**:
  - `rule` TR-13.1: कोई P0/P1 बग नहीं रहना चाहिए
  - `rule` TR-13.2: Mobile screens (mobile, tablet, desktop) responsive हों
  - `rule` TR-13.3: Console में कोई error नहीं आना चाहिए workflows के दौरान
  - `rubric` TR-13.4: Overall polish; Scale 1-5; 1 = many issues; 3 = usable with workarounds; 5 = polished production-ready; Threshold >= 4

---

## Task 14: Vercel Project Setup और Deploy
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 13
- **Description**:
  - Vercel पर Sign In + GitHub/GitLab repository connect करना
  - Framework Preset: Next.js (auto-detect)
  - Root directory: (अगर mono repo है तो set करें अन्यथा default)
  - Environment Variables add करना Vercel dashboard में:
    - NEXT_PUBLIC_SUPABASE_URL
    - NEXT_PUBLIC_SUPABASE_ANON_KEY
    - SUPABASE_SERVICE_ROLE_KEY (Server-side के लिए)
  - Production Build trigger करना
  - Build errors को debug और fix करना
  - Vercel URL (https://pathik-sco.vercel.app) पर app verify करना
- **Acceptance Criteria Addressed**: AC-11
- **Test Requirements**:
  - `rule` TR-14.1: Vercel build बिना error के complete हो
  - `rule` TR-14.2: Live URL open हो और Login page load हो
  - `rule` TR-14.3: Environment variables सही inject हुए हैं (API calls work)
  - `rubric` TR-14.4: Deployment readiness; Scale 1-5; 1 = build fails; 3 = deploys but broken; 5 = smooth one-click deploy + all features work; Threshold >= 5

---

## Task 15: पोस्ट-डिप्लॉयमेंट स्मोक टेस्टिंग
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 14
- **Description**:
  - Production URL पर सभी critical flows का smoke test:
    1. Admin login (admin@pathiksco.com / Admin@123)
    2. Dashboard load + societies list दिखना
    3. एक नया bill create करना → HV auto-fill check
    4. AV enter करना → calculation check
    5. Publish करना → state PUBLISHED check
    6. Resident login (resident10@pathiksco.com / Resident@123)
    7. Resident dashboard में published bill दिखना
    8. Bill detail open करना → numbers correct होना
    9. Cross-access check: दूसरे resident की bill try करना → 404
    10. Supabase Dashboard में data sync verify करना
  - Vercel Analytics enable करना
  - Error logging (Sentry optional) setup
  - Custom domain setup (if required)
- **Acceptance Criteria Addressed**: AC-11, AC-12
- **Test Requirements**:
  - `rule` TR-15.1: Production पर Admin login flow 100% काम करे
  - `rule` TR-15.2: Production पर Resident login flow 100% काम करे
  - `rule` TR-15.3: Bill creation + publish flow production पर काम करे
  - `rule` TR-15.4: Calculation values production पर exact match करें (staging के साथ)
  - `rubric` TR-15.5: Production stability; Scale 1-5; 1 = broken in production; 3 = mostly works with issues; 5 = flawless + fast + reliable; Threshold >= 5

---

## Task 16: Supabase Production Database में Data Migration
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 7, Task 14
- **Description**:
  - (यदि ज़रूरत हो) मौजूदा SQLite/water_bill.db का data Supabase PostgreSQL में migrate करना
  - Seed data से शुरुआत के लिए तो setup है ही, लेकिन live data के लिए:
    - SQLite export → CSV → Supabase import
    - या custom script से direct migration
  - Data integrity verify करना (count match, foreign keys सही हैं)
  - Users को Supabase Auth में sync करना (password hashes bcrypt → Supabase format)
- **Acceptance Criteria Addressed**: AC-13, AC-15
- **Test Requirements**:
  - `rule` TR-16.1: सभी tables का row count match करे (old DB ↔ Supabase)
  - `rule` TR-16.2: सभी foreign key relations valid हों (orphan rows नहीं)
  - `rule` TR-16.3: Users login कर सकें migrated passwords के साथ
  - `rubric` TR-16.4: Migration accuracy; Scale 1-5; 1 = data loss/corruption; 3 = some mismatches; 5 = 100% accurate + verified; Threshold >= 5
