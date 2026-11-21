import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mockLeads } from '@/lib/mockLeads'
import { rupees } from '@/lib/mockPackages'
import { getOrder } from '@/lib/mockOrders'
import { deliveries, isInWarranty } from '@/lib/mockWarranty'

// Sample out-of-warranty service charge
const SERVICE_CHARGE = 500
const GST_PERCENT = 18

// Kept outside the component so tickets survive moving between pages
const tickets = []

function findUnits(query) {
  const q = query.trim().toUpperCase()
  const digits = q.replace(/\D/g, '')
  if (!q) return []
  const rows = []
  Object.entries(deliveries).forEach(([orderId, delivery]) => {
    const order = getOrder(orderId)
    const lead = order ? mockLeads.find((l) => l.id === order.leadId) : null
    const phone = (lead?.phone ?? '').replace(/\D/g, '')
    delivery.units.forEach((u) => {
      const bySerial = u.serial.includes(q)
      const byPhone = digits.length >= 4 && phone.includes(digits)
      if (bySerial || byPhone) {
        rows.push({ ...u, orderNumber: order?.number ?? '', customer: lead?.name ?? 'Unknown', phone: lead?.phone ?? '' })
      }
    })
  })
  return rows
}

function WarrantyBadge({ unit }) {
  return isInWarranty(unit) ? (
    <Badge variant="secondary" className="border-transparent bg-green-100 text-green-700">In warranty</Badge>
  ) : (
    <Badge variant="secondary" className="border-transparent bg-red-100 text-red-700">Expired</Badge>
  )
}

export default function Tickets() {
  const [, setTick] = useState(0)
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState('')
  const [selected, setSelected] = useState(null)
  const [issue, setIssue] = useState('')
  const [error, setError] = useState('')

  const results = findUnits(searched)

  function search(e) {
    e.preventDefault()
    setSearched(query)
    setSelected(null)
    setError('')
  }

  function raiseTicket(e) {
    e.preventDefault()
    if (!selected) return setError('Choose a unit first.')
    if (!issue.trim()) return setError('Describe the problem.')

    const inWarranty = isInWarranty(selected)
    const number = `KIR-T-${String(tickets.length + 1).padStart(4, '0')}`
    const ticket = {
      number,
      serial: selected.serial,
      product: selected.product,
      customer: selected.customer,
      issue: issue.trim(),
      inWarranty,
      invoice: null,
    }
    if (!inWarranty) {
      const gst = Math.round((SERVICE_CHARGE * GST_PERCENT) / 100)
      ticket.invoice = {
        number: `KIR-INV-${String(tickets.filter((t) => t.invoice).length + 1).padStart(4, '0')}`,
        charge: SERVICE_CHARGE,
        gst,
        total: SERVICE_CHARGE + gst,
      }
    }
    tickets.unshift(ticket)
    toast.success(
      inWarranty
        ? `Ticket ${number} raised. Covered by warranty.`
        : `Ticket ${number} raised. Invoice ${ticket.invoice.number} created.`
    )
    setIssue('')
    setSelected(null)
    setError('')
    setTick((t) => t + 1)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Find a customer or unit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={search} className="flex max-w-md gap-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Serial or phone, e.g. SP550-0005"
            />
            <Button type="submit">Search</Button>
          </form>

          {searched && results.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No delivered unit found. Warranty starts only after delivery is confirmed.
            </p>
          )}

          {results.length > 0 && (
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
                      <td className="p-3">{u.product}</td>
                      <td className="p-3">{u.customer} ({u.phone})</td>
                      <td className="p-3">{u.end}</td>
                      <td className="p-3"><WarrantyBadge unit={u} /></td>
                      <td className="p-3">
                        <Button size="sm" variant="outline" onClick={() => { setSelected(u); setError('') }}>
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

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New ticket for {selected.serial}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={raiseTicket} className="max-w-md space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span>{selected.product}, {selected.customer}</span>
                <WarrantyBadge unit={selected} />
              </div>
              {!isInWarranty(selected) && (
                <p className="text-sm text-muted-foreground">
                  Out of warranty: an invoice of {rupees(SERVICE_CHARGE + Math.round((SERVICE_CHARGE * GST_PERCENT) / 100))} (service charge plus {GST_PERCENT}% GST) will be created automatically.
                </p>
              )}
              <div className="space-y-1">
                <Label htmlFor="issue">Problem</Label>
                <Input id="issue" value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="e.g. Inverter shows error E04" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-3">
                <Button type="submit">Raise ticket</Button>
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
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets yet.</p>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <div key={t.number} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">{t.number} - {t.customer} - {t.serial}</p>
                  <p className="text-muted-foreground">{t.issue}</p>
                  <p>
                    {t.inWarranty
                      ? 'Covered by warranty, no invoice.'
                      : `Invoice ${t.invoice.number}: ${rupees(t.invoice.charge)} + GST ${rupees(t.invoice.gst)} = ${rupees(t.invoice.total)}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}