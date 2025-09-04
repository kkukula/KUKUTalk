const http = require('http');
const { URL } = require('url');

const TARGET = process.env.TARGET || 'http://api:3001';
const targetURL = new URL(TARGET);

// === Rate-limit: 5 / 10 s (domyślnie) ===
const RL_MAX = Number(process.env.RL_MAX || 5);
const RL_WIN = Number(process.env.RL_WIN || 10000); // ms
// key -> { windowStart: number, count: number }
const buckets = new Map();

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => resolve(data || ''));
  });
}
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}
function sanitizeHeaders(h, bodyLen) {
  const headers = { ...h };
  delete headers['host']; delete headers['connection'];
  delete headers['content-length']; delete headers['expect'];
  if (bodyLen != null) headers['content-length'] = bodyLen;
  return headers;
}
function fold(s) { return (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase(); }
function moderate(contentRaw) {
  const s = fold(String(contentRaw || ''));
  const rePhone = /(?:\+?48|^48)?\s*\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/;
  if (rePhone.test(s) || /\b(telefon|tel|numer|nr)\b/.test(s)) return { decision: 'BLOCKED', reason: 'PII_PHONE' };
  if (/spotkajmy sie|spotkajmy się/.test(s) && (/\bbez dorosl|bez doroslych|bez dorosłych\b/.test(s) || /nikomu nie mow|nikomu nie mów/.test(s)))
    return { decision: 'BLOCKED', reason: 'MEETUP_RISK' };
  if (/\bjestes glupi\b|\bnikt cie nie lubi\b|\bidiota\b/.test(s)) return { decision: 'FLAGGED', reason: 'BULLYING' };
  return { decision: 'SENT' };
}
function pickContent(obj) {
  return obj?.content ?? obj?.text ?? obj?.body ?? obj?.message ?? '';
}
// bez weryfikacji podpisu  tylko parsujemy payload
function parseJwtUser(authHeader) {
  try {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadStr = Buffer.from(parts[1].replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8');
    const payload = JSON.parse(payloadStr);
    return payload.userId || payload.sub || null;
  } catch { return null; }
}
function keyForRate(req, convId) {
  const u = parseJwtUser(req.headers['authorization']) || (req.socket.remoteAddress || 'anon');
  return `${u}:${convId}`;
}
function checkRate(key) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) b = { windowStart: now, count: 0 };
  if (now - b.windowStart >= RL_WIN) { b.windowStart = now; b.count = 0; }
  if (b.count >= RL_MAX) {
    const resetMs = Math.max(0, RL_WIN - (now - b.windowStart));
    buckets.set(key, b);
    return { allowed: false, resetMs };
  }
  b.count++;
  buckets.set(key, b);
  return { allowed: true, resetMs: 0 };
}

function forwardGeneric(req, res) {
  const url = new URL(req.url, 'http://x');
  const isBody = !['GET','HEAD'].includes(req.method);
  (isBody ? readBody(req) : Promise.resolve('')).then(raw => {
    const headers = sanitizeHeaders(req.headers, isBody ? Buffer.byteLength(raw) : undefined);
    const proxyReq = http.request({
      protocol: targetURL.protocol, hostname: targetURL.hostname, port: targetURL.port,
      method: req.method, path: url.pathname + url.search, headers
    }, proxyRes => {
      const chunks = [];
      proxyRes.on('data', d => chunks.push(d));
      proxyRes.on('end', () => {
        const body = Buffer.concat(chunks);
        res.writeHead(proxyRes.statusCode || 502, { ...proxyRes.headers, 'content-length': body.length });
        res.end(body);
      });
    });
    proxyReq.on('error', e => sendJson(res, 502, { error: 'proxy_error', detail: e.message }));
    if (isBody) proxyReq.end(raw); else proxyReq.end();
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const isMsgPost = req.method === 'POST' && /^\/conversations\/[^/]+\/messages$/.test(url.pathname);

  if (!isMsgPost) return forwardGeneric(req, res);

  const convId = url.pathname.split('/')[2];
  const raw = await readBody(req);
  let parsed = {}; try { parsed = JSON.parse(raw || '{}'); } catch {}
  const content = pickContent(parsed);

  // RATE LIMIT
  const rateKey = keyForRate(req, convId);
  const rl = checkRate(rateKey);
  if (!rl.allowed) {
    res.setHeader('Retry-After', Math.ceil(rl.resetMs / 1000));
    return sendJson(res, 429, { status: 'RATE_LIMITED', moderation: { decision: 'RATE_LIMITED', reason: 'FLOOD' }, conversationId: convId, retryAfterMs: rl.resetMs, content });
  }

  // MODERATION
  const mod = moderate(content);
  if (mod.decision === 'BLOCKED') {
    return sendJson(res, 200, {
      id: null, createdAt: new Date().toISOString(), editedAt: null, deletedAt: null,
      status: 'BLOCKED', moderation: mod, conversationId: convId, senderId: null, content, attachmentUrl: null
    });
  }

  // PROXY to API
  const headers = sanitizeHeaders(req.headers, Buffer.byteLength(raw));
  const upstream = http.request({
    protocol: targetURL.protocol, hostname: targetURL.hostname, port: targetURL.port,
    method: 'POST', path: url.pathname + url.search, headers
  }, proxyRes => {
    let chunks = [];
    proxyRes.on('data', d => chunks.push(d));
    proxyRes.on('end', () => {
      const bodyStr = Buffer.concat(chunks).toString('utf8');
      let obj = {}; try { obj = JSON.parse(bodyStr); } catch {}
      if (mod.decision === 'FLAGGED') { obj.status = 'FLAGGED'; obj.moderation = mod; }
      const out = JSON.stringify(obj);
      res.writeHead(proxyRes.statusCode || 200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(out) });
      res.end(out);
    });
  });
  upstream.on('error', e => sendJson(res, 502, { error: 'proxy_error', detail: e.message }));
  upstream.end(raw || '');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('guard listening on :' + PORT, '->', TARGET, 'RL', RL_MAX + '/' + RL_WIN + 'ms'));
