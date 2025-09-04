export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function request(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    let detail: any = null
    try { detail = await res.json() } catch {}
    throw new Error(detail?.detail || detail?.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  register: (body: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (username: string, password: string) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: (token: string) => fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }).then(r => r.json()),
  conversations: (token: string) => fetch(`${API_URL}/conversations`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }).then(r => r.json()),
  messages: (token: string, id: string, take = 30) => fetch(`${API_URL}/conversations/${id}/messages?take=${take}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }).then(r => r.json()),
  sendMessage: (token: string, id: string, content: string) => request(`/conversations/${id}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ content }) }),
  parentSummary: (token: string) => fetch(`${API_URL}/parent/summary`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }).then(r => r.json()),
  parentAlerts: (token: string) => fetch(`${API_URL}/parent/alerts`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }).then(r => r.json()),
}
