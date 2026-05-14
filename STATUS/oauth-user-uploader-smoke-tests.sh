#!/usr/bin/env bash
set -euo pipefail

# OAuth Governance Uploader - Smoke Tests v1
# STATUS: GO CONTROLLED++
# Required env:
#   BASE_URL (e.g. https://unionai-core.fly.dev)
#   JWT_VALID
#   JWT_INVALID (optional; default hardcoded bad token)
#   TRACE_PREFIX (optional)
# Optional env:
#   FILE_ID_OVERWRITE_SUCCESS
#   FILE_ID_DELETE_SUCCESS
#   ARTIFACT_PATH (default: /tmp/lem-wave3-l001.patch)
#   ARTIFACT_SHA256 (default known hash)

BASE_URL="${BASE_URL:-https://unionai-core.fly.dev}"
JWT_VALID="${JWT_VALID:?JWT_VALID required}"
JWT_INVALID="${JWT_INVALID:-eyJ.invalid.jwt}"
TRACE_PREFIX="${TRACE_PREFIX:-qa-oauth-uploader}"
ARTIFACT_PATH="${ARTIFACT_PATH:-/tmp/lem-wave3-l001.patch}"
ARTIFACT_SHA256="${ARTIFACT_SHA256:-1efc303500dfc33a282ed06545bd3d26748863c7aa816142575b2d429af035f0}"
FILE_ID_OVERWRITE_SUCCESS="${FILE_ID_OVERWRITE_SUCCESS:-REPLACE_WITH_NON_CANONICAL_FILE_ID}"
FILE_ID_DELETE_SUCCESS="${FILE_ID_DELETE_SUCCESS:-REPLACE_WITH_NON_VERIFIED_FILE_ID}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"

echo "== OAuth uploader smoke tests @ ${TS} =="

auth_hdr_valid=(-H "Authorization: Bearer ${JWT_VALID}")
auth_hdr_invalid=(-H "Authorization: Bearer ${JWT_INVALID}")
json_hdr=(-H "Content-Type: application/json")

# 1) UPLOAD success (expected 200/201, claim_level required, trace_id required)
TRACE_ID="${TRACE_PREFIX}-upload-success-${TS}"
echo "[1] upload success trace_id=${TRACE_ID}"
curl -i -sS -X POST "${BASE_URL}/api/operator/drive/upload" \
  "${auth_hdr_valid[@]}" "${json_hdr[@]}" \
  -d "{\"trace_id\":\"${TRACE_ID}\",\"claim_level\":\"SELF-ASSERTED\",\"task_id\":\"QA-UPLOAD-OK\",\"commit\":\"97d4814\",\"sha256\":\"${ARTIFACT_SHA256}\",\"artifact_name\":\"lem-wave3-l001.patch\",\"artifact_path\":\"${ARTIFACT_PATH}\",\"rollback\":\"git revert 97d4814\",\"owner\":\"CORE\",\"audit_metadata\":{\"actor\":\"qa\",\"reason\":\"smoke-upload-success\"}}"

# 2) UPLOAD fail (invalid JWT expected 401/403)
TRACE_ID="${TRACE_PREFIX}-upload-invalid-jwt-${TS}"
echo "[2] upload fail invalid JWT trace_id=${TRACE_ID}"
curl -i -sS -X POST "${BASE_URL}/api/operator/drive/upload" \
  "${auth_hdr_invalid[@]}" "${json_hdr[@]}" \
  -d "{\"trace_id\":\"${TRACE_ID}\",\"claim_level\":\"SELF-ASSERTED\",\"task_id\":\"QA-UPLOAD-BADJWT\",\"sha256\":\"${ARTIFACT_SHA256}\",\"artifact_name\":\"lem-wave3-l001.patch\",\"rollback\":\"n/a\",\"owner\":\"CORE\",\"audit_metadata\":{\"actor\":\"qa\",\"reason\":\"smoke-upload-invalid-jwt\"}}"

