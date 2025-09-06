import { io } from "socket.io-client";
const BASE="http://localhost:3001", PATH="/socket.io", roomId="r1", U1="wsu1_seed", U2="wsu2_seed";
const delay=ms=>new Promise(r=>setTimeout(r,ms)); async function waitUntil(p,ms,st=80){const t=Date.now();while(Date.now()-t<ms){if(await p())return true;await delay(st)}return false}
async function hb(uid){ return (await fetch(BASE+"/presence/heartbeat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({roomId,userId:uid})})).status }
function cx(tag){ const s=io(BASE,{path:PATH,transports:["websocket","polling"],reconnection:false}); s.on("connect_error",e=>console.error(`[${tag}] connect_error:`,String(e))); s.onAny((ev,p)=>console.log(`[${tag}] <-`,ev,JSON.stringify(p))); return s }
(async()=>{
  console.log("HB u1 ->", await hb(U1)); console.log("HB u2 ->", await hb(U2));
  const a=cx("u1"), b=cx("u2"); await Promise.all([new Promise(r=>a.on("connect",r)), new Promise(r=>b.on("connect",r))]); console.log("connected:", a.id, b.id);
  let typed=false; const onTU=p=>{ if(Array.isArray(p?.users)&&p.users.includes(U1)) typed=true }; a.on("typing:update",onTU); b.on("typing:update",onTU);
  a.emit("room:join",{roomId,userId:U1}); b.emit("room:join",{roomId,userId:U2});
  a.emit("typing",{roomId,userId:U1,isTyping:true});
  const ok=await waitUntil(()=>typed,3000); if(!ok) throw new Error("no typing:update broadcast");
  a.disconnect(); b.disconnect(); console.log("Realtime Smoke (fallback typing): PASS"); process.exit(0);
})().catch(e=>{ console.error("SMOKE FAIL:", e?.stack||e); process.exit(1); });
