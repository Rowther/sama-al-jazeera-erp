import { create } from 'zustand'
import { api } from '@/lib/api'
import type { Role } from '@/types'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  avatar?: string
  phone?: string
}

const storage = typeof window !== 'undefined' ? localStorage : null

function decodeJWTPayload(token: string): { userId: string; email: string; role: string; exp?: number } | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return decoded
  } catch {
    return null
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJWTPayload(token)
  if (!payload || !payload.exp) return true
  return Date.now() >= payload.exp * 1000
}

interface AuthState {
  user: User | null
  token: string | null
  sessionId: string | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; name: string; role: Role; phone?: string }) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  updateUser: (data: { name?: string; email?: string; phone?: string }) => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  sessionId: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.post<{ user: User; token: string; sessionId: string }>('/auth/login', { email, password })
      storage?.setItem('token', res.token)
      storage?.setItem('sessionId', res.sessionId)
      set({ user: res.user, token: res.token, sessionId: res.sessionId, isAuthenticated: true, isLoading: false, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      storage?.removeItem('token')
      storage?.removeItem('sessionId')
      set({ user: null, token: null, sessionId: null, isAuthenticated: false, isLoading: false, error: message })
      throw err
    }
  },

  register: async (data: { email: string; password: string; name: string; role: Role; phone?: string }) => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.post<{ user: User; token: string; sessionId: string }>('/auth/register', data)
      storage?.setItem('token', res.token)
      storage?.setItem('sessionId', res.sessionId)
      set({ user: res.user, token: res.token, sessionId: res.sessionId, isAuthenticated: true, isLoading: false, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      set({ isLoading: false, error: message })
      throw err
    }
  },

  logout: () => {
    storage?.removeItem('token')
    storage?.removeItem('sessionId')
    set({ user: null, token: null, sessionId: null, isAuthenticated: false, isLoading: false, error: null })
  },

  checkAuth: async () => {
    const token = storage?.getItem('token')
    const sessionId = storage?.getItem('sessionId')
    if (!token) {
      set({ isLoading: false, isAuthenticated: false })
      return
    }

    if (isTokenExpired(token)) {
      storage?.removeItem('token')
      storage?.removeItem('sessionId')
      set({ isLoading: false, isAuthenticated: false })
      return
    }

    if (get().isAuthenticated && get().user) {
      set({ isLoading: false })
      return
    }

    try {
      const res = await api.get<{ user: User }>('/auth/me')
      set({ user: res.user, token, sessionId, isAuthenticated: true, isLoading: false, error: null })
    } catch {
      storage?.removeItem('token')
      storage?.removeItem('sessionId')
      set({ user: null, token: null, sessionId: null, isAuthenticated: false, isLoading: false, error: null })
    }
  },

  updateUser: async (data: { name?: string; email?: string; phone?: string }) => {
    try {
      const res = await api.put<{ user: User }>('/auth/profile', data)
      set({ user: res.user })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      set({ error: message })
      throw err
    }
  },

  clearError: () => set({ error: null }),
}))