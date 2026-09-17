import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {sparkPose,sparkFacing,sparkAttackFrame,sparkMelee,sparkImpactPoint,tickSparkWorld,SPARK_ATTACK_LENGTH,SPARK_DEATH_LIFE} from '../game/assets/spark-hedgehog.js';
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
 assert.deepEqual([0,.15,.26,.40,.50,.61].map(t=>sparkPose({sparkAge:t,walkBlend:1}).cell),[6,7,8,9,10,11]);
 assert.equal(sparkPose({}).name,'idle');assert.equal(sparkPose({sparkAge:.3,hit:.1}).cell,12);
 assert.equal(sparkPose({sparkDeath:0,hit:.1,sparkAge:.3}).cell,13);assert.equal(sparkPose({sparkDeath:SPARK_DEATH_LIFE}).alpha,0);
 assert.equal(sparkAttackFrame(.39),3);assert.equal(sparkAttackFrame(.76),5);
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
 for(let i=0;i<80;i++){
  const age=i*.01;sparkMelee(world,e,.01,[1,0,0],1,true,6);seen.push(sparkPose(e).cell);
  if(age<.37)assert.equal(world.hp,100);
  if(age<.24)assert.equal(e.x,0);
  if(i>=76)break;
 }
 assert.equal(world.hp,94);assert.deepEqual(world.hits,[6]);assert.equal(e.sparkAge,undefined);
 assert.ok(Math.abs(e.x-.56)<1e-8);assert.ok(e.walkPhase>0);assert.ok([6,7,8,9,10,11].every(i=>seen.includes(i)));
 assert.ok(SPARK_ATTACK_LENGTH>.7&&SPARK_ATTACK_LENGTH<.8);
});
test('hit interrupts charge, obstacles stop dash, moving target can dodge, no damage through walls',()=>{
 let {world,e}=simulation();sparkMelee(world,e,.10,[1,0,0],1,true,6);e.hit=.12;
 sparkMelee(world,e,.1,[1,0,0],1,true,6);assert.equal(e.sparkAge,undefined);assert.equal(world.hp,100);assert.equal(sparkPose(e).name,'hurt');
 ({world,e}=simulation());world.moveEnemy=()=>{};
 for(let i=0;i<16;i++)sparkMelee(world,e,.05,[1.2,0,0],1.2,true,6);
 assert.equal(e.x,0);assert.equal(world.hp,100);
 ({world,e}=simulation());sparkMelee(world,e,.1,[1,0,0],1,true,6);
 for(let i=0;i<16;i++)sparkMelee(world,e,.05,[1,0,3],3,true,6);
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
