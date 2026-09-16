# Slime Evolution — อ่านก่อนเริ่มงานต่อ

## สถานะล่าสุด 2026-09-11

ย้ายจาก ChatGPT Sites ตามคำสั่งเจ้าของ ไป GitHub `nerfmez/Slime-evolution` เพื่อทำต่อโดยไม่ผูกกับ Work. เกมนี้เป็น **เว็บ JavaScript + WebGL2 แบบเขียน renderer เอง + Vite** ไม่ใช่ Godot หรือ Three.js. Godot เป็นประวัติโปรเจกต์เก่า อย่านำข้อมูลเก่ามาทับโค้ดเว็บ.

เว็บเดิม: https://slime-web-trial.ballboy-lnw.chatgpt.site
รุ่นที่ขึ้นเว็บสำเร็จล่าสุด: Sites v101, source commit `3979cae54ff015cd61dd0964519f97d04eef7ab1`.
Snapshot GitHub นี้รวมโค้ด/asset/ภาพตรวจจากรุ่นนั้น และเอกสารรับงานต่อ. GitHub migration ยังไม่เท่ากับตั้ง hosting ใหม่แล้ว. เว็บ Sites เดิมไม่อัปตาม GitHub อัตโนมัติ.


## Stage 1 Alpha elites + boss port (2026-09-12)

Recovered from the pre-migration Godot v100 source without replacing the current web renderer. `enemies.js` now contains the four Alpha variants and the 05:00 Ancient Bloom Colossus transition; `enemy-assets.js` supports shared extra clips and selective elite textures. Runtime assets live under `public/assets/enemies/`: Petal Alpha adds `petal-flight.bin`, Crystal Alpha adds `crystal-elite.png`, and Ancient Bloom adds `boss.bin`/`boss.png` plus run/charge/push/spell clips. The boss authoring HP remains 12,000 in `sourceHp`; the temporary web-review HP is 1,200 until the complete player skill roster is restored. See `enemy-stage.md` and `tests/stage1-elites-boss.test.mjs` before changing balance or visuals.

Elite visuals must remain part-selective rather than whole-model tint. Petal Alpha keeps the approved 5 s Wing Dive at 2x speed, takes +50% damage in flight, and bends a wider grass path. Elite/boss kills grant +1 reroll. Ancient Bloom cycles Vine Lunge / Root Slam / Seed Volley / Bloom Burst and has 28% incoming-damage reduction. Browser/device visual verification is still required after integration; unit tests are not visual approval.

## งานปัจจุบัน: Sun Fall B

- ลูกอาทิตย์ตกจากฟ้า ใช้ภาพความละเอียดสูง + การขยับผิว/หางต่อเนื่อง และแถบไฟ 3D จริงสองวง.
- ผู้ใช้ปฏิเสธควันก้อนกลม / ลูกบอล / สร้อยเม็ด / fog donut.
- **ข้อกำหนดล่าสุด:** ควันต้องมีฐานกว้างแนบพื้น ด้านบนไล่บางเป็นริ้วโค้ง/ยอดเรียวแบบอนิเมะมังงะ. หมุนตามเข็มก่อน → ยืด → บาง → แตกเป็นช่วง → สลาย. ยอดริ้วเอน/ลากตามแรงหมุน. ไม่หมุนมารวมกันที่ยอดโดม.
- รุ่นล่าสุดใช้ `vfx/sunfall-smoke3d.js`: เมชฐานกว้างสองผิว ไล่บางขึ้นด้านบน, angular sweep, sector peeling, taper, cel shading. **ไม่ใช่ raymarch volumetric อีกแล้ว**.
- เคยทดลอง sphere lobes และ raymarch fog แต่ถูกปฏิเสธ. อย่าย้อนกลับไปอ้างว่าสองแบบนั้นผ่าน.
- ทรงฐาน/ยอดตรงโจทย์ขึ้น แต่ **ยังมีส่วนดูเป็นแผ่น/ริบบิ้นแข็ง ไม่ถือว่าคุณภาพผ่านครบ**. รอบ independent review ก่อนปรับเงา/ปลายครั้งสุดท้ายได้ 7.6/10. ไม่มีผลคะแนนใหม่หลังแก้สุดท้าย อย่าอ้างว่าผ่าน 8.
- ตรวจ actual offscreen GLES frames แล้ว. Browser saved-frame menu ใช้ได้ในรอบก่อน แต่รอบล่าสุด browser transport หลุด; ยังไม่ได้ตรวจ browser รอบสุดท้ายซ้ำ. ไม่มี device FPS ล่าสุด.
- งานถัดไป: ให้เจ้าของลอง v101/รุ่น GitHub → แก้ผิวควัน/ปลายริ้วให้เป็นควันตูน ไม่เป็นกระดาษ โดยคงฐานกว้างยอดบาง → ตรวจ motion/FPS บน Android/iOS.

