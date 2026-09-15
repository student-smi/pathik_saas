import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-IN').format(value)
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'badge-draft'
    case 'PUBLISHED':
      return 'badge-published'
    case 'CORRECTED':
      return 'badge-corrected'
    default:
      return 'badge-draft'
  }
}
