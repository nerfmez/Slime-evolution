import test from 'node:test';
import assert from 'node:assert/strict';
import {atlasState,smokePlayback} from '../vfx/inferno-atlas.js';
import {normalizePreset,effectDuration} from '../vfx/inferno-settings.js';
test('smoke delay and lifetime work independently without changing the fire timeline',()=>{
 const a=normalizePreset({smokeDelay:.32,smokeDuration:.8}),b=normalizePreset({...a,smokeDelay:1.1,smokeDuration:1.5});
 for(let t=0;t<3;t+=.02)assert.deepEqual(atlasState(t,a),atlasState(t,b));
 assert.equal(smokePlayback(.31,a),null);assert.equal(smokePlayback(.32,a).opacity,0);
 assert.ok(smokePlayback(.5,a).opacity>0);assert.equal(smokePlayback(1.13,a),null);
 assert.equal(smokePlayback(1,b),null);assert.ok(smokePlayback(2,b));
 assert.equal(effectDuration(b),2.6);assert.equal(b.duration,a.duration);
 assert.equal(normalizePreset({duration:1.6}).smokeDuration,.8);
});
