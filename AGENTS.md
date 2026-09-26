# Slime Evolution — agent instructions

Current rules only; history lives in Git (this file was consolidated on 2026-09-25). When code and this file disagree, check the code, then fix whichever is wrong. The code is the source of truth for numbers.

## How the game is built

- `game/` is the locked engine and art input: a **minified** bundle (`game/assets/main-critter-v4.js`) plus assets. Never edit it. Never import an older release, the obsolete Vite root, a published directory or the abandoned elephant build.
- All changes are **build-time patches** applied in order by `scripts/canon.mjs build`: `pacing/assemble.mjs` → `species/assemble.mjs` → `vfx/restore-godot-style.mjs` → `gameplay/opening-random.mjs` → `audio/default-volume.mjs` → `ui/hud-polish.mjs` → `vfx/painted-style.mjs`, then `species/sprite-clarity.mjs` on monster shaders.
- Patches replace exact minified snippets and must fail loudly if the snippet is not found exactly once. No runtime patching, eval or remote wrappers.
- `CANON.json` hash-locks the `game/` tree, every patch module, the `species/` tree and the assembled runtime tree. When you intentionally change a patch, update its hash and `runtimeTree` in the same commit, and review why the hash changed. Never accept a new hash silently.
- Deploy `dist/` (from `npm run build`), never `game/` directly.

## Current game (normal mode, 10-minute round)

Source of truth: `pacing/encounter-director.js`; details in `docs/COZY-PACING.md`.

- **Creatures:** `thorn` = Moss Frog, `spark` = Spark Hedgehog, `turtle` = Pond Turtle, `water` = Water Calf. Unlocks at 0/120/240/360 s.
- **Elite events:** Frog 95/150, Spark 205/255, Turtle 395/445, Water 535/570 s (`ELITE_EVENTS`).
- **Panda:** mini-boss only, never in the random pool. Slots at 300 and 480 s.
- **Boss:** Ancient Bloom boss becomes eligible at 600 s. Victory requires killing it.
- **Manual/training modes:** keep their old behavior.
- **Retired:** Thorn models/Alpha, Mossback, Petal and Crystal stay in Git history only. Do not bring them back.

## Approved decisions — do not change without the owner asking

- **Art:** approved sprites and atlases stay byte-identical. Elites reuse the normal animation frames, enlarged, with selective color accents (never a whole-body tint). Do not replace atlases with concept art. Do not generate or repaint poses.
- **Moss Frog:** always uses its approved sprite.
- **Elite Frog** (`species/elite-frog*.js`):
  - Separate atlas, cell world size 1.95.
  - Textures are 4x density (body 1280x3520, attack 2048x1536), rebuilt by `art/elite-frog/build-hires-atlas.py` from the owner's originals in `art/elite-frog/supplied-*.png`. Each frame is registered to the old 1x frame (silhouette error < 4/255), so size, pivot and pose are unchanged. Owner request: the body must be the SAME size in every frame. Body-sheet poses are scaled by 0.883, then every frame gets its measured `FRAME_SIZE` correction (SIFT + eye-band matching against the pre-attack idle, frame 13) about its feet pivot. Attack contact samples scale with the pixels, so tongue reach follows the rendered image. Original 1x attack metadata: `full-attack-source-1x.json`. The `legacy-*` 1x atlases are only the registration reference. Attack metadata stays in 1x logical units, with `textureScale: 4`.
  - The attack renders ONE whole frog+tongue image per frame from `species/enemies/elite-frog-attack.webp`. Never use detached tongue layers, procedural tongues or a body drawn underneath.
  - Motion: eight active poses, with `ATTACK_ART` metadata authoritative for timing. .55 s windup (aim locks, hits cannot cancel it), .22 s recovery.
  - Combat: 4.5-unit engagement. Damage comes only from contact with rendered tongue pixels, once per attack, plus a 3 s poison.
  - **No warning area or ground sector, ever.**
- **Other Elites:**
  - Spark: radial lightning burst after its preserved dash.
  - Turtle: reflects moving player projectiles only while Shell Guard is active.
  - Water: keeps its Alpha attack.
