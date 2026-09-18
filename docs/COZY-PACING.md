# Cozy Action Roguelite — ten-minute pacing, 2026-09-18

Requested scope: change the current Slime game's normal encounter rhythm and balance, extend the main round from five to ten minutes, and do **not** implement the future monster-essence skill system or Mod sockets yet.

## Player-facing behavior

Normal play opens with 15 quiet seconds. Seven bounded ordinary encounters last 30–35 seconds, followed by 15–25-second no-spawn windows. Each ordinary encounter stops adding monsters six seconds before its end so the player can finish the stragglers. The authored quiet windows total 245 seconds; actual quiet depends on clearing surviving enemies. No enemy is deleted just because a wave ends.

| Time | Encounter |
| --- | --- |
| 0:00–0:15 | Quiet arrival |
| 0:15–0:45 | Moss Frog, cap 6, budget 12 |
| 1:10–1:45 | Moss Frog pack, cap 8, budget 18 |
| 2:00–2:35 | Introduce Spark Hedgehog, cap 10, budget 26 |
| 3:00–3:35 | Mixed skirmish, cap 12, budget 30 |
| 4:00–4:35 | Introduce Pond Turtle, cap 14, budget 34 |
| 5:00–5:40 | First Bamboo Panda event |
| 6:05–6:40 | Introduce Water Calf, cap 16, budget 40 |
| 7:00–7:35 | Water Calf Alpha event |
| 8:00–8:40 | Second Bamboo Panda event |
| 9:00–9:35 | Final surge, cap 28, budget 60 |
| 9:35–10:00 | Pre-boss no-spawn window |
| 10:00 onward | Ancient Bloom, once prior guardians are cleared |

All gaps in this table are authored no-spawn rest windows. Species unlock explicitly at 0/120/240/360 seconds, independently of array order. A focused introduction spawns the new species for its first three successful spawns. Other choices use the current unlocked roster. Special events wait until at most four ordinary survivors remain, expire without backlogging, and never stack with another special. No normal waves join an unfinished special. After a special dies, give eight clear simulation seconds before any further spawns. Boss transition also waits for this safety rule and at most four survivors. Victory still requires defeating the boss, so total session length can exceed ten minutes. Pause, card selection and growth already pause simulation; wall-clock waiting does not skip a rest.

A cap is a spawn limit, not a deletion instruction. A lower test cap is respected, including zero. No more than one spawn attempt per frame, with bounded retry intervals; failed terrain placements, a long rest or a capped wave never bank a catch-up burst.

## Initial balance pass (not a physical-device playtest claim)

Normal HP scales from 0.9× to 1.8× base over the round. Contact/skill damage scales from 0.8× to 1.0× base, rounded; speed, radius, guard reduction, attack timing, pathfinding and animations are unchanged. Base XP is Frog 4 / Spark 6 / Turtle 8 / Water 10, rising up to 2× across the round, so fewer monsters do not remove build progression. XP uses the existing real collectible actor and existing level curve, not automatic level grants.

First Panda: 420 HP, damage input 10, 90 XP. Second Panda: 640 HP, input 12, 140 XP. Existing attack multipliers still apply. Water Alpha: 420 HP, input 14, 100 XP. Ancient Bloom: 6200 HP, input 22. All original attacks and special damage multipliers remain, including Panda's sustained-hit resilience and side dodge. No passive healing or new skill mechanics were added. Manual training modes retain original creature stats and test behavior.

## Source/build contract

Base is main a800e54c2110d11554b0269e3b195d9f79af0247, game tree a9f9f5963f4037d8a6ffeaccd3bfd09b840d7689. Every one of the 1263 engine/art input files remains byte-identical. Current normal-play source is pacing/encounter-director.js, with a small fail-closed static adapter in pacing/assemble.mjs. Build copies only that current game, statically inserts eight exact hooks and menu wording, and emits the module as assets/encounter-director.js. It does not fetch another release, wrap a remote page, patch code in the browser, use eval, or resurrect an old Vite root.

CANON.json.tree locks the preserved input; pacing hashes lock both source modules and generated bundle/HTML; runtimeTree locks **all** generated game files. Both input and output are validated. Only index.html, main-critter-v4.js and the added director differ at runtime; all creature modules, atlases, UI art, audio, environment, player input, skills, Mod behavior and saves are unchanged. The generated artifact manifest and production audit cover the actual assembled runtime, not just its baseline.

## Verification

Keep the original 51 baseline/creature integrity tests. Added unit tests cover timeline coverage, unlocks, no-spawn periods, caps/budgets, failed spawn attempts, no catch-up queues, event overlap, event expiration, reset isolation, boss timing, balances and exact assembly reversal.

tests/cozy-regressions.mjs makes temporary copies of the prior browser suites and adjusts only obsolete normal-play time assertions and the new opening wait. Every attack, damage, art, collision, transparency, death, menu, save and skill assertion remains. It then runs tests/pacing-browser.mjs against the actual generated game, checking quiet windows, introductions, a 28-monster cap, survivor preservation, special isolation, actual XP drop/collection, training compatibility, 10:00 UI, boss transition and victory. CI runs Chromium and WebKit; production audit repeats gameplay and full file hashes on the original domain. The local environment blocks browser navigation, so remote browser evidence is required before merge. No inference of iPad/Android FPS from CI is allowed.

Only production destination: https://slime-evolution-five.vercel.app .
