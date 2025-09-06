import { io } from "socket.io-client";

const BASE = "http://localhost:3001";
const NS   = "/ws";
const PATH = "/socket.io";
const conversationId = "r1";
const U1 = { username: "wsu1_seed", password: "x123456!" };
const U2 = { username: "wsu2_seed", password: "x123456!" };

async function login({username, password}) {
  const r = await fetch(BASE + "/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) throw new Error(`login ${username} -> ${r.status}`);
  let token = null;
  try {
    const j = await r.json();
    token = j.accessToken || j.token || j.jwt || null;
  } catch {}
  if (!token) throw new Error(`no accessToken for ${username}`);
  return { token };
}

function connectAuth({ token }, tag) {
  const s = io(BASE + NS, {
    path: PATH,
    transports: ["websocket","polling"],
    reconnection: false,
    extraHeaders: { Authorization: `Bearer ${token}` },
  });
  s.on("connect_error", e => console.error(`[${tag}] connect_error:`, String(e)));
  s.onAny((ev, payload)=> console.log(`[${tag}] <-`, ev, JSON.stringify(payload)));
  return s;
}

const delay = ms => new Promise(r => setTimeout(r, ms));
async function waitUntil(pred, ms, step=50) {
  const t0 = Date.now();
  while (Date.now()-t0 < ms) { if (await pred()) return true; await delay(step); }
  return false;
}

(async () => {
  const aCred = await login(U1);
  const bCred = await login(U2);
  console.log("logins OK | tokenA?", !!aCred.token, "| tokenB?", !!bCred.token);

  const a = connectAuth(aCred, "u1");
  const b = connectAuth(bCred, "u2");
  await Promise.all([ new Promise(r=>a.on("connect", r)), new Promise(r=>b.on("connect", r)) ]);
  console.log("connected:", a.id, b.id);

  let users = [];
  const onPresence = p => { if (p && Array.isArray(p.users)) users = p.users; };
  a.on("presence:update", onPresence);
  b.on("presence:update", onPresence);

  let typingSeen = false;
  const onTyping = p => {
    if (p?.userId === U1.username || (Array.isArray(p?.users) && p.users.includes(U1.username))) typingSeen = true;
  };
  a.on("typing", onTyping);
  b.on("typing", onTyping);

  // join + oczekiwanie na presence
  a.emit("rooms:join", { conversationId, userId: U1.username });
  b.emit("rooms:join", { conversationId, userId: U2.username });

  const presOK = await waitUntil(() => users.includes(U1.username) && users.includes(U2.username), 6000);
  if (!presOK) throw new Error("presence not updated -> " + JSON.stringify(users));

  // typing
  a.emit("typing", { conversationId, userId: U1.username, isTyping: true });
  const typOK = await waitUntil(() => typingSeen, 3000);
  if (!typOK) throw new Error("no typing broadcast");

  a.disconnect(); b.disconnect();
  console.log("Realtime Smoke (/ws + auth): PASS");
  process.exit(0);
})().catch(e => { console.error("SMOKE FAIL:", e?.stack || e); process.exit(1); });
