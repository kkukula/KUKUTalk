import React, { useEffect, useState } from 'react'
import { useAuth } from "./contexts/AuthContext.jsx";
import useSocket from './hooks/useSocket'

import Composer from './components/Composer.jsx'
import MessageList from './components/MessageList.jsx'
import ParentDashboard from './components/ParentDashboard.jsx'
import AuthPanel from './components/AuthPanel.jsx'
import E2EPanel from './components/E2EPanel.jsx'

export default function App() {
  const { user, setUser, logout } = useAuth()
  const [e2e, setE2E] = useState({ enabled: false, pass: '' })

  const token = (user && user.token) || null
  const {
    connected,
    sendMessage,
    messages,
    system,
    loadHistory,
    loadOlder
  } = useSocket(user, e2e, token)

  // Bezpiecznie wyczy?? widok wiadomo?ci po wylogowaniu
  useEffect(() => {
    try {
      if (!token && typeof window !== 'undefined' &&
          window.__useSock && typeof window.__useSock.reset === 'function') {
        window.__useSock.reset()
      }
    } catch (_) {}
  }, [token])

  const isParent =
    !!(token && (!user || !user.roles || user.roles.indexOf('parent') !== -1))

  return (
    <div style={{ fontFamily: 'system-ui, Arial', maxWidth: 980, margin: '20px auto', padding: '0 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h1 style={{ margin: 0 }}>KUKUTalk</h1>
        <div style={{ fontSize: 14 }}>
          <span style={{ marginRight: 8 }}>Socket: {connected ? 'online' : 'offline'}</span>
          <span style={{ marginRight: 8 }}>
            U?ytkownik: {(user && user.name) || 'DemoUser'} | Rola: {(user && user.roles && user.roles.join(', ')) || 'guest'}
          </span>
          {token ? (
            <button onClick={logout} style={{ padding: '6px 10px', borderRadius: 8 }}>
              Logout
            </button>
          ) : null}
        </div>
      </div>

      {!token ? <AuthPanel onAuth={setUser} /> : null}

      <E2EPanel onChange={setE2E} />

      {isParent ? <ParentDashboard token={token} /> : null}

      {token ? (
        <MessageList
          items={messages}
          me={(user && user.name) || 'DemoUser'}
          system={system}
        />
      ) : null}

      <Composer
        onSend={sendMessage}
        onLoad={loadHistory}
        onLoadOlder={loadOlder}
        disabled={!connected}
      />
    </div>
  )
}


