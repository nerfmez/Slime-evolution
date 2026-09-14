# Slime Evolution agent instructions

Read `HANDOFF.md` and `docs/DREAM_LOOP.md` before changing code. They are portable project instructions; no old absolute Work filesystem paths are required. The current-release section below overrides historical handoff entries.

## Current release — 2026-09-14, critter v3 / PR #3

The newest playable upload is `published/2026-09-14/`. The root Vite source is older: do not rebuild it over that uploaded release. Read `docs/CRITTER_PICKUPS.md` for behavior, tests and rollback. Readable source is in `critters/`; run `node scripts/apply-critter-patch.mjs` to regenerate `assets/main-critter-v3.js`, `assets/critters-v3/` and `exp-animals.html`. Original `main-CT954LmH.js`, v1 and v2 files stay untouched for rollback. Serve the contents of `published/2026-09-14` at the website root.

Latest user request: EXP animal sets corresponding to reward size, THREE possible designs per set, not three drops or triple rewards. Nine canonical thresholds 2/5/6/10/12/15/18/30/56 produce 27 forms. `critters/catalog.js` defines shared data and merge-safe appearance; `critters/xp-shapes.js` defines silhouettes. Higher bands are visually larger (.200 to .395). Merged values choose the highest threshold <= their exact stored reward; never round the reward or reset actor identity, seed/form, home, flee or swallow state. Special item IDs 3/4/5 are distinct from EXP IDs 6–32. EXP has no glow, including fantasy forms. `/exp-animals.html` shows all 27 through the actual game renderer, with mobile layout and animation pause, linked under settings > tests.

Preserve v2 user corrections: no passive attraction until the Magnet mod; +.42 range per rank beyond contact, without the old 3.4 base. One short, bounded escape when slime approaches. Item-specific silhouettes with faint local glow: heart axolotl / horseshoe-shell snail / nova lantern moth. The global magnet item still gathers EXP without requiring the passive mod. Skills, audio, reward values, drop rates and localStorage keys are unchanged.

Verification: Actions run 34827860233 passed 56 Node tests and actual-release Chromium WebGL2/touch checks. Real merge 2→56 reached tier 8 preserving actor/form/home; 1,000 mixed-tier animals in one draw/2,000 triangles, GL error 0, no missing assets or page errors. Actual gameplay, desktop/mobile 27-animal guide and escape captures were inspected; the guide's initial projection stretch was corrected and tests/screenshots rerun. This does not establish physical iPad/Android FPS, independent Dream Loop review or owner visual approval.

Existing production target: Vercel project `slime-evolution`, project ID `prj_dmWGye4WkusoSFye1PIIAxgt5KM3`, team `team_wUPNV5SYxHR0mz3URq89uGm0`, alias `slime-evolution-five.vercel.app`. It serves a pinned GitHub release snapshot, not an automatic rebuild of the older root source. When publishing, use the existing project and verify READY, the production alias, `/slime-publish.json`, v3 module paths and `/exp-animals.html`. The old Sites project is not the selected host.

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
