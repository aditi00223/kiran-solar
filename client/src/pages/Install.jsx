import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { mockLeads } from '@/lib/mockLeads'
import { getQuote } from '@/lib/mockPackages'
import { getOrder } from '@/lib/mockOrders'
import { getJobs, todayISO } from '@/lib/mockJobs'

function describe(job) {
  const lead = mockLeads.find((l) => l.id === job.leadId)
  const order = getOrder(job.orderId)
  const quote = order ? getQuote(order.quoteId) : null
  return {
    name: lead?.name ?? 'Unknown customer',
    city: lead?.city ?? '',
    kw: quote ? quote.kw : '',
    orderNumber: order?.number ?? '',
  }
}

export default function Install() {
  const [, setVersion] = useState(0)
  const [jobId, setJobId] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [systemKw, setSystemKw] = useState('')
  const [photos, setPhotos] = useState([])
  const [error, setError] = useState('')

  const jobs = getJobs()
  const scheduled = jobs.filter((j) => j.status === 'SCHEDULED')
  const finished = jobs.filter((j) => j.status === 'DONE' && j.install)

  function chooseJob(e) {
    const id = e.target.value
    setJobId(id)
    setError('')
    const job = jobs.find((j) => String(j.id) === id)
    setSystemKw(job ? String(describe(job).kw) : '')
  }

  function submit(e) {
    e.preventDefault()
    const job = jobs.find((j) => String(j.id) === jobId)
    if (!job) return setError('Choose a job.')
    if (!startTime || !endTime) return setError('Enter the start and end time.')
    if (endTime <= startTime) return setError('End time must be after the start time.')
    if (!(Number(systemKw) > 0)) return setError('Enter the system size in kW.')
    if (photos.length === 0) return setError('Add at least one installation photo.')

    // TEMPORARY: replace with api.put(`/jobs/${job.id}`, ...)
    job.status = 'DONE'
    job.install = {
      date: todayISO(),
      startTime,
      endTime,
      systemKw: Number(systemKw),
      photos: photos.map((p) => p.name),
    }
    toast.success('Installation submitted. Job marked as done.')
    setJobId('')
    setStartTime('')
    setEndTime('')
    setSystemKw('')
    setPhotos([])
    setError('')
    setVersion((v) => v + 1)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Installation form</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduled.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scheduled jobs waiting for installation.</p>
          ) : (
            <form onSubmit={submit} className="max-w-md space-y-4">
              <div className="space-y-1">
                <Label htmlFor="job">Job</Label>
                <select
                  id="job"
                  value={jobId}
                  onChange={chooseJob}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">Select</option>
                  {scheduled.map((j) => {
                    const info = describe(j)
                    return (
                      <option key={j.id} value={j.id}>
                        {info.orderNumber} - {info.name} ({j.date})
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="start">Start time</Label>
                  <Input id="start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="end">End time</Label>
                  <Input id="end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="kw">System size (kW)</Label>
                <Input id="kw" type="number" step="0.1" min="0" value={systemKw} onChange={(e) => setSystemKw(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="photos">Installation photos</Label>
                <Input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setPhotos(Array.from(e.target.files))}
                />
                {photos.length > 0 && (
                  <p className="text-xs text-muted-foreground">{photos.length} photo(s): {photos.map((p) => p.name).join(', ')}</p>
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit">Submit installation</Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submitted installations ({finished.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {finished.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing submitted yet.</p>
          ) : (
            <div className="space-y-2">
              {finished.map((j) => {
                const info = describe(j)
                return (
                  <div key={j.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{info.orderNumber} - {info.name}</p>
                    <p className="text-muted-foreground">
                      {j.install.date}, {j.install.startTime} to {j.install.endTime}, {j.install.systemKw} kW, {j.install.photos.length} photo(s)
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}