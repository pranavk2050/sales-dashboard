export function formatCr(value) {
  if (value === null || value === undefined) return '—'
  return `₹${value.toFixed(2)} Cr`
}

export function formatDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function formatMonth(yyyymm) {
  if (!yyyymm) return '—'
  const [y, m] = yyyymm.split('-')
  return `${MONTH_NAMES[Number(m) - 1]} ${y}`
}

export function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
