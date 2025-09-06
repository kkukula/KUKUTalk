import { test, expect } from "@playwright/test";

const API  = "http://localhost:3001";
const PATH = "/auth/login";

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

for (const port of [5173, 5174]){
  test(`CORS+AUTH on origin http://localhost:${port}`, async ({ page }) => {
    const origin = `http://localhost:${port}`;

    const a = await doFetch(page, origin, { username: "x", password: "x" });
    expect(a.ok).toBeTruthy();
    expect([400,401,403]).toContain(a.status); // 4xx OK, ważne: brak błędu CORS

    const b = await doFetch(page, origin, { email: "nobody@example.com", password: "x" });
    expect(b.ok).toBeTruthy();
    expect([400,401]).toContain(b.status);      // w 'disabled' email=400 jest OK
  });
}
