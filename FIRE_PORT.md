# Fire branch port

Source: Slime-v100-fire-evo-components.zip, Slime-v100/scripts/main.gd (confirmed byte-identical to the working Godot source), inferno_seed.gd, burn_patch.gd, xp_orb.gd and forest_enemy.gd.

- Inferno, three branches capped at 4, combined skill level 10, next level-up offers three evolution choices.
- Fire-only opening offers the three Inferno branches. Other weapon families are not ported yet.
- Original formulas for direct damage, burn, radius, cooldown, branch mastery and evolution scaling; use the code's Blast coefficient 17%, not the stale card description's 22%.
- Sun Fall, Meteor and Flame Cyclone have separate attack behavior. Cyclone reuses the existing web tornado geometry.
- General mods, souls, XP thresholds, level cap 50, reroll and paused selection flow.
- Web visuals for projectiles, explosions and souls are lightweight reconstructions; this is not a bit-for-bit port of Godot's particles/shaders or the FIRE LAB tuner. Full visual parity remains unverified.
- Existing web monster health, movement, scene and player appearance retained. Godot player-size evolution is not part of this port.
- Tests: node --test tests/fire-combat.test.mjs. Device FPS and visual review remain necessary.

## v61 source effects

Six unmodified Godot shader files live under vfx/source. scripts/port-godot-vfx.py adapts shader declarations and built-in variables to GLES3; shader algorithms are retained. Original GDScript visual implementations are also included as provenance.

fire-renderer.js ports the four-mass explosion timing, fire-to-smoke morph, source projectile layers/pulse, celestial material, fall curve, corona/wake, crown mesh, pressure wave, dust and debris. Smoke colors are deliberately lightened to the game's white/grey smoke direction. Meshes/materials are cached; ground flame count is reduced for tablet rendering. The accepted web cyclone is retained. Runtime FIRE LAB controls and exact Godot HDR/post-processing are not included.

Validation: six shader programs compiled and linked in GLES3 (Mesa EGL), with offscreen material previews inspected. In-game tablet rendering/FPS remains to be reviewed.


## Meadow fire study and EXP beads

- `vfx/theme.js` layers the meadow palette over the preserved Godot shaders: warm cream/gold cores, copper/terracotta edges, sage/ivory smoke, controlled emission and softened toon boundaries. Original shader sources remain intact.
- Inferno now has a displaced shaded seed and flickering tongues. Sun Fall and Meteor have tapered animated corona/wakes, an actual hot impact volume, lifted smoke and short sparks. Ground fire, fragments and burn status use a shared instanced flame batch (512 visible tongues maximum). The existing cyclone geometry receives the same palette and a subtle ground ring/embers.
- EXP is a round billboard with a small painted highlight: two triangles per bead and one draw for every visible bead together. Height clears meadow grass, easing down only while entering pickup range. No rotating crystal meshes, lights, trails or per-soul draw calls. Gameplay EXP values and pickup rules are unchanged.
- The skill test menu is available from the header and opening choice. Seven real-combat presets, replay, repeat, pause, single frame, quarter speed, camera and stationary target visibility. It uses separate combat/world objects and restores the original run, including a pending choice and paused state. EXP stress presets add 100/500 beads.
- Validation: combat and skill-lab tests; actual app startup/menu callbacks/run restoration in a DOM/WebGL harness; 11 actual GL programs compiled/linked and 12 skill frames rendered through GLES3 without GL errors. Visual sample frames include all three evolutions and EXP. This is not a browser/device FPS measurement.

## Inferno B dome study / live tuner

Only the selected base Inferno attack is redesigned here: wrapped round seed, grounded hemisphere with initial squash and rapid expansion, held dome, opening shell and four low outward-moving smoke rolls. Sun Fall/Meteor/cyclone keep their v62 designs. Branch upgrades share the base projectile/explosion. Smoke moves outward with deceleration; late lift is small. Geometry is cached, with a maximum of four smoke meshes per explosion. The same renderer supplies gameplay, the tuner and captured frames.

