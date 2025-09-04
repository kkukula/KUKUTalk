# Instalacja Docker na Windows (krok po kroku)

Ten przewodnik włącza WSL2 i instaluje Docker Desktop (z Compose V2). Dzięki temu uruchomisz `docker` i `docker compose`.

## 1) Włącz WSL2
Otwórz **PowerShell jako Administrator** i uruchom:
```powershell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
wsl --set-default-version 2
```
> Jeśli `wsl` nie działa — zaktualizuj Windows i uruchom ponownie komputer.

## 2) Zainstaluj Docker Desktop for Windows
- Zainstaluj **Docker Desktop** (zaznaczone „Use WSL 2 based engine”).
- Po instalacji uruchom Docker Desktop i poczekaj na status **Engine running**.

## 3) Sprawdź instalację
W nowym oknie **PowerShell** (zwykłym):
```powershell
docker --version
docker compose version
docker run hello-world
```

## 4) Uruchom stack KUKUTalk
W katalogu repo:
```powershell
cd .\kukutalk
scripts\Run-Stack.ps1 -Rebuild
```
Aby zatrzymać:
```powershell
scripts\Down-Stack.ps1
```
Aby zatrzymać i usunąć dane (kasuje DB):
```powershell
scripts\Down-Stack.ps1 -Purge
```

## 5) Szybki sanity-check
- API: `curl http://localhost:3001/health`
- Web: otwórz `http://localhost:3000`
- MailHog: `http://localhost:8025`

### Najczęstsze problemy
- **„docker: command not found”** — uruchom Docker Desktop i sprawdź „Engine running”.
- **„WSL 2 not supported”** — włącz funkcje z kroku 1 i zrestartuj Windows.
- **Port zajęty (3000/3001)** — zatrzymaj konflikty lub zmień port w `infra/docker/docker-compose.yml`.
