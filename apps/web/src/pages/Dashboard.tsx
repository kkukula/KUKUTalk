// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { API_BASE, auth } from '@/api';

export default function Dashboard() {
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadMe = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await auth.me();
      setMe(res);
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  return (
    <div>
      <div className="border rounded p-3 bg-white mb-4">
        <h2 className="text-xl font-semibold">KUKUTalk</h2>
        <div className="text-xs text-gray-600">API_BASE: {API_BASE}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-3 bg-white">
          <h3 className="font-semibold mb-2">Health</h3>
          <pre className="bg-slate-900 text-slate-100 rounded p-3 text-sm">
{`{
  "status": "ok"
}`}
          </pre>
        </div>

        <div className="border rounded p-3 bg-white">
          <h3 className="font-semibold mb-2">/auth/me</h3>
          {loading ? (
            <div>Ładowanie…</div>
          ) : err ? (
            <div className="text-red-600">{err}</div>
          ) : (
            <pre className="bg-slate-900 text-slate-100 rounded p-3 text-sm">
              {JSON.stringify(me, null, 2)}
            </pre>
          )}
          <button onClick={loadMe} className="px-3 py-1 rounded bg-gray-100 mt-2">Odśwież</button>
        </div>
      </div>
    </div>
  );
}
