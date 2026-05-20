# K0NSULT / chat.k0nsult.cloud - raport sesji

## Merge /api/summon + /api/skills_master, stan repo i handoff operacyjny

Data opracowania: 20 maja 2026  
Tryb: GO CONTROLLED / dokumentacyjny / bez nowych zmian produkcyjnych.  
Źródło: transkrypt zadania, próby commitu, weryfikacji i zamknięcia sesji.

## Werdykt wykonawczy

Załącznik opisuje sesję dotyczącą repo `C:\tmp\k0nsult-chat`, gdzie celem było przeniesienie dwóch endpointów z wersji deployowej `C:\tmp\k0nsult-chat-deploy\server.js` do working repo `C:\tmp\k0nsult-chat\server.js`: `POST /api/summon` oraz `GET /api/skills_master`.

Najważniejsze ustalenie: faktyczny merge endpointów był już obecny w historii repo jako commit `f80be64` z 14.05.2026. W trakcie bieżącej sesji nie powstał nowy commit dla endpointów, ponieważ repo już zawierało właściwe zmiany. Potwierdzono, że endpointy nie są zduplikowane, istnieją pojedynczo w `server.js`, a commit `f80be64` dodał 173 linie do `server.js`.

W historii repo po `f80be64` znajduje się nowszy commit `2a55012`, który dodał health/provenance pack: `/healthz`, `/readyz`, wersjonowanie nagłówków, Fly checks, `min_machines_running = 1` i rolling deploy. Obecny HEAD repo jest dalej niż sam merge `/api/summon` + `/api/skills_master`.

## Zadanie wejściowe

Porównywane pliki:
- `C:\tmp\k0nsult-chat-deploy\server.js` - 49 290 bajtów.
- `C:\tmp\k0nsult-chat\server.js` - 46 710 bajtów przed merge.

Do przeniesienia:
1. `POST /api/summon` - multi-agent dispatch: `agents[]`, `brief`, `phase_label`, header fazy do Telegram, fan-out do agentów, rate limit `3/60s`, parser `summonJsonParser`.
2. `GET /api/skills_master` - proxy/cache: upstream skills master, `_skillsMasterCache`, `SKILLS_CACHE_TTL`, nagłówki `X-Cache`.

Zależności: `internalPublish`, `summonJsonParser`, `_skillsMasterCache`, `SKILLS_CACHE_TTL`, `OPS_USER`, `OPS_PASS`, `SKILLS_MASTER_URL`.

## Potwierdzenia z sesji

Weryfikacja `server.js` wykazała:

```text
server.js:973  async function internalPublish(...)
server.js:1021 app.post('/api/summon', summonJsonParser, rateLimit(3, 60000), ...)
server.js:1111 app.get('/api/skills_master', ...)
```

Kluczowy commit:

```text
f80be64 feat: merge /api/summon + /api/skills_master from deploy version
server.js | 173 insertions(+)
Thu May 14 07:17:06 2026 +0200
```

Nowszy commit:

```text
2a55012 feat(health+provenance): add Fly http_service.checks + /healthz + /readyz + version headers
```

Zakres `2a55012`:
- `fly.toml`: `[[http_service.checks]]` dla `/healthz` i `/api/health`,
- `min_machines_running`: `0 -> 1`,
- `[deploy] strategy = rolling`,
- `server.js`: `/healthz`, `/readyz`, version/channel fields w `/api/health`,
- nagłówki `X-Service-Version`, `X-Service-Channel`,
- `SERVICE_VERSION` z `package.json`,
- `BUILD_SHA` z `FLY_MACHINE_VERSION | GIT_SHA`,
- alignment z `RFC-001 Federated Reporting Standard v1` w `uni0n`.

## Endpointy

### POST /api/summon

Funkcja: kontrolowany multi-agent dispatch dla operacji summon / event / CNC.

Ryzyka:
- endpoint ma side-effecty: publikuje fazy i wiadomości,
- powinien mieć jasny auth/rate-limit/guard,
- testy powinny mieć tryb dry-run albo smoke-safe path,
- max 100 agentów wymaga monitorowania latencji i limitów providerów.

### GET /api/skills_master

Upstream domyślny: `https://ops.k0nsult.cloud/skills_master.json`.
Zmienne środowiskowe: `SKILLS_MASTER_URL`, `K0NSULT_OPS_USER`, `K0NSULT_OPS_PASS`.
Cache: `_skillsMasterCache`, `SKILLS_CACHE_TTL = 5 min`.
Nagłówki: `X-Cache: HIT | MISS | STALE | STALE-ERR`.

Ryzyka:
- duży payload,
- upstream może wymagać Basic Auth,
- stale-on-error wymaga monitoringu,
- warto logować cache hit ratio i czas odpowiedzi upstream.

## Stan repo i artefakty

Repo lokalne: `C:\tmp\k0nsult-chat`.  
Branch: `master`.  
Remote status: `Your branch is up to date with origin/master`.

Untracked files:

```text
health.json
skills_master.json
summon.json
```

Rekomendacja: dodać do `.gitignore` wzorzec dla lokalnych test JSON albo usunąć te pliki lokalnie. Nie commitować bez review, bo mogą zawierać dane testowe, cache lub response payloady.

## Linki i ścieżki

- `C:\tmp\k0nsult-chat\server.js`
- `C:\tmp\k0nsult-chat-deploy\server.js`
- `C:\tmp\k0nsult-chat\fly.toml`
- `C:\Users\USER\.claude\projects\C--Users-USER\memory\SESSION_20260520_K0NSULT_CHAT_MERGE.md`
- `POST /api/summon`
- `GET /api/skills_master`
- `GET /healthz`
- `GET /readyz`
- `GET /api/health`
- `GET /api/smoke`
- `GET /api/replay`
- `POST /api/replay/anchor`
- `GET /metrics`
- `https://github.com/0n40i4/k0nsult-chat`
- `https://github.com/0n40i4/uni0n`
- `https://ops.k0nsult.cloud/skills_master.json`
- `https://chat.k0nsult.cloud`

## Komendy referencyjne

```powershell
cd C:\tmp\k0nsult-chat
git status
git log --oneline -8
git show f80be64 --stat
git show 2a55012 --stat
Select-String "app.post\('/api/summon'" server.js
Select-String "app.get\('/api/skills_master'" server.js
Select-String "async function internalPublish" server.js
(Get-Item server.js).Length
```

Uwaga: dla repo Windows używać PowerShell; Bash w tej sesji nie obsłużył poprawnie ścieżek `C:\tmp\...`.

## Co pominięto

Pominięto pełne 173 linie kodu z commitu `f80be64`, pełne diffy `server.js` i `fly.toml`, treści JSON testowych `health.json`, `skills_master.json`, `summon.json`, dane sekretów oraz wykonanie nowego commitu/deployu.

## Pakiet pamięciowy

`k0nsult-chat` ma już merge `/api/summon` i `/api/skills_master` w commit `f80be64`. Obecny HEAD według transkryptu to `2a55012`, który dodaje `/healthz`, `/readyz`, version headers, Fly checks, `min_machines_running=1` i rolling deploy. Repo jest up to date with `origin/master`, ale ma untracked lokalne pliki `health.json`, `skills_master.json`, `summon.json`. Następny krok: dodać test artefacts do `.gitignore` albo usunąć; nie commitować bez ACK. Sesję traktować jako zamkniętą dokumentacyjnie, bez nowego deployu.
