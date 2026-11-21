import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import Login from '@/pages/Login'
import Enquiry from '@/pages/Enquiry'
import Leads from '@/pages/Leads'
import LeadDetail from '@/pages/LeadDetail'
import Surveys from '@/pages/Surveys'
import SurveyDetail from '@/pages/SurveyDetail'
import QuoteNew from '@/pages/QuoteNew'
import QuoteView from '@/pages/QuoteView'
import Orders from '@/pages/Orders'
import OrderDetail from '@/pages/OrderDetail'
import Warehouse from '@/pages/Warehouse'
import Schedule from '@/pages/Schedule'
import Dashboard from '@/pages/Dashboard'
import Subsidy from '@/pages/Subsidy'
import SubsidyDetail from '@/pages/SubsidyDetail'
import Payroll from '@/pages/Payroll'
import AppLayout from '@/layouts/AppLayout'
import Stock from '@/pages/Stock'
import Dispatch from '@/pages/Dispatch'

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
          <Route path="/dispatch" element={<Dispatch />} />
          <Route path="/surveys" element={<Surveys />} />
          <Route path="/surveys/:id" element={<SurveyDetail />} />
          <Route path="/quotes/new" element={<QuoteNew />} />
          <Route path="/quotes/:id" element={<QuoteView />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/warehouse" element={<Warehouse />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/subsidy" element={<Subsidy />} />
          <Route path="/subsidy/:id" element={<SubsidyDetail />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="*" element={<ComingSoon />} />
        </Route>
      </Routes>
      <Toaster richColors closeButton position="top-right" />
    </BrowserRouter>
  )
}

export default App