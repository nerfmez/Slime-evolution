# Handoff — current status (2026-09-26)

Rules live in `AGENTS.md`; repository layout in `README.md`. This file only tracks where work stands. Earlier handoffs are in Git history.

## Merged in PR #46 (2026-09-26, owner approved)

- **Painted skill effects.** Every skill effect is redrawn from its concept by `vfx/painted-renderer.mjs` (wired by `vfx/painted-style.mjs`). Design and owner rules: `docs/PAINTED-VFX.md`.
  - Fire was reviewed line by line against the owner's reference clips: Blast is a fire dome that dissolves and throws spinning smoke; Sunfall is a big sun falling for 1 s (fall time changed from .5 s at the owner's request) into a lingering fire dome; Meteor throws stones on impact; Flame Cyclone is an hourglass tornado drawn in the game camera's perspective with wind streaks and a burning foot. Burn (fire on the ground) was approved earlier.
  - Burnt ground uses the game's own burn map, now layered (scorch, burnt, charred); the effects draw no craters of their own.
  - Other elements (water, tide, toxin, frost, chain, orbit) are on the round-3 design and have not had a line-by-line review yet.
  - The old effects stay behind Settings > Test > "สีน้ำวาดมือแบบใหม่" until the owner asks to remove them.
- **Review shortcut:** `?lab=<skill>` opens the skill lab on that skill, repeating, monsters hidden. The owner checks effects on the iPad preview this way.
- **Reference skill:** `.claude/skills/shader-dev` (MIT, see its `SOURCE.md`).
- **Removed:** the filter prototype (`vfx/watercolor-style.mjs`, its tests and workflow).
- **Next:** review the remaining elements line by line, as with fire.

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
