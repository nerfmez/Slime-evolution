"""Rebuild the Elite Frog body and attack atlases at 4x texel density from the owner's originals.

The shipped 320x880 body atlas was downscaled from two supplied sheets (PR #27) whose
originals were never committed. They are now stored here:
  supplied-body-sheet.png   idle, hit, 3 death, 8 walk poses
  supplied-tongue-sheet.png 8 tongue-attack poses
  supplied-portrait.png     reference portrait (not used in the atlas)

No pose is redrawn, generated or upscaled. For every existing 160x80 atlas frame we find the
exact scale and sub-pixel offset at which the original sheet reproduces that frame, then render
the same original pixels with the same transform at SCALE x resolution. World size, pivots,
poses, timing and tongue-contact samples are therefore unchanged; only texel density rises.

Run: python art/elite-frog/build-hires-atlas.py   (Pillow, numpy, scipy)
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image
from scipy.ndimage import binary_propagation, binary_dilation, label

SCALE = 4
root = Path(__file__).resolve().parents[2]
art = root / 'art/elite-frog'
species = root / 'species'
OLD_BODY = art / 'legacy-body-atlas-320x880.webp'   # registration reference (the approved layout)
OLD_ATTACK = art / 'legacy-attack-atlas-512x384.webp'
CELL_W, CELL_H = 160, 80
PIVOT = (160 / 3, 80 * (1 - .026))  # feet pivot of the body renderer (elite-frog.js vertex shader)

# Owner request: the frog's body must be the same size in EVERY frame. The artist drew poses at
# slightly different sizes, so each frame's apparent size was measured against the pre-attack idle
# pose (body frame 13) with pose-invariant features: SIFT similarity matches (strong for the attack
# poses) and an eye-band template (reliable for the walk/leap poses); walk frames use their average.
# Values are relative sizes after the 0.8831 body-sheet match; each frame is divided by its value.
FRAME_SIZE = {
    'b0': 1.013, 'b1': .955, 'b2': .995, 'b3': .995, 'b4': .995,
    'b5': .945, 'b6': .975, 'b7': 1.02, 'b8': .99, 'b9': .94, 'b10': .85, 'b11': .97, 'b12': .98,
    'b13': 1.0, 'b14': 1.022, 'b15': .993, 'b16': .934, 'b17': .825, 'b18': .812, 'b19': .818, 'b20': .908,
    'a2': .95, 'a3': .952, 'a4': .94, 'a5': .94, 'a6': .933,
}

# Approximate centre of each pose in its source sheet (x, y). Only used to pick the right sprite
# when several poses look alike; the exact transform comes from the image match.
BODY_SHEET, TONGUE_SHEET = 'supplied-body-sheet.png', 'supplied-tongue-sheet.png'
EXPECTED = {
    0: (BODY_SHEET, 170, 215), 1: (BODY_SHEET, 470, 215), 2: (BODY_SHEET, 740, 215),
    3: (BODY_SHEET, 1015, 250), 4: (BODY_SHEET, 1385, 250),
    5: (BODY_SHEET, 175, 580), 6: (BODY_SHEET, 500, 580), 7: (BODY_SHEET, 890, 590), 8: (BODY_SHEET, 1310, 580),
    9: (BODY_SHEET, 190, 855), 10: (BODY_SHEET, 520, 855), 11: (BODY_SHEET, 930, 870), 12: (BODY_SHEET, 1330, 860),
    13: (TONGUE_SHEET, 165, 230), 14: (TONGUE_SHEET, 580, 230), 15: (TONGUE_SHEET, 990, 230), 16: (TONGUE_SHEET, 1470, 230),
    17: (TONGUE_SHEET, 130, 690), 18: (TONGUE_SHEET, 720, 690), 19: (TONGUE_SHEET, 1140, 690), 20: (TONGUE_SHEET, 1600, 690),
}


def load_sheet(name):
    rgba = np.array(Image.open(art / name).convert('RGBA')).astype(np.float32)
    # The supplied sprites are 249-254 alpha on 0-2 alpha backgrounds; normalise like the shipped atlas.
    a = np.clip((rgba[:, :, 3] - 6) / (240 - 6), 0, 1)
    rgba[:, :, 3] = a * 255
    rgba[:, :, :3] *= (a > 0)[:, :, None]
    return Image.fromarray(rgba.round().astype(np.uint8))


def resample(sheet, t, fx, fy):
    """Sheet shifted by a sub-pixel phase (fx, fy output pixels) then LANCZOS-scaled by t."""
    if fx or fy:
        sheet = sheet.transform(sheet.size, Image.Transform.AFFINE, (1, 0, -fx / t, 0, 1, -fy / t), Image.Resampling.BICUBIC)
    w, h = sheet.size
    return sheet.resize((max(1, round(w * t)), max(1, round(h * t))), Image.Resampling.LANCZOS)


def isolate(sheet, ex, ey):
    """Crop one pose (main sprite plus nearby small effects) and blank neighbouring poses."""
    a = np.asarray(sheet)[:, :, 3] > 128
    lab, count = label(binary_dilation(a, iterations=2))
    sizes = np.bincount(lab.ravel()); sizes[0] = 0
    big = [i for i in range(1, count + 1) if sizes[i] > 3000]
    cents = {i: (np.nonzero(lab == i)[1].mean(), np.nonzero(lab == i)[0].mean()) for i in big}
    main = min(big, key=lambda i: np.hypot(cents[i][0] - ex, cents[i][1] - ey))
    ys, xs = np.nonzero(lab == main)
    m = 45
    box = (max(0, xs.min() - m), max(0, ys.min() - m), min(sheet.width, xs.max() + 1 + m), min(sheet.height, ys.max() + 1 + m))
    rgba = np.asarray(sheet).copy()
    others = np.isin(lab, [i for i in big if i != main])
    rgba[others] = 0
    crop = Image.fromarray(rgba).crop(box)
    main_box = (xs.min() - box[0], ys.min() - box[1], xs.max() + 1 - box[0], ys.max() + 1 - box[1])
    return crop, box, main_box


def main_bbox(alpha):
    lab, count = label(binary_dilation(alpha > 128, iterations=1))
    sizes = np.bincount(lab.ravel()); sizes[0] = 0
    ys, xs = np.nonzero(lab == int(np.argmax(sizes)))
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def place(crop, t, ox, oy, w, h):
    """Crop scaled by t with its top-left at (ox, oy) (sub-pixel) inside a w x h cell."""
    nx, ny = np.floor(ox), np.floor(oy)
    big = resample(crop, t, ox - nx, oy - ny)
    cell = Image.new('RGBA', (w, h))
    cell.paste(big, (int(nx), int(ny)))
    return cell


def register(frame, old_body, sheets):
    name, ex, ey = EXPECTED[frame]
    crop, box, mb = isolate(sheets[name], ex, ey)
    cell = old_body.crop((frame % 2 * CELL_W, frame // 2 * CELL_H, frame % 2 * CELL_W + CELL_W, frame // 2 * CELL_H + CELL_H))
    target = np.asarray(cell)[:, :, 3].astype(np.float32) / 255
    bx0, by0, bx1, by1 = main_bbox(np.asarray(cell)[:, :, 3])
    t0 = ((by1 - by0) / (mb[3] - mb[1]) + (bx1 - bx0) / (mb[2] - mb[0])) / 2
    ox0 = bx0 - mb[0] * t0; oy0 = by1 - mb[3] * t0   # align left edge and feet
    def err(t, ox, oy):
        a = np.asarray(place(crop, t, ox, oy, CELL_W, CELL_H))[:, :, 3].astype(np.float32) / 255
        return float(((a - target) ** 2).sum())
    best = (err(t0, ox0, oy0), t0, ox0, oy0)
    for step_t, step_o, span in ((.02, 1.0, 3), (.006, .5, 2), (.002, .25, 2)):
        _, tb, oxb, oyb = best
        for t in tb * (1 + step_t * np.arange(-span, span + 1)):
            for ox in oxb + step_o * np.arange(-span, span + 1):
                for oy in oyb + step_o * np.arange(-span, span + 1):
                    e = err(t, ox, oy)
                    if e < best[0]:
                        best = (e, t, ox, oy)
    e, t, ox, oy = best
    print(f'frame {frame:2d} {name[9:13]} t={t:.4f} origin=({ox:.2f},{oy:.2f}) alphaSSD={e:.1f}', flush=True)
    return {'frame': frame, 'sheet': name, 'box': [int(v) for v in box], 'scale': float(t), 'originX': float(ox), 'originY': float(oy), 'ssd': e, 'crop': crop}


def render(reg, sheets, k):
    """Render the registered transform at k x resolution into a (160k x 80k) cell."""
    return place(reg['crop'], reg['scale'] * k, reg['originX'] * k, reg['originY'] * k, CELL_W * k, CELL_H * k)


def main():
    if not OLD_BODY.exists():
        raise SystemExit(f'missing {OLD_BODY.name}: copy the shipped 320x880 atlas there first')
    old_body = Image.open(OLD_BODY).convert('RGBA')
    sheets = {n: load_sheet(n) for n in (BODY_SHEET, TONGUE_SHEET)}
    regs = [register(f, old_body, sheets) for f in range(21)]
    atlas = Image.new('RGBA', (2 * CELL_W * SCALE, 11 * CELL_H * SCALE))
    check = Image.new('RGBA', old_body.size)
    report = []
    for r in regs:
        f = r['frame']
        lo = render(r, sheets, 1)
        check.paste(lo, (f % 2 * CELL_W, f // 2 * CELL_H))
        a = np.asarray(old_body.crop((f % 2 * CELL_W, f // 2 * CELL_H, f % 2 * CELL_W + CELL_W, f // 2 * CELL_H + CELL_H))).astype(float)
        b = np.asarray(lo).astype(float)
        report.append({'frame': f, 'sheet': r['sheet'], 'sourceBox': r['box'], 'scale': round(r['scale'], 5), 'origin': [round(r['originX'], 3), round(r['originY'], 3)],
                       'alphaMAE': round(float(np.abs(a[:, :, 3] - b[:, :, 3]).mean()), 2),
                       'rgbMAEonBody': round(float(np.abs(a[:, :, :3] - b[:, :, :3])[(a[:, :, 3] > 200) & (b[:, :, 3] > 200)].mean()), 2)})
    # The two supplied sheets draw the frog at different sizes: idle from the body sheet (frame 0)
    # is ~12% larger than the identical idle pose from the tongue sheet (frame 13). Scale every
    # body-sheet pose about the renderer's feet pivot so walking, hit and death match the attack size.
    def size(reg):
        x0, y0, x1, y1 = main_bbox(np.asarray(render(reg, sheets, SCALE))[:, :, 3])
        return x1 - x0, y1 - y0
    (w0, h0), (w13, h13) = size(regs[0]), size(regs[13])
    match = ((w13 / w0) + (h13 / h0)) / 2
    for r in regs:
        if r['sheet'] == BODY_SHEET:
            r['scale'] *= match
            r['originX'] = PIVOT[0] + (r['originX'] - PIVOT[0]) * match
            r['originY'] = PIVOT[1] + (r['originY'] - PIVOT[1]) * match
    print(f'body-sheet poses scaled by {match:.4f} to match the attack sheet', flush=True)
    for r in regs:
        c = 1 / FRAME_SIZE['b%d' % r['frame']]
        r['scale'] *= c
        r['originX'] = PIVOT[0] + (r['originX'] - PIVOT[0]) * c
        r['originY'] = PIVOT[1] + (r['originY'] - PIVOT[1]) * c
    for r in regs:
        f = r['frame']
        atlas.paste(render(r, sheets, SCALE), (f % 2 * CELL_W * SCALE, f // 2 * CELL_H * SCALE))
    out = species / 'enemies/elite-frog-atlas.webp'
    atlas.save(out, 'WEBP', quality=92, method=6, exact=True)
    build_attack(atlas, regs)
    meta = {'scale': SCALE, 'bodySheetMatchToAttack': round(match, 5), 'cell': [CELL_W * SCALE, CELL_H * SCALE], 'size': list(atlas.size),
            'sources': {n: hashlib.sha256((art / n).read_bytes()).hexdigest() for n in (BODY_SHEET, TONGUE_SHEET, 'supplied-portrait.png')},
            'legacyBodyAtlasSHA256': hashlib.sha256(OLD_BODY.read_bytes()).hexdigest(),
            'atlasSHA256': hashlib.sha256(out.read_bytes()).hexdigest(), 'frames': report}
    (art / 'hires-atlas-source.json').write_text(json.dumps(meta, indent=2) + '\n')
    check.save('/tmp/elite-frog-registration-check.png')
    print(json.dumps({'size': atlas.size, 'bytes': out.stat().st_size,
                      'worstAlphaMAE': max(r['alphaMAE'] for r in report), 'worstRgbMAE': max(r['rgbMAEonBody'] for r in report)}))


def build_attack(body_hi, regs):
    """Rebuild the 8-frame whole-body attack atlas at the same SCALE; metadata geometry is unchanged."""
    meta_path = art / 'full-attack-source.json'
    # Always start from the original 1x metadata so corrections never compound.
    meta = json.loads((art / 'full-attack-source-1x.json').read_text())
    k = SCALE
    cw, ch = meta['cell']
    px, py = meta['pivot']
    atlas = Image.new('RGBA', (meta['width'] * k, meta['height'] * k))
    source = Image.open(art / meta['source']).convert('RGB')
    for i, f in enumerate(meta['frames']):
        cell = Image.new('RGBA', (cw * k, ch * k))
        # Same-size correction about the attack pivot; contact samples follow the rendered pixels.
        c = 1 / FRAME_SIZE[('b%d' if f['sourceKind'] == 'normal' else 'a%d') % (f['originalFrame'] if f['sourceKind'] == 'normal' else i)]
        f['samples'] = [[round(x * c, 3), round(y * c, 3), round(rad * c, 3)] for x, y, rad in f['samples']]
        f['mouth'] = [round(px + (f['mouth'][0] - px) * c, 3), round(py + (f['mouth'][1] - py) * c, 3)]
        f['bodyHeight'] = round(f['bodyHeight'] * c, 3)
        f['sizeCorrection'] = round(c, 5)
        if f['sourceKind'] == 'normal':
            n = f['originalFrame']
            pose = body_hi.crop((n % 2 * CELL_W * k, n // 2 * CELL_H * k, (n % 2 + 1) * CELL_W * k, (n // 2 + 1) * CELL_H * k))
            cell.paste(pose, (-5 * k, 0))
        else:
            # Same matte removal and registration as extract-full-attack.py, rendered at k x.
            n = f['originalFrame']
            rgb = np.array(source.crop((n % 2 * 768, n // 2 * 256, n % 2 * 768 + 768, n // 2 * 256 + 256))).astype(float)
            dark = 255 - rgb.min(2); sat = rgb.max(2) - rgb.min(2)
            white = (rgb.min(2) > 218) & (sat < 30)
            seed = np.zeros(white.shape, bool); seed[0] = white[0]; seed[-1] = white[-1]; seed[:, 0] = white[:, 0]; seed[:, -1] = white[:, -1]
            exterior = binary_propagation(seed, mask=white)
            alpha = (~exterior).astype(float); edge = binary_dilation(exterior) & ~exterior
            alpha[edge] = np.clip(dark[edge] / 110, 0, 1)
            clean = np.clip((rgb - 255 * (1 - alpha[:, :, None])) / np.maximum(alpha[:, :, None], .001), 0, 255)
            raw = Image.fromarray(np.dstack([clean, alpha * 255]).astype('uint8'))
            body = (dark[:, :225] > 80) & ~exterior[:, :225]
            ys, xs = np.where(body); top = int(ys.min()); bottom = int(ys.max() + 1)
            footx = np.where(body[max(top, bottom - 18):bottom].any(0))[0]
            cx = (int(footx.min()) + int(footx.max())) / 2
            factor = 183 / (bottom - top); dx = 128 - cx * factor; dy = 244 - bottom * factor
            master = raw.transform((768, 288), Image.Transform.AFFINE, (1 / factor, 0, -dx / factor, 0, 1 / factor, -dy / factor), Image.Resampling.BICUBIC)
            factor2 = f['bodyHeight'] / 183  # already includes the same-size correction
            small = master.resize((round(768 * factor2 * k), round(288 * factor2 * k)), Image.Resampling.LANCZOS)
            cell.paste(small, (round((px - 128 * factor2) * k), round((py - 244 * factor2) * k)))
        atlas.paste(cell, (i % 2 * cw * k, i // 2 * ch * k))
    out = species / 'enemies/elite-frog-attack.webp'
    atlas.save(out, 'WEBP', quality=92, method=6, exact=True)
    meta['textureScale'] = k
    meta['bodyAtlasSHA256'] = hashlib.sha256((species / 'enemies/elite-frog-atlas.webp').read_bytes()).hexdigest()
    meta['atlasSHA256'] = hashlib.sha256(out.read_bytes()).hexdigest()
    meta_path.write_text(json.dumps(meta, indent=2) + '\n')
    frames_js = species / 'elite-frog-attack-frames.js'
    runtime = {key: meta[key] for key in ['width', 'height', 'cell', 'pivot', 'bodyHeight', 'pixelWorld', 'duration', 'ends', 'frames']}
    runtime['textureScale'] = k
    frames_js.write_text('// Whole poses in logical 1.95/80 units; the texture is textureScale x denser. Rebuild: art/elite-frog/build-hires-atlas.py.\nexport const ATTACK_ART=' + json.dumps(runtime, separators=(',', ':')) + ';\n')


if __name__ == '__main__':
    main()
