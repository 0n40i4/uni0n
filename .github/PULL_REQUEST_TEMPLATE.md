# Pull Request

## Co

Krótki opis zmian.

Fixes #(issue) / Refs #(issue)

## Dlaczego

Motywacja zmian (jeśli nie jest oczywista z linkowanego issue).

## Jak

Kluczowe decyzje implementacyjne / trade-offs.

## Testy

- [ ] TypeScript: 0 błędów (`npm run build`)
- [ ] ESLint: pass
- [ ] Manualne smoke testy:
  - [ ] Local `docker-compose up` → `/health` zwraca `"zdrowy"`
  - [ ] Endpoint dotknięty zmianą zwraca oczekiwane wartości
  - [ ] Brak regresji innych endpointów (sprawdziłem `/api/status`, `/api/leaderboard`, `/feed/ai.xml`)
- [ ] Migracje DB (jeśli dodane): idempotent (`CREATE ... IF NOT EXISTS`)

## Wpływ

- [ ] Breaking change w publicznym API
- [ ] Dodaje / zmienia migrację DB
- [ ] Wymaga nowych env vars / secrets
- [ ] Wymaga aktualizacji dokumentacji

## Checklist

- [ ] Branch nie jest `main`
- [ ] Commit messages w formacie `type(scope): opis`
- [ ] README / docs zaktualizowane (jeśli zmiana wpływa)
- [ ] CHANGELOG.md zaktualizowany pod sekcją `[Unreleased]`
- [ ] Brak hardcoded sekretów / API keys
