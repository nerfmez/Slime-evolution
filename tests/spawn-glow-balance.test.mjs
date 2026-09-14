import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const release='published/2026-09-14';

test('normal run uses 100 monster cap and doubles spawn rate every full minute',()=>{
  const bundle=readFileSync(`${release}/assets/main-critter-v4.js`,'utf8');
  assert.ok(bundle.includes('update(e,t,n=100,r=null){'));
  assert.ok(bundle.includes('mobs:100,grass:1e4'));
  assert.ok(bundle.includes('Math.max(.55,2.5-this.time*.005)/Math.pow(2,Math.floor(this.time/60))'));
  assert.ok(bundle.includes('for(;this.spawnClock<=0&&this.enemies.length<n;)'));
  assert.ok(bundle.includes('B(`mobs`).value=`100`,B(`camera`)'));
  const html=readFileSync(`${release}/index.html`,'utf8');
  assert.ok(html.includes('<option value="100" selected>100 ตัว</option>'));
  assert.ok(!html.includes('<option value="40" selected>40 ตัว</option>'));
});

test('item glow is a filled circular aura larger than the animal with repeating outward expansion',()=>{
  const renderer=readFileSync(`${release}/assets/critters-v4/renderer.js`,'utf8');
  assert.ok(renderer.includes('const float spriteScale=.54;'));
  assert.ok(renderer.includes('const auraScale=kind?1.85:1;'));
  assert.ok(renderer.includes('float base=1.-smoothstep(.18,.76,d);'));
  assert.ok(renderer.includes('float phase=fract(clock*.24+special*.13);'));
  assert.ok(renderer.includes('float radius=mix(.52,.96,phase);'));
  assert.ok(renderer.includes('float filled=1.-smoothstep(radius*.52,radius,d);'));
  assert.ok(renderer.includes('float pulseAura=filled*(.25*pulseFade);'));
  assert.ok(renderer.includes('special>.5'));
  assert.ok(!renderer.includes('float ring='));
});
