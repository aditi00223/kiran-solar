// TEMPORARY: replace with api.get('/payroll?month=YYYY-MM') and
// api.put('/payroll/:id/paid') once Person 1 publishes docs/API.md.
// Rates and past-month hours are SAMPLE values.
import { getJobs, todayISO } from '@/lib/mockJobs'
import { getQuote } from '@/lib/mockPackages'
import { mockOrders } from '@/lib/mockOrders'

// Sample hourly rates in rupees, per technician
export const RATES = {
  'Sukhdev Singh': 450,
  'Gurmeet Kumar': 400,
  'Navdeep Singh': 350,
}

const HOURS_BY_KW = { 1: 6, 2: 8, 3: 10, 4: 12, 5: 14 }

// Sample hours for past months. Keys are YYYY-MM, then technician.
const PAST_HOURS = {
  '2026-09': { 'Sukhdev Singh': 62, 'Gurmeet Kumar': 48, 'Navdeep Singh': 55 },
  '2026-10': { 'Sukhdev Singh': 70, 'Gurmeet Kumar': 52, 'Navdeep Singh': 44 },
}

// Records of payouts already made: key "YYYY-MM|Technician" -> paid date
const paidOn = {
  '2026-09|Sukhdev Singh': '2026-10-02',
  '2026-09|Gurmeet Kumar': '2026-10-02',
  '2026-09|Navdeep Singh': '2026-10-02',
  '2026-10|Sukhdev Singh': '2026-11-03',
  
}

export const currentMonth = () => todayISO().slice(0, 7)

export function monthLabel(month) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function hoursFromJobs(month, technician) {
  return getJobs()
    .filter((j) => j.status === 'DONE' && j.technician === technician && j.date?.startsWith(month))
    .reduce((sum, j) => {
      const order = mockOrders.find((o) => o.id === j.orderId)
      const quote = order ? getQuote(order.quoteId) : null
      return sum + (HOURS_BY_KW[quote?.kw] ?? 10)
    }, 0)
}

export function getPayroll(month) {
  return Object.keys(RATES).map((technician) => {
    const hours = PAST_HOURS[month]?.[technician] ?? hoursFromJobs(month, technician)
    const rate = RATES[technician]
    return {
      technician,
      hours,
      rate,
      pay: hours * rate,
      paidOn: paidOn[`${month}|${technician}`] ?? null,
    }
  })
}

export function markPaid(month, technician) {
  if (month >= currentMonth()) throw new Error('This month has not ended yet, so it cannot be paid')
  const key = `${month}|${technician}`
  if (paidOn[key]) throw new Error(`${technician} is already paid for ${monthLabel(month)}`)
  const row = getPayroll(month).find((r) => r.technician === technician)
  if (!row || row.hours <= 0) throw new Error('There are no hours to pay for this month')
  paidOn[key] = todayISO()
  return paidOn[key]
}