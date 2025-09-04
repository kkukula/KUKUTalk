# SUPERPROMPT DLA CHATGPT — GENERACJA KUKUTalk (MVP)

Chcę, abyś wygenerował kompletną aplikację **KUKUTalk** – bezpieczny komunikator dla dzieci (7–12 lat) – zgodnie z poniższymi wytycznymi. Kod dostarcz w formie **jednego archiwum ZIP** oraz dołącz `INSTALL.md`. Zakres to MVP z miejscami na rozszerzenia (AI moderacja, panel rodzica/nauczyciela, klasa, zgodność z RODO). Komunikator ma działać w wersji weeb, iOS, Android.

## 1) Technologia
- **Backend:** TypeScript **NestJS** (REST + WebSocket/Socket.IO), **Prisma ORM**, **PostgreSQL** (prod), **SQLite** (dev opcjonalnie), **Redis** (kolejki i Socket.IO), **Passport JWT** (access+refresh), **Zod**/**class-validator**, **BullMQ** (moderacja async).
- **Frontend:** **Next.js 14+ (App Router)**, **TypeScript**, **TailwindCSS**, **shadcn/ui**, i18n (pl/en), WCAG AA.
- **Testy/CI:** Jest + Supertest (API), Testing Library (FE), Playwright (e2e), ESLint/Prettier/Husky, GitHub Actions (lint/test/build).
- **Infra:** **Docker Compose** (api, web, postgres, redis, mailhog), produkcyjne Dockerfile (multi-stage).

## 2) Monorepo
```
kukutalk/
  apps/
    api/               # NestJS
    web/               # Next.js
    ai-moderation/     # mikroserwis (stub)
    ai-tutor/          # mikroserwis (stub)
  packages/
    shared-types/      # DTO, eventy, kontrakty
    ui/                # wspólne komponenty (opcjonalnie)
  infra/
    docker/            # Dockerfile, compose
    prisma/            # schema, migracje, seed
  .github/workflows/
  package.json / pnpm-workspace.yaml
  README.md
  INSTALL.md
```
Użyj pnpm workspaces lub Turborepo.

## 3) Model danych (Prisma)
- `User` (role: CHILD, PARENT, TEACHER, ADMIN; zgody RODO; statusy).
- `GuardianLink` (relacja dziecko–rodzic, workflow akceptacji).
- `Contact` (white-list kontaktów dziecka, aprobaty rodzica).
- `Conversation` (DIRECT, CLASS), `Message` (treść, załącznik, status).
- `ModerationFlag` (typ, źródło, status, decyzja, metryki).
- `Classroom`, `ClassMembership` (tryb klasowy).
- `ConsentLog`, `AuditLog` (zgody i audyt).
- `Task`/`Reminder` (edukacyjne powiadomienia – placeholder).

Zaprojektuj indeksy (np. po `conversationId`, `createdAt`), klucze obce, soft-delete tam gdzie uzasadnione. Dołącz `prisma/seed.ts` z kontami demo i przykładowymi rozmowami.

## 4) API (REST) – kluczowe endpoints
- Auth: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
- Kontakty/Relacje: `POST /guardians/link`, `POST /contacts/request`, `POST /contacts/approve`, `GET /contacts`.
- Czat: `POST /conversations`, `GET /conversations`, `GET /conversations/:id/messages`, uploady.
- Moderacja: `GET /moderation/flags`, `POST /moderation/flags/:id/resolve`.
- Klasa: `POST /classrooms`, `POST /classrooms/:id/invite`, `GET /classrooms/:id`.
- Parent: `GET /parent/summary`, `GET /parent/alerts`.
- Health: `GET /health`.
Waliduj wszystkie wejścia; zwracaj Problem+JSON dla błędów.

## 5) WebSocket (Socket.IO)
Zaimplementuj: `rooms:join/leave`, `message:send`, `message:edited`, `message:deleted`, `presence:update`, `typing`, `moderation:notice`. Wysyłkę wiadomości poprzedza hook moderacyjny (queue). Dla `REVIEW` pokaż toast „Wiadomość czeka na sprawdzenie” z empatycznym copy.

## 6) Frontend – MVP
- Aplikacja dziecka: logowanie, lista kontaktów (zatwierdzone), czat 1:1/klasowy, tryb szkolny/wycisz, krótkie podpowiedzi językowe.
- Panel rodzica: akceptacja kontaktów, dashboard alertów/anomalii, prosty harmonogram dostępu.
- Konsola nauczyciela: utworzenie klasy, dodanie dzieci, ogłoszenia.
- A11y/i18n: pl/en, kontrast, aria, focus ring; testy dostępności.

## 7) Bezpieczeństwo & prywatność
JWT (rotacja), rate limiting, Helmet/CORS, CSP, minimalizacja danych, `ConsentLog`, `AuditLog`, zasada „as few as necessary”. Dostęp rodzica w formie podsumowań (nie pełne treści) – równowaga prywatność/opieka.

## 8) AI – stuby
- `ai-moderation`: reguły + scoring (wulgaryzmy/przemoc/grooming/self-harm), `POST /classify` → labels, scores, action (ALLOW/REVIEW/BLOCK).
- `ai-tutor`: `POST /explain`, `POST /quiz` – deterministyczne odpowiedzi (łatwy swap na LLM).
Integracja w API przez BullMQ i fallbacki (awaria AI ≠ awaria czatu).

## 9) DevEx & CI
ESLint/Prettier/Husky, Conventional Commits, README/INSTALL/SECURITY/PRIVACY, GitHub Actions (lint/test/build).

## 10) Dostarczenie
- Wygeneruj cały kod, **spakuj do `kukutalk-mvp.zip`**, dodaj link do pobrania.
- Dołącz `INSTALL.md` i `README.md` w repo.

## 11) Definition of Done (MVP)
- Rejestracja/logowanie (dziecko/rodzic) + seed użytkowników.
- White-list kontaktów akceptowanych przez rodzica, czat 1:1 (HTTP + WS).
- Czat klasowy.
- Hook moderacji (stub) + kolejka + UI toast przy REVIEW/BLOCK.
- Panel rodzica (akcepty + alerty).
- Docker Compose „up and running” po `docker compose up -d` + migracje/seed.

**Ważne:** Zadbaj o czysty, produkcyjny kod i testy. Nie dołączaj żadnych kluczy, sekretów, czy danych osobowych.
Instrukcja instalacji powinna być bardzo czytelna i możliwa do realizacji przez osobę nie techniczną.