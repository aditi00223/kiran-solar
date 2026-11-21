import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import QuotePdf from '@/components/QuotePdf'

const rupees = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-IN')

function Detail({ label, children }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children || '-'}</p>
    </div>
  )
}

// Convert the API quote into the shape QuotePdf already understands
function toPdfQuote(q) {
  return {
    id: q.id,
    number: `Q-${q.id}`,
    type: q.template?.name ?? '',
    kw: '',
    items: q.lines.map((l) => ({
      name: l.description,
      qty: l.quantity,
      unit: 'pcs',
      price: l.unitPrice,
    })),
    subtotal: q.totalAmount,
    gst: 0,
    total: q.totalAmount,
    notes: q.notes,
    createdAt: String(q.createdAt).slice(0, 10),
  }
}

export default function QuoteView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quote, setQuote] = useState(null)
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [busy, setBusy] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const res = await api.get(`/quotes/${id}`)
        if (cancelled) return
        setQuote(res.data.data)
        setLead(res.data.data.lead)
      } catch (err) {
        if (cancelled) return
        if (err.response?.status === 401) {
          localStorage.clear()
          navigate('/login')
          return
        }
        setLoadError(err.response?.data?.error || 'Could not load this quote. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id, navigate])

  async function makeBlob() {
    return pdf(<QuotePdf quote={toPdfQuote(quote)} lead={lead} />).toBlob()
  }

  async function handleDownload() {
    setBusy('download')
    try {
      const blob = await makeBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Q-${quote.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Quote PDF downloaded')
    } catch {
      toast.error('Could not create the PDF. Please try again.')
    } finally {
      setBusy('')
    }
  }

  async function handlePrint() {
    setBusy('print')
    try {
      const blob = await makeBlob()
      const url = URL.createObjectURL(blob)
      const win = window.open(url)
      if (!win) {
        toast.error('The browser blocked the print window. Allow pop-ups for this site and try again.')
        return
      }
      win.addEventListener('load', () => win.print())
    } catch {
      toast.error('Could not open the PDF for printing. Please try again.')
    } finally {
      setBusy('')
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

  if (loadError || !quote) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{loadError || 'We could not find this quote.'}</p>
        <Button variant="outline" onClick={() => navigate('/leads')}>Back to leads</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link to={`/leads/${lead?.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to {lead?.name}
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Quote Q-{quote.id}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} disabled={busy !== ''}>
              <Printer className="mr-2 h-4 w-4" />
              {busy === 'print' ? 'Preparing...' : 'Print'}
            </Button>
            <Button onClick={handleDownload} disabled={busy !== ''}>
              <Download className="mr-2 h-4 w-4" />
              {busy === 'download' ? 'Preparing...' : 'Download PDF'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Customer">{lead?.name}</Detail>
          <Detail label="Phone">{lead?.phone}</Detail>
          <Detail label="City">{lead?.city}</Detail>
          <Detail label="Package">{quote.template?.name}</Detail>
          <Detail label="Status">{quote.status}</Detail>
          <Detail label="Date">{String(quote.createdAt).slice(0, 10)}</Detail>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Parts list</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price each</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote.lines.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.description}</TableCell>
                  <TableCell className="text-right">{l.quantity}</TableCell>
                  <TableCell className="text-right">{rupees(l.unitPrice)}</TableCell>
                  <TableCell className="text-right">{rupees(l.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="ml-auto mt-4 max-w-xs border-t pt-4 text-base font-semibold">
            <div className="flex justify-between"><span>Total</span><span>{rupees(quote.totalAmount)}</span></div>
          </div>
        </CardContent>
      </Card>

      {quote.notes && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Notes: </span>{quote.notes}
        </p>
      )}
    </div>
  )
}