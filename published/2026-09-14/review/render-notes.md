# Inferno horizontal burst

Asset: public/assets/vfx/inferno-atlas.png. Generated with the built-in image tool, then integrated into the actual GLES/WebGL renderer. The green matte is removed by the fragment shader; it is not shown in game. Asset metadata measures shared anchors and silhouette dimensions. Original projectile artwork is preserved.

Prompt brief: 4×4, 16-frame fantasy-toon anime explosion. A round bright yellow source grows into a grounded spherical dome. Broad irregular horizontal latitude flame fronts travel sideways around the vertical axis, never converge at the crown and never spiral around the visible core. A connected pale billowing smoke bank spreads laterally and gradually becomes wisps. Fixed camera and shared ground anchor; clean green chroma background. Final edit specifically replaced front-facing pinwheels with horizontal flame layers while preserving smoke and layout.

The runtime adds two tapered 3D latitude flame fronts, continuous size interpolation, opaque pose sampling, stage timing and ground glow. Review images are actual isolated renders from the game's renderer, shown in the browser's saved-frame menu. They are not screenshots of the entire live 3D scene. Tablet FPS has not been measured.

Final independent sequence review: 8.1/10 (composition 2.6, lighting 2.1, materials 2.7, details 0.7). The saved-frame browser viewer was exercised at peak, breakup and late smoke. Remaining imperfections include repetitive flame bands, a capped breakup silhouette, and opacity-based final smoke disappearance. No device FPS claim.

32-frame extension: source artwork remains unchanged; public/assets/vfx/inferno-inbetweens.png supplies 16 interleaved drawings. Generated using the built-in image tool. Prompt: create a companion 4×4 atlas of halfway poses between each neighboring source drawing, preserving camera, palette, horizontal flame motion and connected lateral smoke. Correction prompt: add embryonic smoke at row2/col4, partly open row3/col2, replace row3/col4's large flame with warm smoke and a nearly extinguished source, progressively diminish last-row curls. Late ember opacity is controlled by the runtime.
Independent revised-sequence review: 8.2/10, modest improvement; late ember pulse feedback addressed afterward. Viewer now contains 113 rendered time samples at 50fps, distinct from the 32 source animation poses.

48-frame extension: inferno-inbetweens48.png was created with built-in imagegen using both accepted atlases as references. Brief: 4×4 equal green-matte cells, each a 75%-progress drawing between neighboring original keys, preserving horizontal flame motion, round core, coherent silhouette and connected lateral smoke. No extra scenery or labels. Previous 32 drawings are retained. Independent matched-sequence review: 8.2/10; no concrete new shape or direction regression. Current saved sequence starts at impact, 50fps sampling, and uses the game's actual Inferno renderer.

Smoke timing update: the saved sequence uses user-supplied tuning with smoke beginning .32s after impact and dissolving over .8s. Smoke timing is independent from fire timing. These are actual renderer samples, not a new artwork design.

Flame-strip detail update: animated pointed cut edges, moving gold streaks and a small wave replace the smooth ribbon appearance. Atlas images and 48-pose layout unchanged. Independent sequence review: 8.3/10. Vegetation visibility uses a separate tested scene-depth restore; isolated frames do not depict the full meadow.


## Sun Fall volume study — 2026-09-12

Status: **not accepted for 2D baking**. Tested a closed swept mesh, then a procedural density volume with a broad foot, tapering height, clockwise phase, height-dependent shear, thinning and directional erosion. Both attempts still read too much like folded sheets. The final volume prototype is retained in `vfx/sunfall-smoke-volume.js`. The ordinary game keeps its previous smoke renderer; the offline capture injects this prototype through the renderer's optional smoke factory. Fire, projectile textures and gameplay behavior were not redesigned. No final 2D asset was baked.

The user's video is used for force, mass and timing only. The latest written silhouette requirement overrides round billows in older reference art.

Evidence: regenerated combined, fire-only, smoke-only, quarter-turn side and isolated angular-sector sequences, 72 samples each at 30 fps and 768 square pixels. The side set changes camera yaw, preserving game camera inclination. The isolated group is a clipped angular sector, not an independent simulated plume. The rendering tool replays the shared game fire shaders and prototype density shader in offscreen GLES; these are neither full-game captures nor device-performance measurements. GLES reported zero errors. Browser saved-frame review inspected combined/solo frames and consecutive frames, plus frame stepping and playback controls.

Fresh independent visual judge: **FAIL**. Specific blockers: (1) smooth panels and nearly continuous hollow ring read as folded ribbon, (2) clockwise crest displacement and progressive peeling are weak through the main hold, (3) late fragments have straight cuts and horizontal sampling stripes. Root visual inspection agrees. Build/shader success is not visual acceptance. No FPS measurement or claim of 3D being faster or cheaper.

