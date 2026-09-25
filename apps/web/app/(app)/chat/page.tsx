'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api'
import { cn, formatRelativeTime, SOURCE_ICONS } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  citations?: Citation[]
}

interface Citation {
  citation_order: number
  document_id: string
  excerpt: string | null
  document_title: string | null
  document_url: string | null
  document_source: string
  document_author: string | null
  document_date: string | null
}

interface Session {
  id: string
  title: string | null
  created_at: string
  message_count: number
}

function ChatContent() {
  const searchParams = useSearchParams()
  const { workspaces } = useAuth()
  const workspaceId = workspaces[0]?.id

  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState(searchParams?.get('q') || '')
  const [sending, setSending] = useState(false)
  const [selectedCitation, setSelectedCitation] = useState<Citation[] | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadSessions = useCallback(async () => {
    if (!workspaceId) return
    try {
      const data = await api.get<Session[]>(`/api/workspaces/${workspaceId}/chat/sessions`)
      setSessions(data)
    } catch {
      // ignore
    }
  }, [workspaceId])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startSession = async () => {
    if (!workspaceId) return null
    const session = await api.post<Session>(`/api/workspaces/${workspaceId}/chat/sessions`)
    setCurrentSessionId(session.id)
    setMessages([])
    setSessions(prev => [session, ...prev])
    return session.id
  }

  const loadSession = async (sessionId: string) => {
    if (!workspaceId) return
    setCurrentSessionId(sessionId)
    const data = await api.get<{ session: Session; messages: Message[] }>(
      `/api/workspaces/${workspaceId}/chat/sessions/${sessionId}`
    )
    setMessages(data.messages)
    setSidebarOpen(false)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending || !workspaceId) return

    const question = input.trim()
    setInput('')
    setSending(true)

    let sessionId = currentSessionId
    if (!sessionId) {
      sessionId = await startSession()
      if (!sessionId) { setSending(false); return }
    }

    // Optimistic user message
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])

    try {
      const response = await api.post<Message>(
        `/api/workspaces/${workspaceId}/chat/sessions/${sessionId}/messages`,
        { content: question }
      )
      setMessages(prev => [...prev, { ...response, role: 'assistant' }])
      loadSessions()
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Failed to get response'}`,
        created_at: new Date().toISOString(),
      }])
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      sendMessage(e as unknown as React.FormEvent)
    }
  }

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!workspaceId) return
    await api.delete(`/api/workspaces/${workspaceId}/chat/sessions/${sessionId}`)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null)
      setMessages([])
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem-1.5rem)] -m-6 overflow-hidden">
      {/* Session sidebar */}
      <aside className={cn(
        'w-64 bg-brand-surface border-r border-brand-border flex flex-col shrink-0',
        'max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-20 max-md:transform max-md:transition-transform',
        sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
      )}>
        <div className="p-4 border-b border-brand-border">
          <Button
            className="w-full"
            size="sm"
            onClick={async () => { await startSession() }}
          >
            + New chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => loadSession(s.id)}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-lg text-sm group transition-colors',
                currentSessionId === s.id
                  ? 'bg-primary-500/15 text-primary-300'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-brand-bg-subtle'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate">{s.title || 'New conversation'}</span>
                <button
                  type="button"
                  onClick={(e) => deleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-error text-xs p-1 rounded min-h-[28px] min-w-[28px] flex items-center justify-center"
                  aria-label={`Delete conversation: ${s.title || 'New conversation'}`}
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-neutral-600 mt-0.5">{formatRelativeTime(s.created_at)}</p>
            </button>
          ))}
        </div>
      </aside>

      {/* Messages */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#1C1033]">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-brand-border">
          <button
            className="md:hidden text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-brand-bg-subtle min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Close conversation history' : 'Open conversation history'}
            aria-expanded={sidebarOpen}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <h2 className="text-sm font-medium text-neutral-300">
            {currentSessionId ? 'Chat session' : 'New conversation'}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-5xl mb-4">🧠</div>
              <h3 className="text-lg font-semibold text-white mb-2">Ask your team&apos;s institutional memory</h3>
              <p className="text-neutral-400 text-sm max-w-sm">
                Try: &quot;Why did we choose Postgres?&quot; or &quot;What caused the Nov 2024 outage?&quot;
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2 w-full max-w-sm">
                {[
                  'Why did we choose PostgreSQL over MongoDB?',
                  'What authentication library do we use and why?',
                  'What was the root cause of the database outage?',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="px-4 py-2.5 text-left text-sm text-neutral-400 bg-brand-surface border border-brand-border rounded-lg hover:border-primary-500/40 hover:text-neutral-200 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-sm shrink-0">
                  🧠
                </div>
              )}

              <div className={cn(
                'max-w-2xl rounded-xl px-4 py-3 text-sm',
                msg.role === 'user'
                  ? 'bg-primary-500/20 border border-primary-500/30 text-neutral-100'
                  : 'bg-brand-surface border border-brand-border text-neutral-200'
              )}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-brand-border">
                    <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-2">Sources</p>
                    <div className="space-y-1.5">
                      {msg.citations.map(c => (
                        <div key={c.citation_order} className="flex items-start gap-2">
                          <span className="inline-flex items-center justify-center w-4 h-4 text-xs bg-primary-500/30 text-primary-300 rounded-full shrink-0 mt-0.5">
                            {c.citation_order}
                          </span>
                          <div>
                            <button
                              onClick={() => setSelectedCitation(msg.citations || [])}
                              className="text-xs text-accent hover:text-accent/80 text-left"
                            >
                              {SOURCE_ICONS[c.document_source] || '📄'} {c.document_title || c.document_source}
                              {c.document_author && ` · ${c.document_author}`}
                              {c.document_date && ` · ${new Date(c.document_date).toLocaleDateString()}`}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-sm shrink-0">
                  You
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-sm shrink-0">🧠</div>
              <div className="bg-brand-surface border border-brand-border rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-brand-border">
          <form onSubmit={sendMessage} className="flex gap-3">
            <label htmlFor="chat-input" className="sr-only">Ask a question</label>
            <textarea
              id="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your team's decisions..."
              rows={1}
              className="flex-1 resize-none bg-brand-surface border border-brand-border rounded-lg px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all max-h-32 overflow-y-auto"
            />
            <Button type="submit" loading={sending} disabled={!input.trim()}>
              Send
            </Button>
          </form>
          <p className="mt-1.5 text-xs text-neutral-600">Ctrl+Enter or Cmd+Enter to send</p>
        </div>
      </div>

      {/* Citation panel */}
      {selectedCitation && (
        <aside className="w-80 border-l border-brand-border bg-brand-surface flex flex-col shrink-0 animate-slide-in-right">
          <div className="p-4 border-b border-brand-border flex items-center justify-between">
            <h3 className="font-medium text-white text-sm">Sources</h3>
            <button onClick={() => setSelectedCitation(null)} className="text-neutral-500 hover:text-white p-1.5 rounded hover:bg-brand-bg-subtle min-h-[36px] min-w-[36px] flex items-center justify-center" aria-label="Close sources panel">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedCitation.map(c => (
              <div key={c.citation_order} className="bg-brand-bg-subtle rounded-lg p-4 border border-brand-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{SOURCE_ICONS[c.document_source] || '📄'}</span>
                  <span className="text-xs font-medium text-neutral-300">{c.document_source}</span>
                </div>
                <p className="text-sm font-medium text-white mb-1">{c.document_title || 'Untitled'}</p>
                {c.document_author && <p className="text-xs text-neutral-500 mb-1">By {c.document_author}</p>}
                {c.document_date && <p className="text-xs text-neutral-500 mb-3">{new Date(c.document_date).toLocaleDateString()}</p>}
                {c.excerpt && (
                  <p className="text-xs text-neutral-400 italic leading-relaxed border-l-2 border-primary-500/40 pl-3">
                    &quot;{c.excerpt}&quot;
                  </p>
                )}
                {c.document_url && (
                  <a
                    href={c.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                  >
                    Open original ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatContent />
    </Suspense>
  )
}
