import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const day = (v) => (v ? String(v).slice(0, 10) : '-')
const localToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function uploadToCloudinary(file) {
  const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  if (!cloud || !preset) {
    throw new Error('Photo upload is not set up yet. Ask the team for the Cloudinary settings.')
  }
  const body = new FormData()
  body.append('file', file)
  body.append('upload_preset', preset)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body })
  if (!res.ok) throw new Error('Upload failed. Check your internet connection and try again.')
  const json = await res.json()
  return json.secure_url
}

export default function Install() {
  const navigate = useNavigate()
  const role = (() => {
    try {
      return JSON.parse(localStorage.getItem('user'))?.role
    } catch {
      return null
    }
  })()
  const canSubmit = role === 'TECHNICIAN'

  const [open, setOpen] = useState([])
  const [done, setDone] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [jobId, setJobId] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [systemKw, setSystemKw] = useState('')
  const [photos, setPhotos] = useState([])
  const [hasSignature, setHasSignature] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const canvasRef = useRef(null)
  const drawing = useRef(false)

  const load = useCallback(async () => {
    try {
      const [a, b, c] = await Promise.all([
        api.get('/install-jobs', { params: { status: 'SCHEDULED', limit: 50 } }),
        api.get('/install-jobs', { params: { status: 'IN_PROGRESS', limit: 50 } }),
        api.get('/install-jobs', { params: { status: 'COMPLETED', limit: 50 } }),
      ])
      setOpen([...a.data.data, ...b.data.data])
      setDone(c.data.data)
      setLoadError(null)
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear()
        navigate('/login')
        return
      }
      setLoadError(err.response?.data?.error || 'Could not load install jobs. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    load()
  }, [load])

  async function chooseJob(e) {
    const id = e.target.value
    setJobId(id)
    setError('')
    setSystemKw('')
    if (!id) return
    try {
      const res = await api.get(`/install-jobs/${id}`)
      if (res.data.data.systemSizeKw) setSystemKw(String(res.data.data.systemSizeKw))
    } catch {
      /* size can be typed by hand */
    }
  }

  // ---- signature pad ----
  function point(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    }
  }
  function startDraw(e) {
    const ctx = canvasRef.current.getContext('2d')
    canvasRef.current.setPointerCapture(e.pointerId)
    const { x, y } = point(e)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0f172a'
    ctx.beginPath()
    ctx.moveTo(x, y)
    drawing.current = true
  }
  function moveDraw(e) {
    if (!drawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = point(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSignature(true)
  }
  function endDraw() {
    drawing.current = false
  }
  function clearSignature() {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!jobId) return setError('Choose a job.')
    if (!startTime || !endTime) return setError('Enter the start and end time.')
    if (endTime <= startTime) return setError('End time must be after the start time.')
    if (!(Number(systemKw) > 0)) return setError('Enter the system size in kW.')
    if (photos.length === 0) return setError('Add at least one installation photo.')
    if (!hasSignature) return setError('Ask the customer to sign on the screen.')

    setBusy(true)
    try {
      const photoUrls = []
      for (const file of photos) photoUrls.push(await uploadToCloudinary(file))
      const blob = await new Promise((resolve) => canvasRef.current.toBlob(resolve, 'image/png'))
      const signatureUrl = await uploadToCloudinary(blob)

      const today = localToday()
      await api.patch(`/install-jobs/${jobId}/complete`, {
        startedAt: new Date(`${today}T${startTime}`).toISOString(),
        finishedAt: new Date(`${today}T${endTime}`).toISOString(),
        systemSizeKw: Number(systemKw),
        photoUrls,
        signatureUrl,
      })
      toast.success('Installation submitted. Job completed.')
      setJobId('')
      setStartTime('')
      setEndTime('')
      setSystemKw('')
      setPhotos([])
      clearSignature()
      await load()
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Could not submit the installation.'
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>

  return (
    <div className="space-y-6">
      {canSubmit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Installation form</CardTitle>
          </CardHeader>
          <CardContent>
            {open.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs assigned to you are waiting for installation.</p>
            ) : (
              <form onSubmit={submit} className="max-w-md space-y-4" noValidate>
                <div className="space-y-1">
                  <Label htmlFor="job">Job</Label>
                  <select
                    id="job"
                    value={jobId}
                    onChange={chooseJob}
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
                  >
                    <option value="">Select</option>
                    {open.map((j) => (
                      <option key={j.id} value={j.id}>
                        O-{j.orderId} - {j.lead?.name} ({day(j.scheduledAt)})
                      </option>
                    ))}
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
                  {photos.length > 0 && <p className="text-xs text-muted-foreground">{photos.length} photo(s) chosen</p>}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label>Customer signature</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={clearSignature}>Clear</Button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={160}
                    className="w-full rounded-lg border bg-white"
                    style={{ touchAction: 'none' }}
                    onPointerDown={startDraw}
                    onPointerMove={moveDraw}
                    onPointerUp={endDraw}
                    onPointerLeave={endDraw}
                  />
                  <p className="text-xs text-muted-foreground">Ask the customer to sign inside the box.</p>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" disabled={busy}>{busy ? 'Uploading and saving...' : 'Submit installation'}</Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Completed installations ({done.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {done.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing completed yet.</p>
          ) : (
            <div className="space-y-2">
              {done.map((j) => (
                <div key={j.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">O-{j.orderId} - {j.lead?.name}</p>
                    <p className="text-muted-foreground">{j.lead?.city}, {day(j.scheduledAt)}, {j.technician?.name}</p>
                  </div>
                  <Badge variant="secondary" className="border-transparent bg-green-100 text-green-700">Completed</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}