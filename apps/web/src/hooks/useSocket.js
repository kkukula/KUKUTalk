import React from "react"
import { io } from "socket.io-client"
import { base, getJson } from "../lib/api"

function qs(params){
  const keys = Object.keys(params||{}).filter(k => params[k] !== undefined && params[k] !== null && params[k] !== "")
  return keys.length ? ("?" + keys.map(k => encodeURIComponent(k) + "=" + encodeURIComponent(String(params[k]))).join("&")) : ""
}

export default function useSocket(user, e2e, explicitToken){
  const [connected,setConnected] = React.useState(false)
  const [messages,setMessages]   = React.useState([])
  const [system,setSystem]       = React.useState([])

  const tokenRef  = React.useRef(explicitToken || (user && user.token) || null)
  const socketRef = React.useRef(null)
  const cursorRef = React.useRef(null)

  function reset(){
    try { if (socketRef.current) { socketRef.current.close(); socketRef.current = null } } catch(_e){}
    cursorRef.current = null
    setMessages([])
    setSystem([])
    setConnected(false)
  }

  React.useEffect(()=>{ tokenRef.current = explicitToken || (user && user.token) || null }, [explicitToken, user && user?.token])

  React.useEffect(()=>{
    const tk = explicitToken || (user && user.token) || null
    // brak tokena -> traktuj jak wylogowanie: zamknij socket i wyczyść stan
    if(!tk){ reset(); return }
    try{
      const s = io(base, { auth: { token: tk } })
      socketRef.current = s
      s.on("connect",    ()=> setConnected(true))
      s.on("disconnect", ()=> setConnected(false))
      s.on("chat:message", (msg)=> setMessages(m => m.concat([msg])))
      s.on("system:block", (p)=> setSystem(m => m.concat([{ ts: Date.now(), type: "block", payload: p }])))
      s.on("system:ack",   (p)=> setSystem(m => m.concat([{ ts: Date.now(), type: "ack",   payload: p }])))
      return ()=>{ try{ s.close() }catch(_e){} }
    }catch(_e){ setConnected(false) }
  }, [explicitToken, user && user?.token])

  async function loadHistory(room, opts){
    try{
      const q = Object.assign({}, opts||{})
      if(room) q.room = room
      const data  = await getJson("/chat/history" + qs(q), tokenRef.current)
      const items = (data && data.items) || []
      setMessages(items)
      if(items.length){ cursorRef.current = items[0].ts }
      return true
    }catch(_e){ return false }
  }

  async function loadOlder(room){
    const cur = cursorRef.current
    return loadHistory(room, { cursor: cur, dir: "older", limit: 100 })
  }

  async function sendMessage(text, room){
    const s = socketRef.current; if(!s) return
    const from = (user && user.name) || "DemoUser"
    const payload = { from, text: String(text||""), ts: Date.now() }
    if(room) payload.room = room
    s.emit("chat:message", payload)
  }

  // Mostek dla komponentu Composer (fallback z UI)
  if(typeof window !== "undefined"){
    try { window.__useSock = { sendMessage, loadHistory: (r)=>loadHistory(r,{}), loadOlder, messages } } catch(_e){}
  }

      try {
      if (typeof window !== 'undefined') {
        window.__useSock = Object.assign({}, window.__useSock || {}, {
          // te pola będą nadpisane tylko jeśli istnieją w zasięgu:
          sendMessage: (typeof sendMessage!=='undefined'?sendMessage:undefined),
          loadHistory: (typeof loadHistory!=='undefined'?loadHistory:undefined),
          loadOlder:   (typeof loadOlder!=='undefined'?loadOlder:undefined),
          reset:       (typeof setMessages!=='undefined' ? (()=>{ try{ setMessages([]); if(typeof setSystem!=='undefined'){ setSystem(null) } }catch{} }) : undefined)
        });
      }
    } catch(_) {}
return { connected, messages, system, sendMessage, loadHistory, loadOlder, reset }
}
