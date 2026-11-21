import { useState } from 'react'

const orders = [
  {
    id: 'KIR-O-0001',
    customer: 'Jaswinder Kaur',
    units: [
      { serial: 'SP550-0001', product: 'Solar Panel 550W' },
      { serial: 'SP550-0002', product: 'Solar Panel 550W' },
      { serial: 'INV3K-0001', product: 'On-Grid Inverter 3 kW' },
    ],
  },
  {
    id: 'KIR-O-0002',
    customer: 'Amandeep Brar',
    units: [
      { serial: 'SP550-0003', product: 'Solar Panel 550W' },
      { serial: 'SP550-0004', product: 'Solar Panel 550W' },
      { serial: 'INV5K-0001', product: 'Off-Grid Inverter 5 kW' },
      { serial: 'BAT150-0001', product: 'Battery 150Ah' },
    ],
  },
]

export default function Dispatch() {
  const [orderId, setOrderId] = useState(orders[0].id)
  const [scannedByOrder, setScannedByOrder] = useState({})
  const [dispatched, setDispatched] = useState([])
  const [serial, setSerial] = useState('')
  const [error, setError] = useState('')

  const order = orders.find((o) => o.id === orderId)
  const scanned = scannedByOrder[orderId] || []
  const isDispatched = dispatched.some((d) => d.id === orderId)
  const allScanned = scanned.length === order.units.length

  function changeOrder(e) {
    setOrderId(e.target.value)
    setSerial('')
    setError('')
  }

  function addSerial(e) {
    e.preventDefault()
    const value = serial.trim().toUpperCase()
    if (!value) return setError('Type or scan a serial number.')
    const unit = order.units.find((u) => u.serial === value)
    if (!unit) return setError('This serial does not belong to this order.')
    if (scanned.some((u) => u.serial === value)) return setError('This serial is already scanned.')
    setError('')
    setScannedByOrder({ ...scannedByOrder, [orderId]: [...scanned, unit] })
    setSerial('')
  }

  function confirmDispatch() {
    setDispatched([
      { id: orderId, customer: order.customer, units: scanned.length, time: new Date().toLocaleString() },
      ...dispatched,
    ])
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dispatch scanner</h1>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        <label className="block text-sm text-muted-foreground">Order</label>
        <select value={orderId} onChange={changeOrder} className="rounded border p-2 w-full sm:w-80">
          {orders.map((o) => (
            <option key={o.id} value={o.id}>{o.id} - {o.customer}</option>
          ))}
        </select>
        <p className="text-sm">
          Scanned <span className="font-semibold">{scanned.length}</span> of{' '}
          <span className="font-semibold">{order.units.length}</span> units
        </p>
      </div>

      {isDispatched ? (
        <div className="rounded-lg border bg-green-50 p-4 text-green-700">
          Order {orderId} is dispatched. All {order.units.length} units confirmed.
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
            {order.units.map((u) => {
              const done = scanned.some((s) => s.serial === u.serial)
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
            {dispatched.length === 0 && (
              <tr><td className="p-3 text-muted-foreground" colSpan={4}>Nothing dispatched yet.</td></tr>
            )}
            {dispatched.map((d) => (
              <tr key={d.id} className="border-b last:border-0">
                <td className="p-3">{d.id}</td>
                <td className="p-3">{d.customer}</td>
                <td className="p-3">{d.units}</td>
                <td className="p-3">{d.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}