# Archived experiment — removed from the game

The user requested removal of all added bushes and weeds. The following describes historical experiments only; see `pond-edits.md` for the current scenery.

# Current tree-matched revision

Built-in image generation used `public/assets/tree-reference-b.png` as the direct style reference. Current bush assets are `public/assets/bush-tree-low.png` and `public/assets/bush-tree-medium.png`; framing is in `plant-sprites.js`.

Prompt: Transform the reference tree crown into a low two-lobed bush / asymmetric medium three-mass bush. Preserve the same rounded watercolor brush dabs, grain, warm yellow-green highlights, sage and olive shaded patches and original lighting. Simplify individual leaf marks only about 20%. Remove the tall trunk and fill foliage down to the base. Avoid realistic veins, pointed outlines, smooth vector clouds, new art styles, ground and cast shadow.

Bushes now retain their shape, react to entry through a damped spring, settle while stationary and visually occlude the slime inside. Small herbs retain bending and interior clipping.

---

# Vegetation sprite designs

Created with the built-in image generation tool. Five final sprites replace procedural leaf geometry. The two bush designs were revised following the request for simple cartoon foliage masses, rather than individually detailed leaves.

## Final sprites

- `public/assets/round-shrub-cartoon.png`: broad, rounded cartoon shrub, used on drier woodland and meadow margins.
- `public/assets/willow-shrub-cartoon.png`: asymmetric cartoon shrub, used beside water.
- `public/assets/fern-clump-painted.png`: arching fern fronds for shaded damp pockets.
- `public/assets/broadleaf-weeds-painted.png`: sparse upright stems with separated leaves.
- `public/assets/seed-grass-painted.png`: airy grass with pale seed heads.

The bush images contain neutral checker backgrounds; the foliage shader removes neutral pixels. Other sprites keep their generated alpha. Original pixels are preserved. UV framing and aspect ratios are recorded in `plant-sprites.js`. Six strips per sprite provide anchored bending. Plants inherit canopy shade and blend gently into the ground pigment near their roots.

## Original prompt set

### round-shrub

Create one production-ready isolated 2.5D game vegetation sprite on genuinely transparent background, PNG alpha. Stylized hand-painted watercolor storybook meadow game, simple readable silhouette at small size, visible broad brush washes and distinct leaf shapes, NOT photorealistic, NOT low-poly triangles, not a dark shadow or ground stain. Three-quarter slightly elevated game view. Soft warm upper-right daylight, sage green midtones, pale yellow-green highlights, restrained olive shadows. No ground patch, no cast shadow, no pot, no frame, no text. Entire plant fully visible with modest transparent margin, roots bottom center. Leaves and stems should clearly read as upright living plants, subtle asymmetry, no perfectly spherical topiary. A medium low shrub, wide softly domed asymmetrical crown with THREE unequal branching lobes. Many broad rounded oval leaves grouped into readable clusters, lighter outer shoots, a few short warm brown branching stems visible near the base. Low dense foliage reaches nearly to the roots. Width about 1.5 times height.

### willow-shrub

Create one production-ready isolated 2.5D game vegetation sprite on genuinely transparent background, PNG alpha. Stylized hand-painted watercolor storybook meadow game, simple readable silhouette at small size, visible broad brush washes and distinct leaf shapes, NOT photorealistic, NOT low-poly triangles, not a dark shadow or ground stain. Three-quarter slightly elevated game view. Soft warm upper-right daylight, sage green midtones, pale yellow-green highlights, restrained olive shadows. No ground patch, no cast shadow, no pot, no frame, no text. Entire plant fully visible with modest transparent margin, roots bottom center. Leaves and stems should clearly read as upright living plants, subtle asymmetry, no perfectly spherical topiary. A medium waterside shrub, spreading irregular airy silhouette with narrow pointed willow-like leaves, softly arching delicate olive stems, distinct sage green leaf clusters with warm cream-green new growth. Low center and one taller branch on the right. Width 1.3 times height.

### fern-clump

