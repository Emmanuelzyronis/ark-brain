'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SettingsPage() {
  const router = useRouter()
  const { workspaces, logout } = useAuth()
  const workspace = workspaces[0]

  const [name, setName] = useState(workspace?.name || '')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workspace?.id) return
    setSaving(true)
    setError('')
    try {
      await api.patch(`/api/workspaces/${workspace.id}`, { name })
      setSuccess('Workspace updated successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!workspace?.id || deleteConfirm !== workspace.name) return
    setDeleting(true)
    try {
      await api.delete(`/api/workspaces/${workspace.id}`)
      logout()
      router.push('/register')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-neutral-400 text-sm mt-1">Manage your workspace configuration</p>
      </div>

      <Card>
        <div className="p-5 border-b border-brand-border">
          <h2 className="font-semibold text-white">Workspace</h2>
        </div>
        <CardBody>
          {success && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-success/10 border border-success/20 text-green-300 text-sm">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              id="name"
              label="Workspace name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <Button type="submit" loading={saving}>Save changes</Button>
          </form>
        </CardBody>
      </Card>

      {/* Danger zone */}
      <Card className="border-error/20">
        <div className="p-5 border-b border-error/20">
          <h2 className="font-semibold text-error">Danger Zone</h2>
        </div>
        <CardBody className="space-y-4">
          <p className="text-sm text-neutral-400">
            Permanently delete this workspace and all its data. This action cannot be undone.
          </p>
          <Input
            label={`Type "${workspace?.name}" to confirm`}
            placeholder={workspace?.name}
            value={deleteConfirm}
            onChange={e => setDeleteConfirm(e.target.value)}
          />
          <Button
            variant="danger"
            disabled={deleteConfirm !== workspace?.name}
            loading={deleting}
            onClick={handleDelete}
          >
            Delete workspace
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
