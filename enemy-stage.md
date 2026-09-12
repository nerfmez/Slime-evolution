# Stage 1 enemies — base, Alpha elites, and Ancient Bloom

Runtime source of truth is the web renderer. The recovered Godot v100 project is used only as the authoritative reference for the Stage 1 special-enemy models, skills, palettes, and source balance values; it does not replace the web terrain, camera, grass, or combat architecture.

## Base families

The four existing families remain Thorn Mite, Mossback, Petal Skitter, and Crystal Warden. `tools/bake-enemies.py` produces shared 32-pose GPU clips; instances share those buffers and do not create per-enemy skeleton uploads.

Auto mode follows the v100 Stage 1 family curve rather than hard switching every minute: Thorn opens the run; Mossback fades in during minute 2; Petal during minute 3; Crystal during minute 4; all four are active in the final pre-boss minute. An Alpha family is eligible only after its normal family has appeared.

## Alpha elites

Each Alpha uses the same base mesh family with a larger body, HP x2.85, damage +6, XP x3, and +1 reroll on defeat. Part-based palette rules are intentional: do not apply a whole-model tint.

- **Thorn Alpha** — scale 1.62, radius 0.58. Warm thorn/body regions shift toward red-orange. Skill: `ALPHA CHARGE`, 0.62 s wind-up, then a short dash; cooldown 4.6 s.
- **Mossback Alpha** — scale 1.38. Moss regions become warm gold while shell/nose parts retain their own colors. Skill: `EARTHSPIKE PATH`, 0.92 s wind-up, seven rising markers toward the locked target, 1.18 target blast radius; cooldown 4.25 s.
- **Petal Alpha** — scale 1.58. Petal regions shift selectively while cream/brown body parts are preserved. Skill: `WING DIVE`, 0.48 s wind-up, 5 s straight flight at 2x normal movement speed. `petal-flight.bin` contains the folded-leg/open-wing pose cycle. While flying it takes +50% damage and bends a wider grass path; cooldown 2.20 s.
- **Crystal Alpha** — scale 1.44. Uses the authored `crystal-elite.png` replacement texture, not a uniform shader tint. Skill: `CRYSTAL BURST`, 0.90 s wind-up, 1.62 target blast radius; cooldown 3.8 s.

Alpha spawn interval tightens over the run from roughly 24 kills to 9 kills. Developer mode `elites` spawns all four immediately for inspection.

## Stage 1 boss — Ancient Bloom Colossus

The boss wakes at 05:00 and normal spawning stops. Source model: `bloomstone_guardian_animated_v1.glb`. The web bake includes shared `walk`, `run`, `charge`, `push`, and `spell` clips.

Authoring balance from v100: HP 12,000, speed 0.92, contact damage 26, radius 1.82, and incoming damage x0.72. The current web test uses **1,200 runtime HP** while preserving `sourceHp: 12000` in `ENEMY_TYPES`, because the recovered web build currently exposes only the Inferno branch and needs a practical 30–50 s review window. Revisit this runtime scale when the full skill roster is restored; do not confuse it with the authoring target.

Boss attacks ported from v100:

- **Vine Lunge** — chosen beyond 6.2 units; 0.94 s wind-up, 8.8 movement speed, large finish impact, 4.10 s cooldown.
- **Root Slam** — 1.02 s wind-up, 7.20 radius, 3.55 s cooldown.
- **Seed Volley** — 0.86 s wind-up, 11 seeds (17 below 45% HP), 2.20 rad spread, speed 5.10, projectile radius 0.48, 3.40 s cooldown.
- **Bloom Burst** — 1.08 s wind-up, radius 8.0, 4.00 s cooldown.

Developer mode `boss` spawns Ancient Bloom immediately. The normal encounter only sets Stage 1 finished after the boss dies.

## Asset format

Base `.bin`: UV float32 + indices uint32 + 32 position/normal float32 frame pairs. Extra animation `.bin` clips contain only position/normal frame pairs and reuse the base UV/index buffers. JSON metadata declares optional `flight_clip`, `extra_clips`, and `elite_texture` entries, loaded by `enemy-assets.js`.

Special bake command:

```sh
python tools/bake-stage1-specials.py /path/to/Slime-v100/assets
```

This regenerates boss runtime clips, the Petal Alpha flight clip, and Crystal Alpha palette from the recovered v100 Godot assets.

## Validation

`tests/stage1-elites-boss.test.mjs` covers Alpha stat scaling and unlock gating, Petal Wing Dive + damage vulnerability, the 05:00 boss transition, boss close/long-range attack selection, armor, Alpha reroll rewards, and source HP metadata. Existing combat/VFX tests must remain green. Browser/device FPS and final visual approval remain separate gates.
