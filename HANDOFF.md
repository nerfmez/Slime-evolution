# Handoff — current status (2026-09-25)

Rules live in `AGENTS.md`; repository layout in `README.md`. This file only tracks where work stands. Earlier handoffs are in Git history.

## In progress (branch `claude/check-organize-files-vqyx02`)

- Skill style prototype (cel-shade + watercolour, no black outlines, fire rebuilt): `vfx/watercolor-style.mjs`. The owner reviews it on the iPad preview using Settings > Test (old/new switch and sliders). Next: fire evolutions (Sunfall, Meteor, Cyclone), per-element palettes, readability of faint skills, then remove the old-style switch once approved.

## Merged in PR #45 (2026-09-25)

- Elite Frog atlases rebuilt at 4x from the owner's originals, with the same body size in every frame. Verified live.

## Merged in PR #44 (2026-09-25)

- README refreshed with current pacing, layout and docs index.
- `ui/hud-polish.mjs` added: "Slime Evolution" title, compact Elite tags (English names), boss banner in the top row on wide screens, phone HUD, empty skill slots, hint fade, stronger EXP bar.
- Fixed a restart bug: pressing restart during the opening card choice left stale, unclickable cards (`gameplay/opening-random.mjs`). This was why `frog-canon` and `water-browser` failed on `main`.
- `AGENTS.md` consolidated into current rules only. This file replaced the duplicate handoff history.
- PR #44 is open. Vercel builds a preview per push, and the owner checks it on an iPad before merging.
- Local checks: `npm test`, `npm run build`, the HUD browser test, and `frog-canon`/`water-browser` (after the restart fix) pass in Chromium. WebKit is verified in CI.

## Proposed next steps (owner to choose)

1. Merge PR #44, then verify the live release on the iPad.
   - Start menu: done in PR #44 (Start / How to play / Settings).
2. Lighting/contrast: stronger contact shadows or a light vignette so green monsters stand out from the grass, without changing approved art.
3. Player Slime art (face/outline). Needs new art approved by the owner.
4. Longer term: gradually replace minified-bundle patches with readable source modules, one system at a time.
