// src/Nav.tsx
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearToken, getToken } from '@/api';

export default function Nav() {
  const token = getToken();
  const navigate = useNavigate();
  const loc = useLocation();

  const isActive = (path: string) =>
    loc.pathname.startsWith(path) ? 'bg-blue-600 text-white' : 'bg-gray-100';

  return (
    <nav className="w-full border-b border-gray-200 px-3 py-2 flex items-center justify-between">
      <Link to="/" className="font-semibold">KUKUTalk</Link>
      <div className="flex gap-2">
        <Link to="/" className={`px-3 py-1 rounded ${isActive('/')}`}>Dashboard</Link>
        <Link to="/conversations" className={`px-3 py-1 rounded ${isActive('/conversations')}`}>Rozmowy</Link>
        {token ? (
          <button
            onClick={() => {
              clearToken();
              navigate('/login', { replace: true });
            }}
            className="px-3 py-1 rounded bg-gray-100"
          >
            Wyloguj
          </button>
        ) : (
          <Link to="/login" className="px-3 py-1 rounded bg-blue-600 text-white">Login</Link>
        )}
      </div>
    </nav>
  );
}
