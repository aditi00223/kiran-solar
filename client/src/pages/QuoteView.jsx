import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
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
import { mockLeads } from '@/lib/mockLeads'
import { GST_RATE, getQuote, packageLabel, rupees } from '@/lib/mockPackages'

function Detail({ label, children }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{children}</p>
    </div>
  )
}

export default function QuoteView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quote, setQuote] = useState(null)
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TEMPORARY: replace with api.get(`/quotes/${id}`)
    const timer = setTimeout(() => {
      const found = getQuote(id)
      setQuote(found)
      setLead(found ? mockLeads.find((l) => l.id === found.leadId) ?? null : null)
      setLoading(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [id])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!quote || !lead) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">We could not find this quote.</p>
        <Button variant="outline" onClick={() => navigate('/leads')}>Back to leads</Button>
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
          <CardTitle className="text-xl">Quote {quote.number}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Customer">{lead.name}</Detail>
          <Detail label="Phone">{lead.phone}</Detail>
          <Detail label="Address">{lead.address}</Detail>
          <Detail label="Package">{packageLabel(quote.type, quote.kw)}</Detail>
          <Detail label="Date">{quote.createdAt}</Detail>
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
              {quote.items.map((item, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.qty} {item.unit}</TableCell>
                  <TableCell className="text-right">{rupees(item.price)}</TableCell>
                  <TableCell className="text-right">{rupees(item.qty * item.price)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="ml-auto mt-4 max-w-xs space-y-1 border-t pt-4 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{rupees(quote.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">GST ({GST_RATE}%)</span><span>{rupees(quote.gst)}</span></div>
            <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{rupees(quote.total)}</span></div>
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