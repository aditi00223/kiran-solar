import { useState } from 'react'
import { mockOrders } from '@/lib/mockOrders'
import { mockLeads } from '@/lib/mockLeads'
import { deliveries, deliver } from '@/lib/mockWarranty'

export default function Delivery() {
  const [, setTick] = useState(0)
  const [openId, setOpenId] = useState(null)

  const packed = mockOrders.filter((o) => o.warehouseStatus === 'PACKED')
  const customerOf = (o) => mockLeads.find((l) => l.id === o.leadId)?.name ?? 'Unknown'

  function markDelivered(order) {
    deliver(order.id)
    setOpenId(order.id)
    setTick((t) => t + 1)
  }

  const open = openId ? deliveries[openId] : null
  const openOrder = openId ? mockOrders.find((o) => o.id === openId) : null

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Delivery confirm</h1>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {packed.length === 0 && (
              <tr><td className="p-3 text-muted-foreground" colSpan={4}>No packed orders yet.</td></tr>
            )}
            {packed.map((o) => {
              const done = deliveries[o.id]
              return (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="p-3">{o.number}</td>
                  <td className="p-3">{customerOf(o)}</td>
                  <td className="p-3">
                    {done ? (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-sm text-green-700">
                        Delivered {done.date}
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-sm text-gray-600">Waiting</span>
                    )}
                  </td>
                  <td className="p-3">
                    {done ? (
                      <button type="button" onClick={() => setOpenId(o.id)} className="rounded border px-3 py-1">
                        View warranty
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markDelivered(o)}
                        className="rounded bg-amber-400 px-3 py-1 font-medium"
                      >
                        Mark delivered
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="rounded-lg border bg-white overflow-x-auto">
          <h2 className="p-3 text-lg font-semibold">
            Warranty for {openOrder.number} - {customerOf(openOrder)}
          </h2>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="p-3">Serial</th>
                <th className="p-3">Product</th>
                <th className="p-3">Warranty start</th>
                <th className="p-3">Warranty end</th>
              </tr>
            </thead>
            <tbody>
              {open.units.map((u) => (
                <tr key={u.serial} className="border-b last:border-0">
                  <td className="p-3">{u.serial}</td>
                  <td className="p-3">{u.product}</td>
                  <td className="p-3">{u.start}</td>
                  <td className="p-3">{u.end}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}