# Slime — Cozy Action Roguelite, ten-minute normal rounds (2026-09-18)

Read docs/COZY-PACING.md, CANON.json and HANDOFF.md first. The current request supersedes historical five-minute, 100-monster, kill-triggered Elite and Panda 150/240-second rules **for normal play only**. Do not add absorption skills, Mod sockets or new art in this phase.

## Authoring and build
- Latest engine/art input is game/ from reviewed Panda main a800e54c2110d11554b0269e3b195d9f79af0247. Never import an older release, obsolete Vite root, published directory or abandoned elephant build.
- pacing/encounter-director.js is the normal-play authoring source. pacing/assemble.mjs applies nine exact reversible static hooks and menu wording during build. This is not browser-time patching, eval, a remote wrapper or source recovery.
- CANON.json locks the complete input tree, both pacing modules, generated bundle/HTML and full output runtime tree. Always run npm run build and deploy dist, NOT game directly. Review the static hooks when changing the engine input; never silently accept a new hash.
- Every engine/art input file is preserved in this patch. All skills, Mod behavior, saves, environment, sound, input, approved sprites and creature AI stay unchanged. Manual training modes retain their old behavior.

## Current creatures
- Normal IDs: thorn = finished Moss Frog, spark = Spark Hedgehog, turtle = Pond Turtle, water = Water Calf. Normal-mode unlocks are 0/120/240/360 seconds.
- Only elite is Water Calf Alpha; normal event starts at 420 seconds. Panda is separate miniBossEnemies.panda, never part of the ordinary random pool; slots 300/480 seconds. Final Ancient Bloom boss is eligible at 600 seconds, not automatic victory.
- Preserve Panda sustained-hit resilience and defensive side roll: read docs/PANDA-COMBAT.md and docs/BAMBOO-PANDA.md. Preserve .8s charge, 9.6-unit offense, 2.4-unit defensive dodge, full damage/death/freeze, approved eight-frame art and cleaned alpha.
- Preserve Turtle size 2.42, approved eight poses, walk palette, guard and shell death. Read docs/POND-TURTLE.md and docs/TURTLE-SIZE-8FRAME.md.
- Preserve Spark size/charge/dash and Water size/Alpha art. Read docs/SPARK-HEDGEHOG.md and docs/ENEMY-SIZE.md.
- Retired Thorn models/Alpha, Mossback, Petal and Crystal remain in Git history only. Do not resurrect them. Frog always uses its approved sprite.

## Verification and hosting
npm test keeps all 51 previous baseline/creature checks and adds pacing tests. node tests/cozy-regressions.mjs local runs preserved browser suites with only obsolete timing assertions/opening waits adapted, then actual pacing tests. Production uses the same runner with production, plus full actual-runtime file-hash audit. Test Chromium and WebKit. CI is not physical iPad/Android FPS or a subjective balance test.

Only production destination: https://slime-evolution-five.vercel.app (project/team in CANON.json). No new hosts or test projects. GitHub commit/merge is not deployment. Verify actual live release, full manifest and gameplay before calling it live. No force pushes. Older handoffs are recoverable in Git history; detailed creature docs remain current.
