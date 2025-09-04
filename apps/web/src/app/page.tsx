import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="grid md:grid-cols-2 gap-6 items-start">
      <section className="card">
        <h1 className="text-2xl font-bold mb-2">Witaj w KUKUTalk 👋</h1>
        <p>Bezpieczny komunikator dla dzieci 7–12 lat. Zaloguj się i rozpocznij rozmowę.</p>
        <div className="mt-4 flex gap-3">
          <Link href="/login" className="btn">Zaloguj</Link>
          <Link href="/app/chat" className="btn" aria-label="Przejdź do czatu">Przejdź do czatu</Link>
        </div>
        <p className="mt-2 text-sm text-gray-600">Demo konta znajdziesz po zseedowaniu bazy.</p>
      </section>
      <section className="card">
        <h2 className="text-xl font-semibold mb-2">Dla rodzica i nauczyciela</h2>
        <ul className="list-disc pl-5 space-y-1 text-gray-700">
          <li>Whitelist kontaktów (akceptacje rodzica)</li>
          <li>Klasa i ogłoszenia nauczyciela</li>
          <li>Moderacja treści (ALLOW/REVIEW/BLOCK)</li>
        </ul>
      </section>
    </div>
  )
}
