import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SubsidyBadge } from '@/pages/Subsidy'
import { mockLeads } from '@/lib/mockLeads'
import { mockOrders } from '@/lib/mockOrders'
import { rupees } from '@/lib/mockPackages'
import { todayISO } from '@/lib/mockJobs'
import {
  STAGES,
  addDocument,
  advanceSubsidy,
  getSubsidy,
  nextStage,
  removeDocument,
  setAmount,
} from '@/lib/mockSubsidy'

function Detail({ label, children }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children}</p>
    </div>
  )
}

export default function SubsidyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [subsidy, setSubsidy] = useState(null)
  const [lead, setLead] = useState(null)
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [, setVersion] = useState(0)

  const [amountInput, setAmountInput] = useState('')
  const [docName, setDocName] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [receivedOn, setReceivedOn] = useState(todayISO())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // TEMPORARY: replace with api.get(`/subsidies/${id}`)
    const timer = setTimeout(() => {
      const found = getSubsidy(id)
      setSubsidy(found)
      setLead(found ? mockLeads.find((l) => l.id === found.leadId) ?? null : null)
      setOrder(found ? mockOrders.find((o) => o.id === found.orderId) ?? null : null)
      if (found && found.amount > 0) setAmountInput(String(found.amount))
      setLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [id])

  // Runs one action with a short fake delay, then shows the result or the error
  async function run(action, successMessage) {
    setError('')
    setBusy(true)
    try {
      // TEMPORARY: replace with an api call
      await new Promise((r) => setTimeout(r, 400))
      action()
      if (successMessage) toast.success(successMessage)
      setVersion((v) => v + 1)
      return true
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveAmount(e) {
    e.preventDefault()
    await run(() => setAmount(subsidy.id, amountInput), 'Subsidy amount saved')
  }

  async function handleAddDocument(e) {
    e.preventDefault()
    const ok = await run(() => addDocument(subsidy.id, { name: docName, url: docUrl }), 'Document link added')
    if (ok) {
      setDocName('')
      setDocUrl('')
    }
  }

  async function handleRemove(docId) {
    await run(() => removeDocument(subsidy.id, docId), 'Document link removed')
  }

  async function handleAdvance() {
    const next = nextStage(subsidy.status)
    await run(() => advanceSubsidy(subsidy.id, { receivedOn }), `Subsidy marked as ${next.label.toLowerCase()}`)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!subsidy || !lead) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">We could not find this subsidy record.</p>
        <Button variant="outline" onClick={() => navigate('/subsidy')}>Back to subsidy list</Button>
      </div>
    )
  }

  const next = nextStage(subsidy.status)
  const currentIndex = STAGES.findIndex((s) => s.value === subsidy.status)
  const received = subsidy.status === 'RECEIVED'

  return (
    <div className="space-y-6">
      <Link to="/subsidy" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to subsidy list
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">{lead.name}</CardTitle>
          <SubsidyBadge status={subsidy.status} />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Phone">{lead.phone}</Detail>
            <Detail label="Address">{lead.address}</Detail>
            {order && (
              <div>
                <p className="text-xs text-muted-foreground">Order</p>
                <Link to={`/orders/${order.id}`} className="text-sm font-medium text-primary hover:underline">
                  {order.number}
                </Link>
              </div>
            )}
            <Detail label="Applied on">{subsidy.appliedOn}</Detail>
            <Detail label="Subsidy amount">{subsidy.amount > 0 ? rupees(subsidy.amount) : 'Not set'}</Detail>
            {received && <Detail label="Received on">{subsidy.receivedOn}</Detail>}
          </div>

          <ol className="grid gap-2 sm:grid-cols-4">
            {STAGES.map((s, i) => (
              <li
                key={s.value}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  i < currentIndex
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : i === currentIndex
                      ? 'border-primary bg-primary/10 font-semibold'
                      : 'text-muted-foreground'
                }`}
              >
                {i + 1}. {s.label}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Subsidy amount</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveAmount} className="flex max-w-md items-end gap-3" noValidate>
            <div className="flex-1 space-y-2">
              <Label htmlFor="amount">Amount (Rs)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                value={amountInput}
                disabled={received}
                onChange={(e) => setAmountInput(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={busy || received}>Save amount</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documents ({subsidy.documents.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {subsidy.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No document links yet. Add the customer's papers below.</p>
          ) : (
            <ul className="divide-y rounded-lg border text-sm">
              {subsidy.documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-4 px-4 py-2">
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                  >
                    {d.name} <ExternalLink className="h-3 w-3" />
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${d.name}`}
                    disabled={busy || received}
                    onClick={() => handleRemove(d.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {!received && (
            <form onSubmit={handleAddDocument} className="grid max-w-2xl gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end" noValidate>
              <div className="space-y-2">
                <Label htmlFor="docName">Document name</Label>
                <Input id="docName" value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Electricity bill" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="docUrl">Link</Label>
                <Input id="docUrl" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://drive.google.com/..." />
              </div>
              <Button type="submit" variant="outline" disabled={busy}>Add link</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Next step</CardTitle>
        </CardHeader>
        <CardContent className="max-w-md space-y-4">
          {next ? (
            <>
              {next.value === 'RECEIVED' && (
                <div className="space-y-2">
                  <Label htmlFor="receivedOn">Date the subsidy was received</Label>
                  <Input
                    id="receivedOn"
                    type="date"
                    max={todayISO()}
                    value={receivedOn}
                    onChange={(e) => setReceivedOn(e.target.value)}
                  />
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button disabled={busy} onClick={handleAdvance}>
                {busy ? 'Saving...' : `Mark as ${next.label.toLowerCase()}`}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              The subsidy of {rupees(subsidy.amount)} was received on {subsidy.receivedOn}. Nothing more to do.
            </p>
          )}
          {!next && error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}