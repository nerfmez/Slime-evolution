# Cozy Action Roguelite — ten-minute pacing, 2026-09-18

Scope: normal encounter rhythm and balance, ten minutes before the final boss. Do not implement monster-essence skills or Mod sockets yet. Keep current Frog, Spark Hedgehog, Pond Turtle, Water Calf, Panda and Ancient Bloom art/AI.

## Timeline
| Time | Encounter | Ordinary cap / spawn budget |
| --- | --- | --- |
| 0:00–0:15 | Quiet arrival | 0 |
| 0:15–0:45 | Moss Frog | 6 / 12 |
| 1:10–1:45 | Frog pack | 8 / 18 |
| 2:00–2:35 | Introduce Spark | 10 / 26 |
| 3:00–3:35 | Mixed skirmish | 12 / 30 |
| 4:00–4:35 | Introduce Turtle | 14 / 34 |
| 5:00–5:40 | First Panda | One guardian |
| 6:05–6:40 | Introduce Water Calf | 16 / 40 |
| 7:00–7:35 | Water Alpha | One guardian |
| 8:00–8:40 | Second Panda | One guardian |
| 9:00–9:35 | Final surge | 28 / 60 |
| 9:35–10:00 | Prepare for boss | 0 |
| 10:00 onward | Ancient Bloom | Once prior guardians clear |

All gaps are no-spawn rests. Seven normal encounters last 30–35 seconds; stop adding six seconds before their end. Authored quiet windows total 245 seconds, but living survivors are never deleted, so actual quiet depends on clearing them. Pausing, card selection and growth pause simulation rather than consuming rests.

Explicit normal unlocks are 0/120/240/360 seconds, not array positions. First three successful spawns of each introduction are the new species. Other choices use unlocked species. Specials wait for at most four ordinary survivors; never stack specials or normal waves on an unfinished guardian. Give eight clear simulation seconds after a special dies. Missed events expire, never backlog. Boss also observes these safeguards. Victory requires killing the boss, not merely reaching 10:00; a session can last longer.

Caps limit spawning, not delete survivors. Lower test caps including zero are respected. One spawn attempt per frame maximum, bounded terrain retries, no catch-up burst after quiet/capped periods. The normal HUD advances beyond the former 05:00 clamp, displays /10:00 and the current phase. Test/training clocks retain their prior behavior.

## Initial balance, not a device-playtest claim
Normal HP scales 0.9×–1.8× base; damage input 0.8×–1.0×, rounded. XP bases Frog 4 / Spark 6 / Turtle 8 / Water 10 rise up to 2× over the round. Existing collectible EXP and level curve are retained, not automatic levels. First Panda: 420 HP / input damage 10 / XP 90. Second: 640 / 12 / 140. Water Alpha: 420 / 14 / 100. Ancient Bloom: 6200 HP / input damage 22. Existing attack multipliers still apply. Speed, radius, guard reduction, attack timings, pathfinding, animation and Panda hit-resilient offense/side dodge are unchanged. No added passive healing. Manual training modes retain original stats.

## Exact source/build contract
Base main a800e54c2110d11554b0269e3b195d9f79af0247; game tree a9f9f5963f4037d8a6ffeaccd3bfd09b840d7689. All 1263 engine/art input files stay byte-identical. pacing/encounter-director.js is readable authoring source. pacing/assemble.mjs statically inserts nine unique reversible hooks plus menu wording. No older release, remote wrapper, browser patch, eval or old Vite root.

CANON.json.tree locks the input; pacing hashes lock source modules and generated bundle/HTML; runtimeTree locks all output files. Build verifies both source and output. Only index.html, main-critter-v4.js and the added director differ at runtime. All creature modules, atlases, UI art, audio, environment, player input, skill/Mod behavior and saves stay unchanged. Manifest/audit cover the actual generated runtime, not only the baseline.

## Verification
Retain 51 baseline/creature tests; ten added pacing tests cover timeline/unlocks/rests/caps/budgets/retries/events/reset/boss/stats and exact reversal. tests/cozy-regressions.mjs temporarily adapts only obsolete normal timing assertions/opening waits of preserved browser suites. Attack, damage, art, collision, alpha, death, menu, save and skill assertions remain.

The actual-game pacing suite checks rest periods, introductions, cap 28, survivor preservation, isolated guardians, true XP drop/collection, training, 10:00 UI, boss and victory. Field evidence must select the actual opening card, close that UI, step/refresh the real HUD and verify 00:45, 05:00 and 09:00 screenshots; a covered game canvas is not valid evidence. CI runs Chromium/WebKit; original-domain production repeats gameplay and full runtime file hashes. Local browser navigation is blocked, so remote evidence is required before merge. Never infer iPad/Android FPS from CI.

Only production: https://slime-evolution-five.vercel.app .
