import test from 'node:test';import assert from 'node:assert/strict';
import {DEFAULTS,COLORS,normalizePreset,domeState} from '../vfx/inferno-settings.js';
import {SkillLab} from '../skill-lab.js';
test('dome reaches full size before breakup; smoke spreads out before rising',()=>{
 const s=normalizePreset({...DEFAULTS,...COLORS});assert.equal(domeState(0,s).expansion,0);assert.equal(domeState(s.pop,s).expansion,1);assert.equal(domeState(s.pop+s.hold-.01,s).open,0);
 const early=domeState(s.smokeDelay+.12,s),later=domeState(s.smokeDelay+.4,s);assert.ok(later.reach>early.reach);assert.equal(early.lift,0);assert.ok(later.reach-.68>later.lift*3);assert.equal(domeState(s.duration,s).smokeFade,0);
});
test('presets round-trip, clamp dangerous values and reject invalid input',()=>{
 const raw={...DEFAULTS,...COLORS,width:1.3,massDelay2:.2,core:'#ffeebb'};assert.deepEqual(normalizePreset(JSON.parse(JSON.stringify(raw))),raw);assert.equal(normalizePreset({width:100}).width,1.7);assert.throws(()=>normalizePreset({height:NaN}));assert.throws(()=>normalizePreset({core:'red'}));
});
test('scrubbing is deterministic in both directions and has no combat side effects',()=>{
 const lab=new SkillLab();lab.previewMode=true;lab.seek(.7);const first=JSON.stringify(lab.combat.fx);lab.seek(1.4);lab.seek(.7);assert.equal(JSON.stringify(lab.combat.fx),first);lab.seek(.2);assert.equal(lab.combat.fx.length,0);assert.equal(lab.combat.projectiles.length,1);assert.equal(lab.damage,0);lab.seek(4);assert.equal(lab.combat.fx.length,0);
});
