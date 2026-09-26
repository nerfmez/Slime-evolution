import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {assemble} from '../pacing/assemble.mjs';
import {applySpeciesBundle,applySpeciesHtml} from '../species/assemble.mjs';
import {applyRestoredSkillVfx} from '../vfx/restore-godot-style.mjs';
import {applyOpeningRandom} from '../gameplay/opening-random.mjs';
import {applyDefaultAudioVolume} from '../audio/default-volume.mjs';
import {applyHudPolish,HUD_POLISH_VERSION} from '../ui/hud-polish.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');

async function pipeline(){
  const pacing=assemble(await read('game/assets/main-critter-v4.js'),await read('game/index.html'));
  const bundle=applyOpeningRandom(applyRestoredSkillVfx(applySpeciesBundle(pacing.bundle)));
  const audio=applyDefaultAudioVolume(bundle,applySpeciesHtml(pacing.html));
  return {before:audio,after:applyHudPolish(audio.bundle,audio.html)};
}

test('HUD polish is presentation-only and applies to the exact assembled runtime',async()=>{
  const {before,after}=await pipeline();
  execFileSync(process.execPath,['--check','--input-type=module'],{input:after.bundle});
  // Elite tags: English roster names, damaged-only HP, overlap stacking and player fade.
  for(const marker of ['label=`★ `+pt(e).name','hurt=d<.999','placed.find(','proj(W.player[0],.45,W.player[2])'])assert.ok(after.bundle.includes(marker),marker);
  assert.ok(!after.bundle.includes('r.strokeText(pt(e).name'),'old outlined English tag removed');
  assert.ok(after.bundle.includes('n?.miniBoss?`BAMBOO PANDA · MINI-BOSS`:`ANCIENT BLOOM COLOSSUS`'),'boss banners keep their English names');
  assert.ok(after.bundle.includes('W.moving&&B(`hint`)?.classList.add(`hint-done`)'));
  assert.ok(after.bundle.includes('i.classList.add(`empty`),i.title=`ช่องสกิลว่าง`'));
  assert.match(after.html,/<title>Slime Evolution<\/title>/);
  assert.ok(after.html.includes('<small>ทุ่งหญ้า</small><strong>Slime Evolution</strong>'));
  assert.equal(after.html.split('<style id="hud-polish">').length-1,1);
  // Start menu: one overlay, one script, skipped only for automation without ?menu=1.
  assert.equal(after.html.split('id="start-menu"').length-1,1);
  for(const marker of ['<h1 id="start-title">Slime <span>Evolution</span></h1>','id="start-play"','id="start-howto"','id="start-settings"','navigator.webdriver&&!new URLSearchParams(location.search).has("menu")'])assert.ok(after.html.includes(marker),marker);
  // Combat/stat data untouched: only the listed UI segments differ.
  for(const keep of ['xp:28,scale:1.6','{thorn:1,spark:2,turtle:3,water:4,panda:8}','name:`Ancient Bloom Colossus`'])assert.ok(after.bundle.includes(keep),keep);
  assert.equal(after.bundle.length-before.bundle.length>0,true);
  // Round clock and stage line (v2): #status keeps its full text, the clock shows the time.
  for(const marker of ['id="clock"','id="stage-line"'])assert.ok(after.html.includes(marker),marker);
  assert.ok(after.bundle.includes('B(`clock`).firstChild.textContent=t'));
  assert.equal(HUD_POLISH_VERSION,'hud-polish-v2');
});

test('HUD polish module matches the reviewed lock',async()=>{
  const c=JSON.parse(await read('CANON.json'));
  assert.equal(createHash('sha256').update(await readFile(new URL('../ui/hud-polish.mjs',import.meta.url))).digest('hex'),c.hudPolish.moduleSHA256);
});

test('each HUD edit requires exactly one baseline match',()=>{
  assert.throws(()=>applyHudPolish('nothing here','<html></html>'),/expected exactly one baseline/);
});
