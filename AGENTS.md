# Slime — canonical baseline (owner correction, 2026-09-17)

Read CANON.json and HANDOFF.md before any game change. The owner explicitly selected the COMPLETE FINISHED MOSS FROG game as canon, not the old root Vite prototype and not the elephant experiments.

- `game/` is the ONLY runnable game input. It is a byte-for-byte copy of `cf841e09ad37da59a8edb1911200d6a41979c5cc:published/2026-09-14`, tree `8290f60b6708eae7689ded9568264b70d5363eda`.
- The September 14 folder name is historical; the completed frog commit is September 16. Never choose a baseline by folder date, branch name or the presence of `main.js`.
- This is a complete playable snapshot, including compiled modules. It is NOT a recovered unbundled authoring source. Do not describe the old root source as equivalent to it. Any future source recovery is a separate task with full behavioral/visual parity checks.
- `npm run build` validates the locked game tree and copies it to `dist/`; it does not compile the obsolete Vite project, reconstruct missing files or import another version. A missing/changed game byte fails this recovery build.
- Do not add a root `main.js`, `enemies.js`, `public/`, `published/` or `vite.config.js`. Historical code and elephant work are preserved on `archive/before-frog-canon-cleanup-20260917`; unfinished later experiments remain on their existing branches. They are not build inputs.
- Do not put the elephant back until the owner approves continuing from this recovered baseline. Normal Thorn is Moss Frog; Thorn Alpha and all other baseline monsters remain as in the locked snapshot.
- Preserve frog hop/rest, left/right facing and tongue offset, hit, seated tongue attack, death, and 30%-smaller size. Preserve the existing player art/animation, scene, grass, pickups, cards, skills, sound, menus, saves and localStorage keys.
- The ONLY production destination is `slime-evolution-five.vercel.app`, Vercel project/team in CANON.json. No new projects, hosts, CDN/base-href wrappers or alternate test-site links.
- GitHub commit, package validation, browser validation and live deployment are separate states. Never call a commit "live" or supply an old failing link as a new version. Test the ORIGINAL URL and compare served bytes with the canonical manifest.
- Archive before removing obsolete active files; use a new ordinary commit, never rewrite history or force-push. Do not delete unrelated branches.
- The image/code in the finished frog game may include archived alternatives internally. Do not prune them by filename guessing during restoration. Preserve exact bytes first; a later reviewed dependency-based cleanup can remove unreachable alternatives.