## วิธีเริ่มรัน (ไม่ต้องใช้ Work)

ใช้ Node.js รุ่นที่รองรับ Vite 8 (แนะนำ Node 22.12+), Python 3 สำหรับงานตรวจภาพ.

```sh
npm install
npm run dev -- --host 0.0.0.0
npm run build
```

ผล build อยู่ `dist/`. โฮสต์ static ที่โดเมน root ได้. `vite.config.js` มีหลาย entry รวม `slime-motion.html`. อย่าปรับ base เป็น GitHub Pages subpath โดยไม่ตรวจ asset paths ที่เป็น root/relative ทั้งหมด. ยังไม่ได้ตั้ง Pages/Vercel deploy workflow ใน repo นี้.

หน้าสำคัญ:
- `/` เกม
- `/review/index.html?set=sunfall` ตรวจเฟรมเอฟเฟกต์ ไม่ต้อง WebGL
- `/review/index.html?set=sunfall-smoke` ควันอย่างเดียว
- `/review/index.html?set=sunfall-bands` ไฟ 3D อย่างเดียว
- `/slime-motion.html` เครื่องมือท่าสไลม์

ในเกม: ทดสอบสกิล → Sun Fall · EVO → ปรับ Sun Fall. เมนูแบ่งภาพ/จังหวะ, แถบไฟ 3D, ควัน 3D; มี solo, sliders, เซฟ/คืนค่า. ชื่อค่าล่าสุดฐานควัน/ยอดริ้วแทนก้อนควัน.

## Workflow บังคับสำหรับ VFX

1. อ่านคำสั่งล่าสุดและภาพเรฟก่อน. ให้ผู้ใช้เลือก design ก่อนเมื่อเป็นสกิลใหม่. สำหรับงานนี้เลือก Sun Fall B แล้ว ไม่ต้องเริ่มเลือก A/B/C ใหม่.
2. ทำ baseline ให้รูปทรง สี ลำดับเวลา และ motion ถูกก่อน. **อย่าสร้าง tuner เพื่อกลบต้นทางผิด**.
3. เรนเดอร์จาก renderer เกมจริงในมุมผู้เล่น. ตรวจเฟรมต่อเนื่องและ motion ไม่ใช่แค่รูปเดี่ยว/ขยายภาพ/นับจำนวนไฟล์ไม่ซ้ำ.
4. เปิด saved-frame viewer เทียบเรฟ พร้อมดู combined และ solo. ข้อจำกัด WebGL ใน cloud ไม่ใช่เหตุให้ข้ามเมนูนี้.
5. ใช้ Dream Loop independent visual judge ตาม `docs/DREAM_LOOP.md`. อย่าให้คะแนนผ่านเองหรือเปลี่ยนโจทย์เพื่อให้ผ่าน. ถ้าไม่มี subagent ให้ระบุข้อจำกัดและไม่อ้าง independent review.
6. แก้ gap ที่เห็นจริง. ช่วงตกต้องมีผิว/หางเปลี่ยน ไม่ใช่ภาพเดิมเลื่อนลง. ควันต้องวนก่อนและสลายเป็นลำดับ ไม่ fade ทั้งวงพร้อมกัน.
7. ทดสอบ integration/build; deploy ไป hosting ที่ผู้ใช้เลือกและยืนยันสำเร็จก่อนบอกว่าอัปแล้ว. ส่ง URL ให้เจ้าของทดสอบบนเครื่องจริง.
8. แยกคำกล่าวให้ชัด: screenshot ใน viewer / offscreen GLES / full-game capture / device FPS เป็นคนละหลักฐาน.

## เรนเดอร์เฟรมโดยไม่ต้องเปิด WebGL browser

Python dependencies: numpy, Pillow, scipy. Linux ต้องมี EGL + GLESv2 (เช่น Mesa packages `libegl1`, `libgles2`, `libegl-mesa0`). ดู bootstrap ของ `tools/check-shaders.py` ซึ่งใช้ ctypes/surfaceless EGL.

```sh
mkdir -p .dream-loop
node tools/capture-sunfall.mjs
python tools/render-sunfall.py
node tools/capture-sunfall.mjs sunfall-smoke
python tools/render-sunfall.py sunfall-smoke
node tools/capture-sunfall.mjs sunfall-bands
python tools/render-sunfall.py sunfall-bands
```

ไฟล์ชั่วคราว `.dream-loop/*-draws.json`; ผลจริง `public/review/frames/`, `sunfall-keyframes.png`, `sunfall-motion.gif`. `public/review/frames.json` เป็น manifest ของ viewer. Capture เก็บ 48 checkpoints; **ไม่ใช่ 48 ภาพวาดใหม่ทั้งหมด**. Flight/3D/smoke เคลื่อนต่อเนื่องตามเวลา; impact atlas มี 24 ช่อง 512px.

