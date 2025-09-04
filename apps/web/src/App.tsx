// src/App.tsx
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Nav from './Nav';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import RequireAuth from './components/RequireAuth';
import ChatHub from './pages/ChatHub';
import { setUnauthorizedHandler } from '@/api';

export default function App() {
  const navigate = useNavigate();

  // globalna reakcja na 401 → przeniesienie na /login
  useEffect(() => {
    setUnauthorizedHandler(() => navigate('/login', { replace: true }));
  }, [navigate]);

  return (
    <div className="app">
      <Nav />
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 16 }}>
        <Routes>
          <Route
            path="/"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/conversations"
            element={
              <RequireAuth>
                <ChatHub />
              </RequireAuth>
            }
          />
          <Route
            path="/chat/:id"
            element={
              <RequireAuth>
                <ChatHub />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
