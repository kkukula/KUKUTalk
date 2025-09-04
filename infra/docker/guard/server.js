const http = require('http');
const { URL } = require('url');

const TARGET = process.env.TARGET || 'http://api:3001';
const targetURL = new URL(TARGET);

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
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
  delete headers['host'];
  delete headers['connection'];
  delete headers['content-length'];
  delete headers['expect'];
  if (bodyLen != null) headers['content-length'] = bodyLen;
  return headers;
}

function fold(s) { return (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase(); }

function moderate(contentRaw) {
  const s = fold(String(contentRaw || ''));
  const rePhone = /(?:\+?48|^48)?\s*\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/;
  if (rePhone.test(s) || /\b(telefon|tel|numer|nr)\b/.test(s)) {
    return { decision: 'BLOCKED', reason: 'PII_PHONE' };
  }
  if (/spotkajmy sie|spotkajmy się/.test(s) && (/\bbez dorosl|bez doroslych|bez dorosłych\b/.test(s) || /nikomu nie mow|nikomu nie mów/.test(s))) {
    return { decision: 'BLOCKED', reason: 'MEETUP_RISK' };
  }
  if (/\bjestes glupi\b|\bnikt cie nie lubi\b|\bidiota\b/.test(s)) {
    return { decision: 'FLAGGED', reason: 'BULLYING' };
  }
  return { decision: 'SENT' };
}

function pickContent(obj) {
  return obj?.content ?? obj?.text ?? obj?.body ?? obj?.message ?? '';
}

function forwardGeneric(req, res) {
  const url = new URL(req.url, 'http://x');
  const isBodyMethod = !['GET','HEAD'].includes(req.method);

  (isBodyMethod ? readBody(req) : Promise.resolve('')).then(raw => {
    const headers = sanitizeHeaders(req.headers, isBodyMethod ? Buffer.byteLength(raw) : undefined);
    const proxyReq = http.request({
      protocol: targetURL.protocol,
      hostname: targetURL.hostname,
      port: targetURL.port,
      method: req.method,
      path: url.pathname + url.search,
      headers
    }, proxyRes => {
      const chunks = [];
      proxyRes.on('data', d => chunks.push(d));
      proxyRes.on('end', () => {
        const body = Buffer.concat(chunks);
        const outHeaders = { ...proxyRes.headers, 'content-length': body.length };
        res.writeHead(proxyRes.statusCode || 502, outHeaders);
        res.end(body);
      });
    });
    proxyReq.on('error', (e) => {
      console.error('proxy_error', e.message);
      sendJson(res, 502, { error: 'proxy_error', detail: e.message });
    });
    if (isBodyMethod) proxyReq.end(raw);
    else proxyReq.end();
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const isMsgPost = req.method === 'POST' && /^\/conversations\/[^/]+\/messages$/.test(url.pathname);

  if (!isMsgPost) {
    return forwardGeneric(req, res);
  }

  // Intercept POST /conversations/:id/messages
  const raw = await readBody(req);
  let parsed = {};
  try { parsed = JSON.parse(raw || '{}'); } catch {}
  const content = pickContent(parsed);
  const mod = moderate(content);

  if (mod.decision === 'BLOCKED') {
    return sendJson(res, 200, {
      id: null,
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      status: 'BLOCKED',
      moderation: mod,
      conversationId: url.pathname.split('/')[2],
      senderId: null,
      content: content,
      attachmentUrl: null
    });
  }

  // FLAGGED/SENT -> proxy do API z poprawionymi nagłówkami
  const headers = sanitizeHeaders(req.headers, Buffer.byteLength(raw));
  const upstream = http.request({
    protocol: targetURL.protocol,
    hostname: targetURL.hostname,
    port: targetURL.port,
    method: 'POST',
    path: url.pathname + url.search,
    headers
  }, proxyRes => {
    let chunks = [];
    proxyRes.on('data', d => chunks.push(d));
    proxyRes.on('end', () => {
      const bodyStr = Buffer.concat(chunks).toString('utf8');
      let obj = {};
      try { obj = JSON.parse(bodyStr); } catch { obj = {}; }
      if (mod.decision === 'FLAGGED') {
        obj.status = 'FLAGGED';
        obj.moderation = mod;
      }
      const out = JSON.stringify(obj);
      res.writeHead(proxyRes.statusCode || 200, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(out) });
      res.end(out);
    });
  });
  upstream.on('error', (e) => {
    console.error('proxy_error', e.message);
    sendJson(res, 502, { error: 'proxy_error', detail: e.message });
  });
  upstream.end(raw || '');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('guard listening on :' + PORT, '->', TARGET));
