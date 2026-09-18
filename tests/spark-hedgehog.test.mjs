import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {sparkPose,sparkFacing,sparkAttackFrame,sparkMelee,sparkImpactPoint,tickSparkWorld,SPARK_ATTACK_LENGTH,SPARK_DEATH_LIFE,SPARK_DASH_START,SPARK_DASH_SPEED,SPARK_TRIGGER_RANGE,SPARK_IMPACT_TIME} from '../game/assets/spark-hedgehog.js';
import {normalEnemies,spawnSchedule,unlockedEnemies} from '../game/assets/enemy-roster.js';
import {undoSparkBundle} from './spark-provenance.mjs';
const root=new URL('../',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex');
const art=JSON.parse(await readFile(new URL('game/assets/enemies/spark-hedgehog-atlas.json',root),'utf8'));
test('approved source images preserved; only crop, transparency, mirror and bounded color correction',async()=>{
 for(const [file,hash] of Object.entries(art.sourceSHA256))assert.equal(sha(await readFile(new URL('art/spark/'+file,root))),hash,file);
 assert.equal(art.cells.length,14);assert.deepEqual(art.pivot,[192,330]);
 assert.ok(art.cells.every(c=>c.nativeFacing==='right'&&c.pivot[0]===192&&c.pivot[1]===330));
 assert.ok(art.hurtColorShift.flat().every(x=>Math.abs(x)<=7.8+1e-9));
 assert.ok(art.deathColorShift.flat().every(x=>Math.abs(x)<=7.8+1e-9));
 const bytes=await readFile(new URL('game/assets/enemies/spark-hedgehog-atlas.webp',root));
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(bytes.length<1000000);
});
test('all six distance-driven run frames and six distinct attack stages; death/hurt priority',()=>{
 assert.deepEqual(Array.from({length:6},(_,i)=>sparkPose({walkPhase:(i+.1)/6,walkBlend:1}).cell),[0,1,2,3,4,5]);
 assert.deepEqual([0,.19,.61,.93,1.03,1.14].map(t=>sparkPose({sparkAge:t,walkBlend:1}).cell),[6,7,8,9,10,11]);
 assert.equal(sparkPose({}).name,'idle');assert.equal(sparkPose({sparkAge:.3,hit:.1}).cell,12);
 assert.equal(sparkPose({sparkDeath:0,hit:.1,sparkAge:.3}).cell,13);assert.equal(sparkPose({sparkDeath:SPARK_DEATH_LIFE}).alpha,0);
 assert.equal(sparkAttackFrame(.92),3);assert.equal(sparkAttackFrame(1.29),5);
 const e={yaw:-Math.PI/2};assert.equal(sparkFacing(e),-1);e.sparkAge=.15;e.yaw=Math.PI/2;assert.equal(sparkFacing(e),-1);
 delete e.sparkAge;assert.equal(sparkFacing(e),1);e.yaw=0;assert.equal(sparkFacing(e),1);
});
function simulation(){
 const e={id:1,type:'spark',hp:22,x:0,z:0,yaw:Math.PI/2,radius:.30,attack:0,hit:0,walkBlend:1};
 const world={hp:100,playerRadius:.25,enemies:[e],moveEnemy(e,x,z){e.x+=x;e.z+=z},hits:[],damage(n){this.hp-=n;this.hits.push(n)}};
 return {world,e};
}
test('wind-up before a collision-stepped dash, one damage event at authored impact, recovery then run',()=>{
 const {world,e}=simulation();let seen=[];
 for(let i=0;i<150;i++){
  const age=i*.01;sparkMelee(world,e,.01,[1,0,0],1,true,6);seen.push(sparkPose(e).cell);
  if(age<.90)assert.equal(world.hp,100);
  if(age<.59)assert.equal(e.x,0);
  if(i>=130)break;
 }
 assert.equal(world.hp,94);assert.deepEqual(world.hits,[6]);assert.equal(e.sparkAge,undefined);
 assert.ok(Math.abs(e.x-.40)<1e-8);assert.ok(e.walkPhase>0);assert.ok([6,7,8,9,10,11].every(i=>seen.includes(i)));
 assert.ok(SPARK_ATTACK_LENGTH>1.28&&SPARK_ATTACK_LENGTH<1.30);
});
test('hit interrupts charge, obstacles stop dash, moving target can dodge, no damage through walls',()=>{
 let {world,e}=simulation();sparkMelee(world,e,.10,[1,0,0],1,true,6);e.hit=.12;
 sparkMelee(world,e,.1,[1,0,0],1,true,6);assert.equal(e.sparkAge,undefined);assert.equal(world.hp,100);assert.equal(sparkPose(e).name,'hurt');
 ({world,e}=simulation());world.moveEnemy=()=>{};
 for(let i=0;i<30;i++)sparkMelee(world,e,.05,[1.2,0,0],1.2,true,6);
 assert.equal(e.x,0);assert.equal(world.hp,100);
 ({world,e}=simulation());sparkMelee(world,e,.1,[1,0,0],1,true,6);
 for(let i=0;i<30;i++)sparkMelee(world,e,.05,[1,0,3],3,true,6);
 assert.equal(world.hp,100);
 ({world,e}=simulation());assert.equal(sparkMelee(world,e,.05,[1,0,0],1,false,6),true);assert.equal(e.sparkAge,undefined);
});
test('new species never changes Water unlock, old enemies, boss constants or shared gameplay bytes',async()=>{
 assert.equal(normalEnemies.spark.hp,22);assert.deepEqual(spawnSchedule,{thorn:0,spark:60,water:180});
 assert.deepEqual(unlockedEnemies('auto',59.9),['thorn']);assert.deepEqual(unlockedEnemies('auto',60),['thorn','spark']);
 assert.deepEqual(unlockedEnemies('auto',180),['thorn','spark','water']);
 assert.ok(undoSparkBundle(await readFile(new URL('game/assets/main-critter-v4.js',root),'utf8')).includes('createWaterCalfRenderer'));
 const w={sparkDead:[{sparkDeath:0},{sparkDeath:.70}]};tickSparkWorld(w,.10);assert.equal(w.sparkDead.length,1);assert.equal(w.sparkDead[0].sparkDeath,.10);
});

test('long-range skill charges in place for .60s then dashes at 8 units/s, without changing normal speed',()=>{
 assert.equal(SPARK_TRIGGER_RANGE,3);assert.equal(SPARK_DASH_SPEED,8);assert.equal(SPARK_DASH_START,.60);
 assert.ok(Math.abs(SPARK_IMPACT_TIME-.92)<1e-10);assert.equal(normalEnemies.spark.speed,1.42);
 const {world,e}=simulation(),target=[2.8,0,0];
 for(let i=0;i<12;i++){assert.equal(sparkMelee(world,e,.05,target,2.8,true,6),false);assert.equal(e.x,0);assert.equal(world.hp,100);}
 assert.equal(sparkPose(e).cell,8);
 sparkMelee(world,e,.025,target,2.8,true,6);assert.ok(Math.abs(e.x-.2)<1e-9);assert.equal(world.hp,100);
 for(let i=0;i<30;i++)sparkMelee(world,e,.025,target,2.8,true,6);
 assert.ok(Math.abs(e.x-2.2)<1e-8);assert.deepEqual(world.hits,[6]);
});
test('activation range and visibility/cooldown gates remain explicit',()=>{
 for(const distance of [1.23,2.8,3]){const {world,e}=simulation();sparkMelee(world,e,.01,[distance,0,0],distance,true,6);assert.equal(e.sparkAge,.01);}
 for(const [distance,visible,cooldown] of [[3.001,true,0],[2.8,false,0],[2.8,true,1]]){
  const {world,e}=simulation();e.attack=cooldown;assert.equal(sparkMelee(world,e,.01,[distance,0,0],distance,visible,6),true);assert.equal(e.sparkAge,undefined);assert.equal(e.x,0);assert.equal(world.hp,100);
 }
});
test('fast dash stays collision-stepped and stops before the target at near/far ranges in every direction',()=>{
 for(const range of [.60,1,2.8,3])for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.25])for(const dt of [.01,.05,.16,.3,1.4]){
  const {world,e}=simulation(),target=[Math.cos(angle)*range,0,Math.sin(angle)*range];
  const move=world.moveEnemy;world.moveEnemy=function(e,x,z){assert.ok(Math.hypot(x,z)<=.055+1e-9);move.call(this,e,x,z);};
  for(let t=0;t<1.45;t+=dt)sparkMelee(world,e,dt,target,range,true,6);
  assert.ok(Math.abs(Math.hypot(e.x,e.z)-(range-.6))<1e-8,JSON.stringify({range,angle,dt,x:e.x,z:e.z}));
  assert.deepEqual(world.hits,[6]);assert.equal(e.sparkAge,undefined);assert.equal(e.sparkDashRemaining,undefined);
 }
});
test('long wind-up remains interruptible and cannot retarget a sidestepping player',()=>{
 let {world,e}=simulation();sparkMelee(world,e,.4,[2.8,0,0],2.8,true,6);e.hit=.2;
 sparkMelee(world,e,.05,[2.8,0,0],2.8,true,6);assert.equal(e.sparkAge,undefined);assert.equal(e.sparkDashRemaining,undefined);assert.equal(e.x,0);assert.deepEqual(world.hits,[]);
 ({world,e}=simulation());sparkMelee(world,e,.4,[2.8,0,0],2.8,true,6);
 for(let i=0;i<20;i++)sparkMelee(world,e,.05,[2.8,0,2],Math.hypot(2.8,2),true,6);
 assert.equal(e.z,0);assert.ok(e.x>2);assert.deepEqual(world.hits,[]);
});
