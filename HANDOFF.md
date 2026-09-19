# Current correction — full-body attack images, no detached tongue

The user explicitly rejected cutting out the tongue and attaching it to the old body. During anticipation, all eight attack frames and recovery, render ONE complete frog+mouth+tongue image from `elite-frog-attack.webp`. Never draw the old body underneath, rotate the tongue separately, or scale tongue length independently. `extract-full-attack.py` removes only the exterior white matte and registers the whole images by feet and body height. The cream belly remains opaque. Normal movement/hit/death art is unchanged.

`elite-frog-attack.js` owns the shared fixed-scale billboard layout and locked whole-image left/right facing. The authored image sequence supplies the horizontal sweep and retraction. Contact projects the solid tongue pixels through that same layout; no synthetic rotating-cone collision. The source proportions, at the preserved Elite body height, naturally reach about 7.8 units at full extension; attack engagement remains 4.5 units. This supersedes the old independently scaled 4.5-unit tongue and procedural 120-degree rotation. Keep .66s duration, .55s anticipation, once-per-attack contact damage, three-second poison and no warning area. Death cancels the whole attack pose. Legacy tongue-only extraction metadata remains solely as provenance for sample coordinates; its runtime renderer/atlas are removed.

Before merging: unit tests, canonical build, full Chromium/WebKit regressions, and image review of every attack frame plus left-facing pose. Do not infer correct artwork from a passing code test.

# Current request — eight approved sweep/retraction frames

The user approved the edited follow-through and requested eight frames integrated into the game. `art/elite-frog/approved-eight-frames.webp` contains the selected original pixels: five sweep/follow-through poses, two retraction poses, then closed mouth. `eight-frame-selection.json` records the original sheets/cells; rebuild the transparent 2×4 tongue atlas with `extract-eight-frame-tongue.py`. The historical video extractor below does not build the current atlas. All visible tongue/venom comes from these images. The last frame closes the body mouth and has no tongue/contact samples. Keep the .66s attack, 4.5-unit maximum reach, 120-degree sweep, once-only contact damage, three-second poison, Elite size and no ground warning. Normal Frog and other creatures stay unchanged.

# Current correction — original image pixels, not procedural tongue art

The user rejected the code-drawn tongue because its style does not match the Frog. All visible tongue and poison must now come from `species/enemies/elite-frog-tongue.webp`, ten frames extracted from the supplied H3 video. No procedural ribbon colors, outlines, highlights or mist. `art/elite-frog/extract-tongue.py` and `tongue-source.json` record extraction and source/atlas hashes. The image renderer uses the same canopy lighting as the body. Solid-tongue pixel samples (excluding mist) drive contact; the same frame, scale and orientation drive rendering. Preserve the broad sweep, poison, larger Elite, normal Frog and absence of ground warnings.

# Current refinement — curled tongue from supplied video

Use the supplied 5.2-second frog clip as the movement reference: narrow shaft, raised backward hook, rounded fleshy tip and close-fitting green/purple poison mist. The shared tongue path now has 48 segments and smooth extension/retraction; preserve 4.5-unit reach, 120-degree sweep, once-per-attack contact damage and three-second poison. Mist is cosmetic and must never become a ground sector or warning area. Body art, Elite size and normal Frog remain unchanged.

# Current correction — visible tongue sweep, no sector graphic

The user clarified that the TONGUE itself must visibly reach and sweep across the player. Do not draw a cone/sector on the ground, before OR after the strike. `elite-frog-combat.js` now shares its curved tongue centreline with the `elite-frog-tongue.js` WebGL ribbon renderer. The tongue extends, sweeps 120 degrees to 4.5 units, then retracts (.66 seconds total after .55-second anticipation). Apply damage and three-second poison only on actual swept tongue contact, once per attack. Use the supplied open-mouth body frame during the ribbon so there is no duplicate short tongue. Keep the larger Elite body and the normal Frog unchanged.

# Current Elite Frog correction — 2026-09-19

