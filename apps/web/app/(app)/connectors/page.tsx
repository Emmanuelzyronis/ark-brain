'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime, SOURCE_ICONS } from '@/lib/utils'

interface Connector {
  id: string
  source: string
  status: string
  last_synced_at: string | null
  error_message: string | null
  metadata: Record<string, unknown> | null
}

const SOURCES = [
  { id: 'github', label: 'GitHub', desc: 'PRs, issues, commit messages', icon: '🐙' },
  { id: 'slack', label: 'Slack', desc: 'Messages, threads, channels', icon: '💬' },
  { id: 'notion', label: 'Notion', desc: 'Pages, databases, wikis', icon: '📄' },
  { id: 'confluence', label: 'Confluence', desc: 'Spaces, pages, comments', icon: '📑' },
  { id: 'gdrive', label: 'Google Drive', desc: 'Docs, Sheets, presentations', icon: '📁' },
]

export default function ConnectorsPage() {
  const { workspaces } = useAuth()
  const workspaceId = workspaces[0]?.id
  const [connectors, setConnectors] = useState<Connector[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)

  const loadConnectors = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const data = await api.get<Connector[]>(`/api/workspaces/${workspaceId}/connectors`)
      setConnectors(data)
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    loadConnectors()
  }, [loadConnectors])

  const handleDemoConnect = async (source: string) => {
    if (!workspaceId) return
    setConnecting(source)
    try {
      await api.post(`/api/workspaces/${workspaceId}/connectors/${source}/demo`)
      await loadConnectors()
      // Poll for completion
      const interval = setInterval(async () => {
        await loadConnectors()
        const c = await api.get<Connector[]>(`/api/workspaces/${workspaceId}/connectors`)
        const connector = c.find(x => x.source === source)
        if (connector && (connector.status === 'active' || connector.status === 'error')) {
          clearInterval(interval)
          setConnecting(null)
        }
      }, 3000)
    } catch (err) {
      console.error(err)
      setConnecting(null)
    }
  }

  const handleSync = async (source: string) => {
    if (!workspaceId) return
    setSyncing(source)
    try {
      await api.post(`/api/workspaces/${workspaceId}/connectors/${source}/sync`)
      setTimeout(loadConnectors, 2000)
    } catch (err) {
      console.error(err)
    } finally {
      setTimeout(() => setSyncing(null), 3000)
    }
  }

  const handleDisconnect = async (source: string) => {
    if (!workspaceId || !confirm(`Disconnect ${source}? Your indexed data will be kept.`)) return
    try {
      await api.delete(`/api/workspaces/${workspaceId}/connectors/${source}`)
      await loadConnectors()
    } catch (err) {
      console.error(err)
    }
  }

  const connectorMap = new Map(connectors.map(c => [c.source, c]))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Connectors</h1>
        <p className="text-neutral-400 text-sm mt-1">Connect your team&apos;s knowledge sources</p>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardBody className="space-y-3">
                <div className="h-6 w-20 shimmer rounded" />
                <div className="h-4 w-32 shimmer rounded" />
                <div className="h-8 w-24 shimmer rounded" />
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {SOURCES.map(source => {
            const connector = connectorMap.get(source.id)
            const isConnecting = connecting === source.id
            const isSyncing = syncing === source.id

            return (
              <Card
                key={source.id}
                className={connector?.status === 'active' ? 'border-success/30' : ''}
              >
                <CardBody>
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{source.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-semibold text-white">{source.label}</h3>
                        {connector && (
                          <Badge
                            variant={
                              connector.status === 'active' ? 'success' :
                              connector.status === 'error' ? 'error' :
                              connector.status === 'connecting' ? 'warning' : 'default'
                            }
                          >
                            {connector.status}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">{source.desc}</p>

                      {connector?.last_synced_at && (
                        <p className="text-xs text-neutral-500 mt-1">
                          Last synced {formatRelativeTime(connector.last_synced_at)}
                        </p>
                      )}

                      {connector?.error_message && (
                        <p className="text-xs text-error mt-1 truncate">{connector.error_message}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {!connector || connector.status === 'disconnected' ? (
                      <Button
                        size="sm"
                        loading={isConnecting}
                        onClick={() => handleDemoConnect(source.id)}
                      >
                        {isConnecting ? 'Connecting...' : 'Connect (Demo)'}
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={isSyncing || connector.status === 'connecting'}
                          onClick={() => handleSync(source.id)}
                        >
                          {isSyncing ? 'Syncing...' : 'Re-sync'}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDisconnect(source.id)}
                        >
                          Disconnect
                        </Button>
                      </>
                    )}
                  </div>

                  {(isConnecting || connector?.status === 'connecting') && (
                    <div className="mt-3 space-y-1.5" role="status" aria-live="polite">
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>Indexing documents...</span>
                      </div>
                      <div className="h-1.5 bg-brand-border rounded-full overflow-hidden" role="progressbar" aria-label={`Connecting ${source.label}`} aria-valuemin={0} aria-valuemax={100}>
                        <div className="h-full bg-primary-500 rounded-full shimmer" style={{ width: '60%' }} />
                      </div>
                      <p className="text-xs text-neutral-600">Claude is extracting decisions and entities</p>
                    </div>
                  )}
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      <Card className="border-accent/20 bg-accent/5">
        <CardBody>
          <div className="flex gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="text-sm font-medium text-white">Demo mode</p>
              <p className="text-sm text-neutral-400 mt-0.5">
                Click &quot;Connect (Demo)&quot; to load sample data from each source. Claude will extract real decisions
                and entities so you can explore the chat interface immediately.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
