import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  FileText,
  ShoppingCart,
  Warehouse,
  CalendarDays,
  Landmark,
  Wallet,
  ScanLine,
  Headset,
  Package,
  LogOut,
  Sun,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// One list for the whole menu. "roles" decides who sees each item.
const MENU = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, roles: ['DIRECTOR'] },
  { label: 'Leads', to: '/leads', icon: Users, roles: ['SALES'] },
  { label: 'Surveys', to: '/surveys', icon: ClipboardCheck, roles: ['SALES', 'TECHNICIAN'] },
  { label: 'Quotes', to: '/quotes/new', icon: FileText, roles: ['SALES'] },
  { label: 'Orders', to: '/orders', icon: ShoppingCart, roles: ['SALES'] },
  { label: 'Warehouse', to: '/warehouse', icon: Warehouse, roles: ['WAREHOUSE'] },
  { label: 'Dispatch', to: '/dispatch', icon: ScanLine, roles: ['WAREHOUSE'] },
  { label: 'Delivery', to: '/delivery', icon: Package, roles: ['WAREHOUSE'] },
  { label: 'Install', to: '/install', icon: ClipboardCheck, roles: ['TECHNICIAN'] },
  { label: 'Stock', to: '/stock', icon: Package,roles: ['WAREHOUSE', 'SALES', 'DIRECTOR'] },
  { label: 'Schedule', to: '/schedule', icon: CalendarDays, roles: ['SALES', 'TECHNICIAN'] },
  { label: 'Subsidy', to: '/subsidy', icon: Landmark, roles: ['SALES', 'DIRECTOR'] },
  { label: 'Technician pay', to: '/payroll', icon: Wallet, roles: ['DIRECTOR'] },
  { label: 'Tickets', to: '/tickets', icon: Headset, roles: ['SUPPORT'] },
]

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'))
  } catch {
    return null
  }
}

export default function AppLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const user = getUser()

  // Not logged in: send to the login page
  if (!localStorage.getItem('token') || !user) {
    return <Navigate to="/login" replace />
  }

  const items = MENU.filter((item) => item.roles.includes(user.role))
  const current = MENU.find((item) => pathname.startsWith(item.to.split('/:')[0]))

  // Route guard: which menu rule covers this page, and is this role allowed?
  const segment = pathname.split('/')[1]
  const rule = MENU.find((item) => item.to.split('/')[1] === segment)
  const allowed = !rule || rule.roles.includes(user.role)

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary">
            <Sun className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">Kiran</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ' +
                (isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'hover:bg-sidebar-accent/60')
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-6 py-3">
          <div>
            <p className="text-xs text-muted-foreground">
              Kiran / {allowed ? (current?.label ?? 'Page') : 'No access'}
            </p>
            <h1 className="text-lg font-semibold">
              {allowed ? (current?.label ?? 'Page') : 'No access'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium capitalize">{user.name}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {user.role.toLowerCase()}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6">
          {allowed ? (
            <Outlet />
          ) : (
            <div className="mx-auto max-w-md space-y-4 py-16 text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-amber-600" />
              <h2 className="text-xl font-semibold">You don't have access</h2>
              <p className="text-sm text-muted-foreground">
                Your role ({user.role.toLowerCase()}) cannot open this page.
              </p>
              {items[0] && (
                <Button onClick={() => navigate(items[0].to)}>
                  Go to {items[0].label}
                </Button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}