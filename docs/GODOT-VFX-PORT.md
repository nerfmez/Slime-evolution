# v100 non-Fire visual baseline

The user rejected PR36 because it decorated the migrated primitive renderer rather than restoring the supplied Godot effects. This port replaces that whole skill-rendering section, while preserving its existing monster-status/debris drawing separately. The FIRE family is the only excluded family; Chain/lightning is included.

## Sources and assembly

`vfx/godot-shaders.json` contains six verbatim shader bodies from the supplied `Slime-v100-fire-evo-components.zip`. Original SHA256 values are recorded in `godot-provenance.json`, together with the geometry/animation source scripts. The archive itself is not imported into the runtime.

`godot-elemental-renderer.mjs` ports the authored mesh profiles and signatures and adapts material I/O to instanced WebGL2. It caches meshes and instance buffers. `restore-godot-style.mjs` embeds it at build time and replaces only the elemental-renderer region. The final game bundle remains self-contained: no eval, dynamic module downloads or Godot runtime.

The Tidal mesh retains the eight-point curling profile, 24 lateral divisions and a separate three-point foam profile. Frost breath retains three independently animated 9-by-8 sheets. Frost drill retains its tapered body and 3.35-turn helical strip; darts and shatter clusters retain their faceted profiles. Toxin uses organic glob/pool/petal signatures. Orbit uses suspended curved arcs rather than ground-ring substitutes. Chain includes branching strikes and open Tesla discharges.

`neurotoxin-cast-adapter.mjs` maps the current web infection object to the original short owner-to-target visual travel. Cast origin is locked in a WeakMap; poison damage, selected target and duration remain untouched. `opaque-crystal-adapter.mjs` resolves nearest surfaces for fully opaque ice so back faces cannot repaint the drill white; fading ice retains non-writing depth. These are explicit build-time engine-port adapters, not changes to the original shader bodies.

The web ability sizes, ranges and lifetimes remain authoritative. Shared source formulas are adapted to those existing combat objects; this is not a pixel-identical reproduction of the old complete Godot scene or a new polished VFX redesign. Fire rendering/assets, monsters, scene, pacing and gameplay are not reverted.

## Verification

Run `npm test`, `npm run build`, then start `node scripts/canon.mjs serve`. Run `BROWSER=webkit node tests/vfx-browser.mjs` and `BROWSER=chromium node tests/vfx-browser.mjs`, plus the existing full cozy-regressions suites.

The VFX test drives actual skill presets at fixed simulation times, captures the WebGL canvas directly, measures effect contribution against the identical scene with only the new renderer disabled, and records moving sequences/alternate views/mixed gameplay. Chromium uses a smaller capture resolution to bound software-GPU workload, not different game logic or effects. Reports and PNGs are in `test-results/godot-vfx-*`.

Inspect the images and motion, particularly direction, scale, occlusion, fading and readability. Nonzero pixels and a clean browser are necessary but are NOT visual approval or proof of subjective fidelity. Do not call a GitHub merge a verified live release. Publish only to the existing original production project and verify the actual deployed release and asset manifest.
