# Slime Evolution

เว็บเกม Slime roguelike — JavaScript, WebGL2, Vite.

**เริ่มอ่าน [HANDOFF.md](HANDOFF.md)** ก่อนแก้: มีสถานะล่าสุด งานค้าง ข้อกำหนดผู้ใช้ วิธีรัน/ตรวจภาพ ค่าที่เซฟ และ workflow ทั้งหมด.

```sh
npm install
npm run dev -- --host 0.0.0.0
npm run build
```

- Node 22.12+ recommended; output `dist/`.
- [VFX workflow](docs/DREAM_LOOP.md)
- Saved-frame viewer: `/review/index.html?set=sunfall` (does not require WebGL).
- Sun Fall smoke currently uses a broad grounded 3D bank tapering into swept manga-style crests. Visual refinement remains; no claim of complete reference match or verified mobile FPS.
- Repository migration does not automatically deploy a new website. The old Sites domain is not linked to GitHub pushes.
