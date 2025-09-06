import { chromium } from "playwright";

const API = "http://localhost:3001";
const PATH = "/auth/login";
const origins = ["http://localhost:5173", "http://localhost:5174"];

async function doFetch(page, origin, body){
  await page.goto(origin, { waitUntil: "domcontentloaded" });
  return await page.evaluate(async ({api, path, body}) => {
    try{
      const r = await fetch(api+path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include"
      });
      return { ok: true, status: r.status };
    }catch(e){
      return { ok: false, error: String(e) };
    }
  }, { api: API, path: PATH, body });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  let failures = 0;

  for (const origin of origins){
    const a = await doFetch(page, origin, { username: "x", password: "x" });
    console.log(`[${origin}] username-only ->`, a);
    if (!a.ok || ![400,401,403].includes(a.status)) failures++;

    const b = await doFetch(page, origin, { email: "nobody@example.com", password: "x" });
    console.log(`[${origin}] email-only    ->`, b);
    if (!b.ok || ![400,401].includes(b.status)) failures++;
  }

  await browser.close();
  if (failures > 0) {
    console.error(`Smoke E2E: FAIL (${failures} checks)`);
    process.exit(1);
  } else {
    console.log("Smoke E2E: PASS");
  }
})();
