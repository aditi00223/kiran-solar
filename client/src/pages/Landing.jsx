import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, ClipboardList, FileText, ShieldCheck, Sun, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GST_RATE, KW_SIZES, buildParts } from '@/lib/mockPackages'

const rupees = (n) => 'Rs ' + n.toLocaleString('en-IN')
const totalOf = (parts) => parts.reduce((sum, p) => sum + p.qty * p.price, 0)

const PACKAGES = [
  { key: 'ON_GRID', title: 'On-Grid system', sized: true, text: 'Cut your electricity bill with panels connected to the grid.' },
  { key: 'OFF_GRID', title: 'Off-Grid system', sized: true, text: 'Battery backup that keeps your home running during power cuts.' },
  { key: 'PANEL_SET', title: 'Panel set', sized: false, text: 'Panels with mounting structure, ready for your own setup.' },
  { key: 'INSTALLATION', title: 'Installation service', sized: false, text: 'Professional installation and commissioning by our crew.' },
]

const STEPS = [
  { icon: ClipboardList, title: 'Send an enquiry', text: 'Tell us about your home and your electricity use. It takes two minutes.' },
  { icon: Sun, title: 'Site survey', text: 'We check your roof, shade and cable distance before we quote anything.' },
  { icon: FileText, title: 'Clear quote', text: 'You get a quote with the full parts list and price, and confirm with an advance.' },
  { icon: Wrench, title: 'Install and warranty', text: 'We dispatch, deliver and install. Your warranty starts on delivery and is tracked by serial number.' },
]

const quoteLink =
  'inline-flex items-center justify-center gap-2 rounded-md bg-amber-400 px-5 py-3 font-semibold text-slate-900 hover:bg-amber-300'

export default function Landing() {
  const [kw, setKw] = useState(3)

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
            Prices are shown before GST ({GST_RATE}%). The final price is confirmed in your quote after the site survey.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">System size:</span>
            {KW_SIZES.map((size) => (
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

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PACKAGES.map((p) => {
              const parts = buildParts(p.key, kw)
              return (
                <Card key={p.key} className="flex flex-col">
                  <CardHeader>
                    <CardTitle>{p.title}{p.sized ? ' ' + kw + ' kW' : ''}</CardTitle>
                    <CardDescription>{p.text}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3">
                    <p className="text-2xl font-bold">{rupees(totalOf(parts))}</p>
                    <ul className="space-y-1 text-sm text-slate-600">
                      {parts.slice(0, 4).map((part) => (
                        <li key={part.name} className="flex gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                          <span>{part.qty} {part.unit} {part.name}</span>
                        </li>
                      ))}
                      {parts.length > 4 && <li className="pl-6">and {parts.length - 4} more items</li>}
                    </ul>
                    <Link to="/enquiry" className="mt-auto text-sm font-semibold text-amber-600 hover:underline">
                      Ask about this package
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
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
