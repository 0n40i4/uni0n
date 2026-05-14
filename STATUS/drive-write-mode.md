# Drive Write Mode Decision

Date: 2026-05-14
Status: GO CONTROLLED++

## Decision
Mode: **HYBRID GOVERNANCE STORAGE**

- AI/runtime: prepares evidence artifacts (patches, hashes, manifests, snapshots)
- Human/operator: performs final upload + approval + canonical archival

## Root cause of write block
`403 storageQuotaExceeded` on Service Account upload in non-Shared-Drive quota model.

## P0 Fast Path (accepted)
**Option A: OAuth User Upload** (operator account)

Why now:
- works immediately without Workspace admin setup
- enables upload / overwrite / delete under user quota
- preserves human sovereignty and approval flow

## Operational checklist (P0)
1. Operator signs in with Google OAuth (Drive scope)
2. Runtime uses operator refresh token for upload actions
3. Evidence bundle source remains repo-generated only
4. Every upload entry records:
   - TASK_ID
   - SHA256
   - TIMESTAMP
   - OWNER
   - CLAIM_LEVEL
5. Canonical write remains human-governed

## Claim levels
- VERIFIED: OAuth upload+overwrite+delete proof attached
- SELF-ASSERTED: operator says done, no API proof attached
- BLOCKED: missing token/scope/network/permission
- ROADMAP: planned migration (e.g., Shared Drive SA)

## Non-negotiables
- no autonomous overwrite of canonical truth
- no deletion of verified evidence
- replayability mandatory
- auditability mandatory
- human sovereignty mandatory
