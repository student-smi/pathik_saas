const { PrismaClient } = require('@prisma/client');
const { supabaseAdmin } = require('../lib/supabase');
const prisma = new PrismaClient();

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Sign in via Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password
    });

    if (authError || !authData?.session) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 2. Fetch the user from our Prisma DB (for role + resident info)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        resident: {
          include: {
            house: { include: { society: true } }
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const responseData = {
      token: authData.session.access_token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };

    // Attach resident info if applicable
    if (user.role === 'RESIDENT' && user.resident) {
      responseData.user.resident = {
        id: user.resident.id,
        name: user.resident.name,
        houseId: user.resident.houseId,
        houseNo: user.resident.house.houseNo,
        society: user.resident.house.society.name,
        societyId: user.resident.house.society.id
      };
    }

    res.json(responseData);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/register-admin (for initial setup only — disabled in production)
const registerAdmin = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Registration disabled in production' });
    }

    const { email, password, name } = req.body;

    // Check if user already exists in our DB
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    // 1. Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true  // auto-confirm
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // 2. Create user in our Prisma DB
    const user = await prisma.user.create({
      data: {
        id: authUser.user.id,  // Use Supabase UID as our ID
        email: email.toLowerCase().trim(),
        passwordHash: 'supabase-managed',  // Not used anymore
        role: 'ADMIN'
      }
    });

    res.status(201).json({ message: 'Admin created', userId: user.id });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const me = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      resident: {
        include: {
          house: { include: { society: true } }
        }
      }
    }
  });

  const data = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  if (user.role === 'RESIDENT' && user.resident) {
    data.resident = {
      id: user.resident.id,
      name: user.resident.name,
      houseId: user.resident.houseId,
      houseNo: user.resident.house.houseNo,
      society: user.resident.house.society.name,
      societyId: user.resident.house.society.id
    };
  }

  res.json(data);
};

// POST /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;

    // Update password in Supabase Auth using the user's Supabase UID
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      req.user.id,
      { password: newPassword }
    );

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, registerAdmin, me, changePassword };
