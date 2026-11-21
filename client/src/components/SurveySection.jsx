import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import FormField from '@/components/FormField'
import SurveyBadge from '@/components/SurveyBadge'
import { TECHNICIANS, getSurveyByLead, scheduleSurvey } from '@/lib/mockSurveys'

export default function SurveySection({ lead, onChange }) {
  const navigate = useNavigate()
  const [survey, setSurvey] = useState(() => getSurveyByLead(lead.id))
  const [date, setDate] = useState('')
  const [technician, setTechnician] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const approved = survey?.status === 'APPROVED'

  // F5: the reason shown while "Create quote" is disabled
  function gateMessage() {
    if (!survey) return 'Schedule a survey first. A quote can only be created after the survey is approved.'
    if (survey.status === 'SCHEDULED') return `Survey is booked for ${survey.scheduledDate}. Waiting for the technician to submit results.`
    if (survey.status === 'COMPLETED') return 'Survey results are in. Approve the survey to unlock the quote.'
    if (survey.status === 'REJECTED') return 'This survey was rejected, so a quote cannot be created for this lead.'
    return ''
  }

  async function handleSchedule(e) {
    e.preventDefault()
    const next = {}
    if (!date) next.date = 'Choose a survey date'
    else if (date < today) next.date = 'The date cannot be in the past'
    if (!technician) next.technician = 'Choose a technician'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    try {
      // TEMPORARY: replace with api.post(`/leads/${lead.id}/survey`, ...)
      await new Promise((r) => setTimeout(r, 500))
      const created = scheduleSurvey(lead.id, date, technician)
      setSurvey({ ...created })
      toast.success('Survey scheduled')
      onChange?.()
    } catch {
      toast.error('Could not schedule the survey. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Survey</CardTitle>
        {survey && <SurveyBadge status={survey.status} />}
      </CardHeader>
      <CardContent className="space-y-6">
        {!survey ? (
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
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Select</option>
                {TECHNICIANS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {errors.technician && <p className="text-sm text-destructive">{errors.technician}</p>}
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Scheduling...' : 'Schedule survey'}
            </Button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
            <p><span className="text-muted-foreground">Technician: </span><span className="font-medium">{survey.technician}</span></p>
            <p><span className="text-muted-foreground">Date: </span><span className="font-medium">{survey.scheduledDate}</span></p>
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