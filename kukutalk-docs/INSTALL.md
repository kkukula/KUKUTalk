# INSTALL.md — Instrukcja uruchomienia (po wygenerowaniu kodu)

> Ten dokument zakłada, że kod projektu został już wygenerowany i pobrany jako `kukutalk-mvp.zip` zgodnie z `SUPERPROMPT.md`. Poniżej znajdują się kroki przygotowania środowiska oraz pierwszego uruchomienia.

## 0) Wymagania
- **Docker Desktop** (Windows/macOS/Linux) z włączonym Docker Compose.
- (Opcjonalnie dla dev bez Dockera) **Node.js LTS (>=18.x)**, **pnpm**, **Git**.

## 1) Pobranie i rozpakowanie
```bash
unzip kukutalk-mvp.zip -d kukutalk
cd kukutalk
```

## 2) Zmienne środowiskowe
Skopiuj przykładowe pliki i uzupełnij sekrety:
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```
Ustaw: `JWT_SECRET`, `DATABASE_URL` (Postgres z Compose), `REDIS_URL`, `CORS_ORIGIN`, itp.

## 3) Uruchomienie przez Docker (rekomendowane)
```bash
docker compose up -d --build
docker compose exec api npx prisma migrate deploy
docker compose exec api node prisma/seed.js
```
Dostępy:
- Frontend (Next.js): http://localhost:3000  
- API (NestJS): http://localhost:4000/health  
- Mailhog: http://localhost:8025

## 4) Uruchomienie lokalne (bez Docker)
```bash
pnpm install
pnpm -C apps/api prisma:generate
pnpm -C apps/api prisma:migrate:dev
pnpm -C apps/api prisma:seed
pnpm dev    # startuje web i api równolegle
```

## 5) Konta demo (po seedzie)
- Rodzic: `parent@example.com` / `Passw0rd!`
- Dziecko: `child@example.com` / `Passw0rd!`
- Nauczyciel: `teacher@example.com` / `Passw0rd!`

## 6) Testy i jakość
```bash
pnpm -C apps/api test
pnpm -C apps/web test
pnpm e2e            # Playwright
pnpm lint && pnpm format
```

## 7) Problemy i rozwiązania
- **API 500 po starcie** → sprawdź `DATABASE_URL`, wykonaj migracje (`prisma migrate deploy`).  
- **WS nie łączy** → skonfiguruj `CORS_ORIGIN` i adres FE.  
- **Brak maili** → sprawdź Mailhog na `:8025`.  
- **Moderacja nie działa** → upewnij się, że działają usługi `ai-moderation` i `redis`.
