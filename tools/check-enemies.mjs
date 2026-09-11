import assert from 'node:assert/strict';
import {EnemyWorld,ENEMY_TYPES,enemyCanStand} from '../enemies.js';
const world=new EnemyWorld();
for(const [time,count] of [[0,1],[59.9,1],[60,2],[120,3],[180,4]]){world.reset('auto',time);assert.equal(world.unlocked().length,count);}
world.reset('all');world.update(.016,[0,0,0],8);assert.equal(new Set(world.enemies.map(e=>e.type)).size,4);assert(world.enemies.every(e=>enemyCanStand(e.x,e.z)));assert(world.enemies.length<=8);
const time=world.time;world.update(0,[0,0,0],8);assert.equal(world.time,time);
function single(type,x,z){world.reset(type);world.initial=false;world.spawnClock=999;world.enemies=[{id:1,type,x,z,yaw:0,hp:ENEMY_TYPES[type].hp,anim:0,attack:0,windup:0,hit:0}];world.hp=9999;}
single('moss',1,-6);
for(let i=0;i<2200;i++){world.update(.05,[16,0,-6],1);const e=world.enemies[0];assert(enemyCanStand(e.x,e.z,ENEMY_TYPES.moss.radius),'Never enters pond, rocks or trunk');}
assert(Math.hypot(world.enemies[0].x-16,world.enemies[0].z+6)<1.1,'Routes around pond to player');
single('crystal',0,4);let shot=false;const hp=world.hp;
for(let i=0;i<70;i++){world.update(.05,[0,0,0],1);shot ||=world.bullets.length>0;}
assert(shot,'Crystal emits projectile');assert(world.hp<hp,'Projectile damages player');
single('thorn',0,.55);const before=world.hp;world.update(.05,[0,0,0],1);assert(world.hp<before,'Melee damage');const after=world.hp;for(let i=0;i<5;i++)world.update(.05,[0,0,0],1);assert.equal(world.hp,after,'Invulnerability prevents per-frame damage');
single('moss',0,1);for(let i=0;i<60;i++)world.update(.05,[0,0,0],1,{age:1,x:0,z:1});assert.equal(world.enemies.length,0);assert.equal(world.kills,1);
world.reset('auto',299.98);world.update(.05,[0,0,0],0);assert(world.finished);world.reset();assert.equal(world.hp,100);assert.equal(world.time,0);
console.log('PASS: unlock schedule, all-four preview, valid spawns, pause, pond routing, melee, ranged attack, invulnerability, storm kills, restart and 5-minute finish');
