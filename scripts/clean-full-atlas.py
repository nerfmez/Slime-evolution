from collections import deque
from pathlib import Path
from PIL import Image
import numpy as np

ATLAS = Path('critters/atlas.png')
COLS, ROWS = 8, 4
USED = 25

im = Image.open(ATLAS).convert('RGBA')
a = np.array(im)
h, w = a.shape[:2]
if w % COLS or h % ROWS:
    raise RuntimeError(f'unexpected atlas size {w}x{h}')
cw, ch = w // COLS, h // ROWS


def removable(rgb, alpha):
    # Background from the approved sheets is neutral white / warm paper-white.
    # Dark ink outlines block this flood, so white fur inside an animal is preserved.
    r, g, b = map(int, rgb)
    hi, lo = max(r, g, b), min(r, g, b)
    neutral = hi - lo < 48
    return alpha < 8 or (neutral and lo > 214) or (r > 232 and g > 226 and b > 214)


def clean_cell(cx, cy):
    x0, y0 = cx * cw, cy * ch
    cell = a[y0:y0+ch, x0:x0+cw]
    seen = np.zeros((ch, cw), dtype=bool)
    q = deque()
    for x in range(cw):
        q.append((x, 0)); q.append((x, ch-1))
    for y in range(ch):
        q.append((0, y)); q.append((cw-1, y))
    while q:
        x, y = q.popleft()
        if seen[y, x]:
            continue
        px = cell[y, x]
        if not removable(px[:3], px[3]):
            continue
        seen[y, x] = True
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,1),(1,-1),(-1,-1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < cw and 0 <= ny < ch and not seen[ny, nx]:
                q.append((nx, ny))
    removed = int(np.count_nonzero(seen & (cell[:,:,3] > 0)))
    cell[seen] = 0

    # Strip the last pale matte pixels immediately touching transparency.
    # We only touch very light, low-chroma edge pixels; the dark watercolor ink remains intact.
    for _ in range(2):
        alpha = cell[:,:,3]
        transparent = alpha < 8
        neighbor_clear = np.zeros_like(transparent)
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,1),(1,-1),(-1,-1)):
            shifted = np.zeros_like(transparent)
            ys = slice(max(0,dy), min(ch,ch+dy)); xs = slice(max(0,dx), min(cw,cw+dx))
            srcy = slice(max(0,-dy), min(ch,ch-dy)); srcx = slice(max(0,-dx), min(cw,cw-dx))
            shifted[ys,xs] = transparent[srcy,srcx]
            neighbor_clear |= shifted
        rgb = cell[:,:,:3].astype(np.int16)
        hi = rgb.max(axis=2); lo = rgb.min(axis=2)
        pale = (lo > 202) & ((hi-lo) < 58)
        kill = neighbor_clear & pale & (alpha > 0)
        removed += int(np.count_nonzero(kill))
        cell[kill] = 0
    return removed

removed = {}
for i in range(USED):
    removed[i] = clean_cell(i % COLS, i // COLS)

# Normalize all fully transparent texels so linear filtering cannot pull old white RGB into edges.
zero = a[:,:,3] == 0
a[zero, :3] = 0
Image.fromarray(a, 'RGBA').save(ATLAS, optimize=True)

# Hard validation: every used cell must have transparent corners and visible foreground.
check = np.array(Image.open(ATLAS).convert('RGBA'))
for i in range(USED):
    cx, cy = i % COLS, i // COLS
    c = check[cy*ch:(cy+1)*ch, cx*cw:(cx+1)*cw]
    if np.count_nonzero(c[:,:,3] > 8) < max(12, cw*ch//80):
        raise RuntimeError(f'cell {i} lost its sprite')
    corners = [c[0,0,3], c[0,-1,3], c[-1,0,3], c[-1,-1,3]]
    if any(v > 8 for v in corners):
        raise RuntimeError(f'cell {i} still has opaque background at a corner')

print('Cleaned approved atlas; removed matte pixels:', sum(removed.values()))
