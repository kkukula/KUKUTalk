// src/components/ChatLayout.tsx
import { Link } from 'react-router-dom';
import { ConversationSummary, User } from '@/api';

export default function ChatLayout({
  me,
  conversations,
  activeId,
  people,
  onPickConversation,
  children,
}: {
  me?: { id: string; username: string } | null;
  conversations: ConversationSummary[];
  activeId?: string | null;
  people: User[];
  onPickConversation: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="chat-shell">
      <aside className="chat-sidebar">
        <div className="sidebar-section">
          <div className="sidebar-title">Ja</div>
          <div className="me-tile">
            <div className="me-name">{me?.username ?? '—'}</div>
            <Link to="/logout" className="me-logout" onClick={(e) => e.preventDefault()}>
              {/* przycisk w Nav robi realne wylogowanie */}
            </Link>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-title">Rozmowy</div>
          <ul className="list">
            {conversations.length === 0 && <li className="muted">Brak rozmów</li>}
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  className={`list-item ${activeId === c.id ? 'active' : ''}`}
                  onClick={() => onPickConversation(c.id)}
                  title={c.id}
                >
                  <div className="list-primary">{c.name ?? `Rozmowa ${c.id.slice(0, 6)}…`}</div>
                  <div className="list-secondary">
                    {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : '—'}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-title">Użytkownicy (z wątku)</div>
          <ul className="list">
            {people.length === 0 && <li className="muted">Brak danych</li>}
            {people.map((p) => (
              <li key={p.id}>
                <div className="list-item">
                  <div className="list-primary">{p.displayName || p.username || p.id}</div>
                  <div className="list-secondary">{p.role || ''}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="chat-main">{children}</main>
    </div>
  );
}
