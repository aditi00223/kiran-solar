import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
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

const selectClass = 'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm'
const PAYMENT_METHODS = ['UPI', 'Cash', 'Bank transfer', 'Cheque']
const TYPE_LABEL = { ADVANCE: 'Advance', BALANCE: 'Balance', FULL: 'Full payment' }
const rupees = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-IN')

function Detail({ label, children }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children || '-'}</p>
    </div>
  )
}

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('UPI')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/orders/${id}`)
      setOrder(res.data.data)
      setLoadError(null)
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear()
        navigate('/login')
        return
      }
      setLoadError(err.response?.data?.error || 'Could not load this order. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  async function handlePayment(e) {
    e.preventDefault()
    setError('')
    const value = Number(amount)
    const due = Number(order.balance)
    if (!value || value <= 0) {
      setError('Enter the amount received')
      return
    }
    // Stop an overpayment here, before it reaches the server
    if (value > due) {
      setError(`The amount is more than the balance due (${rupees(due)})`)
      return
    }
    setSaving(true)
    try {
      await api.post(`/orders/${id}/payments`, {
        amount: value,
        type: value >= due ? 'FULL' : 'BALANCE',
        method,
      })
    } catch (err) {
      const message = err.response?.data?.error || 'Could not record the payment. Please try again.'
      setError(message)
      toast.error(message)
      setSaving(false)
      return
    }

    // The payment is saved. Reload the order so the totals and the list are correct.
    setAmount('')
    try {
      const fresh = await api.get(`/orders/${id}`)
      setOrder(fresh.data.data)
      toast.success('Payment recorded')
    } catch {
      toast.warning('Payment recorded, but the page could not refresh. Reload the page to see it.')
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

  if (loadError || !order) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{loadError || 'We could not find this order.'}</p>
        <Button variant="outline" onClick={() => navigate('/orders')}>Back to orders</Button>
      </div>
    )
  }

  const balance = Number(order.balance)

  return (
    <div className="space-y-6">
      <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Order O-{order.id}</CardTitle>
          <PaymentBadge order={order} />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Customer">{order.lead?.name}</Detail>
          <Detail label="Phone">{order.lead?.phone}</Detail>
          <Detail label="Address">{order.lead?.address}</Detail>
          <Detail label="City">{order.lead?.city}</Detail>
          <Detail label="Status">{order.status}</Detail>
          <Detail label="Confirmed on">{String(order.confirmedAt).slice(0, 10)}</Detail>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Order total</p>
            <p className="text-2xl font-semibold">{rupees(order.totalAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Paid so far</p>
            <p className="text-2xl font-semibold text-green-700">{rupees(order.paid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-2xl font-semibold">{rupees(order.balance)}</p>
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
              {(order.payments ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{String(p.paidAt).slice(0, 10)}</TableCell>
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
                  max={balance}
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
        <p className="text-sm text-muted-foreground">
          {balance < 0 ? 'This order has been overpaid. Please check the payments above.' : 'This order is paid in full.'}
        </p>
      )}
    </div>
  )
}