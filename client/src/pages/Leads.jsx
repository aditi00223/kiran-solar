import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import DataTable from '@/components/DataTable'
import StatusBadge from '@/components/StatusBadge'
import { mockLeads } from '@/lib/mockLeads'

const SOURCE_LABEL = { WEB: 'Website', CALL: 'Phone call', WHATSAPP: 'WhatsApp' }

const STATUSES = [
  'NEW', 'CONTACTED', 'SURVEY_SCHEDULED', 'SURVEY_APPROVED',
  'SURVEY_REJECTED', 'QUOTED', 'ORDERED', 'DISPATCHED', 'INSTALLED',
]

const selectClass =
  'h-9 rounded-lg border border-input bg-transparent px-3 text-sm'

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')

  useEffect(() => {
    // TEMPORARY: simulates a server call. Replace with api.get('/leads')
    const timer = setTimeout(() => {
      setLeads(mockLeads)
      setLoading(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leads.filter(
      (l) =>
        (!q || l.name.toLowerCase().includes(q) || l.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')) || l.city.toLowerCase().includes(q)) &&
        (!status || l.status === status) &&
        (!source || l.source === source)
    )
  }, [leads, search, status, source])

  const columns = [
    { key: 'name', header: 'Name', render: (l) => <span className="font-medium">{l.name}</span> },
    { key: 'phone', header: 'Phone' },
    { key: 'city', header: 'City' },
    { key: 'systemSize', header: 'Size', render: (l) => `${l.systemSize} kW` },
    { key: 'source', header: 'Source', render: (l) => SOURCE_LABEL[l.source] },
    { key: 'status', header: 'Status', render: (l) => <StatusBadge status={l.status} /> },
    { key: 'createdAt', header: 'Received' },
  ]

  return (
    <div className="space-y-4">
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
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())}
            </option>
          ))}
        </select>
        <select className={selectClass} value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All sources</option>
          {Object.entries(SOURCE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        error={error}
        emptyMessage="No leads yet"
      />
    </div>
  )
}