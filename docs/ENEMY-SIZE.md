# Water / Spark visual size — September 18, 2026

Parent: deployed main `51ee5b9ddac3cbb31413ee407c2b26766ef797dc`, game tree `b0fc7da7ecf1ba3db69f0f4f647aefeede30b0e9`.

Owner request: larger elephant, smaller hedgehog. Water Calf body size increases 25% (`WATER_CELL_WORLD` 1.90 -> 2.375); Spark decreases 20% (`SPARK_CELL_WORLD` 2.10 -> 1.68). This is a visual-size adjustment, not a stat rebalance or a new set of poses.

Both species already share one renderer across their idle/walk/run/charge/attack/hurt/death poses, so changing the base body size applies consistently to all states and camera modes. Foot pivots stay unchanged; do not rescale individual atlas frames. Water Alpha keeps its existing 1.55 relative size multiplier.

Water muzzle offsets scale with the same body factor, and Spark impact offset changes proportionally from .35 to .28. Rendered bullets and collision use the same muzzle coordinates. Water projectile/splash sizes and speeds remain unchanged. Body collision radii, HP, damage, cooldowns, navigation, spawn times, approved images, shaders and all other creatures remain unchanged. The previous Spark .60s charge, 8-unit/s dash, 3-unit activation range and one impact hit are retained.

Only `game/assets/water-calf.js` and `game/assets/spark-hedgehog.js` change at runtime; 1,255 other files are untouched. `tests/enemy-size-provenance.mjs` reverses the four exact size/attachment edits and requires complete original module SHA-256 hashes. The historical roster test uses that exact Water reversal instead of excluding Water from integrity checks.

`npm test` includes real-renderer uniform spies for every body pose, both directions, three cameras and Water Alpha, plus muzzle/impact attachment checks. Existing Chromium/WebKit game regressions and screenshots still run unchanged. The original-domain audit must match the deployed commit and all game bytes before reporting this live. No new host, image generation or claims of measured iPad FPS.
