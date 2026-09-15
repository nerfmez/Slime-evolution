import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const bundlePath='published/2026-09-14/assets/main-critter-v4.js';
const atlasPath='published/2026-09-14/assets/enemies/frog-moveset.png';

test('authoritative release contains directional Moss Frog renderer, not old normal Thorn sprite request',()=>{
 const js=readFileSync(bundlePath,'utf8');
 assert.match(js,/name:`Moss Frog`/);
 assert.match(js,/frog-moveset\.png\?v=20260915-facing1/);
 assert.match(js,/globalThis\.__slimeFrogFrame=Fg/);
 assert.match(js,/globalThis\.__slimeFrogFacing=Fh/);
 assert.match(js,/uniform float flipX/);
 assert.match(js,/spriteOffsetX',c\.o\*l/);
 assert.match(js,/this\.frogDead/);
 assert.match(js,/frogAttack/);
 assert.doesNotMatch(js,/fetch\(`\.\/assets\/enemies\/thorn-sprite\.png`\)/);
});

test('approved frog atlas is materialized in the authoritative release',()=>{
 const data=readFileSync(atlasPath);
 assert.ok(statSync(atlasPath).size>10000);
 assert.deepEqual([...data.subarray(0,8)],[137,80,78,71,13,10,26,10]);
});

test('release UI names normal Thorn slot as Moss Frog while elite name is untouched',()=>{
 const html=readFileSync('published/2026-09-14/index.html','utf8');
 assert.match(html,/การแสดงผล Moss Frog/);
 assert.match(html,/<option value="thorn">Moss Frog<\/option>/);
 assert.match(html,/<option value="elite-thorn">Thorn Alpha<\/option>/);
});
