'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/store/auth'
import { api } from '@/lib/api'
import { createSocket } from '@/lib/socket'

export default function ChatPage() {
  const { accessToken } = useAuth()
  const [conversations, setConversations] = useState<any[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!accessToken) return
    api.conversations(accessToken).then(setConversations)
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return
    const s = createSocket(accessToken)
    socketRef.current = s

    s.on('message:new', (m) => {
      if (m.conversationId === activeId) setMessages((prev) => [...prev, m])
    })
    s.on('moderation:notice', (p) => {
      if (p.conversationId === activeId) {
        // toast substitute:
        console.log('🔔 moderation:', p)
      }
    })
    s.on('moderation:blocked', (p) => {
      console.log('⛔ blocked:', p)
    })

    return () => {
      s.disconnect()
      socketRef.current = null
    }
  }, [accessToken, activeId])

  useEffect(() => {
    if (!accessToken || !activeId) return
    api.messages(accessToken, activeId).then((data) => setMessages(data.reverse()))
    const s = socketRef.current
    s?.emit('rooms:join', { conversationId: activeId })
    return () => { s?.emit('rooms:leave', { conversationId: activeId }) }
  }, [accessToken, activeId])

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!accessToken || !activeId || !input.trim()) return
    const temp = { id: 'temp-' + Date.now(), content: input, senderId: 'me', createdAt: new Date().toISOString(), status: 'REVIEW', conversationId: activeId }
    setMessages((prev) => [...prev, temp])
    setInput('')
    try {
      await api.sendMessage(accessToken, activeId, temp.content)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-4">
      <aside className="card h-[70vh] overflow-auto">
        <h2 className="font-semibold mb-2">Rozmowy</h2>
        <ul className="space-y-1">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left px-3 py-2 rounded-xl ${activeId===c.id?'bg-brand-50':'hover:bg-gray-100'}`}
              >
                <div className="font-medium text-sm">{c.type === 'CLASS' ? 'Klasa' : 'Rozmowa'}</div>
                <div className="text-xs opacity-70">
                  {c.members?.map((m:any)=>m.user.displayName).join(', ')}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="card h-[70vh] flex flex-col">
        <div className="flex-1 overflow-auto space-y-2" ref={listRef} role="log" aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className="px-3 py-2 rounded-xl bg-gray-100">
              <div className="text-sm">{m.content}</div>
              {m.status === 'REVIEW' && <div className="text-xs text-amber-700">Wiadomość czeka na sprawdzenie</div>}
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Napisz wiadomość…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' ? send() : undefined}
            aria-label="Wpisz wiadomość"
          />
          <button className="btn" onClick={send}>Wyślij</button>
        </div>
      </section>
    </div>
  )
}
