import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {waterFacing,waterPose,waterRanged,waterMuzzle,tickWaterWorld,finishWaterBullets} from '../game/assets/water-calf.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
test('the 3 source images are exactly the supplied PNGs, with no replacement art',async()=>{
 const hashes={'walk.png':'4a72eb13eab9da500580eef0b3aa11c54a0f602b1970fe9f05c014b646bbf74f','actions.png':'41ac5641b63e528700a373505751d35a30a882d3036595f0133fa01b0e934d22','hit.png':'8d8ae4605cd61f43c7a132dab4d43ea81d7383c040c03c67dda18f45b4320d57'};
 for(const [f,h] of Object.entries(hashes))assert.equal(sha(await readFile(new URL('../art/elephant/'+f,import.meta.url))),h,f);
});
test('all 8 walk frames, charge, shoot, hit, 4 death frames and stable facing',()=>{
 assert.deepEqual(Array.from({length:8},(_,i)=>waterPose({anim:(i+.1)/8,walkBlend:1}).cell),[0,1,2,3,4,5,6,7]);
 assert.equal(waterPose({}).cell,18);assert.equal(waterPose({windup:.3}).cell,12);assert.equal(waterPose({waterShotPose:.2}).cell,13);assert.equal(waterPose({hit:.1}).cell,14);
 assert.deepEqual([0,.121,.241,.361].map(waterDeath=>waterPose({waterDeath}).cell),[8,9,10,11]);
 assert.equal(waterPose({waterDeath:.64}).alpha,0);
 const e={yaw:-Math.PI/2};assert.equal(waterFacing(e),-1);e.yaw=0;assert.equal(waterFacing(e),-1);e.yaw=Math.PI/2;assert.equal(waterFacing(e),1);
});
test('charge precedes firing; no obsolete crystal attack or off-centre collision proxy',()=>{
 const world={enemies:[],bullets:[]},e={type:'water',id:1,x:3,z:0,yaw:-Math.PI/2,radius:.37,attack:0,windup:0};
 assert.equal(waterRanged(world,e,.1,[0,0,0],3,true,6),false);assert.ok(e.windup>0);assert.equal(world.bullets.length,0);
 for(let n=0;n<6;n++)waterRanged(world,e,.1,[0,0,0],3,true,6);
 assert.equal(world.bullets.length,1);const b=world.bullets[0],m=waterMuzzle(e);assert.equal(b.kind,'water-shot');assert.equal(b.x,m.x);assert.equal(b.z,m.z);assert.equal(b.damage,6);assert.equal(b.radius,.10);assert.ok(b.vx<0);assert.ok(e.waterShotPose>0);
 assert.ok(Math.abs(b.x*b.vz-b.z*b.vx)<1e-8,'trajectory aims at the actual player from the actual muzzle');
 b.life=0;finishWaterBullets(world);assert.equal(world.waterSplashes.length,1);
 world.waterDead=[{waterDeath:.6}];tickWaterWorld(world,.1);assert.equal(world.waterDead.length,0);
});
test('everything outside the named replacement is byte-identical to finished frog',async()=>{
 const baseline=JSON.parse(await readFile(new URL('../baseline-manifest.json',import.meta.url)));
 const changed=new Set(['index.html','assets/main-critter-v4.js']);
 const removed=new Set(['assets/enemies/crystal.bin','assets/enemies/crystal.json','assets/enemies/crystal.png','assets/enemies/crystal-elite.png']);
 let same=0;
 for(const f of baseline){const path=new URL('../game/'+f.path,import.meta.url);
  if(removed.has(f.path)){await assert.rejects(readFile(path),{code:'ENOENT'});continue;}
  const bytes=await readFile(path);if(!changed.has(f.path)){assert.equal(sha(bytes),f.sha256,f.path);same++;}
 }
 assert.equal(same,1305);
 // Reverse the allowlisted edits and recover the exact original bundle hash.
 const record=JSON.parse(await readFile(new URL('../docs/water-calf-edits.json',import.meta.url)));
 let text=await readFile(new URL('../game/assets/main-critter-v4.js',import.meta.url),'utf8');
 const header="import {createWaterCalfRenderer,waterRanged,tickWaterWorld,finishWaterBullets} from './water-calf.js';\n";
 assert.ok(text.startsWith(header));text=text.slice(header.length);
 const suffix='\nif(new URLSearchParams(location.search).has("qa"))globalThis.__slimeGameQA={get world(){return J},get combat(){return Y},get state(){return W},get waterRenderer(){return waterRenderer},canStand:P,draw:Qr};\n';
 assert.ok(text.endsWith(suffix));text=text.slice(0,-suffix.length);
 // Empty-new edits are restored at their exact context; use a recorded full reverse diff instead.
 const patch=JSON.parse(await readFile(new URL('../docs/water-calf-reverse.json',import.meta.url)));
 for(const e of patch){assert.equal(text.slice(e.start,e.start+e.new.length),e.new,e.label);text=text.slice(0,e.start)+e.old+text.slice(e.start+e.new.length);}
 assert.equal(sha(Buffer.from(text)),record.baselineBundleSHA256);
 console.log('Preserved: 1305 baseline files; only 2 game files changed, 4 Crystal files removed, 3 Water files added.');
});
