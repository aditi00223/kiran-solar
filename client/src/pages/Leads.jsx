import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellRing, Search } from 'lucide-react'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import DataTable from '@/components/DataTable'
import StatusBadge from '@/components/StatusBadge'

const SOURCE_LABEL = { WEB: 'Website', CALL: 'Phone call', WHATSAPP: 'WhatsApp' }

const STATUSES = [
  'NEW', 'CONTACTED', 'SURVEY_SCHEDULED', 'SURVEY_APPROVED',
  'QUOTED', 'ORDERED', 'LOST',
]

const selectClass = 'h-9 rounded-lg border border-input bg-transparent px-3 text-sm'

export default function Leads() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ totalPages: 1, total: 0 })
  const [newCount, setNewCount] = useState(0)

  // Wait a moment after typing before searching
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get('/leads', {
          params: {
            page,
            limit: 10,
            search: debounced || undefined,
            status: status || undefined,
            source: source || undefined,
          },
        })
        if (cancelled) return
        setLeads(res.data.data)
        setMeta(res.data.meta)
      } catch (err) {
        if (cancelled) return
        if (err.response?.status === 401) {
          localStorage.clear()
          navigate('/login')
          return
        }
        setError(
          err.response?.data?.error ||
            'Could not load leads. The server may be waking up, please try again in a minute.'
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [page, debounced, status, source, navigate])

  // New-lead alert: check every 30 seconds
  useEffect(() => {
    let stopped = false
    async function check() {
      try {
        const res = await api.get('/leads/new-count')
        if (!stopped) setNewCount(res.data.data.count)
      } catch {
        /* the alert is optional, ignore errors */
      }
    }
    check()
    const timer = setInterval(check, 30000)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [])

  const columns = [
    { key: 'name', header: 'Name', render: (l) => <span className="font-medium">{l.name}</span> },
    { key: 'phone', header: 'Phone' },
    { key: 'city', header: 'City' },
    { key: 'systemSizeKw', header: 'Size', render: (l) => (l.systemSizeKw ? `${l.systemSizeKw} kW` : '-') },
    { key: 'source', header: 'Source', render: (l) => SOURCE_LABEL[l.source] ?? l.source },
    { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} /> },
    { key: 'createdAt', header: 'Received', render: (l) => String(l.createdAt).slice(0, 10) },
  ]

  return (
    <div className="space-y-4">
      {newCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3 text-sm text-amber-900">
            <BellRing className="h-5 w-5" />
            <p>
              <span className="font-semibold">{newCount}</span> new lead{newCount > 1 ? 's' : ''} waiting to be contacted
            </p>
          </div>
          {status === 'NEW' ? (
            <Button size="sm" variant="outline" onClick={() => { setStatus(''); setPage(1) }}>Show all leads</Button>
          ) : (
            <Button size="sm" onClick={() => { setStatus('NEW'); setPage(1) }}>Show new leads</Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, phone or city"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className={selectClass} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
        <select className={selectClass} value={source} onChange={(e) => { setSource(e.target.value); setPage(1) }}>
          <option value="">All sources</option>
          {Object.entries(SOURCE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={leads}
        loading={loading}
        error={error}
        emptyMessage="No leads yet"
        onRowClick={(lead) => navigate(`/leads/${lead.id}`)}
      />

      {!error && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {meta.totalPages} ({meta.total} leads)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}