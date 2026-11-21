import { useState } from 'react'

const initialProducts = [
  { id: 1, name: 'Solar Panel 550W', quantity: 42, minimum: 20 },
  { id: 2, name: 'On-Grid Inverter 3 kW', quantity: 6, minimum: 8 },
  { id: 3, name: 'Off-Grid Inverter 5 kW', quantity: 3, minimum: 5 },
  { id: 4, name: 'Battery 150Ah', quantity: 18, minimum: 10 },
  { id: 5, name: 'Mounting Structure Set', quantity: 25, minimum: 10 },
  { id: 6, name: 'DC Cable (metres)', quantity: 120, minimum: 150 },
]

export default function Stock() {
  const [products, setProducts] = useState(initialProducts)
  const [history, setHistory] = useState([])
  const [form, setForm] = useState({ productId: '1', supplier: '', quantity: '', cost: '' })
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)

  const lowCount = products.filter((p) => p.quantity < p.minimum).length
  const totalSpend = history.reduce((sum, h) => sum + h.cost, 0)
  const visibleProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      (!onlyLow || p.quantity < p.minimum)
  )

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleSubmit(e) {
    e.preventDefault()
    const qty = Number(form.quantity)
    const cost = Number(form.cost)
    if (!form.supplier.trim()) return setError('Enter the supplier name.')
    if (!qty || qty <= 0) return setError('Quantity must be more than 0.')
    if (!cost || cost <= 0) return setError('Cost must be more than 0.')
    setError('')
    const product = products.find((p) => p.id === Number(form.productId))
    setProducts(
      products.map((p) => (p.id === product.id ? { ...p, quantity: p.quantity + qty } : p))
    )
    setHistory([
      {
        id: Date.now(),
        date: new Date().toLocaleString(),
        product: product.name,
        supplier: form.supplier.trim(),
        quantity: qty,
        cost,
      },
      ...history,
    ])
    setForm({ ...form, supplier: '', quantity: '', cost: '' })
  }

  function exportCsv() {
    const rows = [
      ['Date', 'Product', 'Supplier', 'Qty added', 'Cost (Rs)'],
      ...history.map((h) => [h.date, h.product, h.supplier, h.quantity, h.cost]),
    ]
    const csv = rows
      .map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'stock-purchases.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Stock and Purchases</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-muted-foreground">Total products</p>
          <p className="text-2xl font-semibold">{products.length}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-muted-foreground">Low stock items</p>
          <p className={'text-2xl font-semibold ' + (lowCount > 0 ? 'text-red-600' : 'text-green-600')}>{lowCount}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-sm text-muted-foreground">Total purchase spend</p>
          <p className="text-2xl font-semibold">Rs {totalSpend.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search product..."
          className="rounded border bg-white p-2 w-64"
        />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
          Show low stock only
        </label>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="p-3">Product</th>
              <th className="p-3">In stock</th>
              <th className="p-3">Minimum</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleProducts.length === 0 && (
              <tr><td className="p-3 text-muted-foreground" colSpan={4}>No products match.</td></tr>
            )}
            {visibleProducts.map((p) => {
              const low = p.quantity < p.minimum
              return (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.quantity}</td>
                  <td className="p-3">{p.minimum}</td>
                  <td className="p-3">
                    {low ? (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-sm text-red-700">Low stock</span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-sm text-green-700">OK</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border bg-white p-4 space-y-3">
        <h2 className="text-lg font-semibold">Add purchase</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <select name="productId" value={form.productId} onChange={handleChange} className="rounded border p-2">
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input name="supplier" value={form.supplier} onChange={handleChange} placeholder="Supplier" className="rounded border p-2" />
          <input name="quantity" type="number" value={form.quantity} onChange={handleChange} placeholder="Quantity" className="rounded border p-2" />
          <input name="cost" type="number" value={form.cost} onChange={handleChange} placeholder="Total cost (Rs)" className="rounded border p-2" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="rounded bg-amber-400 px-4 py-2 font-medium">Save purchase</button>
      </form>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <div className="flex items-center justify-between p-3">
          <h2 className="text-lg font-semibold">Stock movement history</h2>
          <button
            type="button"
            onClick={exportCsv}
            disabled={history.length === 0}
            className="rounded border px-3 py-1 text-sm font-medium disabled:opacity-50"
          >
            Download CSV
          </button>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="p-3">Date</th>
              <th className="p-3">Product</th>
              <th className="p-3">Supplier</th>
              <th className="p-3">Qty added</th>
              <th className="p-3">Cost (Rs)</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr><td className="p-3 text-muted-foreground" colSpan={5}>No purchases yet.</td></tr>
            )}
            {history.map((h) => (
              <tr key={h.id} className="border-b last:border-0">
                <td className="p-3">{h.date}</td>
                <td className="p-3">{h.product}</td>
                <td className="p-3">{h.supplier}</td>
                <td className="p-3">+{h.quantity}</td>
                <td className="p-3">{h.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
