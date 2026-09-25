# Handoff — current status (2026-09-25)

Rules live in `AGENTS.md`; repository layout in `README.md`. This file only tracks where work stands. Earlier handoffs are in Git history.

## Latest work (branch `claude/check-organize-files-vqyx02`, not yet merged or deployed)

- README refreshed with current pacing, layout and docs index.
- `ui/hud-polish.mjs` added: Thai labels, compact Elite tags, phone HUD, empty skill slots, hint fade, stronger EXP bar.
- `AGENTS.md` consolidated into current rules only. This file replaced the duplicate handoff history.
- Local checks: `npm test` and `npm run build` pass. The new HUD browser test passes in Chromium. Roster, spark, turtle, pacing and vfx suites pass in Chromium.
- `frog-canon` and `water-browser` time out locally on both the base and the new build (no GPU in the container). WebKit is verified only in CI.

## Proposed next steps (owner to choose)

1. Open a PR so CI runs Chromium + WebKit, then deploy and check on the owner's iPad.
2. Lighting/contrast: stronger contact shadows or a light vignette so green monsters stand out from the grass, without changing approved art.
3. Player Slime art (face/outline). Needs new art approved by the owner.
4. Longer term: gradually replace minified-bundle patches with readable source modules, one system at a time.
