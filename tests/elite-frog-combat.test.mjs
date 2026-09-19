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
test('locked aim can be dodged; an ordinary hit cannot cancel cone damage and three-second poison',()=>{
 for(const dodge of [false,true]){
  const hits=[],w={damage:v=>hits.push(v)},e={type:'thorn',elite:true,x:0,z:0,hp:190,attack:0,hit:.2};
  assert.equal(eliteFrogAttack(w,.05,e,4,[0,0,4],true,10),false);
  assert.equal(e.windup,ELITE_FROG_WINDUP);assert.equal(hits.length,0);
  eliteFrogAttack(w,ELITE_FROG_WINDUP,e,4,dodge?[0,0,-4]:[3,0,2],true,10);
  assert.equal(hits.length,0);
  for(let i=0;i<66;i++)eliteFrogAttack(w,.01,e,4,dodge?[0,0,-4]:[3,0,2],true,10);
  assert.equal(hits.length,dodge?0:1);assert.equal(w.playerPoisonTime,dodge?undefined:3);
  assert.equal((w.eliteFx||[]).length,0);
  eliteFrogAttack(w,.05,e,4,[0,0,4],true,10);assert.equal(hits.length,dodge?0:1);
 }
 assert.equal(eliteFrogAttack({},.05,{type:'thorn',elite:false},1,[0,0,1],true,10),null);
});

test('damage follows the visible tongue instead of hitting the entire cone at once',()=>{
 const e={x:0,z:0,hp:190,scale:1.34,frogEliteAimX:0,frogEliteAimZ:1};
 assert.equal(tongueTouchesPlayer(e,.12,.16,[3,0,2]),false);
 assert.equal(tongueTouchesPlayer(e,.48,.54,[3,0,2]),true);
 assert.equal(tongueTouchesPlayer(e,0,.66,[0,0,-3]),false);
 assert.equal(tongueTouchesPlayer(e,0,.66,[0,0,5.1]),false);
 assert.ok(eliteFrogTonguePoints(e,.33).length>50);
 assert.equal(eliteFrogTongueState(e,.56).reach,4.5);
 assert.ok(eliteFrogTongueState(e,.61).reach<1.6);
 assert.equal(tongueTouchesPlayer(e,.61,.66,[3.5,0,2]),false); // Mist persists; solid tongue has retracted.
 assert.equal(eliteFrogTonguePoints(e,0).length,0);
 assert.equal(eliteFrogTonguePoints(e,.66).length,0);
 assert.equal(eliteFrogTonguePoints({...e,hp:0},.33).length,0);
});

test('tongue image is the hash-locked supplied-video extraction',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {createHash}=await import('node:crypto');
 const meta=JSON.parse(await readFile(new URL('../art/elite-frog/tongue-source.json',import.meta.url),'utf8'));
 const atlas=await readFile(new URL('../species/enemies/elite-frog-tongue.webp',import.meta.url));
 assert.equal(createHash('sha256').update(atlas).digest('hex'),meta.atlasSHA256);
 assert.equal(meta.frames.length,10);
 assert.equal(new Set(meta.frames.map(f=>f.sourceFrame)).size,10);
});
