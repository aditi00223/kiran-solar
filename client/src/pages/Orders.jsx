import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DataTable from '@/components/DataTable'
import { mockLeads } from '@/lib/mockLeads'
import { packageLabel, rupees } from '@/lib/mockPackages'
import {
  MIN_ADVANCE_PERCENT,
  PAYMENT_METHODS,
  confirmOrder,
  getBalance,
  getPaid,
  getQuotesWithoutOrder,
  minAdvanceFor,
  mockOrders,
} from '@/lib/mockOrders'

const selectClass = 'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm'

export function PaymentBadge({ order }) {
  const balance = getBalance(order)
  if (balance <= 0) {
    return <Badge variant="secondary" className="border-transparent bg-green-100 text-green-700">Paid in full</Badge>
  }
  return <Badge variant="secondary" className="border-transparent bg-amber-100 text-amber-800">Balance due</Badge>
}

function leadName(leadId) {
  return mockLeads.find((l) => l.id === leadId)?.name ?? 'Unknown customer'
}

export default function Orders() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error] = useState(null)
  const [version, setVersion] = useState(0)
  const [openQuoteId, setOpenQuoteId] = useState(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('UPI')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // TEMPORARY: simulates a server call. Replace with api.get('/orders')
    const timer = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(timer)
  }, [])

  // version changes after every confirmation, so these lists are read fresh
  void version
  const waiting = getQuotesWithoutOrder()
  const rows = [...mockOrders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
    .map((o) => ({
      ...o,
      customer: leadName(o.leadId),
      paid: getPaid(o),
      balance: getBalance(o),
    }))

  function openConfirm(quote) {
    setOpenQuoteId(quote.id)
    setAmount(String(minAdvanceFor(quote.total)))
    setMethod('UPI')
    setFormError('')
  }

  async function handleConfirm(quote) {
    setFormError('')
    setSaving(true)
    try {
      // TEMPORARY: replace with api.post('/orders', ...)
      await new Promise((r) => setTimeout(r, 500))
      const order = confirmOrder({ quoteId: quote.id, amount, method })
      toast.success(`Order ${order.number} confirmed. The warehouse can now pack it.`)
      setOpenQuoteId(null)
      setVersion((v) => v + 1)
    } catch (err) {
      setFormError(err.message || 'Could not confirm the order. Please try again.')
      toast.error(err.message || 'Could not confirm the order')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'number', header: 'Order', render: (o) => <span className="font-medium">{o.number}</span> },
    { key: 'customer', header: 'Customer' },
    { key: 'total', header: 'Total', render: (o) => rupees(o.total) },
    { key: 'paid', header: 'Paid', render: (o) => rupees(o.paid) },
    { key: 'balance', header: 'Balance', render: (o) => rupees(o.balance) },
    { key: 'status', header: 'Payment', render: (o) => <PaymentBadge order={o} /> },
    { key: 'createdAt', header: 'Date' },
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
                    <p className="font-medium">{leadName(q.leadId)}</p>
                    <p className="text-sm text-muted-foreground">
                      {q.number}: {packageLabel(q.type, q.kw)}, total {rupees(q.total)}
                    </p>
                  </div>
                  {openQuoteId !== q.id && (
                    <Button size="sm" onClick={() => openConfirm(q)}>Confirm order</Button>
                  )}
                </div>

                {openQuoteId === q.id && (
                  <div className="max-w-md space-y-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label htmlFor={`advance-${q.id}`}>Advance received (Rs)</Label>
                      <Input
                        id={`advance-${q.id}`}
                        type="number"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum {MIN_ADVANCE_PERCENT}% of the total: {rupees(minAdvanceFor(q.total))}. Enter the full total for a full payment.
                      </p>
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
        data={rows}
        loading={loading}
        error={error}
        emptyMessage="No orders yet"
        onRowClick={(row) => navigate(`/orders/${row.id}`)}
      />
    </div>
  )
}