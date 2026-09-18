import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PACING_VERSION,RUN_SECONDS,PHASES,UNLOCKS,ELITE_EVENTS,encounterPhase,encounterRoster,encounterStats,resetEncounter,tickEncounter} from '../pacing/encounter-director.js';
import {assemble,replacements,htmlEdits,sha256} from '../pacing/assemble.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
function world(time=0){const w={mode:'auto',time,hp:100,enemies:[],bossSpawned:false,finished:false,serial:0,random:()=>.5,spawns:[],
 spawn(p,type,elite=false){const e={id:++this.serial,type,elite,miniBoss:type==='panda',boss:type==='boss',hp:100};this.enemies.push(e);this.spawns.push(e);return true;}};resetEncounter(w);return w;}
const step=(w,t,cap=100)=>{w.time=t;tickEncounter(w,.05,[0,0,0],cap);};
const ordinary=w=>w.enemies.filter(e=>e.hp>0&&!e.elite&&!e.miniBoss&&!e.boss);

test('ten-minute curve has no authored empty phase; lulls reduce pressure instead',()=>{
 assert.equal(RUN_SECONDS,600);assert.equal(PACING_VERSION,'cozy-10min-v2');assert.equal(PHASES[0].start,0);assert.equal(PHASES.at(-1).end,600);
 for(let i=0;i<PHASES.length;i++){const p=PHASES[i];assert.ok(p.end>p.start);if(i)assert.equal(PHASES[i-1].end,p.start);assert.ok(p.cap>0,p.label);assert.ok(p.budget>0,p.label);assert.ok(p.interval>0);}
 assert.equal(PHASES.some(p=>p.kind==='calm'),false);assert.ok(PHASES.some(p=>p.kind==='lull'));assert.equal(Math.max(...PHASES.map(p=>p.cap)),36);
 assert.deepEqual(PHASES.filter(p=>p.kind==='panda').map(p=>p.start),[300,480]);
 assert.deepEqual(ELITE_EVENTS.map(e=>e.type),['thorn','thorn','spark','spark','turtle','turtle','water','water']);
 assert.equal(encounterPhase(599.99).kind,'lull');assert.equal(encounterPhase(600).kind,'boss');assert.equal(encounterPhase(NaN).start,0);
});

test('normal unlocks remain explicit',()=>{
 assert.deepEqual(UNLOCKS,{thorn:0,spark:120,turtle:240,water:360});
 for(const [t,ids] of [[0,['thorn']],[119.99,['thorn']],[120,['thorn','spark']],[240,['thorn','spark','turtle']],[360,['thorn','spark','turtle','water']]])assert.deepEqual(encounterRoster(t),ids);
});

test('opening and every lull still spawn monsters without banking bursts',()=>{
 const w=world();step(w,0);assert.equal(ordinary(w).length,1);step(w,.01);assert.equal(ordinary(w).length,1);
 for(const p of PHASES.filter(p=>p.kind==='lull')){const x=world(p.start+.1);step(x,p.start+.1);assert.ok(ordinary(x).length>=1,p.label);const id=x.serial;step(x,p.start+.11);assert.equal(x.serial,id,p.label);}
});

test('higher caps are bounded and requested cap still wins',()=>{
 const w=world(545);for(let t=545;t<580;t+=.05)step(w,t);assert.equal(ordinary(w).length,36);
 const ids=w.enemies.map(e=>e.id);step(w,580);assert.ok(ids.every(id=>w.enemies.some(e=>e.id===id)),'phase switch never deletes survivors');
 const limited=world(545);for(let t=545;t<580;t+=.05)step(limited,t,12);assert.equal(ordinary(limited).length,12);
 const zero=world();for(const t of [0,95,150,205,255,300,395,445,480,535,570,600])step(zero,t,0);assert.equal(zero.serial,0);
});

test('ordinary budgets remain bounded even with instant kills or blocked terrain',()=>{
 for(const p of PHASES){const w=world(p.start);for(let t=p.start;t<p.end;t+=.05){w.enemies=w.enemies.filter(e=>e.elite||e.miniBoss||e.boss);step(w,t);}const normals=w.spawns.filter(e=>!e.elite&&!e.miniBoss&&!e.boss).length;assert.ok(normals<=p.budget,p.label);}
 const w=world(180);let attempts=0;w.spawn=()=>{attempts++;return false;};for(let t=180;t<230;t+=.05)step(w,t);assert.ok(attempts<70);assert.equal(w.encounter.spawned,0);
});

