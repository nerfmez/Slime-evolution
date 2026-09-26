# Painted skill effects

Owner request (2026-09-25): every skill effect is redrawn in a cel-shaded watercolour style that fits the painted meadow.

The owner rejected a filter over the old effects ("it only adjusts the old skills, so it looks the same and does not fit the theme"). Each effect is therefore designed again from its skill concept.

- **Code:** `vfx/painted-renderer.mjs` (renderer) and `vfx/painted-style.mjs` (build wiring, Settings switch).
- **Tests:** `tests/painted-vfx.test.mjs` and `tests/painted-vfx-browser.mjs` (Chromium + WebKit in `.github/workflows/painted-vfx.yml`).

## Owner rules (review rounds 1–3)

1. **Effects must look natural, never like sculpted geometry.** This applies especially to small bits and fragments.
   - Small particles are soft dots with no outline (the pigment edge fades out on anything smaller than about 18 CSS px).
   - There are no star stickers, paint speckles or chips.
   - Sparks are glowing embers that leave a soft smear of light, never needles or cones.
   - Scorch marks are mottled stains, not rings.
2. **Tails are never stiff.** Every tail is a ribbon painted along the path the object really took:
   - remembered positions for orbiting and darting cores;
   - the ballistic arc for thrown drops and sparks;
   - the fall curve for meteors.

   Straight shots get a tail that flutters like cloth.
3. **Fire takes a clear, different form in every branch.** Round 4: the owner approved only the burning ground. Every other branch was redrawn around a form you can name at a glance, using the burning ground's living flame (noise rising through a soft mask) as the shared language. There are no flame sticks and no swirling fire ribbons.

   | Branch | Form |
   | --- | --- |
   | Basic shot | A round ball of fire, white-hot inside, its flames licking back into a short tail. |
   | Scatter | A fan of small fireballs, each licking back along its wavy flight. |
   | Burn (approved) | A bed of licking fire on a scorched patch. |
   | Blast | A real explosion: a flash, a round fireball with a white-hot heart and flames bursting from its rim, a shock ring, then smoke. |
   | Sunfall | A small sun (a round glowing disc in a corona of flame) sinks onto the target, then lands as a flash and a dome of fire with shock rings and a smoke column. |
   | Meteor | A big burning rock wrapped in flame that streams back, with a long smoke trail, then a crater burst and dust. |
   | Cyclone | A tornado of fire: a funnel narrow at the ground and wide at the top, bands of flame racing round it, fire at its foot and embers circling. |

   A unit test checks each branch's own form.
