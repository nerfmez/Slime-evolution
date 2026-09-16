import {readFileSync,writeFileSync} from 'node:fs';

const runtimePath='debug-prod/main-critter-v4.formatted.js';
const outPath='published/2026-09-14/assets/main-critter-v4.js';
const indexPath='published/2026-09-14/index.html';
let s=readFileSync(runtimePath,'utf8');
function once(oldText,newText,label){const n=s.split(oldText).length-1;if(n!==1)throw new Error(`${label}: expected 1 match, got ${n}`);s=s.replace(oldText,newText);}

once(
'import { createCritterRenderer as __critterRenderer } from "./critters-v4/renderer.js";\n',
'import { createCritterRenderer as __critterRenderer } from "./critters-v4/renderer.js";\nimport { createWaterCalfRenderer } from "./water-calf-v1.js";\n',
'import Water Calf renderer');

once(
'  crystal: {\n    name: `Crystal Warden`,\n    speed: 0.85,\n    radius: 0.37,\n    hp: 28,\n    damage: 6,\n  },\n};',
'  crystal: {\n    name: `Crystal Warden`,\n    speed: 0.85,\n    radius: 0.37,\n    hp: 28,\n    damage: 6,\n  },\n  calf: {\n    name: `Water Calf`,\n    stride: 0.78,\n    speed: 0.88,\n    radius: 0.38,\n    hp: 32,\n    damage: 6,\n    xp: 7,\n  },\n};',
'add Water Calf enemy type');

once('        : this.mode === `elites`\n          ? mt\n', '        : this.mode === `elites`\n          ? mt.filter((e) => Te[e])\n', 'keep existing four Alpha families');
once('                ? mt.slice(0, Math.min(4, 1 + Math.floor(this.time / 60)))\n', '                ? mt.slice(0, Math.min(5, 1 + Math.floor(this.time / 60)))\n', 'unlock fifth normal species');

once('        (this.flightTrails = []),\n        (this.frogDead = []);', '        (this.flightTrails = []),\n        (this.frogDead = []),\n        (this.calfDead = []);', 'reset Water Calf corpses');

once(
'        this.frogDead.forEach((t) => (t.frogDeath = (t.frogDeath || 0) + e)),\n        (this.frogDead = this.frogDead.filter((e) => e.frogDeath < 0.51)),\n        (this.time += e),',
'        this.frogDead.forEach((t) => (t.frogDeath = (t.frogDeath || 0) + e)),\n        (this.frogDead = this.frogDead.filter((e) => e.frogDeath < 0.51)),\n        this.calfDead || (this.calfDead = []),\n        this.calfDead.forEach((t) => (t.calfDeath = (t.calfDeath || 0) + e)),\n        (this.calfDead = this.calfDead.filter((e) => e.calfDeath < 0.62)),\n        (this.time += e),',
'age Water Calf death pose');

once('        let e = mt.filter((e) => this.spawnedTypes.has(e));', '        let e = mt.filter((e) => Te[e] && this.spawnedTypes.has(e));', 'exclude Water Calf from Alpha cycle');

once(
'        if (\n          (n.type === `crystal` && !n.elite && s < 6.5 && f',
'        let calfHandled = !1;\n        if (n.type === `calf` && !n.elite && s < 7.2 && f) {\n          calfHandled = !0;\n          d = s > 4.2;\n          if (n.attack <= 0 && n.windup === 0) {\n            n.windup = 0.55;\n            n.attack = 2.35;\n          }\n          if (n.windup > 0) {\n            n.windup -= e;\n            d = !1;\n            if (n.windup <= 0) {\n              n.windup = 0;\n              this.bullets.push({\n                kind: `water_shot`,\n                x: n.x,\n                z: n.z,\n                vx: (a / Math.max(s, 0.001)) * 5.2,\n                vz: (o / Math.max(s, 0.001)) * 5.2,\n                life: 2.25,\n                damage: 6,\n                radius: 0.15,\n              });\n            }\n          }\n        }\n        if (\n          (n.type === `crystal` && !n.elite && s < 6.5 && f',
'Water Calf Water Shot behavior');

once('            : (n.windup = 0),\n          d)', '            : calfHandled\n              ? n.windup\n              : (n.windup = 0),\n          d)', 'preserve Water Calf windup');
once('          n.type === `crystal` && f && (n.yaw = Math.atan2(a, o));', '          (n.type === `crystal` || n.type === `calf`) && f && (n.yaw = Math.atan2(a, o));', 'face target while Water Calf aims');

once(
'          (e.type === `thorn` &&\n            !e.elite &&\n            !e.boss &&\n            this.frogDead.push({ ...e, frogDeath: 0 }),\n          this.defeated.push(e),',
'          (e.type === `thorn` &&\n            !e.elite &&\n            !e.boss &&\n            this.frogDead.push({ ...e, frogDeath: 0 }),\n          e.type === `calf` &&\n            !e.elite &&\n            !e.boss &&\n            this.calfDead.push({ ...e, __calfCorpse: !0, calfDeath: 0, hit: 0, windup: 0 }),\n          this.defeated.push(e),',
'preserve Water Calf death pose');

