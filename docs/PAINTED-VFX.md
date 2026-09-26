# Painted skill effects

Owner request (2026-09-25): every skill effect is redrawn in a cel-shaded watercolour style that fits the painted meadow. The owner rejected a filter over the old effects ("it only adjusts the old skills, so it looks the same and does not fit the theme"). So each effect is now designed again from its skill concept and its card art.

- **Code:** `vfx/painted-renderer.mjs` (renderer) and `vfx/painted-style.mjs` (build wiring, Settings switch).
- **Tests:** `tests/painted-vfx.test.mjs` and `tests/painted-vfx-browser.mjs` (Chromium + WebKit in `.github/workflows/painted-vfx.yml`).

## Look

The look matches the card icons in `game/assets/cards/*.png`:

- Flat washes in three stepped (cel) tones, with a slightly darker seam where two tones meet.
- A thin edge in a darker shade of the same colour, plus softer pigment pooling inside it. There are never black outlines.
- White "paper" highlights, paper grain, and ragged hand-painted edges.
- Effects fade by drying away in patches (watercolour dissolve), not by a uniform fade.
- Nothing is a rigid geometric solid. Every shape breathes a little (animated domain warp) and edges are "lost and found" (the pigment line fades in and out). Mist, smoke, spray and glows use soft wet-in-wet edges.
- **Fire is alive (owner feedback: no flame "sticks").** Each flame has a round base and three curling, tapering tongues that sway and flicker, with small drops breaking off the tips. Bursts combine a ball of licking fire (FIREBALL field), a ring of living flames and soft rolling smoke.

Palettes come from the icons: water blue, tide lilac, fire red-orange-yellow with an ember core, toxin lime with purple shadows, frost blue-lavender, chain white-lilac, orbit cyan, and warm smoke.

Toxin uses lime on purple shadows so it stays readable on the green grass.

## Concept → design

| Skill | Concept | Painted design |
| --- | --- | --- |
| Water Shot | water droplet shot | Teardrop droplet with a white highlight and trailing drops. Splash crown and ripple on hit. |
| AQUA RAILGUN | pierce a whole line | Gushing straight stream that swells from the slime and frays into spray at its edges, with foam patches, a misty halo, flying drops and a splash at both ends. |
| PRESSURE JET | continuous high-pressure stream | Thinner gushing stream with drops peeling off, a soft mist and a splash where it breaks up. |
| TIDAL SURGE | wide wave wall sweeping forward | A sheet of water rushing forward, seen from above: foam lines racing at the front, rolling froth and spray. |
| Tide Ring | ripple ring | Concentric dry-brush lilac rings, scattered paint dots, and four faceted crystals on the diagonals (as on the card). |
| REPULSION DOME | temporary push dome | Lilac soap-bubble dome with a highlight, a brush rim on the ground and push ripples. |
| VACUUM COLLAPSE | expand, collapse inward, explode | Whirlpool spiral with bubbles sucked inward, then a burst. |
| RESONANCE CHAIN | mini shockwaves from hit foes | Rhythmic sound-wave rings, plus small rings on every hit foe. |
| Toxin Blob | poison blob and puddle | Lime drop with bubbles on a purple shadow; bubbling puddle. |
| NEUROTOXIN INJECTION | strong poison, bursts when time ends | Pulsing poison drop above the target, orbiting bubbles, then a splash burst. |
| PLAGUE BLOOM | a bloom releasing spores | Purple poison flower opening on the ground and puffing spores in rhythm; spores fly to new victims. |
| CORROSIVE MIASMA | acid fog following foes | Soft rolling purple and lime fog with acid bubbles and a stain. |
| Frost Spike | ice spike | Faceted ice shard with a frosty trail and sparkles. |
| GLACIAL BORER | big ice drill | A big faceted crystal point flanked by two smaller ones (as on the card), soft frost mist, orbiting ice chips and a frozen trail. |
| WHITEOUT BREATH | ice breath cone | Soft snowy cone (same half-angle and length as the hit area), rolling snow clouds and snowflakes. |
| CRYSTAL CHAINBURST | embedded crystals burst in chains | Crystal columns erupt on a frost star, then shatter into shards. |
| Chain Spark | chaining lightning | Thin jagged white-lilac bolt with branches and a soft blue glow, and a spark at the target. |
| JUDGMENT BOLT | sky lightning, three strikes | Bolt from the sky onto a rune circle, with a burst and shards. |
| LIGHTNING NETWORK | foes linked by electricity | Rune node at the caster and bolts between foes. |
| TESLA DOMAIN | stunning field around the slime | Rotating rune circle with crackling bolts on its rim. |
| Orbit Core | orbiting cores | Glossy water orbs with a little slime face (as on the card), drop trails and sparkles. |
| GRAVITY MACE | one big mace orb | Heavy core wrapped in gravity rings, with small orbiting drops. |
| HUNTING SATELLITES | cores dart out and return | Smaller orbs whose trails stretch as they dart. |
| ARC HALO | cores linked into a wall | Two thin strands of light twisting between the orbs over a soft glow, with sparkles. |
| Inferno | fireball | A living flame that leans back as it flies, dropping little flames and sparks. The burst is a ball of licking fire in a ring of living flames, then warm rolling smoke over a scorched, glowing stain. |
| SUNFALL CORE | charge a fire core, big explosion | A sun of fire (a licking fireball crowned with small living flames) falls onto a glowing circle, then a big burst of flames, a shock ring and a smoke column. |
| METEOR SHOWER | meteors rain on many spots | Ember rocks trailing living flames and smoke streak in diagonally, then burst into flames and smoke. |
| FLAME CYCLONE | fire storm moving to foes | Living flames whirl in a rising spiral round a soft swirl of heat, with embers, smoke on top and a scorched spiral on the ground (no solid column). |
| Status | poison, chill, freeze, burn | Rising poison bubbles, frost crystals at the feet, and small living flames on burning foes. |

## Technical notes

- **One draw call.** One instanced draw call per frame. Each instance is a quad with a signed-distance shape or a noise-sculpted field (flame, fireball, smoke, liquid, stream, surf) shaded in the fragment shader; there are no textures.
- **Review tip.** In the skill lab, hide the target monsters so they do not cover the effects.
- **Instance data.** 32 floats per instance: centre, two half-axes, shape, seed, opacity, four shape parameters, three tones with dissolve / edge / wobble, aspect, shine and raggedness.
- **Quad placement.** Quads are ground decals, camera-facing billboards, direction-aligned billboards, spans between two world points (beams, bolts), or walls (the wave).
- **Draw order.** Ground decals draw first, by layer. Billboards are then sorted back to front per effect. Depth test is on and depth write is off. `lift` pulls effects on a foe slightly toward the camera so they draw in front of it.
- **Inputs are read-only.** The renderer only reads combat objects. Hit areas, sizes, timing and damage are unchanged. Fire timings come from the live fire settings: blast length, Sunfall burst and smoke, meteor impact, and cyclone rise and fade.
- **Old style switch.** The old style stays behind Settings > Test > "สีน้ำวาดมือแบบใหม่ (ปิด = เอฟเฟกต์เดิม)", saved as `slime.vfxStyle.v2`, until the owner approves. With the switch off, the Godot port and the painted fire images draw exactly as before.
- **QA hook.** `?qa=1` exposes `__slimePaintedVfx` with `plan`, `draw`, `diagnostics` and `camera`.
