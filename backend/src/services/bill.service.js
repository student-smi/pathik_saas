/**
 * BILL SERVICE
 * Core business logic for the monthly bill carry-forward loop.
 *
 * THE MONTHLY LOOP:
 *   Previous Month A.V → Current Month H.V
 *   Admin enters Current Month A.V
 *   System calculates UNIT, FALO, V, TOTAL
 *   Save → Current A.V becomes next month's H.V
 */

const { PrismaClient } = require('@prisma/client');
const { calculateEntry, loadConfigs } = require('./calculation.service');

const prisma = new PrismaClient();

/**
 * Get the name of a month+year for display.
 */
function monthLabel(year, month) {
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  return `${months[month - 1]} ${year}`;
}

/**
 * Get the previous month's year and month number.
 */
function previousMonth(year, month) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

/**
 * CREATE MONTHLY BILL
 *
 * 1. Check if bill for [societyId, year, month] already exists → error
 * 2. Load all active houses for the society
 * 3. For each house: look up previous month's A.V → use as H.V
 *    If no previous month exists: H.V must be provided manually
 * 4. Create MonthlyBill + BillEntry records
 *
 * Returns the created MonthlyBill with entries.
 */
async function createMonthlyBill(societyId, year, month) {
  // Guard: already exists?
  const existing = await prisma.monthlyBill.findUnique({
    where: { societyId_year_month: { societyId, year, month } }
  });
  if (existing) {
    const err = new Error(`Bill for ${monthLabel(year, month)} already exists`);
    err.status = 409;
    throw err;
  }

  // Load active houses
  const houses = await prisma.house.findMany({
    where: { societyId, isActive: true },
    orderBy: { houseNo: 'asc' }
  });

  if (houses.length === 0) {
    const err = new Error('No active houses found in this society');
    err.status = 400;
    throw err;
  }

  // Find previous month's bill
  const prev = previousMonth(year, month);
  const prevBill = await prisma.monthlyBill.findUnique({
    where: { societyId_year_month: { societyId, year: prev.year, month: prev.month } },
    include: {
      entries: {
        include: { house: true }
      }
    }
  });

  // Build a map: houseId → previous A.V
  const prevAvMap = {};
  let hasPrevBill = false;

  if (prevBill) {
    hasPrevBill = true;
    for (const entry of prevBill.entries) {
      if (entry.av !== null && entry.av !== undefined) {
        prevAvMap[entry.houseId] = entry.av;
      }
    }
  }

  // Create MonthlyBill
  const monthlyBill = await prisma.monthlyBill.create({
    data: {
      societyId,
      year,
      month,
      status: 'DRAFT'
    }
  });

  // Create BillEntry for each house
  const entriesData = houses.map(house => {
    const prevAv = prevAvMap[house.id];
    const hvAutoFilled = hasPrevBill && prevAv !== undefined;

    return {
      monthlyBillId: monthlyBill.id,
      houseId: house.id,
      // ── THE CORE CARRY-FORWARD RULE ──────────────────────────
      // Previous Month A.V → Current Month H.V
      hv: hvAutoFilled ? prevAv : 0,
      hvAutoFilled,
      isManualHv: !hvAutoFilled,
      av: null,         // Admin must enter
      unit: null,
      falo: null,
      v: 600,
      total: null
    };
  });

  await prisma.billEntry.createMany({ data: entriesData });

  // Return the created bill with entries
  const fullBill = await prisma.monthlyBill.findUnique({
    where: { id: monthlyBill.id },
    include: {
      entries: {
        include: { house: true },
        orderBy: { house: { houseNo: 'asc' } }
      },
      society: true
    }
  });

  return {
    bill: fullBill,
    hasPrevBill,
    prevMonth: monthLabel(prev.year, prev.month),
    missingPrevHouses: hasPrevBill
      ? houses
          .filter(h => prevAvMap[h.id] === undefined)
          .map(h => h.houseNo)
      : houses.map(h => h.houseNo)
  };
}

/**
 * ADD A NEW HOUSE TO ALL EXISTING DRAFT BILLS
 *
 * Jab naya ghar society mein add hota hai, un sabhi DRAFT bills mein
 * us ghar ki entry automatically add hoti hai.
 *
 * - Agar us bill ke pichhle mahine ka koi bill hai aur us ghar ka AV
 *   wahan se milta hai → HV auto-fill hoga
 * - Nahi mila → HV = 0, manual entry required
 *
 * PUBLISHED bills ko touch nahi kiya jaata — historical data safe.
 */
