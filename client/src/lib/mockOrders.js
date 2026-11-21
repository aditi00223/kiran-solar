// TEMPORARY: replace with api.get('/orders'), api.post('/orders') and
// api.post(`/orders/${id}/payments`) once Person 1 publishes docs/API.md.
import { mockLeads } from '@/lib/mockLeads'
import { mockQuotes, buildParts, calcTotals, rupees } from '@/lib/mockPackages'

// Minimum share of the quote total that must be paid to confirm an order
export const MIN_ADVANCE_PERCENT = 50

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank transfer', 'Cheque']

export const mockOrders = []

const today = () => new Date().toISOString().slice(0, 10)

export function getPaid(order) {
  return order.payments.reduce((sum, p) => sum + p.amount, 0)
}

export function getBalance(order) {
  return order.total - getPaid(order)
}

export function minAdvanceFor(total) {
  return Math.ceil((total * MIN_ADVANCE_PERCENT) / 100)
}

export function getOrder(id) {
  return mockOrders.find((o) => String(o.id) === String(id)) ?? null
}

export function getOrderByQuote(quoteId) {
  return mockOrders.find((o) => o.quoteId === quoteId) ?? null
}

// Quotes that are waiting for the customer to confirm and pay
export function getQuotesWithoutOrder() {
  return mockQuotes.filter((q) => !getOrderByQuote(q.id))
}

export function confirmOrder({ quoteId, amount, method }) {
  const quote = mockQuotes.find((q) => q.id === quoteId)
  if (!quote) throw new Error('Quote not found')
  if (getOrderByQuote(quoteId)) throw new Error('This quote already has an order')

  const paid = Number(amount)
  if (!(paid > 0)) throw new Error('Enter the payment amount')
  if (paid > quote.total) throw new Error(`Payment cannot be more than the quote total of ${rupees(quote.total)}`)
  const minimum = minAdvanceFor(quote.total)
  if (paid < minimum) {
    throw new Error(`Advance must be at least ${MIN_ADVANCE_PERCENT}% of the total (${rupees(minimum)})`)
  }

  const id = mockOrders.length + 1
  const order = {
    id,
    number: `KIR-O-${String(id).padStart(4, '0')}`,
    quoteId,
    leadId: quote.leadId,
    total: quote.total,
    createdAt: today(),
    // F9: the backend creates the warehouse pick list and crew job on confirmation
    warehouseStatus: 'TO_PACK',
    payments: [
      {
        id: 1,
        amount: paid,
        method,
        type: paid === quote.total ? 'FULL' : 'ADVANCE',
        date: today(),
      },
    ],
  }
  mockOrders.push(order)

  const lead = mockLeads.find((l) => l.id === quote.leadId)
  if (lead) lead.status = 'ORDERED'
  return order
}

export function recordPayment(orderId, { amount, method }) {
  const order = getOrder(orderId)
  if (!order) throw new Error('Order not found')

  const balance = getBalance(order)
  if (balance <= 0) throw new Error('This order is already fully paid')

  const paid = Number(amount)
  if (!(paid > 0)) throw new Error('Enter the payment amount')
  if (paid > balance) throw new Error(`Payment is more than the balance of ${rupees(balance)}`)

  order.payments.push({
    id: order.payments.length + 1,
    amount: paid,
    method,
    type: paid === balance ? 'FULL' : 'PART',
    date: today(),
  })
  return order
}

// ---- Sample data so the demo has orders from day one ----
function seedOrder({ leadId, kw, quoteDate, orderDate, payments }) {
  const quoteId = mockQuotes.length + 1
  const items = buildParts('ON_GRID', kw)
  const quote = {
    id: quoteId,
    number: `KIR-Q-${String(quoteId).padStart(4, '0')}`,
    leadId,
    type: 'ON_GRID',
    kw,
    items,
    notes: 'Quote valid for 15 days. Subsidy paperwork handled by Kiran.',
    ...calcTotals(items),
    createdAt: quoteDate,
  }
  mockQuotes.push(quote)

  const id = mockOrders.length + 1
  mockOrders.push({
    id,
    number: `KIR-O-${String(id).padStart(4, '0')}`,
    quoteId,
    leadId,
    total: quote.total,
    createdAt: orderDate,
    warehouseStatus: 'TO_PACK',
    payments: payments(quote.total).map((p, i) => ({ id: i + 1, ...p })),
  })
}

// Jaswinder Kaur: ordered, advance paid, balance pending
seedOrder({
  leadId: 7, kw: 3, quoteDate: '2026-11-10', orderDate: '2026-11-12',
  payments: (total) => [
    { amount: Math.ceil(total / 2), method: 'UPI', type: 'ADVANCE', date: '2026-11-12' },
  ],
})

// Amandeep Brar: dispatched, fully paid in two payments
seedOrder({
  leadId: 8, kw: 4, quoteDate: '2026-11-05', orderDate: '2026-11-06',
  payments: (total) => [
    { amount: Math.ceil(total / 2), method: 'Bank transfer', type: 'ADVANCE', date: '2026-11-06' },
    { amount: total - Math.ceil(total / 2), method: 'UPI', type: 'FULL', date: '2026-11-15' },
  ],
})

// Kuldeep Singh Bedi: installed, paid in full
seedOrder({
  leadId: 9, kw: 3, quoteDate: '2026-10-28', orderDate: '2026-10-29',
  payments: (total) => [
    { amount: total, method: 'Cheque', type: 'FULL', date: '2026-10-29' },
  ],
})