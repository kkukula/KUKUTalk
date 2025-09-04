// src/pages/Conversations.tsx
import { useEffect, useState } from 'react';
import { chat, type ConversationSummary } from '@/api';
import { Link } from 'react-router-dom';

export default function Conversations() {
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await chat.listConversations();
      setItems(data);
    } catch (e: any) {
      setError(e?.message || 'Nie udało się pobrać rozmów.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="container">
      <h1 className="page-title">Rozmowy</h1>

      <button className="btn" onClick={load} disabled={loading} style={{ marginBottom: 12 }}>
        {loading ? 'Ładowanie…' : 'Odśwież'}
      </button>

      <div className="card">
        <div className="card-body">
          {loading && <p>Ładowanie…</p>}
          {!loading && error && (
            <p style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}
          {!loading && !error && items && items.length === 0 && (
            <ul>
              <li>Brak rozmów.</li>
            </ul>
          )}
          {!loading && !error && items && items.length > 0 && (
            <ul>
              {items.map((c) => (
                <li key={c.id} style={{ marginBottom: 8 }}>
                  <span>
                    Rozmowa {c.name ?? c.id} · Ostatnia wiadomość:{' '}
                    {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : '—'}
                  </span>
                  {' · '}
                  <Link to={`/chat/${c.id}`}>Otwórz</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
