# Slime Evolution agent instructions

Read `HANDOFF.md` and `docs/DREAM_LOOP.md` before changing code. They are portable project instructions; no old absolute Work filesystem paths are required.

## Current release — 2026-09-14

The newest playable upload is `published/2026-09-14/`. The root Vite source is older: do not rebuild it over that uploaded release. Read `docs/CRITTER_PICKUPS.md` for the current edible-animal pickup feature, tests and rollback. Its readable source is `critters/`; run `node scripts/apply-critter-patch.mjs` to regenerate the release copies and derivative bundle. The original `main-CT954LmH.js` stays untouched as the verified baseline. Serving the game requires the contents of `published/2026-09-14` at the website root.

PR #1 adds small animals in place of EXP and heal/magnet/nova drops. Latest verification: Actions run 34821459964 passed 36 Node tests and actual-release Chromium WebGL2/touch checks; gameplay screenshots were inspected and the toon interior/outline mask corrected. This does not establish physical iPad/Android FPS or owner visual approval. No hosting deployment was performed.

## Project rules

- Latest user corrections override older reference images and older designs.
- Current Sun Fall smoke: wide grounded base tapering upward into thin swept anime/manga crests. Clockwise flow, then stretch, thin, peel, dissolve. No round puff/bead/fog-donut concept.
- Baseline quality before tuner. Preserve existing tuners, localStorage keys and user saves. Never claim a browser save is in Git.
- Always inspect actual saved effect frames through `/review/index.html` where browser tools are available. Check consecutive frames and combined/solo layers from gameplay camera. Browser/WebGL availability is separate from offscreen GLES and device FPS.
- Use independent Dream Loop review when available. Scores/tests are not user approval. State missing verification honestly.
- Keep fixes scoped. Preserve grass burning, other skills, monsters and original player animation unless requested.
- Use standard npm/Vite commands outside Work for the editable root baseline, subject to the newer uploaded-release warning above. No dependency on `sites-preview` or private Sites scripts is required for local development.
- GitHub migration does not configure deployment. Do not silently redeploy the old Sites project. Deploy to the hosting explicitly selected by the user.
- Do not force-push or overwrite unrelated GitHub work. Preserve existing repository content when importing.
