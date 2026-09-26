import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createPaintedSkillRenderer} from '../vfx/painted-renderer.mjs';
import {applyPaintedVfx, PAINTED_VFX_VERSION} from '../vfx/painted-style.mjs';
import {assemble} from '../pacing/assemble.mjs';
import {applySpeciesBundle, applySpeciesHtml} from '../species/assemble.mjs';
import {applyRestoredSkillVfx} from '../vfx/restore-godot-style.mjs';
import {applyOpeningRandom} from '../gameplay/opening-random.mjs';
import {applyDefaultAudioVolume} from '../audio/default-volume.mjs';
import {applyHudPolish} from '../ui/hud-polish.mjs';
const read = p => readFile(new URL('../' + p, import.meta.url), 'utf8');
// Game camera [0,12,15] looking at the origin.
const VP = (() => { const f = [0, 12, 15].map(v => v / Math.hypot(0, 12, 15)), r = [1, 0, 0], u = [0, f[2], -f[1]]; return [r[0], u[0], f[0], 0, r[1], u[1], f[1], 0, r[2], u[2], f[2], 0, 0, 0, 0, 1]; })();
const ability = (family, kind, extra = {}) => ({family, kind, x: 0, z: 0, age: .1, life: 1, delay: 0, hit: new Set(), ...extra});

