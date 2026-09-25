-- ============================================================
-- Complete Database Schema & Seed for Pathik SCO Water Bill
-- ============================================================

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  role TEXT DEFAULT 'RESIDENT',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS societies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "adminId" TEXT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS houses (
  id TEXT PRIMARY KEY,
  "houseNo" TEXT NOT NULL,
  floor TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "societyId" TEXT REFERENCES societies(id) ON DELETE CASCADE,
  UNIQUE("societyId", "houseNo")
);

CREATE TABLE IF NOT EXISTS residents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "houseId" TEXT UNIQUE REFERENCES houses(id) ON DELETE CASCADE,
  "userId" TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS monthly_bills (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  status TEXT DEFAULT 'DRAFT',
  notes TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "publishedAt" TIMESTAMP WITH TIME ZONE,
  "societyId" TEXT REFERENCES societies(id) ON DELETE CASCADE,
  UNIQUE("societyId", year, month)
);

CREATE TABLE IF NOT EXISTS bill_entries (
  id TEXT PRIMARY KEY,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "monthlyBillId" TEXT REFERENCES monthly_bills(id) ON DELETE CASCADE,
  "houseId" TEXT REFERENCES houses(id) ON DELETE CASCADE,
  hv DOUBLE PRECISION NOT NULL,
  av DOUBLE PRECISION,
  "hvAutoFilled" BOOLEAN DEFAULT true,
  unit DOUBLE PRECISION,
  falo DOUBLE PRECISION,
  v DOUBLE PRECISION DEFAULT 600,
  total DOUBLE PRECISION,
  aa DOUBLE PRECISION,
  b DOUBLE PRECISION,
  dan DOUBLE PRECISION,
  wch DOUBLE PRECISION,
  "isNegative" BOOLEAN DEFAULT false,
  "isManualHv" BOOLEAN DEFAULT false,
  UNIQUE("monthlyBillId", "houseId")
);

CREATE TABLE IF NOT EXISTS calc_configs (
  id TEXT PRIMARY KEY,
  "societyId" TEXT REFERENCES societies(id) ON DELETE CASCADE,
  "fieldName" TEXT NOT NULL,
  formula TEXT NOT NULL,
  description TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("societyId", "fieldName")
);

-- 2. Seed Admin User
INSERT INTO users (id, email, "passwordHash", role, "isActive", "createdAt", "updatedAt")
VALUES ('admin-1', 'admin@pathiksco.com', '$2b$12$btk8oUNRR6VgKTVCOfQUfebzrhM0lg70pIZ4aJX2mhacddKRcQ4u2', 'ADMIN', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- 3. Seed Society
INSERT INTO societies (id, name, address, city, "adminId", "isActive", "createdAt", "updatedAt")
VALUES ('soc-1', 'Pathik Society', 'Sector 1', 'Ahmedabad', 'admin-1', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Houses (9 to 94 + 67/1, 68/2, 69/3)
INSERT INTO houses (id, "societyId", "houseNo", "isActive", "createdAt", "updatedAt")
SELECT
  'house-' || h.no,
  'soc-1',
  h.no,
  true,
  NOW(),
  NOW()
FROM (VALUES
  ('9'),('10'),('11'),('12'),('13'),('14'),('15'),('16'),('17'),('18'),
  ('19'),('20'),('21'),('22'),('23'),('24'),('25'),('26'),('27'),('28'),
  ('29'),('30'),('31'),('32'),('33'),('34'),('35'),('36'),('37'),('38'),
  ('39'),('40'),('41'),('42'),('43'),('44'),('45'),('46'),('47'),('48'),
  ('49'),('50'),('51'),('52'),('53'),('54'),('55'),('56'),('57'),('58'),
  ('59'),('60'),('61'),('62'),('63'),('64'),('65'),('66'),('67'),('68'),
  ('69'),('70'),('71'),('72'),('73'),('74'),('75'),('76'),('77'),('78'),
  ('79'),('80'),('81'),('82'),('83'),('84'),('85'),('86'),('87'),('88'),
  ('89'),('90'),('91'),('92'),('93'),('94'),
  ('67/1'),('68/2'),('69/3')
) AS h(no)
ON CONFLICT ("societyId", "houseNo") DO NOTHING;

-- 5. Default Calc Configs
INSERT INTO calc_configs (id, "societyId", "fieldName", formula, description, "isActive", "createdAt", "updatedAt")
VALUES
  ('cfg-1', 'soc-1', 'AA', 'FIXED:0', 'Additional charge AA', true, NOW(), NOW()),
  ('cfg-2', 'soc-1', 'B', 'FIXED:0', 'Additional charge B', true, NOW(), NOW()),
  ('cfg-3', 'soc-1', 'DAN', 'FIXED:0', 'Penalty charge DAN', true, NOW(), NOW()),
  ('cfg-4', 'soc-1', 'WCH', 'FIXED:0', 'Water Cess WCH', true, NOW(), NOW())
ON CONFLICT ("societyId", "fieldName") DO NOTHING;
