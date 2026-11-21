import { useState } from 'react'
import { mockOrders } from '@/lib/mockOrders'
import { mockLeads } from '@/lib/mockLeads'
import { UNITS } from '@/lib/mockWarranty'
import { dispatches, dispatchOrder } from '@/lib/mockDispatch'

export default function Dispatch() {
  const [, setTick] = useState(0)
  const [pickedId, setPickedId] = useState(null)
  const [scannedByOrder, setScannedByOrder] = useState({})
  const [serial, setSerial] = useState('')
  const [error, setError] = useState('')

  // Only orders the warehouse has marked Packed (read only from mockOrders)
  const packed = mockOrders.filter((o) => o.warehouseStatus === 'PACKED')
  const customerOf = (o) => mockLeads.find((l) => l.id === o.leadId)?.name ?? 'Unknown'

  const orderId = pickedId ?? (packed.find((o) => !dispatches[o.id]) ?? packed[0])?.id ?? null
  const order = packed.find((o) => o.id === orderId) ?? null
  const units = order ? UNITS[order.id] || [] : []
  const scanned = scannedByOrder[orderId] || []
  const isDispatched = order ? Boolean(dispatches[order.id]) : false
  const allScanned = units.length > 0 && scanned.length === units.length

  function changeOrder(e) {
    setPickedId(Number(e.target.value))
    setSerial('')
    setError('')
  }

  function addSerial(e) {
    e.preventDefault()
    const value = serial.trim().toUpperCase()
    if (!value) return setError('Type or scan a serial number.')
    const unit = units.find((u) => u.serial === value)
    if (!unit) return setError('This serial does not belong to this order.')
    if (scanned.some((u) => u.serial === value)) return setError('This serial is already scanned.')
    setError('')
    setScannedByOrder({ ...scannedByOrder, [orderId]: [...scanned, unit] })
    setSerial('')
  }

  function confirmDispatch() {
    try {
      dispatchOrder(order.id, scanned.length)
      setTick((t) => t + 1)
    } catch (err) {
      setError(err.message)
    }
  }

  const dispatchedRows = packed.filter((o) => dispatches[o.id])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dispatch scanner</h1>

      {packed.length === 0 ? (
        <div className="rounded-lg border bg-white p-4 text-muted-foreground">
          No packed orders yet. The warehouse must mark an order as Packed first.
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <label className="block text-sm text-muted-foreground">Order</label>
            <select value={orderId} onChange={changeOrder} className="rounded border p-2 w-full sm:w-80">
              {packed.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.number} - {customerOf(o)}{dispatches[o.id] ? ' (dispatched)' : ''}
                </option>
              ))}
            </select>
            <p className="text-sm">
              Scanned <span className="font-semibold">{isDispatched ? units.length : scanned.length}</span> of{' '}
              <span className="font-semibold">{units.length}</span> units
            </p>
          </div>

          {isDispatched ? (
            <div className="rounded-lg border bg-green-50 p-4 text-green-700">
              Order {order.number} is dispatched. It can't be dispatched again.
            </div>
          ) : (
            <form onSubmit={addSerial} className="rounded-lg border bg-white p-4 space-y-3">
              <h2 className="text-lg font-semibold">Scan or type serial</h2>
              <div className="flex flex-wrap gap-3">
                <input
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  placeholder="e.g. SP550-0001"
                  className="rounded border p-2 w-64"
                  autoFocus
                />
                <button type="submit" className="rounded bg-amber-400 px-4 py-2 font-medium">Add serial</button>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
          )}

          <div className="rounded-lg border bg-white overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th className="p-3">Serial</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => {
                  const done = isDispatched || scanned.some((s) => s.serial === u.serial)
                  return (
                    <tr key={u.serial} className="border-b last:border-0">
                      <td className="p-3">{u.serial}</td>
                      <td className="p-3">{u.product}</td>
                      <td className="p-3">
                        {done ? (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-sm text-green-700">Scanned</span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-sm text-gray-600">Pending</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!isDispatched && (
            <button
              type="button"
              onClick={confirmDispatch}
              disabled={!allScanned}
              className="rounded bg-amber-400 px-4 py-2 font-medium disabled:opacity-50"
            >
              Confirm dispatch
            </button>
          )}
        </>
      )}

      <div className="rounded-lg border bg-white overflow-x-auto">
        <h2 className="p-3 text-lg font-semibold">Dispatched orders</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Units</th>
              <th className="p-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {dispatchedRows.length === 0 && (
              <tr><td className="p-3 text-muted-foreground" colSpan={4}>Nothing dispatched yet.</td></tr>
            )}
            {dispatchedRows.map((o) => (
              <tr key={o.id} className="border-b last:border-0">
                <td className="p-3">{o.number}</td>
                <td className="p-3">{customerOf(o)}</td>
                <td className="p-3">{dispatches[o.id].units}</td>
                <td className="p-3">{dispatches[o.id].time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}