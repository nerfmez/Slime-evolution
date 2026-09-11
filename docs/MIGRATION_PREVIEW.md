# Migration preview — isolated from the original game

Public test URL: https://slime-evolution-preview.vercel.app/

This is a temporary missing-assets preview, not a completed migration and not a visual redesign. The original Sites website and `main` branch were not changed by this preview task.

## Source and deployment

- Original source revision pinned by the launcher: `e4fb0498c75902c09abee058c674401e8ccdaf5e` (Sites v101 source import).
- Working branch: `preview/migration-playable`.
- Launcher: `migration-preview.html`.
- Launcher deployment snapshot: `5944f6436fb5d89064a47de9f96507556ea6c002`.
- Vercel project: `slime-evolution-preview` / `prj_0WRMPBL7GXeMG0n5REPERmlpW2dI`.
- Deployment: `dpl_FC9n26J2DDZZgUJmYHSPWFSeW75P`.
- Vercel serves a small HTML entry that fetches the pinned launcher. The launcher loads the pinned original game modules from GitHub Raw, with jsDelivr as a fallback, then resolves relative imports into browser Blob module URLs. It does not silently follow future changes to `main`.
- This Vercel project is not configured for GitHub automatic deployments. A GitHub commit alone does not redeploy it.

## What is preserved

The original game modules, terrain layout, water collision outlines, shader code, vegetation generation, slime geometry, movement and game logic are used. Source modules in the repository are not overwritten; substitutions below are made only in memory inside this explicitly labelled preview launcher.

## Temporary substitutions

1. `gl.js` texture loader returns programmatically drawn substitute textures rather than aborting startup on missing image files. Pond substitutes use the original water outlines. Trees and grass use simple temporary silhouettes. These are not recovered or approved artwork.
2. The enemy asset loader supplies simple procedural stand-ins for the missing enemy binaries and textures. Enemy visuals and animation are therefore not representative of the real game.
3. Missing Thorn sprite loading is skipped so the stand-in model path can render.
4. Missing VFX textures are transparent. Combat logic remains, but many visual effects are absent; do not judge skill visuals using this preview.
5. Review-frame and slime-motion links show the preview limitation notice instead of navigating to unavailable pages.

The launcher shows a permanent temporary-assets label and a detail dialog. It displays a meaningful error if source loading or game startup fails. It only removes the loading overlay after the original game's frame counter advances.

## Verification

The original build dependencies are not installed in the chat container. Local JavaScript syntax checks are separate from full gameplay verification.

A GitHub Actions browser check is included at `.github/workflows/migration-preview-check.yml`. It checks the deployed URL with headless Chromium, the launcher readiness gate, advancing original frame counters, keyboard movement, settings, the disclosure dialog, and landscape/portrait canvases. Read `preview-validation/latest.json` when present and check its `success`, timestamp, deployment URL and source revision. Screenshots are Actions artifacts. A workflow file by itself is not a passing test.

Browser checks are not independent art approval and do not verify FPS or touch behaviour on the owner's physical iPad/Android tablet. Nothing here claims that missing assets were restored.

## Continue safely

Keep asset-recovery work separate from this branch. Add recovered image and binary files without overwriting newer game source with an old Work snapshot. Once real runtime assets are complete, replace this launcher deployment with a normal Vite build of the chosen source revision, verify the real game, and retire the temporary substitutions. Do not treat browser localStorage as part of the Git migration; saves on the old domain do not transfer automatically.
