# Source-first release contract — 2026-09-17

This document and the latest user instructions override historical published-build instructions in HANDOFF.md, IMPORT_READY_BUILD.md and old notes. The authorized baseline is root Vite source on main, with Moss Frog and Water Calf. Never replace it with a compiled bundle.

## Confirmed incident

The old `slime-water-calf-test.vercel.app` HTML contained a `<base href="https://cdn.jsdelivr.net/gh/nerfmez/Slime-evolution@9f816c443fde1fdf61d5af5cb270358b30d0c4a1/">`. Its relative `./assets/grass-painted.png` request therefore targeted a nonexistent repository-root path at an old immutable commit. Runtime public assets belong in `public/assets/` in source and `dist/assets/` after build. Editing main cannot update a pinned CDN wrapper. The source validation run also previously exposed missing canonical scene images; commit 543bd352 restored those files. Neither fix was a deployment to the user's Vercel domain.

The production project remains `slime-evolution` / `prj_dmWGye4WkusoSFye1PIIAxgt5KM3`, team `team_wUPNV5SYxHR0mz3URq89uGm0`, domain `https://slime-evolution-five.vercel.app/`. Do not create another site, or send the known broken water-calf wrapper as a playable release.

## Mandatory release sequence

1. `npm run build` builds root source, checks every copied public asset, required textures and concrete runtime asset URLs. Missing/empty files, PNG/WebP placeholders, Crystal assets and external/CDN entry wrappers fail the build.
2. Every output file is recorded by path, length and SHA-256 in `dist/release.json`. Both entry pages contain a `slime-build` meta tag with the full Git SHA.
3. Serve **dist only** with a strict server returning real 404s. `tests/source-smoke.mjs` checks the file manifest, then actual WebGL boot and advancing frames in all current monster modes, tablet and phone viewports, cold load and same-context reload. Chromium and WebKit must pass. This is not a real-iPad performance measurement.
4. The tests deliberately remove grass, corrupt bytes, return HTML in place of PNG, use the wrong version, and reproduce a CDN wrapper. These cases must be rejected, not bypassed or given placeholders. Screenshots and JSON evidence are retained as Actions artifacts.
5. The deploy job downloads the exact tested artifact, uploads the entire directory as one staged deployment to the **existing project**, and checks it again over the network before promotion. It refuses to promote a superseded commit.
6. Promote to the existing domain, then rerun byte/version/runtime checks against that domain. Build success, HTTP 200 and Vercel READY alone are NOT evidence of a playable updated game. A failed production check is a failed release, not completion.

## Publishing authorization

The connected Vercel read tools do not supply a credential to GitHub Actions. The deploy job requires repository Actions secret `VERCEL_TOKEN`, scoped to the user's existing team/project. Configure it in GitHub Settings > Secrets and variables > Actions, never in source or chat. If deployment protection applies, also configure `VERCEL_AUTOMATION_BYPASS_SECRET` through the providers' secret settings. Do not disable authentication globally.

If the token is missing, deployment stops with `NOT DEPLOYED`; the existing website stays unchanged. After configuration, run **Source-first release gate** on main in Actions. This pipeline does not require Git linkage in the Vercel UI and must be the single publishing path; do not add a second unguarded auto-deploy path.

Manual verification (EXPECTED_COMMIT must come from GitHub, not from the remote site's own claim):

```sh
EXPECTED_COMMIT=<full-current-main-sha> SMOKE_URL=https://slime-evolution-five.vercel.app/ npm run verify:site
```

## Scope and historical assets

Published folders are read-only archives, not build inputs. Asset recovery may use an exact existing blob with documented provenance if source genuinely lacks the original, but do not copy old compiled JS/AI or add published-path fallback loaders. Gameplay balance, art, collision, grass behavior, skills, audio and localStorage keys are out of scope for this release-transport repair.
