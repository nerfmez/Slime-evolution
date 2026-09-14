# Slime Evolution agent instructions

Read `HANDOFF.md` and `docs/DREAM_LOOP.md` before changing code. They are portable project instructions; no old absolute Work filesystem paths are required. The current-release section below overrides historical handoff entries.

## Current release — 2026-09-14, critter v2 / PR #2

The newest playable upload is `published/2026-09-14/`. The root Vite source is older: do not rebuild it over that uploaded release. Read `docs/CRITTER_PICKUPS.md` for behavior, tests and rollback. Its readable source is `critters/`; run `node scripts/apply-critter-patch.mjs` to regenerate `assets/main-critter-v2.js` and `assets/critters-v2/`. Original `main-CT954LmH.js` and v1 files stay untouched for rollback. Serve the contents of `published/2026-09-14` at the website root.

Latest user corrections: no passive attraction until the Magnet mod; +.42 range per rank beyond contact, without the old 3.4 base. One short, bounded escape when slime approaches. Item-specific silhouettes with faint local glow: heart axolotl / horseshoe-shell snail / nova lantern moth. EXP keeps frog/beetle/rabbit shapes without glow. The global magnet item still gathers EXP without requiring the passive mod.

Verification: Actions run 34824402349 passed 44 Node tests and actual-release Chromium WebGL2/touch checks. Gameplay screenshots, four escape checkpoints and shader design sheet were inspected. This does not establish physical iPad/Android FPS, independent Dream Loop review or owner visual approval.

Existing production target: Vercel project `slime-evolution`, project ID `prj_dmWGye4WkusoSFye1PIIAxgt5KM3`, team `team_wUPNV5SYxHR0mz3URq89uGm0`, alias `slime-evolution-five.vercel.app`. It serves a pinned GitHub release snapshot, not an automatic rebuild of the older root source. When publishing, use the existing project and verify READY, the production alias, `/slime-publish.json` and the v2 module paths. The old Sites project is not the selected host.

## Project rules

- Latest user corrections override older reference images and older designs.
- Current Sun Fall smoke: wide grounded base tapering upward into thin swept anime/manga crests. Clockwise flow, then stretch, thin, peel, dissolve. No round puff/bead/fog-donut concept.
- Baseline quality before tuner. Preserve existing tuners, localStorage keys and user saves. Never claim a browser save is in Git.
- Always inspect actual saved effect frames through `/review/index.html` where browser tools are available. Check consecutive frames and combined/solo layers from gameplay camera. Browser/WebGL availability is separate from offscreen GLES and device FPS.
- Use independent Dream Loop review when available. Scores/tests are not user approval. State missing verification honestly.
- Keep fixes scoped. Preserve grass burning, other skills, monsters and original player animation unless requested.
- Use standard npm/Vite commands outside Work for the editable root baseline, subject to the newer uploaded-release warning above. No dependency on `sites-preview` or private Sites scripts is required for local development.
- GitHub migration does not configure deployment. Do not silently redeploy the old Sites project. Deploy to the hosting selected by the user.
- Do not force-push or overwrite unrelated GitHub work. Preserve existing repository content when importing.