test('every skill, evolution and fire effect is painted by the new renderer', () => {
  const vfx = createPaintedSkillRenderer(null), cases = [
    ['water:bolt', ability('water', 'bolt', {dx: 0, dz: -1, r: .14, life: 1.6})], ['water:beam', ability('water', 'beam', {dx: 0, dz: -1, r: .58, length: 12.2, life: .3})],
    ['water:jet', ability('water', 'jet', {dx: 1, dz: 0, r: .16, length: 8.4, life: .6})], ['water:wave', ability('water', 'wave', {dx: 0, dz: -1, r: 1.6, life: .8})],
    ['tide:ring', ability('tide', 'ring', {r: 2.2, life: .46})], ['tide:dome', ability('tide', 'dome', {r: 2.4, life: 1.1})],
    ['tide:vacuum', ability('tide', 'vacuum', {r: 2.9, life: 1})], ['tide:resonance', ability('tide', 'resonance', {r: 2.2, life: .78})],
    ['toxin:lob', ability('toxin', 'lob', {tx: 2, tz: -2, life: .5})], ['toxin:pool', ability('toxin', 'pool', {r: .8, life: 2.4})],
    ['toxin:infection', ability('toxin', 'infection', {r: .72, life: 2.45})], ['toxin:burst', ability('toxin', 'burst', {r: .9, life: .5})],
    ['toxin:bloom', ability('toxin', 'bloom', {r: 2.7, life: 2.55})], ['toxin:arc', ability('toxin', 'arc', {tx: 2, tz: 1, life: .3})],
    ['toxin:miasma', ability('toxin', 'miasma', {r: 1.45, life: 2.65})],
    ['frost:crystal', ability('frost', 'crystal', {dx: 0, dz: -1, r: .14, life: 1.3})], ['frost:borer', ability('frost', 'borer', {dx: 0, dz: -1, r: .6, life: 1.25})],
    ['frost:cone', ability('frost', 'cone', {dx: 0, dz: -1, length: 4.4, angle: .55, life: .9})], ['frost:chainburst', ability('frost', 'chainburst', {r: 1.2, life: .3, generation: 0})],
    ['frost:burst', ability('frost', 'burst', {r: 1.1, life: .4})],
    ['chain:arc', ability('chain', 'arc', {tx: 3, tz: -1, life: .22, r: .07})], ['chain:strike', ability('chain', 'strike', {life: .22, r: .3})],
    ['chain:network', ability('chain', 'network', {life: 1.3, r: 9.5})], ['chain:tesla', ability('chain', 'tesla', {r: 2.8, life: 1.75})],
    ['chain:ring', ability('chain', 'ring', {r: 1, life: .3})],
    ['orbit:arc', ability('orbit', 'arc', {tx: 1.5, tz: 0, age: 0, life: .017})], ['orbit:ring', ability('orbit', 'ring', {r: 2, life: .35})],
  ];
  for (const [tag, t] of cases) {
    const items = vfx.plan({abilities: [t]}, {}, 1, () => true, {vp: VP}), d = vfx.diagnostics;
    assert.equal(d.kinds[tag], 1, tag); assert.ok(items.length > 0, tag + ' draws shapes'); assert.equal(d.invalid, 0, tag);
    for (const it of items) assert.ok(it.v.length === 40 && it.v.every(Number.isFinite), tag + ' finite instance');
  }
  for (const evo of ['', 'power', 'multi', 'pulse']) {
    vfx.plan({orbs: [{x: 1, z: 0, r: evo === 'power' ? .62 : .17, angle: 0}], skills: {orbit: {evo}}}, {}, 1, () => true, {vp: VP});
    assert.equal(vfx.diagnostics.kinds['orbit:orb'], 1, 'orbit ' + evo);
  }
  const fire = {projectiles: [{x: 0, z: 0, y: .36, tx: 3, tz: 0, life: 1.5}, {x: 1, z: 0, vx: 5.8, vz: 0, life: .5, ember: true}],
    events: [{type: 'sun', x: 0, z: 0, age: .2, delay: .5, s: {radius: 1.4}}, {type: 'meteor', x: 2, z: 0, age: .3, delay: .55, flight: .55, s: {radius: .8}}],
    fx: [{type: 'blast', x: 0, z: 0, r: 1, age: .3}, {type: 'sun', x: 0, z: 0, r: 1.4, age: .4}, {type: 'meteor', x: 2, z: 0, r: .8, age: .3}],
    patches: [{x: 0, z: 0, r: .8, age: .5, life: 1}], cyclones: [{x: 0, z: 0, r: 1.2, life: 3, age: .5}]};
  vfx.plan(fire, {enemies: [{x: 1, z: 1, hp: 5, burnTime: 1, radius: .5}]}, 1, () => true, {vp: VP});
  for (const tag of ['fire:fireball', 'fire:ember', 'fire:sunfall', 'fire:meteor', 'fire:blast', 'fire:sunburst', 'fire:impact', 'fire:patch', 'fire:cyclone', 'fire:burning']) assert.ok(vfx.diagnostics.kinds[tag] > 0, tag);
  vfx.plan({}, {enemies: [{x: 0, z: 0, hp: 5, poisonTime: 1, chill: 1, radius: .5}]}, 1, () => true, {vp: VP});
  assert.ok(vfx.diagnostics.kinds['status:poison'] && vfx.diagnostics.kinds['status:frost'], 'status markers');
  vfx.plan(fire, {enemies: [{x: 1, z: 1, hp: 5, burnTime: 1, radius: .5}]}, 1, () => true, {vp: VP, hideEnemies: true});
  assert.equal(vfx.diagnostics.kinds['fire:burning'], undefined, 'hidden lab targets carry no flames');
});

