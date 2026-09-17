# Slime — Frog + Spark Hedgehog + Water Calf + Boss (2026-09-17)

Read CANON.json, HANDOFF.md, docs/SPARK-HEDGEHOG.md and docs/ROSTER-CLEANUP.md first. The owner removed OLD enemies, then approved adding Spark Hedgehog using the final Run/Attack/Hurt/Death art. Keep finished Moss Frog, Spark Hedgehog, new Water Calf and Ancient Bloom boss. This supersedes the historical four-enemy/four-elite instructions.

## Only active game
- `game/` only. Origin: completed Frog baseline `6e098d66`, then reviewed Water Calf candidate `06ebad851824a054a963b9eeb3b1e58ff5fe00d8` (PR #14). Never build/import the obsolete Vite root or abandoned elephant versions.
- Normal species: `thorn` = Moss Frog, `spark` = Spark Hedgehog, `water` = Water Calf. The only elite is the NEW Water Calf Alpha; it is the same Water species, not a retired monster. Boss is Ancient Bloom Colossus.
- Old Thorn model/Alpha, Mossback, Petal, Crystal models/AI/load routes, dedicated preview frames and unused old game bundles are removed. Keep them in Git history, not the active deployment.
- `game/assets/enemy-roster.js` defines independent IDs, stats, eligible elites, explicit unlock times and active model dependencies. Frog starts at 0; Spark starts at 60; Water starts at 180 seconds. Boss transition remains 300 seconds. Do NOT move unlock times by shrinking/reordering an array.
- Shared pathfinding, collision, HP/EXP, player skills, grass, scene, sound, card art, pickups and save keys are preserved. Do not change cap/spawn-frequency formulas to compensate for fewer species.
- Frog uses its approved sprite in every camera. Never restore old Thorn model fallback. Old saved model preference normalizes to sprite without clearing other saves.

## Integrity and tests
`npm test` checks source PNG hashes, state selection, registry/timings, all unchanged file bytes, three-level reverse patch (Spark -> current parent -> Water parent -> finished Frog) and numerical equivalence of all four boss attacks. Browser CI checks Frog, Spark impact/hurt/death/transparency, Water damage and actual boss/spawn/menu/skill behavior in Chromium and WebKit.
`npm run build` verifies CANON.json's current tree and copies game to dist, without mixing another release. Preserve baselineCommit/baselineTree when updating the reviewed candidate tree.
This is still a preserved playable bundle with scoped readable modules, NOT fully recovered unbundled authoring source. Historical patch scripts are provenance, not a command to rebuild current gameplay from an older release.

## Hosting and history
Only production destination: https://slime-evolution-five.vercel.app (project/team in CANON.json). No new hosts, test projects, CDN wrappers or remote base href. GitHub commit/merge is not deployment. Report actual live status separately and never send an old link as a newly tested candidate. Preserve history; no force push. The completed Frog remains recoverable at `6e098d66` and `fix/frog-canon-only`; old root/early elephant work is on `archive/before-frog-canon-cleanup-20260917`.
