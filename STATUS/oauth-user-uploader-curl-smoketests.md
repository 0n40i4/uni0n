# OAuth User Uploader — curl smoke-test pack (P0)

## Preconditions
- `JWT` operator token with proper scopes.
- Endpoint base set in `BASE_URL`.
- `jq` installed.
- For success overwrite/delete tests: real `file_id` from successful upload.

## Run
```bash
chmod +x STATUS/oauth-user-uploader-curl-smoketests.sh
BASE_URL="https://unionai-core.fly.dev" JWT="<operator_jwt>" ./STATUS/oauth-user-uploader-curl-smoketests.sh
```

## Included tests (6)
1. upload success
2. upload failure (scope/permission path)
3. overwrite success
4. overwrite failure (invalid file_id)
5. delete success
6. delete failure (invalid file_id)

## Mandatory reporting
For each test, record in `STATUS/<date>-runtime-snapshot.md`:
- endpoint
- trace_id
- status code
- claim level (`VERIFIED`/`SELF-ASSERTED`/`BLOCKED`)
- audit reference
- blocker (if any)

## Governance rule
No claim promotion to VERIFIED without reproducible response payload + audit trace reference.
