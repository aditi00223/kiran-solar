import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { STAGES, SubsidyBadge, stageLabel } from '@/pages/Subsidy'

const rupees = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-IN')

function Detail({ label, children }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children || '-'}</p>
    </div>
  )
}

function hostOf(url) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export default function SubsidyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [subsidy, setSubsidy] = useState(null)
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [amountInput, setAmountInput] = useState('')
  const [docUrl, setDocUrl] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await api.get('/subsidies', { params: { limit: 50 } })
        if (cancelled) return
        const found = res.data.data.find((s) => String(s.id) === id)
        if (!found) {
          setLoadError('We could not find this subsidy record.')
          return
        }
        setSubsidy(found)
        if (Number(found.amount) > 0) setAmountInput(String(found.amount))
        const leadId = found.order?.lead?.id
        if (leadId) {
          try {
            const l = await api.get(`/leads/${leadId}`)
            if (!cancelled) setLead(l.data.data)
          } catch {
            if (!cancelled) setLead(found.order.lead)
          }
        }
      } catch (err) {
        if (cancelled) return
        if (err.response?.status === 401) {
          localStorage.clear()
          navigate('/login')
          return
        }
        setLoadError(err.response?.data?.error || 'Could not load this record. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  async function update(body, successMessage) {
    setError('')
    setBusy(true)
    try {
      const res = await api.patch(`/subsidies/${id}`, body)
      setSubsidy((prev) => ({ ...prev, ...res.data.data, order: res.data.data.order ?? prev.order }))
      if (successMessage) toast.success(successMessage)
      return true
    } catch (err) {
      const message = err.response?.data?.error || 'Something went wrong. Please try again.'
      setError(message)
      toast.error(message)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveAmount(e) {
    e.preventDefault()
    const value = Number(amountInput)
    if (!value || value <= 0) {
      setError('Enter the subsidy amount')
      return
    }
    await update({ amount: value }, 'Subsidy amount saved')
  }

  async function handleAddDocument(e) {
    e.preventDefault()
    const url = docUrl.trim()
    if (!/^https?:\/\//i.test(url)) {
      setError('The link must start with http:// or https://')
      return
    }
    const ok = await update({ documentLinks: [url] }, 'Document link added')
    if (ok) setDocUrl('')
  }

  async function handleAdvance() {
    const index = STAGES.findIndex((s) => s.value === subsidy.stage)
    const next = STAGES[index + 1]
    if (!next) return
    await update({ stage: next.value }, `Subsidy marked as ${next.label.toLowerCase()}`)
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

  if (loadError || !subsidy) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{loadError || 'We could not find this subsidy record.'}</p>
        <Button variant="outline" onClick={() => navigate('/subsidy')}>Back to subsidy list</Button>
      </div>
    )
  }

  const currentIndex = STAGES.findIndex((s) => s.value === subsidy.stage)
  const next = STAGES[currentIndex + 1]
  const received = subsidy.stage === 'RECEIVED'
  const links = subsidy.documentLinks ?? []
  const canEdit = localStorage.getItem('user') && JSON.parse(localStorage.getItem('user')).role === 'SALES'
  const dates = {
    APPLIED: subsidy.appliedOn,
    DOCUMENTS_SUBMITTED: subsidy.submittedOn,
    APPROVED: subsidy.approvedOn,
    RECEIVED: subsidy.receivedOn,
  }

  return (
    <div className="space-y-6">
      <Link to="/subsidy" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to subsidy list
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">{lead?.name ?? subsidy.order?.lead?.name}</CardTitle>
          <SubsidyBadge status={subsidy.stage} />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Phone">{lead?.phone}</Detail>
            <Detail label="Address">{lead?.address}</Detail>
            <Detail label="City">{lead?.city ?? subsidy.order?.lead?.city}</Detail>
            <div>
              <p className="text-xs text-muted-foreground">Order</p>
              <Link to={`/orders/${subsidy.order?.id}`} className="text-sm font-medium text-primary hover:underline">
                O-{subsidy.order?.id}
              </Link>
            </div>
            <Detail label="Subsidy amount">{Number(subsidy.amount) > 0 ? rupees(subsidy.amount) : 'Not set'}</Detail>
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
                <p>{i + 1}. {s.label}</p>
                {dates[s.value] && <p className="text-xs font-normal">{dates[s.value]}</p>}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {canEdit && (
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
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documents ({links.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground">No document links yet. Add the customer's papers below.</p>
          ) : (
            <ul className="divide-y rounded-lg border text-sm">
              {links.map((url) => (
                <li key={url} className="px-4 py-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                  >
                    {hostOf(url)} <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="truncate text-xs text-muted-foreground">{url}</p>
                </li>
              ))}
            </ul>
          )}

          {canEdit && !received && (
            <form onSubmit={handleAddDocument} className="grid max-w-2xl gap-3 sm:grid-cols-[1fr_auto] sm:items-end" noValidate>
              <div className="space-y-2">
                <Label htmlFor="docUrl">Document link</Label>
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
            canEdit ? (
              <Button disabled={busy} onClick={handleAdvance}>
                {busy ? 'Saving...' : `Mark as ${next.label.toLowerCase()}`}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Next stage: {stageLabel(next.value)}. Only Sales can move it forward.</p>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              The subsidy of {rupees(subsidy.amount)} was received on {subsidy.receivedOn}. Nothing more to do.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}