import { Controller, Get, Header } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('/')
  @Header('Content-Type', 'text/html; charset=utf-8')
  rootHtml() {
    return `<!doctype html>
<html><head><meta charset="utf-8"><title>KUKUTalk API</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f6f8fb;margin:0;padding:32px}
.card{max-width:760px;margin:auto;background:#fff;padding:24px;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.08)}
a{color:#0ea5e9;text-decoration:none} a:hover{text-decoration:underline}
code{background:#f3f4f6;padding:.125rem .375rem;border-radius:.375rem}
</style></head>
<body><div class="card">
  <h1>✅ KUKUTalk API działa</h1>
  <p>To jest warstwa <strong>backend</strong>. Aby klikać endpointy, użyj <a href="/docs">Swagger UI</a>.</p>
  <ol>
    <li>Wejdź na <a href="/docs">/docs</a>, kliknij <em>Authorize</em> i wklej token z <code>/auth/login</code>.</li>
    <li>Szybki status: <a href="/health">/health</a>.</li>
  </ol>
  <p><small>PORT: <code>${process.env.PORT ?? '3000'}</code></small></p>
</div></body></html>`;
  }

  @Get('/health')
  health() {
    return { status: 'ok' };
  }
}
