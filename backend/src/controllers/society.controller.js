const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/societies
const listSocieties = async (req, res, next) => {
  try {
    const societies = await prisma.society.findMany({
      where: { adminId: req.user.id },
      include: {
        _count: { select: { houses: true } }
      },
      orderBy: { name: 'asc' }
    });
    res.json(societies);
  } catch (err) {
    next(err);
  }
};

// POST /api/societies
const createSociety = async (req, res, next) => {
  try {
    const { name, address, city } = req.body;
    const society = await prisma.society.create({
      data: { name, address, city, adminId: req.user.id }
    });
    res.status(201).json(society);
  } catch (err) {
    next(err);
  }
};

// GET /api/societies/:id
const getSociety = async (req, res, next) => {
  try {
    const society = await prisma.society.findFirst({
      where: { id: req.params.id, adminId: req.user.id },
      include: {
        houses: {
          include: { resident: { include: { user: { select: { email: true } } } } },
          orderBy: { houseNo: 'asc' }
        },
        _count: { select: { monthlyBills: true } }
      }
    });
    if (!society) return res.status(404).json({ error: 'Society not found' });
    res.json(society);
  } catch (err) {
    next(err);
  }
};

// PUT /api/societies/:id
const updateSociety = async (req, res, next) => {
  try {
    const { name, address, city, isActive } = req.body;
    const society = await prisma.society.findFirst({
      where: { id: req.params.id, adminId: req.user.id }
    });
    if (!society) return res.status(404).json({ error: 'Society not found' });

    const updated = await prisma.society.update({
      where: { id: req.params.id },
      data: { name, address, city, isActive }
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

module.exports = { listSocieties, createSociety, getSociety, updateSociety };
