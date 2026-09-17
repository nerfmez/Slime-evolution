# Water Calf on the completed Moss Frog baseline

This branch starts at `6e098d66f2d29e739ce8cfeae4e61ad562c824c4`, `game/` tree `8290f60b6708eae7689ded9568264b70d5363eda`. It does NOT import the old Vite root or the abandoned elephant prototype. It has not been called a production deployment.

## Strict scope

Only two existing game files change: `game/assets/main-critter-v4.js` and the two Crystal enemy options in `game/index.html`. The replacement adds `water-calf.js` and its atlas/metadata, and removes the four dedicated Crystal model/texture files. The other **1,305 original game files are byte-identical**. The original player Frost/Crystal skill is intentionally retained: not every occurrence of the word "crystal" is an obsolete enemy.

`docs/water-calf-edits.json` records each checked semantic substitution. The reverse audit reconstructs the exact baseline bundle hash from the candidate, proving that unrelated compiled code was not replaced. Existing Frog rendering/AI, skills, scene, grass, audio, menus, pickups and saves remain as in the canonical release.

## Source art

`art/elephant/walk.png`, `actions.png`, and `hit.png` are the owner's exact three supplied PNG files, checked by SHA-256. The runtime atlas is resized/cropped directly from them, with alpha and aspect ratios preserved. Only the pieces of neighbouring sprites that intrude into non-uniform sheet cells are masked. No new drawing or placeholder is used.

Eight walking frames; a standing idle; charge and shot poses; the supplied hit drawing; four collapse frames; two supplied projectile frames; one supplied splash. The Alpha uses the same approved artwork at the existing elite size and HP, and fires a three-shot spread instead of the removed crystal ground eruption. No unapproved whole-body recolour.

## Integration

Water Calf is the `water` enemy slot replacing `crystal`, in normal and Alpha rosters. Spawn timing, shared navigation, damage, projectile collision, EXP and all other enemies use their existing systems. Animation is selected from actual distance/windup/hit/death state. The sprite renderer rebinds its texture every draw because the canonical player anti-aliasing pass also uses texture unit 11.

`npm test` checks original art hashes, pose selection, charge-before-shoot, real muzzle trajectory, preserved files and exact reverse-patch identity. Browser QA also loads real images, selects a card, spawns the enemy, waits for both projectile frames, confirms actual player damage, checks hit/death and captures actual gameplay frames in Chromium and WebKit. These are software-browser tests, not iPad performance measurements.

The original selected production destination is unchanged: `slime-evolution-five.vercel.app`. No CDN base wrapper and no new website. A passing branch/CI is not a deployed update; production promotion requires deploying the tested package to the existing project and checking the original URL.
