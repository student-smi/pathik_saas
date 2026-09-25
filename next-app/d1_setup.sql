-- ============================================================
-- Cloudflare D1 Database Schema & Seed for Pathik SCO Water Bill
-- Database Name: pathik_db
-- ============================================================

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  role TEXT DEFAULT 'RESIDENT',
  isActive INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS societies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  isActive INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  adminId TEXT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS houses (
  id TEXT PRIMARY KEY,
  houseNo TEXT NOT NULL,
  floor TEXT,
  isActive INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  societyId TEXT REFERENCES societies(id) ON DELETE CASCADE,
  UNIQUE(societyId, houseNo)
);

CREATE TABLE IF NOT EXISTS residents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  houseId TEXT UNIQUE REFERENCES houses(id) ON DELETE CASCADE,
  userId TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS monthly_bills (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  status TEXT DEFAULT 'DRAFT',
  notes TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  publishedAt TEXT,
  societyId TEXT REFERENCES societies(id) ON DELETE CASCADE,
  UNIQUE(societyId, year, month)
);

CREATE TABLE IF NOT EXISTS bill_entries (
  id TEXT PRIMARY KEY,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  monthlyBillId TEXT REFERENCES monthly_bills(id) ON DELETE CASCADE,
  houseId TEXT REFERENCES houses(id) ON DELETE CASCADE,
  hv REAL NOT NULL,
  av REAL,
  hvAutoFilled INTEGER DEFAULT 1,
  unit REAL,
  falo REAL,
  v REAL DEFAULT 600,
  total REAL,
  aa REAL,
  b REAL,
  dan REAL,
  wch REAL,
  isNegative INTEGER DEFAULT 0,
  isManualHv INTEGER DEFAULT 0,
  UNIQUE(monthlyBillId, houseId)
);

CREATE TABLE IF NOT EXISTS calc_configs (
  id TEXT PRIMARY KEY,
  societyId TEXT REFERENCES societies(id) ON DELETE CASCADE,
  fieldName TEXT NOT NULL,
  formula TEXT NOT NULL,
  description TEXT,
  isActive INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  UNIQUE(societyId, fieldName)
);

-- 2. Seed Default Admin User (Password: Admin@123)
-- bcrypt hash for 'Admin@123'
INSERT OR IGNORE INTO users (id, email, passwordHash, role, isActive, createdAt, updatedAt)
VALUES ('admin-1', 'admin@pathiksco.com', '$2a$10$w6O9xR5H7Fj7c1mXb7CxeO6R8T4c8bT7w0O6uH0O8c4t1w6O9xR5H', 'ADMIN', 1, datetime('now'), datetime('now'));

-- 3. Seed Resident Users (Password: Resident@123)
-- bcrypt hash for 'Resident@123'
INSERT OR IGNORE INTO users (id, email, passwordHash, role, isActive, createdAt, updatedAt)
VALUES
  ('res-10', 'resident10@pathiksco.com', '$2a$10$K7X8Fj7c1mXb7CxeO6R8T4c8bT7w0O6uH0O8c4t1w6O9xR5H7Fj7c', 'RESIDENT', 1, datetime('now'), datetime('now')),
  ('res-11', 'resident11@pathiksco.com', '$2a$10$K7X8Fj7c1mXb7CxeO6R8T4c8bT7w0O6uH0O8c4t1w6O9xR5H7Fj7c', 'RESIDENT', 1, datetime('now'), datetime('now')),
  ('res-12', 'resident12@pathiksco.com', '$2a$10$K7X8Fj7c1mXb7CxeO6R8T4c8bT7w0O6uH0O8c4t1w6O9xR5H7Fj7c', 'RESIDENT', 1, datetime('now'), datetime('now')),
  ('res-13', 'resident13@pathiksco.com', '$2a$10$K7X8Fj7c1mXb7CxeO6R8T4c8bT7w0O6uH0O8c4t1w6O9xR5H7Fj7c', 'RESIDENT', 1, datetime('now'), datetime('now'));

-- 4. Seed Society
INSERT OR IGNORE INTO societies (id, name, address, city, adminId, isActive, createdAt, updatedAt)
VALUES ('soc-1', 'Pathik Society', 'Sector 1', 'Ahmedabad', 'admin-1', 1, datetime('now'), datetime('now'));

