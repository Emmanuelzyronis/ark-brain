'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', workspace_name: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      await register(form.email, form.password, form.name, form.workspace_name)
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  return (
    <div className="min-h-screen bg-[#1C1033] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span className="text-2xl">🧠</span>
            <span className="font-bold text-lg text-white">ArkBrain</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-neutral-400 mt-1">Free forever on the Starter plan</p>
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-xl p-8">
          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="name"
              label="Full name"
              type="text"
              placeholder="Jane Smith"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              autoComplete="name"
            />
            <Input
              id="email"
              label="Work email"
              type="email"
              placeholder="jane@company.com"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              id="workspace_name"
              label="Workspace name"
              type="text"
              placeholder="Acme Engineering"
              value={form.workspace_name}
              onChange={e => update('workspace_name', e.target.value)}
              autoComplete="organization"
            />
            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={e => update('password', e.target.value)}
              required
              autoComplete="new-password"
            />
            <Button type="submit" className="w-full" loading={loading}>
              Create account →
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-400">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-400 hover:text-primary-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
