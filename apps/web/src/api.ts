export const API_BASE =
  (import.meta as any)?.env?.VITE_API_BASE || 'http://localhost:3001';

export function getToken(): string | null {
  return localStorage.getItem('accessToken');
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem('accessToken', token);
  else localStorage.removeItem('accessToken');
}

type JSONLike = Record<string, any>;
async function apiFetch<T = any>(
  path: string,
  init: RequestInit = {},
  token = getToken()
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as any),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  return (ct.includes('application/json') ? res.json() : (res.text() as any)) as T;
}

export const auth = {
  async login(username: string, password: string) {
    return apiFetch<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  async me() {
    return apiFetch('/auth/me', { method: 'GET' });
  },
};

export type ConversationSummary = {
  id: string;
  lastMessageAt: string | null;
  name?: string | null;
};

export type MessageItem = {
  id: string;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FLAGGED' | 'DELETED';
  conversationId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string | null;
};

export const chat = {
  listConversations() {
    return apiFetch<{ items: ConversationSummary[] }>('/conversations', { method: 'GET' });
  },
  listMessages(conversationId: string, cursor?: string, take = 30) {
    const q = new URLSearchParams();
    if (cursor) q.set('cursor', cursor);
    q.set('take', String(take));
    const qs = q.toString();
    return apiFetch<{ items: MessageItem[]; nextCursor: string | null }>(
      `/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`,
      { method: 'GET' },
    );
  },
  sendMessage(conversationId: string, content: string) {
    return apiFetch<MessageItem>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },
};

/* ---- patch: auth helpers ---- */
let __unauthHandler: ((status:number)=>void) | null = null;
export function setUnauthorizedHandler(fn: (status:number)=>void) { __unauthHandler = fn; }
export function getUnauthorizedHandler() { return __unauthHandler; }
export function clearToken(): void {
  try { localStorage.removeItem("accessToken"); } catch {}
}
/* ---- end patch ---- */

