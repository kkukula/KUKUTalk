# KUKUTalk — Postęp prac (MVP) i kolejne kroki

Ten dokument podsumowuje to, co już zostało przygotowane w repo oraz sugeruje następne kroki,
aby lokalnie uruchomić MVP (Docker Compose) i dopiąć brakujące elementy.

## ✅ Zrobione (skrót)
- **Monorepo (pnpm + Turborepo)**: `package.json`, `pnpm-workspace.yaml`, `turbo.json`.
- **Baza danych & ORM**: `Prisma` + schema + seed (demo konta/relacje/rozmowy).
- **API (NestJS)** — moduły:
  - `Auth` (JWT access/refresh + rotacja) — REST: `/auth/*`.
  - `Users` (podgląd profili + role guard).
  - `Guardians` (relacja rodzic–dziecko).
  - `Contacts` (białe listy i akceptacje).
  - `Chat` (HTTP: rozmowy/wiadomości/upload, **WebSocket/Socket.IO** gateway).
  - `Moderation` (BullMQ + procesor; integracja z mikroserwisem `ai-moderation`).
  - `Classrooms` (klasa, memberships, conversation typu `CLASS`).
  - `Parent` (dashboard/alerts).
  - `PrismaModule` (wstrzykiwanie klienta DB).
- **Mikroserwisy (stuby)**:
  - `apps/ai-moderation` — `POST /classify` (ALLOW/REVIEW/BLOCK).
  - `apps/ai-tutor` — `POST /explain`, `POST /quiz`.
- **Front-end (Next.js App Router)**: logowanie, prosta lista rozmów i czat, szkielety dashboardów.
- **Testy (web)**: Jest (unit) i Playwright (e2e) + ESLint/Prettier.
- **Docker**: multi-stage Dockerfile dla `api`, `web`, `ai-moderation`, `ai-tutor` + `docker-compose.yml` (wraz z Postgres, Redis, Mailhog).
- **GitHub Actions**: CI (lint/build/test) + e2e web, dodatkowo “Docker smoke build”.

## ⚠️ Braki (do uzupełnienia)
1. **Bootstrap API (NestJS)** — pliki startowe:
   - `apps/api/src/main.ts` (CORS, Helmet, validation pipe, global filters Problem+JSON, wsparcie dla `json` limitów).
   - `apps/api/src/app.module.ts` (import modułów: `PrismaModule`, `AuthModule`, `UsersModule`, `GuardiansModule`, `ContactsModule`, `ChatModule`, `ModerationModule`, `ClassroomsModule`, `ParentModule`).
   - **Healthcheck**: `GET /health`.
2. **Konfiguracja aplikacji (API)**:
   - `apps/api/tsconfig.json`, `apps/api/tsconfig.build.json`, `.eslintrc.json`, `jest.config.ts`.
   - Statyczne serwowanie uploadów (np. `/uploads/*`).  
3. **Packages (opcjonalne)**: `packages/shared-types`, `packages/ui`.
4. **Front-end**:
   - Prostsze UI do akceptacji kontaktów (rodzic) i tworzenia klas (nauczyciel).
   - i18n (komplet komunikatów; obecnie jest szkic `pl/en`).

> Uwaga: brakujące pozycje są celowo zostawione, aby móc je kontrolowanie dodać w kolejnych krokach.

## ▶️ Proponowana sekwencja dalszych kroków
1. **Dodać bootstrap API** (`main.ts`, `app.module.ts`, `/health`) + podstawowe configi TS/ESLint/Jest w `apps/api`.
2. **Zintegrować moduły** w `AppModule` i zbudować API lokalnie.
3. **Uruchomić `docker compose up -d`** (bazy/redis/ai + api + web), sprawdzić zdrowie usług.
4. **Migracje/seed**: potwierdzić, że `entrypoint.api.sh` wykonał `migrate deploy` i `db seed`.
5. **Smoke test**: zalogować się kontem demo, wysłać wiadomość (zobaczyć toast “REVIEW”). 
6. **UI rodzica i nauczyciela**: dołożyć minimalne ekrany akceptacji kontaktów i tworzenia klasy.
7. **(Opcjonalnie) Packages**: `shared-types`, `ui`, a następnie integracja po obu stronach.
8. **Twarde zabezpieczenia**: rate limiting, CSP, dopracowanie Audit/ConsentLog (już w modelu).

## ℹ️ GitHub Actions — co robi nasz CI
- Na każdy push/PR do `main`/`develop`: instalacja → **lint** → **build** → **unit testy**.  
- E2E dla Web: buduje Next.js, uruchamia lokalnie i odpala Playwright.  
- Osobny workflow buduje obrazy Docker dla API/WEB (bez wypychania do registry).

## ❓Jak sprawdzić, czy pliki są na miejscu
Użyj skryptu PowerShell: `scripts/Verify-KUKUTalk.ps1` (poniżej instrukcja).
