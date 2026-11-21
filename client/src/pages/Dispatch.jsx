import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DataTable from '@/components/DataTable'

export default function Dispatch() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [dispatched, setDispatched] = useState([])
  const [orderId, setOrderId] = useState('')
  const [items, setItems] = useState([])
  const [scannedNow, setScannedNow] = useState([])
  const [serial, setSerial] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [busy, setBusy] = useState(false)

  const loadOrders = useCallback(async () => {
    try {
      const [a, b, c] = await Promise.all([
        api.get('/orders', { params: { status: 'CONFIRMED', limit: 50 } }),
        api.get('/orders', { params: { status: 'PACKED', limit: 50 } }),
        api.get('/orders', { params: { status: 'DISPATCHED', limit: 50 } }),
      ])
      const dispatchedList = c.data.data
      const dispatchedIds = new Set(dispatchedList.map((o) => o.id))
      const seen = new Set()
      const waiting = [...a.data.data, ...b.data.data].filter((o) => {
        if (dispatchedIds.has(o.id) || seen.has(o.id)) return false
        if (o.status && !['CONFIRMED', 'PACKED'].includes(o.status)) return false
        seen.add(o.id)
        return true
      })
      setOrders(waiting)
      setDispatched(dispatchedList)
      setOrderId((current) =>
        current && waiting.some((o) => String(o.id) === current) ? current : waiting[0] ? String(waiting[0].id) : ''
      )
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear()
        navigate('/login')
        return
      }
      setLoadError(err.response?.data?.error || 'Could not load orders. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const loadPickList = useCallback(async (id) => {
    if (!id) {
      setItems([])
      return
    }
    try {
      const res = await api.get(`/orders/${id}/pick-list`)
      setItems(res.data.data.items)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load the pick list')
    }
  }, [])

  useEffect(() => {
    setScannedNow([])
    setError('')
    loadPickList(orderId)
  }, [orderId, loadPickList])

  const total = items.reduce((s, i) => s + i.quantity, 0)
  const done = items.reduce((s, i) => s + i.scanned, 0)
  const allScanned = total > 0 && done === total
  const order = orders.find((o) => String(o.id) === orderId)

  async function addSerial(e) {
    e.preventDefault()
    const value = serial.trim().toUpperCase()
    if (!value) {
      setError('Type or scan a serial number.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await api.post('/dispatch/scan', { orderId: Number(orderId), serial: value })
      const scan = res.data.data
      setScannedNow((prev) => [scan, ...prev])
      setSerial('')
      await loadPickList(orderId)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not scan this serial. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmDispatch() {
    setBusy(true)
    setError('')
    try {
      await api.post(`/orders/${orderId}/dispatch`)
      toast.success(`Order O-${orderId} dispatched`)
      await loadOrders()
    } catch (err) {
      const message = err.response?.data?.error || 'Could not dispatch this order.'
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const dispatchedColumns = [
    { key: 'id', header: 'Order', render: (o) => <span className="font-medium">O-{o.id}</span> },
    { key: 'customer', header: 'Customer', render: (o) => o.lead?.name },
    { key: 'city', header: 'City', render: (o) => o.lead?.city },
    { key: 'status', header: 'Status', render: () => <Badge variant="secondary" className="border-transparent bg-cyan-100 text-cyan-800">Dispatched</Badge> },
  ]

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>

  return (
    <div className="space-y-6">
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing to dispatch right now. Orders appear here once they are confirmed.
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order to dispatch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="h-9 w-full max-w-sm rounded-lg border border-input bg-transparent px-3 text-sm"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>O-{o.id} - {o.lead?.name}</option>
                ))}
              </select>
              <p className="text-sm">
                Scanned <span className="font-semibold">{done}</span> of <span className="font-semibold">{total}</span> units
                {order ? `, ${order.lead?.city}` : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scan or type serial</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addSerial} className="flex max-w-xl flex-wrap items-end gap-3" noValidate>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="serial">Serial number</Label>
                  <Input id="serial" value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="INV-3K-2026-00417" autoFocus />
                </div>
                <Button type="submit" disabled={busy}>Add serial</Button>
              </form>
              {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What to scan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="divide-y rounded-lg border text-sm">
                {items.map((i) => (
                  <li key={i.productId} className="flex items-center justify-between gap-4 px-4 py-2">
                    <span>{i.name}</span>
                    <span className={`whitespace-nowrap font-medium ${i.scanned === i.quantity ? 'text-green-700' : ''}`}>
                      {i.scanned} of {i.quantity}
                    </span>
                  </li>
                ))}
              </ul>
              {scannedNow.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Scanned in this visit</p>
                  <ul className="space-y-1 text-sm">
                    {scannedNow.map((s) => (
                      <li key={s.serial}>
                        <span className="font-medium">{s.serial}</span>{' '}
                        <span className="text-muted-foreground">{s.product?.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Button disabled={!allScanned || busy} onClick={confirmDispatch}>
                {busy ? 'Working...' : 'Confirm dispatch'}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Dispatched orders ({dispatched.length})</h2>
        <DataTable columns={dispatchedColumns} data={dispatched} loading={false} error={null} emptyMessage="Nothing dispatched yet" />
      </div>
    </div>
  )
}