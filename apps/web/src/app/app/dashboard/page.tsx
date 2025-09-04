'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/store/auth'
import { api } from '@/lib/api'

export default function DashboardPage() {
  const { accessToken, user } = useAuth()
  const [data, setData] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    if (user?.role === 'PARENT') {
      api.parentSummary(accessToken).then(setData).catch((e) => setError(String(e)))
    } else {
      setData({})
    }
  }, [accessToken, user?.role])

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card">
        <h2 className="text-xl font-bold mb-2">Witamy, {user?.displayName}</h2>
        <p>Rola: {user?.role}</p>
      </section>

      {user?.role === 'PARENT' && (
        <section className="card">
          <h3 className="font-semibold mb-2">Skrót (dzieci i prośby)</h3>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {!data && <p>Ładowanie…</p>}
          {data && (
            <div className="text-sm space-y-2">
              <div><strong>Dzieci:</strong> {data.children?.map((c:any)=>c.displayName).join(', ') || '—'}</div>
              <div><strong>Prośby:</strong> {data.pendingContacts?.length || 0}</div>
              <div><strong>Alerty moderacji:</strong> {data.openFlags?.length || 0}</div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
