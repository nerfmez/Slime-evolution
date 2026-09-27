import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HELL,PHASES,hellPhase,encounterPhase,encounterStatus,resetEncounter,tickEncounter} from '../pacing/encounter-director.js';
function world(time=0,hell=true){const w={mode:'auto',hell,time,hp:100,enemies:[],bossSpawned:false,finished:false,serial:0,random:()=>.5,spawns:[],
 spawn(p,type,elite=false){const e={id:++this.serial,type,elite,miniBoss:type==='panda',boss:type==='boss',hp:100};this.enemies.push(e);this.spawns.push(e);return true;}};resetEncounter(w);return w;}
const step=(w,t,cap=100)=>{w.time=t;tickEncounter(w,.05,[0,0,0],cap);};
const ordinary=w=>w.enemies.filter(e=>e.hp>0&&!e.elite&&!e.miniBoss&&!e.boss);

test('HELL caps climb from 30 to 100 and never pass 100',()=>{
 assert.equal(HELL.maxAlive,100);
 for(const p of PHASES){const h=hellPhase(p,p.start);assert.ok(h.cap>=Math.min(100,p.cap*3)&&h.cap<=100,p.label);assert.ok(h.interval<p.interval);assert.equal(h.budget,Infinity);}
 assert.equal(hellPhase(encounterPhase(0),0).cap,30);assert.equal(hellPhase(encounterPhase(310),310).cap,100);
 const w=world(0);let peak=0;for(let t=0;t<600;t+=.05){step(w,t);peak=Math.max(peak,ordinary(w).length);}
 assert.equal(peak,100,'the horde reaches 100 alive and stops there');
});

test('HELL fills fast, respects the requested cap, and normal mode is unchanged',()=>{
 const w=world(0);for(let t=0;t<5;t+=.05)step(w,t);assert.ok(ordinary(w).length>=25,`${ordinary(w).length} alive after 5 s`);
 const capped=world(310);for(let t=310;t<330;t+=.05)step(capped,t,40);assert.equal(ordinary(capped).length,40);
 const normal=world(0,false);for(let t=0;t<5;t+=.05)step(normal,t);assert.ok(ordinary(normal).length<=4,'normal mode keeps its gentle opening');
});

test('HELL boss comes with the horde down to 40, which then keeps coming up to 40',()=>{
 const w=world(600);for(let i=0;i<90;i++)w.enemies.push({id:1000+i,type:'thorn',hp:100});
 step(w,600);assert.equal(w.bossSpawned,false);
 w.enemies=w.enemies.filter((e,i)=>i<40);step(w,600.05);assert.equal(w.bossSpawned,true);
 for(let t=600.1;t<640;t+=.05)step(w,t);assert.equal(ordinary(w).length,40);
 assert.match(encounterStatus(w),/^HELL · /);
});

test('HELL allows three Elites together',()=>{
 const w=world(95);w.enemies.push({id:900,type:'thorn',elite:true,hp:100},{id:901,type:'thorn',elite:true,hp:100});
 step(w,95);assert.equal(w.enemies.filter(e=>e.elite&&e.hp>0).length,3);
});
