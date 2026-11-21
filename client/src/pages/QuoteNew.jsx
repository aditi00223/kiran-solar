import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mockLeads } from '@/lib/mockLeads'
import {
  GST_RATE,
  KW_SIZES,
  PACKAGE_TYPES,
  buildParts,
  calcTotals,
  createQuote,
  packageLabel,
  rupees,
} from '@/lib/mockPackages'

const selectClass = 'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm'

export default function QuoteNew() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const leadId = Number(params.get('leadId'))

  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('ON_GRID')
  const [kw, setKw] = useState('3')
  const [items, setItems] = useState(() => buildParts('ON_GRID', 3))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // TEMPORARY: replace with api.get(`/leads/${leadId}`)
    const timer = setTimeout(() => {
      const found = mockLeads.find((l) => l.id === leadId) ?? null
      setLead(found)
      if (found && PACKAGE_TYPES[0]) {
        const size = KW_SIZES.includes(found.systemSize) ? String(found.systemSize) : '3'
        setKw(size)
        setItems(buildParts('ON_GRID', size))
      }
      setLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [leadId])

  const sized = PACKAGE_TYPES.find((p) => p.value === type)?.sized
  const totals = useMemo(() => calcTotals(items), [items])

  function changePackage(nextType, nextKw) {
    setType(nextType)
    setKw(nextKw)
    setItems(buildParts(nextType, nextKw))
    setError('')
  }

  function updateItem(index, field, value) {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index))
  }

  function addItem() {
    setItems([...items, { name: '', qty: 1, unit: 'pcs', price: 0 }])
  }

  async function handleSave() {
    setError('')
    if (items.some((i) => !i.name.trim())) {
      setError('Every item needs a name')
      return
    }
    setSaving(true)
    try {
      // TEMPORARY: replace with api.post('/quotes', ...)
      await new Promise((r) => setTimeout(r, 500))
      const quote = createQuote({ leadId, type, kw, items, notes })
      toast.success(`Quote ${quote.number} created`)
      navigate(`/quotes/${quote.id}`)
    } catch (err) {
      setError(err.message || 'Could not create the quote. Please try again.')
      toast.error(err.message || 'Could not create the quote')
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

  if (!lead) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Open a lead first and use its Create quote button, so we know who the quote is for.
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Package</CardTitle>
        </CardHeader>
        <CardContent className="grid max-w-2xl gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="type">Package type</Label>
            <select id="type" className={selectClass} value={type} onChange={(e) => changePackage(e.target.value, kw)}>
              {PACKAGE_TYPES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          {sized && (
            <div className="space-y-2">
              <Label htmlFor="kw">System size</Label>
              <select id="kw" className={selectClass} value={kw} onChange={(e) => changePackage(type, e.target.value)}>
                {KW_SIZES.map((s) => (
                  <option key={s} value={s}>{s} kW</option>
                ))}
              </select>
            </div>
          )}
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Customer: <span className="font-medium text-foreground">{lead.name}</span>, {lead.city}. They asked for {lead.systemSize} kW.
            Changing the package rebuilds the parts list below.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Parts list: {packageLabel(type, kw)}</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-1 h-4 w-4" /> Add item
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden grid-cols-[1fr_80px_130px_110px_40px] gap-3 text-xs text-muted-foreground md:grid">
            <span>Item</span>
            <span>Qty</span>
            <span>Price each (Rs)</span>
            <span className="text-right">Amount</span>
            <span />
          </div>
          {items.map((item, index) => (
            <div key={index} className="grid items-center gap-3 md:grid-cols-[1fr_80px_130px_110px_40px]">
              <Input value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)} placeholder="Item name" />
              <Input type="number" min="1" value={item.qty} onChange={(e) => updateItem(index, 'qty', e.target.value)} />
              <Input type="number" min="0" value={item.price} onChange={(e) => updateItem(index, 'price', e.target.value)} />
              <p className="text-sm font-medium md:text-right">{rupees(Number(item.qty || 0) * Number(item.price || 0))}</p>
              <Button variant="ghost" size="icon" onClick={() => removeItem(index)} aria-label="Remove item">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-muted-foreground">No items. Click Add item.</p>}

          <div className="ml-auto max-w-xs space-y-1 border-t pt-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{rupees(totals.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">GST ({GST_RATE}%)</span><span>{rupees(totals.gst)}</span></div>
            <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{rupees(totals.total)}</span></div>
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
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Creating...' : 'Create quote'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}