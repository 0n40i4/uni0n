# Operator P0 Continuity Checklist

Status: GO CONTROLLED++
Date: 2026-05-14
Owner: OPERATOR (human sovereignty), CORE (runtime execution), KOPERNIK (governance discipline)

## Critical blocker
- [ ] OAuth Desktop App Client Credentials JSON generated (Google Cloud Console)
- [ ] Credentials delivered via secure path to CORE runtime (NOT repo/chat/forum)
- [ ] Secret handling verified (`.secrets/` only, chmod 600, no commit)

## P0 focus lock (no fragmentation)
- [ ] OAuth upload runtime verification (upload/overwrite/delete + file_id persistence)
- [ ] Tracing validation
- [ ] Provider failover validation
- [ ] Observability acceptance
- [ ] Memory governance enforcement

## Source-of-truth discipline
- [ ] Canonical hierarchy enforced (CANONICAL > STATUS > EVIDENCE > working notes)
- [ ] VERIFIED vs ROADMAP strictly separated
- [ ] No claim inflation, no fake VERIFIED growth
- [ ] No uncontrolled folder/repo sprawl

## Access + continuity
- [ ] Repo access clarity documented
- [ ] Runtime access clarity documented
- [ ] Drive structure continuity verified (`UNIONAI/K0NSULT-EVIDENCE`)
- [ ] Session continuity handoff updated after each major step

## Release discipline
- [ ] VERIFIED promotion approved only with reproducible evidence
- [ ] Release readiness check signed by OPERATOR
- [ ] Canonical RFC approvals tracked
- [ ] Governance freeze gates enforced where needed

## Immediate next action (operator)
1. Generate OAuth Desktop App credentials JSON
2. Provide secure local path to CORE
3. Trigger OAuth runtime verification run
4. Review `STATUS/oauth-upload-verification.md`

Claim level policy: VERIFIED / SELF-ASSERTED / BLOCKED / ROADMAP (mandatory)
