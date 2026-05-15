# RFC-001 — Federated Reporting Standard v1

| Field | Value |
|---|---|
| RFC ID | RFC-001 |
| Title | Federated Reporting Standard for UNIONAI federation nodes |
| Status | DRAFT — proposed for ratification in Wave 3 governance batch |
| Author | unionai-core operator (`0n40i4`) |
| Federation | UNIONAI-GENESIS-0N40I4-20260512 |
| Created | 2026-05-15 |
| Companion code | `apps/core/src/lib/provenance.ts`, `apps/core/src/main.ts` (`/version`, `/api/provenance/self-report`) |
| Companion release | v0.3.0-dev |

---

## 1. Problem

UNIONAI is a federation of independent agents and services. Today each node emits reports (audits, health, governance events) in ad-hoc shapes. Recent runtime/governance audits surfaced four recurring failures:

1. **Version drift** — a service reports a version (e.g. `0.1.0`) that does not match its deployed code, its docs, its package manifest, or operator memory. Consumers of the report cannot tell what was actually measured.
2. **Source ambiguity** — claims in reports do not declare whether they came from a live probe, parsed config, a log replay, or a guess. Auditors cannot replay verification.
3. **Confidence flattening** — high-confidence measurements (DB ping returned `1`) appear next to low-confidence claims (operator memory of a past state) with no visible distinction.
4. **Silent unknowns** — when a value cannot be determined, services frequently emit a stale default or `"ok"` instead of explicitly marking the gap.

A federation cannot be audited if every node tells the truth in its own dialect.

## 2. Goal

Define a single minimum schema that any federation node SHOULD emit when reporting facts about itself or the world, so that:

- Every claim carries enough metadata to be **re-verified by a third party**.
- Unknowns are **first-class** (explicit `unverified` / `unknown`), never silently defaulted.
- Reports are **machine-comparable across nodes** even if internal stacks differ.

Out of scope for v1: signing, cryptographic attestation, full SLSA provenance — these are deferred to RFC-002.

## 3. Schema

### 3.1 ProvenancedClaim<T>

Every individual fact carried in a federated report MUST be a `ProvenancedClaim`:

```jsonc
{
  "value": <T>,
  "provenance": {
    "source": "string",              // REQUIRED — URL, file path, agent DID, log id, env var
    "verification": "live_probe | static_analysis | log_replay | db_query | self_report | human_assertion | cross_check | inferred | unverified",  // REQUIRED
    "confidence": "high | medium | low | unknown",  // REQUIRED
    "confidence_score": 0.0,         // OPTIONAL — numeric 0.0–1.0
    "timestamp": "2026-05-15T00:00:00Z",  // REQUIRED — ISO 8601 UTC, when verification ran
    "observer": "string",            // OPTIONAL — who/what made the observation
    "evidence_id": "string",         // OPTIONAL — hash, log line, signature pointer
    "notes": "string"                // OPTIONAL — caveats, limits, edge cases
  }
}
```

### 3.2 ReportProvenance

Every report envelope MUST declare its own provenance at the top level:

```jsonc
{
  "report": {
    "report_id": "string",                 // REQUIRED — unique
    "generator": "string",                 // REQUIRED — service id
    "generator_version": "string",         // REQUIRED — must match runtime
    "generator_channel": "stable | dev | rc | canary",  // REQUIRED
    "federation": "string",                // REQUIRED — federation id
    "generated_at": "ISO 8601",            // REQUIRED
    "schema_version": "federated-reporting-v1",  // REQUIRED, this RFC
    "evidence_hierarchy": ["live_probe", "cross_check", "db_query", "log_replay", "static_analysis", "self_report", "human_assertion", "inferred", "unverified"],
    "uncertainty_marked": true             // REQUIRED — node asserts it marks unknowns explicitly
  },
  "claims": {
    "<claim_name>": <ProvenancedClaim<T>>,
    ...
  }
}
```

## 4. Verification types — semantics

| Type | Meaning | Default confidence |
|---|---|---|
| `live_probe` | Measurement against running system at `timestamp` (HTTP probe, ping, query). | high |
| `static_analysis` | Parsed from canonical source (manifest, config, code). | medium |
| `log_replay` | Derived from persisted, immutable audit/log artifact. | medium |
| `db_query` | Direct read from authoritative data store. | high |
| `self_report` | Service claims about itself; no external check. | low |
| `human_assertion` | Operator asserted; not machine-verified. | low |
| `cross_check` | ≥2 independent sources agree. | high |
| `inferred` | Derived/transformed from other verified claims. | inherits min(parents) |
| `unverified` | Explicit "unknown" — no probe attempted or probe failed. | unknown |

A node MUST NOT emit a claim with a higher confidence than its verification type's default unless `notes` justifies it.

## 5. Required endpoints (HTTP nodes)

Every HTTP federation node SHOULD expose:

| Endpoint | Purpose |
|---|---|
| `GET /healthz` | Liveness, plain text `ok`, no dependencies, ≤50ms. |
| `GET /readyz` | Readiness, returns 503 if critical deps unreachable. |
| `GET /version` | JSON `{service, version, channel, build_sha, build_time, federation, schema_version, source_of_truth}`. |
| `GET /api/provenance/self-report` | Full RFC-001 report envelope with provenanced claims about the node's own runtime state. |

