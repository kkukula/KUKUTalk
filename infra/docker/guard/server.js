const http = require('http');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
// Możesz nadpisać URL API przez env API_URL (np. http://api:3000).
// Domyślnie zakładamy 3001 (jeśli API faktycznie słucha na 3000, ustawimy to w compose override).
let TARGET = process.env.API_URL || 'http://api:3001';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.writeHead(204);
    return res.end();
  }

  if (req.url === '/health') {
    setCors(res);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end(`ok ${TARGET}`);
  }

  try {
    const t = new URL(TARGET);
    const opts = {
      protocol: t.protocol,
      hostname: t.hostname,
      port: t.port,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, host: t.hostname }
    };

    const prox = http.request(opts, (pres) => {
      setCors(res);
      // Przekaż status + nagłówki upstream
      Object.entries(pres.headers || {}).forEach(([k, v]) => {
        try { res.setHeader(k, v); } catch (e) {}
      });
      res.writeHead(pres.statusCode || 502);
      pres.pipe(res);
    });

    prox.on('error', (err) => {
      setCors(res);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'proxy_error', detail: String(err && err.message || err) }));
    });

    req.pipe(prox);
  } catch (err) {
    setCors(res);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'guard_internal', detail: String(err && err.message || err) }));
  }
});

server.listen(PORT, () => {
  console.log(`[guard] listening on :${PORT} -> ${TARGET}`);
});
