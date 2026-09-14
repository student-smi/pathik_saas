/**
 * ACCEPTANCE TESTS
 * ─────────────────────────────────────────────────────────────────────────
 * Tests the core business rules defined in the spec:
 *
 * T1  — Carry-forward: Previous A.V → Current H.V (House 10)
 * T2  — Calculation: UNIT=68, FALO=340, V=600, TOTAL=940
 * T3  — Second month: carry-forward repeats
 * T4  — Negative values preserved (UNIT=-41, FALO=-205, TOTAL=395)
 * T5  — Resident can only see their own house
 * T6  — UNIT formula: UNIT = H.V − A.V (not reversed)
 * T7  — Bill states: DRAFT → PUBLISHED → CORRECTED
 * T8  — Historical data protection (August untouched after September created)
 * ─────────────────────────────────────────────────────────────────────────
 */

const BASE = 'http://localhost:5000/api';
let passed = 0;
let failed = 0;
let adminToken = '';
let resident10Token = '';
let resident11Token = '';
let societyId = '';
let house10Id = '';
let house11Id = '';
let sepBillId = '';
let house10EntryId = '';
let octBillId = '';

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json };
}

function assert(desc, condition, detail) {
  if (condition) {
    console.log(`  ✅ PASS: ${desc}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
    if (detail !== undefined) console.error(`         Expected/Got: ${JSON.stringify(detail)}`);
    failed++;
  }
}

async function run() {
  console.log('\n════════════════════════════════════════════════════');
  console.log('    SOCIETY WATER BILL — ACCEPTANCE TESTS');
  console.log('════════════════════════════════════════════════════\n');

  // ── Health check ──────────────────────────────────────────────
  console.log('[ HEALTH CHECK ]');
  const health = await req('GET', '/health');
  assert('Server is running', health.status === 200);

  // ── T0: Admin Login ───────────────────────────────────────────
  console.log('\n[ T0: ADMIN LOGIN ]');
  const loginRes = await req('POST', '/auth/login', { email: 'admin@pathiksco.com', password: 'Admin@123' });
  assert('Admin login succeeds', loginRes.status === 200);
  assert('Token returned', !!loginRes.data.token);
  assert('Role is ADMIN', loginRes.data.user?.role === 'ADMIN');
  adminToken = loginRes.data.token;

  // ── Get Society ───────────────────────────────────────────────
  console.log('\n[ SETUP: FETCH SOCIETY & HOUSES ]');
  const socRes = await req('GET', '/societies', null, adminToken);
  assert('Societies loaded', socRes.status === 200 && socRes.data.length > 0);
  societyId = socRes.data[0]?.id;
  assert('Society ID obtained', !!societyId);

  const housesRes = await req('GET', `/houses?societyId=${societyId}`, null, adminToken);
  assert('Houses loaded', housesRes.status === 200);
  const h10 = housesRes.data.find(h => h.houseNo === '10');
  const h11 = housesRes.data.find(h => h.houseNo === '11');
  house10Id = h10?.id;
  house11Id = h11?.id;
  assert('House 10 found', !!house10Id);
  assert('House 11 found', !!house11Id);

  // ── T1: Carry-forward Test ────────────────────────────────────
  console.log('\n[ T1: CARRY-FORWARD — Previous A.V → Current H.V ]');
  console.log('   August 2026 House 10: H.V=666, A.V=768');
  console.log('   Creating September 2026 bill...');

  const sepRes = await req('POST', '/bills/create', { societyId, year: 2026, month: 9 }, adminToken);
  // If already exists (rerun scenario), load it
  if (sepRes.status === 409) {
    console.log('   (September bill already exists, loading...)');
    const existing = await req('GET', `/bills/${societyId}/2026/9`, null, adminToken);
    assert('September bill loaded', existing.status === 200);
    sepBillId = existing.data.id;
    const entry10 = existing.data.entries.find(e => e.house.houseNo === '10');
    assert('T1: House 10 H.V = 768 (carried from Aug A.V)', entry10?.hv === 768, entry10?.hv);
    house10EntryId = entry10?.id;
  } else {
    assert('T1: September bill created', sepRes.status === 201);
    sepBillId = sepRes.data.bill?.id;
    const entry10 = sepRes.data.bill?.entries.find(e => e.house.houseNo === '10');
    assert('T1: House 10 H.V = 768 (auto-filled from Aug A.V=768)', entry10?.hv === 768, entry10?.hv);
    assert('T1: H.V auto-filled = true', entry10?.hvAutoFilled === true);
    assert('T1: A.V is null (not yet entered)', entry10?.av === null);
    assert('T1: Carry-forward reported', sepRes.data.hasPrevBill === true);
    house10EntryId = entry10?.id;

    // Verify House 11 as well (HV should = 4375)
    const entry11 = sepRes.data.bill?.entries.find(e => e.house.houseNo === '11');
    assert('T1: House 11 H.V = 4375 (carried from Aug A.V=4375)', entry11?.hv === 4375, entry11?.hv);
  }

  // ── T2: Calculation Test ──────────────────────────────────────
  console.log('\n[ T2: CALCULATION — Admin enters A.V=700 for House 10 ]');
  console.log('   H.V=768, A.V=700 → UNIT=68, FALO=340, V=600, TOTAL=940');

  const entryRes = await req('PATCH', `/bills/entry/${house10EntryId}/av`, { av: 700, societyId }, adminToken);
  assert('T2: A.V entry saved', entryRes.status === 200, entryRes.data);
  assert('T2: UNIT = 768 − 700 = 68', entryRes.data.unit === 68, entryRes.data.unit);
  assert('T2: FALO = 68 × 5 = 340', entryRes.data.falo === 340, entryRes.data.falo);
  assert('T2: V = 600', entryRes.data.v === 600, entryRes.data.v);
  assert('T2: TOTAL = 600 + 340 = 940', entryRes.data.total === 940, entryRes.data.total);
  assert('T2: isNegative = false', entryRes.data.isNegative === false);
  assert('T2: Admin did NOT have to enter H.V', entryRes.data.hvAutoFilled === true);

  // ── T3: Second Month Carry-forward ────────────────────────────
  console.log('\n[ T3: SECOND MONTH — October 2026, H.V must = 700 ]');

  const octRes = await req('POST', '/bills/create', { societyId, year: 2026, month: 10 }, adminToken);
  if (octRes.status === 409) {
    console.log('   (October bill already exists, loading...)');
    const existing = await req('GET', `/bills/${societyId}/2026/10`, null, adminToken);
    octBillId = existing.data.id;
    const entry10oct = existing.data.entries.find(e => e.house.houseNo === '10');
    assert('T3: October House 10 H.V = 700 (carried from Sep A.V=700)', entry10oct?.hv === 700, entry10oct?.hv);
  } else {
    assert('T3: October bill created', octRes.status === 201);
    octBillId = octRes.data.bill?.id;
    const entry10oct = octRes.data.bill?.entries.find(e => e.house.houseNo === '10');
    assert('T3: October House 10 H.V = 700 (auto-filled from Sep A.V=700)', entry10oct?.hv === 700, entry10oct?.hv);
    assert('T3: Monthly loop working — H.V carries forward again', entry10oct?.hvAutoFilled === true);
  }

  // ── T4: Negative Values ───────────────────────────────────────
  console.log('\n[ T4: NEGATIVE VALUES — House 13, Aug 2026 ]');
  console.log('   H.V=2704, A.V=2663, UNIT=-41, FALO=-205, TOTAL=395');

  const augBill = await req('GET', `/bills/${societyId}/2026/8`, null, adminToken);
  assert('T4: August 2026 bill accessible', augBill.status === 200);
  const entry13 = augBill.data.entries.find(e => e.house.houseNo === '13');
  assert('T4: House 13 exists in Aug bill', !!entry13);
  assert('T4: UNIT = -41 (preserved, not clamped to zero)', entry13?.unit === -41, entry13?.unit);
  assert('T4: FALO = -205 (preserved)', entry13?.falo === -205, entry13?.falo);
  assert('T4: TOTAL = 395 (600 + (-205))', entry13?.total === 395, entry13?.total);
  assert('T4: isNegative = true (flag set)', entry13?.isNegative === true);
  assert('T4: H.V = 2704 (unchanged)', entry13?.hv === 2704, entry13?.hv);
  assert('T4: A.V = 2663 (unchanged)', entry13?.av === 2663, entry13?.av);

  // Sep bill House 13 H.V should carry forward as 2663
  const sepBill = await req('GET', `/bills/${societyId}/2026/9`, null, adminToken);
  const entry13Sep = sepBill.data?.entries.find(e => e.house.houseNo === '13');
  assert('T4: Sep House 13 H.V = 2663 (negative A.V carried forward correctly)', entry13Sep?.hv === 2663, entry13Sep?.hv);

  // ── T5: Resident Authorization ────────────────────────────────
  console.log('\n[ T5: RESIDENT AUTHORIZATION — Resident can only see own house ]');

  const res10Login = await req('POST', '/auth/login', { email: 'resident10@pathiksco.com', password: 'Resident@123' });
  const res11Login = await req('POST', '/auth/login', { email: 'resident11@pathiksco.com', password: 'Resident@123' });
  assert('T5: Resident 10 login succeeds', res10Login.status === 200);
  assert('T5: Resident 11 login succeeds', res11Login.status === 200);
  resident10Token = res10Login.data.token;
  resident11Token = res11Login.data.token;

  // Resident 10 can see their bills
  const myBills = await req('GET', '/portal/bills', null, resident10Token);
  assert('T5: Resident 10 can access /portal/bills', myBills.status === 200);

  // All their bills must be for House 10 only
  const nonHouse10 = myBills.data.filter(e => e.house.houseNo !== '10');
  assert('T5: Resident 10 bills — ALL are for House 10 only', nonHouse10.length === 0, `Non-house-10 entries: ${nonHouse10.length}`);

  // Resident 11 attempts to access Resident 10's specific bill entry
  const myBills10 = await req('GET', '/portal/bills', null, resident10Token);
  const entry10Sep = myBills10.data.find(e => e.monthlyBill.month === 9 && e.monthlyBill.year === 2026);
  if (entry10Sep) {
    // Resident 11 tries to fetch Resident 10's bill entry
    const crossAccessAttempt = await req('GET', `/portal/bills/${entry10Sep.id}`, null, resident11Token);
    assert('T5: Resident 11 CANNOT access Resident 10\'s bill (returns 404)', crossAccessAttempt.status === 404, crossAccessAttempt.status);
  }

  // Admin endpoints return 403 for resident token
  const adminAttempt = await req('GET', '/societies', null, resident10Token);
  assert('T5: Resident cannot access admin routes (403)', adminAttempt.status === 403, adminAttempt.status);

  // ── T6: UNIT Formula Validation ──────────────────────────────
  console.log('\n[ T6: UNIT FORMULA = H.V − A.V (not reversed) ]');
  const previewRes = await req('GET', `/bills/preview?hv=768&av=700&societyId=${societyId}`, null, adminToken);
  assert('T6: Preview endpoint returns 200', previewRes.status === 200);
  assert('T6: UNIT = H.V − A.V = 768 − 700 = 68', previewRes.data.unit === 68, previewRes.data.unit);
  assert('T6: FALO = 68 × 5 = 340', previewRes.data.falo === 340, previewRes.data.falo);
  assert('T6: TOTAL = 600 + 340 = 940', previewRes.data.total === 940, previewRes.data.total);

  // Preview with negative
  const negPreview = await req('GET', `/bills/preview?hv=2704&av=2763&societyId=${societyId}`, null, adminToken);
  assert('T6: Negative preview: UNIT = 2704 − 2763 = -59', negPreview.data.unit === -59, negPreview.data.unit);
  assert('T6: Negative FALO = -295', negPreview.data.falo === -295, negPreview.data.falo);
  assert('T6: Negative TOTAL = 305 (600 + (-295))', negPreview.data.total === 305, negPreview.data.total);
  assert('T6: isNegative flag = true', negPreview.data.isNegative === true);

  // ── T7: Bill States ───────────────────────────────────────────
  console.log('\n[ T7: BILL STATES — DRAFT → PUBLISHED → CORRECTED ]');

  // Enter all A.V values for Sep bill so it can be published
  const sepBillFull = await req('GET', `/bills/${societyId}/2026/9`, null, adminToken);
  for (const e of sepBillFull.data.entries) {
    if (e.av === null) {
      await req('PATCH', `/bills/entry/${e.id}/av`, { av: 1000, societyId }, adminToken);
    }
  }

  assert('T7: Sep bill starts as DRAFT', sepBillFull.data.status === 'DRAFT');

  const publishRes = await req('POST', `/bills/${sepBillId}/publish`, null, adminToken);
  assert('T7: Bill published successfully', publishRes.status === 200, publishRes.data);
  assert('T7: Status = PUBLISHED', publishRes.data.status === 'PUBLISHED', publishRes.data.status);

  // Resident can now see the bill
  const residentBills = await req('GET', '/portal/bills', null, resident10Token);
  const residentSepBill = residentBills.data.find(e => e.monthlyBill.year === 2026 && e.monthlyBill.month === 9);
  assert('T7: Resident can see published bill', !!residentSepBill);

  // Admin corrects the bill (edit A.V after publish → CORRECTED)
  const corrRes = await req('PATCH', `/bills/entry/${house10EntryId}/av`, { av: 710, societyId }, adminToken);
  assert('T7: A.V correction saved', corrRes.status === 200);

  const corrBill = await req('GET', `/bills/${societyId}/2026/9`, null, adminToken);
  assert('T7: Status = CORRECTED after edit', corrBill.data.status === 'CORRECTED', corrBill.data.status);

  // Resident can still see it (corrected bills are visible)
  const residentBillsAfter = await req('GET', '/portal/bills', null, resident10Token);
  const correctedEntry = residentBillsAfter.data.find(e => e.monthlyBill.year === 2026 && e.monthlyBill.month === 9);
  assert('T7: Resident can see CORRECTED bill', !!correctedEntry);
  assert('T7: Resident sees updated TOTAL', correctedEntry?.total !== 940); // 710 AV → different total

  // ── T8: Historical Data Protection ───────────────────────────
  console.log('\n[ T8: HISTORICAL DATA PROTECTION ]');

  const augCheck = await req('GET', `/bills/${societyId}/2026/8`, null, adminToken);
  const aug10 = augCheck.data.entries.find(e => e.house.houseNo === '10');
  assert('T8: August House 10 A.V still = 768 (not overwritten)', aug10?.av === 768, aug10?.av);
  assert('T8: August House 10 H.V still = 666 (not overwritten)', aug10?.hv === 666, aug10?.hv);
  assert('T8: August bill status still PUBLISHED', augCheck.data.status === 'PUBLISHED', augCheck.data.status);

  const aug13 = augCheck.data.entries.find(e => e.house.houseNo === '13');
  assert('T8: August House 13 UNIT still = -41 (historical negative preserved)', aug13?.unit === -41, aug13?.unit);

  // ── SUMMARY ───────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('════════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.error(`❌ ${failed} test(s) failed. Review output above.`);
    process.exit(1);
  } else {
    console.log('🎉 ALL ACCEPTANCE TESTS PASSED!');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