The Godot references were read directly from `vfx/explosion_tuner.gd` (v94 QUICK/SHAPE/MOTION/MASSES/DEBRIS/EXPERT, live replay, save/copy) and `vfx/inferno_tuner.gd` (v100 component solo). The web tuner adapts that workflow for this one approved design: shape axes, timing, projectile wrap/tail/pulse, smoke motion and four per-mass controls, colors, layer/mass solo, deterministic timeline scrub, actual GL frame captures with enlargement, reset, device-local save and validated JSON copy/import. Gameplay damage/range are not tuned by visual controls. Local saved settings apply to Inferno on that browser; copying a preset permits baking it into a future release.

Checks: 13 combat/config/timeline tests; actual app bootstrap + menu + tuner callbacks, save/import rejection, 6-frame capture and run restoration in the DOM/GL harness; 12 actual GLES programs compile/link, selected six Inferno stages rendered offscreen. On sampled Inferno keyframes the renderer uses 3–6 draws, excluding unrelated scene geometry. These are rendering/functional checks, not a device FPS benchmark.

## Inferno baseline revision

Replaces procedural bands with a generated painted flame texture, created from the approved dome reference, in `public/assets/vfx/inferno-flame-paint.png`. The saturated curved flame pattern is mapped onto the actual projectile and hemisphere and remapped through the existing palette controls. Opening flame leaves form pointed curved silhouettes. Four cached smooth-union cloud meshes replace torus sectors; lateral travel, widening, low roll and restrained late lift make the blast direction readable. The default opening phase is lengthened for fire/smoke overlap; saved user presets remain intact.

Visual QA: inspected six key poses and a 54-frame sequence rendered from the actual renderer through GLES3, including the new texture. Review artifacts are `public/review/inferno-keyframes.png` and `public/review/inferno-motion.gif`. These isolate the effect on a plain background; they are not browser screenshots or device FPS measurements. All 12 programs compiled/linked without GL errors, 13 logic tests passed, and the application/tuner harness covered startup, preset save/import, capture and game restoration. The sampled overlap peaks at seven effect draws and 12,412 triangles; no performance improvement is claimed.

## Motion study from supplied explosion clip

Inferno now deforms its hemisphere silhouette during expansion; opening flame leaves twist, flare outward and erode instead of remaining a clipped shell. Seven narrower leaves replace four broad opening sheets. Smoke heads curl over trailing bases with height-dependent travel, lateral stretch and flattening. Advected volumetric noise removes patches and opens holes progressively; opacity is used only for the short appearance ramp. Existing per-mass delays and controls remain usable. Cached geometry and draw counts remain bounded; the extra noise shader work has not been benchmarked on a tablet.

Reviewed the actual rendered sequence after rejecting an initial overly broad opening and too-early smoke disappearance. This is a motion prototype for user review, not a claim of matching the supplied clip's finished visual quality. Logic/tuner checks pass; rendering review and device performance are separate criteria.

## Layered core burst and continuous smoke rim

Replaces the painted explosion shell with four parametric curved gas sheets that rise in sequence from an exposed yellow-white core. Each sheet curls and travels outward; overlapping arcs define the dome silhouette. The paint texture remains only on the flying projectile. One closed, connected, irregular smoke loop replaces all four detached cloud meshes; its cross-section rolls while the rim spreads and later erodes. Removed the obsolete four-cloud controls from the tuner; existing imported presets still parse.

Reviewed six poses and 54 consecutive renders with the gameplay camera's 12:15 elevation ratio (zoomed for inspection). Functional checks include the existing 13 tests and tuner save/import/capture/run restoration harness. Smoke is one draw; sampled full effect phases use up to four draws, excluding the scene. This is not a device FPS measurement or a claim of final reference parity.

## Spherical expansion with azimuthal and upward flow

Replaces separated curved sheets with a connected hemisphere expanding from a yellow-white ignition core. The surface rotates about the vertical axis while the procedural hot-gas field travels upward along its curvature. Moving folds deform the silhouette; no painted texture is sampled for the explosion. The existing connected outer smoke rim is retained. Revised broad toon thresholds and reduced pole deformation after reviewing the initial render.

Reviewed six poses and 54 consecutive frames at gameplay camera elevation; 13 tests and application/tuner harness pass. Review GIF is an actual isolated GLES render. This remains a visual iteration for user review, not a claim of finished reference parity or measured tablet performance.

