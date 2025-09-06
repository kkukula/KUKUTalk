import { io } from "socket.io-client";

const API = "http://localhost:3001";
const WS  = API + "/ws";
const PATH = "/socket.io";
const conversationId = "r1";

async function jpost(path, body) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(body),
    redirect: "manual",
  });
  const text = await res.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: res.status, headers: res.headers, json, text };
}

async function tryRegister(u) {
  const variants = [
    { username: u.username, password: u.password },                               // minimal
    { username: u.username, email: u.email, password: u.password },               // +email
    { username: u.username, email: u.email, password: u.password, confirmPassword: u.password }, // confirmPassword
    { username: u.username, email: u.email, password: u.password, passwordConfirmation: u.password }, // alt name
    { username: u.username, password: u.password, name: u.username },             // name
    { username: u.username, password: u.password, fullName: u.username },         // fullName
    { login: u.username, password: u.password, email: u.email },                  // "login"
  ];
  for (const v of variants) {
    const r = await jpost("/auth/register", v);
    console.log("register try", JSON.stringify(v), "->", r.status, r.json ?? r.text);
    if (r.status >= 200 && r.status < 300) return { ok: true, variant: v };
    // jeśli 409/422/400 sygnalizuje już istnieje / walidacja  idziemy dalej
  }
  return { ok: false };
}

async function tryLogin(u) {
  const tries = [
    { body: { username: u.username, password: u.password }, label: "username" },
    { body: { login: u.username, password: u.password },    label: "login"    },
    { body: { email: u.email, password: u.password },       label: "email"    },
    { body: { usernameOrEmail: u.username, password: u.password }, label: "usernameOrEmail" },
  ];
  for (const t of tries) {
    const r = await jpost("/auth/login", t.body);
    const setCookie = r.headers.get("set-cookie") || "";
    const token = (r.json && (r.json.accessToken || r.json.token || r.json.access_token)) || null;
    console.log("login try", t.label, "->", r.status, { hasToken: !!token, hasCookie: !!setCookie });
    if (r.status >= 200 && r.status < 300) return { ok: true, token, cookie: setCookie, status: r.status };
  }
  return { ok: false };
}

function tryConnect(label, opts) {
  return new Promise((resolve, reject) => {
    const s = io(WS, { path: PATH, transports: ["websocket","polling"], reconnection: false, timeout: 8000, forceNew: true, ...opts });
    const t = setTimeout(()=>{ s.disconnect(); reject(new Error("connect timeout: "+label)); }, 9000);
    s.on("connect", ()=> { clearTimeout(t); resolve(s); });
    s.on("connect_error", e => { clearTimeout(t); s.disconnect(); reject(new Error("connect_error("+label+"): "+(e?.message||e))); });
  });
}

async function connectWithAuth(auth) {
  const cands = [];
  if (auth.token) {
    cands.push({ label: "auth.token", opts: { auth: { token: auth.token } } });
    cands.push({ label: "Authorization: Bearer", opts: { extraHeaders: { Authorization: "Bearer " + auth.token } } });
  }
  if (auth.cookie) {
    cands.push({ label: "Cookie", opts: { extraHeaders: { Cookie: auth.cookie } } });
  }
  cands.push({ label: "no-auth", opts: {} });

  for (const c of cands) {
    try { const s = await tryConnect(c.label, c.opts); console.log("connect OK via:", c.label); return s; }
    catch(e){ console.warn(String(e)); }
  }
  throw new Error("WS connect failed for all auth methods");
}

const delay = ms => new Promise(r=>setTimeout(r,ms));
async function waitUntil(pred, ms, step=50){ const t0=Date.now(); while(Date.now()-t0<ms){ if(await pred()) return true; await delay(step);} return false; }

(async () => {
  const SUF = Date.now().toString().slice(-6);
  const U1 = { username: "wsu1_"+SUF, password: "x123456!", email: "wsu1_"+SUF+"@example.com" };
  const U2 = { username: "wsu2_"+SUF, password: "x123456!", email: "wsu2_"+SUF+"@example.com" };

  // Rejestracja (tolerujemy niepowodzenie  możliwe, że endpoint jest wyłączony)
  await tryRegister(U1);
  await tryRegister(U2);

  // Loginy (różne warianty)
  const L1 = await tryLogin(U1);
  const L2 = await tryLogin(U2);
  if (!L1.ok || !L2.ok) throw new Error("Login failed (patrz próby powyżej)");

  // WS connect z autoryzacją
  const a = await connectWithAuth(L1);
  const b = await connectWithAuth(L2);

  // Subskrypcje
  let users = [];
  let typingSeen = false;

  const onPresence = p => { if (p && Array.isArray(p.users)) users = p.users; console.log("[presence]", JSON.stringify(p)); };
  const onTyping   = p => { typingSeen = true; console.log("[typing]", JSON.stringify(p)); };

  a.on("rooms:joined", p => console.log("[u1 rooms:joined]", JSON.stringify(p)));
  b.on("rooms:joined", p => console.log("[u2 rooms:joined]", JSON.stringify(p)));
  a.on("presence:update", onPresence);
  b.on("presence:update", onPresence);
  a.on("typing", onTyping);
  b.on("typing", onTyping);

  // Dołącz do rozmowy
  a.emit("rooms:join", { conversationId, userId: U1.username });
  b.emit("rooms:join", { conversationId, userId: U2.username });

  const presOK = await waitUntil(() => users.length >= 2, 6000);
  if (!presOK) throw new Error("presence not updated -> " + JSON.stringify(users));

  // Typing
  a.emit("typing", { conversationId, userId: U1.username, isTyping: true });
  const typOK = await waitUntil(() => typingSeen, 3000);
  if (!typOK) throw new Error("no typing broadcast");

  a.disconnect(); b.disconnect();
  console.log("Realtime Smoke (/ws + auto-auth): PASS");
  process.exit(0);
})().catch(e => { console.error("SMOKE FAIL:", e?.stack || e); process.exit(99); });
