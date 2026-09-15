# Pathik SCO - Next.js माइग्रेशन - प्रोडक्ट रिक्वायरमेंट्स डॉक्यूमेंट

## Overview
- **Summary**: मौजूदा सोसायटी वॉटर बिल मैनेजमेंट सिस्टम (React/Express/FastAPI (ज़ को Next.js 15 (App Router) + Supabase + Vercel स्टैक में माइग्रेट करना
- **Purpose**: मोनोलिथिक स्ट्रक्चर को सर्वलेस आर्किटेक्चर में कनवर्ट करना, डिप्लॉयमेंट को सरल बनाना, Supabase का नेटिव उपयोग करना, और Vercel पर एक ही प्लेटफॉर्म पर पूरा ऐप होस्ट करना
- **Target Users**:
  - सोसायटी एडमिन (बिल बनाने, रेजिडेंट मैनेज करने वाले)
  - सोसायटी रेजिडेंट (अपना बिल देखने वाले)
  - डेवलपर्स (मेनटेन और एक्सटेंड करने वाले)

## Goals
1. मौजूदा React फ्रंटएंड को Next.js 15 App Router में फुली माइग्रेट करना (React Router को Next.js Routing से रिप्लेस)
2. सभी बैकएंड लॉजिक को Next.js API Routes + Server Actions में शिफ्ट करना (Express/FastAPI को हटाना)
3. Prisma SQLite को Supabase PostgreSQL + Supabase Auth से रिप्लेस करना
4. मौजूदा सभी 59 अखिलाफत टेस्ट को पास करना (कार्य-क्षमता बरकरार रखना)
5. Vercel पर सफलतापूर्वक प्रोडक्शन डिप्लॉय करना
6. सुरक्षा मानक (RLS Policies, Auth Guards, Input Validation) को बनाए रखना

## Non-Goals
1. कोर बिजनेस लॉजिक (UNIT/FALO/V/TOTAL फार्मूला) में बदलाव नहीं
2. नई फीचर्स जोड़ना नहीं (केवल माइग्रेशन)
3. UI/UX डिजाइन में बड़े बदलाव नहीं (फंक्शनलिटी समान रहेगी)
4. मोबाइल ऐप बनाना नहीं
5. पेमेंट गेटवे इंटीग्रेशन जोड़ना नहीं

## Background & Context
- मौजूदा प्रोजेक्ट में 2 अलग-अलग बैकएंड हैं: Node.js/Express (प्राइमरी) और Python/FastAPI (वैकल्पिक)
- डेटाबेस SQLite है जिसे Prisma ORM के साथ इस्तेमाल किया जा रहा है
- Supabase Auth का ही इस्तेमाल हो रहा है लेकिन DB operations Prisma के ज़रिए
- फ्रंटएंड React 18 + Vite 5 + Tailwind CSS है
- 59 acceptance tests सब पास हैं जिन्हें माइग्रेशन के बाद भी पास करना अनिवार्य है
- बीमा स्टेट्स: DRAFT → PUBLISHED → CORRECTED
- बाइ-मंथली बिलिंग साइकल: जन-फर, मार्च-अप्रैल, मई-जून, जुलाई-अगस्त, सितंबर-अक्टूबर, नवंबर-दिसंबर

## Functional Requirements

### फेज 1: प्रारंभिक सेटअप और फ्रंटएंड माइग्रेशन
- **FR-1**: Next.js 15 (App Router) का नया प्रोजेक्ट क्रिएट करना (TypeScript के साथ)
- **FR-2**: मौजूदा सभी React Components, Pages और Context को Next.js कंपोनेंट्स (Client/Server के अनुसार) में कनवर्ट करना
- **FR-3**: React Router routes को Next.js App Router file-based routing से रिप्लेस करना
- **FR-4**: Tailwind CSS का कॉन्फिगरेशन Next.js के साथ सेटअप करना
- **FR-5**: AuthContext को Next.js-friendly स्ट्रक्चर में माइग्रेट करना
- **FR-6**: Axios API को `fetch` + Server Actions/Route Handlers से रिप्लेस या अपडेट करना

### फेज 2: बैकएंड लॉजिक इंटीग्रेशन
- **FR-7**: सभी Express API Routes को Next.js Route Handlers (`app/api/*/route.ts`) में कनवर्ट करना
- **FR-8**: कोर बिजनेस लॉजिक (bill.service.js, calculation.service.js) को Next.js Server Actions / lib functions में शिफ्ट करना
- **FR-9**: Auth Middleware logic को Next.js Middleware (`middleware.ts`) + Server Components Guards में कनवर्ट करना
- **FR-10**: Carry-forward loop का पूरा implementation बनाए रखना (पिछले महीने का A.V → अगले महीने का H.V)
- **FR-11**: Bill States (DRAFT/PUBLISHED/CORRECTED) का पूरा flow बनाए रखना
- **FR-12**: Export functionality (Excel/PDF) को Next.js Route Handlers में इम्प्लीमेंट करना

### फेज 3: Supabase इंटीग्रेशन
- **FR-13**: नया Supabase प्रोजेक्ट क्रिएट करना और PostgreSQL Schema migrate करना
- **FR-14**: Supabase Auth को नेटिवली इस्तेमाल करना (Email/Password + optional Social Login)
- **FR-15**: सभी DB Queries को Supabase Client के ज़रिए करना (Prisma को हटाना)
- **FR-16**: Row Level Security (RLS) Policies सभी Tables पर लागू करना
  - Admin: अपनी Society का सभी डेटा एक्सेस कर सकते हैं
  - Resident: केवल अपना ही House/Bill डेटा देख सकते हैं
- **FR-17**: Realtime Subscriptions (optional) - Bill status बदलने पर Notification

### फेज 4: टेस्टिंग और वेरिफिकेशन
- **FR-18**: लोकल डेवलपमेंट में पूरा ऐप रन करना
- **FR-19**: सभी 59 Acceptance Tests को migrate या rewrite करके पास करना
- **FR-20**: Admin Login + सभी Admin Features का मैनुअल + ऑटोमेटेड टेस्टिंग
- **FR-21**: Resident Login + Resident Portal Features का टेस्टिंग
- **FR-22**: Negative Values, Carry-forward, Historical Data Protection जैसे एज केसेस का विशेष रूप से टेस्ट
- **FR-23**: सभी API Endpoints का इंटीग्रेशन टेस्टिंग

### फेज 5: Vercel पर होस्टिंग
- **FR-24**: Vercel Project Setup और GitHub/GitLab Repository कनेक्शन
- **FR-25**: Environment Variables को Vercel Dashboard में कॉन्फिगर करना
- **FR-26**: Production Build Deploy करना और Build Errors फिक्स करना
- **FR-27**: Post-deployment Smoke Testing सभी Features का
- **FR-28**: Production Environment में Supabase Connection वेरिफाई करना
- **FR-29**: Custom Domain Setup (optional)
- **FR-30**: Analytics + Monitoring Setup (Vercel Analytics)

## Non-Functional Requirements
- **NFR-1 (परफॉर्मेंस)**: LCP < 2.5s, FID < 100ms, CLS < 0.1 (Core Web Vitals)
- **NFR-2 (सुरक्षा)**: OWASP Top 10 कॉम्प्लायंट, CSRF/XSS सेफ, सारा इनपुट वैलिडेशन
- **NFR-3 (स्केलेबिलिटी)**: 1000 concurrent users तक सपोर्ट करना (Vercel Serverless)
- **NFR-4 (अवेलेबिलिटी)**: 99.9% uptime (Vercel + Supabase)
- **NFR-5 (मेंटेनेबिलिटी)**: TypeScript strict mode, ESLint, Prettier कॉन्फिगर्ड
- **NFR-6 (सीओ)**: कोई console.error/console.log प्रोडक्शन में नहीं
- **NFR-7 (एसईओ)**: Meta tags, Open Graph, JSON-LD सेटअप
- **NFR-8 (एक्सेसिबिलिटी)**: WCAG 2.1 AA Compliant (semantic HTML, aria-labels)

## Constraints
- **Technical**:
  - Next.js 15 App Router ही इस्तेमाल करना है (Pages Router नहीं)
  - Supabase Database + Supabase Auth ही इस्तेमाल करना है (कोई दूसरा DB/Auth नहीं)
  - Vercel पर ही deploy करना है
  - TypeScript अनिवार्य है
- **Business**:
  - सभी मौजूदा Features को एअरलेस बनाना है (कोई Feature हटाना नहीं)
  - Carry-forward loop और Calculation Logic बिल्कुल नहीं बदलना
  - 59 Tests में से सभी पास करने हैं
- **Dependencies**:
  - Supabase Account और Project Setup
  - Vercel Account
  - GitHub/GitLab Account (deploy के लिए)
  - Domain Name (optional, production के लिए)

## Assumptions
- उपयोगकर्ता के पास Supabase, Vercel और GitHub/GitLab के Accounts हैं
- मौजूदा डेटा (Seed data + Bill history) को Supabase में migrate किया जाएगा
- Social Login का कोई specific provider (Google/Facebook) अभी decide नहीं है (optional)
- मौजूदा UI/UX में कोई बदलाव की जरूरत नहीं है (फंक्शनलिटी focus)
- Acceptance Test को same assertions के साथ rewrite किया जा सकता है (tools बदल सकते हैं)

## Acceptance Criteria

### AC-1: Next.js प्रोजेक्ट सफलतापूर्वक सेटअप है
- **Type**: `rule`
- **Given**: Node.js 18+ installed है और नया Next.js 15 project init किया गया है
- **When**: `npm run dev` चलाते हैं
- **Then**: App `http://localhost:3000` पर load होता है और "Welcome to Next.js" या custom page दिखता है
- **Pass Condition**: Dev server बिना error के start होता है और page load होता है
- **Evidence**: Terminal output + Browser screenshot

### AC-2: Admin के सभी Pages माइग्रेट हुए हैं
- **Type**: `rule`
- **Given**: Admin user login है
- **When**: Admin Dashboard, Society Management, House Management, Resident Management, Monthly Bill, Bill History, Calc Config pages navigate किए जाते हैं
- **Then**: सभी pages बिना console error के load होते हैं, navigation सही काम करती है
- **Pass Condition**: सभी 7 admin routes पर navigation सफल, कोई 404/500 नहीं
- **Evidence**: Route list + manual navigation test screenshot

### AC-3: Resident के सभी Pages माइग्रेट हुए हैं
- **Type**: `rule`
- **Given**: Resident user login है
- **When**: Resident Dashboard और Bill Detail pages navigate किए जाते हैं
- **Then**: Pages load होते हैं, sirf उसी Resident का data दिखता है
- **Pass Condition**: Resident Dashboard load होता है, Bill Detail खुलता है, दूसरे Resident का Bill 404 देता है
- **Evidence**: Navigation test + cross-access 404 test

### AC-4: Carry-forward loop सही काम करता है
- **Type**: `rule`
- **Given**: August bill में House 10 का A.V = 768 है
- **When**: September का नया Bill create किया जाता है
- **Then**: September bill में House 10 का H.V = 768 auto-fill होता है
- **Pass Condition**: `findPreviousBill logic सही return करता है, entries में hv = 768 होता है
- **Evidence**: DB query result + Bill creation API response

### AC-5: Calculation सही है
- **Type**: `rule`
- **Given**: H.V = 768, A.V = 700
- **When**: Bill entry save किया जाता है
- **Then**: UNIT = 68, FALO = 340, V = 600, TOTAL = 940 होना चाहिए
- **Pass Condition**: सभी 4 values exact match करें
- **Evidence**: Calculation function unit test + API response

### AC-6: Negative Values सही preserve होते हैं
- **Type**: `rule`
- **Given**: H.V = 2704, A.V = 2663
- **When**: Bill entry save किया जाता है
- **Then**: UNIT = -41, FALO = -205, TOTAL = 395 (clamp नहीं होना चाहिए)
- **Pass Condition**: Negative values as-is रहें, warning दिखे लेकिन values बदले नहीं
- **Evidence**: Calculation test result

### AC-7: Bill State Machine सही काम करती है
- **Type**: `rule`
- **Given**: एक नया Bill DRAFT state में create हुआ है
- **When**: Publish किया जाता है, फिर entry edit की जाती है
- **Then**: State sequence: DRAFT → PUBLISHED → CORRECTED होना चाहिए
- **Pass Condition**: State transitions exact हों
- **Evidence**: API status field changes + 3 states दोनों में change होता है

### AC-8: Historical Data Protection है
- **Type**: `rule`
- **Given**: August bill PUBLISHED है और उसका data है
- **When**: September bill create और edit किया जाता है
- **Then**: August bill का data बिल्कुल नहीं बदलना चाहिए
- **Pass Condition**: August bill की entries before और after same रहें
- **Evidence**: Before/after DB comparison

### AC-9: Resident Authorization सही है (RLS)
- **Type**: `rule`
- **Given**: Resident A logged in है और Resident B का bill entryId है
- **When**: Resident A Resident B की bill detail access करने की कोशिश करता है
- **Then**: 404 / Not Found error आना चाहिए (या RLS row return नहीं करता)
- **Pass Condition**: Cross-access block हो जाता है
- **Evidence**: RLS Policy test + API 404 response

### AC-10: Supabase Auth Login सही काम करता है
- **Type**: `rule`
- **Given**: Valid admin@pathiksco.com / Admin@123 credentials हैं
- **When**: Login submit किया जाता है
- **Then**: Supabase session create होता है, user data fetch होता है, Admin Dashboard redirect होता है
- **Pass Condition**: Login success, session cookie set, redirect correct
- **Evidence**: Auth flow test + localStorage/session check

### AC-11: Vercel पर Build सफल होता है
- **Type**: `rule`
- **Given**: Code GitHub पर push हो चुका है और Vercel से connect है
- **When**: Deploy trigger किया जाता है
- **Then**: `next build` बिना error के complete होता है, deploy हो जाता है
- **Pass Condition**: Build exit code 0, Vercel dashboard पर URL accessible है
- **Evidence**: Build log output + Live URL check

### AC-12: सभी 59 Acceptance Tests पास करते हैं
- **Type**: `rule`
- **Given**: Migrated test suite है
- **When**: `npm test` चलाते हैं
- **Then**: 59/59 Tests pass करें
- **Pass Condition**: 0 failing tests
- **Evidence**: Test runner output summary

### AC-13: RLS Policies लागू हैं
- **Type**: `rule`
- **Given**: Supabase में सभी Tables बन चुकी हैं
- **When**: anon key के साथ direct query मारा जाता है (without login)
- **Then**: कोई data नहीं आना चाहिए (empty array या error)
- **Pass Condition**: सभी 8 tables पर RLS enable है और policies correct हैं
- **Evidence**: Supabase SQL Editor query result + Policies screenshot

### AC-14: Code Quality मानक
- **Type**: `rubric`
- **Dimension**: TypeScript coverage + Linting + Type safety
- **Scale**: 1-5
- **Anchors**: 1 = JS मात्र, कोई TS नहीं; 3 = आंशिक TS, any types; 5 = 100% strict TS, no any, ESLint 0 errors
- **Pass Threshold**: >= 4
- **Evidence**: `npx tsc --noEmit` + `npx eslint .` output

### AC-15: Migration पूर्णता
- **Type**: `rubric`
- **Dimension**: सभी मौजूदा Features का coverage
- **Scale**: 1-5
- **Anchors**: 1 = 50% से कम Features migrate; 3 = 80% Features; 5 = 100% Features + tests + bug-free
- **Pass Threshold**: >= 5
- **Evidence**: Feature checklist comparison (old vs new)

## Open Questions
- [ ] Social Login कौन से Providers चाहिए? (Google, Facebook, Apple?)
- [ ] मौजूदा SQLite DB का live data migrate करना है या seed से शुरू करना है?
- [ ] Production के लिए custom domain चाहिए या vercel.app subdomain चलेगा?
- [ ] Email Notifications (bill publish होने पर) चाहिए?
- [ ] PDF/Excel Export के लिए कौन सा इस्तेमाल रखना है (existing pdfkit/exceljs या कोई नया?
- [ ] Realtime features (live updates) ज़रूरी हैं या optional में डीआर?
