# CHECKLIST.md — Go/No-Go dla MVP

- [ ] Zainstalowano Docker Desktop i Node LTS + pnpm.
- [ ] Wygenerowano kod przy użyciu `SUPERPROMPT.md` (zip pobrany).
- [ ] Ustalono sekrety w `.env` (JWT_SECRET, DATABASE_URL, REDIS_URL).
- [ ] Uruchomiono `docker compose up -d --build`.
- [ ] Wykonano migracje i seed bazy.
- [ ] Logowanie i czat 1:1 działają.
- [ ] Czat klasowy działa.
- [ ] Moderacja (REVIEW/BLOCK) działa + UI toast.
- [ ] Panel rodzica: akcepty + alerty.
- [ ] Testy jednostkowe i e2e przechodzą w CI.
