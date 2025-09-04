# Weryfikacja plików — PowerShell

Jeśli zobaczysz błąd o „Execution Policy” (brak podpisu), użyj jednej z bezpiecznych metod:

## Szybko (CMD, bez zmian globalnych)
Uruchom w CMD:
```
scripts\verify.cmd
```

## Ręcznie (tylko dla tej komendy)
```
PowerShell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Verify-KUKUTalk.ps1
```

## Odblokowanie pliku (jeśli ma znacznik z Internetu)
```
Unblock-File -Path .\scripts\Verify-KUKUTalk.ps1
.\scripts\Verify-KUKUTalk.ps1
```

## Tylko bieżąca sesja (tymczasowo)
```
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\Verify-KUKUTalk.ps1
```

---

## Standardowe użycie
1. Otwórz PowerShell w folderze repo:
   ```powershell
   cd .\kukutalk
   ```
2. Uruchom weryfikator (jedna z metod powyżej).  
Skrypt wypisze **OK/MISS** dla każdej ścieżki i podsumowanie na końcu.