## Horizontal flow correction and Dream Loop review

Removed the latitude-climbing, angle-based procedural fire field responsible for the crown pinch. Material points now rotate horizontally at constant height (apart from expansion/breakup), with modest differential angular motion. Generated flame artwork is mapped on the sides and blended into a Cartesian planar crown, avoiding the UV singularity at the pole. Added a near-white lower source and a low-cost ground illumination quad. Replaced the parametric smoke tube with one cached smooth-union bank of overlapping irregular lobes, preserving a connected footprint and one smoke draw. Geometry work increased; tablet FPS has not been measured.

The requested Dream Loop skill was found in the earlier experiment checkout and read. Independent offscreen visual reviews scored round1 3.5/10, round2 5/10, round3 5.5/10; direction was verified improved in rounds2/3, while total reference fidelity remained below acceptance. Browser preview was opened through the supervised Sites preview, but the actual browser reports WebGL1 and WebGL2 unavailable. Consequently the in-page frame inspection menu could not be visually exercised in that browser. Mock UI callback checks and 12-program GLES rendering are explicitly not a replacement for browser visual QA. Future work must preserve this distinction.

Round4 scored 5.75/10: horizontal advection retained without crown pinching, but smoke regularity, breakup slivers and ground contact remain below target. Improvement across two rounds was below one point; stop incremental tuning and seek user review before a broader effect redesign. This release retains the direction correction, not a full visual acceptance.

## Player-camera capture and inner source revision

The in-page six-frame capture previously replaced the camera with an 8:12 zoomed inspection view, forced 480x320, removed grass/targets and hid the slime. It now preserves the active camera, viewport dimensions and scene; frame times include ignition and early expansion, and the live scene/time is restored after capture. A mocked app harness checked all six captured camera matrices and 1280x800 dimensions against the pre-capture state. This validates callback behavior only, not rendered browser appearance.

Inferno now uses a separate luminous inner sphere revealed through the outer horizontal fire fronts; no painted flame texture on the explosion. Expansion is slower and monotonic with the earlier overshoot removed. Generated artwork stays on the projectile. Offscreen renders cover six poses and 54 motion frames. Reopening the supervised browser still failed to create either WebGL context. The exact earlier successful storm review workflow was not recovered from history; existing storm source was inspected, but no claim of reproducing that workflow is made. Visual iterations scored 4.5 and 5.2 before the final inner-sphere change; below acceptance.

Final inner-sphere review regressed to 4.7/10. Dream Loop stalled after the architectural change. Experimental renderer is retained on branch inferno-core-study; production keeps the previous fire renderer/settings/review, publishing only the frame-inspection camera fix. Full VFX redesign remains incomplete and browser visual QA remains blocked.

## Saved-frame viewer independent of WebGL

Added public/review/index.html with ordinary image playback, frame stepping, scrubber, key poses, reference comparison and current/study selection. It does not import the game or request any graphics context. Existing GIF hold durations are expanded back into 24fps frame references, retaining duplicate frames. The header links to this page even when game initialization fails. Opened this actual page in the cloud browser, selected a key pose and advanced a frame; screenshot confirmed both render and reference visible. This is successful browser review of saved frames, not live 3D validation.

## v71 authored horizontal burst

Replaces the failed shell/core studies with a 16-pose authored atlas and two tapered 3D flame fronts rotating at fixed latitudes. Shared ground anchors and interpolated dimensions keep expansion continuous; opaque pose selection avoids doubled cores. The bright contact core expands into the dome, then a connected smoke bank receives a fast lateral impulse followed by deceleration and fuller late curls. A soft halo, ground glow and warm inner smoke connect the source to its surroundings. Original projectile artwork and gameplay camera are unchanged. The tuner retains supported timing, shape, rotation, smoke and palette controls; obsolete procedural controls are hidden.

Dream Loop independent reviews progressed 6.5, 6.9, 7.6, 7.9, then 8.1/10 for the final isolated renders (composition 2.6, lighting 2.1, materials 2.7, details 0.7). The final reviewer inspected the target, both latest sheets and 18 motion samples. Remaining gaps: breakup holds a capped bowl longer than the reference, bands remain somewhat repetitive, final smoke uses opacity and ground light is subdued. This is acceptance of the reviewed effect sequence, not a claim of perfect reference parity or measured device performance.

