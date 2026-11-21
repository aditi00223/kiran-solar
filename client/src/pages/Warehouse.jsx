import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ScanLine } from 'lucide-react'
import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const TABS = [
  { value: 'TO_DISPATCH', label: 'To dispatch', statuses: ['CONFIRMED', 'PACKED'] },
  { value: 'DISPATCHED', label: 'Dispatched', statuses: ['DISPATCHED'] },
]

function PickList({ orderId }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    api
      .get(`/orders/${orderId}/pick-list`)
      .then((res) => {
        if (!cancelled) setItems(res.data.data.items)
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.error || 'Could not load the pick list')
      })
    return () => {
      cancelled = true
    }
  }, [orderId])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (!items) return <Skeleton className="h-20 w-full" />
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No serial-tracked items on this order.</p>

  return (
    <ul className="divide-y rounded-lg border text-sm">
      {items.map((item) => (
        <li key={item.productId} className="flex items-center justify-between gap-4 px-4 py-2">
          <span>{item.name}</span>
          <span className="whitespace-nowrap font-medium">
            {item.scanned} of {item.quantity} scanned
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function Warehouse() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('TO_DISPATCH')
  const [orders, setOrders] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const current = TABS.find((t) => t.value === tab)
        const results = await Promise.all(
          TABS.flatMap((t) => t.statuses.map((s) => api.get('/orders', { params: { status: s, limit: 50 } })))
        )
        if (cancelled) return
        const byStatus = {}
        let i = 0
        TABS.forEach((t) => t.statuses.forEach((s) => { byStatus[s] = results[i++].data.data }))
        setCounts({
          TO_DISPATCH: byStatus.CONFIRMED.length + byStatus.PACKED.length,
          DISPATCHED: byStatus.DISPATCHED.length,
        })
        setOrders(current.statuses.flatMap((s) => byStatus[s]))
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
  }, [tab, navigate])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Button key={t.value} size="sm" variant={tab === t.value ? 'default' : 'outline'} onClick={() => setTab(t.value)}>
            {t.label}
            {counts[t.value] != null && ` (${counts[t.value]})`}
          </Button>
        ))}
      </div>

      {orders.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {tab === 'TO_DISPATCH' ? 'Nothing to dispatch right now. New orders appear here once they are confirmed.' : 'No dispatched orders yet.'}
        </p>
      )}

      {orders.map((order) => (
        <Card key={order.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg">O-{order.id}: {order.lead?.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {order.lead?.city}, confirmed {String(order.confirmedAt).slice(0, 10)}
              </p>
            </div>
            {tab === 'TO_DISPATCH' ? (
              <Badge variant="secondary" className="border-transparent bg-amber-100 text-amber-800">To dispatch</Badge>
            ) : (
              <Badge variant="secondary" className="border-transparent bg-green-100 text-green-700">Dispatched</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <PickList orderId={order.id} />
            {tab === 'TO_DISPATCH' && (
              <Button asChild>
                <Link to="/dispatch">
                  <ScanLine className="mr-2 h-4 w-4" />
                  Scan serials and dispatch
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}