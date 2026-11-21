import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import DataTable from '@/components/DataTable'

const rupees = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-IN')

export const STAGES = [
  { value: 'APPLIED', label: 'Applied' },
  { value: 'DOCUMENTS_SUBMITTED', label: 'Documents submitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'RECEIVED', label: 'Received' },
]

export const stageLabel = (v) => STAGES.find((s) => s.value === v)?.label ?? v

const STAGE_STYLE = {
  APPLIED: 'bg-blue-100 text-blue-700',
  DOCUMENTS_SUBMITTED: 'bg-amber-100 text-amber-800',
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
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [stage, setStage] = useState('')
  const [counts, setCounts] = useState({})
  const [receivedTotal, setReceivedTotal] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 400)
    return () => clearTimeout(t)
  }, [search])

  // Summary cards: one call per stage
  useEffect(() => {
    let cancelled = false
    async function loadSummary() {
      try {
        const results = await Promise.all(
          STAGES.map((s) => api.get('/subsidies', { params: { stage: s.value, limit: 50 } }))
        )
        if (cancelled) return
        const c = {}
        STAGES.forEach((s, i) => {
          c[s.value] = results[i].data.meta.total
        })
        setCounts(c)
        setReceivedTotal(results[3].data.data.reduce((sum, r) => sum + Number(r.amount || 0), 0))
      } catch {
        /* cards are optional */
      }
    }
    loadSummary()
    return () => {
      cancelled = true
    }
  }, [])

  // List: load up to 50 and filter by customer name in the browser
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get('/subsidies', {
          params: { page: 1, limit: 50, stage: stage || undefined },
        })
        if (cancelled) return
        const q = debounced.toLowerCase()
        const filtered = q
          ? res.data.data.filter((r) => (r.order?.lead?.name ?? '').toLowerCase().includes(q))
          : res.data.data
        setRows(filtered)
      } catch (err) {
        if (cancelled) return
        if (err.response?.status === 401) {
          localStorage.clear()
          navigate('/login')
          return
        }
        setError(err.response?.data?.error || 'Could not load subsidies. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [debounced, stage, navigate])

  const columns = [
    { key: 'order', header: 'Order', render: (r) => <span className="font-medium">O-{r.order?.id}</span> },
    { key: 'customer', header: 'Customer', render: (r) => r.order?.lead?.name },
    { key: 'stage', header: 'Stage', render: (r) => <SubsidyBadge status={r.stage} /> },
    { key: 'amount', header: 'Amount', render: (r) => (Number(r.amount) > 0 ? rupees(r.amount) : 'Not set') },
    {
      key: 'docs',
      header: 'Documents',
      render: (r) => `${r.documentLinks?.length ?? 0} link${(r.documentLinks?.length ?? 0) === 1 ? '' : 's'}`,
    },
    { key: 'appliedOn', header: 'Applied' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STAGES.map((s) => (
          <Card key={s.value}>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-semibold">{counts[s.value] ?? '-'}</p>
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer name"
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