The actual browser saved-frame menu was opened and used to inspect adjacent peak frames, smoke onset and late decay against the reference. It requires no WebGL. All 14 tests and the app/tuner harness pass; actual GLES replay compiled 14 programs and rendered six poses plus 54 motion frames without GL errors. Peak isolated Inferno geometry is approximately 150 triangles; removed unused high-resolution smoke mesh allocation. Tablet FPS and full-scene rendering on the player's device remain unmeasured.

## v72 additional Inferno animation drawings

Preserves the approved 16 source drawings and interleaves 16 companion poses for 32 addressable animation frames. The companion asset uses the built-in image tool with the accepted atlas as reference. Corrected inserted smoke onset, partial dome opening and warm fire-to-smoke collapse after the first review found delayed transitions. Frame anchors and measured source dimensions are separate from desired intermediate dimensions, keeping growth continuous. Late flame-colored fragments decay monotonically to avoid ember pulses. Existing timing/size/palette/solo controls remain supported; no geometry or draw-count increase. Adds one 1254-square texture (approximately 6 MiB decoded RGBA before optional mipmaps); device FPS not measured.

The first sequence review rejected round1 at 7.8. Revised round2 earned 8.2 with a modest motion improvement over the accepted baseline; a remaining ember pulse was then suppressed during late decay. Actual GLES replay compiled 14 programs and produced six poses and 113 samples at 50fps. The browser saved-frame menu was used to inspect consecutive smoke frames. Its sample count is distinct from the 32 animation drawings. All 14 tests and tuner harness pass.

## 48 animation poses

Preserves both accepted sheets and adds a third 16-pose sheet at the later part of each original interval. Metadata now distinguishes 48 measured source shapes from their interpolated display dimensions. The same duration, camera, palette and supported tuner controls remain in use. Fragment selection happens before texture sampling, eliminating the old discarded-neighbor sample; geometry and draw counts remain unchanged. Extra texture memory is about 6 MiB RGBA before mipmaps, with no claim of measured tablet FPS.

Independent comparison of matching 32/48-frame GLES sequences scored 8.2/10: accepted shape/material preserved, modest transition improvement, no new reversal or disconnected smoke regression. Browser saved-frame menu was used at consecutive breakup frames. All 14 tests pass. The reproducible capture and GLES replay tools are now stored in tools/capture-inferno.mjs and tools/render-inferno.py; they render the real isolated Inferno renderer, including horizontal bands and ground glow, from impact onward. This is separate from full-scene/device rendering.

## Independent smoke timing

Exposes smokeDelay and adds smokeDuration in seconds, with a separate masked smoke playback clock. The fire timeline does not depend on either control; a bounded fire-only tail fade removes misclassified residual cloud pixels. Smoke has a short appearance ramp and follows the existing pose sequence to extinction. Effect lifetime and tuner scrub range include delayed smoke, without stretching fire timing. Old saved/imported presets gain the new duration default. User-supplied projectile, motion and smoke-shape values are now defaults; smoke starts at .32s and lasts .8s. Splitting the layers adds one quad draw during overlap, no new textures.

15 logic tests cover separate clocks, delayed smoke beyond fire lifetime, old preset import and existing combat/lab behavior. Actual Inferno GLES captures regenerate saved review frames; device FPS remains unmeasured.

## Flame-strip detail and vegetation occlusion

The two existing 3D latitude strips now have animated flame-shaped cut edges, gold internal streaks, small wave deformation and a modest horizontal rotation increase. No atlas artwork, 48-pose timing or saved tuner key changed.

Solid objects now render before grass/flowers. Their depth is saved on GPU, foliage renders with ordinary depth testing/self-occlusion, then a depth-only fullscreen shader restores solid depth before enemy projectiles, souls, every fire/evolution effect and the storm preview. Effects consequently ignore grass depth while still respecting terrain, trees, monsters and player depth. No CPU readback or duplicate scene geometry; one depth resolve and fullscreen depth draw per grassy frame. The helper resizes with the canvas. Device FPS not measured.

