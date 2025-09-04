# ARCHITECTURE.md — Architektura KUKUTalk (MVP)

## Przegląd
Monorepo z aplikacjami: **api** (NestJS), **web** (Next.js) oraz mikroserwisy **ai-moderation** (stub) i **ai-tutor** (stub). Wspólne typy i UI w `packages/`. Infrastruktura przez Docker Compose: Postgres, Redis, Mailhog.

## Komponenty
- **API (NestJS)** — REST + Socket.IO; autoryzacja JWT; Prisma ORM; kolejki BullMQ do moderacji.
- **Web (Next.js)** — UI dla dziecka/rodzica/nauczyciela; i18n; A11y; shadcn/ui; Tailwind.
- **ai-moderation (stub)** — deterministyczna klasyfikacja (ALLOW/REVIEW/BLOCK), interfejs `POST /classify`.
- **ai-tutor (stub)** — edukacyjne odpowiedzi, `POST /explain`, `POST /quiz`.

## Dane
Prisma modele: User, GuardianLink, Contact, Conversation, Message, ModerationFlag, Classroom, ClassMembership, ConsentLog, AuditLog, Task/Reminder.

## Przepływy kluczowe
- **Rejestracja/Logowanie** → JWT access/refresh, rotacja.
- **White-list kontaktów** → dziecko rozmawia tylko z zatwierdzonymi.
- **Czat** → HTTP (lista, historia) + WS (wydarzenia live), hook moderacyjny przed publikacją.
- **Panel rodzica** → akcepty, alerty, podsumowania zamiast pełnych transkryptów (privacy by design).

## Bezpieczeństwo
Helmet/CSP/CORS, rate limiting, logi audytu, minimalizacja danych, jawne zgody (ConsentLog).

## CI/CD
ESLint/Prettier/Husky; GitHub Actions (lint/test/build). Deployment docelowo: kontenery.
