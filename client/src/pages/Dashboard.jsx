import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, Download } from 'lucide-react'
import { toast } from 'sonner'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DataTable from '@/components/DataTable'

const NAVY = '#0f172a'
const AMBER = '#f59e0b'
const GREEN = '#15803d'
const GREY = '#94a3b8'

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
]

const rupees = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-IN')
const compact = (n) =>
  Math.abs(n) >= 100000 ? `${(n / 100000).toFixed(1)}L` : Math.abs(n) >= 1000 ? `${Math.round(n / 1000)}k` : String(n)

function downloadCsv(rows) {
  const header = ['Order', 'Customer', 'Revenue', 'Parts cost', 'Technician cost', 'Profit']
  const lines = rows.map((r) =>
    [`O-${r.orderId}`, `"${r.customer?.name ?? ''}"`, r.revenue, r.partsCost, r.technicianCost, r.profit].join(',')
  )
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'kiran-profit-per-job.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [summaries, setSummaries] = useState(null)
  const [repairs, setRepairs] = useState([])
  const [unfinished, setUnfinished] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [range, setRange] = useState('month')
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ totalPages: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [tableLoading, setTableLoading] = useState(true)
  const [tableError, setTableError] = useState(null)

  function handle401(err) {
    if (err.response?.status === 401) {
      localStorage.clear()
      navigate('/login')
      return true
    }
    return false
  }

  // Cards, repairs and unfinished jobs
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [t, w, m, r, u] = await Promise.all([
          api.get('/dashboard/summary', { params: { range: 'today' } }),
          api.get('/dashboard/summary', { params: { range: 'week' } }),
          api.get('/dashboard/summary', { params: { range: 'month' } }),
          api.get('/dashboard/open-repairs'),
          api.get('/dashboard/unfinished-jobs'),
        ])
        if (cancelled) return
        setSummaries({ today: t.data.data, week: w.data.data, month: m.data.data })
        setRepairs(r.data.data)
        setUnfinished(u.data.data)
      } catch (err) {
        if (cancelled || handle401(err)) return
        setError(err.response?.data?.error || 'Could not load the dashboard. The server may be waking up, please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Profit table
  useEffect(() => {
    let cancelled = false
    async function load() {
      setTableLoading(true)
      setTableError(null)
      try {
        const res = await api.get('/dashboard/profit-per-job', { params: { range, page, limit: 10 } })
        if (cancelled) return
        setRows(res.data.data)
        setMeta(res.data.meta)
      } catch (err) {
        if (cancelled || handle401(err)) return
        setTableError(err.response?.data?.error || 'Could not load the profit table.')
      } finally {
        if (!cancelled) setTableLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, page])

  async function handleShare() {
    try {
      const res = await api.post('/dashboard/share', { range })
      await navigator.clipboard.writeText(res.data.data.url)
      toast.success('Share link copied. It works for 7 days.')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not create the share link.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>

  const periodChart = RANGES.map((r) => ({
    period: r.label,
    Revenue: summaries[r.value].revenue,
    'Parts cost': summaries[r.value].partsCost,
    Technicians: summaries[r.value].technicianCost,
    Profit: summaries[r.value].profit,
  }))

  const jobChart = rows.map((r) => ({ order: `O-${r.orderId}`, Profit: r.profit }))

  const profitColumns = [
    { key: 'order', header: 'Order', render: (r) => <span className="font-medium">O-{r.orderId}</span> },
    { key: 'customer', header: 'Customer', render: (r) => r.customer?.name },
    { key: 'revenue', header: 'Revenue', render: (r) => rupees(r.revenue) },
    { key: 'partsCost', header: 'Parts cost', render: (r) => rupees(r.partsCost) },
    { key: 'technicianCost', header: 'Technician', render: (r) => rupees(r.technicianCost) },
    {
      key: 'profit',
      header: 'Profit',
      render: (r) => (
        <span className={r.result === 'LOSS' ? 'font-semibold text-destructive' : 'font-semibold text-green-700'}>
          {r.profit < 0 ? '-' : ''}{rupees(Math.abs(r.profit))}
        </span>
      ),
    },
  ]

  const repairColumns = [
    { key: 'customer', header: 'Customer', render: (r) => <span className="font-medium">{r.customer?.name}</span> },
    { key: 'issue', header: 'Issue' },
    { key: 'daysOpen', header: 'Days open' },
    {
      key: 'warrantyStatus',
      header: 'Warranty',
      render: (r) =>
        r.warrantyStatus === 'IN' ? (
          <Badge variant="secondary" className="border-transparent bg-green-100 text-green-700">In warranty</Badge>
        ) : (
          <Badge variant="secondary" className="border-transparent bg-red-100 text-red-700">Out of warranty</Badge>
        ),
    },
  ]

  const jobColumns = [
    { key: 'order', header: 'Order', render: (r) => <span className="font-medium">O-{r.orderId}</span> },
    { key: 'customer', header: 'Customer', render: (r) => r.customer?.name },
    { key: 'city', header: 'City', render: (r) => r.customer?.city },
    { key: 'waitingFor', header: 'Waiting for' },
    { key: 'balance', header: 'Balance', render: (r) => rupees(r.balance) },
    { key: 'days', header: 'Days', render: (r) => r.daysSinceConfirmed },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Copy className="mr-2 h-4 w-4" /> Copy share link
        </Button>
        <Button
          size="sm"
          disabled={rows.length === 0}
          onClick={() => {
            downloadCsv(rows)
            toast.success('Profit table downloaded')
          }}
        >
          <Download className="mr-2 h-4 w-4" /> Download CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {RANGES.map((r) => {
          const s = summaries[r.value]
          return (
            <Card key={r.value}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{r.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Profit</p>
                  <p className={`text-2xl font-semibold ${s.profit < 0 ? 'text-destructive' : ''}`}>
                    {s.profit < 0 ? '-' : ''}{rupees(Math.abs(s.profit))}
                  </p>
                  <p className="text-xs text-muted-foreground">Revenue {rupees(s.revenue)}</p>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <p><span className="font-semibold">{s.newLeads}</span> <span className="text-muted-foreground">new leads</span></p>
                  <p><span className="font-semibold">{s.ordersConfirmed}</span> <span className="text-muted-foreground">orders</span></p>
                  <p><span className="font-semibold">{s.installsCompleted}</span> <span className="text-muted-foreground">installs</span></p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Money by period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={periodChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" fontSize={12} tickLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={compact} />
                  <Tooltip formatter={(v) => rupees(v)} />
                  <Legend />
                  <Bar dataKey="Revenue" fill={AMBER} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Parts cost" fill={GREY} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Technicians" fill={NAVY} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Profit" fill={GREEN} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profit per job</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {jobChart.length === 0 ? (
                <p className="pt-24 text-center text-sm text-muted-foreground">No orders in this range</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={jobChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="order" fontSize={12} tickLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={compact} />
                    <Tooltip formatter={(v) => rupees(v)} />
                    <Bar dataKey="Profit" fill={AMBER} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Profit per job</h2>
          <select
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
            value={range}
            onChange={(e) => { setRange(e.target.value); setPage(1) }}
          >
            {RANGES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-muted-foreground">
          Profit = order total minus parts cost minus technician hours times their rate. Losses show in red.
        </p>
        <DataTable columns={profitColumns} data={rows} loading={tableLoading} error={tableError} emptyMessage="No orders in this range" />
        {!tableError && meta.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Page {page} of {meta.totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Open repairs ({repairs.length})</h2>
          <DataTable columns={repairColumns} data={repairs} loading={false} error={null} emptyMessage="No open repairs" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Unfinished jobs ({unfinished.length})</h2>
          <DataTable columns={jobColumns} data={unfinished} loading={false} error={null} emptyMessage="All jobs are finished" />
        </div>
      </div>
    </div>
  )
}