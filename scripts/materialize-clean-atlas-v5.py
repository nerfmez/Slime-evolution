from pathlib import Path
import base64
import hashlib

parts = Path('critters/source/atlas-v5-40-b64')
ordered = [parts / f'{i:02d}.txt' for i in range(4)]
encoded = ''.join(p.read_text(encoding='utf-8').strip() for p in ordered)
if len(encoded) != 39624:
    raise SystemExit(f'Unexpected atlas base64 length: {len(encoded)}')
raw = base64.b64decode(encoded, validate=True)
expected_sha = 'a2b1f4025136ac716c109c3c005028309be9d5dea355e8e6468e1f1793d6f1d9'
sha = hashlib.sha256(raw).hexdigest()
if len(raw) != 29716 or sha != expected_sha:
    raise SystemExit(f'Atlas digest mismatch: {len(raw)} bytes, sha256 {sha}')
if raw[:4] != b'RIFF' or raw[8:12] != b'WEBP':
    raise SystemExit('Atlas is not a WebP file')
out = Path('critters/atlas.webp')
out.write_bytes(raw)
print(f'Materialized {out}: {len(raw)} bytes sha256={sha}')
