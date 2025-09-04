// src/pages/Login.tsx
import { FormEvent, useState } from 'react';
import { auth, setToken, getToken } from '@/api';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setU] = useState('teacher1');
  const [password, setP] = useState('Passw0rd!');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const loc = useLocation() as any;

  const already = getToken();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { accessToken } = await auth.login(username, password);
      setToken(accessToken);
      // po zalogowaniu wracamy tam, skąd użytkownik przyszedł
      const to = loc.state?.from?.pathname || '/';
      navigate(to, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Błąd logowania');
    }
  }

  return (
    <div className="flex justify-center">
      <form onSubmit={onSubmit} className="w-full max-w-lg bg-white border rounded-lg p-6 mt-10">
        <h2 className="text-xl font-semibold mb-4">Logowanie</h2>
        {already && <p className="text-xs mb-2 text-gray-500">Jesteś zalogowany — zalogowanie ponownie nadpisze token.</p>}
        <label className="block text-sm mb-1">Użytkownik</label>
        <input className="w-full border rounded px-3 py-2 mb-3" value={username} onChange={e=>setU(e.target.value)} />
        <label className="block text-sm mb-1">Hasło</label>
        <input className="w-full border rounded px-3 py-2 mb-3" type="password" value={password} onChange={e=>setP(e.target.value)} />
        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}
        <button className="px-4 py-2 rounded bg-blue-600 text-white">Zaloguj</button>
        <p className="text-xs mt-3 text-gray-500">Dostępne ziarno: <code>teacher1/Passw0rd!</code> i <code>kid1/Passw0rd!</code>.</p>
      </form>
    </div>
  );
}