- **Panda:** sustained-hit resilience and defensive side roll. .8 s charge, 9.6-unit offense, 2.4-unit dodge, approved eight-frame art with cleaned alpha. See `docs/PANDA-COMBAT.md` and `docs/BAMBOO-PANDA.md`.
- **Turtle:** size 2.42, approved eight poses, walk palette, guard and shell death. See `docs/POND-TURTLE.md` and `docs/TURTLE-SIZE-8FRAME.md`.
- **Spark / Water:** preserve sizes, Spark charge/dash and Water Alpha art. See `docs/SPARK-HEDGEHOG.md` and `docs/ENEMY-SIZE.md`.
- **EXP:** every creature drops its matching EXP animal. See `docs/SPECIES-EXP-ELITES.md`.
- **Skill effects (prototype, owner request):**
  - Every skill, fire and its evolutions included, is redrawn from its original concept and card art by `vfx/painted-renderer.mjs`, wired in by `vfx/painted-style.mjs`. A filter over the old effects was rejected.
  - Look: stepped cel tones, a soft darker same-hue edge (NO black outlines), white paper highlights, paper grain and a watercolour dissolve.
  - Owner rules (rounds 1–3, see `docs/PAINTED-VFX.md`):
    - Effects must look natural, never like sculpted geometry. Small particles are soft dots with no outline; no star stickers, speckles or chips.
    - Tails are never stiff: they are ribbons along the real path.
    - Fire takes a different form in every branch and never uses flame sticks.
    - Water is one smooth body. Tidal Surge is one clean layer with no smoke or spray bits.
    - Fog and smoke are wispy, never lumps.
    - Use card art for mood only (no faces on orbs).
    - Review with the target monsters hidden, and look at animated sequences.
  - The renderer reads combat objects only. Shapes follow the gameplay hit areas; sizes, timing and damage are unchanged.
  - The old effects stay behind Settings > Test > "สีน้ำวาดมือแบบใหม่" (`slime.vfxStyle.v2`) until the owner approves.
  - See `docs/PAINTED-VFX.md`.
- **Sprite clarity:** a bounded, alpha-aware detail filter on monster shaders only. Panda is slightly stronger. Never apply it to the scene, EXP animals or effects.
- **Opening cards:** the first three skill choices use fresh browser randomness. All later RNG stays deterministic.
- **Audio:** default 50%, master gain up to 3× with a peak limiter. Saved volume always wins.
- **HUD** (`ui/hud-polish.mjs`): presentation only.
  - The game is named **Slime Evolution** (page title, HUD title and start menu).
  - A start menu (Start / How to play / Settings) shows once per page load, over the paused opening card choice. Automated browsers skip it unless the URL has `?menu=1`, so regression suites click cards directly. Test the menu itself with `?menu=1`.
  - Elite, mini-boss and boss names stay **English** (owner decision). Other UI text is Thai.
  - Compact Elite tags: star + English roster name, HP bar only once damaged, stacked instead of overlapping, faded over the player.
  - Empty skill slots shown as "+", movement hint fades after the first move, compact phone HUD.
  - A round clock sits first in the header's button group (under the buttons on phones) and the FPS box hangs below the buttons, so nothing overlaps and the boss banner keeps the top centre. Fullscreen re-shows an open settings dialog on top, so closing it resumes play; the panel shows a stage line without the time, while `#status` keeps its full text (tests read it). HP bar with a heart, round skill chips with icons.
  - Skill names and the test menu stay English. The boss banner sits in the top row on screens 960px and wider.
- **Scope:** do not add absorption skills or Mod sockets unless asked.

## Verification before merge or deploy

1. `npm test` (all unit/provenance tests) and `npm run build` (must print `CANON VERIFIED`).
2. Browser suites in **Chromium and WebKit**: `node tests/cozy-regressions.mjs local`, plus the feature's own `*-browser.mjs`. CI (`.github/workflows/`) runs both engines.
   - Skill effects: `tests/painted-vfx-browser.mjs` (new look) and `tests/vfx-browser.mjs` (old look behind the switch).
   - Cloud containers have no GPU, so a few time-bound suites (`frog-canon`, `water-browser`) can time out locally on both old and new builds. Compare against the base commit before blaming a change, and rely on CI for the final result.
3. For art or animation changes, review actual in-game captures (animated sequences for attacks). A passing code test does not prove the artwork is correct.
4. CI is not a physical iPad/Android FPS test. The owner plays on an iPad (Safari/WebKit).

## Hosting and Git

- The only production destination is https://slime-evolution-five.vercel.app (project/team in `CANON.json`). No new hosts or test projects.
- A merge or a green CI run is not a deployment. Verify the live release (`npm run audit:live`), the manifest and gameplay before calling something live.
- No force pushes.
