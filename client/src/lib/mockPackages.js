// TEMPORARY: sample catalogue. Replace with api.get('/packages') and api.post('/quotes')
// once Person 1 publishes docs/API.md. All prices are in rupees.
import { mockLeads } from '@/lib/mockLeads'
import { getSurveyByLead } from '@/lib/mockSurveys'

// Check the current GST rate for solar with your accountant before the real demo
export const GST_RATE = 5

export const PACKAGE_TYPES = [
  { value: 'ON_GRID', label: 'On-Grid system', sized: true },
  { value: 'OFF_GRID', label: 'Off-Grid system', sized: true },
  { value: 'PANEL_SET', label: 'Panel set', sized: false },
  { value: 'INSTALLATION', label: 'Installation service', sized: false },
]

export const KW_SIZES = [1, 2, 3, 4, 5]

const PANEL_WATT = 540
const PANEL_PRICE = 14500
const ON_GRID_INVERTER = { 1: 18000, 2: 26000, 3: 34000, 4: 42000, 5: 50000 }
const OFF_GRID_INVERTER = { 1: 22000, 2: 32000, 3: 42000, 4: 52000, 5: 62000 }
const BATTERY_QTY = { 1: 1, 2: 2, 3: 4, 4: 4, 5: 6 }

// Builds the parts list for a package. Each item: { name, qty, unit, price }
export function buildParts(type, kw) {
  const k = Number(kw)
  const panels = Math.ceil((k * 1000) / PANEL_WATT)

  if (type === 'PANEL_SET') {
    return [
      { name: 'Solar panel 540 Wp mono PERC', qty: 6, unit: 'pcs', price: PANEL_PRICE },
      { name: 'GI mounting structure (per panel set)', qty: 1, unit: 'set', price: 18000 },
    ]
  }

  if (type === 'INSTALLATION') {
    return [
      { name: 'Installation and commissioning (labour)', qty: 1, unit: 'job', price: 9000 },
      { name: 'Civil work and cable laying', qty: 1, unit: 'job', price: 3000 },
    ]
  }

  const items = [
    { name: 'Solar panel 540 Wp mono PERC', qty: panels, unit: 'pcs', price: PANEL_PRICE },
  ]

  if (type === 'ON_GRID') {
    items.push({ name: `On-grid solar inverter ${k} kW`, qty: 1, unit: 'pcs', price: ON_GRID_INVERTER[k] })
  } else {
    items.push({ name: `Off-grid PCU inverter ${k} kW`, qty: 1, unit: 'pcs', price: OFF_GRID_INVERTER[k] })
    items.push({ name: 'Tubular battery 12V 150Ah', qty: BATTERY_QTY[k], unit: 'pcs', price: 14000 })
  }

  items.push(
    { name: 'GI mounting structure', qty: k, unit: 'kW', price: 6000 },
    { name: 'DC and AC cables', qty: k, unit: 'kW', price: 2500 },
    { name: 'ACDB and DCDB box with surge protection', qty: 1, unit: 'set', price: 3500 },
    { name: 'Earthing and lightning arrestor kit', qty: 1, unit: 'set', price: 4500 },
  )

  if (type === 'ON_GRID') {
    items.push({ name: 'Net meter and DISCOM paperwork', qty: 1, unit: 'job', price: 6000 })
  }

  items.push({ name: 'Installation and commissioning', qty: k, unit: 'kW', price: 3000 })
  return items
}

export function calcTotals(items) {
  const subtotal = items.reduce((sum, i) => sum + Number(i.qty) * Number(i.price), 0)
  const gst = Math.round((subtotal * GST_RATE) / 100)
  return { subtotal, gst, total: subtotal + gst }
}

export const rupees = (n) => '₹' + Number(n).toLocaleString('en-IN')

export function packageLabel(type, kw) {
  const t = PACKAGE_TYPES.find((p) => p.value === type)
  if (!t) return type
  return t.sized ? `${kw} kW ${t.label}` : t.label
}

export const mockQuotes = []

export function createQuote({ leadId, type, kw, items, notes = '' }) {
  const lead = mockLeads.find((l) => l.id === leadId)
  if (!lead) throw new Error('Lead not found')

  // F5: same rule as the backend, which returns 403 until the survey is approved
  const survey = getSurveyByLead(leadId)
  if (survey?.status !== 'APPROVED') throw new Error('Survey not approved yet')

  if (items.length === 0) throw new Error('Add at least one item to the quote')
  if (items.some((i) => !(Number(i.qty) > 0) || Number(i.price) < 0 || i.price === '')) {
    throw new Error('Every item needs a quantity above zero and a valid price')
  }

  const cleanItems = items.map((i) => ({ ...i, qty: Number(i.qty), price: Number(i.price) }))
  const id = mockQuotes.length + 1
  const quote = {
    id,
    number: `KIR-Q-${String(id).padStart(4, '0')}`,
    leadId,
    type,
    kw: Number(kw),
    items: cleanItems,
    notes,
    ...calcTotals(cleanItems),
    createdAt: new Date().toISOString().slice(0, 10),
  }
  mockQuotes.push(quote)
  if (lead.status !== 'ORDERED' && lead.status !== 'DISPATCHED' && lead.status !== 'INSTALLED') {
    lead.status = 'QUOTED'
  }
  return quote
}

export function getQuote(id) {
  return mockQuotes.find((q) => String(q.id) === String(id)) ?? null
}

// One sample quote so the demo has something to show (Balwinder Dhillon, approved survey)
const seedItems = buildParts('ON_GRID', 5)
mockQuotes.push({
  id: 1,
  number: 'KIR-Q-0001',
  leadId: 6,
  type: 'ON_GRID',
  kw: 5,
  items: seedItems,
  notes: 'Quote valid for 15 days. Subsidy paperwork handled by Kiran.',
  ...calcTotals(seedItems),
  createdAt: '2026-11-14',
})