Elite Frog uses the supplied separate atlas from PR #27; normal Frog remains unchanged. Its cell world size is now 1.95 (previously 1.22), approximately 60% larger. `species/elite-frog-combat.js` owns the 4.5-unit, 120-degree sector and three-second poison. Aim locks during the .55-second animation anticipation; ordinary hits cannot cancel it. The user explicitly requested NO warning area: draw the sector only after impact, never during windup. Recovery lasts .22 seconds. The flipped sprite keeps the same body pivot. Preserve other creatures, art, stats and rewards.

# Current correction — EXP color/Water size + Elite Frog animation (2026-09-18)

Species v2 restores the original approved EXP atlas for Frog/Hedgehog/Turtle/Panda, enlarges/crops Water Calf EXP, and enables the same hop-cycle animation for Moss Frog Elite as the normal Frog. No new enemy animation frames are drawn. Read docs/SPECIES-EXP-ELITES.md.

# Current handoff — Species EXP + Elite combat (2026-09-18)

Read docs/SPECIES-EXP-ELITES.md. Current branch keeps all approved normal animation art and adds runtime-only Elite scale/color/UI/skills plus species-matched EXP drops. Frog/Spark/Turtle/Water have elites; Panda does not. Tiny Water Calf EXP elephant is the only new critter art. Elite schedule: Frog 105s, Spark 215s, Turtle 420s, Water 520s.

Important implementation rule: do not replace normal monster atlases with the concept-art Elite images. Elites use the existing normal frame atlases 100%; selective shader accents avoid the cost and inconsistency of redrawing every animation. Name/HP is overlay UI.

# Current handoff — Ten-minute Cozy pacing (2026-09-18)

Read docs/COZY-PACING.md and AGENTS.md. Requested scope is normal-play timing and balance; no future essence skills or two-socket Mod system yet.

Normal mode uses combat/rest windows, explicit 0/120/240/360-second species unlocks, Panda events 300/480, Water Alpha 420 and boss eligibility 600. Stop new pressure while any guardian remains alive; allow eight clear simulation seconds afterward. Ordinary caps are 6–28, with per-wave budgets, no queued catch-up bursts and no deletion of surviving enemies. First 15 seconds are quiet; final no-spawn window is 9:35–10:00. Boss victory requires killing it, so session length can exceed ten minutes.

Higher real collectible EXP per kill compensates for fewer monsters. Spawn-time HP/damage are tuned without changing speed, collision, attack timing, animation, skills or saves. Manual creature test modes preserve original stats. See the balance table and exact schedule in docs/COZY-PACING.md.

## Source
The game/ snapshot is exactly latest Panda main a800e54c2110d11554b0269e3b195d9f79af0247, input tree a9f9f5963f4037d8a6ffeaccd3bfd09b840d7689. A fail-closed, hash-locked static build inserts the separate readable pacing module into dist. Always run npm run build; do NOT publish game/ directly. No old release, remote wrapper, new hosting project or browser-time patch is used. Both source and full generated runtime are locked by CANON.json. Original baseline identity is retained separately.

## Regression requirements
npm test; npm run build; node scripts/canon.mjs serve; BROWSER=chromium or webkit node tests/cozy-regressions.mjs local. The runner only adapts old normal-play timing assertions and waits, while retaining attack/art/skill checks. New tests/pacing-browser.mjs checks actual rest periods, introductions, cap, special isolation, real XP collection, menu, boss and victory. Production uses SMOKE_URL=https://slime-evolution-five.vercel.app/ with the production runner and npm run audit:live. Check actual results before claiming live; no inference of real-device FPS.

## Preserve the latest creature work
Panda ordinary hits cannot cancel charge or extend cooldown; short reactive side dodge cannot starve offense. Real damage, freeze and death still apply. See docs/PANDA-COMBAT.md. Turtle size 2.42, eight original poses and corrected palette remain. Spark .60s charge / 8 units/s / 3-unit trigger and resized body remain. Water enlarged body and Alpha multiplier remain. All original approved art, grass, ambience, UI art, skills, input and saves are untouched. Historical full handoffs remain in Git; detailed docs are retained.

Only original production destination: https://slime-evolution-five.vercel.app .
