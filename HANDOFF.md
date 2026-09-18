# Current addition — Pond Turtle (2026-09-18)

Read docs/POND-TURTLE.md first. Independent `turtle` at 120s; twelve real video frames, original hurt and shell-only death, three-quarter guarded body + separate alpha aura. Self-only Shell Guard: .30s charge, 2.40s 70% reduction, .25s release, 6.5s cooldown. Only roster/menu and twelve reversible main hooks change; Water/Spark sizes and Spark charge/range remain exactly as deployed. Run all existing regressions plus tests/turtle-browser.mjs in Chromium and WebKit. Production audit must include both Spark and Turtle on the original site before reporting live.

## Previous size handoff

# Current tuning — Water larger, Spark smaller (2026-09-18)

On deployed main 51ee5b9, Water Calf body size is multiplied by 1.25 and Spark Hedgehog by .80. All poses use their existing common renderers and foot pivots; Water Alpha keeps its existing 1.55 multiplier. Muzzle/impact offsets follow the resized artwork. Body collision radii, HP, speed, damage, cooldown, spawn times and approved images remain unchanged. Spark still charges .60s, dashes at 8 units/s and activates within 3.0 units. Only two runtime modules change; 1,255 other game files are untouched. Read docs/ENEMY-SIZE.md.

## Previous charge tuning

# Current tuning — Spark charge and longer/faster dash (2026-09-18)

On top of deployed main 563ce996. Only the independent Spark module changes at runtime: trigger 3.0 units, stationary anticipation/charge .60s, dash 8.0 units/s, impact at .92s, total attack 1.29s. Normal movement, damage, cooldown, approved art and other systems stay unchanged. Aim/travel lock before charge and stop short of nearby players. Read docs/SPARK-HEDGEHOG.md; the existing Chromium/WebKit and live-production audit now include long-range motion traces.

## Previous integration handoff

# Current handoff — Spark Hedgehog approved-art integration

Read docs/SPARK-HEDGEHOG.md first. Added `spark` independently at 60 seconds using the final supplied Run/Attack/Hurt/Death poses. One alpha atlas, common body scale/foot pivot/facing, separate telegraphed melee attack state. No old enemies restored and no other creature replaced. Ten exact main-bundle hooks reverse back to main 7ed257a5 before the existing provenance checks. Run tests/spark-browser.mjs in both browsers in addition to the commands below. All hosting remains the same original Vercel project.

## Previous cleanup provenance (historical)

# Current handoff — three-species cleanup

User asked to remove OLD monsters and keep finished Frog, new Water Calf and Ancient Bloom boss, then add new independent species gradually. Implemented on the tested Water candidate from PR #14, not on old Vite/source files.

Read docs/ROSTER-CLEANUP.md. Only active game input is game/. New active registry: game/assets/enemy-roster.js. Keep Water Calf Alpha as the new Water variant; remove Thorn Alpha/Mossback/Petal old elites. Normal Frog retains internal ID thorn, which is NOT a request to restore old Thorn assets.

Current cleanup changes five pre-existing game files (main bundle, game index and three review files), adds one registry and removes 57 proven-retired files. Other 1,248 parent game files remain byte-identical, including all approved Frog/Water/boss art, cards, audio, player modules and skill assets. The two-level reverse audit recovers the exact finished-Frog main bundle. Boss attack constants and the normal 100-monster cap/frequency/boss transition are unchanged. Water still starts at 180 seconds, not at 60 seconds after deleting two list entries.

Commands: npm test; npm run build; node scripts/canon.mjs serve. Browser tests: tests/frog-canon.mjs, tests/water-browser.mjs, tests/roster-browser.mjs with BROWSER=chromium or webkit. Capture evidence in test-results. CI browser rendering is not iPad FPS evidence. CI success and GitHub merge do not imply deployment.

Historical identity: Frog cf841e0, recovered main 6e098d66, Water parent 06ebad85. Current reviewed tree is CANON.json.tree; baseline identity is preserved separately. Legacy Vite source is archived, never rebuilt into this game. Do not resurrect legacy files or patch scripts because their names look familiar.

Hosting remains the existing slime-evolution-five.vercel.app project only. Check actual hosting data before asserting a version is live. Do not ask the user to test the unrelated broken Water Calf Test site.
