import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const selectClass = 'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm'

// Date helpers (local dates as YYYY-MM-DD)
const pad = (n) => String(n).padStart(2, '0')
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fromISO = (s) => new Date(`${s}T00:00:00`)
const todayISO = () => toISO(new Date())
const addDays = (s, n) => {
  const d = fromISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}
const mondayOf = (s) => {
  const d = fromISO(s)
  const diff = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diff)
  return toISO(d)
}
const shortDate = (s) => fromISO(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
const jobDate = (job) => (job.scheduledAt ? toISO(new Date(job.scheduledAt)) : null)

function getRole() {
  try {
    return JSON.parse(localStorage.getItem('user'))?.role
  } catch {
    return null
  }
}

function StatusPill({ job }) {
  if (job.status === 'COMPLETED') {
    return <Badge variant="secondary" className="border-transparent bg-green-100 text-green-700">Done</Badge>
  }
  if (job.status === 'IN_PROGRESS') {
    return <Badge variant="secondary" className="border-transparent bg-purple-100 text-purple-700">In progress</Badge>
  }
  return <Badge variant="secondary" className="border-transparent bg-blue-100 text-blue-700">Scheduled</Badge>
}

export default function Schedule() {
  const navigate = useNavigate()
  const role = getRole()
  const [jobs, setJobs] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayISO()))
  const [editingId, setEditingId] = useState(null)
  const [date, setDate] = useState('')
  const [technicianId, setTechnicianId] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get('/install-jobs', { params: { limit: 50 } })
        if (cancelled) return
        setJobs(res.data.data)
        // Only Sales and Director can read the technician list
        if (role === 'SALES' || role === 'DIRECTOR') {
          try {
            const t = await api.get('/users/technicians')
            if (!cancelled) setTechnicians(t.data.data)
          } catch {
            /* the dropdown stays empty */
          }
        }
      } catch (err) {
        if (cancelled) return
        if (err.response?.status === 401) {
          localStorage.clear()
          navigate('/login')
          return
        }
        setError(err.response?.data?.error || 'Could not load the crew schedule. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [version, role, navigate])

  const today = todayISO()
  const thisWeek = mondayOf(today)
  const canAssign = role === 'SALES'
  const unscheduled = jobs.filter((j) => j.status === 'SCHEDULED' && (!j.technician || !j.scheduledAt))
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function openForm(job) {
    setEditingId(job.id)
    setDate(jobDate(job) ?? today)
    setTechnicianId(job.technician ? String(job.technician.id) : '')
    setFormError('')
  }

  async function handleSave(job) {
    setFormError('')
    if (!date) {
      setFormError('Choose an installation date')
      return
    }
    if (!technicianId) {
      setFormError('Choose a technician')
      return
    }
    setSaving(true)
    try {
      await api.patch(`/install-jobs/${job.id}/assign`, {
        technicianId: Number(technicianId),
        scheduledAt: new Date(`${date}T09:00:00`).toISOString(),
      })
      const name = technicians.find((t) => String(t.id) === technicianId)?.name
      toast.success(`Job booked for ${date}${name ? ` with ${name}` : ''}`)
      setEditingId(null)
      setWeekStart(mondayOf(date))
      setVersion((v) => v + 1)
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not save the job. Please try again.')
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
          <select id={`tech-${job.id}`} className={selectClass} value={technicianId} onChange={(e) => setTechnicianId(e.target.value)}>
            <option value="">Select</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
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

  if (error) return <p className="text-sm text-destructive">{error}</p>

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
              {unscheduled.map((job) => (
                <div key={job.id} className="space-y-3 rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{job.lead?.name}</p>
                    <p className="text-sm text-muted-foreground">O-{job.orderId}, {job.lead?.city}</p>
                  </div>
                  {canAssign &&
                    (editingId === job.id ? (
                      renderForm(job)
                    ) : (
                      <Button size="sm" onClick={() => openForm(job)}>Schedule</Button>
                    ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {weekStart === thisWeek && <span className="mr-2 text-primary">This week:</span>}
            {shortDate(days[0])} to {shortDate(days[6])} {fromISO(days[6]).getFullYear()}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={weekStart === thisWeek} onClick={() => setWeekStart(thisWeek)}>
              This week
            </Button>
            <Button variant="outline" size="icon" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-7">
          {days.map((d) => {
            const dayJobs = jobs.filter((j) => jobDate(j) === d && j.technician)
            const isToday = d === today
            return (
              <div key={d} className={`min-h-40 space-y-2 rounded-lg border p-3 ${isToday ? 'border-primary bg-primary/5' : 'bg-card'}`}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">{fromISO(d).toLocaleDateString('en-IN', { weekday: 'short' })}</p>
                  <p className="text-xs text-muted-foreground">{shortDate(d)}</p>
                </div>
                {dayJobs.length === 0 && <p className="text-xs text-muted-foreground">No jobs</p>}
                {dayJobs.map((job) => (
                  <div key={job.id} className="space-y-2 rounded-md border bg-background p-2 text-xs">
                    <p className="text-sm font-medium">{job.lead?.name}</p>
                    <p className="text-muted-foreground">{job.lead?.city}</p>
                    <p>{job.technician?.name}</p>
                    <StatusPill job={job} />
                    {canAssign && job.status === 'SCHEDULED' &&
                      (editingId === job.id ? (
                        renderForm(job)
                      ) : (
                        <Button size="sm" variant="outline" className="w-full" onClick={() => openForm(job)}>
                          Reschedule
                        </Button>
                      ))}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}