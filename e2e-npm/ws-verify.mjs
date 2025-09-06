import { io } from "socket.io-client";

const BASE = "http://localhost:3001";
const PATH = "/socket.io";      // z gatewaya
const roomId = "r1";            // ten sam, którego używałeś w REST

const U1 = { username: "wsu1_seed", password: "x123456!" };
const U2 = { username: "wsu2_seed", password: "x123456!" };

async function login({username, password}) {
  const r = await fetch(BASE + "/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) throw new Error("login "+username+" -> "+r.status);
  const j = await r.json();
  return { token: j.accessToken };
}

function connect(tag, token) {
  const s = io(BASE, {
    path: PATH,
    transports: ["websocket","polling"],
    reconnection: false,
    // realtime.gateway nie wymaga auth, ale nie szkodzi dołożyć:
    extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  s.on("connect_error", e => console.error(`[${tag}] connect_error:`, String(e)));
  s.onAny((ev, payload)=> console.log(`[${tag}] <-`, ev, JSON.stringify(payload)));
  return s;
}

const delay = ms => new Promise(r => setTimeout(r, ms));
async function waitUntil(pred, ms, step=80){ const t0=Date.now(); while(Date.now()-t0<ms){ if(await pred()) return true; await delay(step);} return false; }

async function emitAck(sock, ev, body, ms=3000) {
  return await new Promise(res => {
    let done = false;
    const timer = setTimeout(()=>{ if (!done){ done=true; res({ok:false, reason:"ack-timeout"}) }}, ms);
    try {
      sock.emit(ev, body, (out) => { if (done) return; done=true; clearTimeout(timer); res(out ?? { ok:true }); });
    } catch (e) {
      if (!done){ done=true; clearTimeout(timer); res({ ok:false, reason:String(e) }); }
    }
  });
}

(async ()=>{
  const aCred = await login(U1).catch(()=>({token:null}));
  const bCred = await login(U2).catch(()=>({token:null}));

  const a = connect("u1", aCred.token);
  const b = connect("u2", bCred.token);
  await Promise.all([ new Promise(r=>a.on("connect", r)), new Promise(r=>b.on("connect", r)) ]);
  console.log("connected:", a.id, b.id);

  let users = [];
  const onPresence = p => { if (p && Array.isArray(p.users)) users = p.users.map(String); };
  a.on("presence:update", onPresence);
  b.on("presence:update", onPresence);

  let typed = false;
  const onTypingUpd = p => { if (Array.isArray(p?.users) && p.users.includes(U1.username)) typed = true; };
  a.on("typing:update", onTypingUpd);
  b.on("typing:update", onTypingUpd);

  // JOIN z dokładnymi nazwami z gatewaya:
  const ackA = await emitAck(a, "room:join", { roomId, userId: U1.username }, 4000);
  const ackB = await emitAck(b, "room:join", { roomId, userId: U2.username }, 4000);
  console.log("join ack:", { a: ackA, b: ackB });

  // czekaj na presence:update, a jak nie dojdzie, zapytaj room:get (też w gatewayu)
  let presOK = await waitUntil(()=> users.includes(U1.username) && users.includes(U2.username), 2500);
  if (!presOK) {
    const roomState = await emitAck(a, "room:get", { roomId }, 2000);
    console.log("room:get ->", roomState);
    // spróbuj jeszcze raz chwilę poczekać
    presOK = await waitUntil(()=> users.includes(U1.username) && users.includes(U2.username), 1500);
  }
  if (!presOK) throw new Error("presence not updated -> "+JSON.stringify(users));

  // Typing dokładnie jak w gatewayu:
  await emitAck(a, "typing", { roomId, userId: U1.username, isTyping: true }, 2000);
  const typOK = await waitUntil(()=> typed, 2500);
  if (!typOK) throw new Error("no typing:update broadcast");

  a.disconnect(); b.disconnect();
  console.log("Realtime Smoke (/): PASS");
  process.exit(0);
})().catch(e=>{ console.error("SMOKE FAIL:", e?.stack || e); process.exit(1); });
