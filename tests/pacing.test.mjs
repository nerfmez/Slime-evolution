import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PACING_VERSION,RUN_SECONDS,PHASES,UNLOCKS,encounterPhase,encounterRoster,encounterStats,resetEncounter,tickEncounter} from '../pacing/encounter-director.js';
import {assemble,replacements,htmlEdits,sha256} from '../pacing/assemble.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
function world(time=0){const w={mode:'auto',time,hp:100,enemies:[],bossSpawned:false,serial:0,random:()=>.5,
 spawn(p,type,elite=false){this.enemies.push({id:++this.serial,type,elite,miniBoss:type==='panda',boss:type==='boss',hp:100});return true;}};resetEncounter(w);return w;}
const step=(w,t,cap=100)=>{w.time=t;tickEncounter(w,.05,[0,0,0],cap);};
test('normal-play timeline covers exactly 600 seconds without gaps; quiet and bounded encounters alternate',()=>{
 assert.equal(RUN_SECONDS,600);assert.equal(PACING_VERSION,'cozy-10min-v1');assert.equal(PHASES[0].start,0);assert.equal(PHASES.at(-1).end,600);
 for(let i=0;i<PHASES.length;i++){const p=PHASES[i];assert.ok(p.end>p.start);if(i)assert.equal(PHASES[i-1].end,p.start);if(p.kind==='wave'){assert.ok(p.cap>=6&&p.cap<=28);assert.ok(p.end-p.start<=40);assert.ok(p.budget<=60);}}
 assert.equal(PHASES.filter(p=>p.kind==='calm').reduce((s,p)=>s+p.end-p.start,0),185);
 assert.deepEqual(PHASES.filter(p=>p.kind==='panda').map(p=>p.start),[300,480]);assert.deepEqual(PHASES.filter(p=>p.kind==='elite').map(p=>[p.start,p.focus]),[[105,'thorn'],[215,'spark'],[420,'turtle'],[520,'water']]);
 assert.equal(encounterPhase(599.99).kind,'calm');assert.equal(encounterPhase(600).kind,'boss');assert.equal(encounterPhase(NaN).start,0);
});
test('normal unlocks are explicit and cannot reintroduce retired species',()=>{
 assert.deepEqual(UNLOCKS,{thorn:0,spark:120,turtle:240,water:360});
 for(const [t,ids] of [[0,['thorn']],[119.99,['thorn']],[120,['thorn','spark']],[240,['thorn','spark','turtle']],[360,['thorn','spark','turtle','water']]])assert.deepEqual(encounterRoster(t),ids);
});
test('intro/rest/tail emit no new monsters; no first-frame burst or banking across long pauses',()=>{
 const w=world();for(const t of [0,14.99])step(w,t);assert.equal(w.serial,0);
 step(w,15);assert.equal(w.serial,1);step(w,15.01);assert.equal(w.serial,1);
 w.enemies=[];step(w,39.1);const id=w.serial;for(const t of [44,45,50,69.99])step(w,t);assert.equal(w.serial,id);
 step(w,70);assert.equal(w.serial,id+1);step(w,70.01);assert.equal(w.serial,id+1);
 for(const p of PHASES.filter(p=>p.kind==='calm')){w.enemies=[];step(w,p.start+.1);const old=w.serial;for(let t=p.start+.2;t<p.end;t+=.5)step(w,t);assert.equal(w.serial,old);}
});
test('wave cap includes survivors and never removes existing living enemies',()=>{
 const w=world(540);for(let t=540;t<575;t+=.05)step(w,t);assert.equal(w.enemies.length,28);
 const ids=w.enemies.map(e=>e.id);step(w,575);assert.deepEqual(w.enemies.map(e=>e.id),ids);
 const limited=world(540);for(let t=540;t<575;t+=.05)step(limited,t,12);assert.equal(limited.enemies.length,12);
 const zero=world();for(const t of [15,105,120,215,300,420,480,520,540,600])step(zero,t,0);assert.equal(zero.serial,0);
});
test('per-wave budgets and spawn attempts are bounded even with instant kills or blocked terrain',()=>{
 for(const p of PHASES.filter(p=>p.kind==='wave')){const w=world(p.start);for(let t=p.start;t<p.end;t+=.05){w.enemies=[];step(w,t);}assert.ok(w.serial<=p.budget);assert.ok(w.serial>=p.budget-2,`${p.start}: ${w.serial}/${p.budget}`);}
 const w=world(120);let attempts=0;w.spawn=()=>{attempts++;return false;};for(let t=120;t<155;t+=.05)step(w,t);assert.ok(attempts<32);assert.equal(w.encounter.spawned,0);
});
test('one special at a time; no normals join it; eight-second respite after its death',()=>{
 const w=world(300);step(w,300);assert.deepEqual(w.enemies.map(e=>e.type),['panda']);
 step(w,365);step(w,420);step(w,480);assert.equal(w.serial,1);
 w.enemies=[];step(w,481);step(w,488.9);assert.equal(w.serial,1);step(w,489.01);assert.equal(w.serial,2);
 w.enemies=[];step(w,490);step(w,499);assert.equal(w.serial,2,'same Panda event cannot respawn after its death');
});
test('events expire without backlogging; reset restores all event state; boss is unique and not at five minutes',()=>{
 const w=world(299);step(w,299);assert.equal(w.bossSpawned,false);step(w,300);assert.equal(w.enemies[0].type,'panda');
 step(w,600);assert.equal(w.bossSpawned,false);w.enemies=[];step(w,601);step(w,609.1);assert.equal(w.bossSpawned,true);const id=w.serial;step(w,630);assert.equal(w.serial,id);
 w.bossSpawned=false;w.enemies=[];w.time=0;resetEncounter(w);step(w,15);assert.equal(w.encounter.history.length,1);assert.equal(w.encounter.phase,1);
 const skipped=world(539);step(skipped,539,0);assert.equal(skipped.serial,0);step(skipped,540);assert.equal(skipped.enemies[0].miniBoss,false);
});
test('early/late HP and rewards scale while speed, radius, art and AI timing data stay unchanged',()=>{
 const base={hp:18,damage:5,speed:1.18,radius:.3,stride:.42};const early=encounterStats(0,base,'thorn'),late=encounterStats(600,base,'thorn');
 assert.equal(early.hp,16);assert.equal(early.damage,4);assert.equal(early.xp,4);assert.equal(late.hp,32);assert.equal(late.xp,8);
 for(const key of ['speed','radius','stride'])assert.equal(early[key],base[key]);assert.equal(base.hp,18);
 assert.equal(encounterStats(300,base,'panda').hp,420);assert.equal(encounterStats(480,base,'panda').hp,640);
 const elite={hp:190,damage:9,xp:42,speed:1.08,radius:.4};const tuned=encounterStats(105,elite,'thorn',true);assert.equal(tuned.xp,42);assert.ok(tuned.hp>=elite.hp*.95);assert.equal(tuned.speed,elite.speed);assert.equal(encounterStats(600,base,'boss',false,true).hp,6200);
});
test('training modes and stopped/dead games are not driven by normal-play pacing',()=>{
 for(const mode of ['all','thorn','spark','turtle','water','panda','elites','elite-thorn','elite-spark','elite-turtle','elite-water','boss']){const w=world(540);w.mode=mode;step(w,540);assert.equal(w.serial,0);}
 for(const flags of [{hp:0},{finished:true}]){const w=world(540);Object.assign(w,flags);step(w,540);assert.equal(w.serial,0);}
 const w=world(540);tickEncounter(w,0,[0,0,0]);assert.equal(w.serial,0);
});
test('integration reverses exactly to the latest Panda source; no skill, art, input or AI rewrite',async()=>{
 const bundle=await read('game/assets/main-critter-v4.js'),html=await read('game/index.html');const result=assemble(bundle,html);
 assert.equal(replacements(result.bundle,result.edits,true),bundle);assert.equal(replacements(result.html,htmlEdits(),true),html);
 assert.equal(result.edits.length,9);assert.ok(result.bundle.includes('/ 10:00'));assert.ok(result.html.includes('value="600"'));
 const c=JSON.parse(await read('CANON.json'));
 assert.equal(sha256(await read('pacing/encounter-director.js')),c.pacing.moduleSHA256);
 assert.equal(sha256(await read('pacing/assemble.mjs')),c.pacing.assemblerSHA256);
 assert.equal(sha256(result.bundle),c.pacing.bundleSHA256);assert.equal(sha256(result.html),c.pacing.htmlSHA256);
});
