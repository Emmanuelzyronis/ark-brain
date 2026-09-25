'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api'
import { formatRelativeTime, DECISION_TYPE_COLORS, SOURCE_ICONS } from '@/lib/utils'

interface Stats {
  document_count: number
  decision_count: number
  entity_count: number
  connector_count: number
  last_sync_at: string | null
}

interface Decision {
  id: string
  title: string
  decision_type: string
  rationale: string | null
  extracted_at: string
}

interface Connector {
  id: string
  source: string
  status: string
  last_synced_at: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const { workspaces } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [loading, setLoading] = useState(true)

  const workspaceId = workspaces[0]?.id

  const loadData = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const [statsData, decisionsData, connectorsData] = await Promise.all([
        api.get<Stats>(`/api/workspaces/${workspaceId}/stats`),
        api.get<{ data: Decision[] }>(`/api/workspaces/${workspaceId}/decisions?limit=5`),
        api.get<Connector[]>(`/api/workspaces/${workspaceId}/connectors`),
      ])
      setStats(statsData)
      setDecisions(decisionsData.data || [])
      setConnectors(connectorsData)
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAsk = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const input = form.elements.namedItem('question') as HTMLInputElement
    if (input.value.trim()) {
      router.push(`/chat?q=${encodeURIComponent(input.value.trim())}`)
    }
  }

  if (!workspaceId && !loading) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-5xl mb-4">🧠</div>
        <h2 className="text-xl font-bold text-white mb-2">No workspace yet</h2>
        <p className="text-neutral-400 mb-6">Create a workspace to get started with ArkBrain</p>
        <Button onClick={() => router.push('/register')}>Create workspace</Button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-neutral-400 text-sm mt-1">Your team&apos;s institutional knowledge at a glance</p>
      </div>

      {/* Quick ask */}
      <Card className="border-primary-500/30 shadow-glow-sm">
        <CardBody>
          <form onSubmit={handleAsk} className="flex gap-3">
            <label htmlFor="dashboard-question" className="sr-only">
              Ask a question about your team&apos;s knowledge
            </label>
            <input
              id="dashboard-question"
              name="question"
              placeholder="Ask anything... Why did we choose Postgres? What caused the Nov outage?"
              className="flex-1 bg-brand-bg-subtle border border-brand-border rounded-lg px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 min-h-[44px]"
            />
            <Button type="submit">Ask →</Button>
          </form>
          <p className="mt-2 text-xs text-neutral-500">Press Enter or click Ask to open the chat interface</p>
        </CardBody>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Documents', value: stats?.document_count ?? 0, icon: '📄' },
          { label: 'Decisions', value: stats?.decision_count ?? 0, icon: '🎯' },
          { label: 'Entities', value: stats?.entity_count ?? 0, icon: '🔗' },
          { label: 'Connectors', value: stats?.connector_count ?? 0, icon: '⚡' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardBody className="p-4">
              {loading ? (
                <div className="space-y-2">
                  <div className="h-4 w-8 shimmer rounded" />
                  <div className="h-6 w-12 shimmer rounded" />
                </div>
              ) : (
                <>
                  <div className="text-xl mb-1">{stat.icon}</div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-neutral-500">{stat.label}</div>
                </>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Connectors */}
        <Card>
          <div className="p-5 border-b border-brand-border flex items-center justify-between">
            <h2 className="font-semibold text-white">Connectors</h2>
            <Link href="/connectors">
              <Button variant="ghost" size="sm">Manage →</Button>
            </Link>
          </div>
          <CardBody className="space-y-3">
            {connectors.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-neutral-500 text-sm mb-3">No connectors yet</p>
                <Link href="/connectors">
                  <Button size="sm">Connect a source</Button>
                </Link>
              </div>
            ) : (
              connectors.map(c => (
                <div key={c.id} className="flex items-center gap-3 py-2">
                  <span className="text-xl">{SOURCE_ICONS[c.source] || '📦'}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white capitalize">{c.source}</p>
                    <p className="text-xs text-neutral-500">
                      {c.last_synced_at ? `Synced ${formatRelativeTime(c.last_synced_at)}` : 'Never synced'}
                    </p>
                  </div>
                  <Badge
                    variant={c.status === 'active' ? 'success' : c.status === 'error' ? 'error' : 'warning'}
                  >
                    {c.status}
                  </Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* Recent decisions */}
        <Card>
          <div className="p-5 border-b border-brand-border flex items-center justify-between">
            <h2 className="font-semibold text-white">Recent Decisions</h2>
            <Link href="/timeline">
              <Button variant="ghost" size="sm">View all →</Button>
            </Link>
          </div>
          <CardBody className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2 py-2">
                  <div className="h-4 w-3/4 shimmer rounded" />
                  <div className="h-3 w-1/4 shimmer rounded" />
                </div>
              ))
            ) : decisions.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-neutral-500 text-sm">No decisions extracted yet.</p>
                <p className="text-neutral-600 text-xs mt-1">Connect a source to get started.</p>
              </div>
            ) : (
              decisions.map(d => (
                <Link
                  key={d.id}
                  href={`/timeline/${d.id}`}
                  className="block py-2 hover:bg-brand-bg-subtle rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shrink-0 mt-0.5 ${DECISION_TYPE_COLORS[d.decision_type] || ''}`}
                    >
                      {d.decision_type}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-200 mt-1 line-clamp-1">{d.title}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{formatRelativeTime(d.extracted_at)}</p>
                </Link>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