async function addHouseToDraftBills(houseId, societyId) {
  // Sirf DRAFT bills mein add karo
  const draftBills = await prisma.monthlyBill.findMany({
    where: { societyId, status: 'DRAFT' },
    orderBy: [{ year: 'asc' }, { month: 'asc' }]
  });

  for (const bill of draftBills) {
    // Already iss bill mein entry hai?
    const exists = await prisma.billEntry.findUnique({
      where: { monthlyBillId_houseId: { monthlyBillId: bill.id, houseId } }
    });
    if (exists) continue;

    // Pichhle mahine ka AV dhundo
    const prev = previousMonth(bill.year, bill.month);
    const prevBill = await prisma.monthlyBill.findUnique({
      where: { societyId_year_month: { societyId, year: prev.year, month: prev.month } },
      include: { entries: { where: { houseId } } }
    });

    const prevEntry = prevBill?.entries?.[0];
    const hvAutoFilled = !!(prevEntry && prevEntry.av !== null);

    await prisma.billEntry.create({
      data: {
        monthlyBillId: bill.id,
        houseId,
        hv: hvAutoFilled ? prevEntry.av : 0,
        hvAutoFilled,
        isManualHv: !hvAutoFilled,
        av: null,
        unit: null,
        falo: null,
        v: 600,
        total: null
      }
    });
  }
}


async function getMonthlyBill(societyId, year, month) {
  const bill = await prisma.monthlyBill.findUnique({
    where: { societyId_year_month: { societyId, year, month } },
    include: {
      entries: {
        include: { house: true },
        orderBy: { house: { houseNo: 'asc' } }
      },
      society: true
    }
  });

  if (!bill) {
    const err = new Error(`No bill found for ${monthLabel(year, month)}`);
    err.status = 404;
    throw err;
  }

  return bill;
}

/**
 * UPDATE A SINGLE BILL ENTRY (Admin enters / corrects A.V)
 *
 * When A.V is saved:
 *   1. Recalculate UNIT, FALO, V, TOTAL
 *   2. Persist
 *   3. If bill was PUBLISHED, mark as CORRECTED
 */
async function updateBillEntry(entryId, av, societyId) {
  const entry = await prisma.billEntry.findUnique({
    where: { id: entryId },
    include: { monthlyBill: true }
  });

  if (!entry) {
    const err = new Error('Bill entry not found');
    err.status = 404;
    throw err;
  }

  const configs = await loadConfigs(societyId);
  const result = calculateEntry(entry.hv, av, configs);

  const updatedEntry = await prisma.billEntry.update({
    where: { id: entryId },
    data: {
      av,
      unit: result.unit,
      falo: result.falo,
      v: result.v,
      total: result.total,
      aa: result.aa,
      b: result.b,
      dan: result.dan,
      wch: result.wch,
      isNegative: result.isNegative
    },
    include: { house: true }
  });

  // If bill was PUBLISHED, mark it CORRECTED
  if (entry.monthlyBill.status === 'PUBLISHED') {
    await prisma.monthlyBill.update({
      where: { id: entry.monthlyBillId },
      data: { status: 'CORRECTED' }
    });
  }

  return updatedEntry;
}

/**
 * MANUALLY SET H.V for an entry (when no previous month exists)
 */
async function setManualHv(entryId, hv, societyId) {
  const entry = await prisma.billEntry.findUnique({
    where: { id: entryId }
  });
  if (!entry) {
    const err = new Error('Bill entry not found');
    err.status = 404;
    throw err;
  }

  const updateData = {
    hv,
    isManualHv: true,
    hvAutoFilled: false
  };

  // Recalculate if A.V is already set
  if (entry.av !== null) {
    const configs = await loadConfigs(societyId);
    const result = calculateEntry(hv, entry.av, configs);
    Object.assign(updateData, {
      unit: result.unit,
      falo: result.falo,
      v: result.v,
      total: result.total,
      aa: result.aa,
      b: result.b,
      dan: result.dan,
      wch: result.wch,
      isNegative: result.isNegative
    });
  }

  return prisma.billEntry.update({
    where: { id: entryId },
    data: updateData,
    include: { house: true }
  });
}

/**
 * PUBLISH BILL
 * Changes status from DRAFT → PUBLISHED
 * Residents can see published bills.
 */
async function publishBill(billId) {
  const bill = await prisma.monthlyBill.findUnique({ where: { id: billId } });
  if (!bill) {
    const err = new Error('Bill not found'); err.status = 404; throw err;
  }
  if (bill.status === 'PUBLISHED') {
    const err = new Error('Bill is already published'); err.status = 409; throw err;
  }

  return prisma.monthlyBill.update({
    where: { id: billId },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
    include: {
      entries: { include: { house: true }, orderBy: { house: { houseNo: 'asc' } } },
      society: true
    }
  });
}

/**
 * UNPUBLISH BILL (revert to DRAFT)
 */
async function unpublishBill(billId) {
  return prisma.monthlyBill.update({
    where: { id: billId },
    data: { status: 'DRAFT', publishedAt: null }
  });
}

/**
 * LIST ALL BILLS for a society (summary)
 */
async function listBills(societyId) {
  return prisma.monthlyBill.findMany({
    where: { societyId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: {
      _count: { select: { entries: true } }
    }
  });
}

module.exports = {
  createMonthlyBill,
  getMonthlyBill,
  updateBillEntry,
  setManualHv,
  publishBill,
  unpublishBill,
  listBills,
  monthLabel,
  addHouseToDraftBills,
  previousMonth
};
