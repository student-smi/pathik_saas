/**
 * DATABASE SEED — Supabase Edition
 *
 * Seeds the database with:
 * 1. Admin user (in Supabase Auth + Prisma DB)
 * 2. Sample society (Pathik Society)
 * 3. Houses 10–17
 * 4. Historical bill: August 2026 (data from the existing bill)
 * 5. Resident accounts for each house (in Supabase Auth + Prisma DB)
 *
 * Historical readings from the bill:
 *   House 10: H.V=666, A.V=768, UNIT=102, FALO=510, V=600, TOTAL=1110
 *   House 11: H.V=4267, A.V=4375, UNIT=108, FALO=540, V=600, TOTAL=1140
 *   House 12: H.V=3879, A.V=3973, UNIT=94,  FALO=470, V=600, TOTAL=1070
 *   House 13: H.V=2704, A.V=2663, UNIT=-41, FALO=-205,V=600, TOTAL=395
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const prisma = new PrismaClient();

// Supabase Admin client (service role — can create users without email confirmation)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Create a user in Supabase Auth + Prisma DB
 * Returns the Prisma user record
 */
async function createOrGetUser(email, password, role) {
  // Check if already exists in Prisma
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`  ℹ️  User already exists: ${email}`);
    return existing;
  }

  // Create in Supabase Auth (auto-confirm email)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) {
    // If user already exists in Supabase Auth but not in Prisma, fetch their ID
    if (authError.message.includes('already been registered') || authError.code === 'email_exists') {
      console.log(`  ⚠️  Supabase Auth user already exists for ${email}, fetching...`);
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = listData?.users?.find(u => u.email === email);
      if (existingAuthUser) {
        // Create in Prisma with existing Supabase UID
        const user = await prisma.user.create({
          data: {
            id: existingAuthUser.id,
            email,
            passwordHash: 'supabase-managed',
            role
          }
        });
        return user;
      }
    }
    throw new Error(`Supabase Auth error for ${email}: ${authError.message}`);
  }

  // Create in Prisma with Supabase UID
  const user = await prisma.user.create({
    data: {
      id: authData.user.id,
      email,
      passwordHash: 'supabase-managed',
      role
    }
  });

  return user;
}

