import { io } from "socket.io-client";

const BASE = "http://localhost:3001";
const PATH = "/socket.io";
const U1 = { username: "wsu1_seed", password: "x123456!" };
const U2 = { username: "wsu2_seed", password: "x123456!" };

const JOIN_EVENTS = ["room:join"]; // wg introspekcji realtime.gateway
const ROOM_VALUES = ["r1","room:r1","conversation:r1","conversation-r1","room-r1","conv:r1"];
const ID_KEYS     = ["roomId","room","id","conversationId"]; // spróbujmy różnych nazw pól

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
    // Realtime gateway raczej nie wymaga auth, ale nagłówek nie szkodzi:
    extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  s.on("connect_error", e => console.error(`[${tag}] connect_error:`, String(e)));
  s.onAny((ev, payload)=> console.log(`[${tag}] <-`, ev, JSON.stringify(payload)));
  return s;
}

const delay = ms => new Promise(r => setTimeout(r, ms));
async function waitUntil(pred, ms, step=60) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await pred()) return true; await delay(step); }
  return false;
}

function ackTimeout(sock, event, data, ms=700) {
  return new Promise((resolve) => {
    try {
      sock.timeout(ms).emit(event, data, (err, res) => {
        if (err) return resolve({ ok:false, reason:"ack-timeout" });
        resolve({ ok:true, res });
      });
    } catch (e) {
      resolve({ ok:false, reason:String(e) });
    }
  });
}

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

  let seen = new Set();
  let typed = false;

  const onPresence = (p) => collectPresence(p).forEach(v => seen.add(v));
  a.on("presence:update", onPresence);
  b.on("presence:update", onPresence);

  const onTypingAny = (p) => {
    if (p?.userId === U1.username) typed = true;
    if (Array.isArray(p?.users) && p.users.includes(U1.username)) typed = true;
  };
  a.on("typing", onTypingAny);
  b.on("typing", onTypingAny);
  a.on("typing:update", onTypingAny);
  b.on("typing:update", onTypingAny);

  const tried = [];
  for (const ev of JOIN_EVENTS) {
    for (const key of ID_KEYS) {
      for (const room of ROOM_VALUES) {
        seen = new Set();
        typed = false;

        const payloadA = { [key]: room, userId: U1.username };
        const payloadB = { [key]: room, userId: U2.username };

        console.log(`TRY join event="${ev}" key="${key}" room="${room}"`);
        const aAck = await ackTimeout(a, ev, payloadA, 700);
        const bAck = await ackTimeout(b, ev, payloadB, 700);
        console.log(`  aAck=${JSON.stringify(aAck)}  bAck=${JSON.stringify(bAck)}`);
        if (!aAck.ok) a.emit(ev, payloadA);
        if (!bAck.ok) b.emit(ev, payloadB);

        const presOK = await waitUntil(() => {
          const haveUsers   = seen.has(U1.username) && seen.has(U2.username);
          const haveSockets = seen.has(a.id) && seen.has(b.id);
          return haveUsers || haveSockets;
        }, 2000);

        tried.push({ ev, key, room, aAck, bAck, presOK, seen: Array.from(seen) });

        if (presOK) {
          console.log(`JOIN OK via ev="${ev}" key="${key}" room="${room}" -> seen=${JSON.stringify(Array.from(seen))}`);
          // typing (u1)
          const typingPayload = { [key]: room, userId: U1.username, isTyping: true };
          a.emit("typing", typingPayload);
          const typOK = await waitUntil(() => typed, 2000);
          if (!typOK) throw new Error(`no typing broadcast (join ok ev=${ev} key=${key} room=${room})`);
          a.disconnect(); b.disconnect();
          console.log(`Realtime Smoke (namespace /): PASS via ev="${ev}" key="${key}" room="${room}"`);
          process.exit(0);
        }
      }
    }
  }

  a.disconnect(); b.disconnect();
  console.error("SMOKE FAIL: presence not observed for any combo. Tried:", JSON.stringify(tried, null, 2));
  process.exit(1);
})().catch(e => { console.error("SMOKE FAIL:", e?.stack || e); process.exit(1); });
