import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import Login from '@/pages/Login'
import Enquiry from '@/pages/Enquiry'
import Leads from '@/pages/Leads'
import LeadDetail from '@/pages/LeadDetail'
import AppLayout from '@/layouts/AppLayout'
import Stock from '@/pages/Stock'

// Temporary page for routes we haven't built yet
function ComingSoon() {
  const { pathname } = useLocation()
  return (
    <p className="text-muted-foreground">
      Page <span className="font-semibold text-foreground">{pathname}</span> is coming soon.
    </p>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/enquiry" element={<Enquiry />} />
        <Route element={<AppLayout />}>
          <Route path="/leads" element={<Leads />} />
          <Route path="/leads/:id" element={<LeadDetail />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="*" element={<ComingSoon />} />
        </Route>
      </Routes>
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}

export default App