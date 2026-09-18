# Turtle walk palette correction — 2026-09-18

Parent: deployed main `904610552cb9bc64c0860837ba93ee5ea5957bd5`.

The actual game had 12 registered, full-resolution video cells. The eight 280px contact-sheet thumbnails produced in the previous chat are NOT used. All original video/still files, frame IDs, timestamps, poses, scale and pivot stay unchanged.

Only RGB in walk cells 0–11 is corrected. A single smooth material-aware mapping is baked offline for all frames: leaf/green-skin hue, saturation and value are matched against the approved non-emissive hurt/shell palette; cream skin receives a bounded separate correction. Ink, eyes, claws and neutral whites are protected. No global green wash, new markings, re-keying or runtime shader is added. Guard glow is deliberately NOT used as a palette target.

Every alpha byte and every RGBA byte of cells 12–15 (hurt, empty shell, guard body, original aura) are identical to the deployed atlas. `tools/turtle_walk_color.py --check` verifies the independently reviewed full decoded result, per-cell pixels and alpha. The ordinary extraction script calls this as its final offline step, preventing a future extraction from silently restoring the pale walk colors.

The existing browser test additionally hashes fully opaque RGBA texels in all 16 cells and the full alpha channel after real Chromium/WebKit decoding. This test is also run by the existing production audit. Semi-transparent RGB is validated by the offline full RGBA hash, not browser canvas roundtrips, which premultiply/unpremultiply it.

Only two runtime files change: the atlas and its metadata. All 1258 other current game files, including every renderer, state/timer, shield reduction, size, damage, scene and other creature, remain byte-identical and are checked against a parent manifest. Existing tests are not relaxed. Regressions and original-domain audit must pass before reporting deployment.
