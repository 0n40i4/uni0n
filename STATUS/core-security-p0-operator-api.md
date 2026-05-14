# CORE P0 — Security Hardening for /api/operator/*

Updated: 2026-05-14
Owner: CORE

## Mandatory controls
1. Auth enforcement
   - deny-by-default on `/api/operator/*`
   - explicit authenticated identity required
2. Permission scopes
   - least-privilege scopes per operator action
   - scope-to-endpoint mapping documented
3. Audit trace
   - who / what / when / result / trace_id
   - immutable audit record path

## Verification checklist
- unauthorized request => denied (expected 401/403)
- authorized but missing scope => denied (403)
- authorized + proper scope => allowed
- every decision recorded in audit trail with trace_id

## Claim level
- Security control is VERIFIED only with curl evidence + audit excerpts in EVIDENCE/.