test('fire takes a different form in every branch and never uses flame sticks (owner feedback)', () => {
  const vfx = createPaintedSkillRenderer(null), FLAME_STICKS = [2, 23], TWISTER = 27;
  const branches = {
    shot: {projectiles: [{x: 0, z: 0, y: .36, tx: 3, tz: 0, life: 1.5}]}, blast: {fx: [{type: 'blast', x: 0, z: 0, r: 1, age: .3}]},
    burn: {patches: [{x: 0, z: 0, r: .8, age: .5, life: 1}]}, scatter: {projectiles: [{x: 1, z: 0, vx: 5.8, vz: 0, life: .5, ember: true}]},
    sunfall: {events: [{type: 'sun', x: 0, z: 0, age: .2, delay: .5, s: {radius: 1.4}}]}, sunburst: {fx: [{type: 'sun', x: 0, z: 0, r: 1.4, age: .3}]},
    meteor: {events: [{type: 'meteor', x: 2, z: 0, age: .3, delay: .55, flight: .55, s: {radius: .8}}]}, impact: {fx: [{type: 'meteor', x: 2, z: 0, r: .8, age: .1}]},
    cyclone: {cyclones: [{x: 0, z: 0, r: 1.2, life: 3, age: .5}]},
  };
  const signature = {};
  for (const [name, st] of Object.entries(branches)) {
    const items = vfx.plan(st, {}, 1, () => true, {vp: VP}), shapes = [...new Set(items.map(it => it.v[3]))].sort((a, b) => a - b);
    assert.ok(items.length > 0, name + ' draws');
    for (const s of FLAME_STICKS) assert.ok(!shapes.includes(s), name + ' has no flame sticks');
    for (const it of items.filter(it => it.v[3] === TWISTER)) assert.ok(it.v[11] <= .4 && it.v[31] >= .5, 'cyclone heat column stays soft and see-through');
    signature[name] = shapes.join(',');
  }
  for (const a of ['shot', 'blast', 'burn', 'scatter', 'sunburst', 'meteor', 'cyclone']) for (const b of ['shot', 'blast', 'burn', 'scatter', 'sunburst', 'meteor', 'cyclone'])
    if (a < b) assert.notEqual(signature[a], signature[b], a + ' and ' + b + ' must look different');
  vfx.plan({}, {enemies: [{x: 1, z: 1, hp: 5, burnTime: 1, radius: .5}]}, 1, () => true, {vp: VP});
  assert.ok(vfx.diagnostics.kinds['fire:burning'] > 0);
});

test('tails flow along the real path: an orbiting core leaves a curved ribbon, never a stiff shape (owner feedback)', () => {
  const vfx = createPaintedSkillRenderer(null), orb = {x: 2, z: 0, r: .17, angle: 0}, combat = {orbs: [orb], skills: {orbit: {evo: ''}}};
  let items = [];
  for (let f = 0; f <= 30; f++) { const a = f * .12; orb.x = Math.cos(a) * 2; orb.z = Math.sin(a) * 2; orb.angle = a; items = vfx.plan(combat, {}, f / 60, () => true, {vp: VP}); }
  const segs = items.filter(it => it.v[3] === 32 && it.v[35] === 1);
  assert.ok(segs.length >= 6, 'trail has many flowing segments ' + segs.length);
  const dirs = segs.map(it => Math.atan2(it.v[6] - it.v[2], it.v[4] - it.v[0]));
  assert.ok(Math.max(...dirs) - Math.min(...dirs) > .3, 'trail bends with the orbit');
  assert.ok(!items.some(it => it.v[3] === 0 && it.v[15] > 0), 'cores carry no painted face');
});

test('effects keep the gameplay sizes (rings, cones, lines and waves match their hit areas)', () => {
  const vfx = createPaintedSkillRenderer(null);
  const ground = items => items.filter(it => it.g === 0);
  // Tide Ring: the outer ripple sits on the damage radius once fully open.
  let items = ground(vfx.plan({abilities: [ability('tide', 'ring', {r: 2, age: .3, life: .46})]}, {}, 1, () => true, {vp: VP}));
  const ring = items.find(it => it.v[3] === 1), radius = Math.hypot(ring.v[4], ring.v[6]) * ring.v[12];
  assert.ok(Math.abs(radius - 2 * .93) < .05, 'tide ring radius ' + radius);
  // Whiteout Breath: the painted cone reaches the full length with the gameplay half-angle.
  items = ground(vfx.plan({abilities: [ability('frost', 'cone', {dx: 0, dz: -1, length: 4.4, angle: .55, age: .5, life: .9})]}, {}, 1, () => true, {vp: VP}));
  const fan = items.find(it => it.v[3] === 12), len = Math.hypot(fan.v[4], fan.v[6]) * 2;
  assert.ok(Math.abs(len - 4.4) < .01 && Math.abs(fan.v[12] - .55) < 1e-6, 'cone ' + len);
  // Aqua Railgun: the stream runs the whole line once extended.
  items = vfx.plan({abilities: [ability('water', 'beam', {dx: 1, dz: 0, r: .6, length: 12, age: .15, life: .3})]}, {}, 1, () => true, {vp: VP});
  const reach = Math.max(...items.filter(it => it.v[3] === 30 && it.v[35] === 1 && it.v[38] > 5).flatMap(it => [it.v[0], it.v[4], it.v[8], it.v[32]]));
  assert.ok(Math.abs(reach - 12) < .01, 'railgun reach ' + reach);
  // Tidal Surge: the rushing water spans the full gameplay width.
  items = vfx.plan({abilities: [ability('water', 'wave', {dx: 0, dz: -1, r: 1.6, age: .3, life: .8})]}, {}, 1, () => true, {vp: VP});
  const wave = items.find(it => it.v[3] === 29), half = Math.hypot(wave.v[4], wave.v[5], wave.v[6]);
  assert.ok(half >= 1.6, 'wave half width ' + half);
});

