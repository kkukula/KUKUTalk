import { io } from "socket.io-client";

const BASE = "http://localhost:3001";
const NS   = "/ws";
const PATH = "/socket.io";
const conversationId = "c4134ef1-11da-4f7c-a576-2fda49594c3d";
const U1 = { username: "wsu1_seed", password: "x123456!" };
const U2 = { username: "wsu2_seed", password: "x123456!" };

async function login({username, password}) {
  const r = await fetch(BASE + "/auth/login", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) throw new Error(`login ${username} -> ${r.status}`);
  const j = await r.json();
  const token = j.accessToken;
  const user  = j.user;
  if (!token || !user?.id) throw new Error("brak token/user.id");
  return { token, user };
}

function connectAuth({ token }, tag) {
  const s = io(BASE + NS, {
    path: PATH, transports: ["websocket","polling"], reconnection: false,
    extraHeaders: { Authorization: `Bearer ${token}` },
  });
  s.on("connect_error", e => console.error(`[${tag}] connect_error:`, String(e)));
  s.on("error", (e) => console.error(`[${tag}] server_error:`, JSON.stringify(e)));
  s.onAny((ev, payload)=> console.log(`[${tag}] <-`, ev, JSON.stringify(payload)));
  return s;
}

const delay = ms => new Promise(r => setTimeout(r, ms));
async function waitUntil(pred, ms, step=80) {
  const t0 = Date.now(); while (Date.now()-t0 < ms) { if (await pred()) return true; await delay(step); } return false;
}

(async () => {
  const A = await login(U1);
  const B = await login(U2);
  console.log("logins OK | ids:", A.user.id, B.user.id);

  const a = connectAuth(A, "u1");
  const b = connectAuth(B, "u2");
  await Promise.all([ new Promise(r=>a.on("connect", r)), new Promise(r=>b.on("connect", r)) ]);
  console.log("connected:", a.id, b.id);

  let joinedA=false, joinedB=false, typed=false;
  a.on("rooms:joined", p => { if (p?.conversationId === conversationId) joinedA = true; });
  b.on("rooms:joined", p => { if (p?.conversationId === conversationId) joinedB = true; });
  b.on("typing", p => { if (p?.userId) typed = true; });

  a.emit("rooms:join", { conversationId, userId: A.user.id });
  b.emit("rooms:join", { conversationId, userId: B.user.id });

  const joinOK = await waitUntil(()=> (joinedA && joinedB), 5000);
  if (!joinOK) throw new Error("join nie potwierdzony (rooms:joined)");

  a.emit("typing", { conversationId, userId: A.user.id, isTyping: true });
  const typOK = await waitUntil(()=> typed, 3000);
  if (!typOK) throw new Error("brak eventu 'typing' u B");

  a.disconnect(); b.disconnect();
  console.log("Realtime Smoke (/ws): PASS");
  process.exit(0);
})().catch(e => { console.error("SMOKE FAIL:", e?.stack || e); process.exit(1); });


