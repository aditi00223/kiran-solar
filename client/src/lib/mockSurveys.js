// TEMPORARY: replace with api calls once Person 1 publishes docs/API.md
import { mockLeads } from '@/lib/mockLeads'

export const TECHNICIANS = ['Sukhdev Singh', 'Gurmeet Kumar', 'Navdeep Singh']

// status: SCHEDULED -> COMPLETED (results in, awaiting approval) -> APPROVED or REJECTED
export const mockSurveys = [
  { id: 1, leadId: 3, technician: 'Sukhdev Singh', scheduledDate: '2026-11-20', status: 'COMPLETED', rejectReason: '',
    result: { roofType: 'Concrete flat roof', usableArea: 24, shadowIssue: 'None', notes: 'Clear south-facing roof. The water tank on the east side casts no shade after 9 am.' } },
  { id: 2, leadId: 4, technician: 'Gurmeet Kumar', scheduledDate: '2026-11-17', status: 'APPROVED', rejectReason: '',
    result: { roofType: 'Concrete flat roof', usableArea: 44, shadowIssue: 'Minor', notes: 'Small parapet shade in the early morning only.' } },
  { id: 3, leadId: 5, technician: 'Navdeep Singh', scheduledDate: '2026-11-16', status: 'REJECTED',
    rejectReason: 'Neighbouring building shades the roof most of the day. Only 8 sq m is usable.',
    result: { roofType: 'Tin sheet roof', usableArea: 8, shadowIssue: 'Heavy', notes: 'Not enough shadow-free space for the system size asked.' } },
  { id: 4, leadId: 6, technician: 'Sukhdev Singh', scheduledDate: '2026-11-13', status: 'APPROVED', rejectReason: '',
    result: { roofType: 'Concrete flat roof', usableArea: 68, shadowIssue: 'None', notes: 'Large open roof, easy access.' } },
  { id: 5, leadId: 7, technician: 'Gurmeet Kumar', scheduledDate: '2026-11-09', status: 'APPROVED', rejectReason: '',
    result: { roofType: 'Concrete flat roof', usableArea: 34, shadowIssue: 'None', notes: 'Good roof, existing water pipes need to be moved.' } },
  { id: 6, leadId: 8, technician: 'Navdeep Singh', scheduledDate: '2026-11-04', status: 'APPROVED', rejectReason: '',
    result: { roofType: 'Concrete flat roof', usableArea: 49, shadowIssue: 'Minor', notes: 'Slight shade from a tree in the evening.' } },
  { id: 7, leadId: 9, technician: 'Sukhdev Singh', scheduledDate: '2026-10-27', status: 'APPROVED', rejectReason: '',
    result: { roofType: 'Concrete flat roof', usableArea: 37, shadowIssue: 'None', notes: 'No issues found.' } },
]

export function getSurveyByLead(leadId) {
  return mockSurveys.find((s) => s.leadId === leadId) ?? null
}

export function scheduleSurvey(leadId, scheduledDate, technician) {
  const survey = {
    id: mockSurveys.length + 1,
    leadId,
    technician,
    scheduledDate,
    status: 'SCHEDULED',
    rejectReason: '',
    result: null,
  }
  mockSurveys.push(survey)
  const lead = mockLeads.find((l) => l.id === leadId)
  if (lead) lead.status = 'SURVEY_SCHEDULED'
  return survey
}

export function decideSurvey(id, decision, reason = '') {
  const survey = mockSurveys.find((s) => s.id === id)
  if (!survey) throw new Error('Survey not found')
  if (survey.status !== 'COMPLETED') {
    throw new Error('Only surveys with submitted results can be approved or rejected')
  }
  survey.status = decision
  survey.rejectReason = reason
  const lead = mockLeads.find((l) => l.id === survey.leadId)
  if (lead) lead.status = decision === 'APPROVED' ? 'SURVEY_APPROVED' : 'SURVEY_REJECTED'
  return survey
}