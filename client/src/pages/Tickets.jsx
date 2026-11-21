import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const rupees = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-IN')
const day = (v) => (v ? String(v).slice(0, 10) : '-')

const STATUS_LABEL = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  FIXED_PENDING_CONFIRMATION: 'Fixed, awaiting customer',
  CLOSED: 'Closed',
}
const STATUS_STYLE = {
  OPEN: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  FIXED_PENDING_CONFIRMATION: 'bg-purple-100 text-purple-700',
  CLOSED: 'bg-green-100 text-green-700',
}

function WarrantyBadge({ status }) {
  return status === 'IN' ? (
    <Badge variant="secondary" className="border-transparent bg-green-100 text-green-700">In warranty</Badge>
  ) : (
    <Badge variant="secondary" className="border-transparent bg-red-100 text-red-700">Out of warranty</Badge>
  )
}

function StatusBadge({ status }) {
  return (
    <Badge variant="secondary" className={`border-transparent ${STATUS_STYLE[status] ?? ''}`}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  )
}

export default function Tickets() {
  const navigate = useNavigate()
  const role = (() => {
    try {
      return JSON.parse(localStorage.getItem('user'))?.role
    } catch {
      return null
    }
  })()
  const canEdit = role === 'SUPPORT'

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searchError, setSearchError] = useState('')
  const [selected, setSelected] = useState(null)
  const [issue, setIssue] = useState('')
  const [formError, setFormError] = useState('')

  const [openId, setOpenId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [partsCost, setPartsCost] = useState('')
  const [labourCost, setLabourCost] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [busy, setBusy] = useState(false)

  function handle401(err) {
    if (err.response?.status === 401) {
      localStorage.clear()
      navigate('/login')
      return true
    }
    return false
  }

  const loadTickets = useCallback(async () => {
    try {
      const res = await api.get('/tickets', { params: { limit: 50 } })
      setTickets(res.data.data)
      setLoadError(null)
    } catch (err) {
      if (handle401(err)) return
      setLoadError(err.response?.data?.error || 'Could not load tickets. Please try again.')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  async function search(e) {
    e.preventDefault()
    setSearchError('')
    setSelected(null)
    const q = query.trim()
    if (q.length < 3) {
      setSearchError('Enter at least 3 characters of a serial or phone number.')
      return
    }
    try {
      const res = await api.get('/serials/search', { params: { q } })
      setResults(res.data.data)
    } catch (err) {
      if (handle401(err)) return
      setResults(null)
      setSearchError(err.response?.data?.error || 'Search failed. Please try again.')
    }
  }

  async function raiseTicket(e) {
    e.preventDefault()
    setFormError('')
    if (issue.trim().length < 5) {
      setFormError('Describe the problem (at least 5 characters).')
      return
    }
    setBusy(true)
    try {
      const res = await api.post('/tickets', { serial: selected.serial, issue: issue.trim() })
      toast.success(`Ticket T-${res.data.data.id} raised`)
      setIssue('')
      setSelected(null)
      setResults(null)
      setQuery('')
      await loadTickets()
    } catch (err) {
      const message = err.response?.data?.error || 'Could not raise the ticket.'
      setFormError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  async function openTicket(id) {
    setOpenId(id)
    setDetail(null)
    setDetailError('')
    setPartsCost('')
    setLabourCost('')
    setNotes('')
    setConfirmed(false)
    try {
      const res = await api.get(`/tickets/${id}`)
      setDetail(res.data.data)
    } catch (err) {
      if (handle401(err)) return
      setDetailError(err.response?.data?.error || 'Could not load this ticket.')
    }
  }

  async function saveRepair(e) {
    e.preventDefault()
    setDetailError('')
    setBusy(true)
    try {
      const res = await api.patch(`/tickets/${openId}/repair`, {
        partsCost: Number(partsCost || 0),
        labourCost: Number(labourCost || 0),
        notes: notes.trim() || undefined,
      })
      setDetail(res.data.data)
      toast.success('Repair recorded')
      await loadTickets()
    } catch (err) {
      const message = err.response?.data?.error || 'Could not save the repair.'
      setDetailError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  async function closeTicket() {
    setDetailError('')
    setBusy(true)
    try {
      const res = await api.patch(`/tickets/${openId}/close`, { customerConfirmed: confirmed })
      setDetail(res.data.data)
      toast.success('Ticket closed')
      await loadTickets()
    } catch (err) {
      const message = err.response?.data?.error || 'Could not close the ticket.'
      setDetailError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Find a customer or unit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={search} className="flex max-w-md gap-3" noValidate>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Serial or phone number" />
              <Button type="submit">Search</Button>
            </form>
            {searchError && <p className="text-sm text-destructive">{searchError}</p>}
            {results && results.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No delivered unit found. Warranty starts only after delivery is confirmed.
              </p>
            )}
            {results && results.length > 0 && (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3">Serial</th>
                      <th className="p-3">Product</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Warranty end</th>
                      <th className="p-3">Warranty</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((u) => (
                      <tr key={u.serial} className="border-b last:border-0">
                        <td className="p-3">{u.serial}</td>
                        <td className="p-3">{u.product?.name}</td>
                        <td className="p-3">{u.customer?.name} ({u.customer?.phone})</td>
                        <td className="p-3">{day(u.warrantyEnd)}</td>
                        <td className="p-3"><WarrantyBadge status={u.warrantyStatus} /></td>
                        <td className="p-3">
                          <Button size="sm" variant="outline" onClick={() => { setSelected(u); setFormError('') }}>
                            Raise ticket
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {canEdit && selected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New ticket for {selected.serial}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={raiseTicket} className="max-w-md space-y-4" noValidate>
              <div className="flex items-center gap-2 text-sm">
                <span>{selected.product?.name}, {selected.customer?.name}</span>
                <WarrantyBadge status={selected.warrantyStatus} />
              </div>
              {selected.warrantyStatus === 'OUT' && (
                <p className="text-sm text-muted-foreground">
                  Out of warranty: when you record the repair, enter the parts or labour cost and an invoice is created automatically.
                </p>
              )}
              <div className="space-y-1">
                <Label htmlFor="issue">Problem</Label>
                <Input id="issue" value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="e.g. Inverter shows error E04" />
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <div className="flex gap-3">
                <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Raise ticket'}</Button>
                <Button type="button" variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tickets ({tickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets yet.</p>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => openTicket(t.id)}
                  className={`w-full rounded-lg border p-3 text-left text-sm hover:bg-muted/40 ${openId === t.id ? 'border-primary' : ''}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">T-{t.id} - {t.customer?.name} - {t.serial}</p>
                    <div className="flex gap-2">
                      <WarrantyBadge status={t.warrantyStatus} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                  <p className="text-muted-foreground">{t.issue}</p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {openId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ticket T-{openId}</CardTitle>
          </CardHeader>
          <CardContent className="max-w-xl space-y-4">
            {!detail && !detailError && <Skeleton className="h-24 w-full" />}
            {detail && (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{detail.customer?.name}</span>
                  <span className="text-muted-foreground">{detail.customer?.phone}</span>
                  <WarrantyBadge status={detail.warrantyStatus} />
                  <StatusBadge status={detail.status} />
                </div>
                <p className="text-sm">{detail.issue}</p>
                <p className="text-xs text-muted-foreground">Serial {detail.serial}, raised {day(detail.createdAt)}</p>

                {detail.resolution && (
                  <p className="text-sm"><span className="font-medium">Repair: </span>{detail.resolution}</p>
                )}
                {detail.invoice && (
                  <div className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">Invoice {detail.invoice.invoiceNumber}</p>
                    <p>
                      Parts {rupees(detail.invoice.partsAmount)} + labour {rupees(detail.invoice.labourAmount)} = {' '}
                      <span className="font-semibold">{rupees(detail.invoice.amount)}</span> ({detail.invoice.status === 'PAID' ? 'Paid' : 'Unpaid'})
                    </p>
                  </div>
                )}
                {detail.status === 'CLOSED' && (
                  <p className="text-sm text-green-700">Closed on {day(detail.closedAt)}. Customer confirmed the fix.</p>
                )}

                {canEdit && (detail.status === 'OPEN' || detail.status === 'IN_PROGRESS') && (
                  <form onSubmit={saveRepair} className="space-y-3" noValidate>
                    <p className="text-sm font-medium">Record the repair</p>
                    {detail.warrantyStatus === 'IN' ? (
                      <p className="text-sm text-muted-foreground">In warranty: no charge to the customer. Costs are optional.</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Out of warranty: enter parts or labour cost (at least one above 0). An invoice is created.</p>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="parts">Parts cost (Rs)</Label>
                        <Input id="parts" type="number" min="0" value={partsCost} onChange={(e) => setPartsCost(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="labour">Labour cost (Rs)</Label>
                        <Input id="labour" type="number" min="0" value={labourCost} onChange={(e) => setLabourCost(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="notes">What was done</Label>
                      <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Replaced charge controller" />
                    </div>
                    <Button type="submit" disabled={busy}>{busy ? 'Saving...' : 'Save repair'}</Button>
                  </form>
                )}

                {canEdit && detail.status === 'FIXED_PENDING_CONFIRMATION' && (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                      The customer confirmed everything works
                    </label>
                    <Button disabled={busy || !confirmed} onClick={closeTicket}>
                      {busy ? 'Closing...' : 'Close ticket'}
                    </Button>
                  </div>
                )}

                {!canEdit && detail.status !== 'CLOSED' && (
                  <p className="text-xs text-muted-foreground">Only the Support role can update tickets.</p>
                )}
              </>
            )}
            {detailError && <p className="text-sm text-destructive">{detailError}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}