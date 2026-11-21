import { useState } from 'react'
import { toast } from 'sonner'
import { Sun, CheckCircle2 } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import FormField from '@/components/FormField'

const EMPTY = { name: '', phone: '', address: '', systemSize: '3', message: '' }

export default function Enquiry() {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value })
  }

  function validate() {
    const next = {}
    if (!form.name.trim()) next.name = 'Enter your name'
    const digits = form.phone.replace(/\D/g, '')
    if (!digits) next.phone = 'Enter your phone number'
    else if (digits.length !== 10) next.phone = 'Phone number must be 10 digits'
    if (!form.address.trim()) next.address = 'Enter your address'
    return next
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setLoading(true)
    try {
      await api.post('/leads', {
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, ''),
        address: form.address.trim(),
        systemSizeKw: Number(form.systemSize),
        message: form.message.trim() || undefined,
      })
      setDone(true)
      toast.success('Enquiry sent. Our team will call you soon.')
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
          'Could not send your enquiry. The server may be waking up, please try again in a minute.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Sun className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Go solar with Kiran</CardTitle>
          <CardDescription>Tell us about your home and we will call you for a free quote.</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4 py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <p className="text-lg font-semibold">Thank you, {form.name}!</p>
              <p className="text-sm text-muted-foreground">
                We received your enquiry for a {form.systemSize} kW system and will call you soon.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setForm(EMPTY)
                  setDone(false)
                }}
              >
                Send another enquiry
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <FormField label="Full name" name="name" value={form.name} onChange={set('name')} error={errors.name} placeholder="Gurpreet Singh" />
              <FormField label="Phone number" name="phone" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} placeholder="98765 43210" />
              <FormField label="Address" name="address" value={form.address} onChange={set('address')} error={errors.address} placeholder="House no, street, city" />

              <div className="space-y-2">
                <Label htmlFor="systemSize">System size</Label>
                <select
                  id="systemSize"
                  value={form.systemSize}
                  onChange={set('systemSize')}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                >
                  {[1, 2, 3, 4, 5].map((kw) => (
                    <option key={kw} value={kw}>{kw} kW</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message (optional)</Label>
                <textarea
                  id="message"
                  value={form.message}
                  onChange={set('message')}
                  rows={3}
                  placeholder="Anything we should know?"
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Get a free quote'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}