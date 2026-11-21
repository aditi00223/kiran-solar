import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SurveyBadge from '@/components/SurveyBadge'
import { mockLeads } from '@/lib/mockLeads'
import { mockSurveys, decideSurvey } from '@/lib/mockSurveys'

function Detail({ label, children }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children}</p>
    </div>
  )
}

export default function SurveyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [survey, setSurvey] = useState(null)
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // TEMPORARY: replace with api.get(`/surveys/${id}`)
    const timer = setTimeout(() => {
      const found = mockSurveys.find((s) => String(s.id) === id) ?? null
      setSurvey(found ? { ...found } : null)
      setLead(found ? mockLeads.find((l) => l.id === found.leadId) ?? null : null)
      setLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [id])

  async function decide(decision) {
    if (decision === 'REJECTED' && !reason.trim()) {
      setReasonError('Write a short reason for rejecting this survey')
      return
    }
    setReasonError('')
    setBusy(true)
    try {
      // TEMPORARY: replace with api.put(`/surveys/${id}/decision`, ...)
      await new Promise((r) => setTimeout(r, 500))
      const updated = decideSurvey(survey.id, decision, reason.trim())
      setSurvey({ ...updated })
      toast.success(decision === 'APPROVED' ? 'Survey approved. A quote can now be created.' : 'Survey rejected')
    } catch (err) {
      toast.error(err.message || 'Could not update the survey. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!survey || !lead) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">We could not find this survey.</p>
        <Button variant="outline" onClick={() => navigate('/surveys')}>Back to surveys</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link to="/surveys" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to surveys
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">{lead.name}</CardTitle>
          <SurveyBadge status={survey.status} />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Phone">{lead.phone}</Detail>
          <Detail label="Address">{lead.address}</Detail>
          <Detail label="System size wanted">{lead.systemSize} kW</Detail>
          <Detail label="Technician">{survey.technician}</Detail>
          <Detail label="Survey date">{survey.scheduledDate}</Detail>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Survey results</CardTitle>
        </CardHeader>
        <CardContent>
          {survey.result ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Roof direction">{survey.result.direction}</Detail>
              <Detail label="Roof tilt">{survey.result.tilt} degrees</Detail>
              <Detail label="Cable distance">{survey.result.cableDistance} m</Detail>
              <div className="sm:col-span-2 lg:col-span-3">
                <Detail label="Technician notes">{survey.result.notes}</Detail>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No results yet. The technician will submit them after visiting on {survey.scheduledDate}.
            </p>
          )}
        </CardContent>
      </Card>

      {survey.status === 'COMPLETED' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Decision</CardTitle>
          </CardHeader>
          <CardContent className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (needed only if you reject)</Label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              />
              {reasonError && <p className="text-sm text-destructive">{reasonError}</p>}
            </div>
            <div className="flex gap-3">
              <Button disabled={busy} onClick={() => decide('APPROVED')}>Approve survey</Button>
              <Button variant="destructive" disabled={busy} onClick={() => decide('REJECTED')}>Reject survey</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {survey.status === 'APPROVED' && (
        <p className="text-sm text-muted-foreground">
          This survey is approved.{' '}
          <Link to={`/leads/${lead.id}`} className="font-medium text-primary hover:underline">
            Open the lead to create the quote
          </Link>
        </p>
      )}

      {survey.status === 'REJECTED' && (
        <p className="text-sm text-destructive">Rejected: {survey.rejectReason}</p>
      )}
    </div>
  )
}