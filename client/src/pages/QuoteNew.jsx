import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const selectClass = 'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm'

const TYPES = [
  { value: 'ON_GRID', label: 'On-Grid' },
  { value: 'OFF_GRID', label: 'Off-Grid' },
  { value: 'PANEL_SET', label: 'Panel set' },
  { value: 'INSTALLATION', label: 'Installation service' },
]

const rupees = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-IN')

export default function QuoteNew() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const leadId = params.get('leadId')

  const [lead, setLead] = useState(null)
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [type, setType] = useState('ON_GRID')
  const [packageId, setPackageId] = useState('')
  const [items, setItems] = useState([])
  const [original, setOriginal] = useState([])
  const [partsLoading, setPartsLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!leadId) {
        setLoading(false)
        return
      }
      try {
        const [l, p] = await Promise.all([api.get(`/leads/${leadId}`), api.get('/packages')])
        if (cancelled) return
        setLead(l.data.data)
        setPackages(p.data.data)
      } catch (err) {
        if (cancelled) return
        if (err.response?.status === 401) {
          localStorage.clear()
          navigate('/login')
          return
        }
        setLoadError(err.response?.data?.error || 'Could not load the quote builder. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [leadId, navigate])

  const options = useMemo(() => packages.filter((p) => p.type === type), [packages, type])

  // Pick a sensible default package when the type or list changes
  useEffect(() => {
    if (options.length === 0) {
      setPackageId('')
      return
    }
    const wanted = lead?.systemSizeKw
    const match = options.find((p) => p.capacityKw === wanted) ?? options[0]
    setPackageId(String(match.id))
  }, [options, lead])

  // Load the parts list for the chosen package
  useEffect(() => {
    if (!packageId) {
      setItems([])
      setOriginal([])
      return
    }
    let cancelled = false
    setPartsLoading(true)
    api
      .get(`/packages/${packageId}`)
      .then((res) => {
        if (cancelled) return
        const parts = res.data.data.items.map((i) => ({
          productId: i.productId,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        }))
        setItems(parts)
        setOriginal(parts)
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.response?.data?.error || 'Could not load the parts list')
      })
      .finally(() => {
        if (!cancelled) setPartsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [packageId])

  const total = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0)

  function updateItem(index, field, value) {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const canQuote = lead && (lead.status === 'SURVEY_APPROVED' || lead.status === 'QUOTED')

  async function handleSave() {
    setError('')
    if (items.some((i) => !(Number(i.quantity) >= 1) || Number(i.unitPrice) < 0)) {
      setError('Quantity must be at least 1 and prices cannot be negative')
      return
    }
    setSaving(true)
    try {
      const res = await api.post('/quotes', {
        leadId: Number(leadId),
        templateId: Number(packageId),
        notes: notes.trim() || undefined,
      })
      let quote = res.data.data

      // Save any price or quantity changes
      const edits = items
        .map((item, i) => ({ item, was: original[i] }))
        .filter(({ item, was }) => Number(item.quantity) !== was.quantity || Number(item.unitPrice) !== was.unitPrice)
        .map(({ item }) => {
          const line = quote.lines.find((l) => l.productId === item.productId)
          return line
            ? { id: line.id, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) }
            : null
        })
        .filter(Boolean)

      if (edits.length > 0) {
        const patched = await api.patch(`/quotes/${quote.id}`, { lines: edits })
        quote = patched.data.data
      }

      toast.success('Quote created')
      navigate(`/quotes/${quote.id}`)
    } catch (err) {
      const message = err.response?.data?.error || 'Could not create the quote. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (loadError || !lead) {
    return (
      <div className="space-y-4">
        <p className={loadError ? 'text-destructive' : 'text-muted-foreground'}>
          {loadError || 'Open a lead first and use its Create quote button, so we know who the quote is for.'}
        </p>
        <Button variant="outline" onClick={() => navigate('/leads')}>Go to leads</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link to={`/leads/${lead.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to {lead.name}
      </Link>

      {!canQuote && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Survey not approved yet. A quote can only be created after the roof survey is approved.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Package</CardTitle>
        </CardHeader>
        <CardContent className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="type">Package type</Label>
            <select id="type" className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="package">Package</Label>
            <select id="package" className={selectClass} value={packageId} onChange={(e) => setPackageId(e.target.value)}>
              {options.length === 0 && <option value="">No packages</option>}
              {options.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Customer: <span className="font-medium text-foreground">{lead.name}</span>, {lead.city}.
            {lead.systemSizeKw ? ` They asked for ${lead.systemSizeKw} kW.` : ''} Changing the package loads its parts list below.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Parts list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden grid-cols-[1fr_80px_130px_110px] gap-3 text-xs text-muted-foreground md:grid">
            <span>Item</span>
            <span>Qty</span>
            <span>Price each (Rs)</span>
            <span className="text-right">Amount</span>
          </div>
          {partsLoading && <Skeleton className="h-24 w-full" />}
          {!partsLoading &&
            items.map((item, index) => (
              <div key={item.productId} className="grid items-center gap-3 md:grid-cols-[1fr_80px_130px_110px]">
                <p className="text-sm font-medium">{item.name}</p>
                <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                <Input type="number" min="0" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', e.target.value)} />
                <p className="text-sm font-medium md:text-right">
                  {rupees(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
                </p>
              </div>
            ))}
          {!partsLoading && items.length === 0 && (
            <p className="text-sm text-muted-foreground">Choose a package to see its parts.</p>
          )}

          <div className="ml-auto max-w-xs border-t pt-4 text-base font-semibold">
            <div className="flex justify-between"><span>Total</span><span>{rupees(total)}</span></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes for the customer (optional)</Label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSave} disabled={saving || !canQuote || !packageId || partsLoading}>
            {saving ? 'Creating...' : 'Create quote'}
          </Button>
          {!canQuote && (
            <p className="text-xs text-muted-foreground">The button unlocks when the lead is Survey approved.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}