once('  Rn,\n  zn;\ns();', '  Rn,\n  zn;\nlet WaterCalfRenderer = null;\ns();', 'declare Water Calf renderer');

once('  for (let e of t) {\n    if (e.type === `thorn` && !e.elite && W.camera === `game` && Br) continue;', '  for (let e of t) {\n    if (e.type === `calf`) continue;\n    if (e.type === `thorn` && !e.elite && W.camera === `game` && Br) continue;', 'skip 3D asset path for Water Calf');

once(
'  if (W.camera === `game` && Br) {\n    for (let e of t)\n      if (e.type === `thorn` && !e.elite) {\n        let t = Br.draw(e, X, W.player, W.thornFrames);\n        (Yn += t.calls), (Xn += t.triangles);\n      }\n    for (let e of J.frogDead || [])\n      if (dr(e.x, e.z, 1.4)) {\n        let t = Br.draw(e, X, W.player, 8);\n        (Yn += t.calls), (Xn += t.triangles);\n      }\n    H.useProgram(U);\n  }',
'  if (W.camera === `game` && Br) {\n    for (let e of t)\n      if (e.type === `thorn` && !e.elite) {\n        let t = Br.draw(e, X, W.player, W.thornFrames);\n        (Yn += t.calls), (Xn += t.triangles);\n      }\n    for (let e of J.frogDead || [])\n      if (dr(e.x, e.z, 1.4)) {\n        let t = Br.draw(e, X, W.player, 8);\n        (Yn += t.calls), (Xn += t.triangles);\n      }\n    H.useProgram(U);\n  }\n  if (WaterCalfRenderer) {\n    for (let e of t)\n      if (e.type === `calf` && dr(e.x, e.z, 1.5)) {\n        let n = WaterCalfRenderer.draw(e, X, W.camera);\n        (Yn += n.calls), (Xn += n.triangles);\n      }\n    for (let e of J.calfDead || [])\n      if (dr(e.x, e.z, 1.5)) {\n        let n = WaterCalfRenderer.draw(e, X, W.camera);\n        (Yn += n.calls), (Xn += n.triangles);\n      }\n    H.useProgram(U);\n  }',
'draw Water Calf live and death poses');

once(
'  for (let e of J.bullets)\n    Q(\n      or,\n      e.kind === `seed` ? 35 : 27,\n      w(e.x, 0.4, e.z, 1, 1, 1, Math.atan2(e.vx, e.vz)),\n      1,\n    );',
'  for (let e of J.bullets) {\n    if (e.kind === `water_shot` && WaterCalfRenderer) {\n      let n = WaterCalfRenderer.drawShot(e, X, W.camera);\n      (Yn += n.calls), (Xn += n.triangles), H.useProgram(U);\n    } else\n      Q(\n        or,\n        e.kind === `seed` ? 35 : 27,\n        w(e.x, 0.4, e.z, 1, 1, 1, Math.atan2(e.vx, e.vz)),\n        1,\n      );\n  }',
'draw Water Shot projectile');

once('          ...Object.keys(ft),\n          `petal-fly`,', '          ...Object.keys(ft).filter((e) => e !== `calf`),\n          `petal-fly`,', 'do not request missing Water Calf 3D asset');
once('      Object.keys(ft).map(async (e) => {\n        zr[e].eliteTex = await O(H, `./assets/enemies/` + e + `-elite.png`);\n      }),', '      Object.keys(ft).filter((e) => e !== `calf`).map(async (e) => {\n        zr[e].eliteTex = await O(H, `./assets/enemies/` + e + `-elite.png`);\n      }),', 'do not request missing Water Calf elite texture');
once('    );\n  try {\n    Br = await Fe(H);', '    );\n  WaterCalfRenderer = createWaterCalfRenderer(H);\n  H.useProgram(U);\n  try {\n    Br = await Fe(H);', 'initialize Water Calf renderer');

writeFileSync(outPath,s);

let html=readFileSync(indexPath,'utf8');
const oldAll='<option value="all">ทดสอบครบ 4 ชนิด</option>';
if(!html.includes(oldAll))throw new Error('index: normal roster option not found');
html=html.replace(oldAll,'<option value="all">ทดสอบครบ 5 ชนิด</option>');
const crystal='<option value="crystal">Crystal Warden</option>';
if(!html.includes(crystal))throw new Error('index: Crystal Warden option not found');
html=html.replace(crystal,crystal+'<option value="calf">Water Calf · Water Shot</option>');
writeFileSync(indexPath,html);
console.log('Current production patched with Water Calf only.');
