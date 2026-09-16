import test from 'node:test';
import assert from 'node:assert/strict';
import {EnemyWorld,STAGE1_FAMILIES} from '../enemies.js';

function fresh(type,x=0,z=2){
 const world=new EnemyWorld();
 world.player=[0,0,0];
 world.hp=100;
 const enemy=world.makeEnemy(type,x,z);
 world.enemies=[enemy];
 return {world,enemy};
}

test('Stage 1 progression unlocks all five animal families',()=>{
 const world=new EnemyWorld();
 world.mode='auto';
 const expected=['thorn','moss','petal','crystal','panda'];
 for(const [time,count] of [[0,1],[60,2],[120,3],[180,4],[240,5]]){
  world.time=time;
  assert.deepEqual(world.unlocked(),expected.slice(0,count));
 }
 assert.deepEqual(STAGE1_FAMILIES,expected);
});

test('Moss Frog casts poison tongue and applies poison',()=>{
 const {world,enemy}=fresh('thorn');
 world.startSkill(enemy,'poison_tongue',0,0,world.player);
 world.executeSkill(enemy);
 assert.ok(world.poisonTime>0);
 assert.ok(world.effects.length>=1);
 assert.ok(world.hp<100);
});

test('Spark Hedgehog casts chain spark',()=>{
 const {world,enemy}=fresh('moss');
 world.startSkill(enemy,'chain_spark',0,0,world.player);
 world.executeSkill(enemy);
 assert.ok(world.effects.length>=1);
 assert.ok(world.hp<100);
});

test('Pond Turtle raises shell guard',()=>{
 const {world,enemy}=fresh('petal');
 world.startSkill(enemy,'shell_guard',0,enemy.radius*2.35,world.player);
 world.executeSkill(enemy);
 assert.ok(enemy.guardTime>=2);
 assert.ok(world.effects.some(effect=>effect.kind==='shell_guard'));
});

test('Water Calf fires a water projectile',()=>{
 const {world,enemy}=fresh('crystal');
 world.startSkill(enemy,'water_shot',0,0,world.player);
 world.executeSkill(enemy);
 assert.equal(world.bullets.length,1);
 assert.equal(world.bullets[0].kind,'water_shot');
 assert.ok(Math.hypot(world.bullets[0].vx,world.bullets[0].vz)>4);
});

test('Forest Panda starts a directional roll',()=>{
 const {world,enemy}=fresh('panda');
 world.startSkill(enemy,'panda_roll',0,0,world.player);
 world.executeSkill(enemy);
 assert.ok(enemy.skillDash>0);
 assert.equal(enemy.animState,'cast');
});

test('single Alpha test modes map to real animal families',()=>{
 const world=new EnemyWorld();
 for(const family of STAGE1_FAMILIES){
  world.mode=`elite-${family}`;
  assert.deepEqual(world.unlocked(),[family]);
 }
});
