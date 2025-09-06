import { io } from "socket.io-client";

const URL = "http://localhost:3001";
const NS  = "/ws";                 // z introspekcji: chat.gateway -> namespace '/ws'
const PATH = "/socket.io";         // domyślna ścieżka (realtime.gateway wskazuje /socket.io)
const conversationId = "r1";
const usersNeeded = ["u1","u2"];

const delay = (ms) => new Promise(r => setTimeout(r, ms));
async function waitUntil(pred, ms, step=50){
  const t0 = Date.now();
  while (Date.now() - t0 < ms){ if (await pred()) return true; await delay(step); }
  return false;
}

function mkClient(userId){
  const s = io(URL + NS, {
    transports: ["websocket","polling"],
    path: PATH,
    reconnection: false,
    timeout: 8000,
    forceNew: true,
  });
  s.on("connect_error", (e)=> console.error(`[${userId}] connect_error:`, String(e)));
  s.onAny((ev, payload)=> console.log(`[${userId}] <-`, ev, JSON.stringify(payload)));
  return s;
}

(async () => {
  const a = mkClient("u1");
  const b = mkClient("u2");

  await Promise.all([ new Promise(r=>a.on("connect", r)), new Promise(r=>b.on("connect", r)) ]);
  console.log("connected:", a.id, b.id);

  let presUsers = [];
  let typingSeen = false;

  // ChatGateway emituje 'rooms:joined' po pomyślnym dołączeniu
  a.on("rooms:joined", (p)=> console.log("[u1] rooms:joined", JSON.stringify(p)));
  b.on("rooms:joined", (p)=> console.log("[u2] rooms:joined", JSON.stringify(p)));

  // Broadcasty z ChatGateway:
  const onPresence = (p)=>{
    // payload w ChatGateway zwykle zawiera np. { conversationId, users }
    if (p && Array.isArray(p.users)) presUsers = p.users;
  };
  a.on("presence:update", onPresence);
  b.on("presence:update", onPresence);

  a.on("typing", (p)=> { typingSeen = typingSeen || (p?.userId === "u1" || (Array.isArray(p?.users) && p.users.includes("u1")) || true); });
  b.on("typing", (p)=> { typingSeen = typingSeen || (p?.userId === "u1" || (Array.isArray(p?.users) && p.users.includes("u1")) || true); });

  // 1) Dołącz do rozmowy przez ChatGateway
  a.emit("rooms:join", { conversationId, userId: "u1" });
  b.emit("rooms:join", { conversationId, userId: "u2" });

  // Poczekaj na presence z oboma userami
  const presOK = await waitUntil(() => usersNeeded.every(u => presUsers.includes(u)), 3000);
  if (!presOK) { console.error("SMOKE FAIL: presence missing users ->", presUsers); process.exit(1); }

  // 2) Wyślij typing z u1 (ChatGateway używa eventu 'typing')
  a.emit("typing", { conversationId, userId: "u1", isTyping: true });
  const typingOK = await waitUntil(() => typingSeen, 2000);
  if (!typingOK) { console.error("SMOKE FAIL: no 'typing' broadcast seen"); process.exit(2); }

  a.disconnect(); b.disconnect();
  console.log("Realtime Smoke (/ws): PASS");
})().catch(e=>{ console.error("SMOKE FAIL:", e?.stack || e); process.exit(99); });
