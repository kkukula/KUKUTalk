'use client'

import { useAuth } from '@/store/auth'

export default function ClassroomsPage() {
  const { user } = useAuth()
  if (user?.role !== 'TEACHER') {
    return <div className="card">Dostępne tylko dla nauczyciela.</div>
  }
  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-2">Konsola nauczyciela</h2>
      <p className="text-sm">Tworzenie klasy i zaproszenia dostępne w API — UI do rozbudowy.</p>
    </div>
  )
}
