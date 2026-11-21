import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import DataTable from '@/components/DataTable'
import SurveyBadge from '@/components/SurveyBadge'

const STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'COMPLETED', label: 'Awaiting approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

export default function Surveys() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ totalPages: 1, total: 0 })

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get('/surveys', {
          params: { page, limit: 10, status: status || undefined },
        })
        if (cancelled) return
        setRows(res.data.data)
        setMeta(res.data.meta)
      } catch (err) {
        if (cancelled) return
        if (err.response?.status === 401) {
          localStorage.clear()
          navigate('/login')
          return
        }
        setError(err.response?.data?.error || 'Could not load surveys. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [page, status, navigate])

  const waiting = rows.filter((r) => r.status === 'COMPLETED').length

  const columns = [
    { key: 'name', header: 'Customer', render: (r) => <span className="font-medium">{r.lead?.name}</span> },
    { key: 'city', header: 'City', render: (r) => r.lead?.city },
    { key: 'technician', header: 'Technician', render: (r) => r.technician?.name },
    { key: 'scheduledAt', header: 'Survey date', render: (r) => String(r.scheduledAt).slice(0, 10) },
    { key: 'status', header: 'Status', render: (r) => <SurveyBadge status={r.status} /> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {!loading && waiting > 0 && (
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{waiting}</span> survey{waiting > 1 ? 's' : ''} waiting for approval on this page
          </p>
        )}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        error={error}
        emptyMessage="No surveys yet"
        onRowClick={(row) => navigate(`/surveys/${row.id}`)}
      />

      {!error && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page} of {meta.totalPages} ({meta.total} surveys)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}