import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import FormField from '@/components/FormField'
import StatusBadge from '@/components/StatusBadge'
import { mockLeads } from '@/lib/mockLeads'

const SOURCE_LABEL = { WEB: 'Website', CALL: 'Phone call', WHATSAPP: 'WhatsApp' }

function Detail({ label, children }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children}</p>
    </div>
  )
}

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ shadowFreeArea: '', monthlyBill: '', gridSuitable: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // TEMPORARY: replace with api.get(`/leads/${id}`)
    const timer = setTimeout(() => {
      const found = mockLeads.find((l) => String(l.id) === id) ?? null
      setLead(found)
      if (found?.callCheck) {
        setForm({
          shadowFreeArea: String(found.callCheck.shadowFreeArea),
          monthlyBill: String(found.callCheck.monthlyBill),
          gridSuitable: found.callCheck.gridSuitable ? 'yes' : 'no',
        })
      }
      setLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [id])

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value })
  }

  function validate() {
    const next = {}
    if (!form.shadowFreeArea || Number(form.shadowFreeArea) <= 0) next.shadowFreeArea = 'Enter the shadow-free area in square metres'
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
      // TEMPORARY: replace with api.put(`/leads/${id}/call-check`, ...)
      await new Promise((r) => setTimeout(r, 500))
      toast.success('Call check saved')
    } catch {
      toast.error('Could not save the call check. Please try again.')
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

  if (!lead) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">We could not find this lead.</p>
        <Button variant="outline" onClick={() => navigate('/leads')}>Back to leads</Button>
      </div>
    )
  }

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
          <Detail label="City">{lead.city}</Detail>
          <Detail label="Address">{lead.address}</Detail>
          <Detail label="System size wanted">{lead.systemSize} kW</Detail>
          <Detail label="Source">{SOURCE_LABEL[lead.source]}</Detail>
          <Detail label="Received">{lead.createdAt}</Detail>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Call check</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="max-w-md space-y-4" noValidate>
            <FormField
              label="Shadow-free roof area (sq m)"
              name="shadowFreeArea"
              type="number"
              value={form.shadowFreeArea}
              onChange={set('shadowFreeArea')}
              error={errors.shadowFreeArea}
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