// KUKUTalk ? AuthPanel (PL) ? prosty panel rodzica
import React from "react"
import { useAuth } from "../contexts/AuthContext.jsx";
export default function AuthPanel(){
  const { user, error, busy, login, register, logout } = useAuth()
  const [email, setEmail] = React.useState("")
  const [pass, setPass]   = React.useState("")

  async function onLogin(){
    await login(email, pass)
  }
  async function onRegister(){
    await register(email, pass)
  }

  return (
    <div>
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="teacher1" style={{flex:'0 0 180px', padding:'8px', border:'1px solid #d1d5db', borderRadius:8}} />
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="haslo" style={{flex:'0 0 180px', padding:'8px', border:'1px solid #d1d5db', borderRadius:8}} />
        <button onClick={onRegister} disabled={busy} style={{padding:'6px 10px', borderRadius:8}}>Register</button>
        <button onClick={onLogin} disabled={busy} style={{padding:'6px 10px', borderRadius:8}}>Login</button>
        {user && <button onClick={logout} style={{padding:'6px 10px', borderRadius:8}}>Logout</button>}
      </div>
      {error && <div style={{marginTop:6, color:'#b91c1c'}}>Login failed</div>}
    </div>
  )
}

