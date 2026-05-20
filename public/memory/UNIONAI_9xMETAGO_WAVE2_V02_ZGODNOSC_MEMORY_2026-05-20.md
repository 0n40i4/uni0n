---
name: UNIONAI_9xMETAGO_WAVE2_V02_ZGODNOSC_MEMORY_2026-05-20
description: Wave 2 DEV NEXT + v0.2.0 Security Hardening compliance memory packet
status: GO CONTROLLED
created_at: 2026-05-20
source_drive_doc: https://docs.google.com/document/d/1ClvZM1jYnc3R362qDMJ4jZKt5SaPWAaMqCVBSltG0ls/edit?usp=drivesdk
---

# MEMORY PACKET — UNIONAI 9xMETA-GO Wave2/v0.2

Zapamiętać jako aktywny stan UNIONAI:

UNIONAI Wave 2 DEV NEXT + v0.2.0 zostały zamknięte jako production operational na https://unionai.grassrootslobbing.pl. Wykonano 4 rundy, 13 modułów, 29+ endpointów, naprawiono Railway/DNS/port/healthcheck/migracje, aktywowano UCHWAŁA_001, opublikowano GitHub release v0.1.0 z DOI 10.5281/zenodo.20151384, opublikowano v0.2.0 Security Hardening z JWT, rate limiting, provider API keys i compliance cron. Hasło operatora zostało ujawnione w czacie, ale potem zrotowane. Evidence manifest został zsynchronizowany z Drive przez Plan B: drive_id + drive_url, bez kopiowania binarnych PDF do repo. Największa pozostała luka: Semantic Core niegotowy — Wave 3 powinien zacząć od semantic relay, embedding routing, drift detection, CRDT-lite memory sync i ontology bridge.

## Current truth

- Live domain: https://unionai.grassrootslobbing.pl
- Repo: https://github.com/0n40i4/uni0n
- v0.1.0 DOI: https://doi.org/10.5281/zenodo.20151384
- Wave2/v0.2 report Drive: https://docs.google.com/document/d/1ClvZM1jYnc3R362qDMJ4jZKt5SaPWAaMqCVBSltG0ls/edit?usp=drivesdk

## Do not forget

LEM diagnosis is valid: INFRA READY, SEMANTIC CORE NOT FINISHED.

Wave 3 priority order:
1. Semantic Relay MVP.
2. Embedding routing with Qdrant.
3. Drift detection.
4. CRDT-lite memory sync.
5. Ontology bridge.

## Sensitive data handling

Never preserve or repeat the operator password or JWT token from the transcript. Only preserve the security finding: password was exposed during testing and then rotated.
