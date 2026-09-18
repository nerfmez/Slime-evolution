"""Baked, pose-preserving Turtle walk color match. Pillow is the only dependency.

All 12 registered video cells use ONE deterministic material-aware RGB transform.
Alpha, the original video, frame ordering, and the four still/effect cells are untouched.
"""
from pathlib import Path
from functools import lru_cache
from colorsys import rgb_to_hsv, hsv_to_rgb
from hashlib import sha256
import argparse
import json
import math
from PIL import Image

CELL = 384
INPUT_RGBA_SHA256 = '2d8194377ba0919d2f4d2324e0c20940d8c171e68ec4a6942645c7f6e88ee896'
OUTPUT_RGBA_SHA256 = '7522da66146cc5f31bf5efdf089ad15c4d60980760009a29e007e8b6297cb945'
PROFILE = 'turtle-walk-to-approved-stills-v1'


def smooth(lo, hi, value):
    t = max(0.0, min(1.0, (value - lo) / (hi - lo)))
    return t * t * (3.0 - 2.0 * t)


@lru_cache(maxsize=262144)
def matched_rgb(r, g, b):
    h, s, v = rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
    h *= 360.0
    foliage = (smooth(42, 57, h) * (1 - smooth(155, 180, h))
               * smooth(.16, .29, s) * smooth(.20, .36, v))
    foliage *= 1 - smooth(.76, .90, v) * (1 - smooth(.30, .43, s))
    cream = (smooth(22, 35, h) * (1 - smooth(55, 68, h))
             * smooth(.04, .12, s) * (1 - smooth(.33, .47, s))
             * smooth(.64, .84, v))
    if foliage == 0 and cream == 0:
        return r, g, b
    hue = h + 14 * foliage + 4 * cream * (1 - foliage)
    saturation = min(1.0, s * (1 + .42 * foliage) + .008 * cream * (1 - foliage))
    value = v + .18 * v * foliage + .065 * cream * (1 - foliage)
    if value > .95:
        value = max(v, .95 + (value - .95) / (1 + (value - .95) * 16))
    rgb = hsv_to_rgb((hue % 360) / 360, saturation, min(1.0, value))
    return tuple(max(0, min(255, math.floor(c * 255 + .5))) for c in rgb)


def grade_walk_atlas(atlas):
    """Change RGB in cells 0..11 only. Do not resample, key, crop or change alpha."""
    src = atlas.convert('RGBA')
    if src.size != (1536, 1536):
        raise ValueError('Expected the original 1536x1536 Turtle atlas')
    before = src.tobytes()
    result = bytearray(before)
    for i in range(0, 1536 * 1152 * 4, 4):
        if before[i + 3]:
            result[i:i + 3] = bytes(matched_rgb(*before[i:i + 3]))
    out = Image.frombytes('RGBA', src.size, bytes(result))
    assert result[3::4] == before[3::4]
    assert result[1536 * 1152 * 4:] == before[1536 * 1152 * 4:]
    return out


def pixel_proof(atlas):
    a = atlas.convert('RGBA')
    cells = []
    for i in range(16):
        tile = a.crop((i % 4 * CELL, i // 4 * CELL, (i % 4 + 1) * CELL, (i // 4 + 1) * CELL))
        data = tile.tobytes()
        opaque = bytes(c for p in tile.getdata() if p[3] == 255 for c in p)
        cells.append({'cell': i, 'rgbaSHA256': sha256(data).hexdigest(),
                      'alphaSHA256': sha256(data[3::4]).hexdigest(),
                      'opaqueRGBA_SHA256': sha256(opaque).hexdigest()})
    return {'rgbaSHA256': sha256(a.tobytes()).hexdigest(),
            'alphaSHA256': sha256(a.tobytes()[3::4]).hexdigest(), 'cells': cells}


def apply(root):
    directory = root / 'game/assets/enemies'
    path = directory / 'pond-turtle-atlas.webp'
    metadata_path = directory / 'pond-turtle-atlas.json'
    im = Image.open(path).convert('RGBA')
    source = pixel_proof(im)
    if source['rgbaSHA256'] == OUTPUT_RGBA_SHA256:
        print('Turtle color match already applied; no double grading')
        return
    if source['rgbaSHA256'] != INPUT_RGBA_SHA256:
        raise ValueError('Unknown input atlas: do not grade an older or already edited asset')
    after = grade_walk_atlas(im)
    proof = pixel_proof(after)
    assert proof['rgbaSHA256'] == OUTPUT_RGBA_SHA256, proof['rgbaSHA256']
    after.save(path, lossless=True, method=6, exact=True)
    assert Image.open(path).convert('RGBA').tobytes() == after.tobytes()
    metadata = json.loads(metadata_path.read_text())
    metadata['version'] = 2
    metadata['walkColorMatch'] = {
        'profile': PROFILE, 'appliedCells': list(range(12)),
        'referenceCells': [12, 13], 'source': source, 'output': proof,
        'atlasSHA256': sha256(path.read_bytes()).hexdigest(),
        'note': 'Shared material-aware color transform only; source frames, all alpha and cells 12-15 unchanged. Glow cell is not a palette target.'
    }
    metadata_path.write_text(json.dumps(metadata, indent=2) + '\n')
    print(json.dumps({'profile': PROFILE, 'bytes': path.stat().st_size, 'rgba': proof['rgbaSHA256']}))


def check(root):
    directory = root / 'game/assets/enemies'
    path = directory / 'pond-turtle-atlas.webp'
    m = json.loads((directory / 'pond-turtle-atlas.json').read_text())
    p = m['walkColorMatch']
    actual = pixel_proof(Image.open(path))
    assert actual['rgbaSHA256'] == OUTPUT_RGBA_SHA256
    assert actual == p['output']
    assert actual['alphaSHA256'] == p['source']['alphaSHA256']
    assert actual['cells'][12:] == p['source']['cells'][12:]
    assert all(actual['cells'][i]['alphaSHA256'] == p['source']['cells'][i]['alphaSHA256'] for i in range(12))
    assert all(actual['cells'][i]['rgbaSHA256'] != p['source']['cells'][i]['rgbaSHA256'] for i in range(12))
    assert sha256(path.read_bytes()).hexdigest() == p['atlasSHA256']
    assert m['walkFrames'] == list(range(72, 144, 6))
    print('TURTLE COLOR VERIFIED: 12 corrected real frames; all alpha and four static/effect cells unchanged')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    (check if args.check else apply)(args.root)
