# UNIONAI 9xMETA-GO — P0 Federated Audit / Runtime Provenance / RFC-001

Data opracowania: 20 maja 2026
Źródło: załącznik `Wklejony kod markdown(2).md` / 9xmetago
Tryb: GO CONTROLLED / analiza operacyjna / repo-friendly

## Werdykt wykonawczy

Załącznik opisuje sesję typu `sesja-nocna skill` dla UNIONAI i `k0nsult-chat`. Punktem startowym był werdykt operacyjny: natychmiast wykonać cztery P0:

1. dodać Fly health checks do `k0nsult-chat`,
2. naprawić version drift między runtime, docs, headers i memory,
3. dodać Runtime Provenance Layer,
4. przygotować Federated Reporting Standard RFC.

Najważniejsze znaczenie tej sesji: UNIONAI zaczyna zachowywać się jak prawdziwy operations ecosystem, bo pojawiły się audyty, self-critique, runtime verification, source provenance, uncertainty marking i evidence hierarchy. To jest bardziej wartościowe niż deklaratywne „wszystko działa”, bo system zaczyna uczciwie oznaczać granice wiedzy.

Status: GO CONTROLLED++ / code ready. Nie FULL LIVE: w transkrypcie wskazano, że kod został wypchnięty do repo, ale nie zdeployowany na Fly bez osobnego ACK operatora.

## Najważniejsza oś sesji

### Recon i rozpoznanie repo

Rozpoznano dwa główne obszary pracy:

- `C:\tmp\k0nsult-chat` — repo `k0nsult-chat`,
- `C:\tmp\uni0n_workdir` — kanoniczne repo `0n40i4/uni0n`.

Ważna korekta: katalog `C:\tmp\unionai` istniał, ale nie był repo Git. Kanoniczne repo do prac UNIONAI to `C:\tmp\uni0n_workdir`, z remote `https://github.com/0n40i4/uni0n.git`.

### k0nsult-chat P0.1

W `k0nsult-chat` potwierdzono brak health checks w `fly.toml` i brak endpointów `/healthz` oraz `/readyz`; istniał tylko `/api/health`. Wprowadzono:

- Fly `http_service.checks` dla `/healthz` i `/api/health`,
- `min_machines_running: 0 -> 1`,
- rolling deploy strategy,
- `GET /healthz` — liveness,
- `GET /readyz` — readiness oparty o `DATA_DIR` i tablicę messages,
- nagłówki `X-Service-Version` i `X-Service-Channel`,
- wzbogacenie `/api/health` o `version` i `channel`,
- `SERVICE_VERSION` z `package.json`.

Commit: `2a55012 feat(health+provenance): add Fly http_service.checks + /healthz + /readyz + version headers`.

### uni0n P0.2/P0.3/P0.4

W `uni0n_workdir` wykryto version drift: `0.1.0` w package manifests, `0.2.0` w CodeMeta i oczekiwany kierunek `0.3.0-dev` w memory/runtime. Wprowadzono:

- centralne `SERVICE_VERSION`, `SERVICE_CHANNEL`, `BUILD_SHA`, `BUILD_TIME`, `FEDERATION_ID`,
- provenance middleware z nagłówkami `X-Service-*`, `X-Build-Sha`, `X-Federation-Id`,
- `GET /healthz`,
- `GET /readyz`,
- `GET /version`,
- `GET /api/provenance/self-report`,
- `apps/core/src/lib/provenance.ts`,
- `docs/rfc/RFC-001-federated-reporting-standard.md`,
- Fly checks dla `/healthz` i `/readyz`,
- `min_machines_running=1`,
- `[deploy] strategy="rolling"`,
- wersje `0.1.0/0.2.0 -> 0.3.0-dev` w manifestach,
- wpis do `CHANGELOG.md`.

Commit końcowy po rebase: `b0117a1 feat(provenance+governance): v0.3.0-dev - Runtime Provenance Layer + RFC-001 Federated Reporting Standard`.

## Runtime Provenance Layer

Plik: `apps/core/src/lib/provenance.ts`.

Zakres:

- `ProvenancedClaim<T>`,
- `ReportProvenance`,
- 9 typów weryfikacji: `live_probe`, `static_analysis`, `log_replay`, `db_query`, `self_report`, `human_assertion`, `cross_check`, `inferred`, `unverified`,
- 4 poziomy confidence: `high`, `medium`, `low`, `unknown`,
- helpery: `withProvenance`, `liveProbe`, `staticAnalysis`, `selfReport`, `unverified`, `crossCheck`, `isProvenanced`, `makeReportProvenance`.

