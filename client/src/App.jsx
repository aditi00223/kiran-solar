import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import Login from '@/pages/Login'

// Temporary page for routes we haven't built yet
function ComingSoon() {
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">
        Page <span className="font-semibold text-foreground">{pathname}</span> is coming soon.
      </p>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<ComingSoon />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </BrowserRouter>
  )
}

export default App