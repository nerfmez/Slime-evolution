# Slime Evolution agent instructions

## Current instructions — 2026-09-17, SOURCE FIRST

Read `docs/RELEASE.md` first, then `HANDOFF.md` and `docs/DREAM_LOOP.md` for historical gameplay context. Latest user instructions override all old notes.

The only current build input is **root Vite source on main** with Moss Frog and Water Calf. The old rule to deploy `published/2026-09-14` is superseded. `published/` is a read-only archive: never patch or deploy its JS as the current game, and never mix compiled releases with source. Do not restore the five-animal compatibility preview.

Production target stays Vercel project `slime-evolution`, ID `prj_dmWGye4WkusoSFye1PIIAxgt5KM3`, team `team_wUPNV5SYxHR0mz3URq89uGm0`, alias `slime-evolution-five.vercel.app`. Do not create replacement sites or HTML/CDN wrappers. `slime-water-calf-test.vercel.app` is a known stale wrapper, not a verified current release.

Build via `npm run build`, which audits and seals dist. Run the source-first release gate; retain its runtime proof and verified-dist artifacts. Publish the exact tested artifact through the deploy job. That job needs the user's VERCEL_TOKEN Actions secret and checks the staged upload before promoting, then checks the real production alias. Never claim live success until its manifest SHA, all file hashes and browser runtime match the requested commit. Missing authorization means NOT DEPLOYED, not success.

## Project rules
- Latest user corrections override older reference images and designs.
- Water Calf uses the provided walk/actions/hit art. No new drawing or placeholder. Enemy replacements reuse the central combat interface; remove only obsolete enemy-specific assets/renderers/AI.
- Keep fixes scoped. Preserve shared damage, projectiles, collision, EXP, skills, scene, grass and localStorage keys. Do not silently restore old gameplay from an archive.
- Baseline quality before tuner. Compilation and smoke tests are not visual approval or device FPS measurements.
- Current Sun Fall smoke: wide grounded base tapering into thin swept anime/manga crests; clockwise flow, then stretch/thin/peel/dissolve. No round puff/bead/fog-donut redesign.
- Approved pickup art remains three EXP bands with three animals each: LOW frog/leaf bug/rabbit; MID bird/squirrel/hedgehog; HIGH fawn/moss turtle/panda. Do not expand this to 27 animals. Item sprites have no baked glow; runtime glow is a translucent circular ring, never a square. These historical art rules do not authorize unrelated renderer ports during boot/deployment fixes.
- Never force-push, overwrite unrelated work, clear saves or change domains to hide a bug.
