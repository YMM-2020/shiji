import { useState, useCallback, useEffect } from 'react'

interface User {
  id: string
  phone: string
  createdAt: string
  lastLoginAt: string
}

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
}

function loadAuth(): AuthState {
  try {
    const raw = localStorage.getItem('ai-auth')
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { token: null, user: null, loading: false }
}

function saveAuth(state: AuthState) {
  localStorage.setItem('ai-auth', JSON.stringify(state))
}

export function getAuthToken(): string | null {
  return loadAuth().token
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(loadAuth)

  // Verify token on mount
  useEffect(() => {
    if (!state.token) {
      setState((s) => ({ ...s, loading: false }))
      return
    }
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${state.token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setState((s) => ({ ...s, user: data.user, loading: false }))
        } else {
          setState({ token: null, user: null, loading: false })
          localStorage.removeItem('ai-auth')
        }
      })
      .catch(() => {
        setState({ token: null, user: null, loading: false })
        localStorage.removeItem('ai-auth')
      })
  }, [state.token])

  const sendCode = useCallback(async (phone: string) => {
    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    return res.json()
  }, [])

  const login = useCallback(async (phone: string, code: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    })
    const data = await res.json()
    if (data.ok) {
      const newState: AuthState = { token: data.token, user: { id: data.userId, phone: data.phone, createdAt: '', lastLoginAt: '' }, loading: false }
      saveAuth(newState)
      setState(newState)
      return { ok: true }
    }
    return { ok: false, error: data.error || '登录失败' }
  }, [])

  const logout = useCallback(() => {
    const uid = state.user?.id
    setState({ token: null, user: null, loading: false })
    localStorage.removeItem('ai-auth')
    if (uid) {
      localStorage.removeItem(`ai-memories-${uid}`)
      localStorage.removeItem(`ai-chat-${uid}`)
    }
  }, [state.user?.id])

  return {
    user: state.user,
    token: state.token,
    loading: state.loading,
    isLoggedIn: !!state.token && !!state.user,
    sendCode,
    login,
    logout,
  }
}
