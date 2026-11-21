import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import DataTable from '@/components/DataTable'

const rupees = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-IN')

const pad = (n) => String(n).padStart(2, '0')
const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
const shiftMonth = (month, delta) => {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
const monthLabel = (month) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export default function Payroll() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)
  const [month, setMonth] = useState(currentMonth())
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get('/payroll', { params: { month } })
        if (!cancelled) setData(res.data.data)
      } catch (err) {
        if (cancelled) return
        if (err.response?.status === 401) {
          localStorage.clear()
          navigate('/login')
          return
        }
        setError(err.response?.data?.error || 'Could not load technician pay. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [month, version, navigate])

  async function handlePay(row) {
    setBusy(row.technicianId)
    try {
      await api.post('/payroll/pay', { technicianId: row.technicianId, month })
      toast.success(`${row.name} marked as paid for ${monthLabel(month)}`)
      setVersion((v) => v + 1)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not mark as paid')
    } finally {
      setBusy(null)
    }
  }

  const now = currentMonth()
  const rows = data?.technicians ?? []
  const totalHours = rows.reduce((s, r) => s + Number(r.hours || 0), 0)

  const columns = [
    { key: 'name', header: 'Technician', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'jobs', header: 'Jobs' },
    { key: 'hours', header: 'Hours', render: (r) => `${r.hours} h` },
    {
      key: 'hourlyRate',
      header: 'Rate',
      render: (r) =>
        Number(r.hourlyRate) > 0 ? (
          `${rupees(r.hourlyRate)} / h`
        ) : (
          <span className="text-destructive">Not set</span>
        ),
    },
    { key: 'amount', header: 'Pay', render: (r) => <span className="font-semibold">{rupees(r.amount)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        r.status === 'PAID' ? (
          <Badge variant="secondary" className="border-transparent bg-green-100 text-green-700">
            Paid on {String(r.paidAt).slice(0, 10)}
          </Badge>
        ) : (
          <Badge variant="secondary" className="border-transparent bg-amber-100 text-amber-800">Unpaid</Badge>
        ),
    },
    {
      key: 'action',
      header: '',
      render: (r) => {
        if (r.status === 'PAID') return null
        if (!(Number(r.hourlyRate) > 0)) return <span className="text-xs text-muted-foreground">Set an hourly rate first</span>
        return (
          <Button
            size="sm"
            disabled={Number(r.amount) <= 0 || busy === r.technicianId}
            onClick={(e) => {
              e.stopPropagation()
              handlePay(r)
            }}
          >
            {busy === r.technicianId ? 'Saving...' : 'Mark as paid'}
          </Button>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{monthLabel(month)}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMonth(now)}>This month</Button>
          <Button variant="outline" size="icon" aria-label="Next month" disabled={month >= now} onClick={() => setMonth(shiftMonth(month, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Total hours</p>
                <p className="text-2xl font-semibold">{totalHours} h</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Total pay</p>
                <p className="text-2xl font-semibold">{rupees(data?.totalPayable)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-2xl font-semibold text-green-700">{rupees(data?.totalPaid)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Still to pay</p>
                <p className="text-2xl font-semibold">
                  {rupees(Number(data?.totalPayable || 0) - Number(data?.totalPaid || 0))}
                </p>
              </CardContent>
            </Card>
          </div>
        )
      )}

      <DataTable columns={columns} data={rows} loading={loading} error={error} emptyMessage="No technicians yet" />
    </div>
  )
}