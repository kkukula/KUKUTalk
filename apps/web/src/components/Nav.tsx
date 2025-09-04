import { Link } from 'react-router-dom';

export default function Nav({ token, onLogout }: { token?: string; onLogout: () => void }) {
  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold">KUKUTalk</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link className="hover:underline" to="/">Dashboard</Link>
          <Link className="hover:underline" to="/conversations">Rozmowy</Link>
          <Link className="hover:underline" to="/login">Login</Link>
          {token && (
            <button onClick={onLogout} className="rounded-md bg-slate-900 text-white px-3 py-1.5">
              Wyloguj
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