Next visual work should resolve silhouette and crest transport on one small group before repeating the full ring or attempting a 2D bake. Do not spend another round merely smoothing the current annulus: it preserves the failed shape.


## Sun Fall advected-density follow-up

Replaced the procedural ring field with a reproducible offline 3D density study. The emitter has three asymmetric tapering crests with separate broad feet and unequal density. A prescribed clockwise velocity field, stronger shear with height, toroidal roll, and two scales of curl transport the density; semi-Lagrangian predictor/corrector advection clamps against departure-neighborhood bounds. Density erosion makes weaker regions disappear first. This is not a pressure-solved fluid or measured real-world force simulation.

Two intermediate directions were rejected: rigid swept volumes still read as folded objects, and a continuous ring emitter produced a rounded collar. The final source avoids both a uniform torus and spherical puff construction. Palette uses white and cool grays with transient fire warmth. The reference video remains motion/force/mass only. No source-video pixels were copied or published.

Final cache grid: 128×64×128, float16, 61 density states at 30 Hz. Small 3D filtering and a box-bounded 320-sample raymarch reduce thin-edge sampling artifacts. This expensive rendering path is offline only. Gameplay still uses its existing renderer, fire, projectile and settings. No device FPS result or final 2D atlas is implied by the saved-frame rate.

Regenerate from the repository root:

```sh
python tools/simulate-sunfall-smoke.py
python tools/simulate-sunfall-smoke.py --single
node tools/capture-sunfall.mjs sunfall-smoke
python tools/render-sunfall.py sunfall-smoke
```

Repeat capture/render for `sunfall`, `sunfall-smoke-study`, and `sunfall-smoke-side`. Full captures have 72 frames at 30 fps. Simulation `--draft` uses a 96×48×96 grid; capture `--draft` uses 24 samples at 10 fps and writes renders under ignored `.dream-loop/draft/`, never replacing the public review set. Caches are generated under ignored `.dream-loop/`; they are not required by the hosted viewer. Requirements are Python with NumPy, SciPy and Pillow, plus the existing GLES/EGL replay environment. The immutable v102 comparison is available in the viewer.

Final independent visual review: **single-group movement/shape is partial; combined final 2D bake is FAIL**. Clockwise transport is visible in the single-group sequence, and three unequal groups remain distinguishable. Consecutive frames 039–040 progress coherently. However, study frame 024 starts rounded; 033–054 becomes a thick scoop/slab with a pointed edge. Combined 030–040 has three substantial panels. A small sliver separates at 048, but the main masses persist through 054 and mostly erode by 060–063. Root inspection agrees: the requested thin crest bodies and progressive peel/break sequence are not yet achieved. No final 2D bake or gameplay replacement was made.

The last correction reduced overlapping sources to three, narrowed upper cross-sections, and weakened the density at each neck. It improved separation but did not pass the visual gate. Treat this as an unfinished study, not an accepted baseline. Do not repeat only density-threshold tweaks and claim that the material problem is solved.

Validation: all current Sunfall viewer PNGs decoded successfully; each of the four refreshed GIFs lasts 2400 ms. The shared fire/prototype smoke shaders rendered 72 samples per set without GLES errors. Saved-frame browser QA inspected combined and isolated views, consecutive frames, v102 comparison selection, and playback controls. These checks do not establish visual acceptance, full-game validation, or device FPS.


## Sun Fall texture-flow revision

After research, stopped volume simulation. The new `vfx/sunfall-smoke-flow.js` uses a generated grayscale density texture, curved cards, coherent UV distortion, two moving noise scales and age-driven erosion. Mip-filtered texture density supports both shading and the mask, avoiding high-frequency metallic-looking shading. Complementary UV regions detach pieces of an existing plume; those pieces gain clockwise and radial separation before dissolving. This is art-directed real-time material animation, not fluid simulation or a final baked volume atlas.

Research used:
- https://realtimevfx.com/t/pendacos-sketch-book/22172 — inspected main-texture and erosion shader graphs: scrolling UVs, separate noise layers, masks and erosion.
- https://simonschreibt.de/gat/stylized-vfx-in-rime/#update14 — matching erosion and shading structure preserves the impression of mass.
- https://www.vfxapprentice.com/courses/booms-and-blasts — public course breakdown distinguishes lightweight meshes/textures/dissolve maps from volume simulation; no paid lessons were accessed.

