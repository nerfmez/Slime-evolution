import test from 'node:test';
import assert from 'node:assert/strict';
import {SkillLab,PRESETS} from '../skill-lab.js';
import {FireCombat} from '../fire-combat.js';

test('each test preset uses real combat and hurts targets without killing them',()=>{
 const lab=new SkillLab();for(const id of Object.keys(PRESETS)){
  lab.select(id);lab.repeat=false;for(let i=0;i<300;i++)lab.update(1/60);
  assert.ok(lab.damage>0,id);assert.equal(lab.combat.choosing,false);assert.equal(lab.world.enemies.length,4);assert.ok(lab.world.enemies.every(e=>e.hp===99999));
  assert.equal(lab.combat.projectiles.length+lab.combat.events.length+lab.combat.fx.length+lab.combat.cyclones.length,0,id);
 }
});
test('pause, single step, quarter speed and manual replay respect time',()=>{
 const lab=new SkillLab();lab.update(.04);const time=lab.elapsed;lab.paused=true;lab.update(.04);assert.equal(lab.elapsed,time);
 lab.step();assert.ok(Math.abs(lab.elapsed-time-1/60)<1e-9);assert.equal(lab.paused,true);
 lab.paused=false;lab.speed=.25;const before=lab.elapsed;lab.update(.04);assert.ok(Math.abs(lab.elapsed-before-.01)<1e-9);
 lab.restart();assert.equal(lab.elapsed,0);assert.equal(lab.damage,0);assert.equal(lab.combat.projectiles.length,1);
});
test('lab leaves a real run and its pending upgrade untouched; repeated casts stay bounded',()=>{
 const run=new FireCombat();run.choose('scatter',{hp:100});run.xp=6;run.checkLevel();const saved=JSON.stringify(run);
 const lab=new SkillLab();lab.select('meteor');for(let i=0;i<3600;i++)lab.update(1/60);
 assert.equal(JSON.stringify(run),saved);assert.ok(lab.combat.fx.length<=40);assert.ok(lab.combat.patches.length<30);assert.ok(lab.combat.events.length<=11);
 lab.setSouls(500);assert.equal(lab.combat.souls.length,500);lab.select('burn');assert.equal(lab.combat.souls.length,500);assert.equal(lab.combat.events.length,0);
});
