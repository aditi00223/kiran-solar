import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable from '@/components/DataTable'
import SurveyBadge from '@/components/SurveyBadge'
import { mockLeads } from '@/lib/mockLeads'
import { mockSurveys } from '@/lib/mockSurveys'

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
  const [error] = useState(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    // TEMPORARY: replace with api.get('/surveys')
    const timer = setTimeout(() => {
      const joined = mockSurveys
        .map((s) => {
          const lead = mockLeads.find((l) => l.id === s.leadId)
          return {
            id: s.id,
            name: lead?.name ?? 'Unknown customer',
            city: lead?.city ?? '',
            technician: s.technician,
            scheduledDate: s.scheduledDate,
            status: s.status,
          }
        })
        .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
      setRows(joined)
      setLoading(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  const filtered = useMemo(() => rows.filter((r) => !status || r.status === status), [rows, status])
  const waiting = rows.filter((r) => r.status === 'COMPLETED').length

  const columns = [
    { key: 'name', header: 'Customer', render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'city', header: 'City' },
    { key: 'technician', header: 'Technician' },
    { key: 'scheduledDate', header: 'Survey date' },
    { key: 'status', header: 'Status', render: (r) => <SurveyBadge status={r.status} /> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {!loading && waiting > 0 && (
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{waiting}</span> survey{waiting > 1 ? 's' : ''} waiting for your approval
          </p>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        error={error}
        emptyMessage="No surveys yet"
        onRowClick={(row) => navigate(`/surveys/${row.id}`)}
      />
    </div>
  )
}