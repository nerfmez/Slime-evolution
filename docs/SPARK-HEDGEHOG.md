# Spark Hedgehog — approved sprites, September 17, 2026

Parent: main `7ed257a58aae2f8900fb33d5e614a48ab0533338`; game tree `8e9c7d28889efa8ba635caeba0be40960a8eb573`.
This is a scoped addition to the same `game/` input, NOT a new game, old Vite rebuild, published-directory patch or replacement of Frog/Water/Boss.

## Art contract
- Use the owner's final six-frame Run and Attack sheets and approved Hurt/Death PNGs. Do not regenerate or change their poses. Original uploads are preserved byte-for-byte in `art/spark/`.
- The two corresponding high-resolution alpha PNGs were already present in the conversation. White compositing + resizing them to the supplied JPEGs gives mean absolute RGB differences 1.47 (run), 1.58 (attack), consistent with resize/JPEG encoding. Use these matching originals rather than erasing white fur from JPEGs.
- Clean isolated alpha noise, separate connected sprites/electric effects, keep texture and outlines, align body/feet. Mirror the left-facing hurt pose to the same native right-facing direction; keep the original input intact. Mild material-specific RGB corrections are bounded to 7.8/255; no whole-character wash and no new markings.
- One 1536 x 1536 lossless WebP atlas: 6 run + 6 attack + 1 hurt + 1 death. Four columns/rows of 384px. Common pivot `[192,330]`; 14 used cells, two empty. Transparent margins have no clipped lightning. Stars and spirit do not influence body scale.
- One shared draw/shading path for every Spark state, including the same canopy shade/fog. 9 MiB GPU texture, one quad/draw per visible Spark, no per-frame texture upload or 3D fallback.

## Behavior and continuity
Independent ID `spark`, not an old monster alias. HP 22, speed 1.42, radius .30, damage 6. Explicit unlock 60 seconds. Frog remains 0; Water remains 180; boss remains 300. Only Water retains its existing Alpha. Spawn frequency and cap formulas are unchanged.

Run phase advances with actual movement through shared navigation. Stopping uses the grounded base pose; recovery returns to the grounded run phase. No transparent cross-fade double bodies or invented intermediate limb poses.
Attack timings: crouch .14, charge .11, dash .14, impact hold .10, follow-through .11, recovery .16 seconds. Aim locks before the charge; collision-stepped dash uses existing `moveEnemy`; damage occurs once, only at .39 seconds and within the actual impact range. Existing player invulnerability is respected. Getting hurt interrupts charging. Death uses the approved pose for .76 seconds, fading over the final .20, and existing reward/kill processing still occurs once.
This change does not add or alter player skill cards/unlocks; the enemy's electric attack is the scope of this integration.

## Integrity and tests
`docs/spark-integration-proof.json` reverses ten exact bundle edits back to latest main. Existing roster-cleanup and Water reversals then recover the completed Frog bytes. 1,248 unrelated parent game files remain byte-identical; no scene, grass, sound, cards, player modules or old assets are changed.

Run `npm test`, `npm run build`; `tests/spark-browser.mjs` with `BROWSER=chromium` and `webkit`, in addition to all existing Frog/Water/roster regressions. It verifies alpha margins, all run/attack states, actual damage timing, hurt/death/rewards, mixed roster and cameras on the game itself. Browser software rendering is not physical iPad/Android performance evidence.

Only production destination stays `https://slime-evolution-five.vercel.app`. Confirm live deployment SHA independently of GitHub commits/tests.
