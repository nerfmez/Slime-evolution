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
| AQUA RAILGUN | pierce a whole line | A giant glassy ball of water (its own sphere shape) flying down the line at about 25 units/s: a splash kick at the muzzle, spray thrown aside like a bow wave, a wet track behind it, a big splash on every foe it reaches, a burst where the line ends. |
| PRESSURE JET | continuous high-pressure stream | A steady cutting stream like a laser: a tight white core at the nozzle that flares into a light, roaring stream and a widening fan of mist, white streaks racing down it, shock rings kicking out of the nozzle, spray blown back off the target. It never stops between casts. Single target: the nozzle follows the slime and the stream ends on the foe it is locked onto. |
| TIDAL SURGE | very wide, short-range wave | A giant wave (its own wave-face shape, leaning forward so it reads from any camera angle): ripples draw in while it gathers, it swells out of the ground into a long wall crowned with a lumpy roll of foam, currents run up its face and spray blows off the crest, then it falls forward and crashes into a flood of foam. |
| Tide Ring | ripple ring | Two soft lilac ripples spreading over a faint glow. |
| REPULSION DOME | temporary push dome | Lilac soap-bubble dome, a rim on the ground and push pulses. |
| VACUUM COLLAPSE | expand, collapse inward, explode | Whirlpool spiral with soft bubbles sucked inward, then a glow and ring burst. |
| RESONANCE CHAIN | mini shockwaves from hit foes | Rhythmic sound-wave rings, plus small rings on every hit foe. |
| Toxin Blob | poison blob and puddle | Ball of goo stretching a sticky strand along its arc; bubbling lime puddle on a purple shadow. |
| NEUROTOXIN INJECTION | strong poison, bursts when time ends | Pulsing poison drop over the target, then a goo splash, drops thrown on arcs and a toxic puff. |
| PLAGUE BLOOM | a bloom releasing spores | Purple flower on the ground puffing wispy spore clouds each beat; spores drift to new victims with soft trails. |
| CORROSIVE MIASMA | acid fog following foes | Low, wispy purple and lime fog with a few rising bubbles. |
| Frost Spike | ice spike | A six-sided ice crystal (clear, cold cyan, bright ridges) trailing cold mist. Frozen foes are encased in a faceted block of ice that grows up from the ground, with crystals at their feet; chilled foes get a few small crystals. |
| GLACIAL BORER | big ice drill | A spinning drill (flutes slide toward the tip) wrapped in two spirals of frosty wind, with a mist trail. |
| WHITEOUT BREATH | ice breath cone | Soft snowy cone (same half-angle and length as the hit area), rolling breath clouds and blowing snow. |
| CRYSTAL CHAINBURST | a thicket of ice spikes (owner request; 1.4x radius): 9 spikes erupt one at a time, .16 s apart, each hitting and chilling the foes round it | At each spot the game hits, the ground cracks and a clump of ice spikes (one tall, three leaning out) slowly pushes up, stands, then crumbles into shards and cold mist. |
| Chain Spark | chaining lightning | Thin jagged bolt with a soft glow and a flash where it lands. |
| JUDGMENT BOLT | sky lightning, three strikes | Bolt from the sky, a flash and a spreading ring. |
| LIGHTNING NETWORK | foes linked by electricity | The caster glows as the first node; bolts link the foes. |
| TESLA DOMAIN | stunning field around the slime | Soft electric field with crackling bolts on its rim. |
| Orbit Core | orbiting cores | Glossy cores (no faces) with a glow and a tail that curves along the orbit. |
| GRAVITY MACE | one big mace orb | A shaded star (lit sphere with a night side, slow bands turning across its face, a bright rim), no aura, trail or ring pulse; three moons circle close to it slowly on tilted orbits and hide while they pass behind it. |
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
- **Water evolution timing** (owner request, 2026-09-26; patched in `vfx/painted-style.mjs`): Aqua Railgun lives .8 s; its ball flies the line in the first 60% and each foe is hit when the ball reaches it (was: the whole line hit at once). Pressure Jet lasts until the next cast so it never stops (same damage per second). Tidal Surge lasts 1.1 s (was .8 s; each foe is still hit once). Round 2 (owner: "railgun far, wave wide and short, jet single target"): Tidal Surge is 1.7x wider and travels 2.6 units/s (was 5); Pressure Jet hits one foe at a time (no pierce), locks onto the foe it was cast at (or the nearest in reach), its nozzle follows the slime every frame and the stream ends on that foe. Round 3: Tidal Surge waits 1.5x its cooldown and hits 1.5x as hard (same damage per second), so a wave always finishes before the next one rises (overlapping waves read as blinking); the wave's strips share one sort key so they never swap order while it moves.
- **Sunfall fall time.** Owner request (2026-09-26): the sun takes 1 s to fall (default `fall` in the fire settings, was .5 s); `vfx/painted-style.mjs` patches the default. Its damage lands when it does.
- **Burnt ground.** The game already burns the grass under fire (a 96x96 burn map sampled by the ground and grass shaders). The painted effects draw no crater of their own; `vfx/painted-style.mjs` stamps the burn deepest at the centre and shows it in stepped layers (light scorch, burnt, charred), with the grass shortest where it burnt deepest. The layers shrink toward the centre as the ground heals. This applies in both effect styles.
- **Old style switch.** The old style stays behind Settings > Test > "สีน้ำวาดมือแบบใหม่ (ปิด = เอฟเฟกต์เดิม)", saved as `slime.vfxStyle.v2`, until the owner approves.
- **Review shortcut.** `?lab=<skill>` (e.g. `?lab=sun`, `?lab=cyclone`, `?lab=inferno`) opens the skill lab on that skill, repeating, with the target monsters hidden.
- **QA hook.** `?qa=1` exposes `__slimePaintedVfx` with `plan`, `draw`, `diagnostics` and `camera`.