One built-in imagegen request created `public/assets/vfx/sunfall-smoke-flow-density.png`. No uploaded video pixels were used. Prompt: One square monochrome smoke density texture on pure black; single stylized anime blast ground-smoke plume; wide low grounded foot flowing into 2–3 unequal curling swept wisps pointed upper left, airy tapered hooked tips, asymmetrical lobes, no circular bead cluster, spherical donut or flat triangular sail. Continuous grayscale density, white thick lower/central mass, gray thinning sheets, dark separating grooves. Isolated with padding; no scene, text, shadow, outline, color or checkerboard. Animation is handled by the shader.

First independent material review: direction and shape are usable as a baseline. Clockwise transport, stretching and thinning are visible; the remaining requested correction was to detach existing crest pieces and transport them independently, rather than only erode arcs in place. Follow-up independent review: the breakup blocker is resolved sufficiently for a baseline. Full frames 015–019 show fragments separating above the upper-left arc and gaining distance; study 018–021 shows a tip moving left/up separately from the lower foot. Full frame 021 preserves detached pieces above the thinning ring. The isolated peel is subtle until about 1.8s, but combined groups establish it earlier. This is baseline visual acceptance, not device or full-scene approval. The critic found one unreadable draft frame (020); final published frames are regenerated and separately integrity-checked.


The new flow material is now the default used by `createSunfallRenderer`, with its texture loaded by the ordinary game startup. Final captures use that default without prototype injection. Fire, projectile artwork, ability timing and gameplay logic remain unchanged. Old volume and mesh files remain historical, not runtime dependencies of Sunfall. No volume atlas was baked: the game animates the 2D density material on simple 3D cards directly. Device FPS and full-meadow occlusion have not been measured here.


Final validation: four sets rendered sequentially at 72 samples/30fps through the shared default renderer with zero GLES errors. All 447 Sunfall viewer PNG references decoded successfully, including the regenerated counterpart of the bad draft frame. Saved-frame browser QA inspected study 1.400s and consecutive 1.433s, combined 1.067s, set selection, playback and stop. `sunfall-flow.mp4` is encoded from the 72 combined rendered PNGs, not generated video. Production build passed. These establish the isolated effect and review viewer, not measured device performance or full-game scene occlusion.


## Targeted depth, flow and palette correction

User accepted the baseline but identified thin sheets, insufficient visible noise motion and the wrong smoke color. Added a tapered two-surface cross-section and geometry-based lighting, increased coherent UV transport and applied moving density variation throughout the plume life. Dark texture folds retain body earlier; erosion opens them later. Palette is warm ivory with warm gray shadows, replacing cool gray. This is still a textured mesh, not a fluid volume.

Root visual review finds fuller feet and changing internal shading, but some views still read as thin skins. Mass is not a final visual pass. No new independent review or numeric score was obtained. Only the existing four PNG review sets were refreshed (72 samples each, zero GLES errors); existing videos/GIFs/contact sheets remain historical v104 output and were not regenerated. Browser review checked consecutive smoke frames and the combined effect. No device FPS or full-game occlusion claim.


## Dream Loop: substantial smoke parts

Latest user request explicitly permits irregular overlapping 3D chunks, replacing the earlier interpretation that led to thin cards. Reused the target and generated density texture. Three bounded worker passes are validated by the owner; a separate visual critic scores actual offscreen PNGs. No new image generation, videos, GIFs, or contact sheets. Candidate capture stays separate from the gameplay default until the visual gate.

First independent review: **5.8/10, fail** (mass 2.2/4, internal flow 0.6/2, silhouette/breakup 1.3/2, palette 1.7/2). Closed swept solids still read as folded blades; smooth shading and clean silhouettes did not establish noise flow.

Second independent review: **7.6/10, fail** (mass 3.3/4, internal flow 1.5/2, silhouette/breakup 1.3/2, palette 1.5/2). Overlapping solid billows and depth handling resolved the main thin-sheet defect; changing patterns and progressive erosion became visible. Remaining issues were mottled/shiny-rock material and perforation before a readable stretch/peel phase. Third pass targets those two issues.

Third review: **7.4/10, fail** (mass 3.4/4, internal flow 0.7/2, silhouette/breakup 1.6/2, palette 1.7/2). Stretch-before-erosion and matte shading improved, but the material change suppressed visible internal flow. A narrowly scoped material correction restores broad advected gray/white structure while retaining the third pass geometry and erosion.

Final correction review: **7.6/10, fail** (mass 3.4/4, internal flow 0.9/2, silhouette/breakup 1.6/2, palette 1.7/2). Broad gray variation improved without shiny mottling; real volume, stretch and late erosion remain convincing. Interior flow is still not clearly distinguishable from geometry-driven shading. No passing score is claimed. Stop this bounded study rather than continue cosmetic loops.

