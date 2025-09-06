import { io } from "socket.io-client";

const BASE = "http://localhost:3001";
const WSNS = "/ws";
const PATH = "/socket.io";
const U1 = { username: "wsu1_seed", password: "x123456!" };
const U2 = { username: "wsu2_seed", password: "x123456!" };

async function login({username,password}) {
  const r = await fetch(BASE+"/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username,password})});
  if (!r.ok) throw new Error("login "+username+" -> "+r.status);
  const j = await r.json();
  return { token: j.accessToken };
}
async function me(token){
  const r = await fetch(BASE+"/users/me",{headers:{Authorization:"Bearer "+token}});
  if (!r.ok) throw new Error("users/me -> "+r.status);
  return await r.json();
}
async function getConvs(token){
  const r = await fetch(BASE+"/conversations",{headers:{Authorization:"Bearer "+token}});
  const code = r.status;
  let body = null;
  try { body = await r.json(); } catch { body = null; }
  return { code, body };
}
function pickId(o){ return o?.id || o?.conversationId || o?.conversation?.id || null; }
function memberIds(c){
  const arr = c?.members ?? c?.participants ?? c?.users ?? [];
  return arr.map(m => (m?.id ?? m)).filter(Boolean);
}

async function tryCreateConv(token, id1, id2){
  const shapes = [
    { participantIds: [id1,id2] },
    { participants: [id1,id2] },
    { members: [id1,id2] },
    { userIds: [id1,id2] },
    { memberIds: [id2] },
    { userId: id2 },
    { participantId: id2 },
    { recipientId: id2 },
    { targetUserId: id2 },
    { toUserId: id2 },
    { withUserId: id2 },
    { peerId: id2 },
    { friendId: id2 },
    { title: "ws-smoke", participantIds: [id1,id2] },
    { type: "DIRECT", userId: id2 },
    { type: "PERSONAL", userId: id2 }
  ];
  for (const body of shapes){
    try{
      const r = await fetch(BASE+"/conversations",{method:"POST",headers:{"content-type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify(body)});
      const code = r.status;
      let j=null; try { j = await r.json(); } catch {}
      const id = pickId(j);
      console.log("POST /conversations", code, JSON.stringify(body), "-> id:", id ?? null, "keys:", j && typeof j==="object" ? Object.keys(j) : null);
      if (r.ok && id) return { ok:true, id };
    }catch(e){
      console.log("POST /conversations ERR for body", JSON.stringify(body), String(e));
    }
  }
  return { ok:false };
}

function connectWs(token, tag){
  const s = io(BASE+WSNS,{ path: PATH, transports:["websocket","polling"], reconnection:false, extraHeaders:{Authorization:"Bearer "+token}});
  s.on("connect_error", e=>console.error(`[${tag}] connect_error:`, String(e)));
  s.onAny((ev,p)=>console.log(`[${tag}] <-`, ev, JSON.stringify(p)));
  return s;
}
const delay = ms=>new Promise(r=>setTimeout(r,ms));
async function waitUntil(pred,ms,step=80){ const t0=Date.now(); while(Date.now()-t0<ms){ if(await pred()) return true; await delay(step);} return false; }

(async ()=>{
  const aCred = await login(U1);
  const bCred = await login(U2);
  const aMe   = await me(aCred.token);
  const bMe   = await me(bCred.token);
  const id1 = aMe?.id, id2 = bMe?.id;
  if (!id1 || !id2) throw new Error("missing user ids");

  // 1) spróbuj utworzyć
  let convId = null;
  const created = await tryCreateConv(aCred.token, id1, id2);
  if (created.ok) {
    convId = created.id;
    console.log("CONV CREATED:", convId);
  } else {
    // 2) spróbuj znaleźć istniejącą
    const { code, body } = await getConvs(aCred.token);
    console.log("GET /conversations", code, "| type:", Array.isArray(body) ? "array["+body.length+"]" : (body && typeof body));
    if (Array.isArray(body)){
      for (const c of body){
        const cid = pickId(c);
        const mids = memberIds(c);
        console.log(" - conv", cid, "members:", mids);
        if (cid && mids.includes(id1) && mids.includes(id2)) { convId = cid; break; }
      }
    }
  }

  if (!convId) throw new Error("no conversation with both users");

  // 3) WS smoke na /ws
  const a = connectWs(aCred.token,"u1");
  const b = connectWs(bCred.token,"u2");
  await Promise.all([ new Promise(r=>a.on("connect", r)), new Promise(r=>b.on("connect", r)) ]);
  console.log("connected:", a.id, b.id);

  let users = [];
  let typed = false;
  const onPres = p => { if (Array.isArray(p?.users)) users = p.users; };
  a.on("presence:update", onPres);
  b.on("presence:update", onPres);
  a.on("typing", ()=>{ typed = true; });
  b.on("typing", ()=>{ typed = true; });

  a.emit("rooms:join", { conversationId: convId });
  b.emit("rooms:join", { conversationId: convId });

  const presOK = await waitUntil(()=> users.length >= 2, 4000);
  if (!presOK) throw new Error("presence not updated -> "+JSON.stringify(users));

  a.emit("typing", { conversationId: convId, isTyping: true });
  const typOK = await waitUntil(()=> typed, 3000);
  if (!typOK) throw new Error("no typing event");

  a.disconnect(); b.disconnect();
  console.log("Realtime Smoke (/ws): PASS");
  process.exit(0);
})().catch(async e=>{
  console.error("SMOKE FAIL:", e?.stack || e);
  // pokaż próbkę z GET /conversations dla debug
  try{
    const aCred = await login(U1);
    const data = await getConvs(aCred.token);
    console.log("DBG /conversations sample:", JSON.stringify((Array.isArray(data.body)?data.body.slice(0,2):data.body), null, 2));
  }catch{}
  process.exit(1);
});
