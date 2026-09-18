# Pond Turtle — approved video + original still poses (2026-09-18)

Parent: deployed main `f535f1dd0eb2d78f7e4153fb63230716a8dc7e44`, game tree `28af42874d11c618a130db9fb9c1800d1a77b53a`. Continue `game/` only, retaining the larger Water Calf, smaller Spark and the latest Spark charge/range tuning. No retired creature is restored or replaced.

## Original artwork, not a new animation generation

`art/turtle/approved-walk.mp4` is the user's original 902x512, 30 fps video. Twelve frames are sampled **from the second complete gait cycle**: 72,78,84,90,96,102,108,114,120,126,132,138. They remain in chronological order; frame 144 is the next-cycle return, not a duplicated end frame. The generated six-pose action sheet from the conversation is NOT used as the walking animation.

`approved-poses.png` is the lossless original corresponding to the user's final uploaded `approved-poses-upload.jpg`: original hurt pose, **empty shell only** on death, and front-right three-quarter Shell Guard. No pose, viewpoint, limbs or shell markings were regenerated. Source files and source decoded frame hashes are retained in atlas metadata. The portable extraction script is in `tools/prepare-turtle-assets.py`.

Background removal retains closed cream skin/flower regions, removes the external beige ground shadow, and unpremultiplies the off-white edge. Walk saturation is corrected only by 1.045 to compensate for video encoding; no whole-character tint. The static poses use their original pixels. Shell/body footprint, ground contact and right-facing reference are registered without flipping the lighting independently. Left-facing uses the same approved sprite mirrored, as the other new species do.

One 1536x1536 lossless alpha WebP (4x4 cells of 384px), common pivot `[192,328]`: twelve walk cells, hurt 12, shell-only death 13, guarded body 14, separate aura 15. The aura's original white ribbon cores are preserved with a reviewed matte. Its opacity and slight breathing motion are independent from the body; the body never double-exposes, rotates to front-view or changes scale to animate the shield. Both layers share the same transform. 9 MiB GPU texture, one body quad plus one aura quad only while guarding, no per-frame uploads or video playback during the game.

## Behavior

Independent `turtle` ID, unlock at **120 seconds**. Current initial tuning: 44 HP, speed .64, radius .42, stride .92, contact damage 5. No Turtle elite. Frog remains at 0, Spark at 60, Water at 180, boss at 300 seconds. Existing cap and spawn-frequency formulas stay unchanged.

Pursuit and walk phase use the original shared collision/navigation and actual travelled distance. Shell Guard activates when a visible player is within 3.2 units or after receiving an unguarded hit; the original hurt pose is shown before starting a requested guard. It crouches/charges .30s, guards for 2.40s with **70% incoming-damage reduction**, and releases the shield for .25s. Cooldown is 6.5s from activation. Guard is self-only, not invulnerability and not a buff to nearby enemies. The turtle stops its pursuit/contact attacks during the guard sequence, then returns to the existing walk cycle. Guard timers expire even while frozen so freezing cannot create indefinite protection.

All skill families, burning and poison use the existing central damage function. Turtle's reduction is applied once before HP, damage numbers and aggregate damage totals. The independent storm-damage path also uses the same reducer. Other species get their original damage values unchanged. Death immediately disables protection and uses the exact empty-shell pose for 1.0s (last .25 fades). Existing kill/EXP reward/removal still runs once.

## Scope and proof

Only three pre-existing game files change: the main bundle (12 narrowly scoped hooks), the independent roster and the enemy-test selector. All **1,254 other parent runtime files remain byte-identical**, including Water/Spark modules, all existing art, grass, terrain, music, cards and player skills. Three Turtle runtime files are added. `turtle-integration-proof.json` reverses every exact bundle hook to last deployed main; the existing Spark/roster/Water provenance chain still reconstructs the original finished Frog.

`npm test` includes original-source hashes, walk order, all states and facings, guard timing/reduction/cooldown, self-only protection, frozen expiration, source preservation and real-renderer uniform spies. Existing browser regression assertions are preserved; time/roster expectations intentionally include Turtle. The Spark-only mixed screenshot still explicitly selects its original three species. `tests/turtle-browser.mjs` additionally tests actual game guard transitions, central damage for every skill family, storm damage, hurt, death, rewards, all 12 walk frames, mirrored states, all cameras and all four normal species together.

Only production destination: `https://slime-evolution-five.vercel.app`. PR/CI success is not deployment; the original-production workflow verifies the exact commit, every deployed game-file hash, and actual live Spark + Turtle behavior. CI is not physical iPad/Android FPS evidence.
