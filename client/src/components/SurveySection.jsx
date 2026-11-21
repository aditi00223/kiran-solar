import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import FormField from '@/components/FormField'
import SurveyBadge from '@/components/SurveyBadge'

const pad = (n) => String(n).padStart(2, '0')
const toLocalISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dayOf = (v) => (v ? toLocalISO(new Date(v)) : '-')

function getRole() {
  try {
    return JSON.parse(localStorage.getItem('user'))?.role
  } catch {
    return null
  }
}

export default function SurveySection({ lead, onChange }) {
  const navigate = useNavigate()
  const canSchedule = getRole() === 'SALES'

  const [survey, setSurvey] = useState(null)
  const [technicians, setTechnicians] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [date, setDate] = useState('')
  const [technicianId, setTechnicianId] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const today = toLocalISO(new Date())
  const approved = survey?.status === 'APPROVED'

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const calls = [api.get('/surveys', { params: { leadId: lead.id, limit: 50 } })]
      if (canSchedule) calls.push(api.get('/users/technicians'))
      const [s, t] = await Promise.all(calls)
      const list = s.data.data
      // Prefer an approved survey, otherwise the most recent one
      const latest = [...list].sort((a, b) => String(b.scheduledAt).localeCompare(String(a.scheduledAt)))[0]
      setSurvey(list.find((x) => x.status === 'APPROVED') ?? latest ?? null)
      if (t) setTechnicians(t.data.data)
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear()
        navigate('/login')
        return
      }
      setLoadError(err.response?.data?.error || 'Could not load the survey. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [lead.id, canSchedule, navigate])

  useEffect(() => {
    load()
  }, [load])

  // F5: the reason shown while "Create quote" is disabled
  function gateMessage() {
    if (!survey) return 'Schedule a survey first. A quote can only be created after the survey is approved.'
    if (survey.status === 'SCHEDULED') {
      return `Survey is booked for ${dayOf(survey.scheduledAt)}. Waiting for the technician to submit results.`
    }
    if (survey.status === 'COMPLETED') return 'Survey results are in. Approve the survey to unlock the quote.'
    if (survey.status === 'REJECTED') return 'This survey was rejected, so a quote cannot be created for this lead.'
    return ''
  }

  async function handleSchedule(e) {
    e.preventDefault()
    const next = {}
    if (!date) next.date = 'Choose a survey date'
    else if (date < today) next.date = 'The date cannot be in the past'
    if (!technicianId) next.technician = 'Choose a technician'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    try {
      await api.post('/surveys', {
        leadId: lead.id,
        technicianId: Number(technicianId),
        scheduledAt: new Date(`${date}T10:00:00`).toISOString(),
      })
      toast.success('Survey scheduled')
      setDate('')
      setTechnicianId('')
      await load()
      onChange?.()
    } catch (err) {
      const message = err.response?.data?.error || 'Could not schedule the survey. Please try again.'
      setErrors({ form: message })
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Survey</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-40" />
        </CardContent>
      </Card>
    )
  }

  if (loadError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Survey</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button size="sm" variant="outline" onClick={() => { setLoading(true); load() }}>Try again</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Survey</CardTitle>
        {survey && <SurveyBadge status={survey.status} />}
      </CardHeader>
      <CardContent className="space-y-6">
        {!survey ? (
          canSchedule ? (
            <form onSubmit={handleSchedule} className="max-w-md space-y-4" noValidate>
              <FormField
                label="Survey date"
                name="surveyDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                error={errors.date}
              />
              <div className="space-y-2">
                <Label htmlFor="technician">Technician</Label>
                <select
                  id="technician"
                  value={technicianId}
                  onChange={(e) => setTechnicianId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">Select</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {errors.technician && <p className="text-sm text-destructive">{errors.technician}</p>}
              </div>
              {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}
              <Button type="submit" disabled={saving}>
                {saving ? 'Scheduling...' : 'Schedule survey'}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">No survey has been scheduled for this lead yet.</p>
          )
        ) : (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
            <p><span className="text-muted-foreground">Technician: </span><span className="font-medium">{survey.technician?.name ?? '-'}</span></p>
            <p><span className="text-muted-foreground">Date: </span><span className="font-medium">{dayOf(survey.scheduledAt)}</span></p>
            <Link to={`/surveys/${survey.id}`} className="font-medium text-primary hover:underline">
              View survey details
            </Link>
          </div>
        )}

        <div className="space-y-2 border-t pt-4">
          <Button
            disabled={!approved}
            onClick={() => navigate(`/quotes/new?leadId=${lead.id}`)}
          >
            {!approved && <Lock className="mr-2 h-4 w-4" />}
            Create quote
          </Button>
          {!approved && <p className="text-sm text-muted-foreground">{gateMessage()}</p>}
        </div>
      </CardContent>
    </Card>
  )
}