# 3) OVERWRITE success (non-canonical target expected 200)
TRACE_ID="${TRACE_PREFIX}-overwrite-success-${TS}"
echo "[3] overwrite success trace_id=${TRACE_ID}"
curl -i -sS -X POST "${BASE_URL}/api/operator/drive/overwrite" \
  "${auth_hdr_valid[@]}" "${json_hdr[@]}" \
  -d "{\"trace_id\":\"${TRACE_ID}\",\"claim_level\":\"SELF-ASSERTED\",\"task_id\":\"QA-OVERWRITE-OK\",\"target_file_id\":\"${FILE_ID_OVERWRITE_SUCCESS}\",\"target_class\":\"EVIDENCE\",\"sha256\":\"${ARTIFACT_SHA256}\",\"rollback\":\"restore previous version\",\"owner\":\"CORE\",\"audit_metadata\":{\"actor\":\"qa\",\"reason\":\"smoke-overwrite-success\"}}"

# 4) OVERWRITE fail (canonical blocked / invalid hash expected 403/422)
TRACE_ID="${TRACE_PREFIX}-overwrite-canonical-blocked-${TS}"
echo "[4] overwrite fail canonical blocked trace_id=${TRACE_ID}"
curl -i -sS -X POST "${BASE_URL}/api/operator/drive/overwrite" \
  "${auth_hdr_valid[@]}" "${json_hdr[@]}" \
  -d "{\"trace_id\":\"${TRACE_ID}\",\"claim_level\":\"SELF-ASSERTED\",\"task_id\":\"QA-OVERWRITE-BLOCKED\",\"target_file_id\":\"CANONICAL_FILE_ID_REPLACE\",\"target_class\":\"CANONICAL\",\"sha256\":\"deadbeef\",\"rollback\":\"n/a\",\"owner\":\"CORE\",\"audit_metadata\":{\"actor\":\"qa\",\"reason\":\"smoke-overwrite-canonical-blocked\"}}"

# 5) DELETE success (non-verified/non-canonical expected 200)
TRACE_ID="${TRACE_PREFIX}-delete-success-${TS}"
echo "[5] delete success trace_id=${TRACE_ID}"
curl -i -sS -X POST "${BASE_URL}/api/operator/drive/delete" \
  "${auth_hdr_valid[@]}" "${json_hdr[@]}" \
  -d "{\"trace_id\":\"${TRACE_ID}\",\"claim_level\":\"SELF-ASSERTED\",\"task_id\":\"QA-DELETE-OK\",\"target_file_id\":\"${FILE_ID_DELETE_SUCCESS}\",\"target_class\":\"EVIDENCE\",\"rollback\":\"restore from release pack\",\"owner\":\"CORE\",\"audit_metadata\":{\"actor\":\"qa\",\"reason\":\"smoke-delete-success\"}}"

# 6) DELETE fail (verified blocked OR freeze active OR missing scope expected 403)
TRACE_ID="${TRACE_PREFIX}-delete-verified-blocked-${TS}"
echo "[6] delete fail verified blocked trace_id=${TRACE_ID}"
curl -i -sS -X POST "${BASE_URL}/api/operator/drive/delete" \
  "${auth_hdr_valid[@]}" "${json_hdr[@]}" \
  -d "{\"trace_id\":\"${TRACE_ID}\",\"claim_level\":\"SELF-ASSERTED\",\"task_id\":\"QA-DELETE-BLOCKED\",\"target_file_id\":\"VERIFIED_FILE_ID_REPLACE\",\"target_class\":\"VERIFIED\",\"freeze_expected\":true,\"rollback\":\"n/a\",\"owner\":\"CORE\",\"audit_metadata\":{\"actor\":\"qa\",\"reason\":\"smoke-delete-verified-blocked\"}}"

echo "== Done. Validate each response for: trace_id, claim_level, audit metadata, rollback reference, auth behavior. =="