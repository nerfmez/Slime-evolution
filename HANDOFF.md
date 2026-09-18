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
