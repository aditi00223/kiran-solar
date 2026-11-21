// TEMPORARY: replace with api.get('/subsidies'), api.put(`/subsidies/${id}`) and
// api.post(`/subsidies/${id}/documents`) once Person 1 publishes docs/API.md.
// Amounts are typed in by hand, so no subsidy rule is hard-coded here.
import { mockOrders } from '@/lib/mockOrders'
import { todayISO } from '@/lib/mockJobs'

export const STAGES = [
  { value: 'APPLIED', label: 'Applied' },
  { value: 'DOCS_SUBMITTED', label: 'Documents submitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'RECEIVED', label: 'Received' },
]

export const stageLabel = (value) => STAGES.find((s) => s.value === value)?.label ?? value

export function nextStage(value) {
  const index = STAGES.findIndex((s) => s.value === value)
  return STAGES[index + 1] ?? null
}

export const mockSubsidies = []

// Creates a record for every order that does not have one yet. This stands in for
// the backend creating the subsidy record when an order is confirmed.
function ensureSubsidies() {
  mockOrders.forEach((order) => {
    if (!mockSubsidies.some((s) => s.orderId === order.id)) {
      mockSubsidies.push({
        id: mockSubsidies.length + 1,
        orderId: order.id,
        leadId: order.leadId,
        status: 'APPLIED',
        amount: 0,
        documents: [],
        appliedOn: order.createdAt,
        receivedOn: null,
      })
    }
  })
}

export function getSubsidies() {
  ensureSubsidies()
  return mockSubsidies
}

export function getSubsidy(id) {
  ensureSubsidies()
  return mockSubsidies.find((s) => String(s.id) === String(id)) ?? null
}

function mustFind(id) {
  const subsidy = getSubsidy(id)
  if (!subsidy) throw new Error('Subsidy record not found')
  return subsidy
}

export function setAmount(id, amount) {
  const subsidy = mustFind(id)
  if (subsidy.status === 'RECEIVED') throw new Error('The subsidy is already received, so the amount cannot change')
  const value = Number(amount)
  if (amount === '' || Number.isNaN(value) || value < 0) throw new Error('Enter a valid subsidy amount')
  subsidy.amount = value
  return subsidy
}

export function addDocument(id, { name, url }) {
  const subsidy = mustFind(id)
  if (!name.trim()) throw new Error('Give the document a name')
  if (!/^https?:\/\/\S+$/i.test(url.trim())) throw new Error('The link must start with http:// or https://')
  const nextId = subsidy.documents.reduce((max, d) => Math.max(max, d.id), 0) + 1
  subsidy.documents.push({ id: nextId, name: name.trim(), url: url.trim() })
  return subsidy
}

export function removeDocument(id, docId) {
  const subsidy = mustFind(id)
  if (subsidy.status !== 'APPLIED' && subsidy.documents.length === 1) {
    throw new Error('Documents were already submitted, so the last link cannot be removed')
  }
  subsidy.documents = subsidy.documents.filter((d) => d.id !== docId)
  return subsidy
}

// Moves the subsidy one stage forward. Each stage has its own rule.
export function advanceSubsidy(id, { receivedOn } = {}) {
  const subsidy = mustFind(id)
  const next = nextStage(subsidy.status)
  if (!next) throw new Error('This subsidy is already received')

  if (next.value === 'DOCS_SUBMITTED' && subsidy.documents.length === 0) {
    throw new Error('Add at least one document link before submitting the documents')
  }
  if (next.value === 'APPROVED' && !(subsidy.amount > 0)) {
    throw new Error('Enter the approved subsidy amount before marking it as approved')
  }
  if (next.value === 'RECEIVED') {
    if (!receivedOn) throw new Error('Choose the date the subsidy was received')
    if (receivedOn > todayISO()) throw new Error('The received date cannot be in the future')
    subsidy.receivedOn = receivedOn
  }

  subsidy.status = next.value
  return subsidy
}

// ---- Sample data so the demo has records from day one (amounts are sample values) ----
mockSubsidies.push(
  // Jaswinder Kaur (order 1): just applied, no documents yet
  { id: 1, orderId: 1, leadId: 7, status: 'APPLIED', amount: 0, documents: [], appliedOn: '2026-11-12', receivedOn: null },
  // Amandeep Brar (order 2): documents sent, waiting for approval
  {
    id: 2, orderId: 2, leadId: 8, status: 'DOCS_SUBMITTED', amount: 0,
    documents: [
      { id: 1, name: 'Electricity bill', url: 'https://drive.google.com/file/d/amandeep-electricity-bill' },
      { id: 2, name: 'Aadhaar and bank details', url: 'https://drive.google.com/file/d/amandeep-kyc' },
    ],
    appliedOn: '2026-11-06', receivedOn: null,
  },
  // Kuldeep Singh Bedi (order 3): money received
  {
    id: 3, orderId: 3, leadId: 9, status: 'RECEIVED', amount: 78000,
    documents: [{ id: 1, name: 'Subsidy application form', url: 'https://drive.google.com/file/d/kuldeep-application' }],
    appliedOn: '2026-10-29', receivedOn: '2026-11-14',
  },
)