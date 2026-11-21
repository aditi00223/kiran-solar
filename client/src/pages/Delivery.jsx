import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DataTable from '@/components/DataTable'

const day = (v) => (v ? String(v).slice(0, 10) : '-')

export default function Delivery() {
  const navigate = useNavigate()
  const [waiting, setWaiting] = useState([])
  const [delivered, setDelivered] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [openOrder, setOpenOrder] = useState(null)
  const [serials, setSerials] = useState([])
  const [warrantyNote, setWarrantyNote] = useState('')

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        api.get('/orders', { params: { status: 'DISPATCHED', limit: 50 } }),
        api.get('/orders', { params: { status: 'DELIVERED', limit: 50 } }),
      ])
      const deliveredList = b.data.data
      const deliveredIds = new Set(deliveredList.map((o) => o.id))
      setWaiting(a.data.data.filter((o) => !deliveredIds.has(o.id)))
      setDelivered(deliveredList)
      setLoadError(null)
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
    load()
  }, [load])

  async function markDelivered(order) {
    setBusyId(order.id)
    try {
      const res = await api.post(`/orders/${order.id}/deliver`)
      setOpenOrder(order)
      setSerials(res.data.data.serials ?? [])
      setWarrantyNote('')
      toast.success(`Order O-${order.id} delivered. Warranty has started.`)
      await load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not mark this order as delivered.')
    } finally {
      setBusyId(null)
    }
  }

  async function viewWarranty(order) {
    setBusyId(order.id)
    try {
      const res = await api.get(`/orders/${order.id}`)
      const list = (res.data.data.serials ?? []).map((s) => ({
        serial: s.serial,
        product: s.product?.name ?? s.product ?? '',
        warrantyStart: s.warrantyStart,
        warrantyEnd: s.warrantyEnd,
      }))
      setOpenOrder(order)
      setSerials(list)
      setWarrantyNote(list.length === 0 ? 'No warranty dates were returned for this order.' : '')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not load the warranty dates.')
    } finally {
      setBusyId(null)
    }
  }

  const waitingColumns = [
    { key: 'id', header: 'Order', render: (o) => <span className="font-medium">O-{o.id}</span> },
    { key: 'customer', header: 'Customer', render: (o) => o.lead?.name },
    { key: 'city', header: 'City', render: (o) => o.lead?.city },
    {
      key: 'action',
      header: '',
      render: (o) => (
        <Button size="sm" disabled={busyId === o.id} onClick={() => markDelivered(o)}>
          {busyId === o.id ? 'Saving...' : 'Mark delivered'}
        </Button>
      ),
    },
  ]

  const deliveredColumns = [
    { key: 'id', header: 'Order', render: (o) => <span className="font-medium">O-{o.id}</span> },
    { key: 'customer', header: 'Customer', render: (o) => o.lead?.name },
    { key: 'city', header: 'City', render: (o) => o.lead?.city },
    {
      key: 'status',
      header: 'Status',
      render: () => <Badge variant="secondary" className="border-transparent bg-green-100 text-green-700">Delivered</Badge>,
    },
    {
      key: 'action',
      header: '',
      render: (o) => (
        <Button size="sm" variant="outline" disabled={busyId === o.id} onClick={() => viewWarranty(o)}>
          View warranty
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Waiting for delivery ({waiting.length})</h2>
        <DataTable
          columns={waitingColumns}
          data={waiting}
          loading={false}
          error={null}
          emptyMessage="No dispatched orders waiting for delivery"
        />
      </div>

      {openOrder && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Warranty for O-{openOrder.id} - {openOrder.lead?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serials.length === 0 ? (
              <p className="text-sm text-muted-foreground">{warrantyNote || 'No units to show.'}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3">Serial</th>
                      <th className="p-3">Product</th>
                      <th className="p-3">Warranty start</th>
                      <th className="p-3">Warranty end</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serials.map((u) => (
                      <tr key={u.serial} className="border-b last:border-0">
                        <td className="p-3">{u.serial}</td>
                        <td className="p-3">{u.product}</td>
                        <td className="p-3">{day(u.warrantyStart)}</td>
                        <td className="p-3">{day(u.warrantyEnd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Delivered ({delivered.length})</h2>
        <DataTable
          columns={deliveredColumns}
          data={delivered}
          loading={false}
          error={null}
          emptyMessage="Nothing delivered yet"
        />
      </div>
    </div>
  )
}