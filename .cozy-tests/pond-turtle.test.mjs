import {undoPandaFile} from './panda-provenance.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {turtlePose,turtleFacing,turtleDamage,turtleShieldActive,turtleGuard,tickTurtleWorld,
  TURTLE_GUARD_CHARGE,TURTLE_GUARD_HOLD,TURTLE_GUARD_LENGTH,TURTLE_GUARD_COOLDOWN,
  TURTLE_DAMAGE_MULTIPLIER,TURTLE_DEATH_LIFE,createPondTurtleRenderer,TURTLE_FOOT,TURTLE_CELL_WORLD,TURTLE_WALK_SEQUENCE} from '../game/assets/pond-turtle.js';
import {normalEnemies,eliteEnemies,spawnSchedule,unlockedEnemies} from '../game/assets/enemy-roster.js';
import {undoTurtleBundle} from './turtle-provenance.mjs';
const root=new URL('../',import.meta.url),sha=x=>createHash('sha256').update(x).digest('hex');
const read=p=>readFile(new URL(p,root));
const metadata=JSON.parse(await read('game/assets/enemies/pond-turtle-atlas.json'));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const enemy=()=>({id:1,type:'turtle',hp:44,maxHP:44,radius:.42,x:0,z:0,yaw:Math.PI/2,walkBlend:1,walkPhase:0,attack:0,hit:0});

