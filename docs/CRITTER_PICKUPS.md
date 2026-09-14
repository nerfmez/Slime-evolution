# Small animal pickups v2 — 2026-09-14

## Authoritative release and publishing
The latest playable upload is `published/2026-09-14`, NOT the older root Vite source. Run `node scripts/apply-critter-patch.mjs` to generate `assets/main-critter-v2.js` and `assets/critters-v2/` from the hash-verified original bundle and readable `critters/` source. Versioned filenames prevent a cached v1 module being mixed into v2. The original bundle, v1 bundle and v1 modules remain for rollback.
Serve the contents of that release directory at the site root. Current production is the existing Vercel project `slime-evolution`, alias `slime-evolution-five.vercel.app`, team `team_wUPNV5SYxHR0mz3URq89uGm0`. Do not rebuild the older root source or deploy the old Sites project.

## Latest user corrections / behavior
- No passive EXP suction at all until the Magnet mod is selected. Physical contact still starts the .16-second swallow animation. Magnet rank adds .42 world units beyond the contact radius (.38 times growth size); no hidden 3.4 base returns at rank 1.
- Nearby animals make one small escape per approach: .42 s at .95 units/s, then settle so they remain easy to catch. Rearm after the player retreats; maximum displacement from the spawn anchor is .96. Escape/wander tests both map bounds and the existing passability predicate. No combat RNG is used.
- The special global magnet pickup still works without the passive mod: it visibly gathers already-dropped EXP animals and credits each reward exactly once. Ordinary attraction does not pull special items.
- EXP retains its existing frog, leaf beetle and rabbit designs, without an item glow. Special items now have distinct silhouettes, not recolors: coral heart axolotl (heal), blue/red horseshoe-shell snail (magnet), amber lantern moth with starburst abdomen (nova). Specials have a faint local pulsing halo, no screen-wide bloom.
- Original reward values, drop rates, heal/nova effects, EXP modifiers, audio and save keys remain unchanged. Growth still scales contact. Pause/cards/growth suspend motion. No health or combat targeting is added to animals.

## Rendering and tests
Normal and special animals still share one instanced draw, two triangles each, reusable buffers and no external model or texture downloads. The aura is in the same fragment shader with padding; physical contact size is unchanged by glow.

```
node scripts/apply-critter-patch.mjs
node --test tests/*.test.mjs
node tests/critter-browser.mjs
```
The browser verifier uses test-only injected hooks, not production globals. It covers actual-release no-mod contact, first-mod unlock, short escape, healing, magnet reward conservation, nova exclusions, 1,000-instance rendering and touch input. It captures real-game screenshots, four escape checkpoints and a shader-only design sheet. Chromium software WebGL2 tests do not establish physical iPad/Android FPS or user visual approval. Independent reviewer availability is separate.

Rollback: restore release index entry to `./assets/main-critter-v1.js` (prior edible animals) or `./assets/main-CT954LmH.js` (original pickups); retained files support either. LocalStorage is never cleared.
