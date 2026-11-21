import { useEffect, useState } from 'react'
import { Copy, Download } from 'lucide-react'
import { toast } from 'sonner'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DataTable from '@/components/DataTable'
import { rupees } from '@/lib/mockPackages'
import {
  getPaymentsChart,
  getPeriodCards,
  getPipelineChart,
  getProfitRows,
  getUnfinishedJobs,
  mockRepairs,
} from '@/lib/mockDashboard'

const NAVY = '#0f172a'
const AMBER = '#f59e0b'

const compact = (n) => (n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))

function downloadCsv(rows) {
  const header = ['Order', 'Customer', 'Revenue', 'Parts cost', 'Technician cost', 'Profit']
  const lines = rows.map((r) =>
    [r.order, `"${r.customer}"`, r.revenue, r.partsCost, r.techCost, r.profit].join(',')
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
  const [loading, setLoading] = useState(true)
  const [error] = useState(null)

  useEffect(() => {
    // TEMPORARY: simulates a server call. Replace with api.get('/dashboard')
    const timer = setTimeout(() => setLoading(false), 700)
    return () => clearTimeout(timer)
  }, [])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Dashboard link copied')
    } catch {
      toast.error('Could not copy the link. Copy it from the address bar instead.')
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
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-destructive">Could not load the dashboard. Please refresh the page.</p>
  }

  const cards = getPeriodCards()
  const paymentsChart = getPaymentsChart()
  const pipelineChart = getPipelineChart()
  const profitRows = getProfitRows()
  const unfinished = getUnfinishedJobs()

  const profitColumns = [
    { key: 'order', header: 'Order', render: (r) => <span className="font-medium">{r.order}</span> },
    { key: 'customer', header: 'Customer' },
    { key: 'revenue', header: 'Revenue', render: (r) => rupees(r.revenue) },
    { key: 'partsCost', header: 'Parts cost', render: (r) => rupees(r.partsCost) },
    { key: 'techCost', header: 'Technician', render: (r) => rupees(r.techCost) },
    {
      key: 'profit',
      header: 'Profit',
      render: (r) => (
        <span className={r.profit < 0 ? 'font-semibold text-destructive' : 'font-semibold text-green-700'}>
          {r.profit < 0 ? '-' : ''}{rupees(Math.abs(r.profit))}
        </span>
      ),
    },
  ]

  const repairColumns = [
    { key: 'customer', header: 'Customer', render: (r) => <span className="font-medium">{r.customer}</span> },
    { key: 'city', header: 'City' },
    { key: 'issue', header: 'Issue' },
    { key: 'openedOn', header: 'Opened' },
    {
      key: 'status',
      header: 'Warranty',
      render: (r) => (
        <Badge variant="secondary" className="border-transparent bg-green-100 text-green-700">{r.status}</Badge>
      ),
    },
  ]

  const jobColumns = [
    { key: 'order', header: 'Order', render: (r) => <span className="font-medium">{r.order}</span> },
    { key: 'customer', header: 'Customer' },
    { key: 'city', header: 'City' },
    { key: 'date', header: 'Date', render: (r) => r.date ?? 'Not scheduled' },
    { key: 'technician', header: 'Technician', render: (r) => r.technician ?? 'Not assigned' },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        r.status === 'SCHEDULED' ? (
          <Badge variant="secondary" className="border-transparent bg-blue-100 text-blue-700">Scheduled</Badge>
        ) : (
          <Badge variant="secondary" className="border-transparent bg-amber-100 text-amber-800">Unscheduled</Badge>
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="mr-2 h-4 w-4" /> Copy link
        </Button>
        <Button
          size="sm"
          onClick={() => {
            downloadCsv(profitRows)
            toast.success('Profit table downloaded')
          }}
        >
          <Download className="mr-2 h-4 w-4" /> Download CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Payments collected</p>
                <p className="text-2xl font-semibold">{rupees(c.payments)}</p>
              </div>
              <div className="flex gap-8 text-sm">
                <p><span className="font-semibold">{c.leads}</span> <span className="text-muted-foreground">new leads</span></p>
                <p><span className="font-semibold">{c.orders}</span> <span className="text-muted-foreground">new orders</span></p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payments, last 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentsChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" fontSize={12} tickLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={compact} />
                  <Tooltip formatter={(v) => rupees(v)} />
                  <Bar dataKey="amount" name="Payments" fill={AMBER} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leads by stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="stage" fontSize={11} tickLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="leads" name="Leads" fill={NAVY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Profit per job</h2>
        <p className="text-xs text-muted-foreground">
          Revenue is the money received so far, minus parts cost and technician hours. Parts cost and hours are sample values until the real data is connected.
        </p>
        <DataTable columns={profitColumns} data={profitRows} loading={false} error={null} emptyMessage="No orders yet" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Open repairs ({mockRepairs.length})</h2>
          <DataTable columns={repairColumns} data={mockRepairs} loading={false} error={null} emptyMessage="No open repairs" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Unfinished jobs ({unfinished.length})</h2>
          <DataTable columns={jobColumns} data={unfinished} loading={false} error={null} emptyMessage="All jobs are finished" />
        </div>
      </div>
    </div>
  )
}