test('painted look: flat washes and same-hue pigment edges, never black outlines', async () => {
  const source = await read('vfx/painted-renderer.mjs');
  const fragment = source.slice(source.indexOf('const FRAGMENT'), source.indexOf('let prog'));
  let braces = 0; for (const ch of fragment) braces += ch === '{' ? 1 : ch === '}' ? -1 : 0;
  assert.equal(braces, 0, 'balanced shader');
  for (const marker of ['vec3 pig=', 'mix(vec3(lum),vD.rgb', 'float line=', 'float pool=', 'gl_FragCoord.xy/uDpr', 'float dis=vL.w']) assert.ok(fragment.includes(marker), marker);
  assert.ok(!/vec3\(0\.?\)\s*,\s*line|outline/i.test(fragment), 'no black outline pass');
  const palettes = [...source.matchAll(/tones\('(#[0-9a-f]{6})', '(#[0-9a-f]{6})', '(#[0-9a-f]{6})'\)/g)].flatMap(m => m.slice(1));
  assert.ok(palettes.length > 40);
  for (const c of palettes) { const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255); assert.ok(.3 * r + .59 * g + .11 * b > .18, 'no near-black paint ' + c); }
  assert.ok(!/\bimport\b|\bexport\s+(?!function createPaintedSkillRenderer)/.test(source.replace(/\/\*[\s\S]*?\*\//g, '')), 'renderer is self-contained');
});

test('assembled runtime draws the painted effects and keeps the old look behind the test switch', async () => {
  const pacing = assemble(await read('game/assets/main-critter-v4.js'), await read('game/index.html'));
  const bundle = applyOpeningRandom(applyRestoredSkillVfx(applySpeciesBundle(pacing.bundle)));
  const audio = applyDefaultAudioVolume(bundle, applySpeciesHtml(pacing.html));
  const hud = applyHudPolish(audio.bundle, audio.html);
  const out = applyPaintedVfx(hud.bundle, hud.html);
  execFileSync(process.execPath, ['--check', '--input-type=module'], {input: out.bundle});
  for (const marker of ['/* PAINTED_WATERCOLOR_VFX */', 'const painted=createPaintedSkillRenderer(e)', 'globalThis.__slimePaintedVfx=painted', 'painted.draw(a,{...o,player:W.player},s,c,l,{hideEnemies:', 'blast:Je(j)', '?{calls:0,triangles:0}:Vr.draw('])
    assert.ok(out.bundle.includes(marker), marker);
  assert.ok(!out.bundle.includes('\nexport function createPaintedSkillRenderer'), 'embedded without export');
  assert.ok(out.html.includes('id="vfx-style-on"') && out.html.includes('slime.vfxStyle.v2'), 'test switch saved on the device');
  assert.throws(() => applyPaintedVfx('nothing', out.html), /expected exactly one baseline/);
  assert.equal(PAINTED_VFX_VERSION, 'painted-watercolor-v2');
  const c = JSON.parse(await read('CANON.json')), sha = async p => createHash('sha256').update(await readFile(new URL('../' + p, import.meta.url))).digest('hex');
  assert.equal(await sha('vfx/painted-style.mjs'), c.paintedVfx.moduleSHA256);
  assert.equal(await sha('vfx/painted-renderer.mjs'), c.paintedVfx.rendererSHA256);
});
