import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'KUKUTalk',
  description: 'Bezpieczny komunikator dla dzieci',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-extrabold text-xl">KUKUTalk</Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/login">Zaloguj</Link>
              <Link href="/app/dashboard">Pulpit</Link>
              <Link href="/app/chat">Czat</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
