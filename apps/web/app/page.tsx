'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: '🔗',
    title: 'Connect Everything',
    description: 'One-click OAuth for Slack, GitHub, Notion, Confluence, and Google Drive. All your team\'s knowledge in one place within minutes.',
  },
  {
    icon: '🧠',
    title: 'Claude Extracts Decisions',
    description: 'Every PR, Slack thread, and doc is analyzed by Claude. Entities, decisions, and rationale are extracted and indexed semantically.',
  },
  {
    icon: '🔍',
    title: 'Ask Anything, Get Sources',
    description: '"Why did we choose Postgres?" → Get a synthesized answer with the exact Slack thread and PR comment from 14 months ago, cited.',
  },
]

const steps = [
  { step: '01', title: 'Connect your sources', description: 'OAuth with Slack and GitHub in 60 seconds. Claude starts indexing immediately.' },
  { step: '02', title: 'Claude builds the graph', description: 'Entities, decisions, and their rationale are extracted from every document and thread.' },
  { step: '03', title: 'Ask your questions', description: 'Type any question. Get a sourced answer citing the original Slack message or PR comment.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#1C1033] text-neutral-100">
      {/* Nav */}
      <nav className="border-b border-brand-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <span className="font-bold text-lg text-white">ArkBrain</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get started free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
          YC-prioritized category · AI Knowledge Management
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          The semantic knowledge graph<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-accent">
            that answers why
          </span>
        </h1>

        <p className="text-xl text-neutral-300 mb-10 max-w-2xl mx-auto">
          Ask <em className="text-white">&quot;Why did we choose Postgres over MongoDB?&quot;</em> and get a sourced answer
          citing the exact Slack thread from 14 months ago.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" className="shadow-glow">
              Connect your first repo free →
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="secondary">
              Sign in
            </Button>
          </Link>
        </div>

        <p className="mt-4 text-sm text-neutral-500">No credit card required · GitHub + Slack demo in 5 minutes</p>

        {/* Demo preview */}
        <div className="mt-16 rounded-2xl border border-brand-border bg-brand-surface p-1 shadow-card max-w-3xl mx-auto">
          <div className="rounded-xl bg-brand-bg-muted p-6">
            <div className="flex gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-amber-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-sm shrink-0">You</div>
                <div className="bg-brand-bg-subtle rounded-lg px-4 py-2.5 text-sm text-neutral-200 border border-brand-border">
                  Why did we choose PostgreSQL over MongoDB for our primary database?
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-sm shrink-0">🧠</div>
                <div className="bg-brand-surface rounded-lg px-4 py-3 text-sm text-neutral-200 border border-brand-border text-left">
                  <p>We chose PostgreSQL over MongoDB for three key reasons <span className="inline-flex items-center justify-center w-4 h-4 text-xs bg-primary-500/30 text-primary-300 rounded-full cursor-pointer">1</span>:</p>
                  <p className="mt-2">First, ACID compliance is critical for our financial transaction data <span className="inline-flex items-center justify-center w-4 h-4 text-xs bg-primary-500/30 text-primary-300 rounded-full cursor-pointer">1</span>. Second, pgvector eliminates the need for a separate vector database <span className="inline-flex items-center justify-center w-4 h-4 text-xs bg-primary-500/30 text-primary-300 rounded-full cursor-pointer">2</span>. Third, the team has stronger SQL expertise <span className="inline-flex items-center justify-center w-4 h-4 text-xs bg-primary-500/30 text-primary-300 rounded-full cursor-pointer">1</span>.</p>
                  <div className="mt-3 pt-3 border-t border-brand-border space-y-1">
                    <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Sources</p>
                    <div className="text-xs text-accent">🐙 PR #1: Switch from MongoDB to PostgreSQL · sarah.chen · Mar 15, 2025</div>
                    <div className="text-xs text-accent">💬 Slack #architecture · james.park · Jun 1, 2025</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-white mb-4">Everything your team needs</h2>
        <p className="text-center text-neutral-400 mb-12">Stop losing institutional knowledge to departing engineers and siloed tools</p>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(f => (
            <div key={f.title} className="bg-brand-surface border border-brand-border rounded-xl p-6 hover:border-primary-500/40 hover:shadow-card-hover transition-all duration-200">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-brand-border">
        <h2 className="text-3xl font-bold text-center text-white mb-4">Up and running in 5 minutes</h2>
        <p className="text-center text-neutral-400 mb-12">No agents to install, no data pipelines to configure</p>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map(s => (
            <div key={s.step} className="text-center">
              <div className="text-4xl font-bold text-primary-500/30 mb-3">{s.step}</div>
              <h3 className="font-semibold text-white mb-2">{s.title}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-brand-border">
        <h2 className="text-3xl font-bold text-center text-white mb-4">Simple pricing</h2>
        <p className="text-center text-neutral-400 mb-12">$50K+/year for Glean. Under $500/month for ArkBrain.</p>
        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="bg-brand-surface border border-brand-border rounded-xl p-6">
            <div className="text-lg font-semibold text-white mb-1">Starter</div>
            <div className="text-3xl font-bold text-white mb-4">Free</div>
            <ul className="space-y-2 text-sm text-neutral-400 mb-6">
              <li>✓ 1 workspace</li>
              <li>✓ 2 connectors</li>
              <li>✓ 1,000 documents indexed</li>
              <li>✓ 50 Q&A queries/month</li>
            </ul>
            <Link href="/register">
              <Button variant="secondary" className="w-full">Get started free</Button>
            </Link>
          </div>
          <div className="bg-brand-surface border border-primary-500/50 rounded-xl p-6 shadow-glow-sm">
            <div className="text-lg font-semibold text-white mb-1">Team</div>
            <div className="text-3xl font-bold text-white mb-1">$99<span className="text-lg font-normal text-neutral-400">/mo</span></div>
            <div className="text-sm text-neutral-500 mb-4">vs. Glean at $50K+/year</div>
            <ul className="space-y-2 text-sm text-neutral-400 mb-6">
              <li>✓ Unlimited workspaces</li>
              <li>✓ All 5 connectors</li>
              <li>✓ Unlimited documents</li>
              <li>✓ Unlimited Q&A</li>
              <li>✓ Priority support</li>
            </ul>
            <Link href="/register">
              <Button className="w-full">Start 14-day trial</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-brand-border text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Stop losing institutional knowledge</h2>
        <p className="text-neutral-400 mb-8">Connect your first repo in 60 seconds. No credit card required.</p>
        <Link href="/register">
          <Button size="lg" className="shadow-glow">Get started free →</Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-brand-border py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span>🧠</span>
            <span className="text-sm text-neutral-500">ArkBrain © 2026</span>
          </div>
          <div className="flex gap-6 text-sm text-neutral-500">
            <Link href="/register" className="hover:text-neutral-300 transition-colors">Sign up</Link>
            <Link href="/login" className="hover:text-neutral-300 transition-colors">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
