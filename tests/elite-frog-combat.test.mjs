import {test} from 'node:test';
import assert from 'node:assert/strict';
import {insideEliteFrogCone,eliteFrogAttack,ELITE_FROG_WINDUP,eliteFrogTonguePoints,eliteFrogTongueState,tongueTouchesPlayer} from '../species/elite-frog-combat.js';
test('wide ranged cone hits both sides but not behind or beyond its visible sector',()=>{
 for(const sign of [-1,1])assert.ok(insideEliteFrogCone(sign*3,2,0,1));
 assert.ok(insideEliteFrogCone(0,4.5,0,1));
 assert.equal(insideEliteFrogCone(0,4.51,0,1),false);
 assert.equal(insideEliteFrogCone(0,-1,0,1),false);
 assert.equal(insideEliteFrogCone(4,1,0,1),false);
});
test('locked aim can be dodged; an ordinary hit cannot cancel visible tongue damage and three-second poison',()=>{
 for(const dodge of [false,true]){
  const hits=[],w={damage:v=>hits.push(v)},e={type:'thorn',elite:true,x:0,z:0,hp:190,scale:1.34,attack:0,hit:.2};
  assert.equal(eliteFrogAttack(w,.05,e,4,[3,0,-1.4],true,10),false);
  assert.equal(e.windup,ELITE_FROG_WINDUP);assert.equal(hits.length,0);
  eliteFrogAttack(w,ELITE_FROG_WINDUP,e,4,dodge?[-3,0,0]:[3,0,-1.4],true,10);
  assert.equal(hits.length,0);
  for(let i=0;i<84;i++)eliteFrogAttack(w,.01,e,4,dodge?[-3,0,0]:[3,0,-1.4],true,10);
  assert.equal(hits.length,dodge?0:1);assert.equal(w.playerPoisonTime,dodge?undefined:3);
  assert.equal((w.eliteFx||[]).length,0);
  eliteFrogAttack(w,.05,e,4,[3,0,-1.4],true,10);assert.equal(hits.length,dodge?0:1);
 }
 assert.equal(eliteFrogAttack({},.05,{type:'thorn',elite:false},1,[0,0,1],true,10),null);
});

test('extension precedes the sweep, and visible retraction ends contact',()=>{
 const e={x:0,z:0,hp:190,scale:1.34,frogEliteAimX:1,frogEliteAimZ:0};
 assert.equal(eliteFrogTonguePoints(e,.03).length,0); // Open mouth, no tongue yet.
 assert.ok(eliteFrogTongueState(e,.1).reach<eliteFrogTongueState(e,.2).reach);
 assert.equal(tongueTouchesPlayer(e,0,.14,[3,0,-1.4]),false);
 assert.equal(tongueTouchesPlayer(e,.15,.54,[3,0,-1.4]),true);
 assert.equal(tongueTouchesPlayer(e,0,.84,[-3,0,0]),false);
 assert.equal(tongueTouchesPlayer(e,0,.84,[8,0,-1.4]),false);
 assert.equal(tongueTouchesPlayer({...e,frogEliteFacing:-1},.15,.54,[-3,0,-1.4]),true);
 assert.ok(eliteFrogTongueState(e,.60).reach<eliteFrogTongueState(e,.48).reach);
 assert.ok(eliteFrogTongueState(e,.70).reach<eliteFrogTongueState(e,.60).reach);
 assert.equal(tongueTouchesPlayer(e,.66,.84,[3,0,-1.4]),false);
 assert.equal(eliteFrogTongueState(e,.8).closed,true);
 assert.equal(eliteFrogTonguePoints(e,.8).length,0);
 assert.equal(eliteFrogTonguePoints(e,.84).length,0);
 assert.equal(eliteFrogTonguePoints({...e,hp:0},.33).length,0);
});

test('whole frog atlas has eight hash-locked approved sweep and retraction frames',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {createHash}=await import('node:crypto');
 const meta=JSON.parse(await readFile(new URL('../art/elite-frog/full-attack-source.json',import.meta.url),'utf8'));
 const atlas=await readFile(new URL('../species/enemies/elite-frog-attack.webp',import.meta.url));
 assert.equal(createHash('sha256').update(atlas).digest('hex'),meta.atlasSHA256);
 assert.equal(meta.frames.length,8);
 const source=await readFile(new URL('../art/elite-frog/'+meta.source,import.meta.url));
 assert.equal(createHash('sha256').update(source).digest('hex'),meta.sourceSHA256);
 assert.equal(meta.ends.length,8);
 assert.deepEqual(meta.pivot,[48,78]);
 assert.equal(meta.pixelWorld,1.95/80);
 assert.deepEqual(meta.cell,[256,96]);
 for(const frame of meta.frames)assert.ok(frame.bodyHeight>=54&&frame.bodyHeight<=61&&frame.sizeCorrection>.9&&frame.sizeCorrection<1.12,'every attack pose is corrected to the same apparent body size');
 assert.deepEqual(meta.frames.map(f=>f.originalFrame),[14,15,0,1,4,5,6,20]);
 const body=await readFile(new URL('../species/enemies/elite-frog-atlas.webp',import.meta.url));
 assert.equal(createHash('sha256').update(body).digest('hex'),meta.bodyAtlasSHA256);
 assert.equal(meta.frames[7].closed,true);
 assert.equal(meta.frames[7].samples.length,0);
 assert.equal(new Set(meta.frames.map(f=>f.sourceFrame)).size,8);
});

test('whole-body layout is fixed across frames and mirrors about the feet, never the mouth',async()=>{
 const {eliteFrogAttackLayout,eliteFrogAttackFrame}=await import('../species/elite-frog-attack.js');
 const e={x:2,z:3,hp:190,scale:1.34,frogEliteFacing:1};
 const first=eliteFrogAttackLayout(e,0);
 for(let i=0;i<8;i++){
  const layout=eliteFrogAttackLayout(e,i);
  assert.equal(layout.pixelSize,first.pixelSize);assert.deepEqual(layout.pivot,first.pivot);
  assert.deepEqual(layout.up,first.up);assert.deepEqual(layout.right,first.right);
  const flipped=eliteFrogAttackLayout({...e,frogEliteFacing:-1},i);
  assert.equal(flipped.facing,-layout.facing);assert.equal(flipped.pixelSize,layout.pixelSize);
 }
 assert.equal(eliteFrogAttackFrame({...e,windup:.2}),null);
 assert.equal(eliteFrogAttackFrame({...e,frogEliteTongueAge:.33}),3);
 assert.equal(eliteFrogAttackFrame({...e,frogEliteTongueAge:.80}),7);
 assert.equal(eliteFrogAttackFrame({...e,frogAttack:.2}),null);
 assert.equal(eliteFrogAttackFrame({...e,hp:0,frogEliteTongueAge:.33}),null);
});
