import { io } from "socket.io-client";

const BASE = "http://localhost:3001";
const PATH = "/socket.io";       // realtime.gateway ma path="/socket.io"
const roomId = "r1";
const U1 = { username: "wsu1_seed", password: "x123456!" };
const U2 = { username: "wsu2_seed", password: "x123456!" };

// (Opcjonalnie) zaloguj, ale realtime nie wymaga auth. Zostawiamy, bo niczemu nie szkodzi.
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
    // extraHeaders nie są wymagane dla realtime.gateway, ale mogą zostać:
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

(async () => {
  // loginy opcjonalne, ale mamy już seed  nie zaszkodzi
  const aCred = await login(U1).catch(()=>({token:null}));
  const bCred = await login(U2).catch(()=>({token:null}));

  const a = connect(aCred, "u1");
  const b = connect(bCred, "u2");
  await Promise.all([ new Promise(r=>a.on("connect", r)), new Promise(r=>b.on("connect", r)) ]);
  console.log("connected:", a.id, b.id);

  let users = [];
  const onPresence = p => { if (p && Array.isArray(p.users)) users = p.users; };
  a.on("presence:update", onPresence);
  b.on("presence:update", onPresence);

  let typingOK = false;
  const onTypingUpd = p => { if (Array.isArray(p?.users) && p.users.includes(U1.username)) typingOK = true; };
  a.on("typing:update", onTypingUpd);
  b.on("typing:update", onTypingUpd);

  // 1) JOIN na realtime.gateway:
  a.emit("room:join", { roomId, userId: U1.username });
  b.emit("room:join", { roomId, userId: U2.username });

  const presOK = await waitUntil(() => users.includes(U1.username) && users.includes(U2.username), 5000);
  if (!presOK) throw new Error("presence not updated -> " + JSON.stringify(users));

  // 2) Typing na realtime.gateway (event "typing" -> broadcast "typing:update")
  a.emit("typing", { roomId, userId: U1.username, isTyping: true });
  const typOK = await waitUntil(() => typingOK, 3000);
  if (!typOK) throw new Error("no typing:update broadcast");

  a.disconnect(); b.disconnect();
  console.log("Realtime Smoke (namespace /): PASS");
  process.exit(0);
})().catch(e => { console.error("SMOKE FAIL:", e?.stack || e); process.exit(1); });
