# Slime Evolution — Cozy Action Roguelite

Ten-minute normal rounds with Moss Frog, Spark Hedgehog, Pond Turtle, Water Calf, the Bamboo Panda mini-boss and the Ancient Bloom boss. Read `AGENTS.md` (rules) and `HANDOFF.md` (current status) before editing.

```sh
npm test            # unit + provenance tests
npm run build       # verify hash locks and assemble dist/
npm run dev         # serve the built game locally
npm run audit:live  # check the live production release
```

Node 22+; no packages are downloaded. Always deploy `dist/` (never `game/` directly). The only production destination is https://slime-evolution-five.vercel.app. A GitHub merge or CI pass is not a deployment.

## Current pacing (normal mode)

Unlocks: Frog 0 s, Spark 120 s, Turtle 240 s, Water 360 s. Elite events: Frog 95/150 s, Spark 205/255 s, Turtle 395/445 s, Water 535/570 s, Panda at 300/480 s, boss eligible at 600 s. Source of truth: `pacing/encounter-director.js`; details in `docs/COZY-PACING.md`.

## Repository layout

Everything in `game/` and `species/`, plus the build modules, is hash-locked by `CANON.json`. Do not move or rename these files. Changing them requires updating the locks on purpose.

| Path | Purpose |
| --- | --- |
| `game/` | Locked engine and art input (reviewed Panda main). `game/review/` holds historical review captures. |
| `species/` | Hash-locked runtime patch: creature logic, Elite Frog attack/combat, sprite clarity filter, Elite atlases. `species/assemble.mjs` applies it. |
| `pacing/` | Ten-minute encounter director and its static-hook assembler. |
| `gameplay/` | Build-time patch for random opening skill cards. |
| `audio/` | Build-time patch for default volume. |
| `ui/` | Build-time HUD polish and start menu: "Slime Evolution" title, compact Elite tags, boss banner placement, phone HUD, empty skill slots, movement hint fade. |
| `vfx/` | Painted watercolour skill effects (`painted-renderer.mjs`, `painted-style.mjs`) plus the older Godot-style port, kept behind the Settings > Test switch. |
| `scripts/canon.mjs` | Build, serve and live-audit entry point. |
| `tests/` | `*.test.mjs` run through `npm test`. `*-browser*.mjs` and `cozy-regressions.mjs` are Chromium/WebKit suites. `*-provenance.mjs` are shared helpers. |
| `tools/` | One-time Python scripts that prepared approved art (Spark, Turtle, Water Calf, Panda). Kept for provenance. |
| `art/` | Original owner-approved source images/videos and extraction scripts for each creature. Not shipped directly. |
| `docs/` | Per-creature design notes plus parent manifests and integration proofs. |
| `baseline-manifest.json`, `roster-parent-manifest.json` | Baseline file manifests used by provenance tests. |
| `.github/workflows/` | CI: canon build/tests, browser regressions, production verification. |

## Docs index

| Topic | Doc |
| --- | --- |
| Pacing and director | `docs/COZY-PACING.md` |
| Species EXP and Elites | `docs/SPECIES-EXP-ELITES.md` |
| Bamboo Panda (art, combat) | `docs/BAMBOO-PANDA.md`, `docs/PANDA-COMBAT.md` |
| Pond Turtle | `docs/POND-TURTLE.md`, `docs/TURTLE-SIZE-8FRAME.md`, `docs/TURTLE-WALK-COLOR.md` |
| Spark Hedgehog | `docs/SPARK-HEDGEHOG.md` |
| Water Calf | `docs/WATER-CALF.md` |
| Water/Spark size | `docs/ENEMY-SIZE.md` |
| Skill VFX | `docs/PAINTED-VFX.md` (current), `docs/GODOT-VFX-PORT.md` (old look) |
| History (Frog canon recovery, roster cleanup) | `docs/RECOVERY-2026-09-17.md`, `docs/ROSTER-CLEANUP.md` |

Retired models (Thorn Alpha, Mossback, Petal, Crystal) and older releases stay in Git history and archive branches only. Do not re-import them.
