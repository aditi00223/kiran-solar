import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// Where each role lands after login
const ROLE_HOME = {
  SALES: '/leads',
  TECHNICIAN: '/surveys',
  WAREHOUSE: '/warehouse',
  SUPPORT: '/tickets',
  DIRECTOR: '/dashboard',
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('SALES')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function validate() {
    const next = {}
    if (!email.trim()) next.email = 'Enter your email'
    else if (!/\S+@\S+\.\S+/.test(email)) next.email = 'Enter a valid email'
    if (!password) next.password = 'Enter your password'
    return next
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setLoading(true)
    try {
      // DEMO LOGIN: replace with api.post('/auth/login', ...) once API.md is ready
      const user = { name: email.split('@')[0], email, role }
      localStorage.setItem('token', 'demo-token')
      localStorage.setItem('user', JSON.stringify(user))
      toast.success(`Welcome, ${user.name}`)
      navigate(ROLE_HOME[role])
    } catch {
      toast.error('Login failed. Check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Sun className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Kiran</CardTitle>
          <CardDescription>Sign in to manage your solar business</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@kiransolar.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Demo role (temporary)</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
              >
                <option value="SALES">Sales</option>
                <option value="TECHNICIAN">Technician</option>
                <option value="WAREHOUSE">Warehouse</option>
                <option value="SUPPORT">Support</option>
                <option value="DIRECTOR">Director</option>
              </select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}