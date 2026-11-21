import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PaymentBadge } from '@/pages/Orders'
import { mockLeads } from '@/lib/mockLeads'
import { getQuote, packageLabel, rupees } from '@/lib/mockPackages'
import {
  PAYMENT_METHODS,
  getBalance,
  getOrder,
  getPaid,
  recordPayment,
} from '@/lib/mockOrders'

const selectClass = 'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm'

const TYPE_LABEL = { ADVANCE: 'Advance', PART: 'Part payment', FULL: 'Full payment' }

function Detail({ label, children }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children}</p>
    </div>
  )
}

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [lead, setLead] = useState(null)
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [, setVersion] = useState(0)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('UPI')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // TEMPORARY: replace with api.get(`/orders/${id}`)
    const timer = setTimeout(() => {
      const found = getOrder(id)
      setOrder(found)
      setLead(found ? mockLeads.find((l) => l.id === found.leadId) ?? null : null)
      setQuote(found ? getQuote(found.quoteId) : null)
      setLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [id])

  async function handlePayment(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      // TEMPORARY: replace with api.post(`/orders/${id}/payments`, ...)
      await new Promise((r) => setTimeout(r, 500))
      recordPayment(order.id, { amount, method })
      toast.success('Payment recorded')
      setAmount('')
      setVersion((v) => v + 1)
    } catch (err) {
      setError(err.message || 'Could not record the payment. Please try again.')
      toast.error(err.message || 'Could not record the payment')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!order || !lead) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">We could not find this order.</p>
        <Button variant="outline" onClick={() => navigate('/orders')}>Back to orders</Button>
      </div>
    )
  }

  const paid = getPaid(order)
  const balance = getBalance(order)

  return (
    <div className="space-y-6">
      <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Order {order.number}</CardTitle>
          <PaymentBadge order={order} />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Customer">{lead.name}</Detail>
          <Detail label="Phone">{lead.phone}</Detail>
          <Detail label="Address">{lead.address}</Detail>
          {quote && <Detail label="Package">{packageLabel(quote.type, quote.kw)}</Detail>}
          <Detail label="Order date">{order.createdAt}</Detail>
          {quote && (
            <div>
              <p className="text-xs text-muted-foreground">Quote</p>
              <Link to={`/quotes/${quote.id}`} className="text-sm font-medium text-primary hover:underline">
                {quote.number}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Order total</p>
            <p className="text-2xl font-semibold">{rupees(order.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Paid so far</p>
            <p className="text-2xl font-semibold text-green-700">{rupees(paid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-2xl font-semibold">{rupees(balance)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.date}</TableCell>
                  <TableCell>{TYPE_LABEL[p.type] ?? p.type}</TableCell>
                  <TableCell>{p.method}</TableCell>
                  <TableCell className="text-right font-medium">{rupees(p.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {balance > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Record payment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePayment} className="max-w-md space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount received (Rs)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => setAmount(String(balance))}
                >
                  Fill the full balance ({rupees(balance)})
                </button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Payment method</Label>
                <select id="method" className={selectClass} value={method} onChange={(e) => setMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Record payment'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">This order is paid in full.</p>
      )}
    </div>
  )
}