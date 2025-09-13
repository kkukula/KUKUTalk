import React, { useEffect, useMemo, useState } from 'react'
import { getJson, postJson } from '../lib/api'

function Card({ title, children, actions }) {
  return (
    <div style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, boxShadow:'0 1px 3px rgba(0,0,0,0.06)', padding:14, marginBottom:12}}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
        <div style={{fontWeight:700}}>{title}</div>
        <div>{actions}</div>
      </div>
      {children}
    </div>
  )
}

export default function ParentDashboard({ token }) {
  const [stats, setStatystyki] = useState(null)
  const [children, setChildren] = useState([])
  const [wl, setWl] = useState([])
  const [wlInput, setWlInput] = useState('')
  const [audit, setAudit] = useState([])
  const hdr = useMemo(()=> token ? { 'Authorization':'Bearer '+token } : {}, [token])

  async function loadAll(){
    const s = await getJson('/mod/stats', token); if (s.ok) setStatystyki(s.data)
    const ch = await getJson('/profiles/child', token); if (ch.ok) setChildren(ch.data && ch.data.items || [])
    const w = await getJson('/mod/whitelist', token); if (w.ok) { const arr = (w.data && w.data.items) || []; setWl(arr); setWlInput(arr.join(', ')) }
    const a = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/audit?limit=100', { headers: hdr })
    try { const j = await a.json(); setAudit(j.items||[]) } catch(e){}
  }

  useEffect(()=>{ loadAll() }, [token])

  async function saveWhitelist(){
    const items = wlInput.split(',').map(s=>s.trim()).filter(Boolean)
    const r = await postJson('/mod/whitelist', { items }, token)
    if (r.ok) { setWl(items) }
  }
  async function exportCsv(){
    const url = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/audit.csv'
    const r = await fetch(url, { headers: hdr })
    const blob = await r.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'audit.csv'
    a.click()
    setTimeout(()=> URL.revokeObjectURL(a.href), 5000)
  }

  return (
    <div style={{marginBottom:14}}>
      <h2 style={{fontSize:18, margin:'8px 0'}}>Panel rodzica</h2>

      <Card title='Statystyki' actions={null}>
        <div style={{display:'flex', gap:16, flexWrap:'wrap'}}>
          <div><strong>Uzytkownicy:</strong> {stats ? stats.users : '-'}</div>
          <div><strong>Dzieci:</strong> {stats ? stats.children : '-'}</div>
          <div><strong>Pozycje na bialej liscie:</strong> {wl.length}</div>
        </div>
      </Card>

      <Card title='Biala lista \(domeny/emaile\)' actions={<button onClick={saveWhitelist} style={{padding:'6px 10px', borderRadius:8}}>Zapisz</button>}>
        <textarea value={wlInput} onChange={e=>setWlInput(e.target.value)} rows={2} style={{width:'100%', padding:10, border:'1px solid #d1d5db', borderRadius:8}} placeholder='example.com, friend@example.com' />
        <div style={{fontSize:12, opacity:0.7, marginTop:6}}>Separate by comma. Children may chat only with contacts present here.</div>
      </Card>

      <Card title='Children' actions={null}>
        {(children && children.length) ? (
          <ul style={{margin:0, paddingLeft:18}}>
            {children.map(ch => <li key={ch.id}><strong>{ch.name||ch.id}</strong> <span style={{opacity:0.7}}>({ch.id})</span></li>)}
          </ul>
        ) : (<div style={{opacity:0.7}}>Brak dzieci.</div>)}
      </Card>

      <Card title='Dziennik zdarzen \(ostatnie 100\)' actions={<button onClick={exportCsv} style={{padding:'6px 10px', borderRadius:8}}>Eksport CSV</button>}>
        <div style={{maxHeight:220, overflow:'auto', border:'1px solid #eee', borderRadius:8}}>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
            <thead><tr style={{background:'#f8fafc'}}><th style={{textAlign:'left', padding:8, borderBottom:'1px solid #eee'}}>Time</th><th style={{textAlign:'left', padding:8, borderBottom:'1px solid #eee'}}>Type</th><th style={{textAlign:'left', padding:8, borderBottom:'1px solid #eee'}}>Actor</th><th style={{textAlign:'left', padding:8, borderBottom:'1px solid #eee'}}>Note</th></tr></thead>
            <tbody>
              {(audit||[]).slice().reverse().map((e,i)=>(
                <tr key={i}>
                  <td style={{padding:8, borderBottom:'1px solid #f1f5f9'}}>{new Date(e.ts).toLocaleString()}</td>
                  <td style={{padding:8, borderBottom:'1px solid #f1f5f9'}}>{e.type}</td>
                  <td style={{padding:8, borderBottom:'1px solid #f1f5f9'}}>{e.actorRole||''}:{e.actorId||''}</td>
                  <td style={{padding:8, borderBottom:'1px solid #f1f5f9'}}>{e.note||''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

