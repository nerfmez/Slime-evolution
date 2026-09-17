# Slime — finished Moss Frog canon

The only active game is **`game/`**. It preserves the complete approved Moss Frog release, byte-for-byte, from commit `cf841e09ad37da59a8edb1911200d6a41979c5cc` (finished frog, September 16). See `CANON.json` for the exact tree and original hosting destination.

```sh
npm test
npm run build
npm run dev
```

Node 22 or newer is required. Build needs no downloaded packages and writes `dist/`. There is no active Vite prototype and no external CDN wrapper. This is a preserved playable snapshot, not a claim of recovered authoring source.

Old source and Water Calf experiments are preserved on `archive/before-frog-canon-cleanup-20260917`, not mixed into the current game. Read `AGENTS.md` and `HANDOFF.md` before editing.

The selected site remains `https://slime-evolution-five.vercel.app/`. Run `npm run audit:live` to verify whether its actual files match this baseline; a GitHub commit alone does not update hosting.
