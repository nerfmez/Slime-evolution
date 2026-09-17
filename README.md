# Slime — Moss Frog + Water Calf + Ancient Bloom

The only active game is **`game/`**. It continues from the completed Frog canon, through the tested Water Calf replacement, and removes the retired Thorn model/Alpha, Mossback and Petal. The new Water Calf Alpha remains a Water variant. See `CANON.json` for exact current and baseline trees, and `docs/ROSTER-CLEANUP.md` for the scoped changes.

```sh
npm test
npm run build
npm run dev
```

Node 22+; no downloaded packages are needed to build. Build validates the locked game and copies it to `dist/`; it never rebuilds the obsolete Vite prototype or creates a CDN wrapper. This is a preserved playable bundle with scoped readable modules, not fully recovered unbundled authoring source.

`game/assets/enemy-roster.js` contains active species, eligible elites, model dependencies and independent unlock times. Frog starts at 0, Water at 180 seconds, boss at 300 seconds. The 100-monster cap and spawn-frequency formula are unchanged. Add future species under their own IDs; no old enemy slot is required.

Tests check exact original art, all unchanged files, removal of retired dependencies, reverse-patch provenance back to the completed Frog game and numerical parity of all four boss attacks. Browser CI exercises Frog/Water/Boss, old saved modes, three cameras, real projectile damage and all skill presets in Chromium and WebKit.

The earlier Water candidate is preserved on `archive/water-before-roster-cleanup-20260917`; completed Frog at `6e098d66` / `fix/frog-canon-only`; old root/abandoned experiments on `archive/before-frog-canon-cleanup-20260917`. History is retained, not re-imported into the build.

The only production destination remains `https://slime-evolution-five.vercel.app/`. A GitHub merge or CI pass is NOT a deployment. `npm run audit:live` checks the actual original site after publishing. Read `AGENTS.md` and `HANDOFF.md` before editing.
