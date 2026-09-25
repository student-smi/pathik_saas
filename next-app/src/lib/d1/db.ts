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

export const julyAugustBillEntries = [
  { houseNo: '9', hv: 2780, av: 1390, unit: -1390, v: 600, falo: -6950, total: -6350 },
  { houseNo: '10', hv: 768, av: 666, unit: 102, v: 600, falo: 510, total: 1110 },
  { houseNo: '11', hv: 4375, av: 4267, unit: 108, v: 600, falo: 540, total: 1140 },
  { houseNo: '12', hv: 3973, av: 3879, unit: 94, v: 600, falo: 470, total: 1070 },
  { houseNo: '13', hv: 1884, av: 1839, unit: 45, v: 600, falo: 225, total: 825 },
  { houseNo: '14', hv: 4373, av: 4295, unit: 78, v: 600, falo: 390, total: 990 },
  { houseNo: '15', hv: 2732, av: 2665, unit: 67, v: 600, falo: 335, total: 935 },
  { houseNo: '16', hv: 5829, av: 5758, unit: 71, v: 600, falo: 355, total: 955 },
  { houseNo: '17', hv: 1246, av: 1209, unit: 37, v: 600, falo: 185, total: 785 },
  { houseNo: '18', hv: 1148, av: 1082, unit: 66, v: 600, falo: 330, total: 930 },
  { houseNo: '19', hv: 4400, av: 4275, unit: 125, v: 600, falo: 625, total: 1225 },
  { houseNo: '20', hv: 776, av: 686, unit: 90, v: 600, falo: 450, total: 1050 },
  { houseNo: '21', hv: 2944, av: 2863, unit: 81, v: 600, falo: 405, total: 1005 },
  { houseNo: '22', hv: 4205, av: 4076, unit: 129, v: 600, falo: 645, total: 1245 },
  { houseNo: '23', hv: 83, av: 67, unit: 16, v: 600, falo: 80, total: 680 },
  { houseNo: '24', hv: 73, av: 29, unit: 44, v: 600, falo: 220, total: 820 },
  { houseNo: '25', hv: 2663, av: 2704, unit: -41, v: 600, falo: -205, total: 395 },
  { houseNo: '26', hv: 2501, av: 2444, unit: 57, v: 600, falo: 285, total: 885 },
  { houseNo: '27', hv: 1878, av: 1837, unit: 41, v: 600, falo: 205, total: 805 },
  { houseNo: '28', hv: 1339, av: 1295, unit: 44, v: 600, falo: 220, total: 820 },
  { houseNo: '29', hv: 1110, av: 1060, unit: 50, v: 600, falo: 250, total: 850 },
  { houseNo: '30', hv: 4261, av: 4199, unit: 62, v: 600, falo: 310, total: 910 },
  { houseNo: '31', hv: 3801, av: 3710, unit: 91, v: 600, falo: 455, total: 1055 },
  { houseNo: '32', hv: 2446, av: 2437, unit: 9, v: 600, falo: 45, total: 645 },
  { houseNo: '33', hv: 4022, av: 3936, unit: 86, v: 600, falo: 430, total: 1030 },
  { houseNo: '34', hv: 4551, av: 4446, unit: 105, v: 600, falo: 525, total: 1125 },
  { houseNo: '35', hv: 804, av: 774, unit: 30, v: 600, falo: 150, total: 750 },
  { houseNo: '36', hv: 3094, av: 3094, unit: 0, v: 600, falo: 0, total: 600 },
  { houseNo: '37', hv: 1562, av: 1480, unit: 82, v: 600, falo: 410, total: 1010 },
  { houseNo: '38', hv: 248, av: 240, unit: 8, v: 600, falo: 40, total: 640 },
  { houseNo: '39', hv: 257, av: 210, unit: 47, v: 600, falo: 235, total: 835 },
  { houseNo: '40', hv: 667, av: 648, unit: 19, v: 600, falo: 95, total: 695 },
  { houseNo: '41', hv: 1178, av: 1170, unit: 8, v: 600, falo: 40, total: 640 },
  { houseNo: '42', hv: 2260, av: 2236, unit: 24, v: 600, falo: 120, total: 720 },
  { houseNo: '43', hv: 2558, av: 2526, unit: 32, v: 600, falo: 160, total: 760 },
  { houseNo: '44', hv: 850, av: 788, unit: 62, v: 600, falo: 310, total: 910 },
  { houseNo: '45', hv: 2994, av: 2961, unit: 33, v: 600, falo: 165, total: 765 },
  { houseNo: '46', hv: 5177, av: 5108, unit: 69, v: 600, falo: 345, total: 945 },
  { houseNo: '47', hv: 1003, av: 953, unit: 50, v: 600, falo: 250, total: 850 },
  { houseNo: '48', hv: 168, av: 126, unit: 42, v: 600, falo: 210, total: 810 },
  { houseNo: '49', hv: 4291, av: 4151, unit: 140, v: 600, falo: 700, total: 1300 },
  { houseNo: '50', hv: 1288, av: 1260, unit: 28, v: 600, falo: 140, total: 740 },
  { houseNo: '51', hv: 523, av: 460, unit: 63, v: 600, falo: 315, total: 915 },
  { houseNo: '52', hv: 4761, av: 4653, unit: 108, v: 600, falo: 540, total: 1140 },
  { houseNo: '53', hv: 1190, av: 1093, unit: 97, v: 600, falo: 485, total: 1085 },
  { houseNo: '54', hv: 2060, av: 2018, unit: 42, v: 600, falo: 210, total: 810 },
  { houseNo: '55', hv: 2707, av: 2661, unit: 46, v: 600, falo: 230, total: 830 },
  { houseNo: '56', hv: 4419, av: 4345, unit: 74, v: 600, falo: 370, total: 970 },
  { houseNo: '57', hv: 636, av: 508, unit: 128, v: 600, falo: 640, total: 1240 },
  { houseNo: '58', hv: 233, av: 144, unit: 89, v: 600, falo: 445, total: 1045 },
  { houseNo: '59', hv: 4353, av: 4280, unit: 73, v: 600, falo: 365, total: 965 },
  { houseNo: '60', hv: 5814, av: 5719, unit: 95, v: 600, falo: 475, total: 1075 },
  { houseNo: '61', hv: 5793, av: 5720, unit: 73, v: 600, falo: 365, total: 965 },
  { houseNo: '62', hv: 6197, av: 6294, unit: -97, v: 600, falo: -485, total: 115 },
  { houseNo: '63', hv: 6675, av: 6587, unit: 88, v: 600, falo: 440, total: 1040 },
  { houseNo: '64', hv: 360, av: 324, unit: 36, v: 600, falo: 180, total: 780 },
  { houseNo: '65', hv: 4383, av: 4327, unit: 56, v: 600, falo: 280, total: 880 },
  { houseNo: '66', hv: 1727, av: 1662, unit: 65, v: 600, falo: 325, total: 925 },
  { houseNo: '67', hv: 2524, av: 1565, unit: 959, v: 600, falo: 4795, total: 5395 },
  { houseNo: '68', hv: 1218, av: 1070, unit: 148, v: 600, falo: 740, total: 1340 },
  { houseNo: '69', hv: 66, av: 43, unit: 23, v: 600, falo: 115, total: 715 },
  { houseNo: '70', hv: 2120, av: 2069, unit: 51, v: 600, falo: 255, total: 855 },
  { houseNo: '71', hv: 555, av: 518, unit: 37, v: 600, falo: 185, total: 785 },
  { houseNo: '72', hv: 265, av: 208, unit: 57, v: 600, falo: 285, total: 885 },
  { houseNo: '73', hv: 3614, av: 3560, unit: 54, v: 600, falo: 270, total: 870 },
  { houseNo: '74', hv: 3938, av: 3861, unit: 77, v: 600, falo: 385, total: 985 },
  { houseNo: '75', hv: 4215, av: 4167, unit: 48, v: 600, falo: 240, total: 840 },
  { houseNo: '76', hv: 3672, av: 3628, unit: 44, v: 600, falo: 220, total: 820 },
  { houseNo: '77', hv: 2490, av: 2458, unit: 32, v: 600, falo: 160, total: 760 },
  { houseNo: '78', hv: 82, av: 46, unit: 36, v: 600, falo: 180, total: 780 },
  { houseNo: '79', hv: 2338, av: 2255, unit: 83, v: 600, falo: 415, total: 1015 },
  { houseNo: '80', hv: 3524, av: 3492, unit: 32, v: 600, falo: 160, total: 760 },
  { houseNo: '81', hv: 2268, av: 2201, unit: 67, v: 600, falo: 335, total: 935 },
  { houseNo: '82', hv: 2223, av: 2183, unit: 40, v: 600, falo: 200, total: 800 },
  { houseNo: '83', hv: 4188, av: 4489, unit: -301, v: 600, falo: -1505, total: -905 },
  { houseNo: '84', hv: 4784, av: 4724, unit: 60, v: 600, falo: 300, total: 900 },
  { houseNo: '85', hv: 4209, av: 4174, unit: 35, v: 600, falo: 175, total: 775 },
  { houseNo: '86', hv: 479, av: 394, unit: 85, v: 600, falo: 425, total: 1025 },
  { houseNo: '87', hv: 3962, av: 3905, unit: 57, v: 600, falo: 285, total: 885 },
  { houseNo: '88', hv: 6171, av: 6098, unit: 73, v: 600, falo: 365, total: 965 },
  { houseNo: '89', hv: 2618, av: 2588, unit: 30, v: 600, falo: 150, total: 750 },
  { houseNo: '90', hv: 2539, av: 2459, unit: 80, v: 600, falo: 400, total: 1000 },
  { houseNo: '91', hv: 4763, av: 4672, unit: 91, v: 600, falo: 455, total: 1055 },
  { houseNo: '92', hv: 3454, av: 3384, unit: 70, v: 600, falo: 350, total: 950 },
  { houseNo: '93', hv: 83, av: 79, unit: 4, v: 600, falo: 20, total: 620 },
  { houseNo: '94', hv: 336, av: 334, unit: 2, v: 600, falo: 10, total: 610 },
  { houseNo: '67/1', hv: 215, av: 128, unit: 87, v: 600, falo: 435, total: 1035 },
  { houseNo: '68/2', hv: 1928, av: 1852, unit: 76, v: 600, falo: 380, total: 980 },
  { houseNo: '69/3', hv: 1963, av: 1895, unit: 68, v: 600, falo: 340, total: 940 }
]

