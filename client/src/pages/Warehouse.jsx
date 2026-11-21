import { useEffect, useState } from 'react'
import { PackageCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mockLeads } from '@/lib/mockLeads'
import { packageLabel } from '@/lib/mockPackages'
import { getQuote } from '@/lib/mockPackages'
import { mockOrders } from '@/lib/mockOrders'
import { getJobs, packOrder } from '@/lib/mockJobs'

const TABS = [
  { value: 'TO_PACK', label: 'To pack' },
  { value: 'PACKED', label: 'Packed' },
]

export default function Warehouse() {
  const [loading, setLoading] = useState(true)
  const [error] = useState(null)
  const [, setVersion] = useState(0)
  const [tab, setTab] = useState('TO_PACK')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    // TEMPORARY: simulates a server call. Replace with api.get('/warehouse/orders')
    const timer = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(timer)
  }, [])

  const jobs = getJobs()
  const toPackCount = mockOrders.filter((o) => o.warehouseStatus === 'TO_PACK').length
  const orders = mockOrders
    .filter((o) => o.warehouseStatus === tab)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id)

  async function handlePack(order) {
    setBusyId(order.id)
    try {
      // TEMPORARY: replace with api.put(`/orders/${order.id}/pack`)
      await new Promise((r) => setTimeout(r, 500))
      packOrder(order.id)
      toast.success(`Order ${order.number} packed and ready for dispatch`)
      setVersion((v) => v + 1)
    } catch (err) {
      toast.error(err.message || 'Could not mark the order as packed')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-destructive">Could not load the pick list. Please refresh the page.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <Button
            key={t.value}
            size="sm"
            variant={tab === t.value ? 'default' : 'outline'}
            onClick={() => setTab(t.value)}
          >
            {t.label}
            {t.value === 'TO_PACK' && ` (${toPackCount})`}
          </Button>
        ))}
      </div>

      {orders.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {tab === 'TO_PACK' ? 'Nothing to pack right now. New orders appear here once they are confirmed.' : 'No packed orders yet.'}
        </p>
      )}

      {orders.map((order) => {
        const lead = mockLeads.find((l) => l.id === order.leadId)
        const quote = getQuote(order.quoteId)
        const job = jobs.find((j) => j.orderId === order.id)
        const packed = order.warehouseStatus === 'PACKED'

        return (
          <Card key={order.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">
                  {order.number}: {lead?.name ?? 'Unknown customer'}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {quote ? packageLabel(quote.type, quote.kw) : 'Package'}
                  {lead ? `, ${lead.city}` : ''}
                </p>
                <p className="text-sm text-muted-foreground">
                  Installation:{' '}
                  <span className="font-medium text-foreground">
                    {job?.date ? `${job.date} (${job.technician})` : 'Not scheduled yet'}
                  </span>
                </p>
              </div>
              {packed ? (
                <Badge variant="secondary" className="border-transparent bg-green-100 text-green-700">Packed</Badge>
              ) : (
                <Badge variant="secondary" className="border-transparent bg-amber-100 text-amber-800">To pack</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="divide-y rounded-lg border text-sm">
                {(quote?.items ?? []).map((item, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 px-4 py-2">
                    <span>{item.name}</span>
                    <span className="whitespace-nowrap font-medium">{item.qty} {item.unit}</span>
                  </li>
                ))}
              </ul>
              {packed ? (
                <p className="text-sm text-muted-foreground">Packed on {order.packedAt}.</p>
              ) : (
                <Button disabled={busyId === order.id} onClick={() => handlePack(order)}>
                  <PackageCheck className="mr-2 h-4 w-4" />
                  {busyId === order.id ? 'Saving...' : 'Mark as packed'}
                </Button>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}