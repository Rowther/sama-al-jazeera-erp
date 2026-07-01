const API_BASE = '/api'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

function getSessionId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('sessionId')
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const sessionId = getSessionId()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(sessionId ? { 'x-session-id': sessionId } : {}),
    ...options.headers,
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'An error occurred' }))
    throw new Error(error.message || `HTTP ${res.status}`)
  }

  return res.json()
}

export const api = {
  get: <T>(url: string) => apiClient<T>(url),
  post: <T>(url: string, data?: any) =>
    apiClient<T>(url, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(url: string, data?: any) =>
    apiClient<T>(url, { method: 'PUT', body: JSON.stringify(data) }),
  patch: <T>(url: string, data?: any) =>
    apiClient<T>(url, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(url: string) => apiClient<T>(url, { method: 'DELETE' }),
  upload: <T>(url: string, formData: FormData) => {
    const token = getToken()
    const sessionId = getSessionId()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (sessionId) headers['x-session-id'] = sessionId
    return fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(res => res.json()) as Promise<T>
  },
}
