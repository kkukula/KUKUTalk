# GitHub Actions — krótkie wyjaśnienie

**Co to jest?**  
To automatyczne zadania uruchamiane przez GitHuba po każdym pushu / Pull Requeście. Dzięki temu repo samo sprawdza jakość kodu.

**Co robi nasz CI (`.github/workflows/ci.yml`)?**
- Instaluje Node + pnpm, ładuje cache.
- Uruchamia **lint**, **build** i **testy jednostkowe** dla całego monorepo.
- Dla frontendu uruchamia **testy E2E (Playwright)**: buduje aplikację, startuje ją i klika po stronie.

**Co robi `docker-smoke.yml`?**
- Sprawdza, że obrazy **API** i **WEB** da się zbudować (bez publikacji).

> Nie musisz nic klikać — to dzieje się automatycznie na GitHubie, gdy wrzucisz zmiany.
