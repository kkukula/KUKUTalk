import { io } from "socket.io-client";

const BASE = "http://localhost:3001";
const PATH = "/socket.io";
const roomId = "r1";
const U1 = { username: "wsu1_seed", password: "x123456!" };
const U2 = { username: "wsu2_seed", password: "x123456!" };

async function login({username, password}) {
  const r = await fetch(BASE + "/auth/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) throw new Error("login "+username+" -> "+r.status);
  const j = await r.json();
  return { token: j.accessToken };
}

function connect(tag, token) {
  const s = io(BASE, {
    path: PATH, transports: ["websocket","polling"], reconnection: false,
    // auth nie jest wymagany w realtime.gateway, ale nie przeszkadza:
    extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  s.on("connect_error", e => console.error(`[${tag}] connect_error:`, String(e)));
  s.onAny((ev, payload)=> console.log(`[${tag}] <-`, ev, JSON.stringify(payload)));
  // nasłuchuj potencjalnych zwrotek bez ACK:
  s.on("room:join", p => console.log(`[${tag}] (resp room:join)`, JSON.stringify(p)));
  s.on("room:get",  p => console.log(`[${tag}] (resp room:get)`,  JSON.stringify(p)));
  return s;
}

const delay = ms => new Promise(r => setTimeout(r, ms));
async function waitUntil(pred, ms, step=80){ const t0=Date.now(); while(Date.now()-t0<ms){ if(await pred()) return true; await delay(step);} return false; }

(async ()=>{
  const aCred = await login(U1).catch(()=>({token:null}));
  const bCred = await login(U2).catch(()=>({token:null}));

  const a = connect("u1", aCred.token);
  const b = connect("u2", bCred.token);
  await Promise.all([ new Promise(r=>a.on("connect", r)), new Promise(r=>b.on("connect", r)) ]);
  console.log("connected:", a.id, b.id);

  let users = [];
  let typingOK = false;

  const onPresence = p => { if (p && Array.isArray(p.users)) { users = p.users.map(String); console.log("[presence:update]", JSON.stringify(p)); } };
  const onTypingUpd = p => { if (Array.isArray(p?.users) && p.users.includes(U1.username)) { typingOK = true; console.log("[typing:update]", JSON.stringify(p)); } };

  a.on("presence:update", onPresence);
  b.on("presence:update", onPresence);
  a.on("typing:update", onTypingUpd);
  b.on("typing:update", onTypingUpd);

  // 1) JOIN bez ACK (gateway nie wywołuje callbacka)
  a.emit("room:join", { roomId, userId: U1.username });
  b.emit("room:join", { roomId, userId: U2.username });

  // 2) Poczekaj na presence
  let presOK = await waitUntil(()=> users.includes(U1.username) && users.includes(U2.username), 2500);
  if (!presOK) {
    // Spróbuj dopytać serwerem:
    a.emit("room:get", { roomId });            // bez ack  złapiemy ewentualny "room:get" event
    await delay(400);
    // I sprawdź bezpośrednio HTTP-em:
    try {
      const r = await fetch(`${BASE}/presence/room?roomId=${encodeURIComponent(roomId)}`);
      const j = await r.json().catch(()=>null);
      console.log("[HTTP presence/room]", r.status, JSON.stringify(j));
    } catch(e) {
      console.log("[HTTP presence/room] ERROR", String(e));
    }
    presOK = await waitUntil(()=> users.includes(U1.username) && users.includes(U2.username), 1500);
  }
  if (!presOK) throw new Error("presence not updated -> "+JSON.stringify(users));

  // 3) Typing -> oczekujemy "typing:update"
  a.emit("typing", { roomId, userId: U1.username, isTyping: true });
  const typOK = await waitUntil(()=> typingOK, 2500);
  if (!typOK) throw new Error("no typing:update broadcast");

  a.disconnect(); b.disconnect();
  console.log("Realtime Smoke (namespace /, no-ack): PASS");
  process.exit(0);
})().catch(e=>{ console.error("SMOKE FAIL:", e?.stack || e); process.exit(1); });
