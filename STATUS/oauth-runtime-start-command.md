# OAuth Runtime Start Command

STATUS: READY

## Preferred credentials path
- `/opt/unionai/secrets/oauth-client.json`

## Alternative path
- `~/.config/unionai/oauth-client.json`

## Permissions (mandatory)
```bash
chmod 600 /opt/unionai/secrets/oauth-client.json
```

## Start (interactive OAuth login)
```bash
GOOGLE_OAUTH_CLIENT_SECRET=/opt/unionai/secrets/oauth-client.json \
GOOGLE_OAUTH_TOKEN_PATH=/home/kopernik/.secrets/google-oauth-token.json \
LOCAL_EVIDENCE_ROOT=/home/kopernik/uni0n/K0NSULT-EVIDENCE \
DRIVE_ROOT_ID=1hoSPochjVE0FNWRDJ79G2q3S-vRq_MgM \
/tmp/oauthenv/bin/python /home/kopernik/uni0n/scripts/oauth_drive_sync.py \
| tee /home/kopernik/uni0n/STATUS/oauth-upload-run-output.json
```

## Post-run
- Parse JSON output and populate `STATUS/oauth-upload-verification.md`
- Must include: file_ids, hashes, trace_ids, timestamps, overwrite/delete outcomes, claim levels.

## Security rules
- Never log tokens
- Never persist refresh token outside local operator secret store
- Never include secrets in STATUS/EVIDENCE/CANONICAL
