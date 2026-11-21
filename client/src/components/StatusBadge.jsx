import { Badge } from '@/components/ui/badge'

// One colour per status. Change a colour here and it changes on every page.
const STATUS_STYLES = {
  // Lead pipeline
  NEW: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-sky-100 text-sky-800',
  SURVEY_SCHEDULED: 'bg-violet-100 text-violet-800',
  SURVEY_APPROVED: 'bg-emerald-100 text-emerald-800',
  SURVEY_REJECTED: 'bg-red-100 text-red-800',
  QUOTED: 'bg-amber-100 text-amber-800',
  ORDERED: 'bg-indigo-100 text-indigo-800',
  DISPATCHED: 'bg-cyan-100 text-cyan-800',
  INSTALLED: 'bg-green-100 text-green-800',

  // Generic
  PENDING: 'bg-slate-100 text-slate-700',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
  PAID: 'bg-green-100 text-green-800',
  PARTIAL: 'bg-amber-100 text-amber-800',
  OPEN: 'bg-orange-100 text-orange-800',
  CLOSED: 'bg-slate-100 text-slate-700',

  // Subsidy stages
  APPLIED: 'bg-blue-100 text-blue-800',
  DOCUMENTS_SUBMITTED: 'bg-violet-100 text-violet-800',
  RECEIVED: 'bg-green-100 text-green-800',

  // Warranty
  IN_WARRANTY: 'bg-green-100 text-green-800',
  OUT_OF_WARRANTY: 'bg-red-100 text-red-800',
}

function toLabel(status) {
  return String(status)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
}

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'
  return (
    <Badge variant="secondary" className={`border-0 font-medium ${style}`}>
      {toLabel(status)}
    </Badge>
  )
}