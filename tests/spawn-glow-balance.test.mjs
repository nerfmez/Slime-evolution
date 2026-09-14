import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const release='published/2026-09-14';

test('normal run uses 100 monster cap and doubles spawn rate after one minute',()=>{
  const bundle=readFileSync(`${release}/assets/main-critter-v4.js`,'utf8');
  assert.ok(bundle.includes('update(e,t,n=100,r=null){'));
  assert.ok(bundle.includes('mobs:100,grass:1e4'));
  assert.ok(bundle.includes('this.spawnClock=Math.max(.55,2.5-this.time*.005)*(this.time>=60?.5:1)'));
  assert.ok(bundle.includes('B(`mobs`).value=`100`,B(`camera`)'));
  const html=readFileSync(`${release}/index.html`,'utf8');
  assert.ok(html.includes('<option value="100" selected>100 ตัว</option>'));
  assert.ok(!html.includes('<option value="40" selected>40 ตัว</option>'));
});

test('item glow is runtime-only, strong, and fades before sprite-quad edges',()=>{
  const renderer=readFileSync(`${release}/assets/critters-v4/renderer.js`,'utf8');
  assert.ok(renderer.includes('vec2 d1=texel*4.0,d2=texel*7.0;'));
  assert.ok(renderer.includes('float edgeFade=1.-smoothstep(.80,1.0,edge);'));
  assert.ok(renderer.includes('halo=clamp((rim*1.05+radial*(1.-tex.a)*.38)*pulse*edgeFade,0.,.92);'));
  assert.ok(renderer.includes('special>.5'));
});
