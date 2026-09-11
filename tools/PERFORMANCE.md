# Meadow rendering optimization

Static meadow pigment is sampled from `public/assets/meadow-pigment-cache.png`
instead of recomputing layered procedural noise per ground/grass fragment.
The cache is 2048 square over world coordinates -40..40. Positions beyond the
cache retain the original procedural calculation. Grass roots and the ground
still share the same pigment lookup. Water UV distortion, canopy shade,
character lighting, vegetation movement and grass density remain enabled.

Rebuild the asset after editing `proceduralMeadow`:

```
node tools/bake-meadow.mjs
```

Offscreen enemy models and contact shadows now use conservative bounds, and
unchanged uniforms skip driver uploads. The default render scale is 1.2 instead
of 1.5 (36% fewer pixels on displays with DPR >= 1.5); UI stays at native CSS
resolution. The old 1.5 and 2 scales remain selectable.

## Local measurements

Native EGL/GLES3 render of actual scene commands, 12 enemies, 10,000 grass,
player `[6.5,0,1.5]`. Eight frames per run, first three discarded. Includes
Python command submission overhead; not a browser or Android FPS measurement.

| Setting | Median ms/frame |
| --- | ---: |
| Previous procedural scene, 1200x750 | 39.535 |
| Pigment cache, same resolution | 31.894 |
| Cache + offscreen culling, same resolution | 30.739 |
| Cache + culling, 1.2/1.5 pixel ratio (960x600) | 24.398 |

Local times vary with host load. These results do not prove a 20 FPS increase
on the user's tablet. Compare the same position, mobs, skills and display
refresh setting there. The native harness does not measure the JS uniform
upload optimization.

```
SCENE_PLAYER='[6.5,0,1.5]' node tools/export-scene.mjs
SCENE_BENCH=1 SCENE_RENDER_SCALE=0.8 python3 tools/render-scene.py
```

At unchanged resolution, the before/after pigment images differed by roughly
one 8-bit RGB level on average (enemy orientation was randomized). Camera,
collision and uniform mutation checks passed. Cache is not a screenshot of
the playable scene; it contains only static ground pigment.
