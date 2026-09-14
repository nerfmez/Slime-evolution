from collections import deque
from pathlib import Path
from PIL import Image

ATLAS = Path('critters/atlas.png')
CELL = 128
SPECIAL = {
    'magnet_f': (3, 2), 'magnet_b': (4, 2),
    'nova_f': (5, 2), 'nova_b': (6, 2),
    'heal_f': (7, 2), 'heal_b': (0, 3),
}

im = Image.open(ATLAS).convert('RGBA')
px = im.load()

def clean_cell(cx, cy):
    x0, y0 = cx * CELL, cy * CELL
    opaque = [[px[x0+x, y0+y][3] > 1 for x in range(CELL)] for y in range(CELL)]
    seen = [[False] * CELL for _ in range(CELL)]
    comps = []
    for sy in range(CELL):
        for sx in range(CELL):
            if seen[sy][sx] or not opaque[sy][sx]:
                continue
            q = deque([(sx, sy)]); seen[sy][sx] = True; comp = []
            while q:
                x, y = q.popleft(); comp.append((x, y))
                for nx, ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1),(x-1,y-1),(x+1,y-1),(x-1,y+1),(x+1,y+1)):
                    if 0 <= nx < CELL and 0 <= ny < CELL and not seen[ny][nx] and opaque[ny][nx]:
                        seen[ny][nx] = True; q.append((nx, ny))
            comps.append(comp)
    if not comps:
        raise RuntimeError(f'empty sprite cell at {cx},{cy}')
    keep = set(max(comps, key=len))
    removed = 0
    for y in range(CELL):
        for x in range(CELL):
            if px[x0+x, y0+y][3] and (x, y) not in keep:
                px[x0+x, y0+y] = (0, 0, 0, 0); removed += 1
    return removed

removed = {name: clean_cell(*cell) for name, cell in SPECIAL.items()}
im.save(ATLAS, optimize=True)

# Verify the six item frames now have one connected alpha island each.
check = Image.open(ATLAS).convert('RGBA')
for name, (cx, cy) in SPECIAL.items():
    crop = check.crop((cx*CELL, cy*CELL, (cx+1)*CELL, (cy+1)*CELL))
    alpha = crop.getchannel('A')
    data = alpha.load(); seen = set(); count = 0
    for y in range(CELL):
        for x in range(CELL):
            if data[x, y] <= 1 or (x, y) in seen:
                continue
            count += 1; q = deque([(x, y)]); seen.add((x, y))
            while q:
                xx, yy = q.popleft()
                for nx, ny in ((xx-1,yy),(xx+1,yy),(xx,yy-1),(xx,yy+1),(xx-1,yy-1),(xx+1,yy-1),(xx-1,yy+1),(xx+1,yy+1)):
                    if 0 <= nx < CELL and 0 <= ny < CELL and data[nx, ny] > 1 and (nx, ny) not in seen:
                        seen.add((nx, ny)); q.append((nx, ny))
    if count != 1:
        raise RuntimeError(f'{name} still has {count} disconnected alpha components')
print('Cleaned item atlas; removed non-animal pixels:', removed)
