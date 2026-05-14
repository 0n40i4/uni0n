# OAuth User Uploader Spec (P0)

Status: GO CONTROLLED++
Owner: CORE (implementation) + KOPERNIK (governance constraints)
Mode: HYBRID GOVERNANCE STORAGE

## Goal
Enable Drive write continuity (upload/overwrite/delete) via **operator OAuth identity** instead of Service Account quota model.

## Why
Current SA write path is blocked by Google quota behavior (`403 storageQuotaExceeded`).
OAuth user upload restores write operations with human-authorized identity and preserves governance.

## Scope
- Upload evidence artifacts to `UNIONAI/K0NSULT-EVIDENCE`
- Overwrite/update selected artifacts
- Delete only non-verified transient files
- Preserve claim levels + audit trail

## Non-goals
- No autonomous overwrite of CANONICAL truth
- No deletion of VERIFIED evidence
- No bypass of human approval

## Required OAuth Setup
- OAuth app type: Desktop/Web (operator-owned)
- Scopes (minimum):
  - `https://www.googleapis.com/auth/drive.file` (preferred)
  - If needed for broader listing: `https://www.googleapis.com/auth/drive`
- Token storage: encrypted at rest, restricted permissions
- Refresh token retention for continuity

## Runtime Flow
1. Operator initiates login consent flow
2. Runtime receives access_token + refresh_token
3. Runtime resolves target folder ID (`K0NSULT-EVIDENCE`)
4. Runtime uploads evidence pack
5. Runtime updates/overwrites mutable files
6. Runtime deletes transient test files (if policy allows)
7. Runtime writes upload manifest + audit entry

## API Proposal (internal)
### POST /api/operator/drive/oauth/start
- Returns consent URL + state
- Auth: JWT + operator scope

### GET /api/operator/drive/oauth/callback
- Exchanges auth code for tokens
- Stores encrypted refresh token
- Auth: state validation + CSRF protection

### POST /api/operator/drive/upload
Body:
- `local_path`
- `target_folder_id`
- `logical_type` (e.g. EVIDENCE, STATUS, RELEASE)
- `claim_level` (VERIFIED/SELF-ASSERTED/BLOCKED/ROADMAP)
- `task_id`
- `commit`
- `sha256`
- `owner`
- `timestamp`

Response:
- `file_id`
- `web_view_link`
- `version`
- `md5Checksum` (if available)
- `audit_id`

### POST /api/operator/drive/overwrite
- Same metadata + `file_id`
- Requires explicit `overwrite_reason`
- Deny if target is CANONICAL/VERIFIED without human override flag

### POST /api/operator/drive/delete
- Inputs: `file_id`, `delete_reason`, `approval_ref`
- Deny for VERIFIED/CANONICAL by policy default

## Security Controls
- JWT enforcement for `/api/operator/*`
- Permission scopes:
  - `drive:upload`
  - `drive:overwrite`
  - `drive:delete`
  - `drive:oauth_admin`
- Freeze control switch (global): deny mutating actions when enabled
- CSRF state checks on OAuth callback
- Secrets redaction in logs

## Audit/Event Schema (mandatory)
Each mutating action emits:
- `TASK_ID`
- `COMMIT`
- `SHA256`
- `SMOKE_TEST`
- `ROLLBACK`
- `STATUS`
- `CLAIM_LEVEL`
- `TIMESTAMP`
- `OWNER`
- `operator_identity`
- `drive_file_id`
- `target_path`
- `action` (upload/overwrite/delete)
- `result` (success/fail)
- `trace_id`

## Claim Hygiene Rules
- VERIFIED only with reproducible evidence + manifest + hash
- SELF-ASSERTED for operator-reported state without independent rerun
- BLOCKED for auth/quota/network/policy failures
- ROADMAP for planned, not executed

## Rollback
- Keep prior file versions when possible
- For overwritten files: retain rollback pointer (previous version ID/hash)
- For deleted transient files: log tombstone with metadata

## Minimal Delivery Plan (fast path)
1. Implement OAuth start/callback + token vault
2. Implement upload endpoint with audit logging
3. Add overwrite endpoint with policy gates
4. Add delete endpoint for transient files only
5. Add smoke test script and status snapshot integration

## Smoke Tests
- Upload test file -> EXPECT success
- List files -> EXPECT visible file
- Overwrite same file -> EXPECT version change
- Delete transient file -> EXPECT success
- Unauthorized call -> EXPECT 401/403
- Missing scope -> EXPECT 403

## Output Artifacts
- `STATUS/drive-validation-report.md` (updated)
- `EVIDENCE/<date>/DRIVE/oauth-upload-manifest.json`
- `EVIDENCE/<date>/DRIVE/oauth-upload-smoke.md`

## Governance Constraints (hard)
- Human sovereignty mandatory
- No autonomous canonical overwrite
- No deletion of verified evidence
- Replayability + auditability mandatory
