# Current correction — original image pixels, not procedural tongue art

The user rejected the code-drawn tongue because its style does not match the Frog. All visible tongue and poison must now come from `species/enemies/elite-frog-tongue.webp`, ten frames extracted from the supplied H3 video. No procedural ribbon colors, outlines, highlights or mist. `art/elite-frog/extract-tongue.py` and `tongue-source.json` record extraction and source/atlas hashes. The image renderer uses the same canopy lighting as the body. Solid-tongue pixel samples (excluding mist) drive contact; the same frame, scale and orientation drive rendering. Preserve the broad sweep, poison, larger Elite, normal Frog and absence of ground warnings.

# Current refinement — curled tongue from supplied video

Use the supplied 5.2-second frog clip as the movement reference: narrow shaft, raised backward hook, rounded fleshy tip and close-fitting green/purple poison mist. The shared tongue path now has 48 segments and smooth extension/retraction; preserve 4.5-unit reach, 120-degree sweep, once-per-attack contact damage and three-second poison. Mist is cosmetic and must never become a ground sector or warning area. Body art, Elite size and normal Frog remain unchanged.

# Current correction — visible tongue sweep, no sector graphic

The user clarified that the TONGUE itself must visibly reach and sweep across the player. Do not draw a cone/sector on the ground, before OR after the strike. `elite-frog-combat.js` now shares its curved tongue centreline with the `elite-frog-tongue.js` WebGL ribbon renderer. The tongue extends, sweeps 120 degrees to 4.5 units, then retracts (.66 seconds total after .55-second anticipation). Apply damage and three-second poison only on actual swept tongue contact, once per attack. Use the supplied open-mouth body frame during the ribbon so there is no duplicate short tongue. Keep the larger Elite body and the normal Frog unchanged.

# Current Elite Frog correction — 2026-09-19

Elite Frog uses the supplied separate atlas from PR #27; normal Frog remains unchanged. Its cell world size is now 1.95 (previously 1.22), approximately 60% larger. `species/elite-frog-combat.js` owns the 4.5-unit, 120-degree sector and three-second poison. Aim locks during the .55-second animation anticipation; ordinary hits cannot cancel it. The user explicitly requested NO warning area: draw the sector only after impact, never during windup. Recovery lasts .22 seconds. The flipped sprite keeps the same body pivot. Preserve other creatures, art, stats and rewards.

# Current addition — species EXP + full ordinary Elite set (2026-09-18)

Read docs/SPECIES-EXP-ELITES.md first. Every current creature now drops its matching EXP animal; Water Calf adds a tiny-elephant front/back pair in empty atlas cells. Elites now exist for Frog, Spark, Turtle and Water only; Panda stays mini-boss-only. Elite sprites reuse the exact normal animation frames, are enlarged at runtime, get selective color accents (never whole-body tint), and display name + HP above the head. Elite Frog uses poison tongue cone, Spark adds a radial lightning burst after its preserved dash, Turtle reflects moving player projectiles only while Shell Guard is active, Water keeps its existing elite attack.

The 10-minute Cozy director authors elite events at 105/215/420/520 seconds while preserving Panda at 300/480 and boss eligibility at 600. game/ remains byte-identical to the reviewed Panda input tree; species/ is a separate hash-locked runtime patch copied into dist by scripts/canon.mjs. Run npm test, npm run build, then full Chromium/WebKit cozy regressions before merge/deploy.

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
