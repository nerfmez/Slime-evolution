# Loading on slow connections

Owner report (2026-09-27): players on about 2 Mbps could not get into the game. The locked bundle waited for every asset before the first frame: 58.7 MB, about four minutes at 2 Mbps.

`perf/lazy-assets.mjs` (the last bundle patch, after `vfx/painted-style.mjs`) changes only the loading order:

- **Before play:** the page, the scripts, the slime, the Moss Frog and the scene textures. About 9.9 MB, 45 s at 2 Mbps (was 58.7 MB, about 4 min).
- **Scene textures** ship as lossless WebP in `perf/scene/`, copied to `assets/scene/`. Every decoded pixel is identical to the PNG (checked with Pillow and in Chromium), and they are about 30% smaller (12.8 MB → 9.1 MB). The PNGs in `game/` are untouched. `grass-original.png` (58 KB) stays a PNG.
- **Background group A**, fetched in the order the creatures appear: Elite Frog (95 s), Spark (120 s), Turtle (240 s), Panda (300 s), Water Calf (360 s). About 5.4 MB, roughly 25 s at 2 Mbps.
- **Background group B:** the boss models (24 MB, the boss comes at 600 s) and the old fire-effect textures (about 13 MB, drawn only behind Settings > Test).
- Each group is fetched first, then its renderers are built from the cached files in one short step while the frame loop waits. After that step the textures the scene keeps bound (units 1-4), the program and the framebuffer are restored, exactly as the original start-up order left them.
- The species draw code already skips a creature whose renderer has not arrived. A boss clip that has not arrived is not drawn, instead of throwing.
- Automated browsers keep the old all-at-start order unless the URL has `?lazy=1`, so the existing suites see every renderer from the first frame. `tests/lazy-assets-browser.mjs` covers the real-player path: start-up size, scene unchanged after the background build, and every late creature and the boss loaded and drawn. CI runs it in Chromium and WebKit.
- Art bytes are unchanged: the atlases, sprites and boss models are the same files, only fetched later.

Hosting: Vercel serves static files with revalidation, so a file fetched ahead is not downloaded again when its renderer is built. The local test server sends `no-store`, so local runs download those files twice.
