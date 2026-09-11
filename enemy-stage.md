# Stage 1 enemy test

Four existing creatures are imported from the v95 source models. `tools/bake-enemies.py SOURCE_MODELS_DIR` samples 32 shared poses per creature and extracts the original embedded texture unchanged. Mossback retains leg tracks only, Crystal retains rotation tracks only, and Petal uses its retargeted rig walk. Thorn has no embedded clip; its original four leg chains receive the procedural walking gait. Each pose is shared by all instances; no per-enemy skeleton or animation buffer uploads run each frame.

The binary format is UV float32, indices uint32, then 32 position/normal float32 pairs. JSON contains counts and clip duration. Character shading and the ground shadow palette are shared with the meadow scene.

`enemies.js` owns encounter time, spawning, shared navigation flow field, obstacle-safe movement, separation, contact attacks and Crystal projectiles. Auto mode unlocks Thorn at 0 s, Mossback at 60 s, Petal at 120 s and Crystal at 180 s. The encounter is a five-minute enemy test, not yet the complete progression or boss loop. The settings allow all four types immediately, individual types and a chosen starting minute. HP, brief damage immunity, restart and storm damage allow basic combat testing. The existing storm is placed at the slime's position when cast.

Validation: production shaders rendered with all four animated meshes at two walk phases; movement checks cover pond navigation without tunnelling, valid spawns, timed unlocks, melee, ranged hits, immunity, storm deaths, pause, restart and completion. An 80-enemy update in the current environment measured 3.54 ms median / 6.18 ms p95; this is CPU simulation time, not tablet FPS.
