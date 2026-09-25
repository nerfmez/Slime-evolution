import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptNeurotoxinCast} from '../vfx/neurotoxin-cast-adapter.mjs';
const read=p=>readFileSync(new URL('../vfx/'+p,import.meta.url),'utf8');
const source=adaptNeurotoxinCast(read('godot-elemental-renderer.mjs'));
const {createGodotSkillVfxRenderer}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('Neurotoxin uses locked original cast origin and expires visually without changing poison data',()=>{
 const r=createGodotSkillVfxRenderer(null,JSON.parse(read('godot-shaders.json')));
 const t={family:'toxin',kind:'infection',x:3,z:0,age:.08,life:2.45,r:1,target:42},combat={abilities:[t],orbs:[]};
 const before=structuredClone(combat),cmd=r.plan(combat,{player:[0,0,0]},.08);
 assert.ok(cmd.length>0);assert.ok(Math.abs(cmd[0].model[12]-1.5)<1e-6);assert.deepEqual(combat,before);
 t.age=.10;const next=r.plan(combat,{player:[2,0,0]},.1);assert.ok(Math.abs(next[0].model[12]-1.875)<1e-6,'moving owner changed an existing cast');
 t.age=.4;assert.equal(r.plan(combat,{player:[2,0,0]},.4).length,0);assert.equal(t.life,2.45);assert.equal(t.target,42);
});
