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
