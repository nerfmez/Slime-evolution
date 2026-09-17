# Current Water Calf candidate

Read docs/WATER-CALF.md. Two existing game files edited, four Crystal files removed, three runtime Water files added. Other 1,305 Frog game files are exact. Original PNGs: art/elephant. Production promotion is separate.

## Recovery history

# Recovery handoff — 2026-09-17

## One authority
The owner has selected the fully finished Moss Frog replacement of ordinary Thorn as the canonical game. CANON.json pins both the historical commit and exact subtree. `game/` is that whole subtree unchanged; `dist/` is generated only by copying it after integrity verification. No elephant logic or recently rebuilt root prototype is in the active game.

## Why the repeated failures happened
The prior work confused the root Vite prototype with the completed frog release. That prototype lacked scene/card assets and had older systems. A separate Vercel test HTML used an external base URL pinned to commit 9f816c and resolved asset paths outside public/. Fixes on GitHub main did not update that hard-coded external URL or the original Vercel project. Tests of a different build could not validate the link sent to the owner.

## What was preserved
`archive/before-frog-canon-cleanup-20260917` preserves main at 543bd352, including the old authoring files, intermediate Water Calf atlas/code and the complete historical release. `fix/release-integrity` and other experiment branches were not merged or deleted. The clean main is an ordinary descendant commit, so no history was destroyed.

This restoration is not source reconstruction. The authoring source corresponding exactly to all compiled frog-release features has not been recovered. Never "repair" that by building the older root code again. Future source restructuring must prove parity with the locked game first.

## Commands
`npm test` checks byte-tree verification.
`npm run build` validates all game bytes against CANON.json and writes dist/ plus release.json and asset-manifest.json. No npm dependency installation is needed to build.
`npm run dev` serves the already-built dist on 127.0.0.1:4173, with real 404 responses, never an HTML fallback for missing images.
`npm run audit:live` compares every expected file on the ORIGINAL production URL against the exact canonical SHA-256 values and writes test-results/live-audit.json. It does not publish anything.

CI separately tests real frog runtime in Chromium and WebKit: actual image decoding, card selection, spawning, advancing frames and frog pose/facing/hop hooks. Screenshots are captured only after stopping animation scheduling in the TEST page, to avoid software-GPU capture starvation. Software-rendered screenshots are not iPad FPS measurements. An intentional canonical cancellation of player-slime-directions.webp?v=3 is logged separately, not mistaken for a missing file.

## Production
Existing project: slime-evolution; alias: slime-evolution-five.vercel.app. IDs are in CANON.json. Do not create another project. This checkout/configuration does NOT itself connect the Vercel project to GitHub. Check actual hosting state. A successful CI validation is not deployment. If the live audit passes already, report that exact fact rather than falsely claiming a new deploy. If it fails, report mismatches and do not send the stale site as a new validated release.

## Next gameplay work
First let the owner verify this finished-frog baseline. Then apply only the requested new animal replacement while preserving the rest. Do not continue the abandoned prototype-based elephant implementation.