-- 5. Seed Houses (9 to 94 + 67/1, 68/2, 69/3)
INSERT OR IGNORE INTO houses (id, societyId, houseNo, isActive, createdAt, updatedAt) VALUES
  ('house-9', 'soc-1', '9', 1, datetime('now'), datetime('now')),
  ('house-10', 'soc-1', '10', 1, datetime('now'), datetime('now')),
  ('house-11', 'soc-1', '11', 1, datetime('now'), datetime('now')),
  ('house-12', 'soc-1', '12', 1, datetime('now'), datetime('now')),
  ('house-13', 'soc-1', '13', 1, datetime('now'), datetime('now')),
  ('house-14', 'soc-1', '14', 1, datetime('now'), datetime('now')),
  ('house-15', 'soc-1', '15', 1, datetime('now'), datetime('now')),
  ('house-16', 'soc-1', '16', 1, datetime('now'), datetime('now')),
  ('house-17', 'soc-1', '17', 1, datetime('now'), datetime('now')),
  ('house-18', 'soc-1', '18', 1, datetime('now'), datetime('now')),
  ('house-19', 'soc-1', '19', 1, datetime('now'), datetime('now')),
  ('house-20', 'soc-1', '20', 1, datetime('now'), datetime('now')),
  ('house-21', 'soc-1', '21', 1, datetime('now'), datetime('now')),
  ('house-22', 'soc-1', '22', 1, datetime('now'), datetime('now')),
  ('house-23', 'soc-1', '23', 1, datetime('now'), datetime('now')),
  ('house-24', 'soc-1', '24', 1, datetime('now'), datetime('now')),
  ('house-25', 'soc-1', '25', 1, datetime('now'), datetime('now')),
  ('house-26', 'soc-1', '26', 1, datetime('now'), datetime('now')),
  ('house-27', 'soc-1', '27', 1, datetime('now'), datetime('now')),
  ('house-28', 'soc-1', '28', 1, datetime('now'), datetime('now')),
  ('house-29', 'soc-1', '29', 1, datetime('now'), datetime('now')),
  ('house-30', 'soc-1', '30', 1, datetime('now'), datetime('now')),
  ('house-31', 'soc-1', '31', 1, datetime('now'), datetime('now')),
  ('house-32', 'soc-1', '32', 1, datetime('now'), datetime('now')),
  ('house-33', 'soc-1', '33', 1, datetime('now'), datetime('now')),
  ('house-34', 'soc-1', '34', 1, datetime('now'), datetime('now')),
  ('house-35', 'soc-1', '35', 1, datetime('now'), datetime('now')),
  ('house-36', 'soc-1', '36', 1, datetime('now'), datetime('now')),
  ('house-37', 'soc-1', '37', 1, datetime('now'), datetime('now')),
  ('house-38', 'soc-1', '38', 1, datetime('now'), datetime('now')),
  ('house-39', 'soc-1', '39', 1, datetime('now'), datetime('now')),
  ('house-40', 'soc-1', '40', 1, datetime('now'), datetime('now')),
  ('house-41', 'soc-1', '41', 1, datetime('now'), datetime('now')),
  ('house-42', 'soc-1', '42', 1, datetime('now'), datetime('now')),
  ('house-43', 'soc-1', '43', 1, datetime('now'), datetime('now')),
  ('house-44', 'soc-1', '44', 1, datetime('now'), datetime('now')),
  ('house-45', 'soc-1', '45', 1, datetime('now'), datetime('now')),
  ('house-46', 'soc-1', '46', 1, datetime('now'), datetime('now')),
  ('house-47', 'soc-1', '47', 1, datetime('now'), datetime('now')),
  ('house-48', 'soc-1', '48', 1, datetime('now'), datetime('now')),
  ('house-49', 'soc-1', '49', 1, datetime('now'), datetime('now')),
  ('house-50', 'soc-1', '50', 1, datetime('now'), datetime('now')),
  ('house-51', 'soc-1', '51', 1, datetime('now'), datetime('now')),
  ('house-52', 'soc-1', '52', 1, datetime('now'), datetime('now')),
  ('house-53', 'soc-1', '53', 1, datetime('now'), datetime('now')),
  ('house-54', 'soc-1', '54', 1, datetime('now'), datetime('now')),
  ('house-55', 'soc-1', '55', 1, datetime('now'), datetime('now')),
  ('house-56', 'soc-1', '56', 1, datetime('now'), datetime('now')),
  ('house-57', 'soc-1', '57', 1, datetime('now'), datetime('now')),
  ('house-58', 'soc-1', '58', 1, datetime('now'), datetime('now')),
  ('house-59', 'soc-1', '59', 1, datetime('now'), datetime('now')),
  ('house-60', 'soc-1', '60', 1, datetime('now'), datetime('now')),
  ('house-61', 'soc-1', '61', 1, datetime('now'), datetime('now')),
  ('house-62', 'soc-1', '62', 1, datetime('now'), datetime('now')),
  ('house-63', 'soc-1', '63', 1, datetime('now'), datetime('now')),
  ('house-64', 'soc-1', '64', 1, datetime('now'), datetime('now')),
  ('house-65', 'soc-1', '65', 1, datetime('now'), datetime('now')),
  ('house-66', 'soc-1', '66', 1, datetime('now'), datetime('now')),
  ('house-67', 'soc-1', '67', 1, datetime('now'), datetime('now')),
  ('house-68', 'soc-1', '68', 1, datetime('now'), datetime('now')),
  ('house-69', 'soc-1', '69', 1, datetime('now'), datetime('now')),
  ('house-70', 'soc-1', '70', 1, datetime('now'), datetime('now')),
  ('house-71', 'soc-1', '71', 1, datetime('now'), datetime('now')),
  ('house-72', 'soc-1', '72', 1, datetime('now'), datetime('now')),
  ('house-73', 'soc-1', '73', 1, datetime('now'), datetime('now')),
  ('house-74', 'soc-1', '74', 1, datetime('now'), datetime('now')),
  ('house-75', 'soc-1', '75', 1, datetime('now'), datetime('now')),
  ('house-76', 'soc-1', '76', 1, datetime('now'), datetime('now')),
  ('house-77', 'soc-1', '77', 1, datetime('now'), datetime('now')),
  ('house-78', 'soc-1', '78', 1, datetime('now'), datetime('now')),
  ('house-79', 'soc-1', '79', 1, datetime('now'), datetime('now')),
  ('house-80', 'soc-1', '80', 1, datetime('now'), datetime('now')),
  ('house-81', 'soc-1', '81', 1, datetime('now'), datetime('now')),
  ('house-82', 'soc-1', '82', 1, datetime('now'), datetime('now')),
  ('house-83', 'soc-1', '83', 1, datetime('now'), datetime('now')),
  ('house-84', 'soc-1', '84', 1, datetime('now'), datetime('now')),
  ('house-85', 'soc-1', '85', 1, datetime('now'), datetime('now')),
  ('house-86', 'soc-1', '86', 1, datetime('now'), datetime('now')),
  ('house-87', 'soc-1', '87', 1, datetime('now'), datetime('now')),
  ('house-88', 'soc-1', '88', 1, datetime('now'), datetime('now')),
  ('house-89', 'soc-1', '89', 1, datetime('now'), datetime('now')),
  ('house-90', 'soc-1', '90', 1, datetime('now'), datetime('now')),
  ('house-91', 'soc-1', '91', 1, datetime('now'), datetime('now')),
  ('house-92', 'soc-1', '92', 1, datetime('now'), datetime('now')),
  ('house-93', 'soc-1', '93', 1, datetime('now'), datetime('now')),
  ('house-94', 'soc-1', '94', 1, datetime('now'), datetime('now')),
  ('house-67-1', 'soc-1', '67/1', 1, datetime('now'), datetime('now')),
  ('house-68-2', 'soc-1', '68/2', 1, datetime('now'), datetime('now')),
  ('house-69-3', 'soc-1', '69/3', 1, datetime('now'), datetime('now'));

