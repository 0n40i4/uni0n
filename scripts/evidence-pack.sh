#!/usr/bin/env bash
# UAI-P2-002: Evidence pack export. Składa aktualne dane dowodowe (manifest, status,
# incydenty, audyty K0NSULAT, release) w jeden pakiet JSON i liczy jego SHA-256.
#
# PDF: pakiet jest źródłem danych; wersję PDF uzyskasz drukując /trust-center lub /evidence
# do PDF (Ctrl+P → Zapisz jako PDF) — strona jest print-friendly. Pakiet JSON niesie hash,
# więc integralność jest weryfikowalna niezależnie od formatu prezentacji.
#
# Wymaga: curl. (jq opcjonalne — bez niego pakuje surowe odpowiedzi.)
# Użycie: bash scripts/evidence-pack.sh [host] [out_dir]
set -euo pipefail

HOST="${1:-uni0nai.k0nsult.cloud}"
OUT_DIR="${2:-./evidence-pack}"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
BASE="https://${HOST}"

mkdir -p "$OUT_DIR"
PACK="${OUT_DIR}/evidence-pack-${STAMP}.json"

echo "Evidence pack ← ${BASE}  (${TS})"

fetch() { curl -sS --max-time 20 "${BASE}$1" 2>/dev/null || echo '{"error":"fetch_failed"}'; }

BUILD_SHA="$(fetch /health | grep -o '"build_sha":"[^"]*"' | head -1 | sed 's/.*:"//;s/"//')"

{
  echo '{'
  echo "  \"pack_version\": \"1.0\","
  echo "  \"system\": \"UNIONAI / UnionAI\","
  echo "  \"host\": \"${HOST}\","
  echo "  \"generated_at\": \"${TS}\","
  echo "  \"build_sha\": \"${BUILD_SHA:-unknown}\","
  echo "  \"sources\": {"
  echo "    \"health\":            $(fetch /health),"
  echo "    \"evidence_manifest\": $(fetch /evidence/manifest.json),"
  echo "    \"evidence_verify\":   $(fetch /api/evidence/verify),"
  echo "    \"k0nsulat_status\":   $(fetch /api/k0nsulat/status),"
  echo "    \"incidents\":         $(fetch /api/incidents),"
  echo "    \"leaderboard\":       $(fetch /api/leaderboard),"
  echo "    \"agent_json\":        $(fetch /.well-known/agent.json)"
  echo "  }"
  echo '}'
} > "$PACK"

# SHA-256 pakietu (sha256sum / shasum / certutil fallback)
if command -v sha256sum >/dev/null 2>&1; then
  HASH="$(sha256sum "$PACK" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
  HASH="$(shasum -a 256 "$PACK" | awk '{print $1}')"
else
  HASH="$(certutil -hashfile "$PACK" SHA256 2>/dev/null | sed -n 2p | tr -d ' \r')"
fi

echo "$HASH  $(basename "$PACK")" > "${PACK}.sha256"

echo "OK  pakiet: ${PACK}"
echo "OK  sha256: ${HASH}"
echo "    (PDF: wydrukuj /trust-center lub /evidence do PDF; hash powyżej potwierdza integralność danych źródłowych)"