The complete candidate is saved in `vfx/sunfall-smoke-mass-study.js`. The four current PNG sets explicitly show the unapproved mass study; game default remains the prior flow material. Regenerate each with `node tools/capture-sunfall.mjs SET --mass-study` then `python tools/render-sunfall.py SET --frames-only`. All project source is retained for continuation. No final 2D bake, new video or device FPS measurement.

Final engineering validation: four sets of 72 offscreen samples rendered with zero GLES errors; all 288 updated PNGs decoded. Saved-frame browser QA checked the study labeling and displayed the current smoke frame. These checks do not override the failed visual gate.


## Last 3D attempt — motion gate first

The user rejected the prior result as at most 3/10: not merely faint noise, but incorrect smoke behavior. Historical independent aesthetic scores do not establish acceptance. They authorized one final 3D attempt before switching to drawing.

A single replacement candidate integrates actual surface vertices through a shared, time-varying local vortex and shear field (18 midpoint steps), with material coordinates carried by the resulting deformation. This produces local motion even when orbital spin is zero. Reused existing assets; no generated media or fluid caches. The existing study module now preserves this complete final candidate.

Independent motion gate: **FAIL**, with no additive aesthetic score. Frames008–019 retain a smooth continuous shell and sharp ribbons, reading as silk or soft plastic rather than tumbling smoke. Frame021 becomes thin curved scraps without convincing preceding smoke shedding. The owner agrees. This ends the authorized final 3D attempt; recommend drawn animation, not another geometry/noise-parameter loop.

Reproduction: capture each current Sunfall set with `--mass-study`, adding `--no-orbit` for `sunfall-smoke-study`, then render with `--frames-only`. The single-group viewer explicitly labels this no-orbit diagnostic. Gameplay is not replaced by the rejected candidate. The supplied video was inspected only for force/mass/motion; its pixels are not published. No final 2D bake, new video, GIF, contact sheet or device-performance claim.


Inferno video import: 48 distinct source frames, two RGBA atlases. New size/aspect/brightness/opacity and rise/peak/fade/speed controls. Original clip ends in smoke: final playback opacity fades out. Independent still review found no blocking matte, framing or source-fidelity issues; consecutive frames show changing shapes. This is not user approval or full gameplay/FPS validation. Saved-frame browser and GLES shader replay pass.

Four supplied clips imported: Sunfall48, cyclone48, meteor4 flight +44 impact, fireball4. Original RGB with background-specific matte; fixed anchors and game-controlled projectile translation. New tuners persist size/aspect/brightness/opacity/playback speed; meteor impact duration and cyclone rise/fade are visual only. Sunfall uses existing independent fall/burst/smoke times. Removed old cyclone shell from game drawing and replaced old projectile appearance. Thorn per-draw texture rebinding and opaque Inferno matte patch included. Independent saved-image review found no blocking core holes or anchor jumps; fine wisps are reduced and some edges remain harsh. 180 simulated game updates/render submissions per skill passed finite-uniform checks; actual GLES image renders passed. Browser tuner switching/save and saved-frame viewer passed; this is NOT full-game WebGL or device FPS validation.

Sunfall anchor correction: source contact is approximately(344,286), not(344,340); runtime anchor now maps that contact to the exact combat origin. Optional damage guide draws actual event/fx radius and center in the lab. Cyclone uses36 sustain +24 dissolve frames; a short bridge from active loop pose removes the hard jump into dissolve. Default visual dissolve .75s. Detached baked particles suppressed during sustain; procedural tapered flames and wind arcs orbit in world space, split behind/in front of video. Independent first review found overly graphic flame bands and sparse wind; adjusted flame contours/palette and strengthened wind. Final full-game visual acceptance remains pending. GLES render and simulated combat/render checks passed; device FPS not measured.

Fireball core matte correction: preserve warm cream/yellow core opacity across all four flight frames. Central 24×25 px samples are alpha255 in every frame (previous minima95–131). Updated existing four offscreen GLES review frames; no full-game/device FPS claim.

Motion follow-up: Sunfall contact pivot276 transitions to mature ground-ellipse pivot267 instead of one guessed265.16 pivot. Meteor uses full0.55s descending trajectory from7 world units, accelerates into the collision point, and animates flight at18fps independent of travel. Cyclone base lifetime4.2s with+10% per duration mod;6.3s at5 stacks. Six-frame premultiplied overlap closes the loop; adjacent-frame interpolation and two moving tracks blend into dissolution. Saved-frame review uses real offscreen GLES shaders; device FPS/full gameplay remains unverified.
