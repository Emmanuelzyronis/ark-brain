'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Member {
  id: string
  user_id: string
  role: 'admin' | 'viewer'
  email: string
  name: string | null
  joined_at: string
}

export default function TeamPage() {
  const { workspaces, user } = useAuth()
  const workspaceId = workspaces[0]?.id
  const myRole = workspaces[0]?.role

  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'viewer' | 'admin'>('viewer')
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [error, setError] = useState('')

  const loadMembers = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const data = await api.get<Member[]>(`/api/workspaces/${workspaceId}/members`)
      setMembers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team members')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInviteSuccess('')
    if (!workspaceId || !inviteEmail) return
    setInviting(true)
    try {
      const res = await api.post<{ invite_url: string }>(`/api/workspaces/${workspaceId}/invites`, {
        email: inviteEmail,
        role: inviteRole,
      })
      setInviteSuccess(`Invite sent! Share this link: ${res.invite_url}`)
      setInviteEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (userId: string) => {
    if (!workspaceId || userId === user?.id) return
    if (!confirm('Remove this member?')) return
    try {
      await api.delete(`/api/workspaces/${workspaceId}/members/${userId}`)
      await loadMembers()
    } catch (err) {
      console.error(err)
    }
  }

  const handleRoleChange = async (userId: string, role: 'admin' | 'viewer') => {
    if (!workspaceId) return
    try {
      await api.patch(`/api/workspaces/${workspaceId}/members/${userId}`, { role })
      await loadMembers()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Team</h1>
        <p className="text-neutral-400 text-sm mt-1">Manage workspace members and permissions</p>
      </div>

      {/* Invite form (admin only) */}
      {myRole === 'admin' && (
        <Card>
          <div className="p-5 border-b border-brand-border">
            <h2 className="font-semibold text-white">Invite a teammate</h2>
          </div>
          <CardBody>
            {inviteSuccess && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-success/10 border border-success/20 text-green-300 text-sm break-all">
                {inviteSuccess}
              </div>
            )}
            {error && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'viewer' | 'admin')}
                className="px-3 py-2 rounded-lg text-sm bg-brand-bg-subtle border border-brand-border text-neutral-200 focus:outline-none focus:border-primary-500"
              >
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
              <Button type="submit" loading={inviting}>Send invite</Button>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Members list */}
      <Card>
        <div className="p-5 border-b border-brand-border">
          <h2 className="font-semibold text-white">{members.length} Members</h2>
        </div>
        <div className="divide-y divide-brand-border">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 shimmer rounded" />
                  <div className="h-3 w-48 shimmer rounded" />
                </div>
              </div>
            ))
          ) : (
            members.map(m => (
              <div key={m.id} className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-sm font-medium text-primary-300 shrink-0">
                  {m.name?.[0] || m.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{m.name || m.email}</p>
                  {m.name && <p className="text-xs text-neutral-500">{m.email}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {myRole === 'admin' && m.user_id !== user?.id ? (
                    <select
                      value={m.role}
                      onChange={e => handleRoleChange(m.user_id, e.target.value as 'admin' | 'viewer')}
                      className="text-xs px-2 py-1 rounded bg-brand-bg-subtle border border-brand-border text-neutral-300 focus:outline-none"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <Badge variant={m.role === 'admin' ? 'default' : 'info'}>{m.role}</Badge>
                  )}
                  {myRole === 'admin' && m.user_id !== user?.id && (
                    <button
                      onClick={() => handleRemove(m.user_id)}
                      className="text-xs text-neutral-600 hover:text-error transition-colors"
                      title="Remove member"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
