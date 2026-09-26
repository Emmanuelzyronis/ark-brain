'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api'
import { Card, CardBody } from '@/components/ui/card'
import { formatRelativeTime, DECISION_TYPE_COLORS } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface Decision {
  id: string
  title: string
  rationale: string | null
  outcome: string | null
  decision_type: string
  confidence_score: number | null
  extracted_at: string
}

const TYPES = ['all', 'architecture', 'vendor', 'process', 'incident', 'product', 'security']

export default function TimelinePage() {
  const { workspaces } = useAuth()
  const workspaceId = workspaces[0]?.id
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)

  const loadDecisions = useCallback(async (p = 1, type = typeFilter) => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' })
      if (type !== 'all') params.set('type', type)
      const data = await api.get<{ data: Decision[]; has_more: boolean; total: number }>(
        `/api/workspaces/${workspaceId}/decisions?${params}`
      )
      if (p === 1) {
        setDecisions(data.data)
      } else {
        setDecisions(prev => [...prev, ...data.data])
      }
      setHasMore(data.has_more)
      setTotal(data.total)
      setPage(p)
    } catch {
      if (p === 1) setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [workspaceId, typeFilter])

  useEffect(() => {
    loadDecisions(1, typeFilter)
  }, [workspaceId, typeFilter, loadDecisions])

  const changeType = (t: string) => {
    setTypeFilter(t)
    loadDecisions(1, t)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Knowledge Timeline</h1>
          <p className="text-neutral-400 text-sm mt-1">{total} decisions extracted from your team&apos;s history</p>
        </div>
      </div>

      {/* Type filters */}
      <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter decisions by type">
        {TYPES.map(t => (
          <button
            key={t}
            onClick={() => changeType(t)}
            aria-pressed={typeFilter === t}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 capitalize min-h-[36px]
              ${typeFilter === t
                ? 'bg-primary-500/20 border-primary-500/50 text-primary-300'
                : 'bg-brand-surface border-brand-border text-neutral-400 hover:border-brand-border hover:text-neutral-200'
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Decisions */}
      <div className="space-y-4">
        {loadError ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-white mb-2">Failed to load decisions</h3>
            <p className="text-neutral-400 text-sm mb-6">Check your connection and try again.</p>
            <Button onClick={() => loadDecisions(1)}>Retry</Button>
          </div>
        ) : loading && page === 1 ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardBody className="space-y-3">
                <div className="h-4 w-24 shimmer rounded" />
                <div className="h-5 w-2/3 shimmer rounded" />
                <div className="h-3 w-full shimmer rounded" />
                <div className="h-3 w-3/4 shimmer rounded" />
              </CardBody>
            </Card>
          ))
        ) : decisions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-white mb-2">No decisions yet</h3>
            <p className="text-neutral-400 text-sm mb-6">Connect a source and Claude will extract decisions automatically</p>
            <Link href="/connectors">
              <Button>Connect a source</Button>
            </Link>
          </div>
        ) : (
          decisions.map(d => (
            <Link key={d.id} href={`/timeline/${d.id}`}>
              <Card className="hover:border-primary-500/40 hover:shadow-card-hover transition-all duration-200 cursor-pointer">
                <CardBody>
                  <div className="flex items-start gap-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border shrink-0 mt-0.5 ${DECISION_TYPE_COLORS[d.decision_type] || 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30'}`}
                    >
                      {d.decision_type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white leading-snug">{d.title}</h3>
                      {d.rationale && (
                        <p className="text-sm text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">{d.rationale}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-neutral-500">{formatRelativeTime(d.extracted_at)}</span>
                        {d.confidence_score && (
                          <span className="text-xs text-neutral-600">
                            {Math.round(d.confidence_score * 100)}% confidence
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))
        )}
      </div>

      {hasMore && (
        <div className="text-center">
          <Button variant="secondary" onClick={() => loadDecisions(page + 1)} loading={loading}>
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