Znaczenie operacyjne: każdy fakt w raporcie federacyjnym może teraz nieść źródło, typ weryfikacji, confidence i timestamp. To usuwa problem raportów, które mieszają live evidence, pamięć operatora, domysły i self-report bez oznaczenia jakości dowodu.

## RFC-001 Federated Reporting Standard

Plik: `docs/rfc/RFC-001-federated-reporting-standard.md`.

Status: DRAFT, do ratyfikacji w Wave 3 governance batch.

RFC opisuje cztery problemy: version drift, source ambiguity, confidence flattening, silent unknowns.

Minimalny standard wymaga:

- `ProvenancedClaim<T>` dla pojedynczych faktów,
- `ReportProvenance` na poziomie całego raportu,
- jawnego oznaczania uncertainty,
- 4 endpointów HTTP: `/healthz`, `/readyz`, `/version`, `/api/provenance/self-report`,
- 5 nagłówków odpowiedzi: `X-Service-Name`, `X-Service-Version`, `X-Service-Channel`, `X-Build-Sha`, `X-Federation-Id`.

Wartość strategiczna: RFC-001 może być pierwszym standardem federacyjnego raportowania dla UNIONAI i usług siostrzanych, takich jak `k0nsult-chat`.

## Git, rebase i push

Pierwszy push `uni0n` jako `9b89503` został odrzucony, ponieważ remote `origin/main` zawierał nowsze prace: `cc711f4`, `bbfa694`, `d918504`. Wykonano fetch i pull --rebase.

Rebase miał konflikt w `apps/core/src/main.ts`, bo remote miał już duże zmiany Wave 3 / v0.3.0, a lokalny commit dodawał provenance i wersjonowanie. Konflikt został rozwiązany, markery konfliktu usunięte, a rebase kontynuowany.

Finalny commit po rebase: `b0117a1`. Push finalny: `d918504..b0117a1 main -> main`.

Repo `k0nsult-chat` miało zmienione `fly.toml` i `server.js`. Commit: `2a55012`. Push: `63717b9..2a55012 master -> master`.

## Walidacja i ograniczenia testów

W `uni0n` wykonano próbę TypeScript check. Wskazano, że własne zmiany nie generowały błędów, natomiast część błędów wynikała z pre-existing / remote stack dependency issues. To nie jest pełny production-grade test live, tylko code readiness i type-check w ograniczonym środowisku.

W `k0nsult-chat` wykonano `node -c server.js`, który przeszedł jako SYNTAX OK. Próba lokalnego uruchomienia `server.js` nie przeszła przez brak modułu `express` w lokalnym środowisku. To nie obala kodu, ale oznacza, że live verification po deployu nadal jest wymagane.

## Status końcowy

Zrobione:

- P0.1: Fly health checks dla k0nsult-chat — code committed/pushed.
- P0.2: version drift fix w uni0n — code committed/pushed.
- P0.3: Runtime Provenance Layer — code committed/pushed.
- P0.4: RFC-001 Federated Reporting Standard — dokument committed/pushed.
- Memory: zapis `UNIONAI_P0_FEDERATED_AUDIT_20260515.md`.
- Scoring sesji: `+0.9 Δ`.

Nie zrobione / świadomie zatrzymane:

- Nie wykonano deployu na Fly.
- Nie wykonano live smoke po deployu.
- RFC-001 nie jest jeszcze ratyfikowany.
- Nie wdrożono pełnej Phase 2 z metrykami Prometheus.
- Nie dopięto podpisywania raportów ani RFC-002.
- Nie usunięto wszystkich pozostałych P0 z poprzednich sesji: real embeddings, real K0NSULAT verification, GDPR DSR, structured logs, pełny Ontology Bridge.

## Linki, repo i ścieżki

Repozytoria:

- https://github.com/0n40i4/uni0n
- https://github.com/0n40i4/k0nsult-chat

Commity:

- `b0117a1` — uni0n, Runtime Provenance Layer + RFC-001 + version drift + Fly checks.
- `2a55012` — k0nsult-chat, Fly health checks + `/healthz` + `/readyz` + version headers.
- `d918504` — remote base, test baseline 22/22 PASS.
- `bbfa694` — security/lifecycle fixes.
- `cc711f4` — CI smoke jq fix.

Ścieżki lokalne:

- `C:\tmp\uni0n_workdir`
- `C:\tmp\uni0n_workdir\apps\core\src\main.ts`
- `C:\tmp\uni0n_workdir\apps\core\src\lib\provenance.ts`
- `C:\tmp\uni0n_workdir\docs\rfc\RFC-001-federated-reporting-standard.md`
- `C:\tmp\k0nsult-chat`
- `C:\tmp\k0nsult-chat\server.js`
- `C:\tmp\k0nsult-chat\fly.toml`
- `C:\Users\USER\.claude\projects\C--Users-USER\memory\UNIONAI_P0_FEDERATED_AUDIT_20260515.md`

