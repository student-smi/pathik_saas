import { getCloudflareContext } from '@opennextjs/cloudflare'
import { hashPassword } from '../auth/password'

type D1DatabaseType = any

export async function getD1(): Promise<D1DatabaseType | null> {
  try {
    const context = await getCloudflareContext({ async: true })
    if (context?.env && (context.env as any).DB) {
      return (context.env as any).DB
    }
  } catch {
  }

  try {
    const context = getCloudflareContext({ async: false })
    if (context?.env && (context.env as any).DB) {
      return (context.env as any).DB
    }
  } catch {
  }

  return null
}

export async function initD1Tables(db: D1DatabaseType): Promise<void> {
  if (!db) return

  const tableQueries = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT DEFAULT 'RESIDENT',
      isActive INTEGER DEFAULT 1,
      createdAt TEXT,
      updatedAt TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS societies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT,
      updatedAt TEXT,
      adminId TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS houses (
      id TEXT PRIMARY KEY,
      houseNo TEXT NOT NULL,
      floor TEXT,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT,
      updatedAt TEXT,
      societyId TEXT,
      UNIQUE(societyId, houseNo)
    )`,
    `CREATE TABLE IF NOT EXISTS residents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      houseId TEXT UNIQUE,
      userId TEXT UNIQUE
    )`,
    `CREATE TABLE IF NOT EXISTS monthly_bills (
      id TEXT PRIMARY KEY,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      status TEXT DEFAULT 'DRAFT',
      notes TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      publishedAt TEXT,
      societyId TEXT,
      UNIQUE(societyId, year, month)
    )`,
    `CREATE TABLE IF NOT EXISTS bill_entries (
      id TEXT PRIMARY KEY,
      createdAt TEXT,
      updatedAt TEXT,
      monthlyBillId TEXT,
      houseId TEXT,
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
    )`,
    `CREATE TABLE IF NOT EXISTS calc_configs (
      id TEXT PRIMARY KEY,
      societyId TEXT,
      fieldName TEXT NOT NULL,
      formula TEXT NOT NULL,
      description TEXT,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT,
      updatedAt TEXT,
      UNIQUE(societyId, fieldName)
    )`
  ]

  for (const q of tableQueries) {
    try {
      await db.prepare(q).run()
    } catch (e) {
      console.error('Table create error:', e)
    }
  }

  // Check admin user
  const adminCheck = await db.prepare("SELECT id FROM users WHERE email = 'admin@pathiksco.com'").first()
  if (!adminCheck) {
    const adminHash = await hashPassword('Admin@123')
    const residentHash = await hashPassword('Resident@123')
    const now = new Date().toISOString()

    await db.prepare('INSERT OR REPLACE INTO users (id, email, passwordHash, role, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, ?, ?)')
      .bind('admin-1', 'admin@pathiksco.com', adminHash, 'ADMIN', now, now).run()

    for (const num of [10, 11, 12, 13]) {
      await db.prepare('INSERT OR REPLACE INTO users (id, email, passwordHash, role, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, ?, ?)')
        .bind(`res-${num}`, `resident${num}@pathiksco.com`, residentHash, 'RESIDENT', now, now).run()
    }

    await db.prepare('INSERT OR REPLACE INTO societies (id, name, address, city, adminId, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 1, ?, ?)')
      .bind('soc-1', 'Pathik Society', 'Sector 1', 'Ahmedabad', 'admin-1', now, now).run()

    const configs = [
      ['cfg-1', 'soc-1', 'AA', 'FIXED:0', 'Additional charge AA'],
      ['cfg-2', 'soc-1', 'B', 'FIXED:0', 'Additional charge B'],
      ['cfg-3', 'soc-1', 'DAN', 'FIXED:0', 'Penalty charge DAN'],
      ['cfg-4', 'soc-1', 'WCH', 'FIXED:0', 'Water Cess WCH'],
    ]
    for (const [id, socId, fName, formula, desc] of configs) {
      await db.prepare('INSERT OR REPLACE INTO calc_configs (id, societyId, fieldName, formula, description, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 1, ?, ?)')
        .bind(id, socId, fName, formula, desc, now, now).run()
    }

    // Populate houses 9 to 94 + specials
    const houseNumbers = []
    for (let i = 9; i <= 94; i++) {
      houseNumbers.push(String(i))
    }
    houseNumbers.push('67/1', '68/2', '69/3')

    const houseStatements = houseNumbers.map(no => {
      return db.prepare('INSERT OR IGNORE INTO houses (id, societyId, houseNo, isActive, createdAt, updatedAt) VALUES (?, ?, ?, 1, ?, ?)')
        .bind(`house-${no.replace('/', '-')}`, 'soc-1', no, now, now)
    })

    for (let i = 0; i < houseStatements.length; i += 30) {
      const chunk = houseStatements.slice(i, i + 30)
      await db.batch(chunk)
    }

    for (const num of [10, 11, 12, 13]) {
      await db.prepare('INSERT OR REPLACE INTO residents (id, name, phone, houseId, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(`resident-${num}`, `Resident ${num}`, `98765432${num}`, `house-${num}`, `res-${num}`, now, now).run()
    }
  }
}
