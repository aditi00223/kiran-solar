// TEMPORARY: replace with api.get('/leads') once Person 1 publishes docs/API.md
export const mockLeads = [
  { id: 1, name: 'Gurpreet Singh', phone: '98765 43210', city: 'Phagwara', address: 'House 14, Model Town, Phagwara', systemSize: 3, source: 'WEB', status: 'NEW', createdAt: '2026-11-20', callCheck: null },
  { id: 2, name: 'Harjinder Kaur', phone: '98142 77831', city: 'Jalandhar', address: '221 Basti Danishmandan, Jalandhar', systemSize: 5, source: 'CALL', status: 'CONTACTED', createdAt: '2026-11-19', callCheck: { shadowFreeArea: 60, monthlyBill: 6500, gridSuitable: true } },
  { id: 3, name: 'Manpreet Sandhu', phone: '99150 20418', city: 'Ludhiana', address: '45 Sarabha Nagar, Ludhiana', systemSize: 2, source: 'WHATSAPP', status: 'SURVEY_SCHEDULED', createdAt: '2026-11-18', callCheck: { shadowFreeArea: 25, monthlyBill: 2800, gridSuitable: true } },
  { id: 4, name: 'Rajinder Pal Sharma', phone: '97790 55126', city: 'Kapurthala', address: '8 Jalandhar Road, Kapurthala', systemSize: 4, source: 'WEB', status: 'SURVEY_APPROVED', createdAt: '2026-11-16', callCheck: { shadowFreeArea: 45, monthlyBill: 4900, gridSuitable: true } },
  { id: 5, name: 'Simranjeet Gill', phone: '98880 31975', city: 'Amritsar', address: '12 Ranjit Avenue, Amritsar', systemSize: 1, source: 'CALL', status: 'SURVEY_REJECTED', createdAt: '2026-11-15', callCheck: { shadowFreeArea: 10, monthlyBill: 1200, gridSuitable: false } },
  { id: 6, name: 'Balwinder Dhillon', phone: '98723 66402', city: 'Patiala', address: '77 Leela Bhawan, Patiala', systemSize: 5, source: 'WEB', status: 'QUOTED', createdAt: '2026-11-12', callCheck: { shadowFreeArea: 70, monthlyBill: 7200, gridSuitable: true } },
  { id: 7, name: 'Jaswinder Kaur', phone: '94170 82259', city: 'Hoshiarpur', address: '3 Model Town, Hoshiarpur', systemSize: 3, source: 'WHATSAPP', status: 'ORDERED', createdAt: '2026-11-08', callCheck: { shadowFreeArea: 35, monthlyBill: 3600, gridSuitable: true } },
  { id: 8, name: 'Amandeep Brar', phone: '98550 14367', city: 'Bathinda', address: '19 Ajit Road, Bathinda', systemSize: 4, source: 'CALL', status: 'DISPATCHED', createdAt: '2026-11-03', callCheck: { shadowFreeArea: 50, monthlyBill: 5100, gridSuitable: true } },
  { id: 9, name: 'Kuldeep Singh Bedi', phone: '99888 70541', city: 'Moga', address: '56 Ghalib Kalan Road, Moga', systemSize: 3, source: 'WEB', status: 'INSTALLED', createdAt: '2026-10-25', callCheck: { shadowFreeArea: 38, monthlyBill: 3900, gridSuitable: true } },
]
export function addLead({ name, phone, address, systemSize, message }) {
  const lead = {
    id: mockLeads.length + 1,
    name: name.trim(),
    phone: phone.trim(),
    city: address.split(',').pop().trim() || 'Punjab',
    address: address.trim(),
    systemSize: Number(systemSize),
    source: 'WEB',
    status: 'NEW',
    createdAt: new Date().toISOString().slice(0, 10),
    callCheck: null,
    message: message?.trim() ?? '',
  }
  mockLeads.unshift(lead)
  return lead
}