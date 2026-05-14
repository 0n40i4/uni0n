# OAuth User Upload Runbook (P0 Fast Path)

Status: READY

## Why
Service Account write is blocked by Google quota model (`403 storageQuotaExceeded`).

## Required input (from operator)
1. OAuth client credentials JSON (Desktop app) from Google Cloud Console.
2. One-time auth code (or completed local callback) for account that owns Drive quota.

## Scope
- `https://www.googleapis.com/auth/drive`

## Target
- Drive folder: `K0NSULT-EVIDENCE` (`1hoSPochjVE0FNWRDJ79G2q3S-vRq_MgM`)
- Local source: `/home/kopernik/uni0n/K0NSULT-EVIDENCE`

## Upload behavior
- Create missing subfolders.
- If file exists with same name in same parent: overwrite content.
- If missing: create file.
- Emit JSON report with: `uploaded`, `updated`, `blocked`, `file_ids`.

## Claim discipline
- Upload success => VERIFIED
- API auth failure => BLOCKED
- Partial upload => SELF-ASSERTED until full manifest check passes

## Mandatory evidence fields
`TASK_ID, COMMIT, SHA256, SMOKE_TEST, ROLLBACK, STATUS, CLAIM_LEVEL, TIMESTAMP, OWNER`
