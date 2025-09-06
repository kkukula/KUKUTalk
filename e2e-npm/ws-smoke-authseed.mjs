import { io } from "socket.io-client";
const API = "http://localhost:3001";
const WS  = API + "/ws";
const PATH = "/socket.io";
const U1 = { username: "wsu1_seed", password: "x123456!" };
const U2 = { username: "wsu2_seed", password: "x123456!" };
const conversationId = "r1";

async function jpost(path, body){
  const res = await fetch(API+path, { method:"POST", headers:{"Content-Type":"application/json","Accept":"application/json"}, body: JSON.stringify(body) });
  const txt = await res.text(); let json=null; try{ json = txt?JSON.parse(txt):null }catch{};
  return { status: res.status, headers: res.headers, json, text: txt };
}
async function login(u){
  for (const body of [
    { username: u.username, password: u.password },
    { login:    u.username, password: u.password }
  ]) {
    const r = await jpost("/auth/login", body);
    const token = r.json && (r.json.accessToken || r.json.token || r.json.access_token);
    const cookie = r.headers.get("set-cookie") || "";
    console.log("login", body, "->", r.status, { hasToken: !!token, hasCookie: !!cookie });
    if (r.status>=200 && r.status<300) return { token, cookie };
  }
  throw new Error("login failed for "+u.username);
}
function tryConnect(opts){
  return new Promise((res,rej)=>{
    const s = io(WS, { path: PATH, transports:["websocket","polling"], timeout:8000, reconnection:false, forceNew:true, ...opts });
    const t = setTimeout(()=>{ s.disconnect(); rej(new Error("connect timeout")); }, 9000);
    s.on("connect", ()=>{ clearTimeout(t); res(s); });
    s.on("connect_error", e=>{ clearTimeout(t); s.disconnect(); rej(new Error("connect_error: "+(e?.message||e))); });
  });
}
const delay = ms=>new Promise(r=>setTimeout(r,ms));
async function waitUntil(pred, ms, step=50){ const t0=Date.now(); while(Date.now()-t0<ms){ if(await pred()) return true; await delay(step);} return false; }

(async () => {
  const L1 = await login(U1);
  const L2 = await login(U2);

  const cands = (auth) => [
    auth.token ? { label:"auth.token", opts:{ auth:{ token: auth.token } } } : null,
    auth.token ? { label:"Authorization: Bearer", opts:{ extraHeaders:{ Authorization:"Bearer "+auth.token } } } : null,
    auth.cookie? { label:"Cookie", opts:{ extraHeaders:{ Cookie: auth.cookie } } } : null
  ].filter(Boolean);

  let a, b, ok=false;
  for (const ca of cands(L1)) {
    try { a = await tryConnect(ca.opts); console.log("A connect via", ca.label); ok=true; break; } catch(e){ console.warn("A", String(e)); }
  }
  if (!ok) throw new Error("WS A connect failed");
  ok=false;
  for (const cb of cands(L2)) {
    try { b = await tryConnect(cb.opts); console.log("B connect via", cb.label); ok=true; break; } catch(e){ console.warn("B", String(e)); }
  }
  if (!ok) throw new Error("WS B connect failed");

  let users = []; let typingSeen=false;
  const onPresence = p => { if (p && Array.isArray(p.users)) users = p.users; console.log("[presence]", JSON.stringify(p)); };
  const onTyping   = p => { typingSeen = true; console.log("[typing]", JSON.stringify(p)); };
  a.on("presence:update", onPresence); b.on("presence:update", onPresence);
  a.on("typing", onTyping); b.on("typing", onTyping);
  a.on("rooms:joined", p => console.log("[u1 rooms:joined]", JSON.stringify(p)));
  b.on("rooms:joined", p => console.log("[u2 rooms:joined]", JSON.stringify(p)));

  a.emit("rooms:join", { conversationId, userId: U1.username });
  b.emit("rooms:join", { conversationId, userId: U2.username });

  const presOK = await waitUntil(()=> users.length>=2, 6000);
  if (!presOK) throw new Error("presence not updated -> "+JSON.stringify(users));

  a.emit("typing", { conversationId, userId: U1.username, isTyping: true });
  const typOK = await waitUntil(()=> typingSeen, 3000);
  if (!typOK) throw new Error("no typing broadcast");

  a.disconnect(); b.disconnect();
  console.log("Realtime Smoke (/ws + seeded): PASS");
  process.exit(0);
})().catch(e=>{ console.error("SMOKE FAIL:", e?.stack||e); process.exit(99); });