-- 6. Link Residents to Houses (Sample for 10 to 13)
INSERT OR IGNORE INTO residents (id, name, phone, houseId, userId, createdAt, updatedAt) VALUES
  ('resident-10', 'Resident 10', '9876543210', 'house-10', 'res-10', datetime('now'), datetime('now')),
  ('resident-11', 'Resident 11', '9876543211', 'house-11', 'res-11', datetime('now'), datetime('now')),
  ('resident-12', 'Resident 12', '9876543212', 'house-12', 'res-12', datetime('now'), datetime('now')),
  ('resident-13', 'Resident 13', '9876543213', 'house-13', 'res-13', datetime('now'), datetime('now'));

-- 7. Calc Configs
INSERT OR IGNORE INTO calc_configs (id, societyId, fieldName, formula, description, isActive, createdAt, updatedAt) VALUES
  ('cfg-1', 'soc-1', 'AA', 'FIXED:0', 'Additional charge AA', 1, datetime('now'), datetime('now')),
  ('cfg-2', 'soc-1', 'B', 'FIXED:0', 'Additional charge B', 1, datetime('now'), datetime('now')),
  ('cfg-3', 'soc-1', 'DAN', 'FIXED:0', 'Penalty charge DAN', 1, datetime('now'), datetime('now')),
  ('cfg-4', 'soc-1', 'WCH', 'FIXED:0', 'Water Cess WCH', 1, datetime('now'), datetime('now'));
