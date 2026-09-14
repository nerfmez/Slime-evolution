from pathlib import Path
import base64
import hashlib

parts = Path('critters/source/atlas-v5-40-b64')
ordered = [parts / f'{i:02d}.txt' for i in range(4)]
encoded = ''.join(p.read_text(encoding='utf-8').strip() for p in ordered)
expected_len = 39624
expected_raw_len = 29716
expected_sha = 'a2b1f4025136ac716c109c3c005028309be9d5dea355e8e6468e1f1793d6f1d9'

def verified(text):
    try:
        raw = base64.b64decode(text, validate=True)
    except Exception:
        return None
    if len(raw) != expected_raw_len:
        return None
    if hashlib.sha256(raw).hexdigest() != expected_sha:
        return None
    return raw

raw = verified(encoded)
repaired_at = None
if raw is None and len(encoded) == expected_len + 1:
    # A single connector-side character was inserted into one text chunk. Recover only when
    # exactly one deletion produces the pre-reviewed atlas SHA-256, so there is no guesswork.
    for i in range(len(encoded)):
        candidate = encoded[:i] + encoded[i+1:]
        raw = verified(candidate)
        if raw is not None:
            repaired_at = i
            encoded = candidate
            break

if raw is None:
    raise SystemExit(f'Atlas verification failed: base64 length {len(encoded)}')
if raw[:4] != b'RIFF' or raw[8:12] != b'WEBP':
    raise SystemExit('Atlas is not a WebP file')
out = Path('critters/atlas.webp')
out.write_bytes(raw)
repair = f' (removed one connector character at {repaired_at})' if repaired_at is not None else ''
print(f'Materialized {out}: {len(raw)} bytes sha256={expected_sha}{repair}')
