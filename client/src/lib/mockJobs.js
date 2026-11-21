// TEMPORARY: replace with api.get('/jobs'), api.put(`/jobs/${id}`) and
// api.put(`/orders/${id}/pack`) once Person 1 publishes docs/API.md.
// Person 1's backend creates the pick list and crew job when an order is confirmed.
import { mockOrders, getOrder } from '@/lib/mockOrders'
import { TECHNICIANS } from '@/lib/mockSurveys'

export { TECHNICIANS }

// status: UNSCHEDULED -> SCHEDULED -> DONE (the install form, built by Person 3, finishes a job)
export const mockJobs = []

// ---- Date helpers (local time, so the day never shifts) ----
export function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(iso, days) {
  const date = fromISO(iso)
  date.setDate(date.getDate() + days)
  return toISO(date)
}

// Monday of the week that contains the given date
export function mondayOf(iso) {
  const date = fromISO(iso)
  const offset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - offset)
  return toISO(date)
}

export const todayISO = () => toISO(new Date())

// ---- Jobs ----
// Creates a job for every order that does not have one yet. This stands in for
// the backend creating the crew job at the moment the order is confirmed.
function ensureJobs() {
  mockOrders.forEach((order) => {
    if (!mockJobs.some((j) => j.orderId === order.id)) {
      mockJobs.push({
        id: mockJobs.length + 1,
        orderId: order.id,
        leadId: order.leadId,
        technician: null,
        date: null,
        status: 'UNSCHEDULED',
      })
    }
  })
}

export function getJobs() {
  ensureJobs()
  return mockJobs
}

export function assignJob(jobId, { date, technician }) {
  ensureJobs()
  const job = mockJobs.find((j) => j.id === jobId)
  if (!job) throw new Error('Job not found')
  if (job.status === 'DONE') throw new Error('This job is already finished')

  if (!date) throw new Error('Choose an installation date')
  if (date < todayISO()) throw new Error('The date cannot be in the past')
  if (!technician) throw new Error('Choose a technician')

  const clash = mockJobs.find(
    (j) => j.id !== jobId && j.technician === technician && j.date === date && j.status !== 'DONE'
  )
  if (clash) throw new Error(`${technician} already has a job on ${date}. Pick another day or technician.`)

  job.date = date
  job.technician = technician
  job.status = 'SCHEDULED'
  return job
}

// ---- Warehouse ----
export function packOrder(orderId) {
  const order = getOrder(orderId)
  if (!order) throw new Error('Order not found')
  if (order.warehouseStatus === 'PACKED') throw new Error('This order is already packed')
  order.warehouseStatus = 'PACKED'
  order.packedAt = todayISO()
  return order
}

// ---- Sample data so the demo has something on the board ----
// Amandeep Brar (order 2) was dispatched, Kuldeep Singh Bedi (order 3) is installed,
// so both of their orders were packed a while ago.
mockOrders.forEach((order) => {
  if (order.leadId === 8 || order.leadId === 9) {
    order.warehouseStatus = 'PACKED'
    order.packedAt = order.createdAt
  }
})

const thisMonday = mondayOf(todayISO())

mockJobs.push(
  // Kuldeep Singh Bedi: finished earlier this week
  { id: 1, orderId: 3, leadId: 9, technician: 'Sukhdev Singh', date: addDays(thisMonday, 1), status: 'DONE' },
  // Amandeep Brar: dispatched, installation planned for today
  { id: 2, orderId: 2, leadId: 8, technician: 'Navdeep Singh', date: todayISO(), status: 'SCHEDULED' },
)
// Jaswinder Kaur (order 1) gets an unscheduled job automatically.