## Damage numbers and orbit hit area (owner request, 2026-09-26)

- Damage numbers take the colour of the skill that dealt them: water blue, tide lilac, toxin green, frost icy white on cyan, chain yellow, orbit pink. Fire (and anything without a skill) keeps the original cream on brown. Patched in `vfx/painted-style.mjs`; the number records the game's own `damageSource`.
- Orbit orbs hit exactly where they are drawn: a core's hit radius is .24 (was .17 while drawn at .24) and Gravity Mace's is 1.15x wider (it was drawn 1.15x larger than its hit area). The moons round Gravity Mace are decoration only.

## Lightning, redone in yellow (owner request, 2026-09-26)

- Every lightning bolt is a jagged path that re-strikes many times a second: a white-hot stroke with yellow edges (new `SPARK_R` ribbon, no tail fade) inside a soft golden glow, with forks splitting off. Kinks are strongest mid-way so both ends stay on their targets.
- Chain Spark: the bolt jumps between foes; a flash and a spray of yellow sparks where it lands. Judgment Bolt: a thick forked bolt from the sky, a white flash, a shock ring, arcs crawling over the ground and a burst of sparks. Tesla Domain: arcs crawl along the curve of its rim and jump in from the middle. Lightning Network: little arcs hum round the caster.
- Stunned foes (the game reuses the frozen timer for the lightning stun) crackle with yellow arcs; the ice block is only drawn for foes that are frozen and chilled by frost.

## Toxin, reinterpreted (owner request, 2026-09-26)

The owner liked toxin least: the lime goo vanished into the green grass. Toxin is now deep purple venom lit by glowing acid green, which reads clearly on grass.
- Toxin Spit: a glossy venom glob with a glowing acid heart arcs over, shedding drips; it splats into a glossy pool with a dark rim, acid bubbles that rise and pop with a ring, and thin acid vapour.
- Neurotoxin Injection: a heavy pulsing venom drop over the foe ringed by orbiting droplets, acid veins creeping over the ground; the burst is a purple splash, flung drops and wisps of acid vapour.
- Plague Bloom: a dark venom flower with a glowing acid heart that breathes out glowing spores each beat.
- Corrosive Miasma: a creeping cloud of wispy purple venom fog with an acid glow inside and acid bubbles on the ground.
- Poisoned foes glow acid green with venom and acid bubbles rising off them.

## Toxin round 5 (owner request, 2026-09-26)

