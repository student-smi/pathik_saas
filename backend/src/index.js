require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth.routes');
const societyRoutes = require('./routes/society.routes');
const houseRoutes = require('./routes/house.routes');
const residentRoutes = require('./routes/resident.routes');
const billRoutes = require('./routes/bill.routes');
const residentPortalRoutes = require('./routes/residentPortal.routes');
const configRoutes = require('./routes/config.routes');
const exportRoutes = require('./routes/export.routes');

const { errorHandler } = require('./middleware/error.middleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Prisma singleton — prevents "too many connections" in serverless
const globalForPrisma = global;
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient();
}
const prisma = globalForPrisma.prisma;

// ── Middleware ────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL  // e.g. https://pathik-saas.vercel.app
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/societies', societyRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api/residents', residentRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/portal', residentPortalRoutes);
app.use('/api/config', configRoutes);
app.use('/api/export', exportRoutes);

// ── Error handler ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start (local only — Vercel handles serverless invocation) ──
if (require.main === module) {
  async function main() {
    await prisma.$connect();
    console.log('✅ Database connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV}`);
    });
  }
  main().catch((err) => {
    console.error('❌ Startup error:', err);
    process.exit(1);
  });
}

// Export for Vercel serverless
module.exports = app;
