export type UserRole = 'ADMIN' | 'RESIDENT'

export type BillStatus = 'DRAFT' | 'PUBLISHED' | 'CORRECTED'

export interface User {
  id: string
  email: string
  passwordHash: string
  role: UserRole
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  adminSocieties: Society[]
  resident: Resident | null
}

export interface Society {
  id: string
  name: string
  address: string | null
  city: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  adminId: string
  admin: User
  houses: House[]
  monthlyBills: MonthlyBill[]
  calcConfigs: CalcConfig[]
}

export interface House {
  id: string
  houseNo: string
  floor: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  societyId: string
  society: Society
  resident: Resident | null
  billEntries: BillEntry[]
}

export interface Resident {
  id: string
  name: string
  phone: string | null
  createdAt: Date
  updatedAt: Date
  houseId: string
  house: House
  userId: string
  user: User
}

export interface MonthlyBill {
  id: string
  year: number
  month: number
  status: BillStatus
  notes: string | null
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
  societyId: string
  society: Society
  entries: BillEntry[]
}

export interface BillEntry {
  id: string
  createdAt: Date
  updatedAt: Date
  monthlyBillId: string
  monthlyBill: MonthlyBill
  houseId: string
  house: House
  hv: number
  av: number | null
  hvAutoFilled: boolean
  unit: number | null
  falo: number | null
  v: number
  total: number | null
  aa: number | null
  b: number | null
  dan: number | null
  wch: number | null
  isNegative: boolean
  isManualHv: boolean
}

export interface CalcConfig {
  id: string
  societyId: string
  society: Society
  fieldName: string
  formula: string
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface BillEntryCalculationResult {
  unit: number
  falo: number
  v: number
  total: number
  aa: number | null
  b: number | null
  dan: number | null
  wch: number | null
  isNegative: boolean
}
