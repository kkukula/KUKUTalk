'use client'

import { useAuth } from '@/store/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ReactNode, useEffect } from 'react'

export default function AppLayout({ children }: { children: ReactNode }) {
  const { accessToken, user, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!accessToken) router.replace('/login')
  }, [accessToken, router])

  if (!accessToken) return null

  return (
    <div className="grid gap-4">
      <nav className="card flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <Link href="/app/dashboard">Pulpit</Link>
          <Link href="/app/chat">Czat</Link>
          {user?.role === 'TEACHER' && <Link href="/app/classrooms">Klasa</Link>}
        </div>
        <div className="text-sm flex items-center gap-2">
          <span className="opacity-70">{user?.displayName} ({user?.role})</span>
          <button className="btn" onClick={logout}>Wyloguj</button>
        </div>
      </nav>
      <div>{children}</div>
    </div>
  )
}
