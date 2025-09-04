// src/pages/Chat.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  API_BASE,
  auth,
  chat,
  getUser,
  getToken,
  MessageItem,
  User,
  onUnauthorized,
} from '@/api';
import { io, Socket } from 'socket.io-client';

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [me, setMe] = useState<{ id: string; username: string } | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [people, setPeople] = useState<User[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // globalna reakcja 401 -> /login
  useEffect(() => {
    return onUnauthorized(() => navigate('/login', { replace: true }));
  }, [navigate]);

  // init (me + rozmowy)
  useEffect(() => {
    (async () => {
      try {
        const meRes = await auth.me();
        setMe({ id: meRes.user.userId, username: meRes.user.username });
      } catch {
        navigate('/login', { replace: true });
        return;
      }
      const convs = await chat.listConversations();
      setConversations(convs);
      if (!id && convs.length > 0) {
        navigate(`/chat/${convs[0].id}`, { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // socket attach / join room
  useEffect(() => {
    if (!id) return;
    const token = getToken();
    const s = io(API_BASE, { transports: ['websocket'], auth: { token } });
    socketRef.current = s;

    s.on('connect', () => {
      s.emit('conversation:join', { conversationId: id });
    });

    const onCreated = (payload: any) => {
      const msg: MessageItem | undefined =
        payload?.message ?? (payload?.conversationId === id ? payload : undefined);
      if (msg && (payload?.conversationId === id || (msg as any).conversationId === id)) {
        setMessages((m) => [...m, msg]);
        queueMicrotask(() =>
          scrollerRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }),
        );
      }
    };
    s.on('message:new', onCreated);
    s.on('message:created', onCreated);
    s.on('message', onCreated);

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [id]);

  // load messages on room change
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setMessages([]);
    setPeople([]);
    setCursor(null);
    (async () => {
      try {
        const { items, nextCursor } = await chat.listMessages(id, undefined, 50);
        setMessages(items);
        setCursor(nextCursor ?? null);

        const ids = [...new Set(items.map((m) => m.senderId))];
        const list: User[] = [];
        for (const uid of ids) {
          const u = await getUser(uid);
          if (u) list.push({ ...u, id: (u as any).id ?? uid });
        }
        setPeople(list);
      } finally {
        setLoading(false);
        queueMicrotask(() => scrollerRef.current?.scrollTo({ top: 1e9 }));
      }
    })();
  }, [id]);

  async function loadOlder() {
    if (!id || !cursor) return;
    const { items, nextCursor } = await chat.listMessages(id, cursor, 50);
    setMessages((m) => [...items, ...m]);
    setCursor(nextCursor ?? null);
  }

  async function send() {
    if (!id || !text.trim()) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      const s = socketRef.current;
      if (s?.connected) {
        s.emit('message:send', { conversationId: id, content });
      } else {
        await chat.sendMessage(id, content);
      }
      // mini refetch fallback
      setTimeout(async () => {
        const { items } = await chat.listMessages(id, undefined, 10);
        setMessages((prev) => {
          const map = new Map(prev.map((x) => [x.id, x]));
          items.forEach((it) => map.set(it.id, it));
          return [...map.values()].sort(
            (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt),
          );
        });
      }, 250);
    } finally {
      setSending(false);
      queueMicrotask(() =>
        scrollerRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }),
      );
    }
  }

  const meId = me?.id;
  const authorMap = useMemo(() => {
    const map = new Map<string, string>();
    people.forEach((p) => map.set(p.id, p.displayName || p.username || p.id));
    return map;
  }, [people]);

  // --- very small inline styles (bez Tailwinda/shadcn, żeby działało od razu) ---
  const css: Record<string, React.CSSProperties> = {
    wrap: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 },
    card: {
      background: '#0b1220',
      color: '#cfe3ff',
      borderRadius: 10,
      padding: 14,
      border: '1px solid #1f2b40',
    },
    convItem: {
      padding: '10px 12px',
      borderRadius: 8,
      background: '#0f1830',
      border: '1px solid #1f2b40',
      cursor: 'pointer',
    },
    active: { outline: '2px solid #3b82f6' },
    scroller: { height: 520, overflow: 'auto', paddingRight: 8 },
    bubbleMe: {
      alignSelf: 'flex-end',
      background: '#1e3a8a',
      color: 'white',
      padding: '8px 12px',
      borderRadius: 12,
      maxWidth: 560,
    },
    bubbleOther: {
      alignSelf: 'flex-start',
      background: '#111827',
      color: '#d1d5db',
      padding: '8px 12px',
      borderRadius: 12,
      maxWidth: 560,
    },
    row: { display: 'flex', gap: 8, alignItems: 'center' },
    input: {
      width: '100%',
      background: '#0b1220',
      border: '1px solid #1f2b40',
      color: 'white',
      borderRadius: 8,
      padding: '10px 12px',
    },
    btn: {
      background: '#2563eb',
      color: 'white',
      border: 0,
      borderRadius: 8,
      padding: '10px 14px',
      cursor: 'pointer',
    },
  };

  return (
    <div style={css.wrap}>
      {/* sidebar */}
      <div style={css.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <strong>Rozmowy</strong>
          <button style={css.btn} onClick={async () => setConversations(await chat.listConversations())}>
            Odśwież
          </button>
        </div>
        <div style={css.scroller}>
          {conversations.length === 0 && <div>Brak rozmów.</div>}
          {conversations.map((c) => (
            <div
              key={c.id}
              style={{ ...css.convItem, ...(id === c.id ? css.active : null) }}
              onClick={() => navigate(`/chat/${c.id}`)}
            >
              <div style={{ fontWeight: 600 }}>{c.name || `Rozmowa ${c.id.slice(0, 6)}…`}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* thread */}
      <div style={css.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <strong>
            {conversations.find((c) => c.id === id)?.name ??
              (id ? `Rozmowa ${id.slice(0, 6)}…` : 'Wybierz rozmowę')}
          </strong>
          <button style={css.btn} onClick={loadOlder} disabled={!cursor}>
            {cursor ? 'Wczytaj starsze' : '—'}
          </button>
        </div>

        <div style={{ ...css.scroller, display: 'flex', flexDirection: 'column', gap: 8 }} ref={scrollerRef}>
          {loading && <div>Ładowanie…</div>}
          {!loading &&
            messages.map((m) => (
              <div
                key={m.id}
                style={m.senderId === meId ? css.bubbleMe : css.bubbleOther}
                title={new Date(m.createdAt).toLocaleString()}
              >
                {authorMap.get(m.senderId) && m.senderId !== meId && (
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 2 }}>
                    {authorMap.get(m.senderId)}
                  </div>
                )}
                {m.content}
              </div>
            ))}
        </div>

        <div style={{ ...css.row, marginTop: 8 }}>
          <textarea
            rows={2}
            style={css.input}
            placeholder="Napisz wiadomość…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') send();
            }}
          />
          <button style={css.btn} onClick={send} disabled={sending || !text.trim()}>
            Wyślij
          </button>
        </div>
      </div>
    </div>
  );
}
