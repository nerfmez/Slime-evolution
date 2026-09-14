# Slime Evolution agent instructions

Read `HANDOFF.md` and `docs/DREAM_LOOP.md` before changing code. The current-release section below overrides historical handoff entries.

## Current release — 2026-09-14, critter v5 + spawn balance

The newest playable upload is `published/2026-09-14/`; the root Vite source is older and must not be rebuilt over it. Read `docs/CRITTER_PICKUPS.md`. Run `node scripts/apply-critter-patch.mjs` to regenerate `assets/main-critter-v4.js` and `assets/critters-v4/`. Original and v1/v2/v3 assets remain for rollback.

Current approved critter art is deliberately limited to THREE EXP bands with THREE animals each:
- LOW 1–9: small frog / leaf bug / small rabbit.
- MID 10–19: round bird / squirrel / little hedgehog.
- HIGH 20+: fawn / moss turtle / tiny panda.
The tiny panda rolls as a ball while moving. Every animal uses approved front/back art. Do not expand this back into nine reward tiers or 27 animals.

Approved item animals: pink flower axolotl = Heal, blue magnet-horn creature = Magnet, golden radiant spiky creature = Nova. Use their supplied colors/shading without restyling. The item sprite images themselves must NOT contain baked glow, sparkles, aura clouds, coins, petals, hearts, or other effect particles. Item glow is added only at runtime by the renderer and is intentionally strong/readable against the meadow, with a soft edge fade so it does not become a square sprite halo. EXP has no item glow. Paper backgrounds, labels and sheet decoration are excluded from the game atlas.

Preserve pickup behavior: no passive attraction until Magnet mod; +.42 range per rank; one short bounded escape; global magnet item still gathers EXP. Rewards, drop rates, skills, audio and localStorage keys stay unchanged.

Current enemy-density balance: normal-run maximum is 100 monsters. The first 60 seconds keep the previous spawn cadence; from 01:00 until the 05:00 boss transition, the spawn interval is halved, i.e. monsters attempt to spawn at 2× the previous frequency. Do not reinterpret this as spawning two monsters in a burst or doubling the first minute.

Production target: Vercel project `slime-evolution`, project ID `prj_dmWGye4WkusoSFye1PIIAxgt5KM3`, team `team_wUPNV5SYxHR0mz3URq89uGm0`, alias `slime-evolution-five.vercel.app`. Deploy the pinned `published/2026-09-14` release, never the old root build. Old Sites is not the selected host.

## Project rules
- Latest user corrections override older reference images and designs.
- Current Sun Fall smoke: wide grounded base tapering upward into thin swept anime/manga crests. Clockwise flow, then stretch, thin, peel, dissolve. No round puff/bead/fog-donut concept.
- Baseline quality before tuner. Preserve tuners, localStorage keys and saves.
- Keep fixes scoped. Preserve grass burning, other skills, monsters and original player animation unless requested.
- Do not force-push or overwrite unrelated GitHub work.
