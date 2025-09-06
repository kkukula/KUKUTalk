import http from "http";
const argv = process.argv.slice(2);
let port = 5173;
const i = argv.indexOf("--port"); if (i>=0 && argv[i+1]) port = Number(argv[i+1])||port;
const html = `<!doctype html><meta charset="utf-8"><title>KUKUTalk Origin ${port}</title><h1>Origin ${port}</h1>`;
const srv = http.createServer((_,res)=>{ res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"}); res.end(html);});
srv.listen(port,"127.0.0.1",()=>console.log("origin-server:",port));
process.on("SIGTERM",()=>srv.close(()=>process.exit(0)));
