import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, webkit} from 'playwright';
const engine = process.env.BROWSER || 'chromium', folder = 'test-results/painted-vfx-' + engine;
await mkdir(folder, {recursive: true});
const base = new URL(process.env.SMOKE_URL || 'http://127.0.0.1:4173/'); base.searchParams.set('qa', '1');
const browser = await ({chromium, webkit}[engine]).launch({headless: true, ...(engine === 'chromium' ? {args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']} : {})});
// [preset, moment (s), painted tag that must be on screen]
const cases = [['water', .06, 'water:bolt'], ['water-power', .1, 'water:beam'], ['water-burst', .3, 'water:jet'], ['water-flow', .3, 'water:wave'],
  ['tide', .2, 'tide:ring'], ['tide-impact', .4, 'tide:dome'], ['tide-radius', .4, 'tide:vacuum'], ['tide-echo', .4, 'tide:resonance'],
  ['toxin', .25, 'toxin:lob'], ['toxin-venom', .8, 'toxin:infection'], ['toxin-contagion', .6, 'toxin:bloom'], ['toxin-corrosion', .8, 'toxin:miasma'],
  ['frost', .08, 'frost:crystal'], ['frost-drill', .3, 'frost:borer'], ['frost-freeze', .3, 'frost:cone'], ['frost-shatter', .14, 'frost:chainburst'],
  ['orbit', .5, 'orbit:orb'], ['orbit-power', .5, 'orbit:orb'], ['orbit-multi', .75, 'orbit:orb'], ['orbit-pulse', .7, 'orbit:arc'],
  ['chain', .06, 'chain:arc'], ['chain-overcharge', .06, 'chain:strike'], ['chain-relay', .35, 'chain:network'], ['chain-static', .35, 'chain:tesla'],
  ['inferno', .1, 'fire:fireball'], ['blast', .4, 'fire:blast'], ['scatter', .35, 'fire:ember'], ['burn', .6, 'fire:patch'],
  ['sun', .25, 'fire:sunfall'], ['meteor', .5, 'fire:meteor'], ['cyclone', .8, 'fire:cyclone']];
try {
  const page = await browser.newPage({viewport: {width: 800, height: 600}, deviceScaleFactor: 1}), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(() => { const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = f => raf(t => { if (!window.__vfxFreezeRAF) f(t); }); });
  assert.ok((await page.goto(base.href, {waitUntil: 'load', timeout: 60000}))?.ok());
  await page.waitForFunction(() => globalThis.__slimeGameQA?.skillLab && globalThis.__slimePaintedVfx && document.querySelector('.skill-card'), null, {timeout: 90000});
  // The new look is the default; the Settings > Test switch brings the old effects back and is saved on the device.
  const ui = await page.evaluate(() => { const box = document.getElementById('vfx-style-on'), before = globalThis.__slimeVfxStyle.on; box.checked = false; box.dispatchEvent(new Event('change')); const off = globalThis.__slimeVfxStyle.on, saved = localStorage.getItem('slime.vfxStyle.v2'); box.checked = true; box.dispatchEvent(new Event('change')); return {before, off, saved, after: globalThis.__slimeVfxStyle.on}; });
  assert.deepEqual(ui, {before: true, off: false, saved: '{"on":false}', after: true});
  await page.evaluate(() => { document.querySelector('.skill-card').click(); globalThis.__vfxFreezeRAF = true; document.getElementById('skill-test').click(); });
  const coverage = {};
  for (const [id, t, tag] of cases) {
    const r = await page.evaluate(({id, t}) => {
      const q = globalThis.__slimeGameQA, lab = q.skillLab.lab, vfx = globalThis.__slimePaintedVfx; globalThis.__slimeVfxStyle.on = true;
      lab.select(id); lab.paused = true; lab.repeat = false; lab.showTargets = true; q.state.time = 0;
      while (lab.elapsed + 1e-8 < t) { lab.tick(Math.min(1 / 60, t - lab.elapsed)); vfx.plan(q.combat, q.world, lab.elapsed, () => true); }
      q.state.time = lab.elapsed; q.draw();
      const canvas = document.getElementById('world'), gl = canvas.getContext('webgl2'); gl.finish();
      const read = () => { const c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height; const ctx = c.getContext('2d'); ctx.drawImage(canvas, 0, 0); return ctx.getImageData(0, 0, c.width, c.height).data; };
      const d = vfx.diagnostics, pixels = read(), image = canvas.toDataURL('image/png').split(',')[1], draw = vfx.draw; let count = 0;
      try { vfx.draw = () => ({calls: 0, triangles: 0}); q.draw(); const bg = read(); for (let i = 0; i < pixels.length; i += 4) if (Math.abs(pixels[i] - bg[i]) + Math.abs(pixels[i + 1] - bg[i + 1]) + Math.abs(pixels[i + 2] - bg[i + 2]) > 18) count++; } finally { vfx.draw = draw; }
      return {gl: gl.getError(), kinds: d.kinds, calls: d.calls, instances: d.instances, invalid: d.invalid, pixels: count, image, error: document.getElementById('error').hidden};
    }, {id, t});
    await writeFile(`${folder}/${id}-${Math.round(t * 100)}.png`, Buffer.from(r.image, 'base64'));
    assert.equal(r.gl, 0, id + ' WebGL'); assert.equal(r.error, true, id + ' error panel'); assert.equal(r.invalid, 0, id + ' invalid shapes');
    assert.equal(r.calls, 1, id + ' one instanced draw'); assert.ok(r.kinds[tag] > 0, id + ' paints ' + tag + ' ' + JSON.stringify(r.kinds));
    assert.ok(r.pixels > 150, id + ' visible painted pixels ' + r.pixels); coverage[id] = r.pixels;
  }
  // Old style: the Godot port and the painted fire images draw again, the painted renderer stays idle.
  const old = await page.evaluate(() => {
    const q = globalThis.__slimeGameQA, lab = q.skillLab.lab, vfx = globalThis.__slimePaintedVfx; let used = 0; const draw = vfx.draw; vfx.draw = (...a) => (used++, draw(...a));
    try { globalThis.__slimeVfxStyle.on = false; const out = {};
      for (const id of ['tide', 'blast']) { lab.select(id); lab.paused = true; lab.repeat = false; lab.showTargets = true; q.state.time = 0; while (lab.elapsed < .3) lab.tick(1 / 60); q.state.time = lab.elapsed; q.draw(); out[id] = Object.keys(globalThis.__slimeGodotVfx.diagnostics.kinds); }
      return {used, ...out};
    } finally { vfx.draw = draw; globalThis.__slimeVfxStyle.on = true; }
  });
  assert.equal(old.used, 0, 'painted renderer idle in the old style'); assert.ok(old.tide.includes('tide:ring'), 'Godot tide ring drawn in the old style');
  assert.deepEqual(errors, []);
  console.log('PAINTED VFX VERIFIED', engine, JSON.stringify(coverage));
} finally { await browser.close(); }
