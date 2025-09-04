import { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE, chat, getToken } from '@/api';

type Conv = { id: string; lastMessageAt: string | null; name?: string | null };
type Msg = {
  id: string;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  status: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string | null;
};

function fmt(ts?: string | null) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return String(ts);
  }
}

export default function ChatHub() {
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const [text, setText] = useState('');
  const token = getToken();
  const socketRef = useRef<Socket | null>(null);

  // lista rozmów
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingConvs(true);
        const res = await chat.listConversations();
        if (!cancelled) setConversations(res.items || []);
        if (!cancelled && res.items?.length && !selectedId) {
          setSelectedId(res.items[0].id);
        }
      } finally {
        setLoadingConvs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); // załaduj raz

  // zmiana rozmowy -> ściągnięcie wiadomości
  useEffect(() => {
    if (!selectedId) {
      setMsgs([]);
      setNextCursor(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoadingMsgs(true);
        const res = await chat.listMessages(selectedId);
        if (!cancelled) {
          setMsgs(res.items || []);
          setNextCursor(res.nextCursor || null);
        }
      } finally {
        setLoadingMsgs(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // realtime
  useEffect(() => {
    if (!token || !selectedId) return;

    socketRef.current?.disconnect();
    const s = io(API_BASE, { transports: ['websocket'], auth: { token } });
    socketRef.current = s;

    s.emit('conversation:join', { conversationId: selectedId });
    s.on('message:new', (m: Msg) => {
      setMsgs((prev) => (m.conversationId === selectedId ? [...prev, m] : prev));
    });

    return () => {
      s.disconnect();
    };
  }, [token, selectedId]);

  async function handleSend() {
    if (!selectedId || !text.trim()) return;
    const created = await chat.sendMessage(selectedId, text.trim());
    setText('');
    // UI natychmiastowo – jeśli socket nie złapie, mamy echo
    setMsgs((prev) => [...prev, created]);
  }

  const canSend = Boolean(selectedId && text.trim());

  return (
    <div className="chat-layout" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
      <aside
        style={{
          border: '1px solid #e3e3e3',
          borderRadius: 8,
          padding: 12,
          background: '#fafafa',
          height: 'calc(100vh - 160px)',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Rozmowy</h3>
          <button
            className="btn"
            disabled={loadingConvs}
            onClick={async () => {
              setLoadingConvs(true);
              try {
                const res = await chat.listConversations();
                setConversations(res.items || []);
              } finally {
                setLoadingConvs(false);
              }
            }}
          >
            Odśwież
          </button>
        </div>

        {loadingConvs && <div style={{ color: '#888' }}>Ładowanie…</div>}
        {!loadingConvs && conversations.length === 0 && <div style={{ color: '#888' }}>Brak rozmów</div>}

        <div style={{ display: 'grid', gap: 8 }}>
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              style={{
                textAlign: 'left',
                padding: 10,
                borderRadius: 8,
                border: selectedId === c.id ? '2px solid #3b82f6' : '1px solid #e3e3e3',
                background: selectedId === c.id ? '#eef4ff' : '#fff',
              }}
            >
              <div style={{ fontWeight: 600 }}>{c.name || c.id.slice(0, 10)}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{fmt(c.lastMessageAt)}</div>
            </button>
          ))}
        </div>
      </aside>

      <section
        style={{
          border: '1px solid #e3e3e3',
          borderRadius: 8,
          padding: 12,
          display: 'grid',
          gridTemplateRows: '1fr auto',
          height: 'calc(100vh - 160px)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflow: 'auto', paddingRight: 8 }}>
          {loadingMsgs && <div style={{ color: '#888' }}>Ładowanie wiadomości…</div>}
          {!loadingMsgs && msgs.length === 0 && <div style={{ color: '#888' }}>Brak wiadomości</div>}
          <div style={{ display: 'grid', gap: 10 }}>
            {msgs.map((m) => (
              <div
                key={m.id}
                style={{
                  background: '#fff',
                  border: '1px solid #eee',
                  padding: 8,
                  borderRadius: 8,
                }}
              >
                <div style={{ fontSize: 12, color: '#666' }}>
                  <strong>{m.senderId.slice(0, 8)}</strong> · {fmt(m.createdAt)}
                </div>
                <div>{m.content}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginTop: 8 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={selectedId ? 'Napisz wiadomość…' : 'Wybierz rozmowę…'}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (canSend) handleSend();
              }
            }}
            style={{ resize: 'none', padding: 10, borderRadius: 8, border: '1px solid #ddd' }}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              padding: '0 16px',
              borderRadius: 8,
              border: 'none',
              background: canSend ? '#3b82f6' : '#9db9f6',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            Wyślij
          </button>
        </div>
      </section>
    </div>
  );
}
