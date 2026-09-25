'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

interface User {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  created_at: string
}

interface Workspace {
  id: string
  name: string
  slug: string
  role: string
}

interface AuthState {
  user: User | null
  workspaces: Workspace[]
  token: string | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    workspaces: [],
    token: null,
    loading: true,
  })

  const loadUser = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ark_token') : null
    if (!token) {
      setState(s => ({ ...s, loading: false }))
      return
    }

    try {
      const data = await api.get<{ user: User; workspaces: Workspace[] }>('/api/auth/me')
      setState({ user: data.user, workspaces: data.workspaces, token, loading: false })
    } catch {
      localStorage.removeItem('ark_token')
      setState({ user: null, workspaces: [], token: null, loading: false })
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = async (email: string, password: string) => {
    const data = await api.post<{ user: User; token: string }>('/api/auth/login', { email, password })
    localStorage.setItem('ark_token', data.token)
    setState({ user: data.user, workspaces: [], token: data.token, loading: false })
    // Load workspaces
    await loadUser()
    return data
  }

  const register = async (email: string, password: string, name?: string, workspace_name?: string) => {
    const data = await api.post<{ user: User; token: string }>('/api/auth/register', {
      email, password, name, workspace_name
    })
    localStorage.setItem('ark_token', data.token)
    setState({ user: data.user, workspaces: [], token: data.token, loading: false })
    await loadUser()
    return data
  }

  const logout = () => {
    localStorage.removeItem('ark_token')
    setState({ user: null, workspaces: [], token: null, loading: false })
  }

  return {
    ...state,
    login,
    register,
    logout,
    isAuthenticated: !!state.user,
  }
}
