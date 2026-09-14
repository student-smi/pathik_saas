/**
 * RESIDENT PORTAL CONTROLLER
 *
 * SECURITY: A resident can ONLY see bills for their own house.
 * Database-level filtering enforces this — URL manipulation cannot bypass it.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get the authenticated resident's profile + house info.
 */
const getMyProfile = async (req, res, next) => {
  try {
    const resident = await prisma.resident.findUnique({
      where: { userId: req.user.id },
      include: {
        house: {
          include: { society: true }
        }
      }
    });

    if (!resident) {
      return res.status(404).json({ error: 'Resident profile not found' });
    }

    res.json({
      name: resident.name,
      phone: resident.phone,
      houseNo: resident.house.houseNo,
      floor: resident.house.floor,
      societyName: resident.house.society.name,
      societyCity: resident.house.society.city
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all PUBLISHED bills for the resident's house only.
 * Ordered newest first.
 *
 * SECURITY: houseId is derived from the authenticated user's resident record,
 * NOT from any URL parameter. The resident cannot specify a different houseId.
 */
const getMyBills = async (req, res, next) => {
  try {
    const resident = await prisma.resident.findUnique({
      where: { userId: req.user.id },
      include: { house: true }
    });

    if (!resident) {
      return res.status(404).json({ error: 'Resident profile not found' });
    }

    // Only PUBLISHED and CORRECTED bills are visible to residents
    const entries = await prisma.billEntry.findMany({
      where: {
        houseId: resident.houseId,    // ← enforced from auth, not URL
        monthlyBill: {
          status: { in: ['PUBLISHED', 'CORRECTED'] }
        }
      },
      include: {
        monthlyBill: {
          include: { society: true }
        },
        house: true
      },
      orderBy: [
        { monthlyBill: { year: 'desc' } },
        { monthlyBill: { month: 'desc' } }
      ]
    });

    res.json(entries);
  } catch (err) {
    next(err);
  }
};

/**
 * Get a single bill entry for the resident's house.
 *
 * SECURITY: Even though a billEntryId is in the URL,
 * we verify it belongs to the resident's house in the database query.
 */
const getMyBillEntry = async (req, res, next) => {
  try {
    const resident = await prisma.resident.findUnique({
      where: { userId: req.user.id }
    });

    if (!resident) {
      return res.status(404).json({ error: 'Resident profile not found' });
    }

    const entry = await prisma.billEntry.findFirst({
      where: {
        id: req.params.entryId,
        houseId: resident.houseId,           // ← must match resident's house
        monthlyBill: {
          status: { in: ['PUBLISHED', 'CORRECTED'] }
        }
      },
      include: {
        monthlyBill: { include: { society: true } },
        house: true
      }
    });

    if (!entry) {
      // Deliberately vague — don't reveal whether entry exists for another house
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.json(entry);
  } catch (err) {
    next(err);
  }
};

/**
 * Get current month's bill (latest published bill for resident's house).
 */
const getCurrentBill = async (req, res, next) => {
  try {
    const resident = await prisma.resident.findUnique({
      where: { userId: req.user.id }
    });

    if (!resident) {
      return res.status(404).json({ error: 'Resident profile not found' });
    }

    const entry = await prisma.billEntry.findFirst({
      where: {
        houseId: resident.houseId,
        monthlyBill: {
          status: { in: ['PUBLISHED', 'CORRECTED'] }
        }
      },
      include: {
        monthlyBill: { include: { society: true } },
        house: true
      },
      orderBy: [
        { monthlyBill: { year: 'desc' } },
        { monthlyBill: { month: 'desc' } }
      ]
    });

    if (!entry) {
      return res.status(404).json({ error: 'No published bill available' });
    }

    res.json(entry);
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyProfile, getMyBills, getMyBillEntry, getCurrentBill };
