import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import Login from '@/pages/Login'
import AppLayout from '@/layouts/AppLayout'

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
        <Route element={<AppLayout />}>
          <Route path="*" element={<ComingSoon />} />
        </Route>
      </Routes>
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}

export default App