export async function initD1Tables(db: D1DatabaseType, force: boolean = false): Promise<void> {
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

  const billCheck = await db.prepare("SELECT id FROM monthly_bills WHERE year = 2026 AND month = 8").first()
  if (billCheck && !force) {
    return
  }

  const now = new Date().toISOString()
  const adminHash = await hashPassword('Admin@123')
  const residentHash = await hashPassword('Resident@123')

  // 1. Admin user
  await db.prepare('INSERT OR REPLACE INTO users (id, email, passwordHash, role, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, ?, ?)')
    .bind('admin-1', 'admin@pathiksco.com', adminHash, 'ADMIN', now, now).run()

  // 2. Society
  await db.prepare('INSERT OR REPLACE INTO societies (id, name, address, city, adminId, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 1, ?, ?)')
    .bind('soc-1', 'Pathik Society', 'Sector 1', 'Ahmedabad', 'admin-1', now, now).run()

  // 3. Calc configs
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

  // 4. Create all houses (9 to 94 + 67/1, 68/2, 69/3)
  const allHouseNos = []
  for (let i = 9; i <= 94; i++) {
    allHouseNos.push(String(i))
  }
  allHouseNos.push('67/1', '68/2', '69/3')

  for (const no of allHouseNos) {
    const cleanNo = no.replace('/', '-')
    const houseId = `house-${cleanNo}`
    await db.prepare('INSERT OR REPLACE INTO houses (id, societyId, houseNo, isActive, createdAt, updatedAt) VALUES (?, ?, ?, 1, ?, ?)')
      .bind(houseId, 'soc-1', no, now, now).run()

    // 5. Create Resident Users & Links for EACH house
    // Supports both resident{No}@pathiksco.com and house{No}@pathiksco.com
    const resUserId = `user-res-${cleanNo}`
    const residentEmail = `resident${cleanNo}@pathiksco.com`
    await db.prepare('INSERT OR REPLACE INTO users (id, email, passwordHash, role, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, ?, ?)')
      .bind(resUserId, residentEmail, residentHash, 'RESIDENT', now, now).run()

    // Also alias house{No}@pathiksco.com
    const houseEmail = `house${cleanNo}@pathiksco.com`
    await db.prepare('INSERT OR REPLACE INTO users (id, email, passwordHash, role, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, ?, ?)')
      .bind(`user-house-${cleanNo}`, houseEmail, residentHash, 'RESIDENT', now, now).run()

    await db.prepare('INSERT OR REPLACE INTO residents (id, name, phone, houseId, userId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(`resident-${cleanNo}`, `Resident ${no}`, null, houseId, resUserId, now, now).run()
  }

  // 6. Create July - August 2026 Monthly Bill
  const billId = 'bill-2026-8'
  await db.prepare('INSERT OR REPLACE INTO monthly_bills (id, societyId, year, month, status, notes, publishedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(billId, 'soc-1', 2026, 8, 'PUBLISHED', 'July - August 2026 Water Bill', now, now, now).run()

  // 7. Insert all 66 Bill Entries for July - August 2026
  for (const entry of julyAugustBillEntries) {
    const cleanNo = entry.houseNo.replace('/', '-')
    const houseId = `house-${cleanNo}`
    const entryId = `entry-2026-8-${cleanNo}`
    const isNeg = entry.unit < 0 ? 1 : 0

    await db.prepare(`
      INSERT OR REPLACE INTO bill_entries (
        id, monthlyBillId, houseId, hv, av, hvAutoFilled, unit, falo, v, total, isNegative, isManualHv, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      entryId,
      billId,
      houseId,
      entry.hv,
      entry.av,
      entry.unit,
      entry.falo,
      entry.v,
      entry.total,
      isNeg,
      now,
      now
    ).run()
  }
}