4. **Water is one smooth body.** Streams are cohesive ribbons with a flowing highlight, not frayed spray.
5. **One clean layer for the wave.** Tidal Surge is a single sheet of water with one foam lip. There is no smoke and there are no spray bits.
6. **Smoke and fog are wispy, never lumps.** They use domain-warped noise with soft wet edges.
7. **Use card art for mood and colour only.** Do not copy it literally: no faces on orbs and no decorative crystals.
8. **Review with the target monsters hidden** (the skill lab's hide-targets switch). Always look at animated sequences, not single frames.

## Look

- Flat washes in three stepped (cel) tones.
- A soft edge in a darker shade of the same colour (never black) that comes and goes like a real pigment edge.
- White paper highlights, paper grain, and a watercolour dissolve when effects fade.
- Palettes:
  - water: blue
  - tide: lilac
  - fire: yellow, orange and red, with warm smoke
  - toxin: lime on purple shadows, so it stays readable on grass
  - frost: blue and lavender
  - chain: white and lilac
  - orbit: cyan

## Concept → design

| Skill | Concept | Painted design |
| --- | --- | --- |
| Water Shot | water droplet shot | Glossy droplet pulling a smooth, fluttering water tail. On hit: rings on the ground and a few drops thrown up on real arcs. |
| AQUA RAILGUN | pierce a whole line | One smooth, gently wavering stream with a flowing highlight inside a soft mist. Rings and splash drops at the ends. |
| PRESSURE JET | continuous high-pressure stream | A thinner stream that throbs with pressure pulses, with a ring and drops where it lands. |
| TIDAL SURGE | wide wave wall sweeping forward | One sheet of water rushing forward: deep blue under the front, one scalloped foam lip, lighter water behind. |
| Tide Ring | ripple ring | Two soft lilac ripples spreading over a faint glow. |
| REPULSION DOME | temporary push dome | Lilac soap-bubble dome, a rim on the ground and push pulses. |
| VACUUM COLLAPSE | expand, collapse inward, explode | Whirlpool spiral with soft bubbles sucked inward, then a glow and ring burst. |
| RESONANCE CHAIN | mini shockwaves from hit foes | Rhythmic sound-wave rings, plus small rings on every hit foe. |
| Toxin Blob | poison blob and puddle | Ball of goo stretching a sticky strand along its arc; bubbling lime puddle on a purple shadow. |
| NEUROTOXIN INJECTION | strong poison, bursts when time ends | Pulsing poison drop over the target, then a goo splash, drops thrown on arcs and a toxic puff. |
| PLAGUE BLOOM | a bloom releasing spores | Purple flower on the ground puffing wispy spore clouds each beat; spores drift to new victims with soft trails. |
| CORROSIVE MIASMA | acid fog following foes | Low, wispy purple and lime fog with a few rising bubbles. |
| Frost Spike | ice spike | Faceted ice shard trailing cold mist. |
| GLACIAL BORER | big ice drill | A spinning drill (flutes slide toward the tip) wrapped in two spirals of frosty wind, with a mist trail. |
| WHITEOUT BREATH | ice breath cone | Soft snowy cone (same half-angle and length as the hit area), rolling breath clouds and blowing snow. |
| CRYSTAL CHAINBURST | embedded crystals burst in chains | Crystal columns erupt from a frost patch, then shatter into a few shards. |
| Chain Spark | chaining lightning | Thin jagged bolt with a soft glow and a flash where it lands. |
| JUDGMENT BOLT | sky lightning, three strikes | Bolt from the sky, a flash and a spreading ring. |
| LIGHTNING NETWORK | foes linked by electricity | The caster glows as the first node; bolts link the foes. |
| TESLA DOMAIN | stunning field around the slime | Soft electric field with crackling bolts on its rim. |
| Orbit Core | orbiting cores | Glossy cores (no faces) with a glow and a tail that curves along the orbit. |
| GRAVITY MACE | one big mace orb | A heavy glossy core with a deeper glow and a curved tail. |
| HUNTING SATELLITES | cores dart out and return | Tails trace every dart and return. |
| ARC HALO | cores linked into a wall | Twisting strands of light between the cores. |
| Inferno (basic) | fireball | Round ball of fire, white-hot inside, flames licking back into a short tail. |
| Inferno blast | explosion | Flash, round fireball with a white-hot heart and flames bursting from its rim, shock ring, embers, then smoke. |
| Inferno scatter | sparks | Small fireballs fanning out, each licking back along its wavy flight. |
| Inferno burn | burning ground | Bed of licking fire on a scorched, glowing patch, embers rising. |
| SUNFALL CORE | charge a fire core, big explosion | A small sun (glowing disc in a corona of flame) sinks onto a glowing circle, then lands as a flash and a dome of fire, shock rings, embers and a mushroom column of smoke. |
| METEOR SHOWER | meteors rain on many spots | Big burning rocks wrapped in flame streaming back, long smoke trails, then a crater burst and dust. |
| FLAME CYCLONE | fire storm moving to foes | A tornado of fire: a funnel narrow at the ground and wide at the top, bands of flame racing round it, fire at its foot, circling embers and smoke on top. |
| Status | poison, chill, freeze, burn | Soft poison glow and bubbles, frost crystals at the feet, a small bed of fire on burning foes. |

## Technical notes

- **One draw call per frame.** Each instance is a quad with a signed-distance shape or a noise field, shaded in the fragment shader. There are no textures.
- **Instance data: 40 floats.**
  - The first 32: centre, two half-axes, shape, seed, opacity, four shape parameters, three tones with dissolve / edge / wobble, aspect, shine, raggedness and softness.
  - The last 8 turn the quad into a bilinear ribbon segment: the fourth corner, a ribbon flag, and the path fraction at both ends plus the total length.
  - Neighbouring segments share corners, so ribbons bend without seams.
- **Quad placement.** Quads are ground decals, camera-facing billboards, direction-aligned billboards, spans between two points (lightning), or ribbons along a path.
- **Draw order.** Ground decals draw first, by layer. Billboards and ribbon segments are sorted back to front. Depth test is on and depth write is off. `lift` pulls effects on a foe slightly toward the camera.
- **Inputs are read-only.** Hit areas, sizes, timing and damage are unchanged. Fire timings come from the live fire settings.
- **Derivatives.** All screen derivatives are taken before any `discard`, which is required for iPad/Metal.
- **Sunfall fall time.** Owner request (2026-09-26): the sun takes 1 s to fall (default `fall` in the fire settings, was .5 s); `vfx/painted-style.mjs` patches the default. Its damage lands when it does.
- **Old style switch.** The old style stays behind Settings > Test > "สีน้ำวาดมือแบบใหม่ (ปิด = เอฟเฟกต์เดิม)", saved as `slime.vfxStyle.v2`, until the owner approves.
- **QA hook.** `?qa=1` exposes `__slimePaintedVfx` with `plan`, `draw`, `diagnostics` and `camera`.