test('Pond Turtle uses the exact approved video and still sheet, with 12 ordered REAL video frames',async()=>{
 for(const [p,hash]of Object.entries(metadata.sourceSHA256))assert.equal(sha(await read('art/turtle/'+p)),hash,p);
 assert.deepEqual(metadata.walkFrames,[72,78,84,90,96,102,108,114,120,126,132,138]);
 assert.equal(new Set(metadata.cells.slice(0,12).map(c=>c.sourceFrameSHA256)).size,12);
 for(const c of metadata.cells.slice(0,12)){assert.equal(c.timestamp,c.videoFrame/30);assert.equal(c.scale,.445);}
 assert.deepEqual(metadata.pivot,[192,328]);assert.equal(metadata.nativeFacing,'right');
 assert.deepEqual(metadata.cells.slice(12).map(c=>c.state),['hurt','death','guard','shield-effect']);
 const bytes=await read('game/assets/enemies/pond-turtle-atlas.webp');assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.ok(bytes.length<1300000);
});
test('eight original walk poses in order, original hurt and empty-shell death; no new facing pose',()=>{
 assert.deepEqual(TURTLE_WALK_SEQUENCE,[0,1,3,4,6,7,9,10]);
 assert.deepEqual(Array.from({length:8},(_,i)=>turtlePose({walkBlend:1,walkPhase:(i+.1)/8}).cell),TURTLE_WALK_SEQUENCE);
 close(TURTLE_CELL_WORLD,2.42);
 assert.equal(turtlePose({}).cell,0);assert.equal(turtlePose({hit:.1}).cell,12);
 assert.equal(turtlePose({turtleDeath:0,hit:1,turtleGuardAge:1}).cell,13);assert.equal(turtlePose({turtleDeath:1}).alpha,0);
 for(const [age,name,alpha] of [[0,'charge',0],[.15,'charge',.5],[.31,'guard',1],[1,'guard',1],[2.825,'recover',.5]]){
  const p=turtlePose({turtleGuardAge:age});assert.equal(p.name,name);assert.equal(p.cell,14);close(p.shield,alpha);
 }
 const e=enemy();e.yaw=-Math.PI/2;assert.equal(turtleFacing(e),-1);e.turtleGuardAge=1;e.yaw=Math.PI/2;assert.equal(turtleFacing(e),-1);
 delete e.turtleGuardAge;assert.equal(turtleFacing(e),1);
});
test('Shell Guard charges then reduces self damage by 70%, never grants immunity or protects other species',()=>{
 for(const age of [0,.15,.299,2.71,2.90]){const e={...enemy(),turtleGuardAge:age};assert.equal(turtleShieldActive(e),false);assert.equal(turtleDamage(e,20),20);}
 for(const age of [.30,.6,1.5,2.69]){const e={...enemy(),turtleGuardAge:age};assert.equal(turtleShieldActive(e),true);close(turtleDamage(e,20),6);assert.equal(e.turtleShieldFlash,.14);}
 for(const type of ['thorn','spark','water','boss'])assert.equal(turtleDamage({...enemy(),type,turtleGuardAge:1},20),20);
 const e={...enemy(),turtleGuardAge:1};assert.equal(turtlePose({...e,hit:.12}).name,'guard');e.hp=0;assert.equal(turtleShieldActive(e),false);
 close(TURTLE_GUARD_CHARGE,.30);close(TURTLE_GUARD_HOLD,2.4);close(TURTLE_DAMAGE_MULTIPLIER,.3);
});
test('guard is stationary, expires on time even while frozen, has cooldown and resumes ordinary movement',()=>{
 const e=enemy(),w={enemies:[e],turtleDead:[]};assert.equal(turtleGuard(w,e,.05,[3,0,0],3,true),false);assert.equal(e.turtleGuardAge,0);
 e.frozen=8;
 for(let i=0;i<60;i++)tickTurtleWorld(w,.05);
 assert.equal(e.turtleGuardAge,undefined);assert.equal(turtlePose(e).name,'idle');assert.ok(e.turtleGuardCooldown>3);
 delete e.frozen;assert.equal(turtleGuard(w,e,.05,[3,0,0],3,true),true);assert.equal(e.x,0);
 for(let i=0;i<72;i++)tickTurtleWorld(w,.05);
 assert.equal(turtleGuard(w,e,.05,[3,0,0],3,true),false);assert.equal(e.turtleGuardCooldown,TURTLE_GUARD_COOLDOWN);
});
test('far hits request guard after original hurt pose; normal visibility gate and cooldown still apply',()=>{
 const e=enemy(),w={enemies:[e]};assert.equal(turtleGuard(w,e,.05,[6,0,0],6,false),true);assert.equal(e.turtleGuardAge,undefined);
 assert.equal(turtleDamage(e,10),10);e.hit=.12;assert.equal(turtleGuard(w,e,.05,[6,0,0],6,false),false);assert.equal(turtlePose(e).name,'hurt');
 e.hit=0;assert.equal(turtleGuard(w,e,.05,[6,0,0],6,false),false);assert.equal(e.turtleGuardAge,0);
});
test('death remnant expires once; Turtle is independent at 120s and old unlock/elite timing never shifts',()=>{
 const w={enemies:[],turtleDead:[{turtleDeath:0},{turtleDeath:.9}]};tickTurtleWorld(w,.15);assert.equal(w.turtleDead.length,1);close(w.turtleDead[0].turtleDeath,.15);
 tickTurtleWorld(w,TURTLE_DEATH_LIFE);assert.equal(w.turtleDead.length,0);
 assert.deepEqual(spawnSchedule,{thorn:0,spark:60,turtle:120,water:180});assert.deepEqual(Object.keys(eliteEnemies),['water']);
 assert.deepEqual(unlockedEnemies('auto',119.9),['thorn','spark']);assert.deepEqual(unlockedEnemies('auto',120),['thorn','spark','turtle']);
 assert.deepEqual(unlockedEnemies('auto',180),['thorn','spark','turtle','water']);assert.equal(normalEnemies.turtle.speed,.64);
});
test('only three existing runtime files change; exact reverse hooks preserve ALL other main bytes and shared systems',async()=>{
 const before=JSON.parse(await read('docs/turtle-parent-manifest.json')),changed=new Set(['index.html','assets/main-critter-v4.js','assets/enemy-roster.js']);let same=0;
 for(const e of before)if(!changed.has(e.path)){assert.equal(sha(await read('game/'+e.path)),e.sha256,e.path);same++;}
 assert.equal(same,1254);
 const bundle=(await read('game/assets/main-critter-v4.js')).toString(),restored=undoTurtleBundle(bundle);
 assert.equal(sha(restored),before.find(x=>x.path==='assets/main-critter-v4.js').sha256);
 assert.throws(()=>undoTurtleBundle(bundle+'unapproved edit'));
 let registry=undoPandaFile('assets/enemy-roster.js',await read('game/assets/enemy-roster.js')).toString().replace("  turtle: Object.freeze({name:'Pond Turtle',stride:.92,speed:.64,radius:.42,hp:44,damage:5}),\n",'').replace('thorn:0,spark:60,turtle:120,water:180','thorn:0,spark:60,water:180');
 assert.equal(sha(registry),before.find(x=>x.path==='assets/enemy-roster.js').sha256);
 let html=undoPandaFile('index.html',await read('game/index.html')).toString().replace('กบ + เม่นสายฟ้า + เต่า + ช้าง','กบ + เม่นสายฟ้า + ช้าง').replace('<option value="turtle">Pond Turtle · เต่าโล่พลัง</option>','');
 assert.equal(sha(html),before.find(x=>x.path==='index.html').sha256);
 assert.equal(bundle.split('t=turtleDamage(e,t)').length,2);assert.equal(bundle.split('n.hp-=turtleDamage(n,22*e)').length,2);
});
test('actual Turtle renderer uses unchanged pivot and one body scale for every pose/facing/camera; aura alone pulses',async t=>{
 const oldImage=globalThis.Image;globalThis.Image=class{naturalWidth=1536;naturalHeight=1536;async decode(){}};
 t.after(()=>{if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;});
 t.mock.method(globalThis,'fetch',async()=>new Response(new Blob(['atlas is decoded by browser integration tests'])));
 const gl=new Proxy({getParameter:()=>false,createTexture:()=>({}),getUniformLocation:(_,x)=>x},{get:(o,k)=>k in o?o[k]:String(k).toUpperCase()===k?0:()=>{}});
 let values={},draws=[];const renderer=await createPondTurtleRenderer(gl,{program:()=>({}),geometry:()=>({}),uniform:(_,__,k,v)=>values[k]=v,render:()=>draws.push({...values})});
 const poses=[...Array.from({length:8},(_,i)=>({walkBlend:1,walkPhase:(i+.1)/8})),{hit:.12},{turtleDeath:.4},{turtleGuardAge:.15},{turtleGuardAge:1.1}];
 for(const camera of [[0,12,15],[0,4,18],[0,21,.1]])for(const facing of [-1,1])for(const pose of poses){
  draws=[];const e={...enemy(),turtleFacing:facing,yaw:facing*Math.PI/2,...pose};renderer.draw(e,[],[0,0,0],camera);
  assert.equal(draws[0].size,TURTLE_CELL_WORLD);assert.equal(draws[0].anchor,TURTLE_FOOT);assert.deepEqual(draws[0].origin,[0,.025,0]);assert.equal(draws[0].flipX,facing<0?1:0);
  assert.equal(draws.length,pose.turtleGuardAge!=null?2:1);if(draws.length===2){assert.equal(draws[1].emissive,1);assert.ok(Math.abs(draws[1].size/TURTLE_CELL_WORLD-1)<.013);}
 }
});
