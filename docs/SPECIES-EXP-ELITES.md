# Species EXP + Elite variants (2026-09-18)

## Requested behavior
- Every defeated current creature drops an EXP critter matching its species: Moss Frog -> frog, Spark Hedgehog -> hedgehog, Pond Turtle -> turtle, Water Calf -> tiny elephant, Bamboo Panda -> panda.
- The existing approved frog/hedgehog/turtle/panda EXP cells stay unchanged. The Water Calf adds only two tiny-elephant cells (front/back) in previously empty atlas slots.
- Elites exist for Frog, Spark, Turtle and Water. Panda remains a mini-boss and never becomes an elite.

## Reuse, not redraw
Elite combat sprites reuse the exact normal animation atlases and poses. Runtime scale makes them larger. Selective shader accents modify only characteristic regions (frog green body, Spark spines, Turtle shell, Water blue markings); faces, eyes and light belly/ear areas are intentionally not globally tinted. No walk/attack/hurt/death frame set is redrawn.

Each living elite gets a screen-space name and HP bar above its head, positioned from its scaled body height. Manual test modes include `elite-thorn`, `elite-spark`, `elite-turtle`, `elite-water` and `elites`.

## Elite attacks
- **Moss Frog Elite** — locks a short telegraph, tongue/cone hit up to 2.85 world units, then applies a 3-second poison DOT if the player was inside the cone.
- **Spark Hedgehog Elite** — preserves the approved charge/dash timing and adds a 1.65-unit radial lightning burst at the authored dash impact/end point.
- **Pond Turtle Elite** — preserves Shell Guard. While the guard is active, moving player projectiles that contact the shell are consumed and a reflected world projectile is launched toward the player. Normal Turtle still only reduces damage as before.
- **Water Calf Alpha** — preserves the existing three-shot elite water attack and only gains the shared elite presentation/color treatment.

## Cozy schedule
The 10-minute director keeps the two Panda events at 5:00 and 8:00. Explicit elite encounters are Frog 1:45, Spark 3:35, Turtle 7:00 and Water 8:40. Special isolation and the eight-second clear respite still apply, so an unfinished guardian prevents another special/wave from stacking.

## Build isolation
`game/` remains the exact reviewed Panda baseline tree `a9f9f5963f4037d8a6ffeaccd3bfd09b840d7689`. New runtime files live under `species/`; `species/assemble.mjs` rewrites only the generated `dist` imports/hooks. The complete species tree and assembled runtime tree are hash-locked in CANON.json.

The Turtle reflection helper is explicitly imported into the assembled runtime; the canonical build checks the generated bundle contains `reflectEliteTurtleProjectile` before browser regressions.

## Visual correction v2 (2026-09-18)
- Existing Frog/Hedgehog/Turtle/Panda EXP animals now render from the original 320×160 approved atlas directly. The lower-resolution species copy is used only as the source for the two Water Calf cells, so the older EXP animals no longer lose saturation/detail.
- Water Calf EXP uses tighter UV crops plus a larger world scale, so front/back views read at the same visual weight as the other EXP animals.
- Moss Frog Elite now shares the normal Frog hop-cycle animation/movement logic. Its poison tongue telegraph pauses the hop only during the attack, then returns to the hop cycle.
