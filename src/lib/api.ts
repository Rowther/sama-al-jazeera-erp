const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(res => res.json()) as Promise<T>
  },
}
