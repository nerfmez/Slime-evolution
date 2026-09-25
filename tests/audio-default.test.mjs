import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyDefaultAudioVolume,AUDIO_DEFAULT_VERSION} from '../audio/default-volume.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('new players start at 50 percent while saved audio preferences remain authoritative',async()=>{
  const bundle=await read('game/assets/main-critter-v4.js'),html=await read('game/index.html');
  const out=applyDefaultAudioVolume(bundle,html);
  assert.match(out.bundle,/r=\{enabled:!0,volume:\.5\};try\{let e=JSON\.parse\(localStorage\.getItem\(`slime\.audio\.v1`\)\)/);
  assert.match(out.bundle,/Number\.isFinite\(e\?\.volume\)&&\(r\.volume=Math\.max\(0,Math\.min\(1,e\.volume\)\)\)/,'saved volume must still override the default');
  assert.match(out.html,/>50%<\/output><\/label><input id="audio-volume"[^>]+value="50"/);
  assert.ok(!out.html.includes('id="audio-level" for="audio-volume">35%'));
  assert.equal(AUDIO_DEFAULT_VERSION,'audio-default-50-v1');
});
