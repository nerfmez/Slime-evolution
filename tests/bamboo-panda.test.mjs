import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pandaPose,pandaFacing,pandaAI,resetPandaWorld,tickPandaWorld,spawnScheduledPanda,PANDA_CELL_WORLD,PANDA_FOOT,PANDA_CHARGE,PANDA_ROLL_DISTANCE,PANDA_ROLL_END,PANDA_ATTACK_LENGTH,PANDA_COOLDOWN,createBambooPandaRenderer} from '../game/assets/bamboo-panda.js';
import {normalEnemies,miniBossEnemies,eliteEnemies,unlockedEnemies,normalizeEnemyMode,spawnSchedule} from '../game/assets/enemy-roster.js';
import {SPARK_DASH_SPEED,SPARK_ATTACK_DURATIONS} from '../game/assets/spark-hedgehog.js';
import {undoPandaFile} from './panda-provenance.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url));const sha=x=>createHash('sha256').update(x).digest('hex');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function setup(){const e={id:1,type:'panda',miniBoss:true,hp:480,maxHP:480,radius:.62,x:0,z:0,yaw:Math.PI/2,hit:0,attack:0};const w={time:0,mode:'auto',enemies:[e],hp:100,playerRadius:.25,hits:[],moveEnemy(e,x,z){assert.ok(Math.hypot(x,z)<=.055+1e-8);e.x+=x;e.z+=z;},damage(n){this.hits.push(n);this.hp-=n;}};resetPandaWorld(w);return {e,w};}
test('Panda remains outside the ordinary roster, single explicit test mode, no old timing or stats change',()=>{
 assert.deepEqual(Object.keys(normalEnemies),['thorn','spark','turtle','water']);assert.deepEqual(Object.keys(eliteEnemies),['water']);assert.deepEqual(Object.keys(miniBossEnemies),['panda']);
 assert.deepEqual(spawnSchedule,{thorn:0,spark:60,turtle:120,water:180});assert.deepEqual(unlockedEnemies('auto',240),['thorn','spark','turtle','water']);assert.deepEqual(unlockedEnemies('all'),['thorn','spark','turtle','water']);assert.equal(normalizeEnemyMode('panda'),'panda');assert.deepEqual(unlockedEnemies('panda'),['panda']);
 assert.equal(miniBossEnemies.panda.hp,480);assert.equal(miniBossEnemies.panda.speed,.78);
});
test('Eight walk and eight roll images, original hurt/death; charge and recovery lock facing',()=>{
 assert.deepEqual(Array.from({length:8},(_,i)=>pandaPose({walkBlend:1,walkPhase:(i+.1)/8}).cell),[0,1,2,3,4,5,6,7]);
 assert.deepEqual(Array.from({length:8},(_,i)=>pandaPose({pandaAge:1,pandaRollDistance:(i+.1)/8*3.2}).cell),[8,9,10,11,12,13,14,15]);
 assert.equal(pandaPose({pandaAge:.4}).cell,16);assert.equal(pandaPose({hit:.1}).cell,17);assert.equal(pandaPose({pandaDeath:.1,hit:1,pandaAge:1}).cell,18);
 const e={yaw:-Math.PI/2};assert.equal(pandaFacing(e),-1);e.pandaAge=.4;e.yaw=Math.PI/2;assert.equal(pandaFacing(e),-1);
 assert.equal(pandaPose({pandaAge:2.2}).name,'recover');assert.equal(pandaPose({pandaDeath:1.15}).alpha,0);
});
test('Charge .8s then roll 9.6 units across the target: far beyond Spark and one damage event',()=>{
 assert.ok(PANDA_ROLL_DISTANCE>3.5*SPARK_DASH_SPEED*SPARK_ATTACK_DURATIONS[2]);close(PANDA_ROLL_DISTANCE,9.6);
 for(const dt of [.01,.025,.05,.12]){const {w,e}=setup();let time=0;
  for(let i=0;i<Math.ceil(2.65/dt);i++){pandaAI(w,e,dt,[5,0,0],5,true,12);time+=dt;if(time<PANDA_CHARGE-1e-8){close(e.x,0);assert.equal(w.hits.length,0);}}
  close(e.x,9.6);close(e.z,0);assert.deepEqual(w.hits,[18]);assert.equal(e.pandaAge,undefined);assert.equal(e.pandaCooldown,PANDA_COOLDOWN);
 }
});
test('Roll respects obstacles, cannot home to sidestep, hurt interrupts anticipation but never grants invulnerability',()=>{
 let {w,e}=setup();pandaAI(w,e,.4,[5,0,0],5,true,12);e.hit=.2;pandaAI(w,e,.05,[5,0,0],5,true,12);assert.equal(e.pandaAge,undefined);assert.equal(e.x,0);assert.equal(pandaPose(e).name,'hurt');
 ({w,e}=setup());w.moveEnemy=(e,x,z)=>{if(e.x+x<=2){e.x+=x;e.z+=z;}};for(let i=0;i<55;i++)pandaAI(w,e,.05,[5,0,0],5,true,12);assert.ok(e.x<2.01);assert.equal(w.hits.length,0);
 ({w,e}=setup());pandaAI(w,e,.4,[5,0,0],5,true,12);for(let i=0;i<45;i++)pandaAI(w,e,.05,[5,0,3],6,true,12);close(e.z,0);assert.equal(w.hits.length,0);
 ({w,e}=setup());pandaAI(w,e,.4,[5,0,0],5,false,12);assert.equal(e.pandaAge,undefined);
});
test('Rare scheduled encounters at 150 and 240, at most one alive; no spawning after boss transition',()=>{
 const w={mode:'auto',time:0,enemies:[],spawn(t,type){this.enemies.push({type,hp:480});return true;}};resetPandaWorld(w);
 w.time=149.99;spawnScheduledPanda(w,[]);assert.equal(w.enemies.length,0);w.time=150;spawnScheduledPanda(w,[]);assert.equal(w.enemies.length,1);
 w.time=239.9;spawnScheduledPanda(w,[]);assert.equal(w.enemies.length,1);w.time=240;spawnScheduledPanda(w,[]);assert.equal(w.enemies.length,1);assert.equal(w.pandaSpawnSlot,2);
 w.time=0;w.enemies=[];resetPandaWorld(w);w.time=150;spawnScheduledPanda(w,[]);w.enemies=[];w.time=240;spawnScheduledPanda(w,[]);assert.equal(w.enemies.length,1);
 w.enemies=[];w.time=300;spawnScheduledPanda(w,[]);assert.equal(w.enemies.length,0);
 for(const mode of ['all','spark','turtle','water','boss','panda']){w.mode=mode;w.time=150;w.enemies=[];resetPandaWorld(w);spawnScheduledPanda(w,[]);assert.equal(w.enemies.length,0);}
});
test('Remnant/dust expire; all original source inputs and the reviewed transparent atlas are hash-locked',async()=>{
 const {w}=setup();w.pandaDead=[{pandaDeath:1}];w.pandaDust=[{age:.4}];tickPandaWorld(w,.2);assert.equal(w.pandaDead.length,0);assert.equal(w.pandaDust.length,0);
 const m=JSON.parse(await read('game/assets/enemies/bamboo-panda-atlas.json'));assert.equal(m.cells.length,20);assert.deepEqual(m.pivot,[192,330]);
 for(const [p,h]of Object.entries(m.sourceSHA256))assert.equal(sha(await read('art/panda/'+p)),h,p);
 assert.equal(sha(await read('game/assets/enemies/bamboo-panda-atlas.webp')),m.atlasSHA256);assert.ok(m.cells.slice(0,19).every(c=>c.pixelsAlphaChanged>0));
});
test('Panda exact reverse proves all 1260 parent runtime files retained and 1257 untouched byte-for-byte',async()=>{
 const manifest=JSON.parse(await read('docs/panda-parent-manifest.json'));assert.equal(manifest.length,1260);let identical=0;
 for(const e of manifest){const current=await read('game/'+e.path),prior=undoPandaFile(e.path,current);assert.equal(sha(prior),e.sha256,e.path);if(sha(current)===e.sha256)identical++;}
 assert.equal(identical,1257);assert.throws(()=>undoPandaFile('assets/main-critter-v4.js','unapproved'));
});
test('Actual renderer uses uniform body scale/pivot across states, both facings and cameras, rebinds its atlas',async t=>{
 const old=globalThis.Image;globalThis.Image=class{naturalWidth=1536;naturalHeight=1920;async decode(){}};t.after(()=>{if(old===undefined)delete globalThis.Image;else globalThis.Image=old;});
 t.mock.method(globalThis,'fetch',async()=>new Response(new Blob(['browser decodes actual atlas'])));
 let bindings=0;const gl=new Proxy({getParameter:()=>false,createTexture:()=>({}),getUniformLocation:(_,x)=>x,bindTexture:()=>bindings++},{get:(o,k)=>k in o?o[k]:String(k).toUpperCase()===k?0:()=>{}});
 let values={},draws=[];const r=await createBambooPandaRenderer(gl,{program:()=>({}),geometry:()=>({}),uniform:(_,__,k,v)=>values[k]=v,render:()=>draws.push({...values})});
 const poses=[...Array.from({length:8},(_,i)=>({walkBlend:1,walkPhase:(i+.1)/8})),...Array.from({length:8},(_,i)=>({pandaAge:1,pandaRollDistance:(i+.1)/8*3.2})),{hit:.2},{pandaDeath:.1},{pandaAge:.4}];
 for(const camera of [[0,12,15],[0,4,18],[0,21,.1]])for(const facing of [-1,1])for(const pose of poses){draws=[];r.draw({...setup().e,yaw:facing*Math.PI/2,pandaFacing:facing,...pose},[],[],camera);assert.equal(draws.length,1);assert.equal(draws[0].size,PANDA_CELL_WORLD);assert.equal(draws[0].anchor,PANDA_FOOT);assert.equal(draws[0].flipX,facing<0?1:0);assert.deepEqual(draws[0].origin,[0,.025,0]);}
 assert.ok(bindings>100);
});
