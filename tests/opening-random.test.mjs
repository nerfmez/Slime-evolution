import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assemble} from '../pacing/assemble.mjs';
import {applySpeciesBundle} from '../species/assemble.mjs';
import {applyRestoredSkillVfx} from '../vfx/restore-godot-style.mjs';
import {applyOpeningRandom,OPENING_RANDOM_VERSION} from '../gameplay/opening-random.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('opening cards use independent browser entropy while combat RNG stays deterministic',async()=>{
  const source=await read('game/assets/main-critter-v4.js'),html=await read('game/index.html');
  const base=applyRestoredSkillVfx(applySpeciesBundle(assemble(source,html).bundle));
  const result=applyOpeningRandom(base);
  const start=result.indexOf('openingRandom(){'),end=result.indexOf('skill(e){',start),block=result.slice(start,end);
  assert.ok(start>=0&&end>start);
  assert.match(block,/globalThis\.crypto\?\.getRandomValues/);
  assert.match(block,/Math\.random\(\)/);
  assert.match(block,/this\.openingRandom\(\)/);
  assert.ok(!block.includes('this.random()'));
  assert.equal((base.match(/this\.random\(\)/g)||[]).length-(result.match(/this\.random\(\)/g)||[]).length,2);
  assert.match(result,/this\.seed=7421/,'combat/drop PRNG seed must remain unchanged');
  assert.equal(OPENING_RANDOM_VERSION,'opening-crypto-v1');
});
