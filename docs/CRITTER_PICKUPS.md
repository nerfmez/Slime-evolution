# Small animal pickups v4 — approved artwork, 2026-09-14

## Authoritative release
The playable source is `published/2026-09-14`, not the older root Vite baseline. `node scripts/apply-critter-patch.mjs` regenerates `assets/main-critter-v4.js` and `assets/critters-v4/` from the verified uploaded bundle plus readable `critters/` source. v1/v2/v3 and the original bundle remain available for rollback.

## EXP animals — exactly 3 bands × 3 animals
Visual bands follow the actual stored EXP amount. Rewards are never rounded, multiplied, split, or otherwise changed.

| Band | Stored EXP | Three approved animals | World size |
| --- | ---: | --- | ---: |
| LOW | 1–9 | small frog, leaf bug, small rabbit | .18 |
| MID | 10–19 | round bird, squirrel, little hedgehog | .22 |
| HIGH | 20+ | fawn, moss turtle, tiny panda | .26 |

Each drop deterministically keeps one of the three animals in its band from the existing cosmetic seed. When nearby EXP merges and crosses 10 or 20, only the appearance/size band changes; exact EXP and actor state remain intact.

The tiny panda has a special rolling presentation while moving: it uses the approved round panda art and rotates as a ball instead of walking. At rest it returns to the approved front/back panda art.

## Front/back movement art
All nine EXP animals use the approved front and back views from the supplied design sheet. Movement remembers the last Z direction and selects the matching front/back art; left/right motion mirrors the current view. This adds no extra actor or gameplay RNG.

## Item animals
Special pickups use the approved supplied artwork, not recolored EXP animals:
- Heal: pink flower axolotl, front/back.
- Magnet: blue magnet-horn creature, front/back.
- Nova: golden radiant spiky creature, front/back.

Their original colors, watercolor shading and outlines are preserved. Paper background, labels and unrelated sheet elements are removed. The sprite atlas itself contains no baked aura. Item readability comes from a runtime-only translucent circular ring in the WebGL renderer. The ring slowly expands and contracts, remains circular at all times, and does not tint the animal into a solid patch. EXP animals receive no item glow. Item world size is .30 so they read clearly without becoming large enemies.

## Preserved gameplay behavior
No passive EXP attraction before the Magnet mod. Physical contact still swallows. Each Magnet rank adds .42 range beyond contact. Animals make one short bounded escape on approach, then settle so the player can catch them. Global magnet pickup still gathers EXP without requiring the passive Magnet mod. Heal/Nova behavior, rewards, drop rates, skills, audio and localStorage keys are unchanged.

## Current enemy-density balance
Normal run is capped at 100 monsters. Spawn frequency doubles once per full minute until the boss transition: 00:00–00:59 = 1×, 01:00–01:59 = 2×, 02:00–02:59 = 4×, 03:00–03:59 = 8×, 04:00–04:59 = 16×. A spawn accumulator allows multiple spawn attempts in one frame at high multipliers while respecting the cap.

## Rendering
All EXP and item animals share one instanced WebGL draw and one compressed WebP atlas. The clean atlas is stored in `critters/atlas.webp`, with UV metadata in `critters/atlas.js`. Front/back selection, panda rolling and the circular item aura happen in the same renderer.

Verification commands:
```
node scripts/apply-critter-patch.mjs
node --test tests/*.test.mjs
node tests/critter-browser.mjs
```

Rollback: restore release index to `./assets/main-critter-v3.js` or earlier. Never clear browser saves.
