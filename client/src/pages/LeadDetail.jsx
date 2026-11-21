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
import StatusBadge from '@/components/StatusBadge'

const SOURCE_LABEL = { WEB: 'Website', CALL: 'Phone call', WHATSAPP: 'WhatsApp' }

function Detail({ label, children }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children || '-'}</p>
    </div>
  )
}

function fillForm(lead) {
  return {
    shadowFreeArea: lead.shadowFreeArea != null ? String(lead.shadowFreeArea) : '',
    monthlyBill: lead.monthlyBill != null ? String(lead.monthlyBill) : '',
    gridSuitable: lead.gridSuitable == null ? '' : lead.gridSuitable ? 'yes' : 'no',
  }
}

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [form, setForm] = useState({ shadowFreeArea: '', monthlyBill: '', gridSuitable: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await api.get(`/leads/${id}`)
        if (cancelled) return
        setLead(res.data.data)
        setForm(fillForm(res.data.data))
      } catch (err) {
        if (cancelled) return
        if (err.response?.status === 401) {
          localStorage.clear()
          navigate('/login')
          return
        }
        setLoadError(err.response?.data?.error || 'Could not load this lead. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value })
  }

  function validate() {
    const next = {}
    if (!form.shadowFreeArea || Number(form.shadowFreeArea) <= 0) next.shadowFreeArea = 'Enter the shadow-free roof area'
    if (!form.monthlyBill || Number(form.monthlyBill) <= 0) next.monthlyBill = 'Enter the monthly bill in rupees'
    if (!form.gridSuitable) next.gridSuitable = 'Choose yes or no'
    return next
  }

  async function handleSave(e) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      const res = await api.patch(`/leads/${id}/call-check`, {
        shadowFreeArea: Number(form.shadowFreeArea),
        monthlyBill: Number(form.monthlyBill),
        gridSuitable: form.gridSuitable === 'yes',
      })
      setLead(res.data.data)
      toast.success('Call check saved')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not save the call check. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (loadError || !lead) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{loadError || 'We could not find this lead.'}</p>
        <Button variant="outline" onClick={() => navigate('/leads')}>Back to leads</Button>
      </div>
    )
  }

  const canQuote = lead.status === 'SURVEY_APPROVED' || lead.status === 'QUOTED'

  return (
    <div className="space-y-6">
      <Link to="/leads" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">{lead.name}</CardTitle>
          <StatusBadge status={lead.status} />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Phone">{lead.phone}</Detail>
          <Detail label="Email">{lead.email}</Detail>
          <Detail label="City">{lead.city}</Detail>
          <Detail label="Address">{lead.address}</Detail>
          <Detail label="System size wanted">{lead.systemSizeKw ? `${lead.systemSizeKw} kW` : ''}</Detail>
          <Detail label="Source">{SOURCE_LABEL[lead.source] ?? lead.source}</Detail>
          <Detail label="Assigned to">{lead.assignedTo?.name}</Detail>
          <Detail label="Received">{String(lead.createdAt).slice(0, 10)}</Detail>
          <Detail label="Message">{lead.message}</Detail>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        {canQuote ? (
          <Button onClick={() => navigate(`/quotes/new?leadId=${lead.id}`)}>Create quote</Button>
        ) : (
          <>
            <Button disabled>Create quote</Button>
            <p className="text-sm text-muted-foreground">
              Survey not approved yet. The quote unlocks once the roof survey is approved.
            </p>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Call check</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="max-w-md space-y-4" noValidate>
            <FormField
              label="Shadow-free roof area (sq ft)"
              name="shadowFreeArea"
              type="number"
              value={form.shadowFreeArea}
              onChange={set('shadowFreeArea')}
              error={errors.shadowFreeArea}
              hint="Area of the roof that gets no shade during the day"
            />
            <FormField
              label="Monthly electricity bill (Rs)"
              name="monthlyBill"
              type="number"
              value={form.monthlyBill}
              onChange={set('monthlyBill')}
              error={errors.monthlyBill}
            />
            <div className="space-y-2">
              <Label htmlFor="gridSuitable">Is the grid suitable?</Label>
              <select
                id="gridSuitable"
                value={form.gridSuitable}
                onChange={set('gridSuitable')}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
              {errors.gridSuitable && <p className="text-sm text-destructive">{errors.gridSuitable}</p>}
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save call check'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}