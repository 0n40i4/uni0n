#!/usr/bin/env python3
import os, io, json, hashlib, time
from datetime import datetime, timezone
from pathlib import Path

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

SCOPES = ["https://www.googleapis.com/auth/drive"]


def iso_now():
    return datetime.now(timezone.utc).isoformat()


def sha256_file(p: Path):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for ch in iter(lambda: f.read(1024 * 1024), b''):
            h.update(ch)
    return h.hexdigest()


def get_creds(client_secret_path: str, token_path: str):
    creds = None
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(client_secret_path, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_path, 'w') as f:
            f.write(creds.to_json())
    return creds


def list_children(svc, folder_id):
    q = f"'{folder_id}' in parents and trashed=false"
    res = svc.files().list(q=q, pageSize=1000, fields='files(id,name,mimeType)', supportsAllDrives=True, includeItemsFromAllDrives=True).execute()
    return res.get('files', [])


def ensure_folder(svc, parent_id, name):
    for f in list_children(svc, parent_id):
        if f['name'] == name and f['mimeType'] == 'application/vnd.google-apps.folder':
            return f['id'], False
    meta = {'name': name, 'mimeType': 'application/vnd.google-apps.folder', 'parents': [parent_id]}
    created = svc.files().create(body=meta, fields='id,name', supportsAllDrives=True).execute()
    return created['id'], True


def upsert_file(svc, parent_id, local_path: Path):
    existing = None
    for f in list_children(svc, parent_id):
        if f['name'] == local_path.name and f['mimeType'] != 'application/vnd.google-apps.folder':
            existing = f
            break

    media = MediaIoBaseUpload(io.BytesIO(local_path.read_bytes()), mimetype='application/octet-stream', resumable=False)
    if existing:
        out = svc.files().update(fileId=existing['id'], media_body=media, fields='id,name,modifiedTime,size', supportsAllDrives=True).execute()
        return 'updated', out
    meta = {'name': local_path.name, 'parents': [parent_id]}
    out = svc.files().create(body=meta, media_body=media, fields='id,name,modifiedTime,size', supportsAllDrives=True).execute()
    return 'uploaded', out


def sync_tree(svc, local_root: Path, drive_root_id: str):
    report = {
        'timestamp_start': iso_now(),
        'trace_id': f"trace-{int(time.time())}",
        'uploaded': [],
        'updated': [],
        'blocked': [],
        'folders_created': [],
        'hashes': [],
    }

    folder_map = {str(local_root): drive_root_id}

    for root, dirs, files in os.walk(local_root):
        root_p = Path(root)
        parent_drive_id = folder_map[str(root_p)]

        for d in sorted(dirs):
            try:
                fid, created = ensure_folder(svc, parent_drive_id, d)
                folder_map[str(root_p / d)] = fid
                if created:
                    report['folders_created'].append({'path': str(root_p / d), 'file_id': fid})
            except Exception as e:
                report['blocked'].append({'path': str(root_p / d), 'op': 'mkdir', 'error': str(e), 'claim_level': 'BLOCKED'})

        for fn in sorted(files):
            fp = root_p / fn
            try:
                op, out = upsert_file(svc, parent_drive_id, fp)
                item = {'path': str(fp), 'file_id': out.get('id'), 'size': out.get('size'), 'modifiedTime': out.get('modifiedTime'), 'claim_level': 'VERIFIED'}
                report[op].append(item)
                report['hashes'].append({'path': str(fp), 'sha256': sha256_file(fp)})
            except Exception as e:
                report['blocked'].append({'path': str(fp), 'op': 'upload_or_update', 'error': str(e), 'claim_level': 'BLOCKED'})

    report['timestamp_end'] = iso_now()
    return report


def main():
    client_secret = os.environ.get('GOOGLE_OAUTH_CLIENT_SECRET', '/home/kopernik/.secrets/google-oauth-client.json')
    token_path = os.environ.get('GOOGLE_OAUTH_TOKEN_PATH', '/home/kopernik/.secrets/google-oauth-token.json')
    local_root = Path(os.environ.get('LOCAL_EVIDENCE_ROOT', '/home/kopernik/uni0n/K0NSULT-EVIDENCE'))
    drive_root_id = os.environ.get('DRIVE_ROOT_ID', '1hoSPochjVE0FNWRDJ79G2q3S-vRq_MgM')

    creds = get_creds(client_secret, token_path)
    svc = build('drive', 'v3', credentials=creds, cache_discovery=False)
    report = sync_tree(svc, local_root, drive_root_id)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
