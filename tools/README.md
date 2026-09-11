Scene visual check

Run from the project root:

```sh
node tools/export-scene.mjs
python3 tools/render-scene.py
```

Requires Node, Python with NumPy/Pillow, and Mesa EGL with GLES 3. Produces /tmp/meadow-native.png using the game shaders, geometry, textures, matrices and draw commands. The DOM and GL calls are recorded by a Node harness and replayed in a native EGL context with a 24-bit depth buffer. This verifies a static scene, not browser execution, controls, or device performance.