test('Elite events are more frequent, allow ordinary background mobs and cap living Elites at two',()=>{
 const w=world(95);step(w,95);assert.equal(w.enemies.filter(e=>e.elite).length,1);assert.ok(ordinary(w).length>=1);
 step(w,150);assert.equal(w.enemies.filter(e=>e.elite).length,2);assert.ok(ordinary(w).length>=2);
 const before=w.serial;step(w,205);assert.equal(w.enemies.filter(e=>e.elite).length,2);assert.equal(w.encounter.blocked,true);assert.ok(w.serial>=before);
 w.enemies=w.enemies.filter(e=>!e.elite);step(w,206);assert.equal(w.enemies.filter(e=>e.elite&&e.type==='spark').length,1);
 const late=world(540);step(late,540);assert.equal(late.enemies.filter(e=>e.elite&&e.type==='water').length,1,'535 Water event remains valid inside its window');
});

test('Panda phases keep a light ordinary background and boss only waits on unfinished Panda/heavy crowd',()=>{
 const w=world(300);step(w,300);assert.equal(w.enemies.filter(e=>e.miniBoss).length,1);assert.ok(ordinary(w).length>=1);
 w.time=600;step(w,600);assert.equal(w.bossSpawned,false,'Panda defers boss');
 w.enemies=w.enemies.filter(e=>!e.miniBoss).slice(0,8);step(w,601);assert.equal(w.bossSpawned,true);const id=w.serial;step(w,630);assert.equal(w.serial,id);
});

test('EXP is reduced across normal, Elite, Panda and boss rewards while movement stats stay unchanged',()=>{
 const base={hp:18,damage:5,speed:1.18,radius:.3,stride:.42};const early=encounterStats(0,base,'thorn'),late=encounterStats(600,base,'thorn');
 assert.equal(early.hp,16);assert.equal(early.damage,4);assert.equal(early.xp,2);assert.equal(late.hp,32);assert.equal(late.xp,3);
 for(const key of ['speed','radius','stride'])assert.equal(early[key],base[key]);assert.equal(base.hp,18);
 assert.equal(encounterStats(300,base,'panda').xp,40);assert.equal(encounterStats(480,base,'panda').xp,55);
 const elite={hp:190,damage:9,xp:18,speed:1.08,radius:.4};const tuned=encounterStats(150,elite,'thorn',true);assert.equal(tuned.xp,18);assert.equal(tuned.speed,elite.speed);
 assert.equal(encounterStats(600,{...base,xp:56},'boss',false,true).xp,28);
});

test('training modes and stopped/dead games are not driven by normal-play pacing',()=>{
 for(const mode of ['all','thorn','spark','turtle','water','panda','elites','elite-thorn','elite-spark','elite-turtle','elite-water','boss']){const w=world(540);w.mode=mode;step(w,540);assert.equal(w.serial,0);}
 for(const flags of [{hp:0},{finished:true}]){const w=world(540);Object.assign(w,flags);step(w,540);assert.equal(w.serial,0);}
 const w=world(540);tickEncounter(w,0,[0,0,0]);assert.equal(w.serial,0);
});

test('integration reverses exactly to the reviewed game source',async()=>{
 const bundle=await read('game/assets/main-critter-v4.js'),html=await read('game/index.html');const result=assemble(bundle,html);
 assert.equal(replacements(result.bundle,result.edits,true),bundle);assert.equal(replacements(result.html,htmlEdits(),true),html);
 assert.equal(result.edits.length,9);assert.ok(result.bundle.includes('/ 10:00'));assert.ok(result.html.includes('value="600"'));
 const c=JSON.parse(await read('CANON.json'));
 assert.equal(sha256(await read('pacing/encounter-director.js')),c.pacing.moduleSHA256);
 assert.equal(sha256(await read('pacing/assemble.mjs')),c.pacing.assemblerSHA256);
 assert.equal(sha256(result.bundle),c.pacing.bundleSHA256);assert.equal(sha256(result.html),c.pacing.htmlSHA256);
});