GLES regression check validates both sides of occlusion with pixel assertions and 4x MSAA: VFX remains hidden behind a solid occluder, appears over vegetation, and GL reports zero errors. Fifteen existing tests pass. Fresh independent isolated Inferno review scores 8.3/10; approved dome/core preserved with more pointed moving flame features. Saved-frame menu is inspected separately from the synthetic depth regression.

## v78 — scatter and lingering fire
- Actual damaging embers use small hot heads, short tapered tails aligned with projected velocity, and visual ballistic height. Existing hit positions, count, speed, lifetime and damage remain the combat authority.
- Ground patches use one cached mesh draw per patch (12 curved flame cards), with staggered curl, varying heights and cel folds. Patch age grows deterministically; fade follows remaining combat lifetime.
- Added saved preset fields for ember size/arc/tail and ground height/sway/final fade. Skill Lab seek reconstructs actual branch embers and patches; solo selections pick the corresponding branch. Old presets acquire defaults.
- Saved GLES review sets: scatter (113 time samples), ground (161); new frames are viewer captures, not additional sprite textures loaded by gameplay.
- Validation: existing lab/tuner tests, branch seek/lifetime checks, GLES capture with zero GL errors, saved-frame browser inspection. Dream Loop independent review 6.6 -> 8.0; remaining minor row alignment/sharp tips noted. Full-scene tablet FPS not measured.

## v79 — scorched ground and vegetation recovery
- Lingering fire now emphasizes irregular brown ash, sparse ember flecks and five short flames; independent saved-frame review 8.6/10 against the revised brief.
- Burn recovery reuses the existing 96x96 grass-bend RGBA texture's unused alpha channel. Fire stamps only nearby field cells at the existing 20Hz upload rate. No per-blade CPU work or additional vegetation vertex texture lookup.
- Blast/meteor/sun impacts, fire projectiles/embers, patches and cyclones stamp the field. Burned vegetation shrinks/disappears, ground darkens, and regrowth begins 6 seconds after the last full burn, completing over 3 seconds. Soft borders can recover earlier. Reheating refreshes the timer.
- Lab and live run use separate fields; encounter reset clears burns. Ground shading adds one field lookup per ground fragment. Device FPS and full-scene appearance remain unmeasured; field lifecycle assertions and actual main GLES shader compilation/link passed.

## v80 — clean ground tint, detailed flame placement, mild ember scorching
- Replaced mottled ash overlay with a simple softly edged orange-red ground circle.
- Added persisted groundWidth, groundSpread, groundCount and groundOpacity controls; width is independent from flame height and gameplay area. Old presets acquire defaults.
- Ember grass marks now use radius .16 and 18% burn strength: partial grass loss and recovery in at most 1.62 seconds after contact. Main fire remains unchanged; weak embers cannot shorten an existing stronger burn.
- Burn lifecycle tests and tuner tests pass; updated GLES capture and independent review 8.8/10. Saved-frame review does not measure full-scene device FPS.

## v83 — Thorn 2D sprite experiment
- Baked existing Thorn mesh poses with the exact character shader/outline: 8 yaw directions x 32 walk poses, 128px padded cells, one 2048px RGBA atlas. All frames use world size1.35 and centered ground anchor; bake asserts no clipping.
- Experimental Thorn display defaults to sprite in gameplay camera; settings allow immediate 2D/3D comparison. Side/top cameras and unavailable atlas fall back to original model. Existing collision, shadow, navigation, grass bend and distance-based walk phase stay in use.
- Runtime applies canopy shade, fog and hit tint to baked sprites. Each displayed Thorn uses one quad/one draw rather than two 528-triangle mesh passes. Both assets remain loaded for comparison, so this experiment is not a memory optimization; atlas adds about16MiB without mipmaps. No device FPS improvement claimed.
- /review/thorn.html provides ordinary Canvas2D playback, 8 directions, stepping and scrubbing. Main sprite shaders compile/link in GLES; phase/direction wrap assertions pass. Source model was already GPU pose-baked, with no runtime skeleton to remove.
