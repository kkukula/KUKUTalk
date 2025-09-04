# PRIVACY_SECURITY.md — Prywatność i bezpieczeństwo

- **Privacy by design**: minimalizacja danych; jawne zgody; `ConsentLog`; przejrzystość w `AuditLog`.
- **Dostęp rodzica**: podsumowania i alerty zamiast pełnych treści rozmów (balans prywatność/opieka).
- **Autoryzacja**: JWT access/refresh z rotacją; ograniczanie uprawnień (RBAC po rolach).
- **Ochrona**: rate limiting, Helmet, CORS, CSP, walidacja wejścia; skanowanie uploadów.
- **Przechowywanie**: szyfrowanie w tranzycie (TLS); hasła z argon2/bcrypt; backupy bazy.
- **Moderacja AI**: mikroserwis jako stub; brak danych w chmurze w MVP; możliwość lokalnej inferencji.
- **Zgodność**: RODO/COPPA – krótkie retention, prawo do wglądu/erasura, privacy notice.
