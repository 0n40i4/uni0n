# OAuth User Uploader — Minimal Contracts v1

Status: GO CONTROLLED++
Owner: CORE (implementation), KOPERNIK (governance review)

Canonical machine-readable schema:
- `STATUS/oauth-user-uploader-contracts.v1.json`

## Endpoints (P0)
1. `POST /api/operator/drive/upload`
2. `POST /api/operator/drive/overwrite`
3. `POST /api/operator/drive/delete`

## Mandatory response fields
- `trace_id`
- `status`
- `claim_level`
- `timestamp`
- `operator_scope`
- `runtime_id`
- `artifact_hash`
- `storage_path`
- `rollback_reference`

## Mandatory error fields
- `error_code`
- `error_type`
- `claim_level`
- `retryable`
- `audit_required`
- `trace_id`

## Governance guardrails
NO:
- silent overwrite
- hidden delete
- autonomous canonical replace
- upload without `trace_id`
- upload without `audit_metadata`

## Claim levels
- VERIFIED
- SELF_ASSERTED
- BLOCKED
- ROADMAP

## Notes for CORE
- Enforce JWT and operator scopes per endpoint.
- Reject requests missing `X-Trace-Id` or body `trace_id` mismatch.
- Persist audit record for success and failure.
- Freeze controls must return deterministic `FREEZE` error_type.
