// TEMPORARY: replace with api.post(`/orders/${id}/dispatch`) once Person 1 publishes docs/API.md.
// Dispatch state lives here so we do not edit mockOrders.js.
export const dispatches = {}

export function dispatchOrder(orderId, units, time = new Date().toLocaleString()) {
  if (dispatches[orderId]) throw new Error('This order is already dispatched')
  dispatches[orderId] = { units, time }
}

// Sample data: orders 2 and 3 were dispatched before the demo starts.
dispatchOrder(2, 4, '2026-11-08, 10:00 am')
dispatchOrder(3, 4, '2026-10-30, 10:00 am')