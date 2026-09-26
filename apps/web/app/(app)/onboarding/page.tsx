'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/toast'

const SOURCES = [
  { id: 'github', label: 'GitHub', desc: 'PRs, issues, commit messages', icon: '🐙', hint: 'Most teams start here' },
  { id: 'slack', label: 'Slack', desc: 'Messages, threads, channels', icon: '💬', hint: null },
  { id: 'notion', label: 'Notion', desc: 'Pages, databases, wikis', icon: '📄', hint: null },
  { id: 'confluence', label: 'Confluence', desc: 'Spaces, pages, comments', icon: '📑', hint: null },
  { id: 'gdrive', label: 'Google Drive', desc: 'Docs, Sheets, presentations', icon: '📁', hint: null },
]

const STEPS = ['Welcome', 'Connect a source', 'You\'re ready']

interface StepIndicatorProps {
  step: number
}

function StepIndicator({ step }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < step
                  ? 'bg-green-500 text-white'
                  : i === step
                  ? 'bg-primary-500 text-white'
                  : 'bg-brand-border text-neutral-500'
              }`}
            >
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? 'text-white' : 'text-neutral-500'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-px ${i < step ? 'bg-green-500/50' : 'bg-brand-border'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const { workspaces, user } = useAuth()
  const { toast } = useToast()
  const workspaceId = workspaces[0]?.id
  const workspaceName = workspaces[0]?.name

  const [step, setStep] = useState(0)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [connected, setConnected] = useState<string | null>(null)

  const handleDemoConnect = useCallback(async (source: string) => {
    if (!workspaceId) return
    setConnecting(source)
    try {
      await api.post(`/api/workspaces/${workspaceId}/connectors/${source}/demo`)
      const interval = setInterval(async () => {
        const connectors = await api.get<{ source: string; status: string }[]>(
          `/api/workspaces/${workspaceId}/connectors`
        )
        const c = connectors.find(x => x.source === source)
        if (c && (c.status === 'active' || c.status === 'error')) {
          clearInterval(interval)
          setConnecting(null)
          if (c.status === 'active') {
            setConnected(source)
            toast(`${source} connected — Claude is indexing your data`, 'success')
          } else {
            toast(`${source} connection failed — try another source`, 'error')
          }
        }
      }, 3000)
    } catch {
      setConnecting(null)
      toast('Connection failed. Try again.', 'error')
    }
  }, [workspaceId, toast])

  if (step === 0) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <StepIndicator step={0} />
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">👋</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          {workspaceName && (
            <p className="text-neutral-400">
              Your workspace <span className="text-white font-medium">{workspaceName}</span> is ready.
            </p>
          )}
        </div>

        <Card className="mb-6">
          <CardBody className="space-y-4">
            <p className="text-sm text-neutral-300 leading-relaxed">
              ArkBrain indexes your team&apos;s GitHub, Slack, Notion, and docs — then lets anyone
              ask <em className="text-white">&quot;Why did we build it this way?&quot;</em> and get a sourced answer
              with the exact PR comment or Slack thread.
            </p>
            <div className="space-y-3 pt-2">
              {[
                { icon: '🔗', text: 'Connect your sources (takes ~60 seconds with demo data)' },
                { icon: '🧠', text: 'Claude extracts decisions, entities, and rationale automatically' },
                { icon: '💬', text: 'Ask anything — get cited answers, not hallucinations' },
              ].map(item => (
                <div key={item.text} className="flex items-start gap-3">
                  <span className="text-lg shrink-0">{item.icon}</span>
                  <p className="text-sm text-neutral-400">{item.text}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Button className="w-full" size="lg" onClick={() => setStep(1)}>
          Connect your first source →
        </Button>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full mt-3 text-sm text-neutral-500 hover:text-neutral-300 transition-colors py-2"
        >
          Skip for now, go to dashboard
        </button>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <StepIndicator step={1} />
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Connect a source</h1>
          <p className="text-neutral-400 text-sm">
            Click &quot;Connect (Demo)&quot; to load sample data. Claude starts indexing immediately.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {SOURCES.map(source => {
            const isConnecting = connecting === source.id
            const isConnected = connected === source.id
            const isDisabled = !!connecting || !!connected

            return (
              <Card
                key={source.id}
                className={`transition-colors ${isConnected ? 'border-green-500/40 bg-green-950/10' : ''}`}
              >
                <CardBody>
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-2xl">{source.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white text-sm">{source.label}</h3>
                        {source.hint && (
                          <Badge variant="default" className="text-xs">{source.hint}</Badge>
                        )}
                        {isConnected && <Badge variant="success">Connected</Badge>}
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">{source.desc}</p>
                    </div>
                  </div>

                  {isConnecting && (
                    <div className="mb-3 space-y-1.5" role="status" aria-live="polite">
                      <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full shimmer" style={{ width: '65%' }} />
                      </div>
                      <p className="text-xs text-neutral-500">Claude is extracting decisions…</p>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant={isConnected ? 'secondary' : 'default'}
                    loading={isConnecting}
                    disabled={isDisabled && !isConnecting}
                    onClick={() => !isConnected && handleDemoConnect(source.id)}
                    className="w-full"
                  >
                    {isConnected ? '✓ Connected' : isConnecting ? 'Connecting…' : 'Connect (Demo)'}
                  </Button>
                </CardBody>
              </Card>
            )
          })}
        </div>

        {connected ? (
          <Button className="w-full" size="lg" onClick={() => setStep(2)}>
            Continue →
          </Button>
        ) : (
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full text-sm text-neutral-500 hover:text-neutral-300 transition-colors py-2"
          >
            I&apos;ll connect a source later
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-12 text-center">
      <StepIndicator step={2} />
      <div className="text-6xl mb-6">🎉</div>
      <h1 className="text-2xl font-bold text-white mb-3">You&apos;re all set</h1>
      <p className="text-neutral-400 mb-8">
        {connected
          ? `Claude is indexing your ${connected} data now. Your first answers will be ready in a minute.`
          : 'Connect a source any time from the Connectors page to start extracting decisions.'}
      </p>

      <Card className="mb-8 text-left">
        <CardBody>
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-medium mb-3">Try asking</p>
          <div className="space-y-2">
            {[
              'Why did we choose this database?',
              'What caused the last outage?',
              'Who owns the auth system?',
            ].map(q => (
              <div key={q} className="px-3 py-2 rounded-lg bg-brand-bg-subtle border border-brand-border text-sm text-neutral-300">
                {q}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Button size="lg" className="w-full shadow-glow" onClick={() => router.push('/chat')}>
        Ask your first question →
      </Button>
      <button
        onClick={() => router.push('/dashboard')}
        className="w-full mt-3 text-sm text-neutral-500 hover:text-neutral-300 transition-colors py-2"
      >
        Go to dashboard
      </button>
    </div>
  )
}
