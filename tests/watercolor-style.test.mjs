import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {adaptWatercolorStyle,applyWatercolorUi,WATERCOLOR_STYLE_VERSION} from '../vfx/watercolor-style.mjs';
import {assemble} from '../pacing/assemble.mjs';
import {applySpeciesBundle,applySpeciesHtml} from '../species/assemble.mjs';
import {applyRestoredSkillVfx} from '../vfx/restore-godot-style.mjs';
import {applyOpeningRandom} from '../gameplay/opening-random.mjs';
import {applyDefaultAudioVolume} from '../audio/default-volume.mjs';
import {applyHudPolish} from '../ui/hud-polish.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('every skill shader ends in the shared cel-watercolour style and fire uses the same renderer',async()=>{
  const module=adaptWatercolorStyle(await read('vfx/godot-elemental-renderer.mjs'));
  for(const marker of ['vec4 gdWatercolor(','gdColor=gdWatercolor(ALBEDO+EMISSION','fwidth(a)','fwidth(facing)','function wcBlast(','function wcFireball(','function wcPatch(','function wcBurning(','fire(combat,world,time,visible)'])assert.ok(module.includes(marker),marker);
  assert.ok(!module.includes('gdColor=vec4(gdToSRGB(ALBEDO+EMISSION),clamp(ALPHA,0.,1.))'),'no effect bypasses the style');
  assert.ok(!/vec3\(0\.?0*\)\s*\*\s*rim|outline/i.test(module.slice(module.indexOf('vec4 gdWatercolor('),module.indexOf('vec4 gdWatercolor(')+2000)),'no black outline pass');
  assert.throws(()=>adaptWatercolorStyle('nothing'),/expected exactly one baseline/);
  assert.equal(WATERCOLOR_STYLE_VERSION,'cel-watercolor-v1');
});

test('assembled runtime splits the legacy fire renderer and adds persistent style controls',async()=>{
  const pacing=assemble(await read('game/assets/main-critter-v4.js'),await read('game/index.html'));
  const bundle=applyOpeningRandom(applyRestoredSkillVfx(applySpeciesBundle(pacing.bundle)));
  const audio=applyDefaultAudioVolume(bundle,applySpeciesHtml(pacing.html));
  const hud=applyHudPolish(audio.bundle,audio.html);
  const out=applyWatercolorUi(hud.bundle,hud.html);
  execFileSync(process.execPath,['--check','--input-type=module'],{input:out.bundle});
  assert.ok(out.bundle.includes('fx:Y.fx.filter(e=>e.type!==`blast`)'),'old painted fire skips the parts the new fire draws');
  assert.ok(out.bundle.includes('gdColor=gdWatercolor('));
  for(const id of ['vfx-style-on','vfx-style-wash','vfx-style-bands','vfx-style-edge'])assert.ok(out.html.includes(`id="${id}"`),id);
  assert.ok(out.html.includes('slime.vfxStyle.v1'),'settings persist on the device');
  const c=JSON.parse(await read('CANON.json'));
  assert.equal(createHash('sha256').update(await readFile(new URL('../vfx/watercolor-style.mjs',import.meta.url))).digest('hex'),c.watercolorStyle.moduleSHA256);
});
