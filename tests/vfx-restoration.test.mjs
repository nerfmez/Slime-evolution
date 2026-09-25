import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assemble} from '../pacing/assemble.mjs';
import {applySpeciesBundle} from '../species/assemble.mjs';
import {applyRestoredSkillVfx,VFX_RESTORE_VERSION} from '../vfx/restore-godot-style.mjs';

test('Godot-style VFX restoration is visual-only and preserves Chain Spark', async()=>{
  const [bundle,html]=await Promise.all([
    readFile(new URL('../game/assets/main-critter-v4.js',import.meta.url),'utf8'),
    readFile(new URL('../game/index.html',import.meta.url),'utf8')
  ]);
  const paced=assemble(bundle,html).bundle;
  const species=applySpeciesBundle(paced);
  const restored=applyRestoredSkillVfx(species);

  assert.ok(restored.includes('/* GODOT_STYLE_VFX_RESTORED */'));
  assert.equal(restored.split('chain:[.62,.83,1]').length-1,1,'Chain palette must stay unchanged');
  assert.ok(restored.includes('t.family===`chain`'),'Chain arc mode must remain');
  assert.ok(restored.includes('if(t.family!==`chain`)d('),'extra arc stroke must explicitly exclude Chain');
  assert.ok(restored.includes('t.family===`tide`'),'Tide layers missing');
  assert.ok(restored.includes('t.family===`water`'),'Water layers missing');
  assert.ok(restored.includes('GODOT_STYLE_VFX_RESTORED'));

  let first=-1,last=-1;
  const limit=Math.max(species.length,restored.length);
  for(let i=0;i<limit;i++)if(species[i]!==restored[i]){first=i;break}
  for(let i=0;i<limit;i++)if(species[species.length-1-i]!==restored[restored.length-1-i]){last=Math.max(species.length,restored.length)-1-i;break}
  const rendererStart=species.indexOf('un={water:');
  const rendererEnd=species.indexOf('return new Float32Array(i)}',rendererStart);
  assert.ok(first>=rendererStart,'patch changed code before the elemental renderer');
  assert.ok(rendererEnd>rendererStart,'element renderer end marker missing');

  // Combat/cast logic and the dedicated fire renderer live before this point.
  assert.equal(
    restored.slice(0,rendererStart),
    species.slice(0,rendererStart),
    'VFX restoration must not alter combat, skill balance, dedicated fire VFX, or Chain cast logic'
  );

  assert.equal(typeof VFX_RESTORE_VERSION,'string');
});
