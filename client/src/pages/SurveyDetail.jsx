import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import FormField from '@/components/FormField'
import SurveyBadge from '@/components/SurveyBadge'

function Detail({ label, children }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children || '-'}</p>
    </div>
  )
}

function getRole() {
  try {
    return JSON.parse(localStorage.getItem('user'))?.role
  } catch {
    return null
  }
}

export default function SurveyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const role = getRole()
  const [survey, setSurvey] = useState(null)
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [busy, setBusy] = useState(false)

  // Review (Sales / Director)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')

  // Record (Technician)
  const [rec, setRec] = useState({ roofDirection: '', tiltAngle: '', cableDistance: '', notes: '' })
  const [recErrors, setRecErrors] = useState({})

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await api.get(`/surveys/${id}`)
        if (cancelled) return
        const s = res.data.data
        setSurvey(s)
        // Sales and Director can read the lead; technicians cannot, so ignore failures
        try {
          const l = await api.get(`/leads/${s.lead?.id ?? s.leadId}`)
          if (!cancelled) setLead(l.data.data)
        } catch {
          if (!cancelled) setLead(null)
        }
      } catch (err) {
        if (cancelled) return
        if (err.response?.status === 401) {
          localStorage.clear()
          navigate('/login')
          return
        }
        setLoadError(err.response?.data?.error || 'Could not load this survey. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  function setR(field) {
    return (e) => setRec({ ...rec, [field]: e.target.value })
  }

  async function submitRecord(e) {
    e.preventDefault()
    const next = {}
    if (!rec.roofDirection.trim()) next.roofDirection = 'Enter the roof direction, for example South-West'
    if (!rec.tiltAngle || Number(rec.tiltAngle) < 0) next.tiltAngle = 'Enter the tilt angle in degrees'
    if (!rec.cableDistance || Number(rec.cableDistance) <= 0) next.cableDistance = 'Enter the cable distance in metres'
    setRecErrors(next)
    if (Object.keys(next).length > 0) return

    setBusy(true)
    try {
      const res = await api.patch(`/surveys/${id}/record`, {
        roofDirection: rec.roofDirection.trim(),
        tiltAngle: Number(rec.tiltAngle),
        cableDistance: Number(rec.cableDistance),
        notes: rec.notes.trim() || undefined,
      })
      setSurvey(res.data.data)
      toast.success('Survey results submitted. Waiting for approval.')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not save the survey. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function decide(decision) {
    if (decision === 'REJECTED' && !reason.trim()) {
      setReasonError('Write a short reason for rejecting this survey')
      return
    }
    setReasonError('')
    setBusy(true)
    try {
      const res = await api.patch(`/surveys/${id}/review`, {
        decision,
        reviewNote: reason.trim() || undefined,
      })
      setSurvey(res.data.data)
      toast.success(decision === 'APPROVED' ? 'Survey approved. A quote can now be created.' : 'Survey rejected')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update the survey. Please try again.')
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

  if (loadError || !survey) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{loadError || 'We could not find this survey.'}</p>
        <Button variant="outline" onClick={() => navigate('/surveys')}>Back to surveys</Button>
      </div>
    )
  }

  const leadId = lead?.id ?? survey.lead?.id ?? survey.leadId
  const customerName = lead?.name ?? survey.lead?.name
  const hasResults = survey.roofDirection != null

  return (
    <div className="space-y-6">
      <Link to="/surveys" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to surveys
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">{customerName}</CardTitle>
          <SurveyBadge status={survey.status} />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Phone">{lead?.phone}</Detail>
          <Detail label="Address">{lead?.address}</Detail>
          <Detail label="City">{lead?.city ?? survey.lead?.city}</Detail>
          <Detail label="System size wanted">{lead?.systemSizeKw ? `${lead.systemSizeKw} kW` : ''}</Detail>
          <Detail label="Technician">{survey.technician?.name}</Detail>
          <Detail label="Survey date">{String(survey.scheduledAt).slice(0, 10)}</Detail>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Survey results</CardTitle>
        </CardHeader>
        <CardContent>
          {hasResults ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Detail label="Roof direction">{survey.roofDirection}</Detail>
              <Detail label="Roof tilt">{survey.tiltAngle} degrees</Detail>
              <Detail label="Cable distance">{survey.cableDistance} m</Detail>
              <div className="sm:col-span-2 lg:col-span-3">
                <Detail label="Technician notes">{survey.notes}</Detail>
              </div>
            </div>
          ) : role === 'TECHNICIAN' && survey.status === 'SCHEDULED' ? (
            <form onSubmit={submitRecord} className="max-w-md space-y-4" noValidate>
              <FormField label="Roof direction" name="roofDirection" value={rec.roofDirection} onChange={setR('roofDirection')} error={recErrors.roofDirection} placeholder="South-West" />
              <FormField label="Roof tilt (degrees)" name="tiltAngle" type="number" value={rec.tiltAngle} onChange={setR('tiltAngle')} error={recErrors.tiltAngle} />
              <FormField label="Cable distance (metres)" name="cableDistance" type="number" value={rec.cableDistance} onChange={setR('cableDistance')} error={recErrors.cableDistance} />
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <textarea
                  id="notes"
                  value={rec.notes}
                  onChange={setR('notes')}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>
              <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Submit survey results'}</Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">
              No results yet. The technician will submit them after visiting on {String(survey.scheduledAt).slice(0, 10)}.
            </p>
          )}
        </CardContent>
      </Card>

      {survey.status === 'COMPLETED' && (role === 'SALES' || role === 'DIRECTOR') && (
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
          {role === 'SALES' && (
            <Link to={`/leads/${leadId}`} className="font-medium text-primary hover:underline">
              Open the lead to create the quote
            </Link>
          )}
        </p>
      )}

      {survey.status === 'REJECTED' && (
        <p className="text-sm text-destructive">Rejected: {survey.reviewNote}</p>
      )}
    </div>
  )
}