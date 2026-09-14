/**
 * CALCULATION CONFIG CONTROLLER
 *
 * Allows admin to configure formulas for AA, B, DAN, WCH, V, FALO_RATE
 * without rebuilding the application.
 *
 * Supported formula types:
 *   FIXED:200        → always return 200
 *   PERCENT:10       → UNIT × 10%
 *   UNIT * 3         → expression using UNIT, FALO, V, etc.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/config?societyId=
const getConfigs = async (req, res, next) => {
  try {
    const { societyId } = req.query;
    const society = await prisma.society.findFirst({
      where: { id: societyId, adminId: req.user.id }
    });
    if (!society) return res.status(404).json({ error: 'Society not found' });

    const configs = await prisma.calcConfig.findMany({
      where: { societyId },
      orderBy: { fieldName: 'asc' }
    });
    res.json(configs);
  } catch (err) {
    next(err);
  }
};

// PUT /api/config — upsert a single config
const upsertConfig = async (req, res, next) => {
  try {
    const { societyId, fieldName, formula, description, isActive } = req.body;
    const society = await prisma.society.findFirst({
      where: { id: societyId, adminId: req.user.id }
    });
    if (!society) return res.status(404).json({ error: 'Society not found' });

    const config = await prisma.calcConfig.upsert({
      where: { societyId_fieldName: { societyId, fieldName } },
      update: { formula, description, isActive: isActive ?? true },
      create: { societyId, fieldName, formula, description, isActive: isActive ?? true }
    });
    res.json(config);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/config/:id
const deleteConfig = async (req, res, next) => {
  try {
    const config = await prisma.calcConfig.findUnique({ where: { id: req.params.id } });
    if (!config) return res.status(404).json({ error: 'Config not found' });

    const society = await prisma.society.findFirst({
      where: { id: config.societyId, adminId: req.user.id }
    });
    if (!society) return res.status(403).json({ error: 'Access denied' });

    await prisma.calcConfig.delete({ where: { id: req.params.id } });
    res.json({ message: 'Config deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getConfigs, upsertConfig, deleteConfig };
