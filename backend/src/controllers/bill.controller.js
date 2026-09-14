const billService = require('../services/bill.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper: verify society belongs to admin
async function verifySociety(societyId, adminId) {
  const s = await prisma.society.findFirst({ where: { id: societyId, adminId } });
  if (!s) throw Object.assign(new Error('Society not found'), { status: 404 });
  return s;
}

// GET /api/bills?societyId=
const listBills = async (req, res, next) => {
  try {
    const { societyId } = req.query;
    await verifySociety(societyId, req.user.id);
    const bills = await billService.listBills(societyId);
    res.json(bills);
  } catch (err) {
    next(err);
  }
};

// POST /api/bills/create
const createBill = async (req, res, next) => {
  try {
    const { societyId, year, month } = req.body;
    await verifySociety(societyId, req.user.id);
    const result = await billService.createMonthlyBill(societyId, parseInt(year), parseInt(month));
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/bills/:societyId/:year/:month
const getBill = async (req, res, next) => {
  try {
    const { societyId, year, month } = req.params;
    await verifySociety(societyId, req.user.id);
    const bill = await billService.getMonthlyBill(societyId, parseInt(year), parseInt(month));
    res.json(bill);
  } catch (err) {
    next(err);
  }
};

// GET /api/bills/by-id/:billId
const getBillById = async (req, res, next) => {
  try {
    const bill = await prisma.monthlyBill.findUnique({
      where: { id: req.params.billId },
      include: {
        entries: {
          include: { house: true },
          orderBy: { house: { houseNo: 'asc' } }
        },
        society: true
      }
    });
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    const society = await prisma.society.findFirst({
      where: { id: bill.societyId, adminId: req.user.id }
    });
    if (!society) return res.status(403).json({ error: 'Access denied' });
    res.json(bill);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/bills/entry/:entryId/av — Admin enters/updates A.V
const updateEntryAv = async (req, res, next) => {
  try {
    const { av, societyId } = req.body;
    await verifySociety(societyId, req.user.id);
    const entry = await billService.updateBillEntry(req.params.entryId, parseFloat(av), societyId);
    res.json(entry);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/bills/entry/:entryId/hv — Admin manually sets H.V
const updateEntryHv = async (req, res, next) => {
  try {
    const { hv, societyId } = req.body;
    await verifySociety(societyId, req.user.id);
    const entry = await billService.setManualHv(req.params.entryId, parseFloat(hv), societyId);
    res.json(entry);
  } catch (err) {
    next(err);
  }
};

// POST /api/bills/:billId/publish
const publishBill = async (req, res, next) => {
  try {
    const bill = await prisma.monthlyBill.findUnique({ where: { id: req.params.billId } });
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    await verifySociety(bill.societyId, req.user.id);
    const published = await billService.publishBill(req.params.billId);
    res.json(published);
  } catch (err) {
    next(err);
  }
};

// POST /api/bills/:billId/unpublish
const unpublishBill = async (req, res, next) => {
  try {
    const bill = await prisma.monthlyBill.findUnique({ where: { id: req.params.billId } });
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    await verifySociety(bill.societyId, req.user.id);
    const unpublished = await billService.unpublishBill(req.params.billId);
    res.json(unpublished);
  } catch (err) {
    next(err);
  }
};

// GET /api/bills/preview
const previewCalculation = async (req, res, next) => {
  try {
    const { hv, av, societyId } = req.query;
    await verifySociety(societyId, req.user.id);
    const { calculateEntry, loadConfigs } = require('../services/calculation.service');
    const configs = await loadConfigs(societyId);
    const result = calculateEntry(parseFloat(hv), parseFloat(av), configs);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// POST /api/bills/:billId/sync-houses
// Add any society houses that are missing from this bill's entries
// Useful when a new house was added after the bill was created
const syncMissingHouses = async (req, res, next) => {
  try {
    const bill = await prisma.monthlyBill.findUnique({
      where: { id: req.params.billId },
      include: { entries: true }
    });
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    await verifySociety(bill.societyId, req.user.id);

    // All active houses for this society
    const allHouses = await prisma.house.findMany({
      where: { societyId: bill.societyId, isActive: true }
    });

    // Which ones are missing?
    const existingHouseIds = new Set(bill.entries.map(e => e.houseId));
    const missing = allHouses.filter(h => !existingHouseIds.has(h.id));

    if (missing.length === 0) {
      return res.json({ message: 'All houses already present', added: [] });
    }

    // For each missing house, find prev bill AV
    const { findPreviousBill } = require('../services/bill.service');
    const prevBill = await findPreviousBill(bill.societyId, bill.year, bill.month);

    const added = [];
    for (const house of missing) {
      const prevEntry = prevBill?.entries?.find(e => e.houseId === house.id);
      const hvAutoFilled = !!(prevEntry && prevEntry.av !== null);
      await prisma.billEntry.create({
        data: {
          monthlyBillId: bill.id,
          houseId: house.id,
          hv: hvAutoFilled ? prevEntry.av : 0,
          hvAutoFilled,
          isManualHv: !hvAutoFilled,
          av: null, unit: null, falo: null, v: 600, total: null
        }
      });
      added.push(house.houseNo);
    }

    // Return refreshed bill
    const updated = await prisma.monthlyBill.findUnique({
      where: { id: req.params.billId },
      include: {
        entries: { include: { house: true }, orderBy: { house: { houseNo: 'asc' } } },
        society: true
      }
    });
    res.json({ message: `Added ${added.length} house(s): ${added.join(', ')}`, bill: updated, added });
  } catch (err) {
    next(err);
  }
};
const deleteBill = async (req, res, next) => {
  try {
    const bill = await prisma.monthlyBill.findUnique({ where: { id: req.params.billId } });
    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    await verifySociety(bill.societyId, req.user.id);
    if (bill.status === 'PUBLISHED') {
      return res.status(400).json({ error: 'Unpublish the bill before deleting.' });
    }
    await prisma.monthlyBill.delete({ where: { id: req.params.billId } });
    res.json({ message: 'Bill deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listBills,
  createBill,
  getBill,
  getBillById,
  updateEntryAv,
  updateEntryHv,
  publishBill,
  unpublishBill,
  previewCalculation,
  deleteBill,
  syncMissingHouses
};
