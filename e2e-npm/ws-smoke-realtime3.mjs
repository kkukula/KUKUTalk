import { io } from "socket.io-client";

const BASE = "http://localhost:3001";
const PATH = "/socket.io";
const roomId = "r1";
const U1 = { username: "wsu1_seed", password: "x123456!" };
const U2 = { username: "wsu2_seed", password: "x123456!" };

async function login({username, password}) {
  const r = await fetch(BASE + "/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) throw new Error(`login ${username} -> ${r.status}`);
  const j = await r.json();
  return { token: j.accessToken };
}

function connect({ token }, tag) {
  const s = io(BASE, {
    path: PATH,
    transports: ["websocket","polling"],
    reconnection: false,
    extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  s.on("connect_error", e => console.error(`[${tag}] connect_error:`, String(e)));
  s.onAny((ev, payload)=> console.log(`[${tag}] <-`, ev, JSON.stringify(payload)));
  return s;
}

const delay = ms => new Promise(r => setTimeout(r, ms));
async function waitUntil(pred, ms, step=50) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await pred()) return true; await delay(step); }
  return false;
}

// Bezpieczny emit z timeoutem ACK (nie zawiesi procesu)
function emitWithAckTimeout(sock, event, data, ms=800) {
  return new Promise((resolve) => {
    try {
      sock.timeout(ms).emit(event, data, (err, res) => {
        if (err) return resolve({ ok:false, reason:'ack-timeout' });
        resolve({ ok:true, res });
      });
    } catch (e) {
      resolve({ ok:false, reason:String(e) });
    }
  });
}

// Normalizacja danych presence
function collectPresence(p) {
  const out = [];
  if (Array.isArray(p?.users))   out.push(...p.users);
  if (Array.isArray(p?.sockets)) out.push(...p.sockets);
  if (Array.isArray(p?.ids))     out.push(...p.ids);
  return out.map(String);
}

(async () => {
  const aCred = await login(U1).catch(()=>({token:null}));
  const bCred = await login(U2).catch(()=>({token:null}));

  const a = connect(aCred, "u1");
  const b = connect(bCred, "u2");
  await Promise.all([ new Promise(r=>a.on("connect", r)), new Promise(r=>b.on("connect", r)) ]);
  console.log("connected:", a.id, b.id);

  const seen = new Set();
  let typingOK = false;

  const onPresence = (p) => collectPresence(p).forEach(v => seen.add(v));
  a.on("presence:update", onPresence);
  b.on("presence:update", onPresence);

  const onTyping = (p) => {
    if (p?.userId === U1.username) typingOK = true;
    if (Array.isArray(p?.users) && p.users.includes(U1.username)) typingOK = true;
  };
  a.on("typing", onTyping);
  b.on("typing", onTyping);
  a.on("typing:update", onTyping);
  b.on("typing:update", onTyping);

  // 1) JOIN: spróbuj ACK (z timeoutem), potem zwykły emit
  const aAck = await emitWithAckTimeout(a, "room:join", { roomId, userId: U1.username });
  const bAck = await emitWithAckTimeout(b, "room:join", { roomId, userId: U2.username });
  if (!aAck.ok) a.emit("room:join", { roomId, userId: U1.username });
  if (!bAck.ok) b.emit("room:join", { roomId, userId: U2.username });

  // 2) Czekaj na presence  akceptuj usery LUB socketId
  const presOK = await waitUntil(() => {
    const haveUsers = seen.has(U1.username) && seen.has(U2.username);
    const haveSockets = seen.has(a.id) && seen.has(b.id);
    return haveUsers || haveSockets;
  }, 6000);
  if (!presOK) throw new Error("presence not updated -> " + JSON.stringify(Array.from(seen)));

  // 3) Typing
  a.emit("typing", { roomId, userId: U1.username, isTyping: true });
  const typOK = await waitUntil(() => typingOK, 3000);
  if (!typOK) throw new Error("no typing broadcast");

  a.disconnect(); b.disconnect();
  console.log("Realtime Smoke (namespace /): PASS");
  process.exit(0);
})().catch(e => { console.error("SMOKE FAIL:", e?.stack || e); process.exit(1); });
