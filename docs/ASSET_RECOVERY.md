# Asset recovery record — 2026-09-17

The strict release audit caught another previously untested missing runtime dependency: `assets/cards/inferno.png` in the emitted main JS. The old startup-only smoke test did not exercise the card artwork.

Restored `public/assets/cards/` as the exact 17-image Git tree `299efc3b80e867f38c4dd8d29f1b35e1eb82e01c`. Its original location is `published/2026-09-14/assets/cards/` at source commit `cf841e09ad37da59a8edb1911200d6a41979c5cc`. These are existing approved image bytes, not regenerated art. No compiled JS, CSS, gameplay, AI or asset fallback is imported. No file inside published is edited.

The permanent source location is now public/assets/cards. Build and runtime use only the newly generated dist; no archive, CDN or old commit is consulted while building or playing. The release manifest validates both file presence and bytes after upload.
