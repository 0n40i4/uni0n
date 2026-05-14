# OAuth User Uploader — Smoke Tests (CORE QA)

STATUS: GO CONTROLLED++
Owner: CORE QA (execution), KOPERNIK (governance validation)

## Files
- Script: `STATUS/oauth-user-uploader-smoke-tests.sh`

## Required env
- `BASE_URL` (example: `https://unionai-core.fly.dev`)
- `JWT_VALID`
- Optional: `JWT_INVALID`, `TRACE_PREFIX`, `ARTIFACT_PATH`, `ARTIFACT_SHA256`, `FILE_ID_OVERWRITE_SUCCESS`, `FILE_ID_DELETE_SUCCESS`

## Run
```bash
chmod +x STATUS/oauth-user-uploader-smoke-tests.sh
BASE_URL="https://unionai-core.fly.dev" \
JWT_VALID="<token>" \
JWT_INVALID="<bad_token>" \
FILE_ID_OVERWRITE_SUCCESS="<non_canonical_file_id>" \
FILE_ID_DELETE_SUCCESS="<non_verified_file_id>" \
./STATUS/oauth-user-uploader-smoke-tests.sh
```

## Required 6 tests
1. **UPLOAD success**
   - Expected auth: valid JWT + proper scope
   - Expected response: 200/201
   - Must include: `trace_id`, `claim_level`, `audit_metadata`, `rollback`

2. **UPLOAD fail (invalid JWT)**
   - Expected response: 401/403
   - Expected error: auth invalid

3. **OVERWRITE success**
   - Target class: `EVIDENCE` (non-canonical)
   - Expected response: 200

4. **OVERWRITE fail**
   - Cases included in payload: canonical blocked + invalid hash
   - Expected response: 403 and/or 422

5. **DELETE success**
   - Target class: `EVIDENCE` (non-verified)
   - Expected response: 200

6. **DELETE fail**
   - Cases included: verified blocked / freeze mode active / scope denied
   - Expected response: 403

## Mandatory coverage matrix (per test)
- `trace_id`
- `claim_level`
- expected response
- expected error
- rollback reference
- audit metadata
- auth behavior

## Claim-level discipline
Each outcome must be recorded as one of:
- VERIFIED
- SELF-ASSERTED
- BLOCKED
- ROADMAP

## Non-negotiables
- no silent overwrite
- no untraced delete
- no upload without claim level
- no canonical mutation without approval

## Suggested output record
Append each test result to:
- `STATUS/snapshots/daily/<date>.md`
- `EVIDENCE/<date>/WAVE3/smoke-tests/`
with raw response excerpts and trace IDs.
