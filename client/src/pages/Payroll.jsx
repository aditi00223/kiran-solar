import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import DataTable from '@/components/DataTable'
import { rupees } from '@/lib/mockPackages'
import {
  currentMonth,
  getPayroll,
  markPaid,
  monthLabel,
  shiftMonth,
} from '@/lib/mockPayroll'

export default function Payroll() {
  const [loading, setLoading] = useState(true)
  const [error] = useState(null)
  const [, setVersion] = useState(0)
  const [month, setMonth] = useState(() => shiftMonth(currentMonth(), -1))
  const [busy, setBusy] = useState('')

  useEffect(() => {
    // TEMPORARY: simulates a server call. Replace with api.get('/payroll?month=...')
    const timer = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(timer)
  }, [])

  const now = currentMonth()
  const rows = getPayroll(month)
  const totalHours = rows.reduce((s, r) => s + r.hours, 0)
  const totalPay = rows.reduce((s, r) => s + r.pay, 0)
  const paidTotal = rows.filter((r) => r.paidOn).reduce((s, r) => s + r.pay, 0)
  const monthEnded = month < now

  async function handlePay(row) {
    setBusy(row.technician)
    try {
      // TEMPORARY: replace with api.put('/payroll/paid', ...)
      await new Promise((r) => setTimeout(r, 500))
      markPaid(month, row.technician)
      toast.success(`${row.technician} marked as paid for ${monthLabel(month)}`)
      setVersion((v) => v + 1)
    } catch (err) {
      toast.error(err.message || 'Could not mark as paid')
    } finally {
      setBusy('')
    }
  }

  const columns = [
    { key: 'technician', header: 'Technician', render: (r) => <span className="font-medium">{r.technician}</span> },
    { key: 'hours', header: 'Hours', render: (r) => `${r.hours} h` },
    { key: 'rate', header: 'Rate', render: (r) => `${rupees(r.rate)} / h` },
    { key: 'pay', header: 'Pay', render: (r) => <span className="font-semibold">{rupees(r.pay)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        r.paidOn ? (
          <Badge variant="secondary" className="border-transparent bg-green-100 text-green-700">Paid on {r.paidOn}</Badge>
        ) : (
          <Badge variant="secondary" className="border-transparent bg-amber-100 text-amber-800">Unpaid</Badge>
        ),
    },
    {
      key: 'action',
      header: '',
      render: (r) =>
        r.paidOn ? null : (
          <Button
            size="sm"
            disabled={!monthEnded || r.hours <= 0 || busy === r.technician}
            onClick={(e) => {
              e.stopPropagation()
              handlePay(r)
            }}
          >
            {busy === r.technician ? 'Saving...' : 'Mark as paid'}
          </Button>
        ),
    },
  ]

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

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
            <p className="text-2xl font-semibold">{rupees(totalPay)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-2xl font-semibold text-green-700">{rupees(paidTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Still to pay</p>
            <p className="text-2xl font-semibold">{rupees(totalPay - paidTotal)}</p>
          </CardContent>
        </Card>
      </div>

      {!monthEnded && (
        <p className="text-sm text-muted-foreground">
          This month has not ended yet, so pay cannot be marked as paid. Hours count finished jobs only.
        </p>
      )}

      <DataTable columns={columns} data={rows} loading={false} error={error} emptyMessage="No technicians yet" />
    </div>
  )
}