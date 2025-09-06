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

// normalizacja payloadu presence: wyciągamy users/socketIds jak leci
function normalizeUsers(p, socketA, socketB) {
  const arrs = [];
  if (Array.isArray(p?.users))   arrs.push(...p.users);
  if (Array.isArray(p?.sockets)) arrs.push(...p.sockets);
  if (Array.isArray(p?.ids))     arrs.push(...p.ids);
  // Dopuszczamy nazwy użytkowników i/lub socketId
  return new Set(arrs.concat([socketA, socketB]).filter(Boolean));
}

(async () => {
  const aCred = await login(U1).catch(()=>({token:null}));
  const bCred = await login(U2).catch(()=>({token:null}));

  const a = connect(aCred, "u1");
  const b = connect(bCred, "u2");
  await Promise.all([ new Promise(r=>a.on("connect", r)), new Promise(r=>b.on("connect", r)) ]);
  console.log("connected:", a.id, b.id);

  let presenceUsers = new Set();
  let typingOK = false;

  const presenceHandler = (p) => {
    // spróbuj rozpoznać zarówno usery jak i sockety
    const norm = normalizeUsers(p, undefined, undefined);
    // jeżeli serwer wysyła faktyczne usery, też zadziała:
    if (Array.isArray(p?.users)) for (const u of p.users) presenceUsers.add(String(u));
    for (const u of norm) presenceUsers.add(String(u));
  };
  a.on("presence:update", presenceHandler);
  b.on("presence:update", presenceHandler);

  const typingHandler = (p) => {
    // akceptuj 'typing' oraz 'typing:update', różne kształty
    if (p?.userId === U1.username) typingOK = true;
    if (Array.isArray(p?.users) && p.users.includes(U1.username)) typingOK = true;
  };
  a.on("typing", typingHandler);
  b.on("typing", typingHandler);
  a.on("typing:update", typingHandler);
  b.on("typing:update", typingHandler);

  // 1) JOIN  najpierw z ACK, potem bez ACK
  const tryJoinAck = async (sock, user) => {
    try {
      await sock.emitWithAck("room:join", { roomId, userId: user });
      return true;
    } catch { return false; }
  };
  const okA = await tryJoinAck(a, U1.username);
  const okB = await tryJoinAck(b, U2.username);
  if (!okA) a.emit("room:join", { roomId, userId: U1.username });
  if (!okB) b.emit("room:join", { roomId, userId: U2.username });

  // 2) Czekaj na presence  akceptuj: (usernames) LUB (socketIds obydwu)
  const presOK = await waitUntil(() => {
    const u = presenceUsers;
    const haveUsers = u.has(U1.username) && u.has(U2.username);
    const haveSockets = u.has(a.id) && u.has(b.id);
    return haveUsers || haveSockets;
  }, 6000);
  if (!presOK) throw new Error("presence not updated -> " + JSON.stringify(Array.from(presenceUsers)));

  // 3) Typing  wyślij i czekaj na którykolwiek wariant
  a.emit("typing", { roomId, userId: U1.username, isTyping: true });
  const typOK = await waitUntil(() => typingOK, 3000);
  if (!typOK) throw new Error("no typing broadcast");

  a.disconnect(); b.disconnect();
  console.log("Realtime Smoke (namespace /): PASS");
  process.exit(0);
})().catch(e => { console.error("SMOKE FAIL:", e?.stack || e); process.exit(1); });
