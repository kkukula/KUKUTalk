const http = require("http");
const https = require("https");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const TARGET = process.env.API_URL || "http://api:3001";
const T = new URL(TARGET);
const client = T.protocol === "https:" ? https : http;

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function stripHopByHop(h) {
  const drop = new Set(["connection","proxy-connection","transfer-encoding","keep-alive","upgrade","expect"]);
  const out = {};
  for (const k of Object.keys(h || {})) {
    const lc = k.toLowerCase();
    if (drop.has(lc) || lc === "host") continue;
    out[k] = h[k];
  }
  return out;
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") { setCors(res); res.writeHead(204); return res.end(); }
  if (req.url === "/health") { setCors(res); res.writeHead(200, {"Content-Type":"text/plain"}); return res.end(`ok ${TARGET}`); }

  const headers = stripHopByHop(req.headers);
  headers["host"] = T.host;
  headers["connection"] = "close";

  const opts = {
    protocol: T.protocol,
    hostname: T.hostname,
    port: T.port || (T.protocol === "https:" ? 443 : 80),
    method: req.method,
    path: req.url,
    headers,
    timeout: 15000,
  };

  const prox = client.request(opts, (pres) => {
    setCors(res);
    for (const [k, v] of Object.entries(pres.headers || {})) {
      const lc = (k || "").toLowerCase();
      if (["connection","transfer-encoding","keep-alive","upgrade","proxy-connection"].includes(lc)) continue;
      try { res.setHeader(k, v); } catch {}
    }
    res.writeHead(pres.statusCode || 502);
    pres.pipe(res);
  });

  prox.on("timeout", () => prox.destroy(new Error("upstream_timeout")));
  prox.on("error", (err) => {
    setCors(res);
    res.writeHead(502, {"Content-Type":"application/json"});
    res.end(JSON.stringify({ error:"proxy_error", detail:String((err && (err.code||err.message)) || err) }));
  });

  // po prostu lejemy body  bez oczekiwania na "100-continue"
  req.pipe(prox);
});

server.listen(PORT, () => console.log(`[guard] listening on :${PORT} -> ${TARGET}`));