Every response MUST carry:

```
X-Service-Name: <id>
X-Service-Version: <semver>
X-Service-Channel: stable | dev | rc | canary
X-Build-Sha: <sha|unknown>
X-Federation-Id: <federation id>
```

## 6. Anti-patterns (forbidden in v1)

- Hardcoded version literals in code that are not derived from a single source of truth.
- Returning `"ok"` for a value that was not actually measured.
- Silent defaults for unknown fields — emit `unverified` with a `notes` reason instead.
- Mixing `self_report` and `live_probe` claims in the same field without distinguishing them.

## 7. Migration

Phase 1 (v0.3.0-dev — this release):
- `unionai-core` exposes `/healthz`, `/readyz`, `/version`, `/api/provenance/self-report`.
- All hardcoded version literals removed; runtime version pulled from `package.json`.
- Provenance headers on every response.
- `apps/core/src/lib/provenance.ts` is the reference implementation.

Phase 2 (v0.4.0):
- Each module (`relay`, `memory`, `trust`, `governance`) emits its metrics as provenanced claims.
- `metrics` Prometheus scrape gains `unionai_provenance_*` series counting claims by `verification` and `confidence`.
- Sister services (`k0nsult-chat`, others in federation) adopt the same headers + `/healthz` + `/readyz` shape.

Phase 3 (v1.0.0 — coincides with RFC-002):
- Reports are signed (Ed25519) and anchored.
- `evidence_id` becomes mandatory for `live_probe` and `db_query` claims.
- Federation index (`/.well-known/unionai.json`) lists every member's last successful `/api/provenance/self-report` digest.

## 8. Reference implementation

- `apps/core/src/lib/provenance.ts` — types + factories (`withProvenance`, `liveProbe`, `staticAnalysis`, `selfReport`, `crossCheck`, `unverified`, `makeReportProvenance`, `isProvenanced`).
- `apps/core/src/main.ts` — endpoints, headers, demonstrating wiring.

## 9. Open questions (to resolve before ratification)

1. **Confidence numeric vs. categorical** — should `confidence_score` (0.0–1.0) be mandatory or optional? v1 keeps it optional; categorical buckets are required.
2. **Time skew** — federation members in different regions will have clock drift. Should `timestamp` be NTP-synced? Deferred to RFC-002.
3. **`evidence_id` format** — free string in v1; v1.x will standardize on `did:unionai:evidence:<sha256>`.
4. **Schema URL** — claims should eventually reference a JSON Schema; not yet published.

## 10. Ratification path

- 2026-05-15 — DRAFT published (this file), v0.3.0-dev shipped.
- Wave 3 governance batch — votes on `RFC-001 → ACCEPTED`.
- v0.3.x — k0nsult-chat and other federation nodes adopt headers + `/healthz`.
- v0.4.0 — schema becomes MUST instead of SHOULD for federation-tier nodes.

---

## Appendix A — Example report

```json
{
  "report": {
    "report_id": "prov-1715731200000-a1b2c3d4",
    "generator": "unionai-core",
    "generator_version": "0.3.0-dev",
    "generator_channel": "dev",
    "federation": "UNIONAI-GENESIS-0N40I4-20260512",
    "generated_at": "2026-05-15T00:00:00Z",
    "schema_version": "federated-reporting-v1",
    "evidence_hierarchy": ["live_probe", "cross_check", "db_query", "log_replay", "static_analysis", "self_report", "human_assertion", "inferred", "unverified"],
    "uncertainty_marked": true
  },
  "claims": {
    "version": {
      "value": "0.3.0-dev",
      "provenance": {
        "source": "package.json",
        "verification": "static_analysis",
        "confidence": "high",
        "timestamp": "2026-05-15T00:00:00Z",
        "observer": "unionai-core",
        "notes": "pulled at process boot from canonical manifest"
      }
    },
    "database": {
      "value": "reachable",
      "provenance": {
        "source": "pg.Pool.query(SELECT 1)",
        "verification": "live_probe",
        "confidence": "high",
        "timestamp": "2026-05-15T00:00:01Z",
        "observer": "unionai-core"
      }
    },
    "build_sha": {
      "value": "unknown",
      "provenance": {
        "source": "env(GIT_SHA|FLY_MACHINE_VERSION)",
        "verification": "self_report",
        "confidence": "low",
        "timestamp": "2026-05-15T00:00:00Z",
        "observer": "unionai-core",
        "notes": "no SHA injected at build — provenance gap"
      }
    }
  }
}
```

## Appendix B — Cross-references

- v0.3.0-dev release notes: `CHANGELOG.md`
- Memory P0 entry: `MEMORY.md` (UNIONAI v0.3.0-dev — federated reporting hardening)
- Sister service to migrate next: `k0nsult-chat` (already has `/healthz` + `/readyz` + provenance headers; needs `/version` + `/api/provenance/self-report`).
