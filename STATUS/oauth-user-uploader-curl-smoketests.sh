#!/usr/bin/env bash
set -euo pipefail

# OAuth User Uploader — curl smoke pack (P0)
# Usage:
#   BASE_URL="https://unionai-core.fly.dev" \
#   JWT="<operator_jwt>" \
#   TRACE_PREFIX="smoke-$(date +%s)" \
#   ./STATUS/oauth-user-uploader-curl-smoketests.sh

BASE_URL="${BASE_URL:-https://unionai-core.fly.dev}"
JWT="${JWT:-}"
TRACE_PREFIX="${TRACE_PREFIX:-smoke-$(date +%s)}"

if [[ -z "$JWT" ]]; then
  echo "ERROR: JWT is required" >&2
  exit 1
fi

h() {
  local claim="$1"
  local trace="$2"
  shift 2
  curl -sS -X POST "$@" \
    -H "Authorization: Bearer ${JWT}" \
    -H "Content-Type: application/json" \
    -H "X-Claim-Level: ${claim}" \
    -H "X-Trace-Id: ${trace}"
}

echo "[1/6] upload success"
h SELF-ASSERTED "${TRACE_PREFIX}-upload-ok" \
  "${BASE_URL}/api/operator/drive/upload" \
  -d '{
    "target_folder":"K0NSULT-EVIDENCE/TESTNET",
    "filename":"smoke-upload-ok.txt",
    "content_base64":"VEVTVF9VUExPQURfT0s=",
    "mime_type":"text/plain",
    "task_id":"SMOKE-UPLOAD-OK"
  }' | jq .

echo "[2/6] upload fail (missing scope simulated by token/scopes)"
h SELF-ASSERTED "${TRACE_PREFIX}-upload-fail-scope" \
  "${BASE_URL}/api/operator/drive/upload" \
  -d '{
    "target_folder":"K0NSULT-EVIDENCE/TESTNET",
    "filename":"smoke-upload-fail.txt",
    "content_base64":"VEVTVA==",
    "mime_type":"text/plain",
    "task_id":"SMOKE-UPLOAD-FAIL"
  }' | jq .

echo "[3/6] overwrite success"
h SELF-ASSERTED "${TRACE_PREFIX}-overwrite-ok" \
  "${BASE_URL}/api/operator/drive/overwrite" \
  -d '{
    "file_id":"REPLACE_WITH_REAL_FILE_ID",
    "content_base64":"T1ZFUldSSVRFX09L",
    "mime_type":"text/plain",
    "task_id":"SMOKE-OVERWRITE-OK",
    "expected_revision":"optional"
  }' | jq .

echo "[4/6] overwrite fail (bad file_id)"
h SELF-ASSERTED "${TRACE_PREFIX}-overwrite-fail" \
  "${BASE_URL}/api/operator/drive/overwrite" \
  -d '{
    "file_id":"bad-file-id",
    "content_base64":"T1ZFUldSSVRFX0ZBSUw=",
    "mime_type":"text/plain",
    "task_id":"SMOKE-OVERWRITE-FAIL"
  }' | jq .

echo "[5/6] delete success"
h SELF-ASSERTED "${TRACE_PREFIX}-delete-ok" \
  "${BASE_URL}/api/operator/drive/delete" \
  -d '{
    "file_id":"REPLACE_WITH_REAL_FILE_ID_TO_DELETE",
    "task_id":"SMOKE-DELETE-OK"
  }' | jq .

echo "[6/6] delete fail (bad file_id)"
h SELF-ASSERTED "${TRACE_PREFIX}-delete-fail" \
  "${BASE_URL}/api/operator/drive/delete" \
  -d '{
    "file_id":"bad-file-id",
    "task_id":"SMOKE-DELETE-FAIL"
  }' | jq .

echo "DONE: run complete. Classify each result as VERIFIED/SELF-ASSERTED/BLOCKED in STATUS snapshot."
