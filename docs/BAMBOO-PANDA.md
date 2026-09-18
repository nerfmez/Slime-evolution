# Bamboo Panda — rare mini-boss, approved video frames (2026-09-18)

Parent is deployed main `196e49f03c73e44ea746bc0284187d92bbaac015`, game tree `0ee1f341376fb02cddd04c899517ba6d8a097649`. Keep `game/` as the only active game and keep the original Vercel project. Preserve the corrected Turtle colors, eight-frame Turtle walk and current Water/Spark/Turtle sizes.

## Art and background cleanup

Continue the previously registered real-video frame pack. Eight walk cells (0–7), eight rolling cells (8–15), original curled anticipation (16), approved hurt (17), approved flattened death + ghost (18), and a separate original dust layer (19). Do not use image generation to replace the video animation. Original videos, hurt/death upload, lossless still and design source are preserved in `art/panda/`; the pre-cleanup registered atlas is explicitly retained as the cleanup input.

`tools/clean-panda-atlas.py` removes detached background specks and exterior white fringes, softens only the contour edge, and decontaminates partial-alpha edge colors from the nearest retained interior. Cream fur and the original ghost are preserved, not white-keyed out. The original detached dust is feathered at its crop edges rather than displaying a rectangle. This is not a new pose, color wash, generation, or body repaint. Reviewed on pale and dark backgrounds before upload; game browser tests verify the decoded alpha and every opaque RGB pixel against the reviewed asset. All walk/roll frames use the same scale and ground pivot `[192,330]`.

The one lossless 1536x1920 WebP is 4x5 cells of 384px. It is uploaded once to a texture, not once per frame. Visible body: one quad. While rolling, up to eight short-lived dust quads, fading in 0.45s. No video/audio playback in the runtime and no model fallback.

## Gameplay

Panda is a mini-boss, not an ordinary random-spawn species and not an extra Water elite. `miniBossEnemies` is separate from `normalEnemies`. Initial tuning: 480 HP, speed .78, radius .62, contact damage 12, rolling damage 18, XP 45, one reroll reward. Body cell size 3.35; larger than the ordinary sprites. Damage from the player's existing skills is unchanged, and Panda does not inherit Turtle's shield. The existing instant-clear pickup excludes mini-bosses just as it excludes elites/final bosses.

In normal play, scheduled encounters are at 150s and 240s. At most one living Panda; a later slot is consumed if the first remains alive. No new Panda after the final-boss transition at 300s. Ordinary spawn count/frequency/cap formulas and unlock times are unchanged. The Panda selector in Settings is a one-Panda test mode, not a horde. Existing `all` continues to mean the four ordinary species; the browser test adds one Panda explicitly for mixed-roster visual review. The existing Skill Test laboratory additionally includes a stationary Panda training target in each preset; these laboratory targets are not normal-run spawns. Regression checks require exactly the four original training targets plus one Panda, not merely any recognized enemy ID.

Visible target within 6.6 units: stop and curl for .8s; lock aim; roll in that straight direction at 8 units/s for up to 1.2s, **9.6 units total**. This is 3.75x Spark's maximum 2.56-unit dash. Rolling does not stop at the player, and cannot steer after charging. Collision substeps are at most .055 units through the original `moveEnemy`; a blocking obstacle cuts the roll into recovery. One damage opportunity per roll, respecting the existing player invulnerability. Recovery .55s, cooldown 6.2s from activation. Normal hit/charge can be staggered; a rolling Panda still receives full damage but keeps the roll pose instead of flickering to a standing pose. Frozen movement is handled by the shared world logic. Death immediately selects the original death image, lasts 1.15s and fades during the last .3s; kill/XP/reroll processing happens once.

The existing large-enemy HP panel prioritizes the final boss and otherwise displays the Panda name and HP. No new pause, card, graphics or audio system.

## Preservation and verification

Three existing runtime files change: main bundle (19 explicit interface hooks), independent registry (2 additions), and test selector HTML (1 addition). Three Panda runtime files are added. All **1,257 other parent runtime files** are identical. `panda-integration-proof.json` reverses the exact changes to the last deployed parent, then the existing Turtle/Spark/Water audits continue all the way back to the completed Frog. Older integrity checks are normalized through this strict reversal, not skipped or loosened.

Run `npm test`, `npm run build`, and the existing browser scripts on Chromium and WebKit. `tests/turtle-browser.mjs` preserves the previous suite in `turtle-browser-core.mjs` and then runs `panda-browser.mjs`; production workflow definitions and permissions are unchanged. Panda browser proof covers real long-distance collision-driven rolling, .8s stationary charge, single hit, rare spawns, one-Panda test mode, original hurt/death, one reward, all eight walk and roll cells, both facings, all cameras and the mixed roster. Original-production audit checks commit/tree, every deployed file and live Panda/Spark/Turtle behavior. Do not equate CI or merge with deployment. No physical iPad/Android FPS claim.
