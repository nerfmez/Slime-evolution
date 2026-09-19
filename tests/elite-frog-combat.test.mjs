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
  for(let i=0;i<66;i++)eliteFrogAttack(w,.01,e,4,dodge?[-3,0,0]:[3,0,-1.4],true,10);
  assert.equal(hits.length,dodge?0:1);assert.equal(w.playerPoisonTime,dodge?undefined:3);
  assert.equal((w.eliteFx||[]).length,0);
  eliteFrogAttack(w,.05,e,4,[3,0,-1.4],true,10);assert.equal(hits.length,dodge?0:1);
 }
 assert.equal(eliteFrogAttack({},.05,{type:'thorn',elite:false},1,[0,0,1],true,10),null);
});

test('contact follows the authored horizontal sweep, retraction and locked facing',()=>{
 const e={x:0,z:0,hp:190,scale:1.34,frogEliteAimX:1,frogEliteAimZ:0};
 assert.equal(tongueTouchesPlayer(e,0,.1,[5,0,.1]),true);
 assert.equal(tongueTouchesPlayer(e,.39,.54,[5,0,.1]),false);
 assert.equal(tongueTouchesPlayer(e,0,.1,[5,0,-2.5]),false);
 assert.equal(tongueTouchesPlayer(e,.39,.54,[5,0,-2.5]),true);
 assert.equal(tongueTouchesPlayer(e,0,.66,[-3,0,0]),false);
 assert.equal(tongueTouchesPlayer(e,0,.66,[9,0,-1.4]),false);
 assert.equal(tongueTouchesPlayer({...e,frogEliteFacing:-1},0,.1,[-5,0,.1]),true);
 assert.equal(tongueTouchesPlayer({...e,frogEliteFacing:-1},0,.66,[5,0,.1]),false);
 assert.ok(eliteFrogTonguePoints(e,.33).length>50);
 assert.ok(eliteFrogTongueState(e,.56).reach<eliteFrogTongueState(e,.52).reach);
 assert.ok(eliteFrogTongueState(e,.61).reach<eliteFrogTongueState(e,.56).reach);
 assert.equal(eliteFrogTongueState(e,.65).closed,true);
 assert.equal(eliteFrogTonguePoints(e,.65).length,0);
 assert.ok(eliteFrogTongueState(e,.61).reach<1.6);
 assert.equal(tongueTouchesPlayer(e,.61,.66,[3,0,-1.4]),false);
 assert.equal(eliteFrogTonguePoints(e,.66).length,0);
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
 assert.deepEqual(meta.pivot,[128,244]);
 for(const frame of meta.frames)assert.equal(frame.bodyHeight,183);
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
 assert.equal(eliteFrogAttackFrame({...e,windup:.2}),7);
 assert.equal(eliteFrogAttackFrame({...e,frogEliteTongueAge:.33}),2);
 assert.equal(eliteFrogAttackFrame({...e,frogEliteTongueAge:.65}),7);
 assert.equal(eliteFrogAttackFrame({...e,frogAttack:.2}),7);
 assert.equal(eliteFrogAttackFrame({...e,hp:0,frogEliteTongueAge:.33}),null);
});
