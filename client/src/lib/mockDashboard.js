// TEMPORARY: replace with api.get('/dashboard') once Person 1 publishes docs/API.md.
// Revenue, leads, orders and jobs come from the other mock files, so they change live.
// Parts cost, technician hours and repairs are SAMPLE values (see the marked blocks).
import { mockLeads } from '@/lib/mockLeads'
import { mockOrders, getPaid } from '@/lib/mockOrders'
import { getQuote } from '@/lib/mockPackages'
import { getJobs, addDays, fromISO, mondayOf, todayISO } from '@/lib/mockJobs'

// ---- SAMPLE ASSUMPTIONS: replace with real values from Person 1 ----
const PARTS_COST_SHARE = 0.7 // parts cost as a share of the quote subtotal
const TECH_RATE_PER_HOUR = 400 // Rs per hour
const HOURS_BY_KW = { 1: 6, 2: 8, 3: 10, 4: 12, 5: 14 } // sample install hours per job

// ---- SAMPLE DATA: replace with api.get('/tickets?status=open') (Person 1 + Person 3) ----
export const mockRepairs = [
  { id: 1, customer: 'Kuldeep Singh Bedi', issue: 'Inverter shows a grid fault light', city: 'Moga', openedOn: '2026-11-18', status: 'In warranty' },
  { id: 2, customer: 'Amandeep Brar', issue: 'Panel cleaning and loose cable check', city: 'Bathinda', openedOn: '2026-11-20', status: 'In warranty' },
]

const inRange = (iso, from, to) => iso >= from && iso <= to

function periodStats(from, to) {
  let payments = 0
  mockOrders.forEach((o) => {
    o.payments.forEach((p) => {
      if (inRange(p.date, from, to)) payments += p.amount
    })
  })
  return {
    payments,
    leads: mockLeads.filter((l) => inRange(l.createdAt, from, to)).length,
    orders: mockOrders.filter((o) => inRange(o.createdAt, from, to)).length,
  }
}

export function getPeriodCards() {
  const today = todayISO()
  const monday = mondayOf(today)
  const monthStart = today.slice(0, 8) + '01'
  return [
    { key: 'today', label: 'Today', ...periodStats(today, today) },
    { key: 'week', label: 'This week', ...periodStats(monday, addDays(monday, 6)) },
    { key: 'month', label: 'This month', ...periodStats(monthStart, today) },
  ]
}

export function getPaymentsChart() {
  const today = todayISO()
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i - 6)
    const total = mockOrders.reduce(
      (sum, o) => sum + o.payments.filter((p) => p.date === day).reduce((s, p) => s + p.amount, 0),
      0
    )
    return {
      day: fromISO(day).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
      amount: total,
    }
  })
}

const STAGES = [
  { status: 'NEW', label: 'New' },
  { status: 'CONTACTED', label: 'Contacted' },
  { status: 'SURVEY_SCHEDULED', label: 'Survey booked' },
  { status: 'SURVEY_APPROVED', label: 'Survey approved' },
  { status: 'QUOTED', label: 'Quoted' },
  { status: 'ORDERED', label: 'Ordered' },
  { status: 'DISPATCHED', label: 'Dispatched' },
  { status: 'INSTALLED', label: 'Installed' },
]

export function getPipelineChart() {
  return STAGES.map((s) => ({
    stage: s.label,
    leads: mockLeads.filter((l) => l.status === s.status).length,
  }))
}

export function getProfitRows() {
  return mockOrders.map((order) => {
    const lead = mockLeads.find((l) => l.id === order.leadId)
    const quote = getQuote(order.quoteId)
    const revenue = getPaid(order)
    const partsCost = Math.round((quote?.subtotal ?? 0) * PARTS_COST_SHARE)
    const hours = HOURS_BY_KW[quote?.kw] ?? 10
    const techCost = hours * TECH_RATE_PER_HOUR
    return {
      id: order.id,
      order: order.number,
      customer: lead?.name ?? 'Unknown customer',
      revenue,
      partsCost,
      techCost,
      profit: revenue - partsCost - techCost,
    }
  })
}

export function getUnfinishedJobs() {
  return getJobs()
    .filter((j) => j.status !== 'DONE')
    .map((j) => {
      const lead = mockLeads.find((l) => l.id === j.leadId)
      const order = mockOrders.find((o) => o.id === j.orderId)
      return {
        id: j.id,
        order: order?.number ?? '',
        customer: lead?.name ?? 'Unknown customer',
        city: lead?.city ?? '',
        date: j.date,
        technician: j.technician,
        status: j.status,
      }
    })
}