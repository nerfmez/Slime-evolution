import test from 'node:test';
import assert from 'node:assert/strict';
import {EnemyWorld,ENEMY_TYPES,STAGE1_FAMILIES} from '../enemies.js';
import {FireCombat} from '../fire-combat.js';

const player=[0,0,0];
function world(){const w=new EnemyWorld();w.initial=false;w.rebuild(player);return w;}

test('Stage 1 ports four named Alpha elites with larger combat stats',()=>{
 const w=world();
 for(const type of STAGE1_FAMILIES){
  const base=w.stats(type),elite=w.stats(type,true);
  assert.match(elite.name,/Alpha$/);assert(elite.hp>base.hp*2.8);assert(elite.radius>base.radius);assert(elite.scale>1);assert.equal(elite.damage,base.damage+6);
 }
 assert.equal(w.stats('thorn',true).radius,.58);
 assert.equal(Math.round(w.stats('petal',true).hp),40);
});

test('Alpha families cannot roll before their normal family has appeared',()=>{
 const w=world();w.spawnCounts={thorn:2,moss:0,petal:0,crystal:0};
 assert.deepEqual(w.unlockedEliteFamilies(),['thorn']);
 w.spawnCounts.moss=1;w.spawnCounts.petal=1;
 assert.deepEqual(w.unlockedEliteFamilies(),['thorn','moss','petal']);
});

test('Petal Alpha enters five-second wing dive and takes +50% damage while flying',()=>{
 const w=world(),e=w.makeEnemy('petal',4,0,{elite:true});w.enemies=[e];e.skillCooldown=0;
 w.update(.05,player,40);assert.equal(e.skillKind,'petal_swoop');assert(e.skillWindup>0);
 for(let i=0;i<11;i++)w.update(.05,player,40);
 assert.equal(e.flying,true);assert(e.skillDash>4);assert(e.grassRadius>e.radius);
 const c=new FireCombat(),before=e.hp;c.hit(e,10,0,0);assert.equal(before-e.hp,15);
});

test('Ancient Bloom Colossus replaces normal spawning at five minutes and keeps source balance metadata',()=>{
 const w=new EnemyWorld();w.reset('auto',299.97);w.initial=false;w.rebuild(player);
 w.spawn=(p,type,opts)=>{const e=w.makeEnemy(type,7,0,opts);w.enemies.push(e);return e;};
 w.update(.05,player,40);
 const boss=w.enemies.find(e=>e.isBoss);assert(boss);assert.equal(boss.name,'Ancient Bloom Colossus');assert.equal(ENEMY_TYPES.boss.sourceHp,12000);assert.equal(boss.maxHp,1200);assert.equal(w.bossSpawned,true);
});

test('boss cycles close-range attacks, uses long-range Vine Lunge, armor and reroll reward',()=>{
 const w=world(),boss=w.makeEnemy('boss',5,0,{boss:true});w.enemies=[boss];boss.skillCooldown=0;
 w.update(.05,player,40);assert.equal(boss.skillKind,'root_slam');assert.equal(boss.skillLabel,'ROOT SLAM');
 const far=world(),vine=far.makeEnemy('boss',8,0,{boss:true});far.enemies=[vine];vine.skillCooldown=0;far.update(.05,player,40);assert.equal(vine.skillKind,'vine_lunge');
 const c=new FireCombat();c.cards=[];c.opening=false;const hp=vine.hp;c.hit(vine,100,0,0);assert.equal(hp-vine.hp,72);
 const elite=far.makeEnemy('thorn',2,0,{elite:true});far.defeated=[elite];const rerolls=c.rerolls;c.update(.05,far,player);assert.equal(c.rerolls,rerolls+1);assert.equal(c.souls[0].value,6);
});
