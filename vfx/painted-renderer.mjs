/**
 * Painted watercolour skill effects (owner request, 2026-09-25).
 * Every skill is redrawn from its original concept and card art, not filtered from the old
 * meshes: each effect is a small set of flat painted shapes (droplets, flames, petals, clouds,
 * ice shards, lightning strokes...) shaded with stepped (cel) values, a darker same-hue pigment
 * edge instead of black outlines, paper grain and a watercolour dissolve when it fades.
 * Presentation only: combat objects are read, never changed, so hit areas, sizes, timing and
 * damage stay exactly as they are. One instanced draw call per frame.
 */
export function createPaintedSkillRenderer(gl) {
  const TAU = Math.PI * 2, clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), mix = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255);
  const tones = (l, m, d) => [...hex(l), ...hex(m), ...hex(d)];
  // Shape library (must match the fragment shader).
  const BLOB = 0, RING = 1, FLAME = 2, STAR = 3, SHARD = 4, STREAK = 5, SPLAT = 6, PUFF = 7, CRESCENT = 8, SPIRAL = 9,
    SNOW = 10, BOLT = 11, FAN = 12, FLOWER = 13, RUNE = 14, ARC = 15, MACE = 16, RIBBON = 17, DOME = 18, DRILL = 19,
    COLUMN = 20, BURST = 21, WAVE = 22, FIRE = 23, FIREBALL = 24, SMOKE = 25, LIQUID = 26, TWISTER = 27, STREAM = 28, SURF = 29;
  // Palettes taken from the card icons: light / mid / dark wash. The pigment edge is derived from the dark wash.
  const P = {
    shadow: tones('#6f8a4c', '#5f7a40', '#4c6533'),
    water: tones('#f1fbff', '#a9ddf4', '#5aa6da'), waterDeep: tones('#c4e8f8', '#74c0e8', '#3d88c6'), foam: tones('#ffffff', '#eaf7fd', '#b2dbef'),
    tide: tones('#f5eeff', '#d2baf5', '#9f7bdb'), tideDeep: tones('#e0cdf9', '#ae8ee8', '#7753c2'),
    fire: tones('#ffd978', '#ff9a3a', '#ea5528'), flame: tones('#ffcd6a', '#f7853a', '#d4422a'), ember: tones('#ffa45c', '#b93a2b', '#6b1f1f'),
    smoke: tones('#fbf6ee', '#e4d9cb', '#bba99a'), scorch: tones('#cda57e', '#9d6c4d', '#6d4433'),
    toxin: tones('#eef8a2', '#b9d64c', '#6d9a26'), toxinDeep: tones('#cfe274', '#8aae34', '#4a6e1d'), toxinShade: tones('#ecdcf6', '#be9fdc', '#7c58a8'),
    petal: tones('#f3daf7', '#cc93e2', '#8a4fae'), spore: tones('#fdfbe0', '#eef3a4', '#b3c455'),
    frost: tones('#f7f9ff', '#c8d5f8', '#8fa0e8'), frostDeep: tones('#dfe6fb', '#a3b2ee', '#6b7cd2'),
    chain: tones('#ffffff', '#e8e2fc', '#aa9de6'), chainBlue: tones('#e5ecff', '#a8baf6', '#627ad8'),
    orbit: tones('#f2fbff', '#a6dff8', '#58b0e6'), orbitDeep: tones('#c8e9fb', '#70bbea', '#3c84c8'),
    sparkle: tones('#fffdf0', '#ffeda2', '#f3c35a'),
  };
  const Z4 = [0, 0, 0, 0];
  let items = [], seq = 0, depth = 0, cfg = {};
  const cam = {f: [0, .6247, .7809], r: [1, 0, 0], u: [0, .7809, -.6247]};
  const diagnostics = {version: 'painted-watercolor-v1', instances: 0, calls: 0, kinds: {}, invalid: 0};
  const note = tag => { diagnostics.kinds[tag] = (diagnostics.kinds[tag] || 0) + 1; };
  const impactStates = new WeakMap(), orbTrails = new WeakMap();

  function setCamera(vp) {
    const a = [vp[0], vp[4], vp[8]], b = [vp[1], vp[5], vp[9]];
    let f = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const n = Math.hypot(f[0], f[1], f[2]); if (!(n > 1e-8)) return;
    f = f.map(v => v / n); if (f[1] < 0) f = f.map(v => -v);
    let r = [f[2], 0, -f[0]]; const rn = Math.hypot(r[0], r[2]);
    r = rn > 1e-6 ? [r[0] / rn, 0, r[2] / rn] : [1, 0, 0];
    cam.f = f; cam.r = r; cam.u = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]];
  }
  const at = p => { depth = p[0] * cam.f[0] + p[1] * cam.f[1] + p[2] * cam.f[2]; };
  const lifted = (p, L) => L ? [p[0] + cam.f[0] * L, p[1] + cam.f[1] * L, p[2] + cam.f[2] * L] : p;

  function put(shape, c, U, V, pal, o) {
    const a = o.alpha ?? 1; if (!(a > .003)) return;
    const v = [c[0], c[1], c[2], shape, U[0], U[1], U[2], o.seed ?? 0, V[0], V[1], V[2], Math.min(1, a), ...(o.p || Z4),
      pal[0], pal[1], pal[2], o.dissolve ?? 0, pal[3], pal[4], pal[5], o.edge ?? 1, pal[6], pal[7], pal[8], o.wobble ?? 0,
      o.asp ?? 1, o.shine ?? 0, o.rag ?? 0, o.soft ?? 0];
    if (!v.every(Number.isFinite)) { diagnostics.invalid++; return; }
    items.push({g: o.ground ? 0 : 1, k: o.ground ? (o.layer || 0) : depth + (o.bias || 0), s: seq++, v});
  }
  // Camera-facing billboard; rot turns it on screen (rot = PI/2 points local +x up).
  function bb(shape, p, w, h, pal, o = {}) {
    const t = o.rot || 0, c = Math.cos(t), s = Math.sin(t), R = cam.r, Q = cam.u;
    put(shape, lifted(p, o.lift), [(R[0] * c + Q[0] * s) * w, (R[1] * c + Q[1] * s) * w, (R[2] * c + Q[2] * s) * w],
      [(Q[0] * c - R[0] * s) * h, (Q[1] * c - R[1] * s) * h, (Q[2] * c - R[2] * s) * h], pal, o);
  }
  // Billboard whose local +x follows a world direction projected onto the screen.
  function aim(shape, p, dir, len, wid, pal, o = {}) {
    const f = cam.f, k = dir[0] * f[0] + dir[1] * f[1] + dir[2] * f[2];
    let a = [dir[0] - f[0] * k, dir[1] - f[1] * k, dir[2] - f[2] * k], n = Math.hypot(a[0], a[1], a[2]);
    if (n < 1e-5) { a = cam.r; n = 1; }
    a = [a[0] / n, a[1] / n, a[2] / n];
    const b = [f[1] * a[2] - f[2] * a[1], f[2] * a[0] - f[0] * a[2], f[0] * a[1] - f[1] * a[0]];
    put(shape, lifted(p, o.lift), [a[0] * len, a[1] * len, a[2] * len], [b[0] * wid, b[1] * wid, b[2] * wid], pal, {asp: len / wid, ...o});
  }
  // Stroke whose ends sit exactly on two world points (beams, lightning, links).
  function span(shape, a, b, wid, pal, o = {}) {
    const U = [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2, (b[2] - a[2]) / 2], len = Math.hypot(U[0], U[1], U[2]); if (len < 1e-4) return;
    const f = cam.f; let V = [f[1] * U[2] - f[2] * U[1], f[2] * U[0] - f[0] * U[2], f[0] * U[1] - f[1] * U[0]]; const n = Math.hypot(V[0], V[1], V[2]);
    V = n < 1e-6 ? cam.u : [V[0] / n, V[1] / n, V[2] / n];
    put(shape, lifted([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], o.lift), U, [V[0] * wid, V[1] * wid, V[2] * wid], pal, {asp: len / wid, ...o});
  }
  // Flat decal painted on the ground; local +x follows (dx,dz), local +y points away from the camera.
  function decal(shape, x, z, dx, dz, len, wid, pal, o = {}) {
    put(shape, [x, .028 + (o.layer || 0) * .004, z], [dx * len, 0, dz * len], [dz * wid, 0, -dx * wid], pal, {ground: true, asp: len / wid, ...o});
  }
  const disc = (shape, x, z, r, pal, o = {}) => decal(shape, x, z, 1, 0, r, r, pal, {asp: 1, ...o});
  // Upright/tilted flame with its round base on `base` (rot = PI/2 is straight up on screen).
  function flame(base, len, wid, rot, pal, o = {}) {
    const c = Math.cos(rot), s = Math.sin(rot), R = cam.r, Q = cam.u, k = len - .92 * wid;
    bb(FLAME, [base[0] + (R[0] * c + Q[0] * s) * k, base[1] + (R[1] * c + Q[1] * s) * k, base[2] + (R[2] * c + Q[2] * s) * k], len, wid, pal, {rot, asp: len / wid, ...o});
  }
  // Flame/streak whose round head sits on `head` and whose tail trails along `back` (world direction).
  function trail(shape, head, back, len, wid, pal, o = {}) {
    const n = Math.hypot(back[0], back[1], back[2]) || 1, d = [back[0] / n, back[1] / n, back[2] / n], k = len - .92 * wid;
    aim(shape, [head[0] + d[0] * k, head[1] + d[1] * k, head[2] + d[2] * k], shape === STREAK ? [-d[0], -d[1], -d[2]] : d, len, wid, pal, o);
  }
  const shadow = (x, z, r, alpha) => decal(BLOB, x, z, 1, 0, r, r * .62, P.shadow, {alpha, edge: .2, layer: 0, asp: 1, wobble: .04});
  // Screen direction (world vector) for an on-screen angle.
  const screenDir = a => [cam.r[0] * Math.cos(a) + cam.u[0] * Math.sin(a), cam.r[1] * Math.cos(a) + cam.u[1] * Math.sin(a), cam.r[2] * Math.cos(a) + cam.u[2] * Math.sin(a)];
  const addv = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k];

  // ---------------------------------------------------------------- Water: droplets, jets and a foamy surge
  function waterBolt(t, time) { // Water Shot: a painted water droplet with a tapered tail
    const d = [t.dx, 0, t.dz], r = Math.max(.17, (t.r || .14) * 1.25), p = [t.x, .42, t.z], a = clamp((t.life - t.age) * 6) * smooth(0, .04, t.age), sd = hash(t.x * 3.1 + t.z), back = [-d[0], 0, -d[2]];
    at(p); shadow(t.x, t.z, r * 1.3, .22 * a);
    for (let j = 0; j < 2; j++) {
      const k = (time * 2.2 + j * .5 + sd) % 1, q = [p[0] - d[0] * r * (3.4 + j * 1.3 + k * 1.2), p[1] - .03 - k * .12, p[2] - d[2] * r * (3.4 + j * 1.3 + k * 1.2)];
      const ds = r * (.36 - j * .08); bb(BLOB, q, ds, ds * 1.08, P.water, {alpha: a * (1 - k), p: [.8, .32, 0, 0], seed: j + sd});
    }
    trail(STREAK, p, back, r * 2.3, r * 1.2, P.water, {alpha: .85 * a, p: [.6, .04, 5, 0], seed: sd, shine: .6, lift: .15});
    bb(BLOB, p, r * 1.25, r * 1.25, P.water, {alpha: a, p: [1, .3, .15, 0], seed: sd, shine: .4, lift: .16, bias: .01});
  }
  function splashCrown(x, z, p, size, seed, pal = P.water) { // droplets thrown up in a crown, like the splash on the card
    const g = smooth(0, .55, p), A = 1 - smooth(.5, 1, p);
    for (let j = 0; j < 7; j++) {
      const an = j * TAU / 7 + seed * 6, sp = size * (.35 + .25 * hash(j + seed)), out = size * .15 + g * sp, up = Math.sin(Math.min(1, p * 1.25) * Math.PI) * size * (.55 + .3 * hash(j * 3 + seed));
      const c = [x + Math.cos(an) * out, .08 + up, z + Math.sin(an) * out], vy = Math.cos(Math.min(1, p * 1.25) * Math.PI);
      at(c); trail(STREAK, c, [-Math.cos(an) * .6, -vy, -Math.sin(an) * .6], size * .13, size * .08, pal, {alpha: A, p: [1, 0, 0, 0], seed: j, shine: 1, lift: .45});
    }
  }
  function waterImpacts(combat, time, visible) {
    const clock = combat.clock ?? time; let st = impactStates.get(combat);
    if (!st || clock < st.clock) { st = {clock, prev: new Map(), events: []}; impactStates.set(combat, st); }
    for (const [t, n] of st.prev) if ((t.hit?.size || 0) > n && t.kind === 'bolt') st.events.push({x: t.x, z: t.z, dx: t.dx, dz: t.dz, born: clock, seed: hash(t.x * 7 + t.z)});
    st.prev = new Map((combat.abilities || []).filter(t => t.family === 'water' && t.kind === 'bolt').map(t => [t, t.hit?.size || 0]));
    st.events = st.events.filter(e => clock - e.born < .4).slice(-48); st.clock = clock;
    for (const e of st.events) {
      if (!visible(e.x, e.z, .8)) continue; note('water:impact');
      const p = clamp((clock - e.born) / .4), A = 1 - smooth(.45, 1, p), g = smooth(0, .5, p);
      disc(RING, e.x, e.z, .3 + g * .55, P.water, {alpha: A, p: [.8, .09, .6, .03], layer: 2, seed: e.seed, rag: .5});
      disc(SPLAT, e.x, e.z, .3 + g * .16, P.water, {alpha: .8 * A, p: [.25, 6, 5, 0], layer: 1, seed: e.seed, dissolve: smooth(.55, 1, p), shine: .8});
      at([e.x, .35, e.z]);
      if (p < .35) bb(BURST, [e.x, .38, e.z], .3 + p * .7, .3 + p * .7, P.foam, {alpha: 1 - smooth(.15, .35, p), p: [9, 2, .38, 0], seed: e.seed, lift: .6});
      splashCrown(e.x, e.z, p, .75, e.seed);
    }
  }
  function waterBeam(t, time) { // AQUA RAILGUN: one straight, pressurised water line that pierces everything
    const p = clamp(t.age / t.life), d = [t.dx, 0, t.dz], w = t.r, ext = smooth(0, .25, p), A = 1 - smooth(.7, 1, p), dis = smooth(.62, 1, p), sd = hash(t.x + t.z * 3);
    const L = Math.max(w, t.length * ext), a = [t.x + d[0] * .25, .48, t.z + d[2] * .25], b = [t.x + d[0] * L, .48, t.z + d[2] * L], m = [(a[0] + b[0]) / 2, .48, (a[2] + b[2]) / 2];
    decal(STREAM, m[0], m[2], d[0], d[2], L / 2, w * 1.5, P.water, {alpha: .45 * A, p: [1, 0, 0, 0], layer: 1, dissolve: dis, seed: sd, shine: .6});
    at(m);
    span(STREAM, a, b, w * 1.9, P.foam, {alpha: .45 * A, p: [1.1, 0, 0, 0], seed: sd + 3, soft: .8, lift: .5, bias: -.01});
    span(STREAM, a, b, w * 1.2, P.waterDeep, {alpha: .95 * A, p: [1.2, 0, 0, 0], dissolve: dis, seed: sd, shine: .4, lift: .5});
    span(STREAM, a, b, w * .72, P.water, {alpha: A, p: [1.5, 0, 0, 0], dissolve: dis * .9, seed: sd + 1, bias: .01, shine: 1, lift: .5});
    for (let j = 0; j < 12; j++) {
      const u = hash(j * 3.7 + sd), side = j % 2 ? 1 : -1, k = clamp((p - .05 - u * .2) / .55); if (k <= 0 || k >= 1) continue;
      const along = .4 + (L - .4) * u, off = w * (.5 + k * 1.4) * side, c = [t.x + d[0] * along - d[2] * off, .48 + Math.sin(k * Math.PI) * .45, t.z + d[2] * along + d[0] * off];
      trail(STREAK, c, [d[2] * side, -Math.cos(k * Math.PI), -d[0] * side], w * .22, w * .13, P.water, {alpha: A * (1 - k), p: [1, 0, 0, 0], seed: j, bias: .03, shine: 1, lift: .5});
    }
    at(b); bb(SMOKE, [b[0], .6, b[2]], w * 1.5, w * 1.2, P.foam, {alpha: A * smooth(.12, .28, p) * .9, p: [.9, 0, 0, 0], seed: sd, lift: .5, soft: .4});
    splashCrown(t.x + d[0] * .45, t.z + d[2] * .45, clamp(p * 1.4), 1.1, sd);
  }
  function waterJet(t, time) { // PRESSURE JET: a continuous high-pressure stream
    const p = clamp(t.age / t.life), d = [t.dx, 0, t.dz], w = t.r, A = smooth(0, .1, p) * (1 - smooth(.8, 1, p)), sd = hash(t.x * 2 + t.z);
    const a = [t.x + d[0] * .25, .46, t.z + d[2] * .25], b = [t.x + d[0] * t.length, .46, t.z + d[2] * t.length], m = [(a[0] + b[0]) / 2, .46, (a[2] + b[2]) / 2];
    decal(STREAM, m[0], m[2], d[0], d[2], t.length / 2, w * 2.8, P.water, {alpha: .42 * A, p: [1, 0, 0, 0], layer: 1, seed: sd, shine: .6});
    at(m);
    span(STREAM, a, b, w * 3.2, P.foam, {alpha: .4 * A, p: [1.4, 0, 0, 0], seed: sd + 3, soft: .8, lift: .45, bias: -.01});
    span(STREAM, a, b, w * 2.1, P.waterDeep, {alpha: .92 * A, p: [1.6, 0, 0, 0], seed: sd, shine: .3, lift: .45});
    span(STREAM, a, b, w * 1.25, P.water, {alpha: A, p: [2, 0, 0, 0], seed: sd + 1, bias: .01, shine: 1, lift: .45});
    for (let j = 0; j < 8; j++) { // droplets peeling off the stream
      const k = (time * 1.8 + j / 8 + sd) % 1, u = hash(j * 5.3 + sd), side = j % 2 ? 1 : -1, along = .5 + (t.length - .5) * u, off = w * (1 + k * 3) * side;
      const c = [t.x + d[0] * along - d[2] * off, .46 + Math.sin(k * Math.PI) * .35, t.z + d[2] * along + d[0] * off];
      trail(STREAK, c, [d[2] * side - d[0] * .5, -Math.cos(k * Math.PI), -d[0] * side - d[2] * .5], .1, .06, P.water, {alpha: A * (1 - k), p: [1, 0, 0, 0], seed: j, bias: .03, shine: 1, lift: .45});
    }
    for (let j = 0; j < 3; j++) { // mist where the stream breaks up
      const k = (time * 1.7 + j / 3) % 1, c = [b[0] + d[0] * k * .6 + (j - 1) * .25 * d[2], .5 + k * .35, b[2] + d[2] * k * .6 - (j - 1) * .25 * d[0]];
      at(c); bb(SMOKE, c, .34 + k * .38, .28 + k * .3, P.foam, {alpha: A * (1 - k) * .85, p: [.8, 0, 0, 0], seed: j, dissolve: smooth(.6, 1, k), lift: .3, soft: .4});
    }
    splashCrown(b[0], b[2], (time * 2.5) % 1, .7, sd + 1);
  }
  // A standing sheet between two ground points that leans toward the camera (for walls such as waves).
  function wall(shape, a, b, h, pal, o = {}) {
    const U = [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2, (b[2] - a[2]) / 2], len = Math.hypot(U[0], U[1], U[2]); if (len < 1e-4) return;
    const f = cam.f; let V = [f[1] * U[2] - f[2] * U[1], f[2] * U[0] - f[0] * U[2], f[0] * U[1] - f[1] * U[0]]; const n = Math.hypot(V[0], V[1], V[2]);
    V = n < 1e-6 ? cam.u : [V[0] / n, V[1] / n, V[2] / n]; if (V[1] < 0) V = [-V[0], -V[1], -V[2]];
    V = [V[0] * .45 + cam.u[0] * .55, V[1] * .45 + cam.u[1] * .55, V[2] * .45 + cam.u[2] * .55]; const vn = Math.hypot(V[0], V[1], V[2]); V = [V[0] / vn * h, V[1] / vn * h, V[2] / vn * h];
    put(shape, lifted([(a[0] + b[0]) / 2 + V[0], (a[1] + b[1]) / 2 + V[1], (a[2] + b[2]) / 2 + V[2]], o.lift), U, V, pal, {asp: len / h, ...o});
  }
  function waterWave(t, time) { // TIDAL SURGE: a sheet of water rushes forward, its foamy front throwing up froth and spray
    const p = clamp(t.age / t.life), d = [t.dx, 0, t.dz], sd = [-t.dz, 0, t.dx], w = t.r, A = smooth(0, .1, p) * (1 - smooth(.76, 1, p)), seed = hash(t.x * .3 + t.z * .7);
    decal(SURF, t.x - d[0] * .6, t.z - d[2] * .6, sd[0], sd[2], w * 1.06, .95, P.water, {alpha: .95 * A, p: [1.2, 0, 0, 0], layer: 2, seed, shine: .5, dissolve: smooth(.7, 1, p)});
    const n = Math.max(3, Math.round(w * 2 / .5));
    for (let j = 0; j < n; j++) { // froth rolling along the front, spray thrown ahead
      const s = (j + .5) / n * 2 - 1, taper = 1 - s * s * .5, base = [t.x + sd[0] * s * w * .92 + d[0] * .05, 0, t.z + sd[2] * s * w * .92 + d[2] * .05], h = (.18 + .1 * Math.sin(time * 6 + j * 1.9)) * taper;
      at(base); bb(SMOKE, [base[0], h, base[2]], .32 * taper, .2 * taper, P.foam, {alpha: A * .95, p: [1.1, 0, 0, 0], seed: j + seed, lift: .35, soft: .3});
      const k = (time * 1.6 + hash(j + seed)) % 1, c = [base[0] + d[0] * (.1 + k * .6), .15 + Math.sin(k * Math.PI) * .45, base[2] + d[2] * (.1 + k * .6)];
      trail(STREAK, c, [-d[0], -Math.cos(k * Math.PI) * 1.5, -d[2]], .1, .06, P.water, {alpha: A * (1 - k), p: [1, 0, 0, 0], seed: j, bias: .03, shine: 1, lift: .4});
    }
  }
  // ---------------------------------------------------------------- Tide: lilac brush ripples, a bubble dome, a whirlpool
  function speckles(x, z, R, n, pal, alpha, seed, spread = .3) { // scattered paint dots around a ring, as on the card
    for (let j = 0; j < n; j++) { const an = hash(j * 3.1 + seed) * TAU, rr = R * (1 + (hash(j * 7.3 + seed) - .3) * spread), s = .03 + .045 * hash(j * 1.9 + seed); disc(BLOB, x + Math.cos(an) * rr, z + Math.sin(an) * rr, s, pal, {alpha: alpha * (.6 + .4 * hash(j + seed)), p: [.4, 0, 0, 0], layer: 3, seed: j}); }
  }
  function tideRing(t, time) { // Tide Ring: concentric lilac brush ripples with four crystals
    const p = clamp(t.age / t.life), R = Math.max(.05, t.r * Math.min(1, p * 3)), A = 1 - smooth(.6, 1, p), seed = hash(t.x + t.z * 1.7);
    disc(BLOB, t.x, t.z, R, P.tide, {alpha: .16 * A, p: [0, 0, .75, 0], layer: 1, wobble: .05, seed});
    disc(RING, t.x, t.z, R * 1.08, P.tideDeep, {alpha: .95 * A, p: [.86, .09, .7, .035], layer: 2, seed, rag: .8});
    disc(RING, t.x, t.z, R * 1.08, P.tide, {alpha: .85 * A * smooth(.12, .35, p), p: [.64, .065, .6, .03], layer: 3, seed: seed + 1, rag: .8});
    disc(RING, t.x, t.z, R * 1.08, P.tide, {alpha: .6 * A * smooth(.2, .45, p), p: [.42, .045, .5, .03], layer: 3, seed: seed + 2, rag: .8});
    speckles(t.x, t.z, R * 1.02, 12, P.tideDeep, A * smooth(.15, .3, p), seed);
    const pop = smooth(.15, .32, p) * A;
    for (let j = 0; j < 4; j++) { // four faceted crystals on the diagonals, as on the Tide Ring card
      const an = j * TAU / 4 + TAU / 8, c = [t.x + Math.cos(an) * R * 1.02, .24, t.z + Math.sin(an) * R * 1.02]; at(c);
      aim(SHARD, c, [Math.cos(an), 0, Math.sin(an)], .22 * pop + .01, .12 * pop + .01, P.tideDeep, {alpha: pop, p: [.5, 1, 0, 0], seed: j, lift: .2});
    }
  }
  function tideDome(t, time) { // REPULSION DOME: a lilac soap-bubble shield
    const p = clamp(t.age / t.life), r = t.r, A = smooth(0, .1, p) * (1 - smooth(.82, 1, p)), R = r * (.35 + .65 * smooth(0, .16, p)), seed = hash(t.x * 1.3 + t.z);
    disc(BLOB, t.x, t.z, R, P.tide, {alpha: .22 * A, p: [0, 0, .55, 0], layer: 1, seed});
    disc(RING, t.x, t.z, R, P.tideDeep, {alpha: .95 * A, p: [.9, .06, .35, .02], layer: 2, seed, rag: .6});
    const k = (t.age % .5) / .5; disc(RING, t.x, t.z, R, P.tide, {alpha: A * (1 - k) * .85, p: [mix(.45, .9, k), .045, .8, .02], layer: 3, seed: seed + 2, rag: .6});
    speckles(t.x, t.z, R, 10, P.tideDeep, A * .8, seed, .25);
    at([t.x, 0, t.z]);
    bb(DOME, [t.x, 0, t.z], R, R, P.tide, {alpha: .92 * A, p: [Math.max(.2, cam.f[1]), 0, 0, 0], seed, rag: .3});
    for (let j = 0; j < 3; j++) { const an = t.age * 1.6 + j * TAU / 3, c = addv([t.x, 0, t.z], screenDir(an), R * .82); bb(STAR, [c[0], Math.max(.1, c[1]), c[2]], .13, .13, P.tide, {alpha: A * (.6 + .4 * Math.sin(t.age * 8 + j)), p: [4, 7, .12, 0], bias: .02}); }
  }
  function tideVacuum(t, time) { // VACUUM COLLAPSE: a whirlpool that swells, pulls in and bursts
    const p = clamp(t.age / t.life), R = Math.max(.08, t.r * Math.sin(p * Math.PI)), A = smooth(0, .06, p) * (1 - smooth(.92, 1, p)), seed = hash(t.x + t.z * 2.1);
    disc(BLOB, t.x, t.z, R, P.tideDeep, {alpha: .2 * A, p: [0, 0, .3, 0], layer: 0, seed});
    disc(SPIRAL, t.x, t.z, R, P.tideDeep, {alpha: .88 * A, p: [1.9, 4, -t.age * 2.4, .44], layer: 1, wobble: .05, seed, rag: .6});
    disc(RING, t.x, t.z, R * 1.05, P.tide, {alpha: A, p: [.88, .065, .3, .03], layer: 2, seed, rag: .7});
    for (let j = 0; j < 14; j++) {
      const k = (t.age * 1.3 + j / 14) % 1, an = j * 2.4 + t.age * 3 + k * 2.6, rr = R * (1 - k) * 1.05, s = .08 * (1 - k * .5);
      const c = [t.x + Math.cos(an) * rr, .1 + k * .06, t.z + Math.sin(an) * rr]; at(c);
      bb(BLOB, c, s, s, j % 3 ? P.tide : P.tideDeep, {alpha: A * smooth(0, .2, k) * (1 - smooth(.85, 1, k)), p: [.8, .35, .4, 0], seed: j});
    }
    if (p > .8) {
      const k = smooth(.8, 1, p); at([t.x, .45, t.z]);
      bb(BURST, [t.x, .45, t.z], .5 + k * 1.6, .5 + k * 1.6, P.tide, {alpha: 1 - smooth(.6, 1, k), p: [10, 2.4, .34, 0], seed, lift: .3});
      disc(RING, t.x, t.z, .4 + k * t.r * .95, P.tideDeep, {alpha: 1 - k, p: [.85, .08, .6, .03], layer: 3, seed: seed + 3, rag: .7});
      speckles(t.x, t.z, .4 + k * t.r * .9, 14, P.tide, 1 - k, seed + 4, .4);
    }
  }
  function tideResonance(t, time) { // RESONANCE CHAIN: rhythmic sound-wave rings
    const p = clamp(t.age / t.life), A = 1 - smooth(.62, 1, p), seed = hash(t.x * 2.3 + t.z);
    for (let j = 0; j < 3; j++) {
      const q = clamp(p * 1.6 - j * .18), R = Math.max(.05, t.r * smooth(0, .6, q));
      if (q > 0) disc(RING, t.x, t.z, R * 1.08, j ? P.tide : P.tideDeep, {alpha: A * (1 - smooth(.7, 1, q) * .6), p: [.86, .07 - j * .014, .7, .03], layer: 2 + j, seed: seed + j, rag: .7});
    }
    const R = t.r * smooth(0, .6, clamp(p * 1.6));
    speckles(t.x, t.z, R, 10, P.tideDeep, A * smooth(.1, .25, p), seed);
    for (let j = 0; j < 6; j++) { const an = j * TAU / 6 + t.age, c = [t.x + Math.cos(an) * R * .93, .3 + .1 * Math.sin(t.age * 10 + j), t.z + Math.sin(an) * R * .93]; at(c); bb(STAR, c, .14, .14, P.tide, {alpha: A * smooth(.1, .3, p), p: [4, 7, .14, 0], seed: j}); }
  }
  // ---------------------------------------------------------------- Toxin: lime slime drops on purple shadows, a plague flower, acid fog
  function toxinLob(t, time) {
    const p = clamp(t.age / t.life), x = mix(t.x, t.tx, p), z = mix(t.z, t.tz, p), y = .32 + Math.sin(p * Math.PI) * 1.1, r = .3, c = [x, y, z], sd = hash(t.tx * 1.3 + t.tz);
    decal(BLOB, x + .05, z - .04, 1, 0, r * (1.25 - .45 * Math.sin(p * Math.PI)), r * .8, P.toxinShade, {alpha: .45, asp: 1, layer: 0, edge: .4});
    at(c);
    const vx = t.tx - t.x, vz = t.tz - t.z, n = Math.hypot(vx, vz) || 1, back = [-vx / n, -Math.cos(p * Math.PI) * 1.6, -vz / n];
    for (let j = 0; j < 3; j++) { const q = addv(c, back, r * (1.25 + j * .75) / Math.hypot(...back)), s = r * (.3 - j * .07); bb(BLOB, q, s, s * 1.1, P.toxin, {alpha: .92 - j * .22, p: [.8, .3, 0, 0], seed: j + sd, shine: .5}); }
    bb(BLOB, c, r * 1.05, r * (1.05 + .1 * Math.sin(t.age * 18)), P.toxin, {p: [1, .3, 0, 0], seed: sd, bias: .01, shine: .5, wobble: .05});
    bb(BLOB, [x - r * .28, y - r * .1, z], r * .3, r * .3, P.spore, {p: [.4, .35, .7, 0], seed: 2, bias: .02});
    bb(BLOB, [x + r * .22, y + r * .22, z], r * .17, r * .17, P.spore, {p: [.4, .35, .7, 0], seed: 3, bias: .02});
  }
  function toxinPool(t, time) { // a lime puddle on a purple shadow, bubbling
    const p = clamp(t.age / t.life), r = t.r || .8, g = .35 + .65 * smooth(0, .12, p), A = 1 - smooth(.8, 1, p), seed = hash(t.x * 1.9 + t.z * .7), dis = smooth(.8, 1, p);
    disc(SPLAT, t.x + .1, t.z - .08, r * 1.12 * g, P.toxinShade, {alpha: .75 * A, p: [.16, 5, 0, 0], layer: 0, seed, dissolve: dis});
    disc(SPLAT, t.x, t.z, r * g, P.toxin, {alpha: .95 * A, p: [.16, 5, 5, 0], layer: 1, seed, dissolve: dis, shine: .5});
    for (let j = 0; j < 5; j++) {
      const k = (t.age * 1.1 + j * .23 + hash(seed + j)) % 1, an = hash(seed * 3 + j) * TAU, rr = r * .6 * hash(seed + j * 7), s = .06 + .07 * Math.sin(k * Math.PI);
      const c = [t.x + Math.cos(an) * rr, .06 + k * .12, t.z + Math.sin(an) * rr]; at(c);
      bb(BLOB, c, s, s, P.toxin, {alpha: A * (1 - smooth(.8, 1, k)), p: [.6, .38, .55, 0], seed: j, lift: .3});
    }
  }
  function toxinInfection(t, time) { // NEUROTOXIN INJECTION: a pulsing poison drop marks the target, then pops
    const p = clamp(t.age / t.life), A = smooth(0, .1, p) * (1 - smooth(.9, 1, p)), beat = 1 + (.08 + .14 * p) * Math.sin(t.age * (6 + p * 18)), seed = hash(t.x + t.z);
    disc(RING, t.x, t.z, t.r, P.toxinShade, {alpha: .85 * A, p: [.86, .08, .4, .04], layer: 2, seed, rag: .7});
    disc(SPLAT, t.x, t.z, t.r * .62, P.toxin, {alpha: .55 * A, p: [.2, 6, 3, 0], layer: 1, seed, shine: .4});
    const top = [t.x, 1.55 + Math.sin(t.age * 4) * .06, t.z]; at(top);
    flame([top[0], top[1] - .18, top[2]], .5 * beat, .3 * beat, Math.PI / 2, P.toxin, {p: [0, 0, 0, .5], lift: .8, seed, shine: .6});
    bb(BLOB, [top[0] - .07, top[1] - .1, top[2]], .08, .08, P.spore, {p: [.4, .4, .6, 0], lift: .82, bias: .02});
    bb(BLOB, [top[0] + .06, top[1] - .2, top[2]], .05, .05, P.spore, {p: [.4, .4, .6, 0], lift: .82, bias: .02});
    for (let j = 0; j < 4; j++) { const an = t.age * 2.4 + j * TAU / 4, c = [t.x + Math.cos(an) * .62, .45 + .22 * Math.sin(t.age * 3 + j), t.z + Math.sin(an) * .62]; at(c); bb(BLOB, c, .1, .1, j % 2 ? P.toxin : P.toxinShade, {alpha: A, p: [.7, .38, .45, 0], lift: .35, seed: j}); }
  }
  function toxinBurst(t, time) {
    const p = clamp(t.age / t.life), r = t.r, A = 1 - smooth(.55, 1, p), g = smooth(0, .35, p), seed = hash(t.x * 3 + t.z);
    disc(SPLAT, t.x + .1, t.z - .08, r * (.5 + g * 1.05), P.toxinShade, {alpha: .6 * A, p: [.3, 7, 0, 0], layer: 0, seed, dissolve: smooth(.5, 1, p)});
    disc(SPLAT, t.x, t.z, r * (.4 + g), P.toxin, {alpha: .95 * A, p: [.3, 7, 6, 0], layer: 1, seed, dissolve: smooth(.5, 1, p), shine: .5});
    splashCrown(t.x, t.z, p, 1.3 * r, seed, P.toxin);
    for (let j = 0; j < 3; j++) { const an = j * 2.1 + seed, c = [t.x + Math.cos(an) * r * .35, .5 + p * .55, t.z + Math.sin(an) * r * .35], s = r * (.45 + p * .6); at(c); bb(SMOKE, c, s, s * .72, j % 2 ? P.toxin : P.toxinShade, {alpha: .85 * (1 - smooth(.3, 1, p)), p: [.6, 0, 0, 0], soft: .35, seed: j, dissolve: smooth(.4, 1, p), lift: .3}); }
  }
  function toxinBloom(t, time) { // PLAGUE BLOOM: a poison flower that puffs spores in rhythm
    const p = clamp(t.age / t.life), r = t.r, A = smooth(0, .08, p) * (1 - smooth(.86, 1, p)), open = smooth(0, .22, p), seed = hash(t.x * .9 + t.z * 1.3);
    disc(BLOB, t.x, t.z, r, P.toxin, {alpha: .16 * A, p: [0, 0, .7, 0], layer: 0, seed, wobble: .08});
    disc(RING, t.x, t.z, r, P.toxinShade, {alpha: .8 * A, p: [.9, .025, .6, .03], layer: 1, seed, rag: 1});
    const fr = 1.6 * (.35 + .65 * open), pulse = 1 + .06 * Math.sin(t.age * TAU / .45);
    disc(FLOWER, t.x + .08, t.z - .06, fr * 1.06 * pulse, P.toxinShade, {alpha: .5 * A, p: [6, 1.7, .28, seed * 6 + .26], layer: 2, seed, wobble: .1});
    disc(FLOWER, t.x, t.z, fr * pulse, P.petal, {alpha: .85 * A, p: [6, 1.7, .28, seed * 6], layer: 3, seed, rag: .3, wobble: .1});
    const sway = Math.sin(t.age * 2.1) * .08, top = [t.x + sway, .15 + 1.05 * open, t.z], hs = .62 * open * pulse; at([t.x, .6, t.z]);
    span(RIBBON, [t.x, .02, t.z], top, .1, P.toxinDeep, {alpha: A, p: [.75, 0, .04, .25], seed, lift: .6});
    for (const side of [-1, 1]) flame([t.x, .12 + .12 * open, t.z], .42 * open, .17 * open, Math.PI / 2 - side * .95, P.toxin, {alpha: A, p: [0, 0, 0, .3], seed: seed + side, lift: .6});
    bb(FLOWER, top, hs, hs * .72, P.petal, {alpha: A, p: [6, 1.6, .3, seed * 6], seed, lift: .62, rot: sway, rag: .3, wobble: .09});
    bb(BLOB, [top[0], top[1] + .02, top[2]], hs * .3, hs * .24, P.toxin, {alpha: A, p: [1, .3, 0, 0], seed, lift: .64, shine: .5});
    const k = (t.age % .45) / .45, wave = Math.floor(t.age / .45);
    for (let j = 0; j < 8; j++) {
      const an = j * TAU / 8 + wave * .6, dist = r * k * .8, c = [top[0] + Math.cos(an) * dist, top[1] + Math.sin(k * Math.PI) * .35 - k * .5 + .1 * hash(j + wave), top[2] + Math.sin(an) * dist], s = .13 + .08 * k; at(c);
      bb(SMOKE, c, s, s * .8, j % 2 ? P.spore : P.toxin, {alpha: A * (1 - smooth(.65, 1, k)) * smooth(0, .12, k), p: [.6, 0, 0, 0], soft: .35, seed: j, lift: .2});
    }
  }
  function toxinArc(t, time) { // a spore flying to a new victim
    const p = clamp(t.age / t.life), x = mix(t.x, t.tx, p), z = mix(t.z, t.tz, p), y = .35 + Math.sin(p * Math.PI) * .8, c = [x, y, z]; at(c);
    for (let j = 1; j < 3; j++) { const q = clamp(p - j * .08); bb(BLOB, [mix(t.x, t.tx, q), .35 + Math.sin(q * Math.PI) * .8, mix(t.z, t.tz, q)], .07 - j * .015, .07 - j * .015, P.spore, {alpha: .85 - j * .2, p: [.5, 0, 0, 0], lift: .3}); }
    bb(SMOKE, c, .2, .16, P.spore, {p: [.6, 0, 0, 0], soft: .35, bias: .02, lift: .3});
  }
  function toxinMiasma(t, time) { // CORROSIVE MIASMA: a rolling purple acid cloud
    const p = clamp(t.age / t.life), r = t.r, A = smooth(0, .12, p) * (1 - smooth(.8, 1, p)), seed = hash(t.x * .37 + t.z * .11), dis = smooth(.82, 1, p);
    disc(LIQUID, t.x, t.z, r * 1.1, P.toxinShade, {alpha: .55 * A, p: [.6, 2, 0, 0], layer: 0, seed, dissolve: dis, soft: .5});
    disc(LIQUID, t.x, t.z, r * .75, P.toxin, {alpha: .45 * A, p: [.6, 2.4, 0, 0], layer: 1, seed: seed + 1, dissolve: dis, soft: .5});
    for (let j = 0; j < 6; j++) {
      const an = j * TAU / 6 + t.age * .6, rr = r * .55 * (.85 + .15 * Math.sin(t.age * 1.3 + j)), c = [t.x + Math.cos(an) * rr, .42 + .12 * Math.sin(t.age * 1.7 + j * 2), t.z + Math.sin(an) * rr], s = r * (.5 + .08 * Math.sin(t.age * 2 + j)); at(c);
      bb(SMOKE, c, s * 1.1, s * .8, j % 3 === 0 ? P.toxin : P.toxinShade, {alpha: .72 * A, p: [.6, 0, 0, 0], soft: .6, seed: j + seed, dissolve: dis, lift: .2});
    }
    const c = [t.x, .7, t.z]; at(c); bb(SMOKE, c, r * .8, r * .58, P.toxinShade, {alpha: .7 * A, p: [.6, 0, 0, 0], soft: .6, seed: seed + 9, bias: .05, dissolve: dis, lift: .2});
    for (let j = 0; j < 4; j++) { const k = (t.age * 1.5 + j / 4) % 1, an = hash(seed + j * 4) * TAU, rr = r * .7 * hash(j + seed), s = .06 + .06 * Math.sin(k * Math.PI), q = [t.x + Math.cos(an) * rr, .08 + k * .1, t.z + Math.sin(an) * rr]; at(q); bb(BLOB, q, s, s, P.toxin, {alpha: A * (1 - smooth(.8, 1, k)), p: [.6, .38, .55, 0], seed: j, lift: .3}); }
  }
  // ---------------------------------------------------------------- Frost: faceted crystals, a crystal drill, snowy breath
  function frostCrystal(t, time) { // Frost Spike: a faceted ice shard
    const d = [t.dx, 0, t.dz], p = [t.x, .44, t.z], A = clamp((t.life - t.age) * 6) * smooth(0, .05, t.age), sd = hash(t.x * 5 + t.z);
    at(p); shadow(t.x, t.z, .2, .2 * A);
    trail(STREAK, addv(p, d, -.25), [-d[0], 0, -d[2]], .5, .08, P.frost, {alpha: .55 * A, p: [0, 0, 0, 0], seed: sd, lift: .2});
    for (let j = 0; j < 3; j++) { const k = (time * 3 + j / 3 + sd) % 1, c = addv([p[0], p[1] + .06 * Math.sin(j * 2.1), p[2]], d, -(.35 + k * .6)); bb(STAR, c, .09 * (1 - k), .09 * (1 - k), P.frost, {alpha: A * (1 - k), p: [4, 7, .14, 0], seed: j, lift: .2}); }
    aim(SHARD, p, d, .34, .15, P.frost, {alpha: A, p: [.36, 1, 0, 0], seed: sd, bias: .02, lift: .25});
  }
  function frostBorer(t, time) { // GLACIAL BORER: a spinning crystal drill
    const d = [t.dx, 0, t.dz], s = t.r / .58, p = [t.x, .55, t.z], A = clamp((t.life - t.age) * 5) * smooth(0, .06, t.age), sd = hash(t.x + t.z * 3);
    at(p); shadow(t.x, t.z, t.r * 1.2, .24 * A);
    decal(RIBBON, t.x - d[0] * 1.3, t.z - d[2] * 1.3, d[0], d[2], 1.3, t.r * .9, P.frost, {alpha: .6 * A, p: [.8, 1, 0, .4], layer: 1, seed: sd, shine: .6});
    for (let j = 0; j < 4; j++) { const k = (time * 2.5 + j / 4) % 1, c = [p[0] - d[0] * (.6 + k * 1.3) + (j - 1.5) * .14 * d[2], .45 + k * .28, p[2] - d[2] * (.6 + k * 1.3) - (j - 1.5) * .14 * d[0]]; bb(SMOKE, c, (.26 + k * .32) * s, (.21 + k * .26) * s, P.frost, {alpha: A * (1 - k) * .8, p: [.6, 0, 0, 0], soft: .35, seed: j, dissolve: smooth(.5, 1, k), lift: .2}); }
    const sdv = [-d[2], 0, d[0]];
    for (const k of [-1, 1]) aim(SHARD, addv(addv(p, d, -t.r * .5), sdv, k * t.r * .42), d, t.r * .8, t.r * .3, P.frostDeep, {alpha: A, p: [.3, 1, 0, 0], seed: sd + k, bias: .01, lift: .3});
    aim(SHARD, p, d, t.r * 1.55, t.r * .55, P.frost, {alpha: A, p: [.28, 1, 0, 0], seed: sd, bias: .02, lift: .3, shine: .5});
    for (let j = 0; j < 5; j++) { const an = time * 9 + j * TAU / 5, c = addv(addv(p, d, -.15 - .12 * (j % 2)), screenDir(an), t.r * 1.05); aim(SHARD, c, screenDir(an + 1.4), .14, .06, P.frostDeep, {alpha: A * .95, p: [.4, 1, 0, 0], seed: j, bias: .03, lift: .3}); }
  }
  function frostCone(t, time) { // WHITEOUT BREATH: a cone of swirling snow
    const p = clamp(t.age / t.life), A = smooth(0, .12, p) * (1 - smooth(.78, 1, p)), L = t.length * (.35 + .65 * smooth(0, .22, p)), ang = t.angle, d = [t.dx, 0, t.dz], yaw = Math.atan2(t.dx, t.dz), sd = hash(t.x + t.z);
    decal(FAN, t.x + d[0] * L / 2, t.z + d[2] * L / 2, d[0], d[2], L / 2, L * Math.sin(ang), P.foam, {alpha: .92 * A, p: [ang, 1.4, 0, 0], layer: 1, seed: sd, rag: .6, shine: 1, soft: .5});
    const L2 = L * .78; decal(FAN, t.x + d[0] * L2 / 2, t.z + d[2] * L2 / 2, d[0], d[2], L2 / 2, L2 * Math.sin(ang * .55), P.frost, {alpha: .75 * A, p: [ang * .55, 2, 0, 0], layer: 2, seed: sd + 1, rag: .6, shine: .6, soft: .5});
    for (let j = 0; j < 6; j++) { // snow clouds rolling out along the cone
      const k = (time * .9 + j / 6) % 1, a = (hash(j * 3.3 + sd) - .5) * 1.2 * ang, dist = .5 + k * L * .85, c = [t.x + Math.sin(yaw + a) * dist, .35 + k * .25, t.z + Math.cos(yaw + a) * dist], s = .28 + k * .42; at(c);
      bb(SMOKE, c, s, s * .75, P.frost, {alpha: A * smooth(0, .15, k) * (1 - smooth(.7, 1, k)) * .9, p: [.6, 0, 0, 0], soft: .35, seed: j + sd, dissolve: smooth(.6, 1, k), lift: .2});
    }
    for (let j = 0; j < 12; j++) {
      const k = (time * 1.1 + hash(j * 1.3 + sd)) % 1, a = (hash(j * 7 + sd) - .5) * 1.8 * ang, dist = .4 + k * L * .92, s = .13 + k * .1;
      const c = [t.x + Math.sin(yaw + a) * dist, .25 + .4 * hash(j * 3) + k * .2, t.z + Math.cos(yaw + a) * dist]; at(c);
      bb(SNOW, c, s, s, P.frostDeep, {alpha: A * smooth(0, .1, k) * (1 - smooth(.75, 1, k)), rot: time * 2 + j, p: [.08, 0, 0, 0], seed: j, lift: .25, bias: .03});
    }
  }
  function frostCluster(t, time) { // CRYSTAL CHAINBURST: crystals erupt from the ground, then shatter
    const p = clamp(t.age / t.life), r = t.r, A = 1 - smooth(.8, 1, p), grow = smooth(0, .4, p), seed = hash(t.x * 1.7 + t.z * .3), g = t.generation || 0;
    disc(SNOW, t.x, t.z, r * (.4 + .75 * grow), P.frost, {alpha: .75 * A, p: [.06, 0, 0, 0], layer: 1, seed, rag: .4});
    disc(BLOB, t.x, t.z, r * .8, P.frost, {alpha: .3 * A, p: [0, 0, .5, 0], layer: 0, seed, wobble: .1});
    const n = g > 0 ? 4 : 6;
    for (let j = 0; j < n; j++) {
      const an = hash(j * 5.1 + seed) * TAU, dist = j ? r * (.22 + .38 * hash(j * 2.3 + seed)) : 0, h = r * (j ? .6 + .3 * hash(j * 1.7 + seed) : 1.15) * grow, w = Math.max(.01, h * .25);
      const base = [t.x + Math.cos(an) * dist, 0, t.z + Math.sin(an) * dist]; at(base);
      const tilt = (hash(j + seed) - .5) * .7, u = screenDir(Math.PI / 2 + tilt);
      bb(COLUMN, addv(base, u, h / 2), h / 2, w, j % 2 ? P.frost : P.frostDeep, {rot: Math.PI / 2 + tilt, asp: h / 2 / w, alpha: A * (1 - smooth(.72, .95, p)), p: [.3, 0, 0, 0], seed: j, lift: .15});
    }
    if (p > .55) { const k = smooth(.55, 1, p); for (let j = 0; j < 8; j++) { const an = j * TAU / 8 + seed * 4, c = [t.x + Math.cos(an) * r * (.3 + k * .8), .25 + Math.sin(k * Math.PI) * .5, t.z + Math.sin(an) * r * (.3 + k * .8)]; at(c); aim(SHARD, c, [Math.cos(an), .5, Math.sin(an)], .16, .07, P.frost, {alpha: 1 - k, p: [.4, 1, 0, 0], seed: j, lift: .2}); } }
  }
  function frostBurst(t, time) { // a frozen enemy shattering into shards
    const p = clamp(t.age / t.life), r = t.r, A = 1 - smooth(.55, 1, p), q = 1 - (1 - p) ** 2, seed = hash(t.x + t.z * 5);
    disc(SNOW, t.x, t.z, .35 + q * .35, P.frost, {alpha: .6 * A, p: [.06, 0, 0, 0], layer: 2, seed});
    at([t.x, .45, t.z]); if (p < .3) bb(STAR, [t.x, .45, t.z], .35 + p, .35 + p, P.frost, {alpha: 1 - smooth(.1, .3, p), p: [4, 7, .12, 0], seed, lift: .4});
    for (let j = 0; j < 5; j++) { const an = j * TAU / 5 + seed * 3, c = [t.x + Math.cos(an) * r * (.1 + q * .6), .15 + Math.sin(p * Math.PI) * .45, t.z + Math.sin(an) * r * (.1 + q * .6)]; at(c); aim(SHARD, c, [Math.cos(an), .3, Math.sin(an)], .14, .06, j % 2 ? P.frost : P.frostDeep, {alpha: A, p: [.4, 1, 0, 0], seed: j, lift: .3}); }
  }
  // ---------------------------------------------------------------- Chain: painted lightning strokes and rune circles
  function bolt(a, b, wide, alpha, seed, rate = 24, branch = 1, lift = 0) {
    span(BOLT, a, b, wide * 3, P.chainBlue, {alpha: alpha * .55, p: [.5, .5, branch, rate], seed, lift, soft: .7});
    span(BOLT, a, b, wide * .6, P.chain, {alpha, p: [.5, .5, branch, rate], seed, lift, bias: .01});
  }
  function chainArc(t, time) { // Chain Spark: a jagged painted bolt hopping between foes
    const p = clamp(t.age / t.life), A = 1 - smooth(.55, 1, p), a = [t.x, .6, t.z], b = [t.tx, .6, t.tz], seed = hash(t.x * 3 + t.tz); if (Math.hypot(b[0] - a[0], b[2] - a[2]) < .05) return;
    at([(a[0] + b[0]) / 2, .6, (a[2] + b[2]) / 2]);
    const w = (t.r || .07) >= .06 ? .26 : .17; bolt(a, b, w, A, seed, 26, 1, .5);
    at(b); bb(STAR, b, .38, .38, P.chain, {alpha: A, p: [4, 8, .12, 0], seed, lift: .7});
    disc(RING, t.tx, t.tz, .38, P.chainBlue, {alpha: .7 * A, p: [.8, .1, .5, .05], layer: 2, seed, rag: .8});
  }
  function chainStrike(t, time) { // JUDGMENT BOLT: lightning from the sky onto the strongest foe
    const p = clamp(t.age / t.life), A = 1 - smooth(.55, 1, p), seed = hash(t.x + t.z * 9), top = [t.x + .25, 5.4, t.z - .35], bot = [t.x, .12, t.z];
    disc(RUNE, t.x, t.z, 1.1, P.chainBlue, {alpha: A, p: [6, t.age * 2, 0, 0], layer: 2, seed, rag: .3});
    disc(BURST, t.x, t.z, .8, P.chain, {alpha: .85 * A, p: [9, 2.5, .3, 0], layer: 3, seed});
    at([t.x, 1.5, t.z]); bolt(top, bot, .36, A, seed, 30, 1, .5);
    at(bot); bb(BURST, [t.x, .42, t.z], .7 + p * .6, .7 + p * .6, P.chain, {alpha: A, p: [10, 3, .35, 0], seed, lift: .7});
    for (let j = 0; j < 5; j++) { const an = j * TAU / 5 + seed * 5, k = clamp(p * 1.4), c = [t.x + Math.cos(an) * (.3 + k * .6), .3 + Math.sin(k * Math.PI) * .4, t.z + Math.sin(an) * (.3 + k * .6)]; at(c); aim(SHARD, c, [Math.cos(an), .2, Math.sin(an)], .12, .05, P.chainBlue, {alpha: A * (1 - k * .5), p: [.4, 1, 0, 0], seed: j, lift: .4}); }
  }
  function chainNetwork(t, time) { // LIGHTNING NETWORK: the caster becomes the first node
    const p = clamp(t.age / t.life), A = smooth(0, .08, p) * (1 - smooth(.8, 1, p)), seed = hash(t.x * 2 + t.z);
    disc(RUNE, t.x, t.z, 1.3, P.chainBlue, {alpha: .75 * A, p: [8, -t.age * 1.5, 0, 0], layer: 2, seed, rag: .3});
    for (let j = 0; j < 4; j++) { const an = t.age * 3 + j * TAU / 4, c = [t.x + Math.cos(an) * 1.15, .35 + .1 * Math.sin(t.age * 7 + j), t.z + Math.sin(an) * 1.15]; at(c); bb(STAR, c, .17, .17, P.chain, {alpha: A * (.6 + .4 * Math.sin(time * 20 + j)), p: [4, 8, .12, 0], seed: j, lift: .2}); }
  }
  function chainTesla(t, time) { // TESLA DOMAIN: a crackling rune field around the slime
    const p = clamp(t.age / t.life), r = t.r, A = smooth(0, .1, p) * (1 - smooth(.85, 1, p)), seed = hash(t.x + t.z);
    disc(BLOB, t.x, t.z, r, P.chain, {alpha: .18 * A, p: [0, 0, .6, 0], layer: 0, seed});
    disc(RUNE, t.x, t.z, r, P.chainBlue, {alpha: .85 * A, p: [8, t.age * .8, 0, 0], layer: 1, seed, rag: .3});
    const key = Math.floor(time * 12);
    for (let j = 0; j < 4; j++) {
      const a0 = hash(key * 3.1 + j * 1.7) * TAU, a1 = a0 + .45 + hash(key + j) * .4, rr = r * .95;
      const a = [t.x + Math.cos(a0) * rr, .25, t.z + Math.sin(a0) * rr], b = [t.x + Math.cos(a1) * rr, .35, t.z + Math.sin(a1) * rr]; at(a);
      bolt(a, b, .15, A * .95, key + j, 30, 0, .2);
    }
    for (let j = 0; j < 2; j++) { const an = hash(key * 1.3 + j * 5) * TAU, b = [t.x + Math.cos(an) * r * .9, .3, t.z + Math.sin(an) * r * .9]; at(b); bolt([t.x, .5, t.z], b, .13, A * .8, key * 2 + j, 30, 0, .2); }
    for (let j = 0; j < 5; j++) { const an = t.age * 2 + j * TAU / 5, c = [t.x + Math.cos(an) * r * .7, .38 + .15 * Math.sin(t.age * 5 + j), t.z + Math.sin(an) * r * .7]; at(c); bb(STAR, c, .13, .13, P.chain, {alpha: A * (.5 + .5 * Math.sin(time * 18 + j * 2)), p: [4, 8, .12, 0], seed: j, lift: .2}); }
  }
  function chainRing(t, time) { // stun crackle
    const p = clamp(t.age / t.life), A = 1 - smooth(.5, 1, p), seed = hash(t.x * 4 + t.z), R = (t.r || 1) * (.6 + .4 * smooth(0, .4, p));
    disc(RING, t.x, t.z, R, P.chainBlue, {alpha: .9 * A, p: [.85, .07, .5, .06], layer: 2, seed, rag: .8});
    for (let j = 0; j < 3; j++) { const an = j * TAU / 3 + seed * 6, c = [t.x + Math.cos(an) * R * .8, .35, t.z + Math.sin(an) * R * .8]; at(c); bb(STAR, c, .18, .18, P.chain, {alpha: A, p: [4, 8, .12, 0], seed: j, lift: .3}); }
  }
  // ---------------------------------------------------------------- Orbit: glossy water cores with little slime faces, as on the card
  function orbitOrbs(combat, world, time, visible) {
    const style = combat.skills?.orbit?.evo || '';
    for (const o of combat.orbs || []) {
      if (!Number.isFinite(o.x + o.z + o.r) || !visible(o.x, o.z, o.r + 1)) continue; note('orbit:orb');
      const big = style === 'power', R = big ? o.r * 1.15 : Math.max(.24, o.r * 1.5), y = (big ? .7 : .55) + .06 * Math.sin(time * 5.4 + (o.angle || 0)), c = [o.x, y, o.z], prev = orbTrails.get(o);
      orbTrails.set(o, {x: o.x, z: o.z, t: time});
      let vx = 0, vz = 0; if (prev && time > prev.t && time - prev.t < .25) { vx = (o.x - prev.x) / (time - prev.t); vz = (o.z - prev.z) / (time - prev.t); }
      const sp = Math.hypot(vx, vz);
      shadow(o.x, o.z, R * .85, .22); at(c);
      if (sp > .4) { const d = [vx / sp, 0, vz / sp]; for (let j = 0; j < 3; j++) { const k = (j + 1) / 4, q = [c[0] - d[0] * R * (1.2 + j * .9), y - .03 * j, c[2] - d[2] * R * (1.2 + j * .9)]; trail(STREAK, q, [-d[0], 0, -d[2]], R * (.55 - j * .1), R * (.24 - j * .05), big ? P.orbitDeep : P.orbit, {alpha: .85 - k * .5, p: [1, 0, 0, 0], seed: j, shine: 1}); } }
      if (big) { // GRAVITY MACE: a heavy core wrapped in gravity rings
        bb(ARC, c, R * 1.6, R * .5, P.orbitDeep, {alpha: .9, p: [.9, Math.PI * .05 + time * .5, Math.PI * .9, .08], seed: 1, bias: -.02});
        bb(BLOB, c, R, R, P.orbitDeep, {p: [1, .24, 0, 0], seed: 2, shine: .5, wobble: .08});
        bb(ARC, c, R * 1.6, R * .5, P.orbit, {alpha: .95, p: [.9, Math.PI * 1.05 + time * .5, Math.PI * .9, .1], seed: 3, bias: .02});
        for (let j = 0; j < 3; j++) { const an = time * 3 + j * TAU / 3, q = addv(c, screenDir(an), R * 1.45); bb(BLOB, [q[0], q[1] * .7 + y * .3, q[2]], R * .16, R * .16, P.orbit, {p: [.8, .3, 0, 0], seed: j, bias: Math.sin(an) > 0 ? -.03 : .03}); }
      } else {
        bb(BLOB, c, R, R, P.orbit, {p: [1, .3, .25, 1], seed: o.angle || 0, bias: .01, shine: .4});
        const tw = .5 + .5 * Math.sin(time * 6 + (o.angle || 0) * 3);
        bb(STAR, [c[0] + R * .75, c[1] + R * .8, c[2]], R * .5 * tw + .03, R * .5 * tw + .03, P.sparkle, {alpha: .9 * tw, p: [4, 8, .12, 0], bias: .02});
      }
    }
  }
  function orbitArc(t, time) { // ARC HALO link between two cores
    const a = [t.x, .55, t.z], b = [t.tx, .55, t.tz], seed = hash(t.x + t.tz * 3); if (Math.hypot(b[0] - a[0], b[2] - a[2]) < .05) return;
    at([(a[0] + b[0]) / 2, .55, (a[2] + b[2]) / 2]);
    span(RIBBON, a, b, .36, P.orbit, {alpha: .45, p: [.55, 3, .1, .25], seed: seed + 2, soft: .8});
    for (const k of [0, 1]) span(RIBBON, a, b, .22, k ? P.foam : P.orbit, {alpha: .95, p: [.18, 3, .55, .22], seed: seed + k * 1.7, bias: .01 * (k + 1), shine: .5});
    for (let j = 0; j < 2; j++) { const u = (time * 1.5 + j * .5 + seed) % 1; bb(STAR, [mix(a[0], b[0], u), .6, mix(a[2], b[2], u)], .12, .12, P.sparkle, {alpha: Math.sin(u * Math.PI), p: [4, 8, .12, 0], bias: .02}); }
  }
  function orbitRing(t, time) {
    const p = clamp(t.age / t.life), R = (t.r || 1) * mix(.2, 1, smooth(0, .6, p)), A = 1 - smooth(.55, 1, p), seed = hash(t.x * 3 + t.z);
    disc(RING, t.x, t.z, R, P.orbit, {alpha: A, p: [.86, .08, .7, .03], layer: 2, seed, rag: .7});
    speckles(t.x, t.z, R * .95, 8, P.orbitDeep, A, seed, .2);
    for (let j = 0; j < 6; j++) { const an = j * TAU / 6 + seed * 5, c = [t.x + Math.cos(an) * R * .86, .32, t.z + Math.sin(an) * R * .86]; at(c); bb(STAR, c, .15, .15, P.sparkle, {alpha: A, p: [4, 8, .12, 0], seed: j}); }
  }
  // ---------------------------------------------------------------- Fire: layered painted flames, warm smoke, a painted sun, meteors, a fire twister
  // A living flame (FIRE field) whose round base sits on `base`, rising along the screen angle `rot` (PI/2 = straight up).
  function blaze(base, len, wid, rot, pal, o = {}) {
    const c = Math.cos(rot), s = Math.sin(rot), R = cam.r, Q = cam.u, k = len - .02 * wid;
    bb(FIRE, [base[0] + (R[0] * c + Q[0] * s) * k, base[1] + (R[1] * c + Q[1] * s) * k, base[2] + (R[2] * c + Q[2] * s) * k], len, wid, pal, {rot, asp: len / wid, p: [1.3, 1, 0, 0], ...o});
  }
  const screenAngle = v => Math.atan2(v[0] * cam.u[0] + v[1] * cam.u[1] + v[2] * cam.u[2], v[0] * cam.r[0] + v[1] * cam.r[1] + v[2] * cam.r[2]);
  const behind = (x, z, cx, cz) => (x - cx) * cam.f[0] + (z - cz) * cam.f[2] < 0;
  function fireball(t, time) { // Inferno shot: a living flame that leans back as it flies, dropping little flames and sparks
    const dx = t.vx ?? (t.tx - t.x), dz = t.vz ?? (t.tz - t.z), n = Math.hypot(dx, dz) || 1, d = [dx / n, 0, dz / n], y = (t.y ?? .36) + .02, sd = hash(t.x * .7 + t.z * 1.3);
    const sx = d[0] * cam.r[0] + d[2] * cam.r[2], rot = Math.PI / 2 + clamp(sx, -1, 1) * .6, c = [t.x, y, t.z];
    at(c); shadow(t.x, t.z, .34, .26);
    for (let j = 0; j < 5; j++) { const k = (time * 3 + j / 5 + sd) % 1, q = [c[0] - d[0] * (.25 + k * .8) + Math.sin(j * 2.3) * .08, y + .2 + k * .4, c[2] - d[2] * (.25 + k * .8)], s = .05 * (1 - k); bb(BLOB, q, s, s, j % 2 ? P.fire : P.flame, {alpha: 1 - k, p: [.5, 0, 0, 0], seed: j, lift: .2}); }
    for (let j = 0; j < 2; j++) { const k = (time * 2.2 + j * .5 + sd) % 1, q = [c[0] - d[0] * (.3 + k * .7), y + .05 + k * .15, c[2] - d[2] * (.3 + k * .7)], s = 1 - k; blaze(q, .26 * s + .04, .16 * s + .03, Math.PI / 2, P.fire, {alpha: s, p: [1.7, 1, 0, 0], seed: j + sd, lift: .15}); }
    blaze(c, .6, .36, rot, P.fire, {p: [1.5, 1, 0, 0], seed: sd, lift: .2});
  }
  function fireEmber(t, time) {
    const dx = t.vx ?? 0, dz = t.vz ?? 1, n = Math.hypot(dx, dz) || 1, c = [t.x, (t.y ?? .16) + .04, t.z], fade = Math.min(1, (t.life ?? 1) * 3), sd = hash(t.x * 3 + t.z); at(c);
    blaze(c, .26, .16, screenAngle([-dx / n, .6, -dz / n]), P.fire, {alpha: fade, p: [1.8, .8, 0, 0], seed: sd});
  }
  function flameRing(x, z, r, size, fade, time, seed, count = 6, lean = .5) { // living flames standing round a burst; the far ones are drawn first
    for (let j = 0; j < count; j++) {
      const an = j * TAU / count + seed * 6, base = [x + Math.cos(an) * r, .03, z + Math.sin(an) * r], sx = Math.cos(an) * cam.r[0] + Math.sin(an) * cam.r[2];
      const len = size * (.8 + .4 * hash(j + seed)); at(base);
      blaze(base, len, len * .62, Math.PI / 2 - sx * lean, P.fire, {alpha: fade, p: [1.3, 1, 0, 0], seed: j + seed, lift: .2});
    }
  }
  function smokeRise(x, z, r, k, time, seed, n = 4, alpha = .8) {
    if (k <= 0 || k >= 1) return;
    for (let j = 0; j < n; j++) {
      const an = j * TAU / n + seed * 6, c = [x + Math.cos(an) * r * .35 * (1 + k), .9 + k * r * 1.3 + (j % 2) * .15, z + Math.sin(an) * r * .35 * (1 + k)], s = r * (.32 + .32 * k); at(c);
      bb(SMOKE, c, s, s * .8, P.smoke, {alpha: smooth(0, .12, k) * (1 - smooth(.6, 1, k)) * alpha, p: [.5, 0, 0, 0], seed: j + seed, dissolve: smooth(.55, 1, k), soft: .45, lift: .2});
    }
  }
  function fireBurst(x, z, r, p, time, seed, big = 1) { // the heart of an explosion: a ball of licking fire and the flames around it
    const g = smooth(0, .14, p) * (1 - smooth(.3, .62, p) * .75), f = 1 - smooth(.45, .62, p), sz = r * g;
    if (f <= 0) return;
    const ring = r * .5 * g, n = big > 1 ? 8 : 6;
    for (const far of [true, false]) {
      for (let j = 0; j < n; j++) {
        const an = j * TAU / n + seed * 6, bx = x + Math.cos(an) * ring, bz = z + Math.sin(an) * ring; if (behind(bx, bz, x, z) !== far) continue;
        const sx = Math.cos(an) * cam.r[0] + Math.sin(an) * cam.r[2], len = r * .62 * big * (.8 + .4 * hash(j + seed)) * g, base = [bx, .03, bz]; at(base);
        blaze(base, len, len * .62, Math.PI / 2 - sx * .5, P.fire, {alpha: f, p: [1.3, 1, 0, 0], seed: j + seed, lift: .25, dissolve: smooth(.5, .62, p) * .8});
      }
      if (far) { const c = [x, .12 + .42 * sz, z]; at(c); bb(FIREBALL, c, sz * .9, sz * .85, P.fire, {alpha: f, p: [1.3, 1, 0, 0], seed, lift: .3, bias: .01, dissolve: smooth(.45, .62, p) * .8}); blaze([x, .04, z], r * .95 * big * g, r * .6 * big * g, Math.PI / 2, P.fire, {alpha: f, p: [1.2, 1, 0, 0], seed: seed + 9, lift: .32, bias: .02, dissolve: smooth(.5, .62, p) * .8}); }
    }
  }
  function fireBlast(e, time) { // Inferno burst: a ball of licking fire, a ring of living flames, then warm smoke
    const D = cfg.blast, p = clamp(e.age / D), r = e.r || 1, seed = hash(e.x * .9 + e.z * 1.7);
    disc(LIQUID, e.x, e.z, r * 1.05, P.scorch, {alpha: .6 * (1 - smooth(.62, 1, p)) * smooth(0, .1, p), p: [.6, 2, 0, 0], layer: 0, seed, dissolve: smooth(.7, 1, p)});
    disc(LIQUID, e.x, e.z, r * .9, P.flame, {alpha: .5 * (1 - smooth(.2, .55, p)), p: [.7, 2.4, 0, 0], layer: 1, seed: seed + 1, soft: .8});
    fireBurst(e.x, e.z, r, p, time, seed);
    smokeRise(e.x, e.z, r, clamp((p - .32) / .68), time, seed);
    for (let j = 0; j < 8; j++) { const an = j * TAU / 8 + seed * 3, k = clamp(p / .5), c = [e.x + Math.cos(an) * r * (.2 + k * 1.1), .2 + Math.sin(k * Math.PI) * .6 * r, e.z + Math.sin(an) * r * (.2 + k * 1.1)]; at(c); bb(BLOB, c, .06, .06, P.fire, {alpha: 1 - k, p: [.5, 0, 0, 0], seed: j, lift: .2}); }
  }
  function firePatch(t, time, i) { // burning ground: a scorched, glowing stain with low flames licking up
    const r = t.r || .8, fade = clamp((t.life ?? 1) * 2) * smooth(0, .15, t.age ?? 1), seed = hash(t.x * 1.3 + t.z * .7 + i);
    disc(LIQUID, t.x, t.z, r, P.scorch, {alpha: .55 * fade, p: [.6, 2, 0, 0], layer: 0, seed});
    disc(LIQUID, t.x, t.z, r * .8, P.flame, {alpha: .42 * fade * (.85 + .15 * Math.sin(time * 7 + i)), p: [.7, 2.4, 0, 0], layer: 1, seed: seed + 1, soft: .8});
    for (let j = 0; j < 3; j++) {
      const an = hash(i * 7 + j + seed) * TAU, dd = r * (.1 + .5 * hash(i * 3 + j * 5 + seed)), base = [t.x + Math.cos(an) * dd, .03, t.z + Math.sin(an) * dd]; at(base);
      blaze(base, r * (.42 + .14 * hash(j + seed)), r * .3, Math.PI / 2, P.fire, {alpha: fade, p: [1.3, 1, 0, 0], seed: j + seed, lift: .15});
    }
  }
  function burning(e, time) { // a small living flame on a burning foe
    const fade = Math.min(.95, (e.burnTime || 0) / .3), rad = (e.radius || .5) * .45, id = e.id || 0;
    for (let j = 0; j < 2; j++) { const an = time * .9 + j * Math.PI + id, base = [e.x + Math.cos(an) * rad, .15 + j * .15, e.z + Math.sin(an) * rad * .5]; at(base); blaze(base, .4 - j * .1, .26 - j * .06, Math.PI / 2, P.fire, {alpha: fade, p: [1.6, 1, 0, 0], seed: id + j * 2.3, lift: .5}); }
  }
  function paintedSun(c, sz, time, alpha) { // a sun of fire: a licking fireball wearing a crown of small living flames
    for (let j = 0; j < 7; j++) { const an = j * TAU / 7 + time * .5, base = addv(c, screenDir(an), sz * .38); blaze(base, sz * .44, sz * .36, an, P.fire, {alpha, p: [1.5, .9, 0, 0], seed: j, bias: -.01}); }
    bb(FIREBALL, c, sz * .66, sz * .66, P.fire, {alpha, p: [1, .7, 0, 0], seed: 7, bias: .01});
  }
  function sunFall(e, time) { // SUNFALL CORE: a sun of fire gathers, falls and bursts
    const k = clamp(e.age / e.delay), R = e.s?.radius || 1.2, y = mix(4.2, 1, k * k), sz = mix(.6, 1, k) * R * .95;
    disc(RING, e.x, e.z, R * 1.1, P.flame, {alpha: .3 + .6 * k, p: [.88, .05, .8, .03], layer: 1, seed: 1, rag: .7});
    disc(LIQUID, e.x, e.z, R * .95, P.fire, {alpha: .35 * k, p: [.6, 2.2, 0, 0], layer: 0, seed: 2, soft: .9});
    shadow(e.x, e.z, sz * .7, .28 * k);
    const c = [e.x, y, e.z]; at(c); paintedSun(c, sz, time, 1);
  }
  function sunBurst(e, time) {
    const burst = cfg.sunBurst, total = burst + cfg.sunSmoke, t = e.age, R = e.r || 1.2, p = clamp(t / burst), seed = hash(e.x + e.z * 3);
    disc(LIQUID, e.x, e.z, R * 1.15, P.scorch, {alpha: .65 * (1 - smooth(total * .7, total, t)), p: [.6, 2, 0, 0], layer: 0, seed, dissolve: smooth(total * .75, total, t)});
    disc(LIQUID, e.x, e.z, R * 1.05, P.flame, {alpha: .5 * (1 - smooth(.3, .8, p)), p: [.7, 2.4, 0, 0], layer: 1, seed: seed + 1, soft: .8});
    disc(RING, e.x, e.z, R * mix(.3, 1.35, smooth(0, .5, p)), P.flame, {alpha: 1 - smooth(.3, 1, p), p: [.88, .06, .7, .04], layer: 2, seed, rag: .8});
    if (t < burst) fireBurst(e.x, e.z, R * 1.05, p * .92, time, seed, 1.25);
    smokeRise(e.x, e.z, R * .85, clamp((t - burst * .55) / (total - burst * .55)), time, seed, 5);
  }
  function meteorFall(e, time) { // METEOR SHOWER: burning rocks streak in diagonally
    const fl = e.flight ?? .55, st = e.delay - fl; if (e.age < st || e.age >= e.delay) return;
    const a = clamp((e.age - st) / fl), o = 1 - (.35 * a + .65 * a * a), f = cam.f, s = Math.hypot(f[0], f[2]) || 1, side = [f[2] / s, 0, -f[0] / s], R = e.s?.radius || .8;
    const pos = [e.x + side[0] * 4.6 * o, .04 + 7 * o, e.z + side[2] * 4.6 * o], back = [side[0] * 4.6, 7, side[2] * 4.6], seed = hash(e.x * 2 + e.z);
    disc(RING, e.x, e.z, R * .9, P.flame, {alpha: .25 + .55 * a, p: [.85, .05, .7, .03], layer: 1, seed, rag: .7}); shadow(e.x, e.z, R * .5 * (.4 + .6 * a), .3 * a);
    at(pos);
    for (let j = 0; j < 3; j++) { const k = (time * 2.5 + j / 3) % 1, c = addv(pos, back, (.05 + k * .1)); bb(SMOKE, c, .26 + k * .3, .21 + k * .24, P.smoke, {alpha: (1 - k) * .75, p: [.6, 0, 0, 0], seed: j, dissolve: smooth(.5, 1, k), soft: .4}); }
    blaze(pos, R * 1.25, R * .62, screenAngle(back), P.fire, {p: [1.8, 1.1, 0, 0], seed, bias: .01});
    bb(BLOB, pos, R * .24, R * .24, P.ember, {p: [1, .2, 0, 0], seed, bias: .03, wobble: .14});
  }
  function meteorImpact(e, time) {
    const D = cfg.meteorImpact, p = clamp(e.age / D), R = e.r || .8, seed = hash(e.x * 3 + e.z * 2);
    disc(LIQUID, e.x, e.z, R * 1.05, P.scorch, {alpha: .62 * (1 - smooth(1.5, 2.3, e.age)), p: [.65, 2, 0, 0], layer: 0, seed, dissolve: smooth(1.6, 2.3, e.age)});
    disc(RING, e.x, e.z, R * mix(.3, 1.25, smooth(0, .4, p)), P.flame, {alpha: 1 - smooth(.2, .6, p), p: [.86, .08, .6, .04], layer: 1, seed, rag: .7});
    fireBurst(e.x, e.z, R, p, time, seed);
    smokeRise(e.x, e.z, R, clamp((e.age - .2) / 1.8), time, seed, 3);
  }
  function cyclone(e, time) { // FLAME CYCLONE: living flames whirl in a rising spiral round a swirl of heat
    const A = smooth(0, cfg.cycloneRise, e.age) * clamp((e.life ?? 1) / cfg.cycloneFade), r = e.r, seed = hash(e.x * .1 + (e.id || 0)), H = r * 1.8;
    disc(SPIRAL, e.x, e.z, r * 1.05, P.scorch, {alpha: .6 * A, p: [1.5, 3, -e.age * 3, .42], layer: 0, seed, rag: .5});
    disc(LIQUID, e.x, e.z, r * .9, P.flame, {alpha: .4 * A, p: [.7, 2.4, 0, 0], layer: 1, seed: seed + 1, soft: .8});
    const mid = [e.x, H * .5, e.z]; at(mid);
    bb(TWISTER, [e.x, H * .5 + .1, e.z], H * .55, r * .8, P.flame, {rot: Math.PI / 2, alpha: .38 * A, p: [1, 0, 0, 0], seed, soft: .7, bias: -.05});
    const n = 11;
    for (let j = 0; j < n; j++) {
      const f = j / (n - 1), an = e.age * 4.2 + j * 2.4, rad = r * (.28 + .6 * f), h = .02 + f * H * .82, base = [e.x + Math.cos(an) * rad, h, e.z + Math.sin(an) * rad];
      const tangent = [-Math.sin(an), 0, Math.cos(an)], lean = clamp(tangent[0] * cam.r[0] + tangent[2] * cam.r[2], -1, 1), size = r * (.62 - .3 * f); at(base);
      blaze(base, size, size * .62, Math.PI / 2 + lean * .55, P.fire, {alpha: A * (1 - smooth(.85, 1, f) * .5), p: [1.5, 1, 0, 0], seed: j + seed, lift: .1});
    }
    for (let j = 0; j < 8; j++) { const k = (e.age * .9 + j / 8) % 1, an = e.age * 6 + j * 2.4, c = [e.x + Math.cos(an) * r * (.3 + .6 * k), .2 + k * H, e.z + Math.sin(an) * r * (.3 + .6 * k)]; at(c); bb(BLOB, c, .06, .06, P.fire, {alpha: A * (1 - k), p: [.5, 0, 0, 0], seed: j}); }
    const top = [e.x, H + .35, e.z]; at(top); bb(SMOKE, top, r * .85, r * .55, P.smoke, {alpha: .6 * A, p: [.6, 0, 0, 0], seed, soft: .45});
  }
  function fire(combat, world, time, visible, hideEnemies) {
    for (const t of combat.projectiles || []) { if (!Number.isFinite(t.x + t.z) || !visible(t.x, t.z, 2)) continue; note(t.ember ? 'fire:ember' : 'fire:fireball'); t.ember ? fireEmber(t, time) : fireball(t, time); }
    for (const e of combat.events || []) { if (!visible(e.x, e.z, 8)) continue; if (e.type === 'sun') { note('fire:sunfall'); sunFall(e, time); } else if (e.type === 'meteor' && e.age >= e.delay - (e.flight ?? .55)) { note('fire:meteor'); meteorFall(e, time); } }
    for (const e of combat.fx || []) {
      if (!visible(e.x, e.z, (e.r || 1) * 4)) continue;
      if (e.type === 'blast') { note('fire:blast'); fireBlast(e, time); } else if (e.type === 'sun') { note('fire:sunburst'); sunBurst(e, time); } else if (e.type === 'meteor') { note('fire:impact'); meteorImpact(e, time); }
    }
    (combat.patches || []).forEach((t, i) => { if (!visible(t.x, t.z, (t.r || 1) + 1)) return; note('fire:patch'); firePatch(t, time, i); });
    for (const e of combat.cyclones || []) { if (!visible(e.x, e.z, e.r * 4)) continue; note('fire:cyclone'); cyclone(e, time); }
    if (!hideEnemies) for (const e of world.enemies || []) { if (!(e.hp > 0 && e.burnTime > 0) || !visible(e.x, e.z, 1)) continue; note('fire:burning'); burning(e, time); }
  }
  function statuses(world, time, visible) { // painted poison and frost markers on enemies
    for (const e of world.enemies || []) {
      if (!(e.hp > 0) || !visible(e.x, e.z, 1)) continue;
      const rad = e.radius || .5;
      if (e.poisonTime > 0) {
        note('status:poison'); disc(RING, e.x, e.z, rad * 1.05, P.toxinDeep, {alpha: .55, p: [.85, .07, .5, .05], layer: 2, seed: e.id || 0});
        for (let j = 0; j < 2; j++) { const k = (time * .9 + j * .5 + hash(e.id || 0)) % 1, c = [e.x + (j - .5) * rad * .8, .35 + k * .7, e.z]; at(c); bb(BLOB, c, .06 + .02 * j, .06 + .02 * j, P.toxin, {alpha: (1 - smooth(.7, 1, k)) * smooth(0, .15, k), p: [.7, .4, .55, 0], lift: .5, seed: j}); }
      }
      if (e.chill > 0 || e.frozen > 0) {
        note('status:frost'); const fr = e.frozen > 0;
        if (fr) disc(SNOW, e.x, e.z, rad * 1.2, P.frost, {alpha: .6, p: [.06, 0, 0, 0], layer: 2, seed: e.id || 0});
        for (let j = 0; j < 3; j++) { const an = j * 2.094 + (e.id || 0), base = [e.x + Math.cos(an) * rad, 0, e.z + Math.sin(an) * rad * .6], h = fr ? .4 : .22, w = h * .3; at(base); bb(COLUMN, addv(base, cam.u, h / 2), h / 2, w, j % 2 ? P.frost : P.frostDeep, {rot: Math.PI / 2 + (j - 1) * .35, asp: h / 2 / w, p: [.3, 0, 0, 0], lift: .2, seed: j}); }
      }
    }
  }

  function plan(combat, world = {}, time = 0, visible = () => true, opt = {}) {
    items = []; seq = 0; diagnostics.kinds = {}; diagnostics.invalid = 0;
    if (opt.vp) setCamera(opt.vp);
    cfg = {blast: opt.blast ?? 1.65, sunBurst: opt.sunBurst ?? .72, sunSmoke: opt.sunSmoke ?? 1.18, meteorImpact: opt.meteorImpact ?? 1.1, cycloneRise: Math.max(.01, opt.cycloneRise ?? .18), cycloneFade: Math.max(.01, opt.cycloneFade ?? .75)};
    waterImpacts(combat, time, visible);
    for (const t of combat.abilities || []) {
      if (t.delay > 0 || t.life <= 0 || t.age >= t.life || t.family === 'fire') continue;
      if (!Number.isFinite(t.x + t.z + t.age + t.life)) { diagnostics.invalid++; continue; }
      let x = t.x, z = t.z; const r = Math.max(t.r || 1, t.length || 0);
      if (t.kind === 'lob' || (t.family === 'toxin' && t.kind === 'arc')) { x = mix(t.x, t.tx, clamp(t.age / t.life)); z = mix(t.z, t.tz, clamp(t.age / t.life)); }
      if (!visible(x, z, r + 1.5)) continue;
      const k = t.family + ':' + t.kind; note(k);
      switch (k) {
        case 'water:bolt': waterBolt(t, time); break; case 'water:beam': waterBeam(t, time); break;
        case 'water:jet': waterJet(t, time); break; case 'water:wave': waterWave(t, time); break;
        case 'tide:ring': tideRing(t, time); break; case 'tide:dome': tideDome(t, time); break;
        case 'tide:vacuum': tideVacuum(t, time); break; case 'tide:resonance': tideResonance(t, time); break;
        case 'toxin:lob': toxinLob(t, time); break; case 'toxin:pool': toxinPool(t, time); break;
        case 'toxin:infection': toxinInfection(t, time); break; case 'toxin:burst': toxinBurst(t, time); break;
        case 'toxin:bloom': toxinBloom(t, time); break; case 'toxin:arc': toxinArc(t, time); break;
        case 'toxin:miasma': toxinMiasma(t, time); break;
        case 'frost:crystal': frostCrystal(t, time); break; case 'frost:borer': frostBorer(t, time); break;
        case 'frost:cone': frostCone(t, time); break; case 'frost:chainburst': frostCluster(t, time); break;
        case 'frost:burst': frostBurst(t, time); break;
        case 'chain:arc': chainArc(t, time); break; case 'chain:strike': chainStrike(t, time); break;
        case 'chain:network': chainNetwork(t, time); break; case 'chain:tesla': chainTesla(t, time); break;
        case 'chain:ring': chainRing(t, time); break;
        case 'orbit:arc': orbitArc(t, time); break; case 'orbit:ring': orbitRing(t, time); break;
        default: diagnostics.kinds[k]--; if (!diagnostics.kinds[k]) delete diagnostics.kinds[k];
      }
    }
    orbitOrbs(combat, world, time, visible);
    fire(combat, world, time, visible, !!opt.hideEnemies);
    if (!opt.hideEnemies) statuses(world, time, visible);
    diagnostics.instances = items.length;
    return items;
  }

  const VERTEX = `#version 300 es
precision highp float;
layout(location=0)in vec2 aCorner;layout(location=1)in vec4 iC;layout(location=2)in vec4 iU;layout(location=3)in vec4 iV;layout(location=4)in vec4 iP;
layout(location=5)in vec4 iL;layout(location=6)in vec4 iM;layout(location=7)in vec4 iD;layout(location=8)in vec4 iE;
uniform mat4 uVP;out vec2 vQ;flat out vec4 vA,vP,vL,vM,vD,vE;
void main(){vQ=aCorner;vA=vec4(iC.w,iU.w,iV.w,0.);vP=iP;vL=iL;vM=iM;vD=iD;vE=iE;gl_Position=uVP*vec4(iC.xyz+iU.xyz*aCorner.x+iV.xyz*aCorner.y,1.);}`;
  const FRAGMENT = `#version 300 es
precision highp float;
in vec2 vQ;flat in vec4 vA,vP,vL,vM,vD,vE;uniform float uTime,uDpr;out vec4 oC;
float h21(vec2 p){p=fract(p*vec2(233.34,851.73));p+=dot(p,p+23.45);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return vn(p)*.5+vn(p*2.07+17.3)*.3+vn(p*4.13+5.1)*.2;}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float cro(vec2 a,vec2 b){return a.x*b.y-a.y*b.x;}
float capsule(vec2 p,vec2 pa,vec2 pb,float ra,float rb){p-=pa;pb-=pa;float h=dot(pb,pb);vec2 q=vec2(dot(p,vec2(pb.y,-pb.x)),dot(p,pb))/h;q.x=abs(q.x);float b=ra-rb;vec2 c=vec2(sqrt(max(h-b*b,1e-6)),b);float k=cro(c,q),m=dot(c,q),n=dot(q,q);if(k<0.)return sqrt(h*n)-ra;if(k>c.x)return sqrt(h*(n+1.-2.*q.y))-rb;return m-ra;}
float edge(vec2 p,vec2 a,vec2 b){vec2 e=b-a;return dot(p-a,normalize(vec2(e.y,-e.x)));}
void main(){
 int k=int(vA.x+.5);float seed=vA.y,asp=max(vE.x,.001),T=uTime+seed*7.31;
 vec2 q=vec2(vQ.x*asp,vQ.y);
 float wob=vD.w>0.?vD.w:(k>=23?0.:.035);if(wob>0.)q+=(vec2(vn(q*1.5+seed*7.1+T*.35),vn(q*1.5+seed*3.7+11.-T*.3))-.5)*2.*wob;
 vec4 P=vP;float d=1.,tone=.5,hd=9.,fill=1.,ink=9.;
 float r=length(q),an=atan(q.y,q.x+1e-7);vec2 dir=q/max(r,1e-4);
 if(k==0){ // droplet / orb / bubble: cel-shaded sphere
  d=r-.92;vec3 n=vec3(q/.92,sqrt(max(0.,1.-r*r/.8464)));
  tone=mix(.6,.06+.94*clamp(dot(n,normalize(vec3(-.42,.62,.66))),0.,1.),P.x);
  if(P.y>0.)hd=length((q-vec2(-.34,.36))/vec2(1.25,.8))-P.y;
  fill=mix(1.,.2+.8*smoothstep(.42,.92,r),P.z);
  if(P.w>0.){vec2 e=vec2(abs(q.x)-.24,q.y+.02);ink=min(length(e/vec2(.8,1.25))-.075,max(abs(length(q-vec2(0.,.02))-.2)-.035,q.y+.1));}
 }else if(k==1){ // brush ring (dry-brush breaks with vE.z)
  float rr=P.x+(vn(dir*2.+seed*3.+T*.3)-.5)*P.w;
  float gap=smoothstep(.3,.12,vn(dir*3.2+seed*5.))*vE.z;
  d=abs(r-rr)-P.y*(1.-gap*.85);
  tone=.5+.2*dot(dir,vec2(-.6,.8))+(fbm(dir*2.6+vec2(r*5.,-r*3.)+seed)-.5)*.95;
  fill=mix(1.,smoothstep(rr-P.y,rr+P.y*.3,r),P.z);
 }else if(k==2){ // painted flame: round bulb and wavy tongues (tip at +x); P.y=0 gives a clean teardrop
  float t=T*P.x,u=clamp((q.x+asp)/(2.*asp),0.,1.);
  vec2 p=q;p.y-=(sin(u*4.-t*1.6)*.14+P.z)*u*u*1.2;
  vec2 c0=vec2(-asp+.9,0.);float w1=sin(t*1.3+seed*4.)*.16,w2=sin(t*1.7+seed*2.)*.14,w3=sin(t*1.1+seed*6.)*.14;
  d=capsule(p,c0,vec2(asp,w1),.9,.03);
  if(P.y>0.){d=smin(d,capsule(p,c0+vec2(.3,.25),vec2(mix(-asp,asp,.62)+w2*.5,.72+w2),.5,.03),.22*P.y);
   d=smin(d,capsule(p,c0+vec2(.3,-.25),vec2(mix(-asp,asp,.5)+w3*.5,-.7+w3),.46,.03),.22*P.y);}
  tone=clamp(-d*1.55+.08-u*.18+P.w*.25+(fbm(vec2(p.x*.7-t*.25,p.y*2.)+seed)-.5)*.3,0.,1.);
 }else if(k==3){ // sparkle star
  float f=pow(abs(cos((an+seed)*P.x*.5)),P.y);
  d=(r-mix(P.z,.95,f))*.8;tone=1.-r*.7;
 }else if(k==4){ // faceted shard (kite), tip at +x
  float xw=mix(-asp,asp,P.x);vec2 v0=vec2(asp,0.),v1=vec2(xw,.95),v2=vec2(-asp,0.),v3=vec2(xw,-.95);
  d=max(max(edge(q,v0,v1),edge(q,v1,v2)),max(edge(q,v2,v3),edge(q,v3,v0)));
  tone=q.y>0.?(q.x>xw?.78:.95):(q.x>xw?.3:.55);
  hd=seg(q,vec2(xw-.1*asp,.45),vec2(asp*.5,.16))-.07;
 }else if(k==5){ // teardrop streak, round head at +x
  vec2 p=q;p.y+=sin(q.x*P.z-T*10.)*P.y*clamp((asp-q.x)/(2.*asp),0.,1.);
  d=capsule(p,vec2(asp-.92,0.),vec2(-asp+.03,0.),.9,.03);
  tone=clamp(.45+p.y*.38+(fbm(vec2(p.x*.45,p.y*1.8)+seed)-.5)*.75,0.,1.);
  if(P.x>0.)hd=seg(p,vec2(-asp*.3,.36),vec2(asp-1.15,.44))-.11*P.x;
 }else if(k==6){ // liquid splat with satellite drops: concentric washes like the card puddle
  d=r-.72*(1.+P.x*(sin(an*P.y+seed*5.)*.55+(vn(dir*1.6+seed*9.)-.5)*.9));
  for(int i=0;i<7;i++){if(float(i)>=P.z)break;float fi=float(i),a=seed*10.+fi*2.39996,rr=.8+.14*h21(vec2(seed,fi));d=min(d,length(q-vec2(cos(a),sin(a))*rr)-(.045+.07*h21(vec2(fi,seed+1.))));}
  tone=clamp(.2-d*2.4+(fbm(q*1.8+seed)-.5)*.55,0.,1.);
 }else if(k==7){ // cloud / smoke puff
  float t=P.x;
  float d0=length(q-vec2(-.46,-.16)+.035*vec2(sin(t+seed),cos(t*1.3)))-.4,d1=length(q-vec2(.02,.17)+.035*vec2(cos(t*1.1),sin(t+seed)))-.52;
  float d2=length(q-vec2(.47,-.12)+.03*vec2(sin(t*.9),0.))-.39,d3=length(q-vec2(-.17,-.38))-.34,d4=length(q-vec2(.25,-.4))-.34;
  d=smin(smin(smin(d0,d1,.14),smin(d2,d3,.14),.14),d4,.14);
  tone=clamp(.5+q.y*.62-q.x*.14+(fbm(q*2.6+seed)-.5)*.32,0.,1.);
 }else if(k==8){ // crescent
  float dc=length(q-P.xy)-P.z;d=max(r-.92,-dc);tone=clamp(1.-dc*2.2,0.,1.);
 }else if(k==9){ // whirlpool spiral
  float ph=an*P.y/6.28318+log(r+.03)*P.x+P.z,band=abs(fract(ph)-.5)*2.,w=P.w*(.35+.65*smoothstep(0.,.8,r));
  d=max((band-w)*max(r,.08)*3.14159/P.y,r-.92);tone=.2+.6*r+(1.-band)*.2+(fbm(dir*2.+r*4.+seed)-.5)*.5;
 }else if(k==10){ // snowflake
  float a=mod(an+.5236,1.0472)-.5236;vec2 p=vec2(cos(a),abs(sin(a)))*r;float w=P.x;
  d=min(min(seg(p,vec2(0),vec2(.9,0))-w,seg(p,vec2(.42,0),vec2(.63,.21))-w*.8),min(seg(p,vec2(.66,0),vec2(.8,.13))-w*.7,r-.2));
  tone=.92-r*.42;
 }else if(k==11){ // lightning stroke along x
  float key=floor(T*P.w),n=6.,sx=2.*asp/n,fi=clamp(floor((q.x+asp)/sx),0.,n-1.),cl=1e3;
  for(int j=-1;j<=1;j++){float i=fi+float(j);if(i<0.||i>n-1.)continue;
   vec2 a=vec2(-asp+i*sx,i<.5?0.:(h21(vec2(i,key+seed))-.5)*2.*P.y*asp*.35);
   vec2 b=vec2(-asp+(i+1.)*sx,i>n-1.5?0.:(h21(vec2(i+1.,key+seed))-.5)*2.*P.y*asp*.35);
   cl=min(cl,seg(q,a,b));}
  float w=P.x*(1.-.45*abs(q.x/asp));d=cl-w;
  if(P.z>0.){vec2 a=vec2(-asp+2.*sx,(h21(vec2(2.,key+seed))-.5)*2.*P.y*asp*.35);float sg=h21(vec2(key,seed))>.5?1.:-1.;
   vec2 b=a+vec2(sx*1.1,sg*sx*.9),c=b+vec2(sx*.8,sg*sx*.3);d=min(d,min(seg(q,a,b),seg(q,b,c))-w*.55);}
  tone=clamp(-d/max(w,1e-3)*1.1+.18,0.,1.);
 }else if(k==12){ // breath cone, apex at -x
  vec2 p=q-vec2(-asp,0.);float R=2.*asp,rr=length(p),a=atan(p.y,p.x);
  d=max((abs(a)-P.x)*rr,rr-R*(1.+(vn(vec2(a*6.+seed,T*.8))-.5)*.14));
  float u=rr/R;tone=clamp(.28+.55*fbm(vec2(a*7.+seed,u*3.-T*P.y))+.3*(1.-u),0.,1.);fill=1.-smoothstep(.45,1.,u)*.55;
 }else if(k==13){ // flower
  float pet=pow(abs(cos((an+P.w)*P.x*.5)),P.y),R=mix(P.z*1.15,.95,pet);
  d=r-R;tone=r<P.z?.95:.3+.45*pet*(1.-r*.35)+(fbm(q*2.5+seed)-.5)*.3;hd=abs(r-P.z*.62)-.035;
 }else if(k==14){ // rune circle
  float a=an+P.y,sg=6.28318/P.x,am=mod(a+sg*.5,sg)-sg*.5;vec2 pm=abs(vec2(cos(am),sin(am))*r-vec2(.77,0.));
  d=min(min(abs(r-.9)-.04,abs(r-.64)-.025),min((pm.x/.085+pm.y/.05-1.)*.04,abs(r-.2)-.025));
  tone=.72+.2*sin(a*3.+T);
 }else if(k==15){ // brush arc
  float da=mod(an-P.y,6.28318),u=da/max(P.z,1e-3),taper=u<=1.?pow(sin(u*3.14159),.55):0.;
  d=abs(r-P.x)-P.w*taper;if(u>1.)d=max(d,.04);tone=clamp(.2+.75*u+(fbm(dir*2.+seed)-.5)*.3,0.,1.);
 }else if(k==16){ // mace core
  d=r-.64;for(int i=0;i<8;i++){if(float(i)>=P.x)break;float a=float(i)*6.28318/P.x+P.z;d=smin(d,length(q-vec2(cos(a),sin(a))*.72)-P.y,.1);}
  vec3 n=vec3(q/.9,sqrt(max(0.,1.-r*r/.81)));tone=.1+.9*clamp(dot(n,normalize(vec3(-.42,.62,.66))),0.,1.);hd=length((q-vec2(-.28,.3))/vec2(1.25,.8))-P.w;
 }else if(k==17){ // flowing stream along x (P.y flow speed)
  float x=q.x/asp,taper=smoothstep(-1.,-1.+P.w,x)*smoothstep(1.,1.-P.w,x);
  float wv=(vn(vec2(q.x*.9-T*P.y*.5,seed))-.5)*2.*P.z*taper;
  float w=P.x*taper*(.8+.4*vn(vec2(q.x*1.7-T*P.y,seed+3.))),dy=abs(q.y-wv);d=dy-w;
  tone=clamp(.3+.55*(1.-dy/max(w,1e-3))+(fbm(vec2(q.x*.5-T*P.y,q.y*2.2)+seed)-.5)*.8,0.,1.);
  hd=dy-w*.16-(fbm(vec2(q.x*.8-T*P.y*1.3,seed))-.5)*w*.3+(1.-taper)*2.;
 }else if(k==18){ // bubble dome
  vec2 p=q;if(p.y<0.)p.y/=max(P.x,.05);float rr=length(p);d=rr-.95;fill=.12+.88*smoothstep(.62,.95,rr);
  tone=clamp(.55+q.y*.3+(fbm(q*2.+seed+T*.2)-.5)*.5,0.,1.);float ah=atan(p.y,p.x);hd=(q.y>0.&&ah>1.75&&ah<2.65)?abs(rr-.8)-.035:9.;
 }else if(k==19){ // faceted crystal drill, tip at +x; P.x spin phase, P.y twist
  float u=clamp((q.x+asp)/(2.*asp),0.,1.),w=.95*(1.-u);
  d=max(abs(q.y)-w,-q.x-asp);
  float f=q.y/max(w,.05),sp=fract(u*P.y-P.x+f*.3);
  tone=(f>.3?.92:f>-.3?.6:.3)-(sp<.5?0.:.2);hd=seg(q,vec2(-asp*.7,.55),vec2(asp*.4,.18))-.06;
 }else if(k==20){ // standing crystal column, tip at +x
  float rf=asp*2.*P.x;vec2 v0=vec2(asp,0.),v1=vec2(asp-rf,.95),v2=vec2(-asp,.95),v3=vec2(-asp,-.95),v4=vec2(asp-rf,-.95);
  d=max(max(max(edge(q,v0,v1),edge(q,v1,v2)),max(edge(q,v2,v3),edge(q,v3,v4))),edge(q,v4,v0));
  tone=(q.y>.32?.9:q.y>-.32?.55:.22)+(q.x>asp-rf?.1:0.);hd=seg(q,vec2(-asp*.75,.62),vec2(asp-rf-.1,.62))-.06;
 }else if(k==21){ // burst star
  float fa=(an+3.14159)/6.28318*P.x,id=floor(fa),f=fract(fa),len=.6+.35*h21(vec2(id,seed)),sp=pow(1.-abs(f-.5)*2.,P.y);
  float R=mix(P.z,len,sp);d=(r-R)*.7;tone=1.-r/max(R,.01)*.8;
 }else if(k==22){ // rolling wave wall: a rounded, frothy crest that rolls along its length (local y up)
  float x=q.x/asp,ends=1.-pow(abs(x),3.),c1=fbm(vec2(q.x*.55+T*.6,seed)),c2=vn(vec2(q.x*1.7-T*1.1,seed+3.));
  float crest=mix(-1.25,-.1+.62*c1+.2*c2,ends);
  d=max(q.y-crest,-q.y-1.);
  float u=(q.y+1.)/max(crest+1.,.01);
  tone=clamp(.72-u*.5+(fbm(vec2(q.x*.35-T*.4,q.y*3.2)+seed)-.5)*.7,0.,1.);
  hd=crest-.2-.14*fbm(vec2(q.x*2.6+seed,T*1.5))-q.y;
  fill=smoothstep(-1.,-.55,q.y);
 }else if(k==23){ // living flame: a round base with three curling, tapering tongues and drops that break away (base at -x, tip at +x)
  float t=T*P.x,H=2.*asp;vec2 b0=vec2(-asp+.56,0.);
  d=length((q-b0)*vec2(1.,.92))-.54-.04*sin(t*5.3+seed);
  for(int j=0;j<3;j++){
   vec4 g=j==0?vec4(1.,0.,.46,0.):j==1?vec4(.6,-.74,.27,2.1):vec4(.54,.78,.25,4.2);
   float ph=g.w+seed*3.,dj=1e3,pr=g.z,side=sign(g.y);
   vec2 a=b0+vec2(.2,g.y*.42),tip=vec2(-asp+g.x*H*(.88+.12*sin(t*3.1+ph)),g.y+sin(t*1.7+ph)*.14+P.z*g.x),cp=vec2(-asp+g.x*H*.45,g.y*.95+side*.12+sin(t*1.3+ph*2.)*.14),pv=a;
   for(int k=1;k<=4;k++){float sk=float(k)*.25;vec2 pt=(1.-sk)*(1.-sk)*a+2.*(1.-sk)*sk*cp+sk*sk*tip;float rr=g.z*pow(1.-sk,.8)+.02;dj=min(dj,capsule(q,pv,pt,pr,rr));pv=pt;pr=rr;}
   d=smin(d,dj,.13);
  }
  for(int i=0;i<2;i++){float ph=fract(t*.75+float(i)*.5+seed*.7);vec2 c=vec2(-asp+H*(.74+.28*ph),sin(ph*4.+float(i)*2.)*.3);d=min(d,length(q-c)-.12*(1.-ph));}
  d+=(fbm(q*2.3+vec2(-t*1.2,seed*5.))-.5)*.13*P.y;
  d=max(d,max(abs(vQ.y)-.97,vQ.x-.97));
  tone=clamp(-d*2.4+.12-(q.x+asp)/H*.45,0.,1.);
 }else if(k==24){ // ball of fire: radial flames licking outward (explosions, the sun, meteor heads)
  float lr=length(vQ),rr=lr/.82,t=T*P.x;vec2 dr=vQ/max(lr,1e-4);
  float n=fbm(dr*1.7+vec2(seed,t*.9))*.55+fbm(dr*(2.8+rr*2.2)+vec2(t*.7-seed,-t*.5))*.45;
  float F=(1.-rr)*1.3+(n-.5)*P.y*1.3-smoothstep(.8,1.,lr)*.9;
  if(P.z>0.)F+=P.z*.2*sin(atan(dr.y,dr.x+1e-7)*P.w+t*1.4+n*3.)*smoothstep(.2,.7,rr);
  d=(.12-F)*.5;tone=clamp((F-.12)*1.2,0.,1.);
 }else if(k==25){ // billowing smoke, mist and cloud: soft lobes that roll and breathe
  float t=T*P.x;vec2 p=vQ;
  p+=(vec2(fbm(p*1.3+vec2(seed,-t*.6)),fbm(p*1.3+vec2(-t*.5,seed*2.)))-.5)*.35;
  float b=length(p-vec2(-.42,-.16)-.05*sin(t+seed))-.36;
  b=smin(b,length(p-vec2(.05,.14)+.04*cos(t*1.2))-.46,.2);
  b=smin(b,length(p-vec2(.45,-.1))-.34,.2);
  b=smin(b,length(p-vec2(-.1,-.34))-.36,.2);
  b=smin(b,length(p-vec2(.3,-.38))-.3,.2);
  d=max(b+(fbm(p*3.2+vec2(t*.3,-t))-.5)*.1,max(abs(vQ.x),abs(vQ.y))-.98);
  tone=clamp(.55+p.y*.55-p.x*.1+(fbm(p*2.2+seed)-.5)*.35,0.,1.);
 }else if(k==26){ // liquid: splash, puddle or goo with drops breaking away at the rim (P.x wildness, P.y lobes)
  float lr=length(vQ),rr=lr/.84;vec2 dr=vQ/max(lr,1e-4);
  float n=fbm(dr*P.y+vec2(seed*7.,T*.1))*.8+fbm(vQ*2.2+seed*3.+T*.08)*.2;
  float F=(1.-rr)*1.4+(n-.5)*P.x*1.3-smoothstep(.85,1.,lr)*.8;
  d=(.1-F)*.5;tone=clamp(.12+(F-.1)*1.1,0.,1.);
 }else if(k==27){ // fire twister: a flame funnel wrapped in swirling bands (base at -x, top at +x)
  float u=(vQ.x+1.)*.5,t=T*P.x,w=mix(.26,.88,pow(u,1.15)),v=vQ.y+sin(u*5.5-t*1.6)*.1*u,m=1.-abs(v)/w;
  float sw=sin((v/w)*2.4+u*13.-t*8.),n=fbm(vec2(v*1.8+seed,u*3.-t*1.4));
  float F=m*.95+(n-.5)*.8+sw*.14*m-smoothstep(.86,.99,abs(vQ.y))-smoothstep(.93,1.,u);
  d=(.1-F)*.5;tone=clamp((F-.1)*1.15+sw*.12,0.,1.);
 }else if(k==28){ // gushing water: a stream that swells from its source and frays into spray at its edges (flows toward +x)
  float x=(vQ.x+1.)*.5,t=T*P.x,v=vQ.y,grow=smoothstep(0.,.08,x)*(1.-smoothstep(.9,1.,x)),w=mix(.5,.86,x)*grow,a=abs(v)/max(w,.02);
  float e=fbm(vec2(q.x*1.5-t*2.,abs(v)*1.5+seed)),n=fbm(vec2(q.x*.5-t*1.4,v*1.6+seed*2.));
  float F=1.-a+(e-.5)*1.1*smoothstep(.2,1.,a)-(1.-grow)*1.5-smoothstep(.9,1.,abs(vQ.y));
  d=(.08-F)*.45;tone=clamp(.28+(1.-a)*.4+(n-.5)*.9,0.,1.);
 }else if(k==29){ // surging water seen from above: a sheet of water whose foamy front and foam lines race forward (front toward +y)
  float x=q.x/asp,t=T*P.x,ends=1.-pow(abs(x),4.);
  float front=mix(-1.05,.72+(fbm(vec2(q.x*1.3+seed,t*.4))-.5)*.28+.05*sin(q.x*7.+t*3.),ends);
  d=max(q.y-front,-q.y-1.);
  tone=clamp(.3+(front-q.y)*.22+(fbm(vec2(q.x*.6-t*.2,q.y*1.5-t))-.5)*.55,0.,1.);
  float l1=abs(q.y-(front-.1))-.1*(.55+.45*vn(vec2(q.x*3.+seed,t)));
  float l2=abs(q.y-(front-.45-.05*sin(q.x*4.+t*2.)))-.04+step(vn(vec2(q.x*2.2+seed,3.)),.3)*.2;
  float l3=abs(q.y-(front-.85-.06*sin(q.x*3.+1.+t*1.5)))-.028+step(vn(vec2(q.x*2.6+seed,7.)),.4)*.2;
  hd=min(l1,min(l2,l3));fill=smoothstep(-1.,-.25,q.y);
 }
 // All screen derivatives are taken before any discard (safe on every GPU, including iPad/Metal).
 float px=max(fwidth(d),1e-4),tw=max(fwidth(tone),.012),hpx=max(fwidth(hd),1e-4),ipx=max(fwidth(ink),1e-4),unitCss=1./(px*uDpr);
 if(d>px*uDpr*6.)discard;
 d+=(fbm(q*7.+seed*3.1)-.5)*px*uDpr*(2.4+vE.z*7.);
 if(d>px*1.5)discard;
 float soft=vE.w,cover=1.-smoothstep(-max(px,soft*.22),px,d);
 float tn=clamp(tone+(fbm(q*1.6+seed*9.)-.5)*.2,0.,1.);
 float b1=smoothstep(.34-tw,.34+tw,tn),b2=smoothstep(.67-tw,.67+tw,tn);
 vec3 col=mix(mix(vD.rgb,vM.rgb,b1),vL.rgb,b2);
 col*=1.-max(0.,max(1.-abs(tn-.34)/(tw*2.2),1.-abs(tn-.67)/(tw*2.2)))*.12;
 float lum=dot(vD.rgb,vec3(.3,.59,.11));vec3 pig=clamp(mix(vec3(lum),vD.rgb,1.45)*.66,0.,1.);
 float ow=1.2*uDpr*px,iw=clamp(unitCss*.035,1.5,4.5)*uDpr*px;
 float line=(1.-smoothstep(ow*.45,ow*1.25,-d))*vM.w*(1.-soft)*(.45+.55*smoothstep(.2,.6,vn(q*2.3+seed*4.)));
 float pool=(1.-smoothstep(0.,iw*1.6,-d))*vM.w*(1.-soft*.6);
 col=mix(col,mix(col,vD.rgb*.92,.6),pool*.55);
 col=mix(col,pig,line*.88);
 float white=1.-smoothstep(-hpx,hpx,hd);
 if(vE.y>0.)white=max(white,smoothstep(.63,.69,fbm(q*2.2+seed*2.3))*b2*vE.y);
 col=mix(col,vec3(1.,.996,.975),white*.93);
 col=mix(col,pig*.7,(1.-smoothstep(-ipx,ipx,ink))*.95);
 vec2 sp=gl_FragCoord.xy/uDpr;float g=vn(sp*.85)*.55+vn(sp*.29+7.)*.45;
 col*=1.-(g-.5)*.18*(1.-b2*.45);
 col*=1.+(fbm(vQ*1.2+seed*4.)-.5)*.08;
 float a=cover*vA.z*fill*mix(.9,1.,max(line,pool*.6));
 a*=.95+.05*g;
 float dis=vL.w;if(dis>0.){float e=fbm(vQ*2.6+seed*5.3)*1.1-.05,m=smoothstep(dis-.06,dis+.03,e);a*=m;col=mix(col,pig,(1.-smoothstep(dis,dis+.1,e))*.55*m);}
 if(a<.004)discard;oC=vec4(clamp(col,0.,1.),min(a,1.));
}`;
  let prog = null, vao = null, inst = null, cap = 0, uVP = null, uTime = null, uDpr = null, packed = new Float32Array(32 * 256);
  function init() {
    const p = gl.createProgram();
    for (const [type, text] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]]) { const s = gl.createShader(type); gl.shaderSource(s, text); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error('Painted VFX shader: ' + gl.getShaderInfoLog(s)); gl.attachShader(p, s); gl.deleteShader(s); }
    gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error('Painted VFX program: ' + gl.getProgramInfoLog(p));
    prog = p; uVP = gl.getUniformLocation(p, 'uVP'); uTime = gl.getUniformLocation(p, 'uTime'); uDpr = gl.getUniformLocation(p, 'uDpr');
    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    inst = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    for (let i = 1; i <= 8; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 128, (i - 1) * 16); gl.vertexAttribDivisor(i, 1); }
    gl.bindVertexArray(null);
  }
  function draw(combat, world, vp, time, visible, opt = {}) {
    const list = plan(combat, world, time, visible, {...opt, vp});
    diagnostics.calls = 0; if (!gl || !list.length) return {calls: 0, triangles: 0};
    if (!prog) init();
    list.sort((a, b) => a.g - b.g || a.k - b.k || a.s - b.s);
    if (packed.length < list.length * 32) packed = new Float32Array(2 ** Math.ceil(Math.log2(list.length * 32)));
    for (let i = 0; i < list.length; i++) packed.set(list[i].v, i * 32);
    const dpr = gl.canvas && gl.canvas.clientWidth ? gl.drawingBufferWidth / gl.canvas.clientWidth : 1;
    gl.useProgram(prog); gl.uniformMatrix4fv(uVP, false, vp); gl.uniform1f(uTime, time); gl.uniform1f(uDpr, Math.max(.5, Math.min(4, dpr || 1)));
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    const bytes = list.length * 128; if (bytes > cap) { cap = 2 ** Math.ceil(Math.log2(Math.max(8192, bytes))); gl.bufferData(gl.ARRAY_BUFFER, cap, gl.DYNAMIC_DRAW); }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, packed, 0, list.length * 32);
    gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, list.length);
    gl.depthMask(true); gl.disable(gl.BLEND); gl.bindVertexArray(null);
    diagnostics.calls = 1; return {calls: 1, triangles: list.length * 2};
  }
  return {draw, plan, get diagnostics() { return {...diagnostics, kinds: {...diagnostics.kinds}}; }, get camera() { return {...cam}; },
    dispose() { if (gl && prog) { gl.deleteProgram(prog); gl.deleteVertexArray(vao); gl.deleteBuffer(inst); prog = null; } }};
}
