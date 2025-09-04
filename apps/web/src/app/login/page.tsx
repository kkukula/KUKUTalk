'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/store/auth'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const setAuth = useAuth(s => s.setAuth)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await api.login(username, password)
      setAuth({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user: res.user,
      })
      router.push('/app/chat')
    } catch (e: any) {
      setError(e.message || 'Błąd logowania')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto card">
      <h1 className="text-2xl font-bold mb-4">Zaloguj się</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className="text-sm">Nazwa użytkownika</span>
          <input className="input" value={username} onChange={e => setUsername(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm">Hasło</span>
          <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} required />
        </label>
        {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
        <button className="btn w-full" disabled={loading}>{loading ? '...' : 'Zaloguj'}</button>
      </form>
      <p className="text-xs text-gray-600 mt-3">
        Uwaga: to demo. Tokeny lądują w pamięci przeglądarki w runtime (Zustand).
      </p>
    </div>
  )
}
