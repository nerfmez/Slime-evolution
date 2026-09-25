# Slime Evolution — agent instructions

Current rules only; history lives in Git (this file was consolidated on 2026-09-25). When code and this file disagree, check the code, then fix whichever is wrong. The code is the source of truth for numbers.

## How the game is built

- `game/` is the locked engine and art input: a **minified** bundle (`game/assets/main-critter-v4.js`) plus assets. Never edit it. Never import an older release, the obsolete Vite root, a published directory or the abandoned elephant build.
- All changes are **build-time patches** applied in order by `scripts/canon.mjs build`: `pacing/assemble.mjs` → `species/assemble.mjs` → `vfx/restore-godot-style.mjs` → `gameplay/opening-random.mjs` → `audio/default-volume.mjs` → `ui/hud-polish.mjs`, then `species/sprite-clarity.mjs` on monster shaders.
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
- **Sprite clarity:** a bounded, alpha-aware detail filter on monster shaders only. Panda is slightly stronger. Never apply it to the scene, EXP animals or effects.
- **Opening cards:** the first three skill choices use fresh browser randomness. All later RNG stays deterministic.
- **Audio:** default 50%, master gain up to 3× with a peak limiter. Saved volume always wins.
- **HUD** (`ui/hud-polish.mjs`): presentation only.
  - The game is named **Slime Evolution** (page title and HUD title).
  - Elite, mini-boss and boss names stay **English** (owner decision). Other UI text is Thai.
  - Compact Elite tags: star + English roster name, HP bar only once damaged, stacked instead of overlapping, faded over the player.
  - Empty skill slots shown as "+", movement hint fades after the first move, compact phone HUD.
  - Skill names and the test menu stay English. The boss banner sits in the top row on screens 960px and wider.
- **Scope:** do not add absorption skills or Mod sockets unless asked.

## Verification before merge or deploy

1. `npm test` (all unit/provenance tests) and `npm run build` (must print `CANON VERIFIED`).
2. Browser suites in **Chromium and WebKit**: `node tests/cozy-regressions.mjs local`, plus the feature's own `*-browser.mjs`. CI (`.github/workflows/`) runs both engines.
   - Cloud containers have no GPU, so a few time-bound suites (`frog-canon`, `water-browser`) can time out locally on both old and new builds. Compare against the base commit before blaming a change, and rely on CI for the final result.
3. For art or animation changes, review actual in-game captures (animated sequences for attacks). A passing code test does not prove the artwork is correct.
4. CI is not a physical iPad/Android FPS test. The owner plays on an iPad (Safari/WebKit).

## Hosting and Git

- The only production destination is https://slime-evolution-five.vercel.app (project/team in `CANON.json`). No new hosts or test projects.
- A merge or a green CI run is not a deployment. Verify the live release (`npm run audit:live`), the manifest and gameplay before calling something live.
- No force pushes.
