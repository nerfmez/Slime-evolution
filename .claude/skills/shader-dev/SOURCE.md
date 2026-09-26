# Source

Third-party skill, copied unchanged (plus its MIT `LICENSE`) at the owner's request on 2026-09-26.

- Upstream: https://github.com/MiniMax-AI/skills/tree/main/skills/shader-dev
- Commit: 60aaae52bb2af8162732751a4332f62a5fef518b
- Use: GLSL reference (noise/FBM, domain warping, 2D SDF, polar UV, particles, WebGL2 pitfalls) for the painted skill effects in `vfx/painted-renderer.mjs`.

Project rules still win: effects are build-time patches, the look follows `docs/PAINTED-VFX.md`, and the skill's ShaderToy/standalone-HTML templates are only references. To update, recopy from upstream and change the commit above.