Create one production-ready isolated 2.5D game vegetation sprite on genuinely transparent background, PNG alpha. Stylized hand-painted watercolor storybook meadow game, simple readable silhouette at small size, visible broad brush washes and distinct leaf shapes, NOT photorealistic, NOT low-poly triangles, not a dark shadow or ground stain. Three-quarter slightly elevated game view. Soft warm upper-right daylight, sage green midtones, pale yellow-green highlights, restrained olive shadows. No ground patch, no cast shadow, no pot, no frame, no text. Entire plant fully visible with modest transparent margin, roots bottom center. Leaves and stems should clearly read as upright living plants, subtle asymmetry, no perfectly spherical topiary. A small lush woodland fern clump, six unequal arching fronds with clearly paired leaflets, one partially curled new shoot, fronds fan outward from one rooted base. Pale sage and warm yellow-green watercolor, bold readable frond shapes rather than microscopic detail. Width 1.4 times height.

### broadleaf-weeds

Create one production-ready isolated 2.5D game vegetation sprite on genuinely transparent background, PNG alpha. Stylized hand-painted watercolor storybook meadow game, simple readable silhouette at small size, visible broad brush washes and distinct leaf shapes, NOT photorealistic, NOT low-poly triangles, not a dark shadow or ground stain. Three-quarter slightly elevated game view. Soft warm upper-right daylight, sage green midtones, pale yellow-green highlights, restrained olive shadows. No ground patch, no cast shadow, no pot, no frame, no text. Entire plant fully visible with modest transparent margin, roots bottom center. Leaves and stems should clearly read as upright living plants, subtle asymmetry, no perfectly spherical topiary. A small sparse wild broadleaf weed patch, five to seven upright and leaning stems of unequal heights, small oval and lance shaped leaves at alternating nodes, two tiny cream buds. Leaves separated by clear transparent gaps so stems are visible. Natural roadside volunteer plants, not flowers arranged as bouquet. Width approximately same as height.

### seed-grass

Create one production-ready isolated 2.5D game vegetation sprite on genuinely transparent background, PNG alpha. Stylized hand-painted watercolor storybook meadow game, simple readable silhouette at small size, visible broad brush washes and distinct leaf shapes, NOT photorealistic, NOT low-poly triangles, not a dark shadow or ground stain. Three-quarter slightly elevated game view. Soft warm upper-right daylight, sage green midtones, pale yellow-green highlights, restrained olive shadows. No ground patch, no cast shadow, no pot, no frame, no text. Entire plant fully visible with modest transparent margin, roots bottom center. Leaves and stems should clearly read as upright living plants, subtle asymmetry, no perfectly spherical topiary. A small airy clump of wild meadow grasses with thin arching green blades and FOUR delicate buff-gold seed stalks of different heights, seed heads leaning in different directions. Fine but readable stems, sparse natural tufts, green rooted base, restrained wheat-cream accents. Taller than wide, not a dense grass wall.

## Bush revision

Simplify into 3–5 broad, opaque leafy volumes with scalloped irregular outlines, three softly textured paint values, sage midtones, warm yellow-green highlights and gentle olive undersides. Remove visible branching networks, individual leaf veins and detailed leaf mosaics. Keep only a few leaf-edge marks. Preserve the watercolor game style and root alignment; no ground or cast shadow.

### Grounded planting and meadow integration

Bush and herb placements now share one source for geometry and bush-only shadow footprints. Small herbs use local meadow pigments with a gradual root transition; they cast no shadows. Fewer irregular herb pockets replace the repeated companion next to every shrub. Shrubs retain tree brushwork with subdued yellow, overlap in unequal groups, and receive a compact baked ground shadow. A rooted convex crown supplies real depth, replacing the previous uniform camera-depth displacement. Contact still produces a brief whole-bush spring response; no flattening or slime cutout is used for bushes.

Validation: native GLES render of the production shaders at the original tree and pond, including slime inside and in front of a medium crown; shrub contact/settling and movement checks. Device FPS remains unmeasured in this environment.
