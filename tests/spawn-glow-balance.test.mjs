import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const release='published/2026-09-14';

test('normal run uses 100 monster cap and doubles spawn rate every 30 seconds',()=>{
  const bundle=readFileSync(`${release}/assets/main-critter-v4.js`,'utf8');
  assert.ok(bundle.includes('update(e,t,n=100,r=null){'));
  assert.ok(bundle.includes('mobs:100,grass:1e4'));
  assert.ok(bundle.includes('Math.max(.55,2.5-this.time*.005)/Math.pow(2,Math.floor(this.time/30))'));
  assert.ok(bundle.includes('for(;this.spawnClock<=0&&this.enemies.length<n;)'));
  assert.ok(bundle.includes('B(`mobs`).value=`100`,B(`camera`)'));
  const html=readFileSync(`${release}/index.html`,'utf8');
  assert.ok(html.includes('<option value="100" selected>100 ตัว</option>'));
  assert.ok(!html.includes('<option value="40" selected>40 ตัว</option>'));
});

test('item glow is runtime-only, translucent, and pulses slowly',()=>{
  const renderer=readFileSync(`${release}/assets/critters-v4/renderer.js`,'utf8');
  assert.ok(renderer.includes('float pulse=.62+.20*(.5+.5*sin(clock*.95+special*.8));'));
  assert.ok(renderer.includes('halo=clamp((rim*.42+radial*(1.-tex.a)*.08)*pulse*edgeFade,0.,.30);'));
  assert.ok(renderer.includes('float haloAlpha=halo*(1.-tex.a);'));
  assert.ok(renderer.includes('float edgeFade=1.-smoothstep(.78,1.0,edge);'));
  assert.ok(renderer.includes('special>.5'));
});
