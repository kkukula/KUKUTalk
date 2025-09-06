import { io } from "socket.io-client";

const BASE = "http://localhost:3001";
const PATH = "/socket.io";
const U1 = { username: "wsu1_seed", password: "x123456!" };
const U2 = { username: "wsu2_seed", password: "x123456!" };

const DIRECT_EVENT = "room:join";
const AGG_EVENTS   = ["message","event"];
const ROOM_VALUES  = ["r1","room:r1","conversation:r1","conversation-r1","room-r1","conv:r1"];
const ID_KEYS      = ["roomId","room","id","conversationId"];

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
async function waitUntil(pred, ms, step=60) { const t0=Date.now(); while(Date.now()-t0<ms){ if(await pred()) return true; await delay(step);} return false; }
function ackTimeout(sock, event, data, ms=700){ return new Promise(res=>{ try{ sock.timeout(ms).emit(event, data, (err, out)=>res({ok:!err, out, err})); } catch(e){ res({ok:false, err:String(e)}) } }); }

function collectPresence(p){
  const out=[]; if(Array.isArray(p?.users)) out.push(...p.users);
  if(Array.isArray(p?.sockets)) out.push(...p.sockets);
  if(Array.isArray(p?.ids)) out.push(...p.ids);
  return out.map(String);
}

const AGG_PAYLOADS = [
  ({roomId,userId}) => ({ event: "room:join", data: { roomId, userId } }),
  ({roomId,userId}) => ({ event: "room:join", roomId, userId }),
  ({roomId,userId}) => ({ type:  "room:join", data: { roomId, userId } }),
];

(async () => {
  const aCred = await login(U1).catch(()=>({token:null}));
  const bCred = await login(U2).catch(()=>({token:null}));

  const a = connect(aCred, "u1");
  const b = connect(bCred, "u2");
  await Promise.all([ new Promise(r=>a.on("connect", r)), new Promise(r=>b.on("connect", r)) ]);
  console.log("connected:", a.id, b.id);

  let seen = new Set(); let typed = false;
  const onPresence = (p)=> collectPresence(p).forEach(v=>seen.add(v));
  a.on("presence:update", onPresence); b.on("presence:update", onPresence);
  const onTyping = (p)=>{ if(p?.userId===U1.username || (Array.isArray(p?.users)&&p.users.includes(U1.username))) typed=true; };
  ["typing","typing:update"].forEach(ev=>{ a.on(ev,onTyping); b.on(ev,onTyping); });

  const tried = [];

  // A) Podejście bez agregatora  bezpośredni "room:join"
  for (const key of ID_KEYS){
    for (const room of ROOM_VALUES){
      seen.clear(); typed=false;
      const payloadA = { [key]: room, userId: U1.username };
      const payloadB = { [key]: room, userId: U2.username };
      console.log(`TRY DIRECT event="${DIRECT_EVENT}" key="${key}" room="${room}"`);
      const aAck = await ackTimeout(a, DIRECT_EVENT, payloadA);
      const bAck = await ackTimeout(b, DIRECT_EVENT, payloadB);
      if (!aAck.ok) a.emit(DIRECT_EVENT, payloadA);
      if (!bAck.ok) b.emit(DIRECT_EVENT, payloadB);

      const presOK = await waitUntil(()=> (seen.has(U1.username)&&seen.has(U2.username)) || (seen.has(a.id)&&seen.has(b.id)), 2200);
      tried.push({ mode:"direct", key, room, aAck, bAck, presOK, seen: Array.from(seen) });
      if (presOK){
        a.emit("typing", { [key]: room, userId: U1.username, isTyping: true });
        const typOK = await waitUntil(()=>typed, 2000);
        if (!typOK) throw new Error(`no typing (direct key=${key} room=${room})`);
        a.disconnect(); b.disconnect();
        console.log(`Realtime Smoke (/): PASS (direct key=${key} room=${room})`);
        process.exit(0);
      }
    }
  }

  // B) Podejście z agregatorem  "message"/"event" + {event:'room:join', ...}
  for (const agg of AGG_EVENTS){
    for (const room of ROOM_VALUES){
      for (const key of ID_KEYS){
        for (const wrap of AGG_PAYLOADS){
          seen.clear(); typed=false;
          const payloadA = wrap({ roomId: room, userId: U1.username });
          const payloadB = wrap({ roomId: room, userId: U2.username });

          // Jeżeli w wrapperze występuje wyłącznie roomId  spróbuj też z nazwą klucza 'key'
          if (payloadA.data) { payloadA.data[key] = payloadA.data.roomId; delete payloadA.data.roomId; }
          else { payloadA[key] = payloadA.roomId; delete payloadA.roomId; }
          if (payloadB.data) { payloadB.data[key] = payloadB.data.roomId; delete payloadB.data.roomId; }
          else { payloadB[key] = payloadB.roomId; delete payloadB.roomId; }

          console.log(`TRY AGG event="${agg}" wrap="${Object.keys(payloadA).join("+")}" key="${key}" room="${room}"`);
          const aAck = await ackTimeout(a, agg, payloadA);
          const bAck = await ackTimeout(b, agg, payloadB);
          if (!aAck.ok) a.emit(agg, payloadA);
          if (!bAck.ok) b.emit(agg, payloadB);

          const presOK = await waitUntil(()=> (seen.has(U1.username)&&seen.has(U2.username)) || (seen.has(a.id)&&seen.has(b.id)), 2200);
          tried.push({ mode:"agg", agg, key, room, aAck, bAck, presOK, seen: Array.from(seen), sampleA: payloadA });

          if (presOK){
            // spróbuj 'typing' w tej samej konwencji (bezpośrednio)
            a.emit("typing", { [key]: room, userId: U1.username, isTyping: true });
            const typOK = await waitUntil(()=>typed, 2000);
            if (!typOK) throw new Error(`no typing (agg ${agg} key=${key} room=${room})`);
            a.disconnect(); b.disconnect();
            console.log(`Realtime Smoke (/): PASS (agg=${agg} key=${key} room=${room})`);
            process.exit(0);
          }
        }
      }
    }
  }

  a.disconnect(); b.disconnect();
  console.error("SMOKE FAIL: none matched.", JSON.stringify(tried, null, 2));
  process.exit(1);
})().catch(e=>{ console.error("SMOKE FAIL:", e?.stack || e); process.exit(1); });
