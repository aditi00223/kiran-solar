import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import DataTable from '@/components/DataTable'
import { mockLeads } from '@/lib/mockLeads'
import { mockOrders } from '@/lib/mockOrders'
import { rupees } from '@/lib/mockPackages'
import { STAGES, getSubsidies, stageLabel } from '@/lib/mockSubsidy'

const STAGE_STYLE = {
  APPLIED: 'bg-blue-100 text-blue-700',
  DOCS_SUBMITTED: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-purple-100 text-purple-700',
  RECEIVED: 'bg-green-100 text-green-700',
}

export function SubsidyBadge({ status }) {
  return (
    <Badge variant="secondary" className={`border-transparent ${STAGE_STYLE[status] ?? 'bg-muted text-muted-foreground'}`}>
      {stageLabel(status)}
    </Badge>
  )
}

const selectClass = 'h-9 rounded-lg border border-input bg-transparent px-3 text-sm'

export default function Subsidy() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error] = useState(null)
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('')

  useEffect(() => {
    // TEMPORARY: simulates a server call. Replace with api.get('/subsidies')
    const timer = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(timer)
  }, [])

  const all = getSubsidies().map((s) => {
    const lead = mockLeads.find((l) => l.id === s.leadId)
    const order = mockOrders.find((o) => o.id === s.orderId)
    return {
      ...s,
      order: order?.number ?? '',
      customer: lead?.name ?? 'Unknown customer',
      city: lead?.city ?? '',
      docCount: s.documents.length,
    }
  })

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return all.filter(
      (r) =>
        (!q || r.customer.toLowerCase().includes(q) || r.city.toLowerCase().includes(q) || r.order.toLowerCase().includes(q)) &&
        (!stage || r.status === stage)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all.length, search, stage, loading])

  const receivedTotal = all.filter((r) => r.status === 'RECEIVED').reduce((sum, r) => sum + r.amount, 0)

  const columns = [
    { key: 'order', header: 'Order', render: (r) => <span className="font-medium">{r.order}</span> },
    { key: 'customer', header: 'Customer' },
    { key: 'status', header: 'Stage', render: (r) => <SubsidyBadge status={r.status} /> },
    { key: 'amount', header: 'Amount', render: (r) => (r.amount > 0 ? rupees(r.amount) : 'Not set') },
    { key: 'docCount', header: 'Documents', render: (r) => `${r.docCount} link${r.docCount === 1 ? '' : 's'}` },
    { key: 'appliedOn', header: 'Applied' },
  ]

  return (
    <div className="space-y-6">
      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STAGES.map((s) => (
            <Card key={s.value}>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-semibold">{all.filter((r) => r.status === s.value).length}</p>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Total received</p>
              <p className="text-2xl font-semibold text-green-700">{rupees(receivedTotal)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer, city or order"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={selectClass} value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        error={error}
        emptyMessage="No subsidy records yet"
        onRowClick={(row) => navigate(`/subsidy/${row.id}`)}
      />
    </div>
  )
}