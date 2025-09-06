import http from "http";

const argv = process.argv.slice(2);
let port = 5173;
const idx = argv.indexOf("--port");
if (idx >= 0 && argv[idx+1]) { port = Number(argv[idx+1]) || port; }
const html = `<!doctype html><meta charset="utf-8"><title>KUKUTalk Origin ${port}</title><h1>Origin ${port}</h1>`;

const srv = http.createServer((req,res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
});
srv.listen(port, "127.0.0.1", () => {
  console.log("origin-server: listening on http://127.0.0.1:"+port);
});
process.on("SIGTERM", () => srv.close(()=>process.exit(0)));
