// TEMPORARY: replace with api.get('/warranty') once Person 1 publishes docs/API.md.
// Shared by Delivery (writes) and Tickets (reads).
import { todayISO } from '@/lib/mockJobs'

// Sample serials per order. warrantyYears values are samples; confirm Kiran's real policy.
export const UNITS = {
  1: [
    { serial: 'SP550-0001', product: 'Solar Panel 550W', warrantyYears: 25 },
    { serial: 'SP550-0002', product: 'Solar Panel 550W', warrantyYears: 25 },
    { serial: 'INV3K-0001', product: 'On-Grid Inverter 3 kW', warrantyYears: 5 },
  ],
  2: [
    { serial: 'SP550-0003', product: 'Solar Panel 550W', warrantyYears: 25 },
    { serial: 'SP550-0004', product: 'Solar Panel 550W', warrantyYears: 25 },
    { serial: 'INV5K-0001', product: 'Off-Grid Inverter 5 kW', warrantyYears: 5 },
    { serial: 'BAT150-0001', product: 'Battery 150Ah', warrantyYears: 5 },
  ],
  3: [
    { serial: 'SP550-0005', product: 'Solar Panel 550W', warrantyYears: 25 },
    { serial: 'SP550-0006', product: 'Solar Panel 550W', warrantyYears: 25 },
    { serial: 'INV3K-0002', product: 'On-Grid Inverter 3 kW', warrantyYears: 5 },
    { serial: 'CBL-0001', product: 'Cable kit (sample, 0 year warranty)', warrantyYears: 0 },
  ],
}

// Orders with no sample serials get 3 generated ones, so the demo works with a fresh order.
export function ensureUnits(orderId) {
  if (!UNITS[orderId]) {
    UNITS[orderId] = [
      { serial: `SP550-O${orderId}-1`, product: 'Solar Panel 550W', warrantyYears: 25 },
      { serial: `SP550-O${orderId}-2`, product: 'Solar Panel 550W', warrantyYears: 25 },
      { serial: `INV3K-O${orderId}-1`, product: 'On-Grid Inverter 3 kW', warrantyYears: 5 },
    ]
  }
  return UNITS[orderId]
}

// orderId -> { date, units: [{ serial, product, warrantyYears, start, end }] }
export const deliveries = {}

export function addYears(iso, years) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y + years, m - 1, d)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

export function deliver(orderId, date = todayISO()) {
  deliveries[orderId] = {
    date,
    units: ensureUnits(orderId).map((u) => ({
      ...u,
      start: date,
      end: addYears(date, u.warrantyYears),
    })),
  }
}

export const isInWarranty = (unit) => todayISO() <= unit.end

// Sample data: order 3 (Kuldeep Singh Bedi) was installed, so it is already delivered.
deliver(3, '2026-10-30')