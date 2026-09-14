const { PrismaClient } = require('@prisma/client');
const { addHouseToDraftBills } = require('../services/bill.service');
const prisma = new PrismaClient();

// Helper: verify society belongs to admin
async function verifySociety(societyId, adminId) {
  const society = await prisma.society.findFirst({
    where: { id: societyId, adminId }
  });
  if (!society) throw Object.assign(new Error('Society not found'), { status: 404 });
  return society;
}

// GET /api/houses?societyId=...
const listHouses = async (req, res, next) => {
  try {
    const { societyId } = req.query;
    await verifySociety(societyId, req.user.id);

    const houses = await prisma.house.findMany({
      where: { societyId },
      include: {
        resident: {
          include: { user: { select: { email: true, isActive: true } } }
        }
      },
      orderBy: { houseNo: 'asc' }
    });
    res.json(houses);
  } catch (err) {
    next(err);
  }
};

// POST /api/houses
const createHouse = async (req, res, next) => {
  try {
    const { societyId, houseNo, floor } = req.body;
    await verifySociety(societyId, req.user.id);

    const house = await prisma.house.create({
      data: { societyId, houseNo, floor }
    });

    // ── Automatically add this new house to all existing DRAFT bills ──
    // PUBLISHED bills are NOT touched — historical data is protected.
    await addHouseToDraftBills(house.id, societyId);

    res.status(201).json(house);
  } catch (err) {
    next(err);
  }
};

// PUT /api/houses/:id
const updateHouse = async (req, res, next) => {
  try {
    const { houseNo, floor, isActive } = req.body;
    const house = await prisma.house.findUnique({
      where: { id: req.params.id },
      include: { society: true }
    });
    if (!house || house.society.adminId !== req.user.id) {
      return res.status(404).json({ error: 'House not found' });
    }

    const updated = await prisma.house.update({
      where: { id: req.params.id },
      data: { houseNo, floor, isActive }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/houses/:id
const deleteHouse = async (req, res, next) => {
  try {
    const house = await prisma.house.findUnique({
      where: { id: req.params.id },
      include: { society: true, resident: true }
    });
    if (!house || house.society.adminId !== req.user.id) {
      return res.status(404).json({ error: 'House not found' });
    }
    if (house.resident) {
      return res.status(400).json({
        error: 'Cannot delete a house with an active resident. Remove the resident first.'
      });
    }

    await prisma.house.delete({ where: { id: req.params.id } });
    res.json({ message: 'House deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listHouses, createHouse, updateHouse, deleteHouse };
