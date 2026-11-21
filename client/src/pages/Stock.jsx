import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Search } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DataTable from '@/components/DataTable'

const rupees = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-IN')
const selectClass = 'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm'

export default function Stock() {
  const navigate = useNavigate()
  const role = (() => {
    try {
      return JSON.parse(localStorage.getItem('user'))?.role
    } catch {
      return null
    }
  })()
  const canBuy = role === 'WAREHOUSE'

  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [search, setSearch] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)
  const [form, setForm] = useState({ productId: '', supplierId: '', quantity: '', unitCost: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const calls = [
        api.get('/stock'),
        api.get('/stock/movements', { params: { limit: 50 } }),
        api.get('/purchases', { params: { limit: 50 } }),
      ]
      if (canBuy) calls.push(api.get('/suppliers'))
      const [s, m, p, sup] = await Promise.all(calls)
      setProducts(s.data.data)
      setMovements(m.data.data)
      setPurchases(p.data.data)
      if (sup) setSuppliers(sup.data.data)
      setLoadError(null)
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear()
        navigate('/login')
        return
      }
      setLoadError(err.response?.data?.error || 'Could not load stock. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [navigate, canBuy])

  useEffect(() => {
    load()
  }, [load])

  const lowCount = products.filter((p) => p.isLow).length
  const totalSpend = purchases.reduce((sum, p) => sum + Number(p.totalCost || 0), 0)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => (!q || p.name.toLowerCase().includes(q)) && (!onlyLow || p.isLow))
  }, [products, search, onlyLow])

  const total = Number(form.quantity || 0) * Number(form.unitCost || 0)

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    const quantity = Number(form.quantity)
    const unitCost = Number(form.unitCost)
    if (!form.productId) return setError('Choose a product.')
    if (!form.supplierId) return setError('Choose a supplier.')
    if (!quantity || quantity < 1) return setError('Quantity must be at least 1.')
    if (!unitCost || unitCost <= 0) return setError('Enter the cost per unit.')
    setBusy(true)
    try {
      await api.post('/purchases', {
        supplierId: Number(form.supplierId),
        productId: Number(form.productId),
        quantity,
        unitCost,
      })
      toast.success('Purchase saved. Stock updated.')
      setForm({ ...form, quantity: '', unitCost: '' })
      await load()
    } catch (err) {
      const message = err.response?.data?.error || 'Could not save the purchase.'
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  function exportCsv() {
    const rows = [
      ['Date', 'Product', 'Type', 'Quantity'],
      ...movements.map((m) => [String(m.createdAt).slice(0, 10), m.name, m.type, m.quantity]),
    ]
    const csv = rows.map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'stock-movements.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const stockColumns = [
    { key: 'name', header: 'Product', render: (p) => <span className="font-medium">{p.name}</span> },
    { key: 'category', header: 'Category' },
    { key: 'inStock', header: 'In stock' },
    { key: 'lowStockLevel', header: 'Minimum' },
    {
      key: 'status',
      header: 'Status',
      render: (p) =>
        p.isLow ? (
          <Badge variant="secondary" className="border-transparent bg-red-100 text-red-700">Low stock</Badge>
        ) : (
          <Badge variant="secondary" className="border-transparent bg-green-100 text-green-700">OK</Badge>
        ),
    },
  ]

  const movementColumns = [
    { key: 'createdAt', header: 'Date', render: (m) => String(m.createdAt).slice(0, 10) },
    { key: 'name', header: 'Product' },
    {
      key: 'type',
      header: 'Type',
      render: (m) => (m.type === 'PURCHASE' ? 'Purchase in' : m.type === 'DISPATCH' ? 'Dispatched out' : m.type),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (m) => (
        <span className={m.quantity < 0 ? 'text-destructive' : 'text-green-700'}>
          {m.quantity > 0 ? '+' : ''}{m.quantity}
        </span>
      ),
    },
    { key: 'orderId', header: 'Order', render: (m) => (m.orderId ? `O-${m.orderId}` : '-') },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total products</p>
            <p className="text-2xl font-semibold">{products.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Low stock items</p>
            <p className={'text-2xl font-semibold ' + (lowCount > 0 ? 'text-destructive' : 'text-green-700')}>{lowCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Purchase spend (recent)</p>
            <p className="text-2xl font-semibold">{rupees(totalSpend)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search product" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
          Show low stock only
        </label>
      </div>

      <DataTable columns={stockColumns} data={visible} loading={loading} error={loadError} emptyMessage="No products match" />

      {canBuy && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add purchase</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="max-w-2xl space-y-4" noValidate>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="productId">Product</Label>
                  <select id="productId" name="productId" className={selectClass} value={form.productId} onChange={change}>
                    <option value="">Select</option>
                    {products.map((p) => (
                      <option key={p.productId} value={p.productId}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="supplierId">Supplier</Label>
                  <select id="supplierId" name="supplierId" className={selectClass} value={form.supplierId} onChange={change}>
                    <option value="">Select</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}{s.city ? `, ${s.city}` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" name="quantity" type="number" min="1" value={form.quantity} onChange={change} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="unitCost">Cost per unit (Rs)</Label>
                  <Input id="unitCost" name="unitCost" type="number" min="0" value={form.unitCost} onChange={change} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Total cost: <span className="font-medium text-foreground">{rupees(total)}</span></p>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save purchase'}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Stock movement history</h2>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={movements.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Download CSV
          </Button>
        </div>
        <DataTable columns={movementColumns} data={movements} loading={loading} error={loadError} emptyMessage="No stock movements yet" />
      </div>
    </div>
  )
}