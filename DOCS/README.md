# KUKUTalk

Bezpieczna komunikacja dla dzieci — monorepo (API + web) z prostym „Guard” (proxy moderujący) i przykładowym rate‑limitem.

> Ten README jest skróconym **Quickstartem**. Pełniejszy opis architektury i planu rozwoju znajdziesz w:
> - `TECHNICAL_OVERVIEW_2025-09-04.txt`
> - `KUKUTalk_HANDOFF_for_ChatGPT_2025-09-04.txt`

---

## Spis treści
- [Funkcje](#funkcje)
- [Architektura](#architektura)
- [Wymagania wstępne](#wymagania-wstępne)
- [Szybki start (Docker)](#szybki-start-docker)
- [Guard (moderacja + rate‑limit)](#guard-moderacja--rate-limit)
- [Migracje bazy / Prisma](#migracje-bazy--prisma)
- [Smoke‑testy API](#smoke-testy-api)
- [Wiadomości i rozmowy](#wiadomości-i-rozmowy)
- [Backup / Pit‑stop](#backup--pit-stop)
- [Rozwiązywanie problemów](#rozwiązywanie-problemów)
- [Roadmap](#roadmap)

---

## Funkcje
- Rejestracja / logowanie / refresh / logout (`/auth/*`).
- Konwersacje i wiadomości (REST) — minimalny przepływ E2E.
- „**Guard**” – lekki Node proxy przed API:
  - Reguły moderacji MVP: PII (telefon), propozycje spotkań „bez dorosłych”, proste bullyingowe frazy.
  - **Rate‑limit** domyślnie `5` wiadomości / `10s` per (użytkownik+rozmowa).
- Dockerowy stack: Postgres, Redis, API (+ opcjonalnie Guard).
- Skrypty pomocnicze (PowerShell) do smoke‑testów.

---

## Architektura
```
infra/docker/docker-compose.yml
  ├─ postgres    (db: kukutalk)
  ├─ redis
  └─ api         (NestJS + Prisma)

infra/docker/docker-compose.guard.yml
  └─ guard       (Node HTTP proxy → api:3001)

apps/
  ├─ api         (serwer REST + Prisma)
  └─ web         (front – TODO)
```

---

## Wymagania wstępne
- Docker, Docker Compose
- Node 20 (jeśli budujesz lokalnie poza kontenerem)
- Windows PowerShell 5.1 / PowerShell 7+ (skrypty testowe)
- (opcjonalnie) `curl`/Postman do testów ręcznych

---

## Szybki start (Docker)

1) Skopiuj pliki `.env` jeśli nie istnieją:
```
apps/api/.env            ← skopiuj z .env.example
apps/web/.env            ← skopiuj z .env.example (jeśli web używany)
```

2) Podnieś stack:
```powershell
$dc = "infra/docker/docker-compose.yml"
docker compose -f $dc up -d --build
```

3) Poczekaj aż API słucha na `:3001`.

---

## Guard (moderacja + rate‑limit)

Pliki:
```
infra/docker/guard/server.js
infra/docker/guard/Dockerfile
infra/docker/docker-compose.guard.yml
```

Uruchomienie z override:
```powershell
$dc = "infra/docker/docker-compose.yml"
$ov = "infra/docker/docker-compose.guard.yml"
docker compose -f $dc -f $ov up -d --build guard
```

Domyślnie Guard nasłuchuje na `http://localhost:3002` i proxuje do `api:3001`.

### Konfiguracja (zmienne środowiskowe)
- `TARGET` – URL API (domyślnie `http://api:3001`)
- `RL_MAX` – ile wiadomości w oknie (domyślnie `5`)
- `RL_WIN` – długość okna w ms (domyślnie `10000`)

### Reguły moderacji (MVP)
- **PII_PHONE** – numery telefonów PL albo słowa: `telefon`, `tel`, `numer`, `nr` → `BLOCKED`
- **MEETUP_RISK** – „spotkajmy się … bez dorosłych / nikomu nie mów” → `BLOCKED`
- **BULLYING** – proste frazy obraźliwe → `FLAGGED` (wiadomość dochodzi, ale status `FLAGGED`)

---

## Migracje bazy / Prisma

Status i deploy (wewnątrz kontenera API):
```powershell
$dc = "infra/docker/docker-compose.yml"
docker compose -f $dc exec api bash -lc "pnpm -C apps/api exec prisma migrate status --schema infra/prisma/schema.prisma"
docker compose -f $dc exec api bash -lc "pnpm -C apps/api exec prisma migrate deploy  --schema infra/prisma/schema.prisma"
```

> **Uwaga:** Prisma 5.x jest w użyciu; narzędzie wyświetla hint o 6.x — nie aktualizowaliśmy jeszcze.

---

## Smoke‑testy API

### Login / me (bez Guarda)
```powershell
$tok = Invoke-WebRequest -UseBasicParsing -Method POST -Uri "http://localhost:3001/auth/login" -ContentType "application/json" -Body (@{username="dev1";password="Passw0rd!"}|ConvertTo-Json)
$access = ($tok.Content | ConvertFrom-Json).accessToken
Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3001/auth/me" -Headers @{ Authorization = "Bearer $access" }
```

### Przez Guarda
```powershell
# gdy guard działa na :3002
$tok = Invoke-WebRequest -UseBasicParsing -Method POST -Uri "http://localhost:3002/auth/login" -ContentType "application/json" -Body (@{username="dev1";password="Passw0rd!"}|ConvertTo-Json)
$access = ($tok.Content | ConvertFrom-Json).accessToken
Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3002/auth/me" -Headers @{ Authorization = "Bearer $access" }
```

> **Windows/PowerShell TIP:** jeżeli trafiasz na błąd `Expect: 100-continue` / zerwane połączenie:
> ```
> [System.Net.ServicePointManager]::Expect100Continue = $false
> ```
> lub użyj `curl`/Postman.

---

## Wiadomości i rozmowy

### Lista rozmów
```powershell
Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3001/conversations" -Headers @{ Authorization = "Bearer $access" }
```

Jeśli pusto, minimalny seed (wewnątrz kontenera API) — wersja „DMMF-driven” wybierająca tylko wymagane pola:
```bash
node /app/apps/api/_mkconv_req.js <userId>   # patrz: dokument "handoff" – gotowy skrypt i opis
```

### Wysłanie wiadomości
```powershell
$convId = "<twoje-id>"
$payload = @{ content = "Cześć! To testowa, bezpieczna wiadomość" } | ConvertTo-Json
Invoke-WebRequest -UseBasicParsing -Method POST -Uri "http://localhost:3001/conversations/$convId/messages" -ContentType "application/json" -Headers @{ Authorization = "Bearer $access" } -Body $payload
```

### Przez Guarda + weryfikacja moderacji/rate‑limit
- POST przez `http://localhost:3002/conversations/{id}/messages`
- Dla PII/MEETUP → `status: BLOCKED` (syntetyczna odpowiedź z guarda)
- Dla bullying → `status: FLAGGED`
- Flooding → HTTP `429` lub `status: RATE_LIMITED` (w zależności od klienta)

---

## Backup / Pit‑stop

### Backup Postgresa
```powershell
$dc = "infra/docker/docker-compose.yml"
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
docker compose -f $dc exec -T postgres pg_dump -U postgres -d kukutalk -F c -Z 9 -f "/tmp/kukutalk_$ts.backup"
docker compose -f $dc cp postgres:/tmp/kukutalk_$ts.backup "./backups/pg/kukutalk_$ts.backup"
docker compose -f $dc exec -T postgres rm -f "/tmp/kukutalk_$ts.backup"
```

### .gitignore (zalecane)
```
/backups/
/**/*.backup
apps/*/.env
infra/**/.env
.env
```

### Commit + tag (przykład kroku)
```powershell
git add infra/docker/guard/server.js
git add infra/docker/guard/Dockerfile
git add infra/docker/docker-compose.guard.yml
git add .gitignore
git commit -m "feat(guard): moderation MVP + rate-limit; chore: backups ignored"
git tag -f step-07
```

---

## Rozwiązywanie problemów

- **`Invoke-WebRequest` zrywa połączenie / `Expect: 100-continue`**  
  Wyłącz globalnie w sesji:
  ```powershell
  [System.Net.ServicePointManager]::Expect100Continue = $false
  ```
  albo użyj `curl`:

  ```bash
  curl -s -X POST http://localhost:3002/auth/login \
       -H "Content-Type: application/json" \
       -d '{"username":"dev1","password":"Passw0rd!"}'
  ```

- **`@prisma/client` nie znaleziony w `node -e`**  
  Uruchamiaj skrypty **wewnątrz** kontenera `api` w katalogu `/app/apps/api` (gdzie zainstalowany jest klient), albo kopiuj plik do tego katalogu i dopiero odpalaj.

- **`no such service: guard`**  
  Użyj override:
  ```powershell
  docker compose -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.guard.yml up -d guard
  ```

---

## Roadmap
Zarys kolejnych kroków (szczegóły w handoff/overview):

1. **Guard v2** – logowanie decyzji, proste reguły konfigurowalne (JSON), lepsze kategorie.  
2. **Moderation API** po stronie serwera (webhook od Guarda + audyt w DB, panel review).  
3. **Front (apps/web)** – logowanie, lista rozmów, wysyłanie wiadomości, bannery „FLAGGED/BLOCKED”.  
4. **Role/Uprawnienia** – CHILD / PARENT / MODERATOR, weryfikacje po stronie API.  
5. **Bezpieczeństwo** – ograniczenia uploadu, skan MIME, rozmiar, CSP na froncie.  
6. **CI/CD** – testy e2e, obrazy, release’y, kopie zapasowe cron.  

---

\*Ten README jest „żywy” – aktualizuj go wraz z postępami w repo.