async function main() {
  console.log('🌱 Seeding database (Supabase)...\n');

  // ── Admin User ────────────────────────────────────────────────
  const adminEmail = 'admin@pathiksco.com';
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123';

  console.log('Creating admin user...');
  const admin = await createOrGetUser(adminEmail, adminPassword, 'ADMIN');
  console.log(`✅ Admin: ${adminEmail} / ${adminPassword}`);

  // ── Society ───────────────────────────────────────────────────
  let society = await prisma.society.findFirst({ where: { adminId: admin.id } });
  if (!society) {
    society = await prisma.society.create({
      data: {
        name: 'Pathik Society',
        address: 'Main Road, Block A',
        city: 'Ahmedabad',
        adminId: admin.id
      }
    });
    console.log(`✅ Society created: ${society.name}`);
  } else {
    console.log(`ℹ️  Society already exists: ${society.name}`);
  }

  // ── Houses ────────────────────────────────────────────────────
  const houseData = [
    { houseNo: '10', floor: 'Ground' },
    { houseNo: '11', floor: 'Ground' },
    { houseNo: '12', floor: 'First' },
    { houseNo: '13', floor: 'First' },
    { houseNo: '14', floor: 'Second' },
    { houseNo: '15', floor: 'Second' },
    { houseNo: '16', floor: 'Third' },
    { houseNo: '17', floor: 'Third' },
  ];

  const houses = {};
  for (const h of houseData) {
    let house = await prisma.house.findUnique({
      where: { societyId_houseNo: { societyId: society.id, houseNo: h.houseNo } }
    });
    if (!house) {
      house = await prisma.house.create({
        data: { societyId: society.id, ...h }
      });
      console.log(`✅ House ${h.houseNo} created`);
    }
    houses[h.houseNo] = house;
  }

  // ── Residents ─────────────────────────────────────────────────
  const residentData = [
    { houseNo: '10', name: 'Rajesh Patel',   email: 'resident10@pathiksco.com', password: 'Resident@123' },
    { houseNo: '11', name: 'Suresh Shah',    email: 'resident11@pathiksco.com', password: 'Resident@123' },
    { houseNo: '12', name: 'Kiran Mehta',    email: 'resident12@pathiksco.com', password: 'Resident@123' },
    { houseNo: '13', name: 'Priya Desai',    email: 'resident13@pathiksco.com', password: 'Resident@123' },
    { houseNo: '14', name: 'Amit Kumar',     email: 'resident14@pathiksco.com', password: 'Resident@123' },
    { houseNo: '15', name: 'Deepa Joshi',    email: 'resident15@pathiksco.com', password: 'Resident@123' },
    { houseNo: '16', name: 'Ravi Verma',     email: 'resident16@pathiksco.com', password: 'Resident@123' },
    { houseNo: '17', name: 'Sunita Sharma',  email: 'resident17@pathiksco.com', password: 'Resident@123' },
  ];

  console.log('\nCreating residents...');
  for (const r of residentData) {
    const house = houses[r.houseNo];
    const existingResident = await prisma.resident.findUnique({ where: { houseId: house.id } });
    if (!existingResident) {
      const user = await createOrGetUser(r.email, r.password, 'RESIDENT');
      await prisma.resident.create({
        data: { name: r.name, houseId: house.id, userId: user.id }
      });
      console.log(`✅ Resident House ${r.houseNo}: ${r.name} (${r.email})`);
    } else {
      console.log(`  ℹ️  Resident already exists for House ${r.houseNo}`);
    }
  }

  // ── Historical Bill: August 2026 ─────────────────────────────
  const HIST_YEAR = 2026;
  const HIST_MONTH = 8;

  let augBill = await prisma.monthlyBill.findUnique({
    where: { societyId_year_month: { societyId: society.id, year: HIST_YEAR, month: HIST_MONTH } }
  });

  if (!augBill) {
    augBill = await prisma.monthlyBill.create({
      data: {
        societyId: society.id,
        year: HIST_YEAR,
        month: HIST_MONTH,
        status: 'PUBLISHED',
        publishedAt: new Date('2026-08-31')
      }
    });
    console.log(`\n✅ August 2026 bill created`);
  }

  const augEntries = [
    { houseNo: '10', hv: 666,  av: 768,  unit: 102,  falo: 510,  v: 600, total: 1110, isNegative: false },
    { houseNo: '11', hv: 4267, av: 4375, unit: 108,  falo: 540,  v: 600, total: 1140, isNegative: false },
    { houseNo: '12', hv: 3879, av: 3973, unit: 94,   falo: 470,  v: 600, total: 1070, isNegative: false },
    { houseNo: '13', hv: 2704, av: 2663, unit: -41,  falo: -205, v: 600, total: 395,  isNegative: true  },
    { houseNo: '14', hv: 1200, av: 1280, unit: 80,   falo: 400,  v: 600, total: 1000, isNegative: false },
    { houseNo: '15', hv: 900,  av: 965,  unit: 65,   falo: 325,  v: 600, total: 925,  isNegative: false },
    { houseNo: '16', hv: 550,  av: 620,  unit: 70,   falo: 350,  v: 600, total: 950,  isNegative: false },
    { houseNo: '17', hv: 2100, av: 2175, unit: 75,   falo: 375,  v: 600, total: 975,  isNegative: false },
  ];

  for (const e of augEntries) {
    const house = houses[e.houseNo];
    if (!house) continue;

    const existing = await prisma.billEntry.findUnique({
      where: { monthlyBillId_houseId: { monthlyBillId: augBill.id, houseId: house.id } }
    });

    if (!existing) {
      await prisma.billEntry.create({
        data: {
          monthlyBillId: augBill.id,
          houseId: house.id,
          hv: e.hv,
          av: e.av,
          unit: e.unit,
          falo: e.falo,
          v: e.v,
          total: e.total,
          isNegative: e.isNegative,
          hvAutoFilled: false
        }
      });
      console.log(`  ✅ Aug entry House ${e.houseNo}: HV=${e.hv}, AV=${e.av}, UNIT=${e.unit}, TOTAL=₹${e.total}`);
    }
  }

  // ── Default Calc Configs ──────────────────────────────────────
  const defaultConfigs = [
    { fieldName: 'FALO_RATE', formula: 'FIXED:5',   description: 'Rate per unit of water consumed (₹ per unit)' },
    { fieldName: 'V',         formula: 'FIXED:600',  description: 'Fixed monthly water charge (₹)' },
  ];

  for (const cfg of defaultConfigs) {
    const existing = await prisma.calcConfig.findUnique({
      where: { societyId_fieldName: { societyId: society.id, fieldName: cfg.fieldName } }
    });
    if (!existing) {
      await prisma.calcConfig.create({
        data: { societyId: society.id, ...cfg }
      });
      console.log(`✅ Config: ${cfg.fieldName} = ${cfg.formula}`);
    }
  }

  console.log('\n🎉 Seed complete!');
  console.log('─────────────────────────────────────────────────');
  console.log('Admin Login:');
  console.log(`  Email:    ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log('\nResident Login (all houses):');
  console.log('  Email:    resident10@pathiksco.com ... resident17@pathiksco.com');
  console.log('  Password: Resident@123');
  console.log('─────────────────────────────────────────────────');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
