import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {SCENE_WEBP, LAZY_ASSETS_VERSION} from '../perf/lazy-assets.mjs';
import {treeHash} from '../scripts/canon.mjs';
const read = p => readFile(new URL('../' + p, import.meta.url));

test('lazy asset loading patch and scene WebP files match the reviewed lock', async () => {
  const c = JSON.parse(await read('CANON.json'));
  assert.equal(createHash('sha256').update(await read('perf/lazy-assets.mjs')).digest('hex'), c.lazyAssets.moduleSHA256);
  assert.equal(await treeHash(new URL('../perf/scene', import.meta.url).pathname), c.lazyAssets.sceneTree);
  assert.equal(LAZY_ASSETS_VERSION, 'lazy-assets-v1');
});

test('every scene texture ships as a smaller WebP next to its untouched PNG', async () => {
  for (const f of SCENE_WEBP) {
    const png = (await stat(new URL(`../game/assets/${f}.png`, import.meta.url))).size, webp = (await stat(new URL(`../perf/scene/${f}.webp`, import.meta.url))).size;
    assert.ok(webp < png * .8, `${f}: ${webp} vs ${png}`);
  }
});
