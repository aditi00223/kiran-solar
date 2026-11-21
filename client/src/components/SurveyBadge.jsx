import { Badge } from '@/components/ui/badge'

const STYLES = {
  SCHEDULED: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Awaiting approval', className: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
}

export default function SurveyBadge({ status }) {
  const s = STYLES[status] ?? { label: status, className: 'bg-muted text-muted-foreground' }
  return <Badge variant="secondary" className={`border-transparent ${s.className}`}>{s.label}</Badge>
}