# Small animal pickups v3 — 2026-09-14

## Authoritative release and publishing
The newest playable upload is `published/2026-09-14`, NOT the older root Vite source. Run `node scripts/apply-critter-patch.mjs` to generate `assets/main-critter-v3.js`, `assets/critters-v3/` and `exp-animals.html` from the hash-verified original bundle and readable `critters/` source. The original, v1 and v2 artifacts remain unchanged for rollback. Serve this release at the site root of the existing Vercel `slime-evolution` project, alias `slime-evolution-five.vercel.app`, team `team_wUPNV5SYxHR0mz3URq89uGm0`. Never rebuild the old root source over it.

## EXP animal sets — latest user request
Each of the nine canonical reward sizes has THREE possible animals: 27 total designs, NOT three drops or triple EXP. `critters/catalog.js` is the data source for both game rendering and the public `/exp-animals.html` guide.

| Base EXP threshold | Three forms |
| --- | --- |
| 2 | Caterpillar, seed beetle, cricket |
| 5 | Leaf frog, grass lizard, chick |
| 6 | Field mouse, sparrow, leaf crab |
| 10 | Meadow rabbit, squirrel, hedgehog |
| 12 | Moss turtle, mole, chipmunk |
| 15 | Chinchilla, ferret, quail |
| 18 | Fennec, raccoon, red panda |
| 30 | Leaf fawn, boarlet, forest owlet |
| 56 | Forest dragon hatchling, griffin chick, kirin foal |

Canonical values come from the current uploaded release: normal 2/5/6/10, Alpha 12/15/18/30, boss 56. Nearby drops still merge. A merged/intermediate value chooses the highest threshold <= its value; 56+ stays in the last set. This is a VISUAL band only: exact stored EXP is never rounded/replaced, and the soul EXP modifier still multiplies it at collection. Lowest band covers values under 2 for compatibility. Render radii increase .200→.395; rewards, collision/contact radii, enemy sizes, drop rates and counts are unchanged. There is no glow on EXP, including the fantasy set.

One deterministic choice out of three is derived from the existing cosmetic seed, never combat/card RNG. When a merge crosses a threshold, the visual tier/size changes but the actor object, seed/form, home anchor, wander/flee state and swallow progress do not reset. IDs 6–32 are EXP; special item IDs 3/4/5 remain reserved. See `critters/xp-shapes.js` for the distinct silhouettes and part colors.

## Preserved v2 behavior
No passive attraction before the Magnet mod. Contact starts a .16-second swallow. Each Magnet rank adds .42 beyond contact, no hidden 3.4 base. Animals make one .42-second escape at .95 units/s then settle; .96 spawn leash, passability/segment checks and map bounds apply. The global magnet pickup still gathers EXP without requiring a passive mod. Ordinary attraction does not pull special items. Special items keep their own faint glow and exact designs: heart axolotl / horseshoe-shell snail / nova lantern moth. Audio, skills, reward values, heal/nova effects and localStorage keys are untouched. Pause/cards/growth suspend motion.

## Rendering / verification
All EXP and specials share one instanced draw, two triangles each, no new external textures/models. One branch selects the appropriate SDF silhouette. The guide uses this same renderer, scaled up for inspection while preserving relative size. It is linked under settings > tests.

```
node scripts/apply-critter-patch.mjs
node --test tests/*.test.mjs
node tests/critter-browser.mjs
```
56 Node tests currently pass locally. The browser verifier checks the real uploaded release, 27-species catalog and mobile layout, real merge promotion and conservation, no-mod behavior, first mod, heal/global magnet/nova, 1,000 mixed-tier instances, GL errors, missing assets and touch input. Actual CI run and screenshot review are separate evidence; no physical-device FPS or independent visual approval is implied.

Rollback: restore the release index script to `./assets/main-critter-v2.js`. Original, v1 and v2 files are retained; never clear browser saves.