`tools/pack-sunfall.py` ใช้ทำ atlas/source preprocessing ใหม่เมื่อเปลี่ยน source เท่านั้น. ไม่ต้องรันทุกครั้งที่แก้ shader. อ่านก่อนใช้เพราะจะเขียน assets ทับ. เก็บ source PNG ไว้ครบ.

## แผนที่ไฟล์

- `main.js`, `gl.js`: game wiring, โหลด texture, primitive GL helpers.
- `skill-lab.js`, `sunfall-tuner.js`: ห้องทดสอบและตัวปรับ.
- `vfx/sunfall-renderer.js`: flight/impact composition และ smoke/fire layer wiring.
- `vfx/sunfall-bands.js`: curved fire mesh สองวง, texture unit 5 จาก Inferno.
- `vfx/sunfall-smoke3d.js`: ควันฐานกว้างยอดบางล่าสุด.
- `vfx/sunfall-settings.js`: defaults, slider ranges, clock, local saves.
- `public/assets/vfx/`: source และ atlases. Sun textures units 13/14/15 (WebGL2); อย่าชน unit อื่น.
- `public/review/`: viewer, reference, saved frames/GIF.
- `tools/`: capture/packing/GLES verification scripts.

## ค่าที่เซฟและการย้ายเครื่อง/โดเมน

Sun Fall ใช้ localStorage key **`slime.sunfall.v1`**. ค่าเดิม merge กับ defaults สำหรับค่าใหม่. ห้ามเปลี่ยน key หรือล้างค่าเงียบ ๆ.

ค่าเซฟของเจ้าของอยู่ในเบราว์เซอร์/โดเมนเดิม **ไม่อยู่ใน Git และไม่ย้ายตาม GitHub**. เปลี่ยนโดเมน/เครื่องไม่เห็นค่าเดิมอัตโนมัติ. ต้อง export/import หรือให้เจ้าของส่งค่า; อย่าแต่งว่ามีค่าที่ไม่เคยได้รับ. โค้ดมี defaults ไม่ใช่สำเนา localStorage เจ้าของ.

สไลม์: ผู้ใช้เคยปฏิเสธเซฟ animation ใหม่ ต้องคงการเคลื่อนไหวเดิมก่อนปรับ. ปัจจุบันเลือกโมเดล3Dเดิม เฟค2Dโดยลด cadence/ล็อก8ทิศ เฉพาะตัวหลัก. อย่าย้อนกลับไปใช้โมเดลทดลองไร้รายละเอียด. Thorn เคยใช้16เฟรมแล้วผู้ใช้ชอบ. ไม่แตะระบบเหล่านี้ระหว่างแก้ Sun Fall.

## ข้อควรระวังอื่น

- กล้องมุมผู้เล่นสำคัญที่สุด. อย่าใช้กล้อง cinematic เพื่อทำให้เอฟเฟกต์ดูผ่าน.
- สีสดได้ ไม่ใช่สั่งให้ทุกอย่างซีด. Theme fantasy/toon/anime; smoke ครีม/เทาหลายเฉด ไม่ดำ.
- การเผาหญ้าและเพลิงคงค้างผู้ใช้ชอบแล้ว. อย่าเปลี่ยนหญ้า/มอน/บาลานซ์เมื่อแก้ภาพ Sun Fall.
- แถบไฟ 3D กับควันต้อง solo ตรวจได้. ค่าปรับมีความหมายทางภาพ; ไม่เพิ่ม slider ที่ renderer ไม่ใช้.
- `smokeSteps3D` อาจยังค้างใน defaults/เซฟจากการทดลอง raymarch แต่ไม่อยู่ในเมนู/renderer ล่าสุด ไม่ใช่ตัววัดเฟรม.
- Cloud renderer ผ่านไม่เท่ากับ Android/iOS 60fps. FPS ข้ามอุปกรณ์เคยต่างกันมาก. วัดจริง.
- Sites upload เคย timeout หลายครั้ง; source commit สำเร็จไม่เท่ากับ deploy สำเร็จ. รุ่นล่าสุด v101 ยืนยัน succeeded แล้ว.
- ห้ามอ้าง GitHub ย้ายสำเร็จจนตรวจไฟล์ source + binary assets ครบ.

## Stage 1 five-animal ecosystem pass (2026-09-16)

Normal Stage 1 roster is now five real-animal-derived species: Moss Frog / Poison Tongue, Spark Hedgehog / Chain Spark, Pond Turtle / Shell Guard, Water Calf / Water Shot, and Forest Panda / Roll. Each has walk, hit, cast and short death poses in the 2D animal atlas. The existing Ancient Bloom boss remains while balance is still being tuned. Internal type keys are intentionally stable (thorn/moss/petal/crystal + panda) to reduce migration risk.
