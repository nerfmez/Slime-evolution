// Background asset loading (perf/lazy-assets.mjs): the round starts after the scene, slime and Moss Frog; later monsters,
// the boss models and the old fire textures arrive in the background. ?lazy=1 turns the real-player path on under automation.
import assert from 'node:assert/strict';
import {chromium, webkit} from 'playwright';
const base = new URL(process.env.SMOKE_URL || 'http://127.0.0.1:4173/'); base.searchParams.set('qa', '1'); base.searchParams.set('lazy', '1');
const engine = process.env.BROWSER || 'chromium';
const browser = await ({chromium, webkit}[engine]).launch({headless: true, ...(engine === 'chromium' ? {args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']} : {})});
try {
  const page = await browser.newPage({viewport: {width: 1280, height: 720}}), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let bytes = 0, deferredEarly = [];
  const deferred = /enemies\/boss|atlas\.webp|vfx\/(inferno|sunfall|meteor|cyclone|fireball)/;
  page.on('request', r => { if (deferred.test(r.url()) && !globalThis.__cardsSeen) deferredEarly.push(r.url()); });
  page.on('requestfinished', async r => { try { if (!globalThis.__cardsSeen) bytes += (await r.sizes()).responseBodySize; } catch {} });
  assert.ok((await page.goto(base.href, {waitUntil: 'load', timeout: 60000}))?.ok());
  await page.waitForFunction(() => globalThis.__slimeGameQA && document.querySelector('.skill-card'), null, {timeout: 120000});
  globalThis.__cardsSeen = true;
  // Only the scene (lossless WebP), the slime, the Moss Frog and the page itself load before play.
  assert.ok(bytes < 12e6, `start-up download ${(bytes / 1e6).toFixed(1)} MB`);
  assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').some(e => /assets\/[a-z-]+\.png$/.test(new URL(e.name).pathname) && /meadow|clearing|pond|tree-reference|grass-painted/.test(e.name))), false, 'scene textures come from assets/scene/*.webp');
  await page.locator('.skill-card').first().click();
  // The frame loop pauses while a group is built, then restores the scene's bound textures: a paused scene looks the same after.
  await page.evaluate(() => { __slimeGameQA.state.paused = true; });
  const shot = () => page.evaluate(() => { __slimeGameQA.draw(); const c = document.getElementById('world'), g = c.getContext('webgl2'); g.finish(); return c.toDataURL('image/png'); });
  const before = await shot();
  await page.waitForFunction(() => globalThis.__slimeAssetsReady, null, {timeout: 300000, polling: 500});
  const after = await shot();
  assert.equal(after, before, 'scene unchanged after the background groups were built');
  const ready = await page.evaluate(() => ({water: !!__slimeGameQA.waterRenderer, spark: !!__slimeGameQA.sparkRenderer, turtle: !!__slimeGameQA.turtleRenderer, panda: !!__slimeGameQA.pandaRenderer, boss: __slimeGameQA.modelAssets.length}));
  assert.deepEqual(ready, {water: true, spark: true, turtle: true, panda: true, boss: 5});
  // Every late creature and the boss draw once they arrive.
  await page.evaluate(() => { const q = __slimeGameQA, w = q.world, p = q.state.player; q.state.paused = false; w.enemies.length = 0; w.spawnClock = w.nextElite = 1e6;
    for (const t of ['spark', 'turtle', 'water']) w.spawn(p, t, false); w.spawn(p, 'thorn', true); w.spawn(p, 'panda', false); });
  await page.waitForTimeout(1500);
  const drawn = await page.evaluate(() => { __slimeGameQA.draw(); return __slimeGameQA.world.enemies.map(e => e.type + (e.elite ? '*' : '')); });
  assert.ok(drawn.length >= 5, JSON.stringify(drawn));
  assert.deepEqual(errors, []);
  console.log('LAZY ASSETS VERIFIED', engine, JSON.stringify({startupMB: +(bytes / 1e6).toFixed(1), deferredBeforeCards: deferredEarly.length, ready, drawn}));
} finally { await browser.close(); }
