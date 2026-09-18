# Panda sustained-hit fix and defensive side roll — 2026-09-18

Parent main: `8ddf49237455a742c14ec8deb73815588dcb8e2c`, game tree `3c3ad9127200bf76baca1eda4dd2bea674ee150b`. This supersedes the original interruptible-charge description in BAMBOO-PANDA.md.

## Bug fix
Ordinary incoming hits used to delete `pandaAge` during charge and repeatedly clamp its cooldown to at least 1.2s. Sustained attacks therefore prevented the Panda from starting or finishing its skill. Ordinary damage no longer cancels charge, resets cooldown, or blocks pursuit. The existing .8s warning, 9.6-unit roll, locked aim, collision checks, single roll hit, .55s recovery and 6.2s cooldown remain unchanged. The ordinary hurt pose still appears when no action is committed. No damage reduction or invulnerability is added. Actual freezing still pauses movement through the unchanged world logic; lethal damage still kills immediately.

## Defensive roll
After fresh HP loss while not already in an action, Panda may briefly curl for .10s, roll **sideways up to 2.4 units over .32s**, then recover .18s. Cooldown is **4.5s**. It reacts only to a visible player within 8 units. This is a reactive escape from repeated attacks, not prediction of every incoming projectile. A ready long offensive skill always has priority. The dodge never cancels an attack or resets its cooldown, so defensive behavior cannot starve the main skill.

It probes both perpendicular directions using the existing collision-only `moveEnemy` on disposable non-boss copies, chooses the clearer side, and refuses a dodge with less than .65 units of clearance. The real movement is collision-stepped at <=.055 units and stops if the path becomes blocked. A dodge itself deals no damage and grants no immunity. Existing eight rolling frames and curled pose are reused with the same size, transparency, colors, and foot pivot. No image or sound assets change.

## Scope and verification
Only `game/assets/bamboo-panda.js` changes at runtime. `panda-combat-proof.json` reverses the authorized source edits; the complete reconstructed game tree must equal the deployed parent, proving all 1,262 other runtime files unchanged. Original source-art, palette, other enemies, spawn/reward/boss and prior regression checks remain.

Added tests cover sustained damage before/during charge and rolling, repeated attacks under a barrage, defensive timing/distance/cooldown, no dodge damage/immunity, collision choice/blocking, locked direction, stale-hit suppression, all eight reused frames and death priority. The original Panda browser suite is retained byte-identically as panda-browser-core.mjs; the same entry then runs the new real-game continuous-hit/dodge/freeze/lethal-hit tests in both CI browsers and on original production. Local browser navigation was blocked by the environment's administrator policy; remote CI/browser evidence, not local screenshots, is required before merge.

Only production: `https://slime-evolution-five.vercel.app`. Verify deployed commit, file hashes and live combat reports; no physical-device FPS claim.
