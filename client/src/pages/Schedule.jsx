import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mockLeads } from '@/lib/mockLeads'
import { getQuote } from '@/lib/mockPackages'
import { getOrder } from '@/lib/mockOrders'
import {
  TECHNICIANS,
  addDays,
  assignJob,
  fromISO,
  getJobs,
  mondayOf,
  todayISO,
} from '@/lib/mockJobs'

const selectClass = 'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm'

const shortDate = (iso) => fromISO(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

function StatusPill({ status }) {
  if (status === 'DONE') {
    return <Badge variant="secondary" className="border-transparent bg-green-100 text-green-700">Done</Badge>
  }
  if (status === 'SCHEDULED') {
    return <Badge variant="secondary" className="border-transparent bg-blue-100 text-blue-700">Scheduled</Badge>
  }
  return <Badge variant="secondary" className="border-transparent bg-amber-100 text-amber-800">Unscheduled</Badge>
}

export default function Schedule() {
  const [loading, setLoading] = useState(true)
  const [error] = useState(null)
  const [, setVersion] = useState(0)
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayISO()))
  const [editingId, setEditingId] = useState(null)
  const [date, setDate] = useState('')
  const [technician, setTechnician] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // TEMPORARY: simulates a server call. Replace with api.get('/jobs')
    const timer = setTimeout(() => setLoading(false), 600)
    return () => clearTimeout(timer)
  }, [])

  const today = todayISO()
  const jobs = getJobs()
  const unscheduled = jobs.filter((j) => j.status === 'UNSCHEDULED')
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function describe(job) {
    const lead = mockLeads.find((l) => l.id === job.leadId)
    const order = getOrder(job.orderId)
    const quote = order ? getQuote(order.quoteId) : null
    return {
      name: lead?.name ?? 'Unknown customer',
      city: lead?.city ?? '',
      kw: quote ? `${quote.kw} kW` : '',
      orderNumber: order?.number ?? '',
    }
  }

  function openForm(job) {
    setEditingId(job.id)
    setDate(job.date ?? today)
    setTechnician(job.technician ?? '')
    setFormError('')
  }

  async function handleSave(job) {
    setFormError('')
    setSaving(true)
    try {
      // TEMPORARY: replace with api.put(`/jobs/${job.id}`, ...)
      await new Promise((r) => setTimeout(r, 500))
      assignJob(job.id, { date, technician })
      toast.success(`Job booked for ${date} with ${technician}`)
      setEditingId(null)
      setWeekStart(mondayOf(date))
      setVersion((v) => v + 1)
    } catch (err) {
      setFormError(err.message || 'Could not save the job. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function renderForm(job) {
    return (
      <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
        <div className="space-y-1">
          <Label htmlFor={`date-${job.id}`}>Installation date</Label>
          <Input id={`date-${job.id}`} type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`tech-${job.id}`}>Technician</Label>
          <select id={`tech-${job.id}`} className={selectClass} value={technician} onChange={(e) => setTechnician(e.target.value)}>
            <option value="">Select</option>
            {TECHNICIANS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        {formError && <p className="text-sm text-destructive">{formError}</p>}
        <div className="flex gap-2">
          <Button size="sm" disabled={saving} onClick={() => handleSave(job)}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button size="sm" variant="outline" disabled={saving} onClick={() => setEditingId(null)}>Cancel</Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-destructive">Could not load the crew schedule. Please refresh the page.</p>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Waiting for a date ({unscheduled.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {unscheduled.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every confirmed order has an installation date.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {unscheduled.map((job) => {
                const info = describe(job)
                return (
                  <div key={job.id} className="space-y-3 rounded-lg border p-4">
                    <div>
                      <p className="font-medium">{info.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {info.orderNumber}, {info.kw}, {info.city}
                      </p>
                    </div>
                    {editingId === job.id ? (
                      renderForm(job)
                    ) : (
                      <Button size="sm" onClick={() => openForm(job)}>Schedule</Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {shortDate(days[0])} to {shortDate(days[6])} {fromISO(days[6]).getFullYear()}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setWeekStart(mondayOf(today))}>This week</Button>
            <Button variant="outline" size="icon" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-7">
          {days.map((d) => {
            const dayJobs = jobs.filter((j) => j.date === d)
            const isToday = d === today
            return (
              <div
                key={d}
                className={`min-h-40 space-y-2 rounded-lg border p-3 ${isToday ? 'border-primary bg-primary/5' : 'bg-card'}`}
              >
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">{fromISO(d).toLocaleDateString('en-IN', { weekday: 'short' })}</p>
                  <p className="text-xs text-muted-foreground">{shortDate(d)}</p>
                </div>
                {dayJobs.length === 0 && <p className="text-xs text-muted-foreground">No jobs</p>}
                {dayJobs.map((job) => {
                  const info = describe(job)
                  return (
                    <div key={job.id} className="space-y-2 rounded-md border bg-background p-2 text-xs">
                      <p className="text-sm font-medium">{info.name}</p>
                      <p className="text-muted-foreground">{info.kw}, {info.city}</p>
                      <p>{job.technician}</p>
                      <StatusPill status={job.status} />
                      {job.status === 'SCHEDULED' &&
                        (editingId === job.id ? (
                          renderForm(job)
                        ) : (
                          <Button size="sm" variant="outline" className="w-full" onClick={() => openForm(job)}>
                            Reschedule
                          </Button>
                        ))}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}