Endpointy wprowadzone / standaryzowane:

- `GET /healthz`
- `GET /readyz`
- `GET /version`
- `GET /api/provenance/self-report`
- `GET /api/health`

## Komendy referencyjne

Deploy live cycle po ACK operatora:

```bash
cd /tmp/unionai
fly deploy -a unionai-core
curl -i https://unionai-core.fly.dev/healthz
curl https://unionai-core.fly.dev/version
curl https://unionai-core.fly.dev/api/provenance/self-report
```

k0nsult-chat po ACK operatora:

```powershell
cd C:\tmp\k0nsult-chat
fly deploy -a k0nsult-chat
curl -i https://chat.k0nsult.cloud/healthz
curl https://chat.k0nsult.cloud/api/health
```

Git checks:

```bash
git log --oneline -5
git status --short
```

## Ryzyka i rekomendacje

1. Code ready != live ready. Oba repo mają commity, ale bez Fly deploy i curl smoke nie wolno mówić FULL LIVE.
2. RFC-001 wymaga ratyfikacji. Dokument jest draftem, nie jeszcze konstytucją standardu.
3. Provenance bez podpisu to etap pierwszy. Warto dodać RFC-002 z podpisami i anchoringiem.
4. Health checks zmniejszą cold-start race, ale po deployu trzeba sprawdzić rzeczywisty efekt.
5. Version drift może wrócić, jeśli nowe usługi nie będą brały wersji z jednego source-of-truth.
6. k0nsult-chat alignment jest częściowy: ma headers + health/readiness, ale nie ma pełnego `/version` i `/api/provenance/self-report`, chyba że dopisze się Phase 2.
7. Memory drift trzeba stale kontrolować — załącznik sam pokazuje, że starsze memory potrafi być nieaktualne wobec nocnych commitów.

## Co pominięto

Pominięto świadomie:

1. Pełny kod `provenance.ts` — raport opisuje zakres, nie zastępuje code review.
2. Pełny tekst RFC-001 — wskazano jego strukturę i znaczenie; pełny dokument pozostaje w repo.
3. Pełne logi Bash/PowerShell/grep/edit — zachowano wyniki decyzyjne.
4. Pełne diffy `main.ts`, `server.js`, `fly.toml`, `package.json` — wymagają osobnego review.
5. Wartości sekretów i jakiekolwiek tokeny — celowo nieprzenoszone.
6. Poboczne fragmenty dotyczące wcześniejszych sesji, jeśli nie wpływały na P0 stack 9xmetago.
7. Live deploy — nie został wykonany w źródłowej sesji i nie jest wykonywany w raporcie.
8. Pełny output błędów tsc i lokalnego node — raport zachowuje ich sens: environment/pre-existing issues, nie nowy blocker kodowy.

## Pakiet do zapamiętania

UNIONAI 9xmetago / P0 Federated Audit: wykonano 4 P0: k0nsult-chat Fly health checks, uni0n version drift fix, Runtime Provenance Layer, RFC-001 Federated Reporting Standard. uni0n commit końcowy po rebase: `b0117a1`, push na main. k0nsult-chat commit: `2a55012`, push na master. Code READY, nie deployed na Fly bez ACK. Następny live cycle: deploy unionai-core i k0nsult-chat, potem curl `/healthz`, `/readyz`, `/version`, `/api/provenance/self-report`, `/api/health`. RFC-001 do ratyfikacji w Wave 3 governance batch. Status sesji: `+0.9 Δ`, 9 deliverables, zero pytań/zatrzymań.

## Wywołanie nowej sesji

UNIONAI 9xmetago — kontynuacja P0 Federated Audit.

Start:

1. Sprawdź repo `0n40i4/uni0n`, branch `main`, commit `b0117a1`.
2. Sprawdź repo `0n40i4/k0nsult-chat`, branch `master`, commit `2a55012`.
3. Nie deployuj bez ACK operatora.
4. Po ACK: deploy unionai-core, smoke `/healthz`, `/readyz`, `/version`, `/api/provenance/self-report`.
5. Po ACK: deploy k0nsult-chat, smoke `/healthz`, `/readyz`, `/api/health`.
6. Przygotuj RFC-001 do ratyfikacji w Wave 3 governance batch.
7. Następnie zaplanuj Phase 2: Prometheus provenance metrics, k0nsult-chat `/version`, `/api/provenance/self-report`, signed reports / RFC-002.

Zasady: GO CONTROLLED, claim <= proof, bez sekretów w dokumentach, source-of-truth przez repo + runtime smoke, memory aktualizować dopiero po verification.