- The base skill was redesigned: Toxin Spit is a cluster of venom droplets tumbling round each other as they arc over, shedding drips. On landing a crown of venom splashes up, then the poison soaks into the ground like wet watercolour (a translucent halo, a darker drying rim, no hard edge, no gloss; the owner found the old pool solid and plastic), breathing out thin acid vapour and the odd bubble.
- Neurotoxin Injection keeps its venom mark; at the end the drop plunges onto the foe, stretching as it falls, and the burst is a flash, a tall crown of venom splashing up and falling back, a shock ring and a turning column of acid vapour over a soaking stain.
- Plague Bloom is unchanged (the owner's favourite).
- Corrosive Miasma sows poison seeds behind the slime as it walks (the owner found the fart clouds did not work). Gameplay in `vfx/painted-style.mjs`: while the skill is active a seed drops every patch-width walked (or every .7 s standing still); each lives 3 s and, once sprouted (.4 s), poisons foes round it on the old .25 s tick. Drawn as a seed that drops and bounces and the soil breaking, then a clump of three small flowers on thin stems (like the meadow's own flowers, a little taller, swaying like the grass; owner request) that bud, open purple with a glowing acid centre, puff glowing pollen each beat and wilt at the end.

- **Walking in the skill lab** (owner request, 2026-09-26): the slime can move in the lab with the keyboard or the on-screen joystick (left side of the screen), and skills are cast from where it stands, so moving skills (poison seeds, Pressure Jet, orbit) can be tried as in play.
- **Poison withers the grass** (owner request, 2026-09-26): every toxin skill (pools, Neurotoxin and its burst, Plague Bloom, the poison-flower trail) stamps the game's burnt-grass map only up to its lightest layer, so grass and meadow flowers there turn brown, shorter and dead-looking on a khaki-brown ground, but are never charred or removed like fire does. It is refreshed while the poison lasts and grows back about a second after.

## Tide as a purple force field (owner request, 2026-09-26)

The owner corrected round 6: tide is an energy field, not water, and Vacuum Collapse is not a storm (the card shows rings of force round the slime with glints of light). Every tide effect is drawn as energy: rings of force in true perspective (a soft deep-purple glow round a bright stroke that trembles), watercolour bands of purple on the ground, force lines streaking along the field and glinting points.
- Tide Ring: layered bands of force spread out, force lines streak outward and glints ride the front; the outer band marks the damage radius.
- Repulsion Dome: a translucent purple dome of force with a bright rim and rings of light round it like a cage; each push it flares, a ring of force runs out over the ground and force lines shoot outward.
- Vacuum Collapse: a ring of force swells, then contracts as the field winds inward, dragging force lines and motes to a purple gravity core that grows at the centre; it implodes in a flash and bursts outward.
- Resonance Chain: layered rings of force that tremble like a struck bell, bright points racing round them.
- Owner rule: the field stays on the slime. Every Tide cast (the rings, including echo rings still waiting, Repulsion Dome, Vacuum Collapse and Resonance Chain) moves with the slime every frame instead of staying where it was cast, and hits and pushes are measured from the slime's current spot (`follow:1`). Resonance's secondary rings on struck foes and the Nova pickup ring stay where they appear. Each field's look is seeded once, so it does not flicker while moving.

## Mods reach every skill (owner check, 2026-09-26)

Power and Haste reach every skill through its stats (damage and cooldown). Area and Duration were missing in six places, now patched in `vfx/painted-style.mjs`: Neurotoxin's burst size (Area), Plague Bloom's life (Duration), each poison flower's life (Duration, `plife`), Lightning Network's life (Duration), Glacial Borer's size (Area) and Whiteout Breath's reach (Area). Checked in the skill lab at mods 0 and 5.


## Close-range skills hit harder (owner request, 2026-09-26)

The owner found the close-range skills weak next to the ranged ones, since they only reach foes already beside the slime. Tide's base damage is 1.5x (every ring, Repulsion Dome, Vacuum Collapse and Resonance Chain scale from it) and Tesla Field's damage per tick is 1.4x. Skill-lab DPS against the four dummies over 12 s, before → after: Tide 14 → 20, Repulsion Dome 221 → 329, Vacuum Collapse 198 → 298, Resonance Chain 350 → 525, Tesla Field 268 → 306 (its Static bursts are unchanged). For reference: Aqua Railgun 507, Frost Shatter 450, Whiteout Breath 391.
