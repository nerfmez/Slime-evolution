from collections import deque
from pathlib import Path
from PIL import Image

ATLAS = Path('critters/atlas.png')
SPECIAL = {
    'magnet_f': (3, 2), 'magnet_b': (4, 2),
    'nova_f': (5, 2), 'nova_b': (6, 2),
    'heal_f': (7, 2), 'heal_b': (0, 3),
}

im = Image.open(ATLAS).convert('RGBA')
if im.width % 8 or im.height % 4:
    raise RuntimeError(f'unexpected atlas size {im.size}; expected an 8x4 cell grid')
CELL_W, CELL_H = im.width // 8, im.height // 4
px = im.load()

def neighbors(x, y):
    for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1),(x-1,y-1),(x+1,y-1),(x-1,y+1),(x+1,y+1)):
        if 0 <= nx < CELL_W and 0 <= ny < CELL_H:
            yield nx, ny

def clean_cell(cx, cy):
    x0, y0 = cx * CELL_W, cy * CELL_H
    opaque = [[px[x0+x, y0+y][3] > 1 for x in range(CELL_W)] for y in range(CELL_H)]
    seen = [[False] * CELL_W for _ in range(CELL_H)]
    comps = []
    for sy in range(CELL_H):
        for sx in range(CELL_W):
            if seen[sy][sx] or not opaque[sy][sx]:
                continue
            q = deque([(sx, sy)]); seen[sy][sx] = True; comp = []
            while q:
                x, y = q.popleft(); comp.append((x, y))
                for nx, ny in neighbors(x, y):
                    if not seen[ny][nx] and opaque[ny][nx]:
                        seen[ny][nx] = True; q.append((nx, ny))
            comps.append(comp)
    if not comps:
        raise RuntimeError(f'empty sprite cell at {cx},{cy}')
    keep = set(max(comps, key=len))
    removed = 0
    for y in range(CELL_H):
        for x in range(CELL_W):
            if px[x0+x, y0+y][3] and (x, y) not in keep:
                px[x0+x, y0+y] = (0, 0, 0, 0); removed += 1
    return removed

removed = {name: clean_cell(*cell) for name, cell in SPECIAL.items()}
im.save(ATLAS, optimize=True)

# Verify each item frame contains exactly one connected alpha island: the animal itself.
check = Image.open(ATLAS).convert('RGBA')
for name, (cx, cy) in SPECIAL.items():
    crop = check.crop((cx*CELL_W, cy*CELL_H, (cx+1)*CELL_W, (cy+1)*CELL_H))
    data = crop.getchannel('A').load(); seen = set(); count = 0
    for y in range(CELL_H):
        for x in range(CELL_W):
            if data[x, y] <= 1 or (x, y) in seen:
                continue
            count += 1; q = deque([(x, y)]); seen.add((x, y))
            while q:
                xx, yy = q.popleft()
                for nx, ny in neighbors(xx, yy):
                    if data[nx, ny] > 1 and (nx, ny) not in seen:
                        seen.add((nx, ny)); q.append((nx, ny))
    if count != 1:
        raise RuntimeError(f'{name} still has {count} disconnected alpha components')
print(f'Cleaned item atlas {im.size}; removed non-animal pixels:', removed)
