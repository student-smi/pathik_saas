const { PrismaClient } = require('@prisma/client');
const { supabaseAdmin } = require('../lib/supabase');
const prisma = new PrismaClient();

/**
 * Verify Supabase JWT and attach user to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    // Verify token with Supabase (replaces jwt.verify)
    const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !supabaseUser) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch user from our Prisma DB (for role + isActive)
    const user = await prisma.user.findUnique({
      where: { id: supabaseUser.id },
      select: { id: true, email: true, role: true, isActive: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Require ADMIN role
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Require RESIDENT role
 */
const requireResident = (req, res, next) => {
  if (req.user?.role !== 'RESIDENT') {
    return res.status(403).json({ error: 'Resident access required' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, requireResident };
