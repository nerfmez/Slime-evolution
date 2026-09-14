# Small animal pickups — 2026-09-14

The authoritative current playable upload is `published/2026-09-14`, not the older root Vite source. Do not build the older source over this release. `scripts/apply-critter-patch.mjs` verifies the uploaded bundle SHA-256 and creates `main-critter-v1.js`; the original bundle stays intact for comparison/rollback. Readable new source lives in `critters/`. Copies under the release's `assets/critters` are generated, not separately edited.

## Behaviour

EXP drops are small stylized frogs, leaf beetles and meadow rabbits. Special heal/magnet/nova pickups become coral frogs, blue beetles and golden rabbits. They idle/hop near their drop position, do not attack, do not flee across the map, and shrink into the slime when eaten. Spawn adjustment and wandering use the game's existing passability predicate; attraction intentionally retains the old pickups' ability to cross obstacles, so rewards cannot get trapped behind a pond or crushed scenery.

Original drop rates, values, healing, nova target exclusions, EXP multipliers and magnet upgrade radius are preserved. The global magnet now brings the animals in rather than clearing them invisibly; EXP is credited when each is eaten, once only. Special pickups still require close contact. The eating radius scales with slime growth. All motion follows simulation time and respects pause/card/growth states. Cosmetic motion never uses the card/combat RNG. No audio or localStorage keys are changed.

All visible normal and special pickups share one instanced draw, two triangles per animal, reusable buffers, no model files and no texture downloads. The existing vegetation-depth restoration lets the animals remain readable over grass without disabling solid-world depth tests. This is not a measured device-FPS claim.

## Development / checks

```
node scripts/apply-critter-patch.mjs
node --test tests/*.test.mjs
```

`tests/critter-browser.mjs` runs the current release in Chromium with a temporary test-only module export added by the test's response route. Production code has no global test/debug hook. Tests check real healing/magnet/nova integration, a 1,000-animal single batch, shader/GL errors, missing assets, and the touch joystick. Screenshots and reports are GitHub Actions artifacts. Device FPS and owner visual approval remain separate.

Publishing: serve the contents of `published/2026-09-14` at the website root. No old Sites or new hosting deployment is configured by this feature. Rollback for the uploaded release: restore its index script path to `./assets/main-CT954LmH.js`. This disables the derivative without deleting the original assets.
