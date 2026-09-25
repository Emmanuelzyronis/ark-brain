'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate, DECISION_TYPE_COLORS, SOURCE_ICONS } from '@/lib/utils'

interface DecisionDetail {
  id: string
  title: string
  rationale: string | null
  outcome: string | null
  decision_type: string
  confidence_score: number | null
  extracted_at: string
  sources: Array<{
    id: string
    document_id: string
    excerpt: string | null
    relevance_score: number | null
    title: string | null
    external_url: string | null
    source: string
    author_name: string | null
    published_at: string | null
  }>
}

export default function DecisionDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { workspaces } = useAuth()
  const workspaceId = workspaces[0]?.id

  const [decision, setDecision] = useState<DecisionDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const loadDecision = useCallback(async () => {
    if (!workspaceId || !id) return
    setLoading(true)
    try {
      const data = await api.get<DecisionDetail>(`/api/workspaces/${workspaceId}/decisions/${id}`)
      setDecision(data)
    } catch {
      router.push('/timeline')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, id, router])

  useEffect(() => {
    loadDecision()
  }, [loadDecision])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-2/3 shimmer rounded" />
        <div className="h-4 w-32 shimmer rounded" />
        <div className="h-32 w-full shimmer rounded-xl" />
      </div>
    )
  }

  if (!decision) return null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/timeline">
          <Button variant="ghost" size="sm">← Back</Button>
        </Link>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${DECISION_TYPE_COLORS[decision.decision_type] || ''}`}
        >
          {decision.decision_type}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">{decision.title}</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Extracted {formatDate(decision.extracted_at)}
          {decision.confidence_score && ` · ${Math.round(decision.confidence_score * 100)}% confidence`}
        </p>
      </div>

      {decision.rationale && (
        <Card>
          <div className="p-5 border-b border-brand-border">
            <h2 className="font-semibold text-white">Rationale</h2>
          </div>
          <CardBody>
            <p className="text-neutral-300 leading-relaxed">{decision.rationale}</p>
          </CardBody>
        </Card>
      )}

      {decision.outcome && (
        <Card>
          <div className="p-5 border-b border-brand-border">
            <h2 className="font-semibold text-white">Outcome</h2>
          </div>
          <CardBody>
            <p className="text-neutral-300 leading-relaxed">{decision.outcome}</p>
          </CardBody>
        </Card>
      )}

      {decision.sources && decision.sources.length > 0 && (
        <Card>
          <div className="p-5 border-b border-brand-border">
            <h2 className="font-semibold text-white">Source Documents</h2>
          </div>
          <div className="divide-y divide-brand-border">
            {decision.sources.map(s => (
              <div key={s.id} className="p-5">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{SOURCE_ICONS[s.source] || '📄'}</span>
                  <div className="flex-1">
                    <p className="font-medium text-white text-sm">{s.title || 'Untitled'}</p>
                    {s.author_name && (
                      <p className="text-xs text-neutral-500">By {s.author_name}</p>
                    )}
                    {s.published_at && (
                      <p className="text-xs text-neutral-500">{formatDate(s.published_at)}</p>
                    )}
                    {s.excerpt && (
                      <blockquote className="mt-2 text-sm text-neutral-400 italic border-l-2 border-primary-500/40 pl-3">
                        &quot;{s.excerpt}&quot;
                      </blockquote>
                    )}
                    {s.external_url && (
                      <a
                        href={s.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80"
                      >
                        Open original ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex justify-center">
        <Link href={`/chat?q=${encodeURIComponent(`Tell me more about: ${decision.title}`)}`}>
          <Button>Ask ArkBrain about this decision →</Button>
        </Link>
      </div>
    </div>
  )
}
