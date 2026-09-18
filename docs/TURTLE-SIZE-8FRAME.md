# Turtle larger body and eight original walk poses — 2026-09-18

Parent: tested palette main `92cb0b2cb5cc6614fd3045b15649e3af41e7132a`, game tree `0c1fa1d4f954d0de18e812f00ac768edf0ff6bbb`.

Body size changes from 2.16 to 2.42 world units (about +12%). The same renderer applies it to walking, hurt, shell-only death, guard body and its attached aura. Foot pivot `[192,328]`, relative aura pulse, facing and camera projection are unchanged. Collision radius, HP, movement speed, damage, guard duration/reduction/cooldown and other creatures remain unchanged.

Playback now uses exactly eight cells from the existing color-corrected atlas: `0,1,3,4,6,7,9,10`, representing original video frames `72,78,90,96,108,114,126,132`. The sequence covers the same full distance-driven gait cycle, with no duplicate closing frame, new pose, regenerated limb, cross-fade or change to the movement clock.

The atlas and its extraction metadata remain byte-identical to palette main. Metadata still accurately describes all twelve stored source cells; `TURTLE_WALK_SEQUENCE` in the independent Turtle module selects the eight played cells. The unused four cells are not played. This preserves every pixel of the palette fix, transparency and all static poses and avoids a needless image re-encode. Texture dimensions/memory are unchanged; no FPS improvement is asserted.

Only `game/assets/pond-turtle.js` changes at runtime; all other 1,259 runtime files are preserved. Tests reverse the three exact source edits before applying the existing color-baseline audit; none of the palette, alpha, guard, damage, reward, source-art or other-creature checks are removed. Browser tests additionally verify two complete eight-pose cycles, all eight rendered poses, size 2.42, both facings, cameras and original color texel hashes.

Do not deploy `pond-turtle-bigger-8frames-local.zip` from the earlier turn: it was assembled from pre-palette main 9046105. Apply only these narrow edits to current main. Original production remains `https://slime-evolution-five.vercel.app`; verify CI and actual live commit/file hashes/poses before reporting completion.
