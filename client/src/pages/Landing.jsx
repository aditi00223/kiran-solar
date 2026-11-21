import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, ClipboardList, FileText, ShieldCheck, Sun, Wrench } from 'lucide-react'
import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const rupees = (n) => 'Rs ' + Number(n || 0).toLocaleString('en-IN')

const TYPE_LABEL = {
  ON_GRID: 'On-Grid',
  OFF_GRID: 'Off-Grid',
  PANEL_SET: 'Panel set',
  INSTALLATION: 'Installation',
}

const STEPS = [
  { icon: ClipboardList, title: 'Send an enquiry', text: 'Tell us about your home and your electricity use. It takes two minutes.' },
  { icon: Sun, title: 'Site survey', text: 'We check your roof, shade and cable distance before we quote anything.' },
  { icon: FileText, title: 'Clear quote', text: 'You get a quote with the full parts list and price, and confirm with an advance.' },
  { icon: Wrench, title: 'Install and warranty', text: 'We dispatch, deliver and install. Your warranty starts on delivery and is tracked by serial number.' },
]

const quoteLink =
  'inline-flex items-center justify-center gap-2 rounded-md bg-amber-400 px-5 py-3 font-semibold text-slate-900 hover:bg-amber-300'

export default function Landing() {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [kw, setKw] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/packages')
      const list = res.data.data
      setPackages(list)
      const sizes = [...new Set(list.map((p) => p.capacityKw).filter(Boolean))].sort((a, b) => a - b)
      setKw((current) => current ?? (sizes.includes(3) ? 3 : sizes[0] ?? null))
    } catch (err) {
      setError(err.response?.data?.error || 'We could not load the packages right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Sizes come from the data, so a new package size shows up without a code change
  const sizes = useMemo(
    () => [...new Set(packages.map((p) => p.capacityKw).filter(Boolean))].sort((a, b) => a - b),
    [packages]
  )

  // Packages without a size (panel set, installation) always show
  const visible = packages.filter((p) => !p.capacityKw || p.capacityKw === kw)

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-10 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-slate-900">
              <Sun className="h-5 w-5" />
            </span>
            <span className="text-xl font-semibold">Kiran Solar</span>
          </Link>
          <nav className="flex items-center gap-3">
            <a href="#packages" className="hidden text-sm hover:text-amber-300 md:inline">Packages</a>
            <a href="#how" className="hidden text-sm hover:text-amber-300 md:inline">How it works</a>
            <Link to="/login" className="rounded-md border border-white/30 px-3 py-2 text-sm hover:bg-white/10">
              Staff login
            </Link>
            <Link to="/enquiry" className="hidden rounded-md bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300 sm:inline-block">
              Get a free quote
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <Badge className="bg-amber-400 text-slate-900 hover:bg-amber-400">Solar installation for homes</Badge>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Solar power for your home, from first enquiry to warranty support
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Kiran Solar surveys your roof, quotes every part openly, installs the system and looks after your warranty.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/enquiry" className={quoteLink}>
              Get a free quote <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#packages" className="inline-flex items-center justify-center rounded-md border border-white/30 px-5 py-3 font-semibold hover:bg-white/10">
              See packages
            </a>
          </div>
        </div>
      </section>

      <section id="packages" className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold sm:text-3xl">Our packages</h2>
          <p className="mt-2 text-slate-600">
            These are starting prices. The final price is confirmed in your quote after the site survey.
          </p>

          {loading && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-56 w-full" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="mt-6 space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
              <Button size="sm" variant="outline" onClick={load}>Try again</Button>
            </div>
          )}

          {!loading && !error && packages.length === 0 && (
            <p className="mt-6 text-sm text-slate-600">
              Our packages will be listed here soon. <Link to="/enquiry" className="font-semibold text-amber-600 hover:underline">Send an enquiry</Link> and we will call you.
            </p>
          )}

          {!loading && !error && packages.length > 0 && (
            <>
              {sizes.length > 0 && (
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-600">System size:</span>
                  {sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setKw(size)}
                      className={
                        'rounded-md border px-3 py-1 text-sm font-medium ' +
                        (kw === size ? 'border-amber-400 bg-amber-400 text-slate-900' : 'bg-white hover:bg-slate-100')
                      }
                    >
                      {size} kW
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {visible.map((p) => (
                  <Card key={p.id} className="flex flex-col">
                    <CardHeader>
                      <Badge variant="secondary" className="w-fit">{TYPE_LABEL[p.type] ?? p.type}</Badge>
                      <CardTitle className="pt-2">{p.name}</CardTitle>
                      <CardDescription>{p.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-3">
                      <p className="text-2xl font-bold">{rupees(p.price)}</p>
                      {p.warranty && (
                        <ul className="space-y-1 text-sm text-slate-600">
                          {p.warranty.panelsYears > 0 && (
                            <li className="flex gap-2">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                              <span>{p.warranty.panelsYears} years warranty on panels</span>
                            </li>
                          )}
                          {p.warranty.inverterYears > 0 && (
                            <li className="flex gap-2">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                              <span>{p.warranty.inverterYears} years warranty on inverter</span>
                            </li>
                          )}
                        </ul>
                      )}
                      <Link to="/enquiry" className="mt-auto text-sm font-semibold text-amber-600 hover:underline">
                        Ask about this package
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section id="how" className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold sm:text-3xl">How it works</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-amber-400">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-slate-500">Step {i + 1}</span>
                </div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="text-sm text-slate-600">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-3">
          <div className="flex gap-3">
            <ClipboardList className="h-6 w-6 shrink-0 text-amber-500" />
            <div>
              <h3 className="font-semibold">Survey before every quote</h3>
              <p className="text-sm text-slate-600">No guesswork: we visit first, so the quote matches your roof.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <FileText className="h-6 w-6 shrink-0 text-amber-500" />
            <div>
              <h3 className="font-semibold">Full parts list</h3>
              <p className="text-sm text-slate-600">Every quote lists each part, quantity and price.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <ShieldCheck className="h-6 w-6 shrink-0 text-amber-500" />
            <div>
              <h3 className="font-semibold">Warranty by serial number</h3>
              <p className="text-sm text-slate-600">Each unit we deliver is recorded, with its warranty start and end dates.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 py-14 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Ready to go solar?</h2>
            <p className="text-slate-300">Send an enquiry and we will arrange your site survey.</p>
          </div>
          <Link to="/enquiry" className={quoteLink}>
            Get a free quote <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="bg-slate-950 py-6 text-sm text-slate-400" style={{ backgroundColor: '#020617' }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4">
          <span>© {new Date().getFullYear()} Kiran Solar</span>
          <Link to="/login" className="hover:text-amber-300">Staff login</Link>
        </div>
      </footer>
    </div>
  )
}