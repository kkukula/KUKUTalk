import React from "react"

const API = import.meta.env.VITE_API_URL || "http://localhost:3001"

const AuthCtx = React.createContext(null)
export function useAuth(){
  const ctx = React.useContext(AuthCtx)
  if(!ctx) throw new Error("useAuth must be used within <AuthProvider>")
  return ctx
}

function parseJwt(token){
  try{
    const p = token.split('.')[1]
    const json = atob(p.replace(/-/g,'+').replace(/_/g,'/'))
    return JSON.parse(decodeURIComponent(Array.prototype.map.call(json, c =>
      '%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)
    ).join('')))
  }catch(_){ return {} }
}
function authFetch(token){
  return async (url, opts={})=>{
    const h = new Headers(opts.headers||{})
    if(token) h.set('Authorization','Bearer '+token)
    return fetch(url,{...opts,headers:h})
  }
}

export function AuthProvider({ children }){
  const [user, setUser]   = React.useState(null)
  const [error, setError] = React.useState(null)
  const [busy, setBusy]   = React.useState(false)
  const [ready, setReady] = React.useState(false)

  React.useEffect(()=>{
    try{
      const raw = localStorage.getItem('kuku_user')
      if(raw){ setUser(JSON.parse(raw) || null) }
    }catch(_){}
    setReady(true)
  },[])

  const emit = (u)=>{
    try{
      if(typeof window!=='undefined'){
        window.dispatchEvent(new CustomEvent('kuku:auth',{ detail:{ user:u }}))
      }
    }catch(_){}
  }

  async function login(loginOrEmail, password){
    setBusy(true); setError(null)
    try{
      const r = await fetch(API+'/auth/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email: loginOrEmail, password })
      })
      const data = await r.json().catch(()=>({}))
      if(r.ok && data?.token){
        const p = parseJwt(data.token)||{}
        const roles = Array.isArray(p.roles)? p.roles : []
        const u = { name:p.name||loginOrEmail, email:p.email||loginOrEmail, token:data.token, roles }
        setUser(u); localStorage.setItem('kuku_user', JSON.stringify(u))
        emit(u); setError(null); return u
      }
      setError(data?.error || 'login_failed'); return null
    }catch(_){ setError('network_error'); return null }
    finally{ setBusy(false) }
  }

  async function register(loginOrEmail, password){
    setBusy(true); setError(null)
    try{
      const r = await fetch(API+'/auth/register',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email: loginOrEmail, password })
      })
      const data = await r.json().catch(()=>({}))
      if(r.ok && data?.token){
        const p = parseJwt(data.token)||{}
        const roles = Array.isArray(p.roles)? p.roles : []
        const u = { name:p.name||loginOrEmail, email:p.email||loginOrEmail, token:data.token, roles }
        setUser(u); localStorage.setItem('kuku_user', JSON.stringify(u))
        emit(u); setError(null); return u
      }
      setError(data?.error || 'register_failed'); return null
    }catch(_){ setError('network_error'); return null }
    finally{ setBusy(false) }
  }

  function logout(){
    try{ localStorage.removeItem('kuku_user') }catch(_){}
    setUser(null); emit(null)
    try{ if(window?.__useSock?.reset) window.__useSock.reset() }catch(_){}
  }

  const afetch = React.useMemo(()=>authFetch(user?.token||''), [user?.token])

  const value = React.useMemo(()=>({ user, setUser, error, busy, ready, login, register, logout, afetch }),[user,error,busy,ready])
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
