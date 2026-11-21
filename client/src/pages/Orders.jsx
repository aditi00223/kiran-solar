import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DataTable from '@/components/DataTable'

const selectClass = 'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm'
const PAYMENT_METHODS = ['UPI', 'Cash', 'Bank transfer', 'Cheque']
const rupees = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-IN')

export function PaymentBadge({ order }) {
  if (Number(order.balance) <= 0) {
    return <Badge variant="secondary" className="border-transparent bg-green-100 text-green-700">Paid in full</Badge>
  }
  return <Badge variant="secondary" className="border-transparent bg-amber-100 text-amber-800">Balance due</Badge>
}

export default function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [waiting, setWaiting] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)
  const [openQuoteId, setOpenQuoteId] = useState(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('UPI')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [o, q] = await Promise.all([
          api.get('/orders', { params: { limit: 50 } }),
          api.get('/quotes', { params: { limit: 50 } }),
        ])
        if (cancelled) return
        setOrders(o.data.data)
        // The list has no orderId, so check each quote that could still be ordered
        const candidates = q.data.data.filter((x) => x.status !== 'ACCEPTED')
        const details = await Promise.all(
          candidates.map((x) => api.get(`/quotes/${x.id}`).then((r) => r.data.data).catch(() => null))
        )
        if (cancelled) return
        setWaiting(details.filter((d) => d && d.orderId == null))
      } catch (err) {
        if (cancelled) return
        if (err.response?.status === 401) {
          localStorage.clear()
          navigate('/login')
          return
        }
        setError(err.response?.data?.error || 'Could not load orders. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [version, navigate])

  function openConfirm(quote) {
    setOpenQuoteId(quote.id)
    setAmount('')
    setMethod('UPI')
    setFormError('')
  }

  async function handleConfirm(quote) {
    setFormError('')
    const value = Number(amount)
    if (!value || value <= 0) {
      setFormError('Enter the advance amount received')
      return
    }
    setSaving(true)
    try {
      const res = await api.post('/orders', {
        quoteId: quote.id,
        payment: {
          amount: value,
          type: value >= Number(quote.totalAmount) ? 'FULL' : 'ADVANCE',
          method,
        },
      })
      toast.success(`Order O-${res.data.data.id} confirmed. The warehouse can now pack it.`)
      setOpenQuoteId(null)
      setVersion((v) => v + 1)
    } catch (err) {
      const message = err.response?.data?.error || 'Could not confirm the order. Please try again.'
      setFormError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'id', header: 'Order', render: (o) => <span className="font-medium">O-{o.id}</span> },
    { key: 'customer', header: 'Customer', render: (o) => o.lead?.name },
    { key: 'totalAmount', header: 'Total', render: (o) => rupees(o.totalAmount) },
    { key: 'paid', header: 'Paid', render: (o) => rupees(o.paid) },
    { key: 'balance', header: 'Balance', render: (o) => rupees(o.balance) },
    { key: 'status', header: 'Payment', render: (o) => <PaymentBadge order={o} /> },
    { key: 'confirmedAt', header: 'Date', render: (o) => String(o.confirmedAt).slice(0, 10) },
  ]

  return (
    <div className="space-y-6">
      {!loading && waiting.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quotes waiting for confirmation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {waiting.map((q) => (
              <div key={q.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{q.lead?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Q-{q.id}: {q.template?.name}, total {rupees(q.totalAmount)}
                    </p>
                  </div>
                  {openQuoteId !== q.id && (
                    <Button size="sm" onClick={() => openConfirm(q)}>Confirm order</Button>
                  )}
                </div>

                {openQuoteId === q.id && (
                  <div className="max-w-md space-y-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label htmlFor={`advance-${q.id}`}>Payment received (Rs)</Label>
                      <Input
                        id={`advance-${q.id}`}
                        type="number"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => setAmount(String(q.totalAmount))}
                      >
                        Fill the full total ({rupees(q.totalAmount)})
                      </button>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`method-${q.id}`}>Payment method</Label>
                      <select id={`method-${q.id}`} className={selectClass} value={method} onChange={(e) => setMethod(e.target.value)}>
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    {formError && <p className="text-sm text-destructive">{formError}</p>}
                    <div className="flex gap-3">
                      <Button disabled={saving} onClick={() => handleConfirm(q)}>
                        {saving ? 'Confirming...' : 'Confirm order'}
                      </Button>
                      <Button variant="outline" disabled={saving} onClick={() => setOpenQuoteId(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        error={error}
        emptyMessage="No orders yet"
        onRowClick={(row) => navigate(`/orders/${row.id}`)}
      />
    </div>
  )
}