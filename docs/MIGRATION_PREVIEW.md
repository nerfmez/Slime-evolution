# Migration preview — isolated from the original game

Public test URL: https://slime-evolution-preview.vercel.app/

This is a temporary missing-assets preview, not a completed migration and not a visual redesign. The original Sites website and `main` branch were not changed by this preview task. On entry, choose one of the original starter cards before trying to move. Touch-drag movement is retained.

## Source and deployment

- Original source revision pinned by the launcher: `e4fb0498c75902c09abee058c674401e8ccdaf5e` (Sites v101 source import).
- Working branch: `preview/migration-playable`.
- Launcher: `migration-preview.html`.
- Current deployed launcher snapshot: `7fa3936b5147373b17f44c0886d8f2a17cef74ca`.
- Vercel project: `slime-evolution-preview` / `prj_0WRMPBL7GXeMG0n5REPERmlpW2dI`.
- Current deployment: `dpl_B419Wx8Y6Jtm7fu3xGpKgiHujpRu`.
- Vercel state was verified READY and the public alias returned HTTP 200 with the current launcher revision.
- Vercel serves a small HTML entry that fetches the pinned launcher. The launcher loads the pinned original game modules from GitHub Raw, with jsDelivr as a fallback, then resolves relative imports into browser Blob module URLs. It does not silently follow future changes to `main`.
- This Vercel project is not configured for GitHub automatic deployments. A GitHub commit alone does not redeploy it.
- To update this temporary deployment, first commit the launcher, then replace the pinned launcher SHA in the Vercel entry's two fetch URLs. Deploy the entry to the same isolated project; never deploy this launcher over the original Sites game.

## What is preserved

The original game modules, terrain layout, water collision outlines, shader code, vegetation generation, slime geometry, movement and game logic are used. Source modules in the repository are not overwritten; substitutions below are made only in memory inside this explicitly labelled preview launcher.

## Temporary substitutions

1. `gl.js` texture loader returns programmatically drawn substitute textures rather than aborting startup on missing image files. Pond substitutes use the original water outlines. Trees and grass use simple temporary silhouettes. These are not recovered or approved artwork.
2. The enemy asset loader supplies simple procedural stand-ins for the missing enemy binaries and textures. Enemy visuals and animation are therefore not representative of the real game.
3. Missing Thorn sprite loading is skipped so the stand-in model path can render.
4. Missing VFX textures are transparent. Combat logic remains, but many visual effects are absent; do not judge skill visuals using this preview.
5. Review-frame and slime-motion links show the preview limitation notice instead of navigating to unavailable pages.
6. The missing `assets/cards/inferno.png` is replaced in the preview with a neutral inline SVG placeholder. The original starter-card choice behaviour is retained.

The launcher shows a permanent temporary-assets label and a detail dialog. It displays a meaningful error if source loading or game startup fails. It only removes the loading overlay after the original game's frame counter advances.

## Actual verification — 2026-09-11 20:48 UTC

Evidence: `preview-validation/latest.json`, GitHub Actions run `34646048055` / job `103417154860`.

Passed in headless Chromium with software WebGL:
- Public URL HTTP 200; game loads 35 original modules and reaches ready state.
- Original starter card can be chosen.
- Original game frame counter advances.
- Simulated touch dragging changes the original player position.
- Settings open.
- Temporary-assets disclosure dialog opens.
- Canvas switches to portrait dimensions.
- No recorded JavaScript page errors, console errors or failed network requests in this run.

Not passed / not verified:
- The short keyboard movement check returned false. Do not claim keyboard movement passed. Only two frames advanced in that part of the software-rendered test; that observation alone does not establish the root cause.
- Both attempted screenshot captures timed out. No screenshot files were produced; the Actions artifact contains the JSON report, not visual proof.
- Overall workflow conclusion and report `success` remain FAILURE/FALSE because not every check passed. Do not relabel the workflow as passing merely because tablet-oriented checks passed.
- No physical-device iPad/Android test or device FPS measurement, no independent visual review, no claim of original-art recovery.

The original build dependencies are not installed in the chat container. The launcher JavaScript was syntax-checked locally, separately from the deployed browser check.

## Repeat verification

`.github/workflows/migration-preview-check.yml` runs on launcher/workflow changes on this preview branch. It installs isolated Playwright tooling, tests the public URL, commits JSON evidence without force-push, and uploads whatever evidence files were actually produced. Check report timestamps, revision, `success` and screenshot list; a workflow file alone is not a passing test. Improve timing-sensitive keyboard verification and screenshot capture before calling those checks complete.

## Continue safely

Keep asset-recovery work separate from this branch. Add recovered image and binary files without overwriting newer game source with an old Work snapshot. Once real runtime assets are complete, replace this launcher deployment with a normal Vite build of the chosen source revision, verify the real game, and retire the temporary substitutions. Do not treat browser localStorage as part of the Git migration; saves on the old domain do not transfer automatically.
