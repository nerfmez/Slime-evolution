/**
 * Painted watercolour skill effects (owner request, 2026-09-25/26).
 * Every skill is redrawn from its concept in a cel-shaded watercolour look: stepped washes, a soft
 * same-hue pigment edge (never black outlines), paper grain and a watercolour dissolve.
 * Owner rules: effects must look natural, never like sculpted geometry. Tails always flow along the
 * real path (ribbons), fire takes a different form in every branch (never flame "sticks"), water
 * stays one smooth body, smoke and fog are wispy, and small particles are soft dots without outlines.
 * Presentation only: combat objects are read, never changed, so hit areas, sizes, timing and
 * damage stay exactly as they are. One instanced draw call per frame.
 */
export function createPaintedSkillRenderer(gl) {
  const TAU = Math.PI * 2, clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), mix = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16) / 255);
  const tones = (l, m, d) => [...hex(l), ...hex(m), ...hex(d)];
  const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]); return l > 1e-8 ? [v[0] / l, v[1] / l, v[2] / l] : null; };
  const addv = (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k];
  // Shape library (must match the fragment shader). Ribbons (30-33) are drawn along a path of points.
  const BLOB = 0, RING = 1, DROP = 2, SHARD = 4, SPIRAL = 9, BOLT = 11, FAN = 12, FLOWER = 13, RIBBON = 17, DOME = 18,
    DRILL = 19, COLUMN = 20, LIQUID = 26, SURF = 29,
    WATER_R = 30, FIRE_R = 31, GLOW_R = 32, GOO_R = 33, FOG = 35, FIRELINE = 37, GLOW = 38, ROCK = 39,
    FLAMEBALL = 40, SUN = 41, EXPLODE = 42, TORNADO = 43, PUFF = 44, DOME_FIRE = 45, CRATER = 46;
  // Palettes: light / mid / dark wash. The pigment edge is derived from the dark wash.
  const P = {
    shadow: tones('#6f8a4c', '#5f7a40', '#4c6533'),
    water: tones('#f1fbff', '#a9ddf4', '#5aa6da'), waterDeep: tones('#c4e8f8', '#74c0e8', '#3d88c6'), foam: tones('#ffffff', '#eaf7fd', '#b2dbef'),
    tide: tones('#f5eeff', '#d2baf5', '#9f7bdb'), tideDeep: tones('#e0cdf9', '#ae8ee8', '#7753c2'),
    fire: tones('#ffdc7a', '#ff9838', '#e4502a'), flame: tones('#ffcd6a', '#f7853a', '#d4422a'), ember: tones('#ffa45c', '#b93a2b', '#5e1d1a'),
    hot: tones('#fffbe6', '#fff0b0', '#ffc860'), dust: tones('#eadfce', '#bfa98f', '#86705c'), stone: tones('#d8c6ad', '#a68e74', '#76604c'), dustLight: tones('#f6efe4', '#dccbb4', '#ad977e'), blaze: tones('#fff3b8', '#ffb22e', '#f0561e'), smoke: tones('#f7f1e8', '#ddd1c3', '#b4a292'), scorch: tones('#cda57e', '#9d6c4d', '#6d4433'),
    toxin: tones('#eef8a2', '#b9d64c', '#6d9a26'), toxinDeep: tones('#cfe274', '#8aae34', '#4a6e1d'), toxinShade: tones('#ecdcf6', '#be9fdc', '#7c58a8'),
    petal: tones('#f3daf7', '#cc93e2', '#8a4fae'), spore: tones('#fdfbe0', '#eef3a4', '#b3c455'),
    frost: tones('#f7f9ff', '#c8d5f8', '#8fa0e8'), frostDeep: tones('#dfe6fb', '#a3b2ee', '#6b7cd2'),
    chain: tones('#ffffff', '#e8e2fc', '#aa9de6'), chainBlue: tones('#e5ecff', '#a8baf6', '#627ad8'),
    orbit: tones('#f2fbff', '#a6dff8', '#58b0e6'), orbitDeep: tones('#c8e9fb', '#70bbea', '#3c84c8'),
  };
  const Z4 = [0, 0, 0, 0], NO_RIBBON = [0, 0, 0, 0, 0, 0, 0, 0];
  let items = [], seq = 0, depth = 0, cfg = {}, now = 0;
  const cam = {f: [0, .6247, .7809], r: [1, 0, 0], u: [0, .7809, -.6247]};
  const diagnostics = {version: 'painted-watercolor-v2', instances: 0, calls: 0, kinds: {}, invalid: 0};
  const note = tag => { diagnostics.kinds[tag] = (diagnostics.kinds[tag] || 0) + 1; };
  const impactStates = new WeakMap(), history = new WeakMap();

  function setCamera(vp) {
    const a = [vp[0], vp[4], vp[8]], b = [vp[1], vp[5], vp[9]];
    let f = cross3(a, b);
    const n = Math.hypot(f[0], f[1], f[2]); if (!(n > 1e-8)) return;
    f = f.map(v => v / n); if (f[1] < 0) f = f.map(v => -v);
    let r = [f[2], 0, -f[0]]; const rn = Math.hypot(r[0], r[2]);
    r = rn > 1e-6 ? [r[0] / rn, 0, r[2] / rn] : [1, 0, 0];
    cam.f = f; cam.r = r; cam.u = cross3(f, r);
  }
  const at = p => { depth = p[0] * cam.f[0] + p[1] * cam.f[1] + p[2] * cam.f[2]; };
  const lifted = (p, L) => L ? [p[0] + cam.f[0] * L, p[1] + cam.f[1] * L, p[2] + cam.f[2] * L] : p;

  // One painted shape. `ribbon` = [corner11 xyz, 1, u0, u1, length, 0] turns the quad into a bilinear path segment.
  function put(shape, c, U, V, pal, o, ribbon = NO_RIBBON, key = null) {
    const a = o.alpha ?? 1; if (!(a > .003)) return;
    const v = [c[0], c[1], c[2], shape, U[0], U[1], U[2], o.seed ?? 0, V[0], V[1], V[2], Math.min(1, a), ...(o.p || Z4),
      pal[0], pal[1], pal[2], o.dissolve ?? 0, pal[3], pal[4], pal[5], o.edge ?? 1, pal[6], pal[7], pal[8], o.wobble ?? 0,
      o.asp ?? 1, o.shine ?? 0, o.rag ?? 0, o.soft ?? 0, ...ribbon];
    if (!v.every(Number.isFinite)) { diagnostics.invalid++; return; }
    items.push({g: o.ground ? 0 : 1, k: o.ground ? (o.layer || 0) : (key ?? depth) + (o.bias || 0), s: seq++, v});
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
    const a = norm([dir[0] - f[0] * k, dir[1] - f[1] * k, dir[2] - f[2] * k]) || cam.r, b = cross3(f, a);
    put(shape, lifted(p, o.lift), [a[0] * len, a[1] * len, a[2] * len], [b[0] * wid, b[1] * wid, b[2] * wid], pal, {asp: len / wid, ...o});
  }
  // Straight stroke whose ends sit exactly on two world points (lightning, links).
  function span(shape, a, b, wid, pal, o = {}) {
    const U = [(b[0] - a[0]) / 2, (b[1] - a[1]) / 2, (b[2] - a[2]) / 2], len = Math.hypot(U[0], U[1], U[2]); if (len < 1e-4) return;
    const V = norm(cross3(cam.f, U)) || cam.u;
    put(shape, lifted([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], o.lift), U, [V[0] * wid, V[1] * wid, V[2] * wid], pal, {asp: len / wid, ...o});
  }
  // Flat decal painted on the ground; local +x follows (dx,dz), local +y points away from the camera.
  function decal(shape, x, z, dx, dz, len, wid, pal, o = {}) {
    put(shape, [x, .028 + (o.layer || 0) * .004, z], [dx * len, 0, dz * len], [dz * wid, 0, -dx * wid], pal, {ground: true, asp: len / wid, ...o});
  }
  const disc = (shape, x, z, r, pal, o = {}) => decal(shape, x, z, 1, 0, r, r, pal, {asp: 1, ...o});
  const shadow = (x, z, r, alpha) => decal(BLOB, x, z, 1, 0, r, r * .62, P.shadow, {alpha, edge: 0, soft: .6, layer: 0, asp: 1});
  const screenDir = a => [cam.r[0] * Math.cos(a) + cam.u[0] * Math.sin(a), cam.r[1] * Math.cos(a) + cam.u[1] * Math.sin(a), cam.r[2] * Math.cos(a) + cam.u[2] * Math.sin(a)];
  // Soft building blocks: small particles never carry an outline.
  const mote = (p, r, pal, alpha = 1, o = {}) => bb(BLOB, p, r, r, pal, {alpha, edge: 0, soft: .35, p: [.6, 0, 0, 0], ...o});
  const glow = (p, r, pal, alpha = 1, o = {}) => bb(GLOW, p, r, r, pal, {alpha, edge: 0, soft: 1, ...o});
  const glowDecal = (x, z, r, pal, alpha = 1, o = {}) => disc(GLOW, x, z, r, pal, {alpha, edge: 0, soft: 1, layer: 0, ...o});
  const fog = (p, w, h, pal, alpha = 1, o = {}) => bb(FOG, p, w, h, pal, {alpha, edge: .2, soft: .8, p: [.5, .6, .3, 0], ...o});
  const fogDecal = (x, z, r, pal, alpha = 1, o = {}) => disc(FOG, x, z, r, pal, {alpha, edge: .2, soft: .8, p: [.35, .6, 0, 0], ...o});

  // A ribbon painted along a path of world points (index 0 = head). Each segment is one bilinear quad whose
  // corners are shared with its neighbours, so the ribbon bends smoothly and never shows seams.
  function ribbon(style, pts, widths, pal, o = {}) {
    const n = pts.length; if (n < 2) return;
    const acc = [0]; let total = 0;
    for (let i = 1; i < n; i++) { total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); acc.push(total); }
    if (total < 1e-3) return;
    const side = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let s = norm(cross3(cam.f, [b[0] - a[0], b[1] - a[1], b[2] - a[2]])) || side[i - 1] || cam.u;
      if (i && s[0] * side[i - 1][0] + s[1] * side[i - 1][1] + s[2] * side[i - 1][2] < 0) s = [-s[0], -s[1], -s[2]];
      side.push(s);
    }
    const Q = pts.map(p => lifted(p, o.lift));
    for (let i = 0; i < n - 1; i++) {
      const p0 = Q[i], p1 = Q[i + 1], s0 = side[i], s1 = side[i + 1], w0 = widths[i], w1 = widths[i + 1];
      const key = ((pts[i][0] + pts[i + 1][0]) * cam.f[0] + (pts[i][1] + pts[i + 1][1]) * cam.f[1] + (pts[i][2] + pts[i + 1][2]) * cam.f[2]) / 2;
      put(style, addv(p0, s0, -w0), addv(p1, s1, -w1), addv(p0, s0, w0), pal, o, [...addv(p1, s1, w1), 1, acc[i] / total, acc[i + 1] / total, total, 0], key);
    }
  }
  // A straight tail behind `head` that flutters sideways like cloth in the wind.
  function streak(style, head, back, len, w, pal, o = {}) {
    const b = norm(back); if (!b || len < .01) return;
    const s = norm(cross3(b, cam.f)) || cam.u, n = o.n ?? 8, fl = o.flutter ?? .35, ph = (o.seed ?? 0) * 6;
    const pts = [], ws = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, wave = Math.sin(u * 5.5 - now * 10 + ph) * w * fl * u;
      pts.push([head[0] + b[0] * len * u + s[0] * wave, head[1] + b[1] * len * u + s[1] * wave, head[2] + b[2] * len * u + s[2] * wave]);
      ws.push(w * Math.pow(1 - u, o.taper ?? .75) + .004);
    }
    ribbon(style, pts, ws, pal, o);
  }
  // Remembered positions of a moving object, so its tail follows the path it really took (orbits, darts, turns).
  function track(obj, p) {
    let h = history.get(obj);
    if (!h || now < h.last - 1e-6 || now - h.last > .4) { h = {last: now, pts: []}; history.set(obj, h); }
    if (!h.pts.length || now > h.pts[0].t + 1e-4) h.pts.unshift({t: now, p: p.slice()}); else h.pts[0].p = p.slice();
    h.last = now;
    while (h.pts.length > 3 && now - h.pts[h.pts.length - 1].t > .8) h.pts.pop();
    if (h.pts.length > 64) h.pts.length = 64;
    return h.pts;
  }
  function pathBehind(pts, dur, n) { // resample the remembered path over the last `dur` seconds, head first
    const out = [pts[0].p];
    for (let k = 1; k <= n; k++) {
      const tt = now - dur * k / n; let j = 0;
      while (j < pts.length - 1 && pts[j + 1].t > tt) j++;
      if (j >= pts.length - 1) { if (pts.length > 1) out.push(pts[pts.length - 1].p); break; }
      const a = pts[j], b = pts[j + 1], f = clamp((a.t - tt) / Math.max(1e-6, a.t - b.t));
      out.push([mix(a.p[0], b.p[0], f), mix(a.p[1], b.p[1], f), mix(a.p[2], b.p[2], f)]);
    }
    return out;
  }
  // A thrown particle (spark, drop, chip) on a ballistic arc: a soft head and a short trail along its real path.
  function thrown(p0, v, t, pal, size, style, o = {}) {
    const g = o.g ?? 9, pos = s => [p0[0] + v[0] * s, p0[1] + v[1] * s - g * s * s / 2, p0[2] + v[2] * s], head = pos(t);
    if (head[1] < -.02) return;
    at(head);
    if (style !== null && t > .02) {
      const pts = [], ws = [], tl = o.tail ?? .1;
      for (let i = 0; i <= 5; i++) { pts.push(pos(Math.max(0, t - tl * i / 5))); ws.push(size * .85 * (1 - i / 5 * .85)); }
      ribbon(style, pts, ws, pal, {alpha: o.alpha ?? 1, seed: o.seed, lift: o.lift, p: o.rp});
    }
    mote(head, size, o.headPal || pal, o.alpha ?? 1, {lift: o.lift, bias: .01, seed: o.seed});
  }
  // A fire ember flung out: a soft glowing dot that slows in the air and sinks (no needle trail).
  function ember(p0, v, t, size, alpha, seed) {
    const k = 2.2, s = (1 - Math.exp(-k * t)) / k, head = [p0[0] + v[0] * s, p0[1] + v[1] * s - 2.5 * t * t, p0[2] + v[2] * s];
    if (head[1] < .02 || alpha <= 0) return;
    at(head); glow(head, size * 3.4, P.fire, alpha * .55, {lift: .3});
    mote(head, size * (.8 + .2 * Math.sin(now * 17 + seed * 9)), P.hot, alpha, {lift: .3, bias: .01, seed});
  }

  // ---------------------------------------------------------------- Water: one smooth, glossy body of water
  function waterBolt(t) { // Water Shot: a glossy droplet pulling a smooth watery tail
    const d = [t.dx, 0, t.dz], r = Math.max(.16, (t.r || .14) * 1.2), c = [t.x, .42, t.z], A = clamp((t.life - t.age) * 6) * smooth(0, .04, t.age), sd = hash(t.x * 3.1 + t.z);
    const len = Math.min(r * 5, (t.speed || 9) * t.age + .02);
    at(c); shadow(t.x, t.z, r * 1.2, .22 * A);
    streak(WATER_R, c, [-d[0], .04, -d[2]], len, r * .8, P.water, {alpha: A * .92, seed: sd, flutter: .25, lift: .15, p: [0, .5, 0, 0]});
    bb(BLOB, c, r, r, P.water, {alpha: A, p: [1, .3, .12, 0], seed: sd, lift: .16, bias: .01});
  }
  function waterImpacts(combat, time, visible) { // a drop landing: rings on the ground and a few drops thrown up
    const clock = combat.clock ?? time; let st = impactStates.get(combat);
    if (!st || clock < st.clock) { st = {clock, prev: new Map(), events: []}; impactStates.set(combat, st); }
    for (const [t, n] of st.prev) if ((t.hit?.size || 0) > n && t.kind === 'bolt') st.events.push({x: t.x, z: t.z, dx: t.dx, dz: t.dz, born: clock, seed: hash(t.x * 7 + t.z)});
    st.prev = new Map((combat.abilities || []).filter(t => t.family === 'water' && t.kind === 'bolt').map(t => [t, t.hit?.size || 0]));
    st.events = st.events.filter(e => clock - e.born < .45).slice(-48); st.clock = clock;
    for (const e of st.events) {
      if (!visible(e.x, e.z, .8)) continue; note('water:impact');
      const age = clock - e.born, p = clamp(age / .45), A = 1 - smooth(.5, 1, p);
      disc(RING, e.x, e.z, .22 + smooth(0, 1, p) * .6, P.water, {alpha: A, p: [.85, .07, .6, .02], layer: 2, seed: e.seed, soft: .3});
      disc(LIQUID, e.x, e.z, .28, P.water, {alpha: .55 * A, p: [.5, 2.2, 0, 0], layer: 1, seed: e.seed, dissolve: smooth(.4, 1, p), edge: .5});
      for (let j = 0; j < 5; j++) { const an = j * TAU / 5 + e.seed * 6, sp = .9 + .6 * hash(j + e.seed); thrown([e.x, .28, e.z], [Math.cos(an) * sp + e.dx * .6, 2.2 + hash(j * 3 + e.seed), Math.sin(an) * sp + e.dz * .6], age, P.water, .045, WATER_R, {alpha: A, seed: j, g: 10, tail: .07, lift: .3, rp: [0, .9, 0, 0]}); }
    }
  }
  function beamLine(t, from, to, w, pulse, sd) { // points and widths along a stream, gently wavering
    const d = [t.dx, 0, t.dz], side = norm(cross3(d, cam.f)) || cam.u, n = 16, pts = [], ws = [], L = Math.hypot(to[0] - from[0], to[2] - from[2]);
    for (let i = 0; i <= n; i++) {
      const u = i / n, wv = Math.sin(u * L * 1.3 - now * 11 + sd * 6) * w * .12 * smooth(0, .15, u);
      pts.push([mix(from[0], to[0], u) + side[0] * wv, mix(from[1], to[1], u) + side[1] * wv, mix(from[2], to[2], u) + side[2] * wv]);
      ws.push(w * smooth(0, .06, u) * (1 - smooth(.94, 1, u) * .6) * (1 + pulse * Math.sin(u * L * 3.2 - now * 17 + sd)) + .004);
    }
    return {pts, ws};
  }
  function waterBeam(t) { // AQUA RAILGUN: one straight, pressurised stream that pierces the whole line
    const p = clamp(t.age / t.life), d = [t.dx, 0, t.dz], w = t.r, A = 1 - smooth(.7, 1, p), dis = smooth(.62, 1, p), sd = hash(t.x + t.z * 3);
    const L = Math.max(w, t.length * smooth(0, .25, p)), a = [t.x + d[0] * .25, .48, t.z + d[2] * .25], b = [t.x + d[0] * L, .48, t.z + d[2] * L];
    decal(RIBBON, (a[0] + b[0]) / 2, (a[2] + b[2]) / 2, d[0], d[2], L / 2, w * 1.3, P.water, {alpha: .35 * A, p: [.9, 1, 0, .08], layer: 1, seed: sd, soft: .6, edge: .3});
    at([(a[0] + b[0]) / 2, .48, (a[2] + b[2]) / 2]);
    const m = beamLine(t, a, b, w * .62, .04, sd), mist = beamLine(t, a, b, w * 1.05, 0, sd + 1);
    ribbon(GLOW_R, mist.pts, mist.ws, P.foam, {alpha: .35 * A, seed: sd + 2, lift: .5, bias: -.01, soft: .6, edge: 0});
    ribbon(WATER_R, m.pts, m.ws, P.water, {alpha: A, seed: sd, lift: .5, dissolve: dis, p: [1.4, 1.2, 0, 0]});
    for (const [x, z, k] of [[a[0], a[2], 0], [b[0], b[2], 1]]) {
      disc(RING, x, z, w * (.8 + p * 1.4), P.water, {alpha: A * (1 - p), p: [.85, .07, .6, .02], layer: 2, seed: sd + k, soft: .3});
      if (k) for (let j = 0; j < 6; j++) { const an = j * TAU / 6 + sd * 5, sp = 1.1 + .7 * hash(j + sd), tt = (p * 1.3 + j * .11) % .55; thrown([x, .45, z], [Math.cos(an) * sp + d[0] * 1.2, 2.2 + hash(j + sd * 3), Math.sin(an) * sp + d[2] * 1.2], tt, P.water, .05, WATER_R, {alpha: A * (1 - tt / .55), seed: j, g: 10, tail: .07, lift: .3, rp: [0, .9, 0, 0]}); }
    }
  }
  function waterJet(t) { // PRESSURE JET: a thinner stream that throbs with pressure pulses
    const p = clamp(t.age / t.life), d = [t.dx, 0, t.dz], w = t.r, A = smooth(0, .1, p) * (1 - smooth(.8, 1, p)), sd = hash(t.x * 2 + t.z);
    const a = [t.x + d[0] * .25, .46, t.z + d[2] * .25], b = [t.x + d[0] * t.length, .46, t.z + d[2] * t.length];
    decal(RIBBON, (a[0] + b[0]) / 2, (a[2] + b[2]) / 2, d[0], d[2], t.length / 2, w * 2.4, P.water, {alpha: .32 * A, p: [.88, 1.2, 0, .12], layer: 1, seed: sd, soft: .6, edge: .3});
    at([(a[0] + b[0]) / 2, .46, (a[2] + b[2]) / 2]);
    const m = beamLine(t, a, b, w * 1.15, .22, sd), mist = beamLine(t, a, b, w * 2.1, 0, sd + 1);
    ribbon(GLOW_R, mist.pts, mist.ws, P.foam, {alpha: .3 * A, seed: sd + 2, lift: .45, bias: -.01, soft: .6, edge: 0});
    ribbon(WATER_R, m.pts, m.ws, P.water, {alpha: A, seed: sd, lift: .45, p: [2, 1.2, 0, 0]});
    disc(RING, b[0], b[2], .3 + .25 * ((now * 3) % 1), P.water, {alpha: A * (1 - (now * 3) % 1), p: [.85, .07, .6, .02], layer: 2, seed: sd, soft: .3});
    for (let j = 0; j < 4; j++) { const an = j * TAU / 4 + sd * 5, tt = (now * 1.6 + j / 4) % .5; thrown([b[0], .42, b[2]], [Math.cos(an) * 1.1 + d[0], 2, Math.sin(an) * 1.1 + d[2]], tt, P.water, .04, WATER_R, {alpha: A * (1 - tt / .5), seed: j, g: 10, tail: .07, lift: .3, rp: [0, .9, 0, 0]}); }
  }
  function waterWave(t) { // TIDAL SURGE: one sheet of water rushing forward with a single white foam lip
    const p = clamp(t.age / t.life), d = [t.dx, 0, t.dz], sd = [-t.dz, 0, t.dx], w = t.r, A = smooth(0, .1, p) * (1 - smooth(.76, 1, p)), seed = hash(t.x * .3 + t.z * .7);
    decal(SURF, t.x - d[0] * .55, t.z - d[2] * .55, sd[0], sd[2], w * 1.05, .9, P.water, {alpha: .95 * A, p: [1, 0, 0, 0], layer: 2, seed, dissolve: smooth(.7, 1, p), edge: .6});
  }
  // ---------------------------------------------------------------- Tide: lilac ripples, a bubble dome, a whirlpool
  function tideRing(t) { // Tide Ring: two soft ripples spreading over the ground
    const p = clamp(t.age / t.life), R = Math.max(.05, t.r * Math.min(1, p * 3)), A = 1 - smooth(.6, 1, p), seed = hash(t.x + t.z * 1.7);
    disc(GLOW, t.x, t.z, R * 1.05, P.tide, {alpha: .3 * A, layer: 0, edge: 0, soft: 1});
    disc(RING, t.x, t.z, R * 1.08, P.tideDeep, {alpha: .9 * A, p: [.86, .08, .7, .03], layer: 2, seed, rag: .4, soft: .15});
    disc(RING, t.x, t.z, R * 1.08, P.tide, {alpha: .7 * A * smooth(.12, .35, p), p: [.6, .05, .6, .03], layer: 3, seed: seed + 1, rag: .5, soft: .25});
  }
  function tideDome(t) { // REPULSION DOME: a lilac soap-bubble shield that pushes out in pulses
    const p = clamp(t.age / t.life), r = t.r, A = smooth(0, .1, p) * (1 - smooth(.82, 1, p)), R = r * (.35 + .65 * smooth(0, .16, p)), seed = hash(t.x * 1.3 + t.z);
    disc(GLOW, t.x, t.z, R, P.tide, {alpha: .35 * A, layer: 0, edge: 0, soft: 1});
    disc(RING, t.x, t.z, R, P.tideDeep, {alpha: .9 * A, p: [.9, .055, .35, .02], layer: 2, seed, rag: .4, soft: .15});
    const k = (t.age % .5) / .5; disc(RING, t.x, t.z, R, P.tide, {alpha: A * (1 - k) * .8, p: [mix(.45, .92, k), .04, .8, .02], layer: 3, seed: seed + 2, soft: .3});
    at([t.x, 0, t.z]);
    bb(DOME, [t.x, 0, t.z], R, R, P.tide, {alpha: .92 * A, p: [Math.max(.2, cam.f[1]), 0, 0, 0], seed, rag: .3});
  }
  function tideVacuum(t) { // VACUUM COLLAPSE: a whirlpool that swells, pulls everything in and bursts
    const p = clamp(t.age / t.life), R = Math.max(.08, t.r * Math.sin(p * Math.PI)), A = smooth(0, .06, p) * (1 - smooth(.92, 1, p)), seed = hash(t.x + t.z * 2.1);
    disc(GLOW, t.x, t.z, R, P.tideDeep, {alpha: .3 * A, layer: 0, edge: 0, soft: 1});
    disc(SPIRAL, t.x, t.z, R, P.tideDeep, {alpha: .85 * A, p: [1.9, 4, -t.age * 2.4, .44], layer: 1, wobble: .05, seed, rag: .5});
    disc(RING, t.x, t.z, R * 1.04, P.tide, {alpha: A, p: [.88, .06, .3, .03], layer: 2, seed, rag: .5, soft: .15});
    for (let j = 0; j < 10; j++) {
      const k = (t.age * 1.3 + j / 10) % 1, an = j * 2.4 + t.age * 3 + k * 2.6, rr = R * (1 - k), c = [t.x + Math.cos(an) * rr, .08 + k * .06, t.z + Math.sin(an) * rr];
      mote(c, .06 * (1 - k * .5), P.tide, A * smooth(0, .2, k) * (1 - smooth(.85, 1, k)), {p: [.8, .3, .4, 0]});
    }
    if (p > .8) {
      const k = smooth(.8, 1, p);
      glowDecal(t.x, t.z, .6 + k * t.r * 1.2, P.tide, (1 - k) * .7);
      disc(RING, t.x, t.z, .4 + k * t.r * .95, P.tideDeep, {alpha: 1 - k, p: [.85, .07, .6, .03], layer: 3, seed: seed + 3, soft: .3});
    }
  }
  function tideResonance(t) { // RESONANCE CHAIN: rhythmic sound-wave rings
    const p = clamp(t.age / t.life), A = 1 - smooth(.62, 1, p), seed = hash(t.x * 2.3 + t.z);
    for (let j = 0; j < 3; j++) {
      const q = clamp(p * 1.6 - j * .18), R = Math.max(.05, t.r * smooth(0, .6, q));
      if (q > 0) disc(RING, t.x, t.z, R * 1.08, j ? P.tide : P.tideDeep, {alpha: A * (1 - smooth(.7, 1, q) * .6), p: [.86, .065 - j * .014, .7, .03], layer: 2 + j, seed: seed + j, rag: .4, soft: .2});
    }
  }
  // ---------------------------------------------------------------- Toxin: lime goo on purple shadows, a plague flower, acid fog
  function toxinLob(t) { // a ball of goo arcing through the air, stretching a sticky strand behind it
    const p = clamp(t.age / t.life), r = .28, sd = hash(t.tx * 1.3 + t.tz), pos = q => [mix(t.x, t.tx, q), .32 + Math.sin(q * Math.PI) * 1.1, mix(t.z, t.tz, q)], c = pos(p);
    decal(BLOB, c[0] + .05, c[2] - .04, 1, 0, r * (1.25 - .45 * Math.sin(p * Math.PI)), r * .8, P.toxinShade, {alpha: .4, asp: 1, layer: 0, edge: 0, soft: .6});
    at(c);
    const pts = [], ws = [];
    for (let i = 0; i <= 6; i++) { pts.push(pos(Math.max(0, p - .05 * i))); ws.push(r * .55 * (1 - i / 6 * .8)); }
    ribbon(GOO_R, pts, ws, P.toxin, {seed: sd, bias: -.01});
    bb(BLOB, c, r * 1.05, r * (1.05 + .1 * Math.sin(t.age * 18)), P.toxin, {p: [1, .3, 0, 0], seed: sd, bias: .01, wobble: .05});
  }
  function toxinPool(t) { // a lime puddle on a purple shadow, bubbles rising and popping
    const p = clamp(t.age / t.life), r = t.r || .8, g = .35 + .65 * smooth(0, .12, p), A = 1 - smooth(.8, 1, p), seed = hash(t.x * 1.9 + t.z * .7), dis = smooth(.8, 1, p);
    disc(LIQUID, t.x + .1, t.z - .08, r * 1.12 * g, P.toxinShade, {alpha: .7 * A, p: [.45, 2, 0, 0], layer: 0, seed, dissolve: dis, edge: .4});
    disc(LIQUID, t.x, t.z, r * g, P.toxin, {alpha: .95 * A, p: [.45, 2.2, 0, 0], layer: 1, seed, dissolve: dis, shine: .5});
    for (let j = 0; j < 4; j++) {
      const k = (t.age * 1.1 + j * .27 + hash(seed + j)) % 1, an = hash(seed * 3 + j) * TAU, rr = r * .6 * hash(seed + j * 7);
      mote([t.x + Math.cos(an) * rr, .05 + k * .1, t.z + Math.sin(an) * rr], .05 + .06 * Math.sin(k * Math.PI), P.toxin, A * (1 - smooth(.8, 1, k)), {p: [.7, .35, .5, 0], lift: .3, seed: j});
    }
  }
  function toxinInfection(t) { // NEUROTOXIN INJECTION: a pulsing poison drop hangs over the target, then pops
    const p = clamp(t.age / t.life), A = smooth(0, .1, p) * (1 - smooth(.9, 1, p)), beat = 1 + (.08 + .14 * p) * Math.sin(t.age * (6 + p * 18)), seed = hash(t.x + t.z);
    disc(RING, t.x, t.z, t.r, P.toxinShade, {alpha: .8 * A, p: [.86, .07, .4, .04], layer: 2, seed, rag: .4, soft: .2});
    disc(LIQUID, t.x, t.z, t.r * .62, P.toxin, {alpha: .5 * A, p: [.5, 2.2, 0, 0], layer: 1, seed, shine: .4});
    const top = [t.x, 1.55 + Math.sin(t.age * 4) * .06, t.z]; at(top);
    glow(top, .5 * beat, P.toxin, .35 * A, {lift: .8, bias: -.01});
    bb(DROP, [top[0], top[1] + .05, top[2]], .3 * beat, .19 * beat, P.toxin, {alpha: A, rot: Math.PI / 2, asp: .3 / .19, lift: .8, seed, shine: .6});
    for (let j = 0; j < 3; j++) { const an = t.age * 2.4 + j * TAU / 3, c = [t.x + Math.cos(an) * .6, .45 + .2 * Math.sin(t.age * 3 + j), t.z + Math.sin(an) * .6]; mote(c, .07, P.toxin, A, {p: [.7, .35, .45, 0], lift: .35, seed: j}); }
  }
  function toxinBurst(t) { // the injected poison bursts: a splash of goo, drops flung out and a puff of toxic fog
    const p = clamp(t.age / t.life), r = t.r, A = 1 - smooth(.55, 1, p), g = smooth(0, .35, p), seed = hash(t.x * 3 + t.z);
    disc(LIQUID, t.x + .1, t.z - .08, r * (.5 + g * 1.05), P.toxinShade, {alpha: .6 * A, p: [.55, 2.4, 0, 0], layer: 0, seed, dissolve: smooth(.5, 1, p), edge: .4});
    disc(LIQUID, t.x, t.z, r * (.4 + g), P.toxin, {alpha: .95 * A, p: [.55, 2.6, 0, 0], layer: 1, seed, dissolve: smooth(.5, 1, p), shine: .5});
    for (let j = 0; j < 6; j++) { const an = j * TAU / 6 + seed * 5, sp = 1.4 + .8 * hash(j + seed); thrown([t.x, .3, t.z], [Math.cos(an) * sp, 2.4 + hash(j * 3 + seed), Math.sin(an) * sp], t.age, P.toxin, .06, GOO_R, {alpha: A, seed: j, g: 10, tail: .08}); }
    const c = [t.x, .55 + p * .5, t.z]; at(c); fog(c, r * (.8 + p * .7), r * (.6 + p * .5), P.toxinShade, .75 * (1 - smooth(.3, 1, p)), {seed, dissolve: smooth(.4, 1, p), lift: .3});
  }
  function toxinBloom(t) { // PLAGUE BLOOM: a poison flower that puffs clouds of spores in rhythm
    const p = clamp(t.age / t.life), r = t.r, A = smooth(0, .08, p) * (1 - smooth(.86, 1, p)), open = smooth(0, .22, p), seed = hash(t.x * .9 + t.z * 1.3);
    disc(GLOW, t.x, t.z, r, P.toxin, {alpha: .3 * A, layer: 0, edge: 0, soft: 1});
    disc(RING, t.x, t.z, r, P.toxinShade, {alpha: .7 * A, p: [.9, .025, .6, .03], layer: 1, seed, rag: .8, soft: .2});
    const fr = 1.5 * (.35 + .65 * open), pulse = 1 + .06 * Math.sin(t.age * TAU / .45);
    disc(FLOWER, t.x + .08, t.z - .06, fr * 1.06 * pulse, P.toxinShade, {alpha: .45 * A, p: [6, 1.7, .28, seed * 6 + .26], layer: 2, seed, wobble: .1});
    disc(FLOWER, t.x, t.z, fr * pulse, P.petal, {alpha: .85 * A, p: [6, 1.7, .28, seed * 6], layer: 3, seed, rag: .3, wobble: .1});
    disc(BLOB, t.x, t.z, fr * .24, P.toxin, {alpha: A, p: [1, .3, 0, 0], layer: 4, seed, wobble: .08});
    const k = (t.age % .45) / .45, wave = Math.floor(t.age / .45);
    for (let j = 0; j < 4; j++) { // a cloud of spores rising from the flower each beat
      const an = j * TAU / 4 + wave * .9, dist = r * k * .55, c = [t.x + Math.cos(an) * dist, .3 + k * .8, t.z + Math.sin(an) * dist], s = .25 + .35 * k; at(c);
      fog(c, s, s * .8, P.spore, A * smooth(0, .15, k) * (1 - smooth(.55, 1, k)) * .85, {seed: j + wave * 3, lift: .2, dissolve: smooth(.6, 1, k)});
    }
  }
  function toxinArc(t) { // a spore drifting to a new victim
    const p = clamp(t.age / t.life), pos = q => [mix(t.x, t.tx, q), .35 + Math.sin(q * Math.PI) * .8, mix(t.z, t.tz, q)], c = pos(p); at(c);
    const pts = [], ws = []; for (let i = 0; i <= 5; i++) { pts.push(pos(Math.max(0, p - .06 * i))); ws.push(.07 * (1 - i / 5 * .8)); }
    ribbon(GLOW_R, pts, ws, P.spore, {alpha: .8, soft: .5, edge: 0, lift: .3});
    mote(c, .09, P.spore, 1, {lift: .3, bias: .01});
  }
  function toxinMiasma(t) { // CORROSIVE MIASMA: a low, wispy acid fog that creeps after the pack
    const p = clamp(t.age / t.life), r = t.r, A = smooth(0, .12, p) * (1 - smooth(.8, 1, p)), seed = hash(t.x * .37 + t.z * .11), dis = smooth(.82, 1, p);
    fogDecal(t.x, t.z, r * 1.25, P.toxinShade, .75 * A, {seed, dissolve: dis});
    fogDecal(t.x, t.z, r * .85, P.toxin, .45 * A, {seed: seed + 1, dissolve: dis, layer: 1});
    for (let j = 0; j < 3; j++) {
      const an = j * TAU / 3 + t.age * .4, rr = r * .35, c = [t.x + Math.cos(an) * rr, .45 + .1 * Math.sin(t.age * 1.3 + j), t.z + Math.sin(an) * rr]; at(c);
      fog(c, r * .95, r * .55, j ? P.toxinShade : P.toxin, .6 * A, {seed: seed + j * 2, dissolve: dis, lift: .2, p: [.5, .8, .15, 0]});
    }
    for (let j = 0; j < 3; j++) { const k = (t.age * 1.3 + j / 3) % 1, an = hash(seed + j * 4) * TAU, rr = r * .7 * hash(j + seed); mote([t.x + Math.cos(an) * rr, .06 + k * .12, t.z + Math.sin(an) * rr], .05 + .05 * Math.sin(k * Math.PI), P.toxin, A * (1 - smooth(.8, 1, k)), {p: [.7, .35, .5, 0], lift: .3, seed: j}); }
  }
  // ---------------------------------------------------------------- Frost: faceted crystals, a spinning drill, snowy breath
  function frostCrystal(t) { // Frost Spike: a faceted ice shard drawing a trail of cold mist
    const d = [t.dx, 0, t.dz], c = [t.x, .44, t.z], A = clamp((t.life - t.age) * 6) * smooth(0, .05, t.age), sd = hash(t.x * 5 + t.z);
    at(c); shadow(t.x, t.z, .2, .2 * A);
    streak(GLOW_R, addv(c, d, -.1), [-d[0], .03, -d[2]], Math.min(.9, (t.speed || 9) * t.age), .1, P.frost, {alpha: .8 * A, seed: sd, soft: .5, edge: 0, flutter: .3, lift: .2});
    aim(SHARD, c, d, .34, .14, P.frost, {alpha: A, p: [.36, 1, 0, 0], seed: sd, bias: .02, lift: .25});
  }
  function frostBorer(t) { // GLACIAL BORER: a spinning ice drill wrapped in a spiral of frosty wind
    const d = [t.dx, 0, t.dz], p = [t.x, .55, t.z], A = clamp((t.life - t.age) * 5) * smooth(0, .06, t.age), sd = hash(t.x + t.z * 3), R = t.r;
    at(p); shadow(t.x, t.z, R * 1.2, .24 * A);
    decal(RIBBON, t.x - d[0] * 1.2, t.z - d[2] * 1.2, d[0], d[2], 1.2, R * .8, P.frost, {alpha: .45 * A, p: [.8, 1, 0, .4], layer: 1, seed: sd, soft: .6, edge: .2});
    streak(GLOW_R, addv(p, d, -R * .6), [-d[0], .02, -d[2]], Math.min(2, (t.speed || 7) * t.age), R * .55, P.frost, {alpha: .55 * A, seed: sd + 1, soft: .6, edge: 0, flutter: .2, lift: .25});
    const side = norm(cross3(d, [0, 1, 0])) || [1, 0, 0];
    for (let s = 0; s < 2; s++) { // wind spiralling round the drill
      const pts = [], ws = [];
      for (let j = 0; j <= 12; j++) { const f = j / 12, an = s * Math.PI + f * 9 - now * 16, rad = R * (.35 + .75 * f), q = addv(p, d, R * 1.1 - f * R * 2.6);
        pts.push([q[0] + side[0] * Math.cos(an) * rad, q[1] + Math.sin(an) * rad * .8, q[2] + side[2] * Math.cos(an) * rad]); ws.push(R * .07 * (1 - f * .6)); }
      ribbon(GLOW_R, pts, ws, P.foam, {alpha: .75 * A, seed: sd + s, soft: .4, edge: 0, lift: .3});
    }
    aim(DRILL, p, d, R * 1.4, R * .78, P.frost, {alpha: A, p: [now * 3.2, 2.2, 0, 0], seed: sd, bias: .02, lift: .3});
  }
  function frostCone(t) { // WHITEOUT BREATH: a cone of freezing breath full of drifting snow
    const p = clamp(t.age / t.life), A = smooth(0, .12, p) * (1 - smooth(.78, 1, p)), L = t.length * (.35 + .65 * smooth(0, .22, p)), ang = t.angle, d = [t.dx, 0, t.dz], yaw = Math.atan2(t.dx, t.dz), sd = hash(t.x + t.z);
    decal(FAN, t.x + d[0] * L / 2, t.z + d[2] * L / 2, d[0], d[2], L / 2, L * Math.sin(ang), P.foam, {alpha: .85 * A, p: [ang, 1.4, 0, 0], layer: 1, seed: sd, rag: .5, soft: .6, edge: .3});
    for (let j = 0; j < 5; j++) { // clouds of breath rolling out along the cone
      const k = (now * .9 + j / 5) % 1, a = (hash(j * 3.3 + sd) - .5) * 1.1 * ang, dist = .5 + k * L * .85, c = [t.x + Math.sin(yaw + a) * dist, .35 + k * .3, t.z + Math.cos(yaw + a) * dist], s = .35 + k * L * .22; at(c);
      fog(c, s, s * .7, P.frost, A * smooth(0, .15, k) * (1 - smooth(.7, 1, k)) * .8, {seed: j + sd, dissolve: smooth(.6, 1, k), lift: .2, p: [.8, .7, .2, 0]});
    }
    for (let j = 0; j < 16; j++) { // snow blown along with it
      const k = (now * 1.2 + hash(j * 1.3 + sd)) % 1, a = (hash(j * 7 + sd) - .5) * 1.8 * ang, dist = .3 + k * L * .95;
      mote([t.x + Math.sin(yaw + a) * dist, .2 + .5 * hash(j * 3) + k * .2, t.z + Math.cos(yaw + a) * dist], .03 + .03 * hash(j + 5), j % 3 ? P.foam : P.frost, A * smooth(0, .1, k) * (1 - smooth(.75, 1, k)), {lift: .25, bias: .03});
    }
  }
  function frostCluster(t) { // CRYSTAL CHAINBURST: crystals erupt from a patch of frost, then shatter
    const p = clamp(t.age / t.life), r = t.r, A = 1 - smooth(.8, 1, p), grow = smooth(0, .4, p), seed = hash(t.x * 1.7 + t.z * .3), g = t.generation || 0;
    disc(LIQUID, t.x, t.z, r * (.5 + .6 * grow), P.frost, {alpha: .6 * A, p: [.6, 3, 0, 0], layer: 1, seed, shine: .6, edge: .5});
    const n = g > 0 ? 4 : 6;
    for (let j = 0; j < n; j++) {
      const an = hash(j * 5.1 + seed) * TAU, dist = j ? r * (.22 + .38 * hash(j * 2.3 + seed)) : 0, h = r * (j ? .6 + .3 * hash(j * 1.7 + seed) : 1.15) * grow, w = Math.max(.01, h * .25);
      const base = [t.x + Math.cos(an) * dist, 0, t.z + Math.sin(an) * dist]; at(base);
      const tilt = (hash(j + seed) - .5) * .7, u = screenDir(Math.PI / 2 + tilt);
      bb(COLUMN, addv(base, u, h / 2), h / 2, w, j % 2 ? P.frost : P.frostDeep, {rot: Math.PI / 2 + tilt, asp: h / 2 / w, alpha: A * (1 - smooth(.72, .95, p)), p: [.3, 0, 0, 0], seed: j, lift: .15});
    }
    if (p > .6) { const k = smooth(.6, 1, p); for (let j = 0; j < 5; j++) { const an = j * TAU / 5 + seed * 4, c = [t.x + Math.cos(an) * r * (.3 + k * .8), .25 + Math.sin(k * Math.PI) * .5, t.z + Math.sin(an) * r * (.3 + k * .8)]; at(c); aim(SHARD, c, [Math.cos(an), .5, Math.sin(an)], .15, .07, P.frost, {alpha: 1 - k, p: [.4, 1, 0, 0], seed: j, lift: .2}); } }
  }
  function frostBurst(t) { // a frozen foe shattering: a puff of frost and a few shards
    const p = clamp(t.age / t.life), r = t.r, A = 1 - smooth(.55, 1, p), q = 1 - (1 - p) ** 2, seed = hash(t.x + t.z * 5);
    const c = [t.x, .45, t.z]; at(c); fog(c, .35 + q * .4, .3 + q * .3, P.frost, .7 * A, {seed, lift: .3, dissolve: smooth(.4, 1, p)});
    for (let j = 0; j < 4; j++) { const an = j * TAU / 4 + seed * 3, s = [t.x + Math.cos(an) * r * (.1 + q * .6), .15 + Math.sin(p * Math.PI) * .45, t.z + Math.sin(an) * r * (.1 + q * .6)]; at(s); aim(SHARD, s, [Math.cos(an), .3, Math.sin(an)], .14, .06, j % 2 ? P.frost : P.frostDeep, {alpha: A, p: [.4, 1, 0, 0], seed: j, lift: .3}); }
  }
  // ---------------------------------------------------------------- Chain: painted lightning with a soft glow
  function bolt(a, b, wide, alpha, seed, rate = 24, branch = 1, lift = 0) {
    span(BOLT, a, b, wide * 3, P.chainBlue, {alpha: alpha * .5, p: [.5, .5, branch, rate], seed, lift, soft: .8, edge: 0});
    span(BOLT, a, b, wide * .6, P.chain, {alpha, p: [.5, .5, branch, rate], seed, lift, bias: .01});
  }
  function chainArc(t) { // Chain Spark: a jagged bolt hopping between foes, a flash where it lands
    const p = clamp(t.age / t.life), A = 1 - smooth(.55, 1, p), a = [t.x, .6, t.z], b = [t.tx, .6, t.tz], seed = hash(t.x * 3 + t.tz); if (Math.hypot(b[0] - a[0], b[2] - a[2]) < .05) return;
    at([(a[0] + b[0]) / 2, .6, (a[2] + b[2]) / 2]);
    const w = (t.r || .07) >= .06 ? .26 : .17; bolt(a, b, w, A, seed, 26, 1, .5);
    at(b); glow(b, .5, P.chainBlue, .7 * A, {lift: .6});
    glowDecal(t.tx, t.tz, .5, P.chainBlue, .5 * A);
  }
  function chainStrike(t) { // JUDGMENT BOLT: lightning from the sky onto the strongest foe
    const p = clamp(t.age / t.life), A = 1 - smooth(.55, 1, p), seed = hash(t.x + t.z * 9), top = [t.x + .25, 5.4, t.z - .35], bot = [t.x, .12, t.z];
    glowDecal(t.x, t.z, 1.3, P.chainBlue, .7 * A);
    disc(RING, t.x, t.z, .5 + p * .9, P.chainBlue, {alpha: A * (1 - p), p: [.86, .07, .5, .04], layer: 2, seed, soft: .3});
    at([t.x, 1.5, t.z]); bolt(top, bot, .36, A, seed, 30, 1, .5);
    at(bot); glow([t.x, .45, t.z], .9 + p * .5, P.chain, .8 * A, {lift: .7});
  }
  function chainNetwork(t) { // LIGHTNING NETWORK: the caster glows as the first node of the web
    const p = clamp(t.age / t.life), A = smooth(0, .08, p) * (1 - smooth(.8, 1, p));
    glowDecal(t.x, t.z, 1.2, P.chainBlue, .5 * A);
    glow([t.x, .5, t.z], .7 + .1 * Math.sin(now * 20), P.chainBlue, .45 * A, {lift: .3});
  }
  function chainTesla(t) { // TESLA DOMAIN: an electric field round the slime, crackling at its rim
    const p = clamp(t.age / t.life), r = t.r, A = smooth(0, .1, p) * (1 - smooth(.85, 1, p)), seed = hash(t.x + t.z);
    glowDecal(t.x, t.z, r, P.chain, .35 * A);
    disc(RING, t.x, t.z, r, P.chainBlue, {alpha: .8 * A, p: [.92, .03, .4, .04], layer: 1, seed, rag: .6, soft: .3});
    const key = Math.floor(now * 12);
    for (let j = 0; j < 4; j++) {
      const a0 = hash(key * 3.1 + j * 1.7) * TAU, a1 = a0 + .45 + hash(key + j) * .4, rr = r * .95;
      const a = [t.x + Math.cos(a0) * rr, .25, t.z + Math.sin(a0) * rr], b = [t.x + Math.cos(a1) * rr, .35, t.z + Math.sin(a1) * rr]; at(a);
      bolt(a, b, .15, A * .95, key + j, 30, 0, .2);
    }
    for (let j = 0; j < 2; j++) { const an = hash(key * 1.3 + j * 5) * TAU, b = [t.x + Math.cos(an) * r * .9, .3, t.z + Math.sin(an) * r * .9]; at(b); bolt([t.x, .5, t.z], b, .13, A * .8, key * 2 + j, 30, 0, .2); }
  }
  function chainRing(t) { // stun crackle round a foe
    const p = clamp(t.age / t.life), A = 1 - smooth(.5, 1, p), seed = hash(t.x * 4 + t.z), R = (t.r || 1) * (.6 + .4 * smooth(0, .4, p));
    glowDecal(t.x, t.z, R, P.chainBlue, .45 * A);
    disc(RING, t.x, t.z, R, P.chainBlue, {alpha: .85 * A, p: [.85, .06, .5, .06], layer: 2, seed, rag: .6, soft: .2});
  }
  // ---------------------------------------------------------------- Orbit: glossy cores whose tails follow the path they fly
  function orbitOrbs(combat) {
    const style = combat.skills?.orbit?.evo || '';
    for (const o of combat.orbs || []) {
      if (!Number.isFinite(o.x + o.z + o.r) || !cfg.visible(o.x, o.z, o.r + 1)) continue; note('orbit:orb');
      const big = style === 'power', R = big ? o.r * 1.15 : Math.max(.22, o.r * 1.4), y = (big ? .7 : .55) + .05 * Math.sin(now * 5.4 + (o.angle || 0)), c = [o.x, y, o.z];
      const pal = big ? P.orbitDeep : P.orbit, trail = pathBehind(track(o, c), big ? .28 : .32, 12), seed = hash(o.angle || 0);
      at(c); shadow(o.x, o.z, R * .85, .2);
      if (trail.length > 2) ribbon(GLOW_R, trail, trail.map((_, i) => R * .8 * Math.pow(1 - i / (trail.length - 1), .8) + .005), pal, {alpha: .8, seed, soft: .35, edge: .2, bias: -.02});
      glow(c, R * 1.9, pal, big ? .5 : .4, {bias: -.03});
      bb(BLOB, c, R, R, pal, {p: [1, .3, big ? 0 : .2, 0], seed, bias: .01, wobble: big ? .05 : 0});
    }
  }
  function orbitArc(t) { // ARC HALO: twisting strands of light linking the cores
    const a = [t.x, .55, t.z], b = [t.tx, .55, t.tz], seed = hash(t.x + t.tz * 3); if (Math.hypot(b[0] - a[0], b[2] - a[2]) < .05) return;
    at([(a[0] + b[0]) / 2, .55, (a[2] + b[2]) / 2]);
    span(RIBBON, a, b, .36, P.orbit, {alpha: .45, p: [.55, 3, .1, .25], seed: seed + 2, soft: .8, edge: 0});
    for (const k of [0, 1]) span(RIBBON, a, b, .22, k ? P.foam : P.orbit, {alpha: .95, p: [.18, 3, .55, .22], seed: seed + k * 1.7, bias: .01 * (k + 1), shine: .5});
  }
  function orbitRing(t) { // a pulse of light spreading from a core
    const p = clamp(t.age / t.life), R = (t.r || 1) * mix(.2, 1, smooth(0, .6, p)), A = 1 - smooth(.55, 1, p), seed = hash(t.x * 3 + t.z);
    glowDecal(t.x, t.z, R, P.orbit, .4 * A);
    disc(RING, t.x, t.z, R, P.orbit, {alpha: A, p: [.86, .07, .7, .03], layer: 2, seed, rag: .4, soft: .25});
  }
  // ---------------------------------------------------------------- Fire: a clear, different form for every branch
  // The living flame of the burning ground (noise rising through a soft mask, which the owner approved) is the
  // shared language: a fireball is a ball of it licking back, a meteor a rock wrapped in it, a tornado a funnel of it.
  // A ball of fire at `pos` whose flames lick back along `back` for `tail` world units (ball radius ~.8 * ball).
  function flame(pos, back, ball, tail, pal, o = {}) {
    const f = cam.f, k = back[0] * f[0] + back[1] * f[1] + back[2] * f[2], a = norm([back[0] - f[0] * k, back[1] - f[1] * k, back[2] - f[2] * k]) || cam.r;
    const len = ball + tail / 2;
    aim(FLAMEBALL, addv(pos, a, len - ball), a, len, ball, pal, o);
  }
  function fireball(t) { // Inferno: a round ball of fire, white-hot inside, its flames licking back into a short tail
    const dx = t.vx ?? (t.tx - t.x), dz = t.vz ?? (t.tz - t.z), n = Math.hypot(dx, dz) || 1, d = [dx / n, 0, dz / n];
    const c = [t.x, (t.y ?? .36) + .14, t.z], sd = hash(t.x * .7 + t.z * 1.3), tail = Math.min(.75, Math.max(0, 6 * (1.8 - (t.life ?? 1.8)))) + .08;
    at(c); shadow(t.x, t.z, .3, .24);
    glow(c, .65, P.fire, .4, {lift: .2, bias: -.03});
    flame(c, [-d[0], .12, -d[2]], .3, tail, P.fire, {p: [1.6, .55, 0, 0], seed: sd, lift: .2, edge: .7});
  }
  function fireEmber(t) { // SCATTER: a fan of small flames, each licking back along its wavy flight
    const dx = t.vx ?? 0, dz = t.vz ?? 1, sp = Math.hypot(dx, dz) || 1, life = t.life ?? 1, age = Math.max(0, 1.1 - life);
    const sd = hash(Math.round(Math.atan2(dz, dx) * 100)), wv = age * 9 + sd * 7, c = [t.x, (t.y ?? .16) + .12 * sd + .22 + .07 * Math.sin(wv) + .04 * Math.sin(age * 23 + sd * 9), t.z], fade = Math.min(1, life * 3);
    at(c);
    glow(c, .32, P.fire, .45 * fade, {bias: -.02});
    flame(c, [-dx / sp, -.63 * Math.cos(wv) / sp, -dz / sp], .12, .3, P.fire, {alpha: fade, p: [2.2, .5, 0, 0], seed: sd, edge: .6});
  }
  function smokeRise(x, z, r, k, seed, n = 3, alpha = .8) { // warm smoke rising and thinning out
    if (k <= 0 || k >= 1) return;
    for (let j = 0; j < n; j++) {
      const an = j * TAU / n + seed * 6, c = [x + Math.cos(an) * r * .3 * (1 + k), .45 + k * r * 1.2 + j * .12, z + Math.sin(an) * r * .3 * (1 + k)], s = r * (.4 + .4 * k); at(c);
      fog(c, s, s * .8, P.smoke, alpha * .75 * smooth(0, .15, k) * (1 - smooth(.5, 1, k)), {seed: seed + j, dissolve: smooth(.45, 1, k), lift: .2, p: [.6, .7, .5, 0]});
    }
  }
  // One cel puff of a particle burst: born at p0, flung along v with drag, rising, growing, then eaten away.
  function puff(p0, v, t, life, s0, s1, pal, heat0, o = {}) {
    const k = t / life; if (k <= 0 || k >= 1) return;
    const dr = o.drag ?? 3.5, m = (1 - Math.exp(-dr * t)) / dr, c = [p0[0] + v[0] * m, p0[1] + v[1] * m + (o.rise ?? 0) * t * t, p0[2] + v[2] * m];
    const sz = mix(s0, s1, 1 - Math.pow(1 - k, 2.2)), ero = smooth(o.erode ?? .35, 1, k), heat = clamp(heat0 * (1 - k * (o.cool ?? 1.6)));
    at(c); bb(PUFF, c, sz * (o.sx ?? 1), sz * (o.sy ?? 1), pal, {rot: (o.spin ?? 0) * t, alpha: o.alpha ?? 1, p: [ero, heat, o.flame ?? 0, o.smoke ?? 0], seed: o.seed ?? 0, lift: o.lift ?? .2, edge: o.edge ?? .75, soft: o.soft ?? 0, bias: o.bias ?? 0});
  }
  function fireBlast(e) { // Inferno burst: a white-hot dome swells on the ground, turns to fire and dissolves; the blast throws spinning balls of smoke outward and dust rolls along the ground
    const t = e.age, r = e.r || 1, seed = hash(e.x * .9 + e.z * 1.7), sq = Math.abs(cam.u[1]) > .05 ? Math.abs(cam.f[1]) : .62;
    glowDecal(e.x, e.z, r * 1.8, P.fire, .8 * (1 - smooth(.08, .6, t)));
    const hz = 1 - smooth(.1, .7, t); if (hz > 0) { const g = [e.x, r * .45, e.z]; at(g); glow(g, r * 2.4, P.ember, .45 * hz, {lift: .2, bias: -.2}); } // red-hot haze
    const R = r * (.12 + .93 * (1 - Math.pow(1 - clamp(t / .3), 2.2)) + .08 * smooth(.3, .7, t)), fl = smooth(.1, .3, t), heat = 1 - smooth(.15, .5, t), ero = smooth(.42, .95, t);
    if (ero < 1) { const c = [e.x, .02, e.z]; at([e.x, R * .4, e.z]); bb(DOME_FIRE, c, R * 1.35 / .9, R * 1.35 / .9, P.blaze, {p: [fl, heat, sq, ero], seed, lift: R * 2.2, edge: .7}); }
    for (let j = 0; j < 3; j++) { const k = clamp((t - .05 - j * .03) / .22); if (k > 0 && k < 1) { const q = [e.x, r * (.15 + .25 * j), e.z]; at(q); bb(GLOW, q, r * (1 + 1.6 * k), r * .06 * (1 - k), P.hot, {alpha: 1 - k, edge: 0, soft: .6, lift: r * 1.5, bias: .5}); } } // shock streaks
    for (let j = 0; j < 5; j++) { // smoke thrown out by the blast: round balls flung from the dome, slowed by the air, each spinning as a whole while it dissolves
      const a = (j / 5 + hash(j * 3.1 + seed) * .08) * TAU, u = hash(j * 1.7 + seed), el = .1 + .8 * u, born = .15 + .05 * hash(j * 4.4 + seed), sp = r * (3.5 + 2 * hash(j * 9.1 + seed));
      const dir = [Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el) * .8], p0 = [e.x + dir[0] * r * 1.05, .15 + dir[1] * r, e.z + dir[2] * r * 1.05];
      puff(p0, [dir[0] * sp, dir[1] * sp * .8, dir[2] * sp], t - born, .8 + .3 * hash(j * 6.7 + seed), r * .2, r * .42, P.smoke, 0,
        {drag: 5, rise: .2, seed: j * 7 + seed * 11, erode: 0, smoke: 1, spin: -(dir[0] * cam.r[0] + dir[2] * cam.r[2]) * .9, edge: .5, bias: -.02});
    }
    { const k = clamp((t - .06) / .5); if (k > 0 && k < 1) disc(RING, e.x, e.z, r * mix(1, 2.1, 1 - Math.pow(1 - k, 2)), P.dust, {alpha: .8 * (1 - smooth(.5, 1, k)), p: [.8, .12 * (1 - k) + .03, .5, 0], layer: 1, seed, soft: .35, edge: .4}); } // a round ring of dust rolling out
    for (let j = 0; j < 14; j++) { // ground dust rolling out from the dome's base
      const a = j * TAU / 14 + hash(j + seed) * .4, sp = r * (1.3 + .6 * hash(j * 2.3 + seed)), born = .08 + .04 * hash(j * 5.5 + seed);
      puff([e.x + Math.cos(a) * r * .8, .08, e.z + Math.sin(a) * r * .65], [Math.cos(a) * sp, .05, Math.sin(a) * sp * .8], t - born, .55 + .2 * hash(j * 6.1 + seed), r * .22, r * .4, P.dust, 0, {drag: 3.5, sx: 1.4, sy: .6, seed: j * 3 + seed * 7, erode: .3, lift: .05, edge: .15, soft: .5, alpha: .75});
    }
    if (t > .14 && t < .9) for (let j = 0; j < 8; j++) { const an = j * TAU / 8 + seed * 5 + hash(j * 7 + seed) * .6, sp = 3 + 2 * hash(j + seed); ember([e.x, .5, e.z], [Math.cos(an) * sp, 3 + 2 * hash(j * 3 + seed), Math.sin(an) * sp], t - .12, .035 + .02 * hash(j * 5 + seed), 1 - smooth(.5, .9, t), j); }
  }
  function firePatch(t, i) { // BURN: the ground keeps burning — a scorched stain, a low line of licking fire, rising embers
    const r = t.r || .8, fade = clamp((t.life ?? 1) * 2) * smooth(0, .15, t.age ?? 1), seed = hash(t.x * 1.3 + t.z * .7 + i);
    disc(LIQUID, t.x, t.z, r, P.scorch, {alpha: .55 * fade, p: [.55, 2, 1, 0], layer: 0, seed, edge: .5});
    glowDecal(t.x, t.z, r * 1.1, P.fire, .5 * fade * (.85 + .15 * Math.sin(now * 7 + i)));
    at([t.x, r * .45, t.z]); bb(FIRELINE, [t.x, r * .42, t.z], r * .8, r * .55, P.fire, {alpha: fade, asp: 1.45, p: [1.3, 0, 0, 0], seed, lift: .12, edge: .7});
    for (let j = 0; j < 4; j++) { const k = (now * .7 + j / 4 + seed) % 1, an = hash(j * 7 + seed) * TAU, rr = r * .6 * hash(j * 3 + seed); mote([t.x + Math.cos(an) * rr + Math.sin(k * 6 + j) * .06, .15 + k * 1.1, t.z + Math.sin(an) * rr], .04 * (1 - k * .6), P.hot, fade * (1 - smooth(.6, 1, k)) * smooth(0, .1, k), {lift: .2}); }
  }
  function burning(e) { // a burning foe: a small band of fire at its feet and embers drifting up
    const fade = Math.min(.95, (e.burnTime || 0) / .3), rad = e.radius || .5, id = e.id || 0; at([e.x, .18, e.z]);
    glowDecal(e.x, e.z, rad * 1.1, P.fire, .45 * fade);
    bb(FIRELINE, [e.x, .28, e.z], rad * .6, .32, P.fire, {alpha: fade, asp: 1.25, p: [1.6, 0, 0, 0], seed: id * 1.7, lift: .5, edge: .7});
    for (let j = 0; j < 2; j++) { const k = (now * .9 + j * .5 + hash(id)) % 1; mote([e.x + (j - .5) * rad * .6 + Math.sin(k * 7 + id) * .05, .3 + k * .9, e.z], .035 * (1 - k * .5), P.hot, fade * (1 - smooth(.6, 1, k)), {lift: .5}); }
  }
  function sunFall(e) { // SUNFALL CORE: a big sun, clearly a sun, sinks steadily from the sky onto its target
    const k = clamp(e.age / e.delay), R = e.s?.radius || 1.2, sz = R * 1.05, y = mix(R * 3.4 + 2.5, sz * .55 + .3, 1 - Math.pow(1 - k, 1.4)), seed = hash(e.x + e.z);
    glowDecal(e.x, e.z, R * 1.6, P.fire, .2 + .55 * k);
    disc(RING, e.x, e.z, R * 1.05, P.flame, {alpha: .3 + .5 * k, p: [.9, .04, .8, .03], layer: 2, seed, soft: .4, edge: .4});
    shadow(e.x, e.z, sz * .7, .15 + .2 * k);
    const c = [e.x, y, e.z]; at(c);
    const pulse = .5 + .5 * Math.sin(e.age * 22 + seed * 6), flash = Math.max(0, Math.sin(e.age * 9 + seed * 4)) ** 6; // the falling sun throbs and flashes, brighter as it nears the ground
    glow(c, sz * (2.6 + .5 * pulse), P.fire, .45 + .2 * pulse, {bias: -.04, lift: sz * 4});
    glow(c, sz * (1.5 + .3 * pulse), P.hot, .4 + .25 * pulse, {bias: -.03, lift: sz * 4});
    if (flash > .02) glow(c, sz * (3.4 + 1.2 * k), P.hot, flash * (.4 + .5 * k), {bias: .2, lift: sz * 5});
    glowDecal(e.x, e.z, R * (1.2 + .8 * k), P.hot, (.15 + .5 * k) * (.6 + .4 * pulse) + flash * .4 * k);
    flame(c, [0, 1, 0], sz * .78, sz * (1.2 + .6 * k), P.fire, {p: [2.6, 0, 0, 0], seed: seed + 3, bias: -.02, edge: .6}); // fire streams up behind the falling sun
    bb(SUN, c, sz, sz, P.fire, {p: [3.2, 1, 0, 0], seed, bias: .01, edge: .5});
  }
  function sunBurst(e) { // the sun lands: a flash, then a great dome of fire that swells, stays burning a while, and dissolves; shock rings race out and a ringed crater is left
    const t = e.age, R = e.r || 1.2, seed = hash(e.x + e.z * 3), sq = Math.abs(cam.u[1]) > .05 ? Math.abs(cam.f[1]) : .62, end = cfg.sunBurst + cfg.sunSmoke;
    glowDecal(e.x, e.z, R * 2.2, P.fire, .85 * (1 - smooth(.9, 1.5, t)));
    for (let j = 0; j < 2; j++) { const q = clamp((t - j * .12) / .55); if (q > 0 && q < 1) disc(RING, e.x, e.z, R * mix(.6, 2.3, 1 - Math.pow(1 - q, 2)), j ? P.dust : P.flame, {alpha: (1 - q) * .9, p: [.86, .06 * (1 - q) + .02, .6, 0], layer: 2 + j, seed: seed + j, soft: .35, edge: .4}); }
    if (t < .1) { const g = [e.x, R * .6, e.z]; at(g); glow(g, R * 3.6, P.hot, 1 - t / .1, {lift: R * 5, bias: 1}); } // the flash
    const D = R * (.3 + .85 * (1 - Math.pow(1 - clamp(t / .3), 2.2)) + .06 * Math.sin(Math.min(t, 1.1) * 9) * smooth(.3, .5, t)), heat = 1 - smooth(.1, .6, t), ero = smooth(1.05, end - .2, t);
    if (ero < 1) { const c = [e.x, .02, e.z]; at([e.x, D * .4, e.z]); glow([e.x, D * .5, e.z], D * 2.4, P.fire, .45 * (1 - ero), {lift: D * 4, bias: -.1}); bb(DOME_FIRE, c, D * 1.35 / .9, D * 1.35 / .9, P.blaze, {p: [smooth(.08, .3, t), heat * .8 + .2 * (1 - ero), sq, ero], seed, lift: D * 2.2, edge: .7}); }
    if (t < 1.4) for (let j = 0; j < 10; j++) { const an = j * TAU / 10 + seed * 4 + hash(j * 7 + seed) * .5, sp = 3.5 + 2 * hash(j + seed); ember([e.x, R * .5, e.z], [Math.cos(an) * sp, 3 + 2 * hash(j * 5 + seed), Math.sin(an) * sp], Math.max(0, t - .1), .05 + .025 * hash(j * 3 + seed), 1 - smooth(.7, 1.4, t), j); }
  }
  function meteorPos(e, a) { // where the rock is at fall fraction a (0 = high in the sky, 1 = impact)
    const f = cam.f, s = Math.hypot(f[0], f[2]) || 1, side = [f[2] / s, 0, -f[0] / s], o = 1 - (.35 * a + .65 * a * a);
    return [e.x + side[0] * 4.6 * o, .04 + 7 * o, e.z + side[2] * 4.6 * o];
  }
  function meteorFall(e) { // METEOR SHOWER: a big burning rock wrapped in flame, its fire streaming back and smoke trailing far behind
    const fl = e.flight ?? .55, st = e.delay - fl; if (e.age < st || e.age >= e.delay) return;
    const a = clamp((e.age - st) / fl), R = e.s?.radius || .8, seed = hash(e.x * 2 + e.z), pos = meteorPos(e, a), prev = meteorPos(e, Math.max(0, a - .06));
    disc(RING, e.x, e.z, R * .85, P.flame, {alpha: .25 + .5 * a, p: [.86, .04, .7, .03], layer: 2, seed, soft: .5, edge: .4});
    glowDecal(e.x, e.z, R, P.fire, .35 * a); shadow(e.x, e.z, R * .45 * (.4 + .6 * a), .3 * a);
    at(pos);
    const smoke = [], sw = [];
    for (let i = 0; i <= 7; i++) { smoke.push(meteorPos(e, Math.max(0, a - .06 - i * .05))); sw.push(R * (.22 + i * .08)); }
    ribbon(GLOW_R, smoke, sw, P.smoke, {alpha: .6, seed, soft: .6, edge: 0, bias: -.05});
    const back = norm([prev[0] - pos[0], prev[1] - pos[1], prev[2] - pos[2]]) || [0, 1, 0];
    glow(pos, R * .95, P.fire, .5, {bias: -.03});
    flame(pos, back, R * .62, R * 3, P.fire, {p: [2.2, .3, 0, 0], seed, bias: -.01, edge: .7});
    bb(ROCK, pos, R * .36, R * .36, P.ember, {seed, bias: .02, edge: .6});
  }
  function meteorImpact(e) { // the meteor hits: a flash, a shockwave ring and a burst of dust; rocks are thrown out on real arcs, bounce once and settle; a ringed crater is left
    const t = e.age, R = e.r || .8, seed = hash(e.x * 3 + e.z * 2), end = cfg.meteorImpact + .8;
    glowDecal(e.x, e.z, R * 1.6, P.fire, .8 * (1 - smooth(.05, .5, t)));
    if (t < .08) { const g = [e.x, R * .4, e.z]; at(g); glow(g, R * 2.6, P.hot, 1 - t / .08, {lift: R, bias: 1}); }
    { const q = clamp(t / .35); if (q < 1) disc(RING, e.x, e.z, R * mix(.4, 2.6, 1 - Math.pow(1 - q, 2.5)), P.hot, {alpha: 1 - q, p: [.84, .09 * (1 - q) + .02, .7, 0], layer: 3, seed, soft: .3, edge: .3}); } // shockwave
    { const q = clamp((t - .04) / .6); if (q > 0 && q < 1) disc(RING, e.x, e.z, R * mix(.6, 2, 1 - Math.pow(1 - q, 2)), P.dust, {alpha: .85 * (1 - q), p: [.8, .12 * (1 - q) + .03, .5, 0], layer: 2, seed: seed + 1, soft: .35, edge: .4}); }
    for (let j = 0; j < 6; j++) { // dust thrown up by the hit
      const a = j * TAU / 6 + hash(j + seed) * .5, sp = R * (2.8 + hash(j * 2.3 + seed));
      puff([e.x + Math.cos(a) * R * .3, .15, e.z + Math.sin(a) * R * .25], [Math.cos(a) * sp, R * (1 + hash(j * 3.9 + seed)), Math.sin(a) * sp * .8], t - .03, .5 + .2 * hash(j * 6.1 + seed), R * .22, R * .45, P.dustLight, .35, {drag: 4, rise: -.2, seed: j * 3 + seed * 7, erode: 0, smoke: 1, spin: -(Math.cos(a) * cam.r[0] + Math.sin(a) * cam.r[2]) * .7, edge: .5});
    }
    for (let j = 0; j < 6; j++) { // rocks flung out on arcs, one bounce, then they settle and fade
      const a = j * TAU / 6 + hash(j * 5.1 + seed) * .6, sp = R * (1.6 + 1.2 * hash(j * 1.3 + seed)), vy = 3.2 + 2 * hash(j * 8.7 + seed), g = 14, sz = R * (.12 + .1 * hash(j * 4.2 + seed));
      const t1 = 2 * vy / g, bt = t < t1 ? t : t1 + Math.min(t - t1, .6 * t1) , vy2 = vy * .35, t2 = Math.max(0, t - t1), h = t < t1 ? vy * t - g * t * t / 2 : Math.max(0, vy2 * t2 - g * t2 * t2 / 2);
      const dist = sp * (t < t1 ? t : t1 + .35 * Math.min(t2, 2 * vy2 / g)), c = [e.x + Math.cos(a) * (R * .3 + dist), .05 + sz + h, e.z + Math.sin(a) * (R * .3 + dist) * .85], A = 1 - smooth(end - .6, end - .2, t);
      if (A <= 0 || bt < 0) continue; at(c); shadow(c[0], c[2], sz * 1.3, .3 * A);
      bb(ROCK, c, sz, sz, P.stone, {p: [1, 0, 0, 0], rot: t * (4 + 6 * hash(j + seed)) * (j % 2 ? 1 : -1), alpha: A, seed: seed + j, bias: .02, edge: .6});
    }
    if (t < .7) for (let j = 0; j < 6; j++) { const an = j * TAU / 6 + seed * 5, sp = 3 + 2 * hash(j + seed); ember([e.x, .3, e.z], [Math.cos(an) * sp, 3 + 2 * hash(j * 3 + seed), Math.sin(an) * sp], t, .035, 1 - smooth(.35, .7, t), j); }
  }
  function cyclone(e) { // FLAME CYCLONE, drawn like the reference: an hourglass tornado of fire, dark and bright flame winding round it, streaks of wind circling it, a ring of fire where it meets the ground, sparks spiralling up
    const A = smooth(0, cfg.cycloneRise, e.age) * clamp((e.life ?? 1) / cfg.cycloneFade), r = e.r, seed = hash(e.x * .1 + (e.id || 0)), grow = smooth(.05, .45, e.age), h = r * 1.7 * (.25 + .75 * grow);
    const g0 = [e.x, .02, e.z], W = u => r * 1.05 * (.18 + .62 * Math.pow(smooth(.3, .9, u), 1.3) + .5 * Math.pow(1 - smooth(-.05, .35, u), 2)), at_u = u => addv(g0, cam.u, u / 1.25 * 2 * h); // the tornado's width and axis point at height u, matching its shader
    glowDecal(e.x, e.z, r * 1.7, P.fire, .7 * A);
    const c = addv([e.x, .02, e.z], cam.u, h * .68); at([e.x, h * .5, e.z]);
    glow([e.x, h * .55, e.z], r * 1.5, P.fire, .45 * A, {bias: -.06, lift: r * 2});
    bb(TORNADO, c, r * 1.05, h, P.blaze, {alpha: A, p: [1, r * 1.05 * Math.abs(cam.f[1]) / (2 * h) * 1.25, 0, 0], seed, lift: .1, edge: .6});
    const ring = (u, rad, a0, len, wid, pal, alpha, sd, lift) => { // an arc of wind or fire circling the tornado at height u, in true perspective
      const o = at_u(u), pts = [], ws = [];
      for (let i = 0; i <= 14; i++) { const f = i / 14, an = a0 - f * len; pts.push([o[0] + Math.cos(an) * rad, o[1] + Math.sin(f * Math.PI) * rad * .06, o[2] + Math.sin(an) * rad]); ws.push(wid * Math.sin(Math.min(1, f * 1.3 + .05) * Math.PI) + .004); }
      ribbon(GLOW_R, pts, ws, pal, {alpha, seed: sd, soft: .5, edge: 0, lift});
    };
    for (let j = 0; j < 6; j++) { const u = .12 + j * .14 + .04 * Math.sin(e.age * 2 + j), rad = W(u) * (1.25 + .15 * hash(j + seed)), a0 = e.age * (7 - j * .5) + j * 2.3; ring(u, rad, a0, 2.2 + .8 * hash(j * 3 + seed), r * (.045 + .02 * hash(j * 5 + seed)), j % 2 ? P.foam : P.hot, .8 * A * grow, seed + j, .15); } // streaks of wind circling it
    for (let j = 0; j < 2; j++) ring(.015, W(0) * (1.05 + .25 * j), e.age * 8 + j * 3.1, 3.4, r * .09, j ? P.fire : P.hot, .9 * A, seed + 9 + j, .05); // fire whirling where it meets the ground
    for (let j = 0; j < 6; j++) { const an = j * TAU / 6 + e.age * 3, q = [e.x + Math.cos(an) * W(0) * .95, .02, e.z + Math.sin(an) * W(0) * .95]; at(q); bb(FIRELINE, [q[0], r * .16, q[2]], r * .26, r * .2, P.fire, {alpha: A * grow, asp: 1.1, p: [1.8, 0, 0, 0], seed: seed + j, lift: .1, edge: .7}); } // tongues of fire round its foot
    for (let j = 0; j < 10; j++) { const k = (e.age * .5 + j / 10) % 1, an = e.age * 8 + j * 2.4, rr = r * (.25 + .8 * k * k), q = [e.x + Math.cos(an) * rr, .15 + k * h * 1.05, e.z + Math.sin(an) * rr * .9]; at(q); glow(q, .14, P.fire, .55 * A * (1 - k)); mote(q, .04, P.hot, A * (1 - k)); }
  }
  function fire(combat, world, hideEnemies) {
    const visible = cfg.visible;
    for (const t of combat.projectiles || []) { if (!Number.isFinite(t.x + t.z) || !visible(t.x, t.z, 2)) continue; note(t.ember ? 'fire:ember' : 'fire:fireball'); t.ember ? fireEmber(t) : fireball(t); }
    for (const e of combat.events || []) { if (!visible(e.x, e.z, 8)) continue; if (e.type === 'sun') { note('fire:sunfall'); sunFall(e); } else if (e.type === 'meteor' && e.age >= e.delay - (e.flight ?? .55)) { note('fire:meteor'); meteorFall(e); } }
    for (const e of combat.fx || []) {
      if (!visible(e.x, e.z, (e.r || 1) * 4)) continue;
      if (e.type === 'blast') { note('fire:blast'); fireBlast(e); } else if (e.type === 'sun') { note('fire:sunburst'); sunBurst(e); } else if (e.type === 'meteor') { note('fire:impact'); meteorImpact(e); }
    }
    (combat.patches || []).forEach((t, i) => { if (!visible(t.x, t.z, (t.r || 1) + 1)) return; note('fire:patch'); firePatch(t, i); });
    for (const e of combat.cyclones || []) { if (!visible(e.x, e.z, e.r * 4)) continue; note('fire:cyclone'); cyclone(e); }
    if (!hideEnemies) for (const e of world.enemies || []) { if (!(e.hp > 0 && e.burnTime > 0) || !visible(e.x, e.z, 1)) continue; note('fire:burning'); burning(e); }
  }
  function statuses(world) { // poison bubbles and frost crystals on affected foes
    for (const e of world.enemies || []) {
      if (!(e.hp > 0) || !cfg.visible(e.x, e.z, 1)) continue;
      const rad = e.radius || .5;
      if (e.poisonTime > 0) {
        note('status:poison'); glowDecal(e.x, e.z, rad * 1.1, P.toxin, .4);
        for (let j = 0; j < 2; j++) { const k = (now * .9 + j * .5 + hash(e.id || 0)) % 1; mote([e.x + (j - .5) * rad * .8, .35 + k * .7, e.z], .05 + .02 * j, P.toxin, (1 - smooth(.7, 1, k)) * smooth(0, .15, k), {p: [.7, .35, .5, 0], lift: .5, seed: j}); }
      }
      if (e.chill > 0 || e.frozen > 0) {
        note('status:frost'); const fr = e.frozen > 0;
        if (fr) disc(LIQUID, e.x, e.z, rad * 1.2, P.frost, {alpha: .6, p: [.6, 3, 0, 0], layer: 2, seed: e.id || 0, shine: .6, edge: .5});
        for (let j = 0; j < 3; j++) { const an = j * 2.094 + (e.id || 0), base = [e.x + Math.cos(an) * rad, 0, e.z + Math.sin(an) * rad * .6], h = fr ? .4 : .22, w = h * .3; at(base); bb(COLUMN, addv(base, cam.u, h / 2), h / 2, w, j % 2 ? P.frost : P.frostDeep, {rot: Math.PI / 2 + (j - 1) * .35, asp: h / 2 / w, p: [.3, 0, 0, 0], lift: .2, seed: j}); }
      }
    }
  }

  function plan(combat, world = {}, time = 0, visible = () => true, opt = {}) {
    items = []; seq = 0; diagnostics.kinds = {}; diagnostics.invalid = 0; now = time;
    if (opt.vp) setCamera(opt.vp);
    cfg = {visible, blast: opt.blast ?? 1.65, sunBurst: opt.sunBurst ?? .72, sunSmoke: opt.sunSmoke ?? 1.18, meteorImpact: opt.meteorImpact ?? 1.1, cycloneRise: Math.max(.01, opt.cycloneRise ?? .18), cycloneFade: Math.max(.01, opt.cycloneFade ?? .75)};
    waterImpacts(combat, time, visible);
    for (const t of combat.abilities || []) {
      if (t.delay > 0 || t.life <= 0 || t.age >= t.life || t.family === 'fire') continue;
      if (!Number.isFinite(t.x + t.z + t.age + t.life)) { diagnostics.invalid++; continue; }
      let x = t.x, z = t.z; const r = Math.max(t.r || 1, t.length || 0);
      if (t.kind === 'lob' || (t.family === 'toxin' && t.kind === 'arc')) { x = mix(t.x, t.tx, clamp(t.age / t.life)); z = mix(t.z, t.tz, clamp(t.age / t.life)); }
      if (!visible(x, z, r + 1.5)) continue;
      const k = t.family + ':' + t.kind; note(k);
      switch (k) {
        case 'water:bolt': waterBolt(t); break; case 'water:beam': waterBeam(t); break;
        case 'water:jet': waterJet(t); break; case 'water:wave': waterWave(t); break;
        case 'tide:ring': tideRing(t); break; case 'tide:dome': tideDome(t); break;
        case 'tide:vacuum': tideVacuum(t); break; case 'tide:resonance': tideResonance(t); break;
        case 'toxin:lob': toxinLob(t); break; case 'toxin:pool': toxinPool(t); break;
        case 'toxin:infection': toxinInfection(t); break; case 'toxin:burst': toxinBurst(t); break;
        case 'toxin:bloom': toxinBloom(t); break; case 'toxin:arc': toxinArc(t); break;
        case 'toxin:miasma': toxinMiasma(t); break;
        case 'frost:crystal': frostCrystal(t); break; case 'frost:borer': frostBorer(t); break;
        case 'frost:cone': frostCone(t); break; case 'frost:chainburst': frostCluster(t); break;
        case 'frost:burst': frostBurst(t); break;
        case 'chain:arc': chainArc(t); break; case 'chain:strike': chainStrike(t); break;
        case 'chain:network': chainNetwork(t); break; case 'chain:tesla': chainTesla(t); break;
        case 'chain:ring': chainRing(t); break;
        case 'orbit:arc': orbitArc(t); break; case 'orbit:ring': orbitRing(t); break;
        default: diagnostics.kinds[k]--; if (!diagnostics.kinds[k]) delete diagnostics.kinds[k];
      }
    }
    orbitOrbs(combat);
    fire(combat, world, !!opt.hideEnemies);
    if (!opt.hideEnemies) statuses(world);
    diagnostics.instances = items.length;
    return items;
  }

  const VERTEX = `#version 300 es
precision highp float;
layout(location=0)in vec2 aCorner;layout(location=1)in vec4 iC;layout(location=2)in vec4 iU;layout(location=3)in vec4 iV;layout(location=4)in vec4 iP;
layout(location=5)in vec4 iL;layout(location=6)in vec4 iM;layout(location=7)in vec4 iD;layout(location=8)in vec4 iE;layout(location=9)in vec4 iR;layout(location=10)in vec4 iS;
uniform mat4 uVP;out vec2 vQ;out vec2 vR;flat out vec4 vA,vP,vL,vM,vD,vE,vS;
void main(){vQ=aCorner;vA=vec4(iC.w,iU.w,iV.w,iR.w);vP=iP;vL=iL;vM=iM;vD=iD;vE=iE;vS=iS;vec3 p;
 if(iR.w>.5){vec2 s=aCorner*.5+.5;p=mix(mix(iC.xyz,iU.xyz,s.x),mix(iV.xyz,iR.xyz,s.x),s.y);vR=vec2(mix(iS.x,iS.y,s.x),aCorner.y);}
 else{p=iC.xyz+iU.xyz*aCorner.x+iV.xyz*aCorner.y;vR=aCorner;}
 gl_Position=uVP*vec4(p,1.);}`;
  const FRAGMENT = `#version 300 es
precision highp float;
in vec2 vQ;in vec2 vR;flat in vec4 vA,vP,vL,vM,vD,vE,vS;uniform float uTime,uDpr;out vec4 oC;
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
 float wob=vD.w>0.?vD.w:(k>=24?0.:.03);if(wob>0.)q+=(vec2(vn(q*1.5+seed*7.1+T*.35),vn(q*1.5+seed*3.7+11.-T*.3))-.5)*2.*wob;
 vec4 P=vP;float d=1.,tone=.5,hd=9.,fill=1.;
 float r=length(q),an=atan(q.y,q.x+1e-7);vec2 dir=q/max(r,1e-4);
 if(vA.w>.5){ // ribbons painted along a path: u runs 0 (head) to 1 (tail), v across
  float u=clamp(vR.x,0.,1.),v=vR.y,a=abs(v),len=max(vS.z,.01),ul=u*len,t=T;q=vec2(ul,v);
  if(k==30){ // water: one smooth, glassy body; a highlight flows back along it
   float wv=(vn(vec2(ul*1.6-t*2.,seed))-.5)*.14*u;
   d=(a+wv-1.)*.5+u*u*.1;
   tone=clamp(.5-a*.32+(fbm(vec2(ul*1.1-t*2.4*max(P.x,.5),v*1.2+seed))-.5)*.5-u*.1,0.,1.);
   hd=abs(v+.34-.07*sin(ul*2.5-t*7.))-.09*(1.-u)-.012+u*.25;
   float f0=P.y>0.?P.y:.55;fill=f0>=1.?1.:1.-smoothstep(f0,1.001,u);
  }else if(k==31){ // fire: flames lick back along the path and cool toward the tail
   float n=fbm(vec2(ul*2.1-t*3.,v*1.1+seed))*.65+fbm(vec2(ul*4.3-t*5.,v*2.3-seed))*.35;
   float F=(1.-a)*1.15+(n-.5)*(.5+1.1*u)-u*(P.x>0.?P.x:.95);
   d=(.08-F)*.5;tone=clamp(F*1.4+.25-u*.5,0.,1.);
  }else if(k==32){ // glow: a soft ribbon of light, mist, smoke or spores
   float n=fbm(vec2(ul*1.5-t*1.5,v+seed));
   float F=(1.-a)*(1.-u*.8)+(n-.5)*.35*(.3+u);
   if(P.x>0.)F*=smoothstep(0.,P.x,ul); // optional soft start (P.x world units), so a beam never shows a flat end
   d=(.1-F)*.5;tone=clamp(.35+F*.7,0.,1.);
  }else{ // goo: a sticky strand that thins and beads toward the tail
   float bead=.2*sin(ul*9.-t*4.)*u;
   d=(a-(1.-u*.45)*(1.+bead))*.5;tone=clamp(.62-a*.4,0.,1.);hd=abs(v+.35)-.12*(1.-u);fill=1.-smoothstep(.75,1.,u);
  }
 }else if(k==0){ // droplet / orb / bubble: a cel-shaded sphere
  d=r-.92;vec3 n=vec3(q/.92,sqrt(max(0.,1.-r*r/.8464)));
  tone=mix(.6,.06+.94*clamp(dot(n,normalize(vec3(-.42,.62,.66))),0.,1.),P.x);
  if(P.y>0.)hd=length((q-vec2(-.34,.36))/vec2(1.25,.8))-P.y;
  fill=mix(1.,.2+.8*smoothstep(.42,.92,r),P.z);
 }else if(k==1){ // brush ring
  float rr=P.x+(vn(dir*2.+seed*3.+T*.3)-.5)*P.w;
  float gap=smoothstep(.3,.12,vn(dir*3.2+seed*5.))*vE.z;
  d=abs(r-rr)-P.y*(1.-gap*.85);
  tone=.5+.2*dot(dir,vec2(-.6,.8))+(fbm(dir*2.6+vec2(r*5.,-r*3.)+seed)-.5)*.95;
  fill=mix(1.,smoothstep(rr-P.y,rr+P.y*.3,r),P.z);
 }else if(k==2){ // hanging drop, tip at +x
  d=capsule(q,vec2(-asp+.9,0.),vec2(asp,0.),.9,.03);
  tone=clamp(-d*1.55+.2-(q.x+asp)/(2.*asp)*.2,0.,1.);hd=length((q-vec2(-asp+.7,.35))/vec2(1.,.7))-.16;
 }else if(k==4){ // faceted shard (kite), tip at +x
  float xw=mix(-asp,asp,P.x);vec2 v0=vec2(asp,0.),v1=vec2(xw,.95),v2=vec2(-asp,0.),v3=vec2(xw,-.95);
  d=max(max(edge(q,v0,v1),edge(q,v1,v2)),max(edge(q,v2,v3),edge(q,v3,v0)));
  tone=q.y>0.?(q.x>xw?.78:.95):(q.x>xw?.3:.55);
  hd=seg(q,vec2(xw-.1*asp,.45),vec2(asp*.5,.16))-.07;
 }else if(k==9){ // whirlpool spiral
  float ph=an*P.y/6.28318+log(r+.03)*P.x+P.z,band=abs(fract(ph)-.5)*2.,w=P.w*(.35+.65*smoothstep(0.,.8,r));
  d=max((band-w)*max(r,.08)*3.14159/P.y,r-.92);tone=.2+.6*r+(1.-band)*.2+(fbm(dir*2.+r*4.+seed)-.5)*.5;
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
 }else if(k==17){ // flowing stripe along x (P.y flow speed)
  float x=q.x/asp,taper=smoothstep(-1.,-1.+P.w,x)*smoothstep(1.,1.-P.w,x);
  float wv=(vn(vec2(q.x*.9-T*P.y*.5,seed))-.5)*2.*P.z*taper;
  float w=P.x*taper*(.8+.4*vn(vec2(q.x*1.7-T*P.y,seed+3.))),dy=abs(q.y-wv);d=dy-w;
  tone=clamp(.3+.55*(1.-dy/max(w,1e-3))+(fbm(vec2(q.x*.5-T*P.y,q.y*2.2)+seed)-.5)*.8,0.,1.);
  hd=dy-w*.16-(fbm(vec2(q.x*.8-T*P.y*1.3,seed))-.5)*w*.3+(1.-taper)*2.;
 }else if(k==18){ // bubble dome
  vec2 p=q;if(p.y<0.)p.y/=max(P.x,.05);float rr=length(p);d=rr-.95;fill=.12+.88*smoothstep(.62,.95,rr);
  tone=clamp(.55+q.y*.3+(fbm(q*2.+seed+T*.2)-.5)*.5,0.,1.);float ah=atan(p.y,p.x);hd=(q.y>0.&&ah>1.75&&ah<2.65)?abs(rr-.8)-.035:9.;
 }else if(k==19){ // spinning drill, tip at +x: flutes wind round the cone and slide toward the tip as it turns
  float u=clamp((q.x+asp)/(2.*asp),0.,1.),w=.95*pow(1.-u,.85)+.02,f=clamp(q.y/w,-1.,1.);
  float s=fract(u*P.y*asp+asin(f)*.3-P.x);
  float ridge=smoothstep(0.,.12,s)*(1.-smoothstep(.42,.55,s));
  d=max(abs(q.y)-w*(.9+.1*ridge),-q.x-asp);
  tone=clamp(.5+f*.3+ridge*.3-(1.-ridge)*.1,0.,1.);
  hd=abs(f-.5)-.06+(1.-ridge)*.5+u*.2;
 }else if(k==20){ // standing crystal column, tip at +x
  float rf=asp*2.*P.x;vec2 v0=vec2(asp,0.),v1=vec2(asp-rf,.95),v2=vec2(-asp,.95),v3=vec2(-asp,-.95),v4=vec2(asp-rf,-.95);
  d=max(max(max(edge(q,v0,v1),edge(q,v1,v2)),max(edge(q,v2,v3),edge(q,v3,v4))),edge(q,v4,v0));
  tone=(q.y>.32?.9:q.y>-.32?.55:.22)+(q.x>asp-rf?.1:0.);hd=seg(q,vec2(-asp*.75,.62),vec2(asp-rf-.1,.62))-.06;
 }else if(k==26){ // liquid: splash, puddle, stain or frost patch (P.x wildness, P.y lobes)
  float lr=length(vQ),rr=lr/.84;vec2 dr=vQ/max(lr,1e-4);
  float n=fbm(dr*P.y+vec2(seed*7.,T*.1))*.8+fbm(vQ*2.2+seed*3.+T*.08)*.2;
  float F=(1.-rr)*1.4+(n-.5)*P.x*1.3-smoothstep(.85,1.,lr)*.8;
  d=(.1-F)*.5;tone=clamp(.12+(F-.1)*1.1,0.,1.);
  if(P.z>0.)tone=mix(tone,clamp(.5-(1.-rr)*.25+(fbm(vQ*3.1+seed*5.)-.5)*1.5,0.,1.),P.z); // a stain: mottled, not banded
 }else if(k==29){ // a sheet of water rushing forward with one white foam lip (front toward +y)
  float x=q.x/asp,t=T*P.x,ends=1.-pow(abs(x),4.);
  float front=mix(-1.05,.7+(fbm(vec2(q.x*.8+seed,t*.35))-.5)*.2,ends);
  d=max(q.y-front,-q.y-1.);
  float dep=front-q.y;
  tone=clamp(.12+dep*.38+(fbm(vec2(q.x*.35+seed,q.y*2.4-t*1.4))-.5)*.55,0.,1.);
  float sc=.5+.5*sin(q.x*5.5+vn(vec2(q.x*2.+seed,t))*3.);
  hd=abs(dep-.16)-.1-.07*sc*vn(vec2(q.x*3.1+seed,t*.8));
  fill=smoothstep(-1.,-.05,q.y)*(.75+.25*smoothstep(.9,.2,dep));
 }else if(k==35){ // drifting fog, smoke and mist: domain-warped noise with soft, wispy edges (P.x drift, P.y wisps, P.z rise)
  float t=T*P.x;vec2 p=vQ*vec2(1.,1.12);
  vec2 w=vec2(fbm(p*1.1+vec2(seed*3.1,-t*.5)),fbm(p*1.1+vec2(t*.4,seed*1.7)))-.5;
  float n=fbm(p*1.6+w*1.8+vec2(-t*.3,-t*P.z));
  float lr=length(p+w*.3);
  float F=(1.-lr)*1.3+(n-.5)*(.6+P.y);
  d=(.14-F)*.55;tone=clamp(.3+(F-.14)*.8+p.y*.18+(n-.5)*.35,0.,1.);
 }else if(k==40){ // a ball of fire licking back into a tail: the same living flame as the burning ground (ball at -x, tail toward +x; P.x speed, P.y white-hot core)
  float t=T*P.x,x0=-asp+1.,s=q.x-x0,Lt=max(asp*2.-1.,.01),s01=clamp(s/Lt,0.,1.),rho=length(q-vec2(x0,0.));
  float n0=fbm(vec2(s*1.3-t*2.6,q.y*1.9+seed))*.62+fbm(vec2(s*2.7-t*4.1,q.y*3.7-seed))*.38,rn=1.-abs(n0*2.-1.),n=n0*.55+rn*rn*.45; // ridged: tongues end in sharp tips
  float mb=1.-smoothstep(.45,.95,rho),w=.92*(1.-.6*s01),mt=s>0.?(1.-smoothstep(.2,1.,abs(q.y)/w))*pow(1.-s01,.9):0.;
  float F=max(mb,mt)*1.25+(n-.5)*1.3*(.3+s01)-.34;
  d=-F*.45;tone=clamp(F*1.25+(n-.5)*.5-s01*.25+(1.-rho)*.1,0.,1.);
  hd=P.y>0.?rho-.42*P.y-(n-.5)*.25:9.;
 }else if(k==41){ // a sun: a big round glowing disc with a calm, mottled face, wrapped in a corona of flames licking outward (P.x speed)
  float t=T*P.x,Rd=.5,gr=fbm(q*3.2+vec2(seed,t*.3))*.6+fbm(q*6.5-vec2(t*.2,seed))*.4,dd=r-Rd;
  float a0=atan(q.y,q.x),rg=1.-abs(fbm(vec2(a0*2.6+seed*9.,t*.6))*2.-1.),rg2=1.-abs(fbm(vec2(a0*5.1-seed*4.,-t*.9+r*1.5))*2.-1.);
  float L=Rd+.06+.3*pow(rg,2.5)+.12*pow(rg2,3.),n=rg2;
  float F=(L-r)/max(L-Rd,.05)*.9-.02-smoothstep(.9,.99,r)*1.6;
  d=min(dd,-F*.35);
  tone=dd<0.?clamp(.82+(gr-.5)*.35-smoothstep(.36,Rd,r)*.3,0.,1.):clamp(.12+F*.75,0.,.62);
  hd=dd<0.?length(q-vec2(-.14,.16))-.13-(gr-.5)*.06:9.;
 }else if(k==42){ // an explosion: a round fireball, white-hot at the heart, flames bursting from its rim; it cools from the edge in (P.x speed, P.y roughness, P.z heat, P.w squashes the bottom into a dome)
  float t=T*P.x;vec2 p=vQ;if(P.w>0.&&p.y<0.)p.y/=P.w;float rho=length(p);vec2 dr=p/max(rho,1e-4);
  float n=fbm(dr*2.4+seed+vec2(t*.35,-t*.3))*.65+fbm(dr*5.2-seed+vec2(-t*.6,t*.5))*.35;
  float F=(1.-rho/.8)*1.6+(n-.5)*P.y*1.25*smoothstep(.25,.85,rho)-.06-smoothstep(.84,.98,rho)*1.6;
  d=-F*.45;
  float lit=clamp(dot(vec3(p/.86,sqrt(max(0.,1.-rho*rho/.74))),vec3(-.35,.5,.79)),0.,1.);
  tone=clamp(.02+(1.-rho)*.72+lit*.3+(n-.5)*.5+(P.z-.5)*.28,0.,1.);
  hd=rho-.3*P.z*P.z-(n-.5)*.2+.04;
 }else if(k==43){ // a fire tornado seen from the game camera: an hourglass whose rings are ellipses (fronts lower, backs higher), irregular streaks winding round it, the open mouth showing its inside (base at -y; P.x speed, P.y ellipse ratio)
  float t=T*P.x,u=(vQ.y+1.)*.5*1.25-.2;
  float cx=sin(u*4.-t*1.3+seed*6.)*.06*(.3+u)+sin(u*9.-t*2.1)*.015;
  float w=.18+.62*pow(smoothstep(.3,.9,u),1.3)+.5*pow(1.-smoothstep(-.05,.35,u),2.);
  float v=(vQ.x-cx)/w,av=abs(v),cz=sqrt(max(0.,1.-v*v)),th=asin(clamp(v,-1.,1.)),e=P.y*w;
  float uf=u+e*cz,ub=u-e*cz;
  float top=.86,inside=step(top,uf)*step(ub,top);
  float uu=inside>0.?ub:uf,a=inside>0.?3.14159-th:th;
  float sp=uu*16.+a*1.6-t*5.,al=a*1.3-uu*4.;
  float sn=fbm(vec2(sp,al*.7+seed))*.7+fbm(vec2(sp*2.1,al*1.4-seed))*.3,str=smoothstep(.5,.66,sn),hot=smoothstep(.66,.78,sn);
  float ne=fbm(vec2(vQ.x*3.+seed,vQ.y*2.6-t*2.)),dk=smoothstep(.55,.66,fbm(vec2(sp*.9+7.,al*.35-seed*2.)))*(1.-str);
  float F=(1.-av)*1.2+(ne-.5)*.8-.08-step(top,ub)*2.-(1.-smoothstep(-.02,.03,uf))*3.;
  d=-F*.45;tone=clamp(.4+str*.38+cz*.1+(ne-.5)*.15+inside*.12-dk*.42-(1.-cz)*.12,0.,1.);
  hd=(1.-hot)*1.3+av*.4-.12;
 }else if(k==37){ // a bed of fire: flowing noise rises through a soft mask, so many tongues of different heights lick up and break away (base at -y)
  float t=T*P.x,y01=(vQ.y+1.)*.5,ax=abs(vQ.x);
  float n=fbm(vec2(q.x*1.9+seed,vQ.y*1.5-t*2.3))*.62+fbm(vec2(q.x*3.8-seed,vQ.y*3.1-t*3.7))*.38;
  float ax2=ax/max(.15,1.-y01*.62);
  float m=(1.-smoothstep(.25,1.,ax2))*pow(1.-y01,.9)*smoothstep(0.,.14,y01+.16*(1.-ax*ax));
  float F=m*1.25+(n-.5)*1.3*(.4+y01)-.34;
  d=-F*.45;tone=clamp(F*1.25+(n-.5)*.5+(1.-y01)*.12-ax*.15,0.,1.);fill=smoothstep(0.,.1,y01-.14*ax*ax+.015);
 }else if(k==44){ // a cel-shaded puff of fire, smoke or dust: a lit ball that noise eats away as it ages (P.x erosion 0..1, P.y heat 0..1, P.z flame streaks, P.w smoke mode: holes open in the middle first, then it breaks into thin curling wisps and darkens)
  vec2 nq=q*vec2(1.7,1.7-P.z*.9)+vec2(0.,-P.z*T*1.2);
  vec2 wq=(nq+(vec2(fbm(nq*.8+seed*3.1),fbm(nq*.8-seed*1.7))-.5)*1.2*P.w)*(1.-P.w*.45);
  float nz=fbm(wq+seed*7.3)*(.7+.25*P.w)+fbm(wq*2.1-seed*2.9)*(.3-.25*P.w),rr=r/.92,lump=fbm(dir*2.3+seed*5.)-.5;
  float lit=clamp(dot(vec3(q/.92,sqrt(max(0.,1.-rr*rr))),vec3(-.42,.56,.72)),0.,1.);
  float F=(1.-rr)*1.05+(nz-.5)*(.55+P.x*.7+P.z*.45)*(1.-P.w)+lump*.35*P.w-P.x*1.05*(1.-P.w);
  if(P.w>0.){ // smoke: the silhouette stays lumpy while the inside is eaten first, leaving a ring, then curling wisps
    float body=(1.-rr)*1.1+lump*.45,e=P.x,rim=pow(1.-abs(nz-.5)*2.,2.5);
    float keep=mix(nz,rim,smoothstep(.3,.7,e))+(rr-.5)*e*.5;
    F=min(body,(keep-mix(.2,1.05,pow(e,.8)))*1.6);
  }
  d=-F*.5;tone=clamp(lit*.75+(nz-.5)*.4+(P.y-.5)*.55+.1-P.x*P.w*.55,0.,1.);
  hd=P.y>0.?1.02-lit*P.y*1.1-(nz-.5)*.35:9.;
 }else if(k==45){ // a dome of fire on the ground: a round top over the front half of its base ellipse, flames licking up its surface (P.x flames 0..1, P.y heat 0..1, P.z base squash = sin of camera pitch, P.w erosion 0..1)
  float t=T*1.3;vec2 p=vQ*1.35,pp=vec2(p.x,p.y<0.?p.y/max(P.z,.2):p.y);float rho=length(pp)/.9,up=max(p.y,0.);
  float n=fbm(vec2(p.x*3.+seed,p.y*1.8-t*2.6))*.6+fbm(vec2(p.x*6.2-seed,p.y*3.8-t*4.))*.4;
  float F=(1.-rho)*1.2+(n-.5)*P.x*(.3+up*1.1)*step(0.,p.y)*1.3-smoothstep(1.2,1.33,max(abs(p.x),p.y))*2.;
  if(P.w>0.){float m=fbm(pp*1.6+seed*4.)*.7+fbm(pp*3.3-seed)*.3,rim=pow(1.-abs(m-.5)*2.,2.5),keep=mix(m,rim,smoothstep(.3,.7,P.w))+(rho-.5)*P.w*.5;F=min(F,(keep-mix(.2,1.05,pow(P.w,.8)))*1.6);}
  d=-F*.45;
  float lit=clamp(dot(vec3(pp/.9,sqrt(max(0.,1.-rho*rho))),vec3(-.35,.55,.76)),0.,1.);
  tone=clamp(.12+lit*.45+(n-.5)*1.3*P.x+(P.y-.5)*.5+(1.-rho)*.2,0.,1.);
  hd=1.05-P.y*1.2-lit*P.y*.3-(n-.5)*.9*P.x-up*.15*P.x;
 }else if(k==46){ // a blasted crater on the ground: rings step down to a dark, deep centre, a raised lip round the rim (P.x ring count, P.y rim lip)
  float w=r+(fbm(dir*2.2+seed)-.5)*.1+(vn(q*3.+seed)-.5)*.04;
  d=w-.92;float bands=floor(w*P.x)/P.x;
  tone=clamp(.05+bands*.85+(fbm(q*2.4+seed*3.)-.5)*.15,0.,1.);
  hd=P.y>0.?abs(w-.86)-.035*P.y:9.;
 }else if(k==38){ // soft glow: light without edges
  float lr=length(vQ);d=lr-.98;tone=clamp(1.-lr*1.15,0.,1.);fill=pow(clamp(1.-lr,0.,1.),1.5);
 }else if(k==39){ // meteor rock: a lumpy stone with glowing cracks
  float n=fbm(dir*1.8+seed);d=r-.8-(n-.5)*.35;
  float c=abs(vn(q*3.2+seed*5.)-.5);vec3 nn=vec3(q/.9,sqrt(max(0.,1.-r*r/.81)));
  float lt=clamp(dot(nn,normalize(vec3(-.4,.6,.7))),0.,1.);tone=P.x>0.?.1+lt*.8:.08+.3*lt+(1.-smoothstep(.02,.07,c))*.8; // P.x: a plain stone (no glowing cracks)
 }
 // All screen derivatives are taken before any discard (safe on every GPU, including iPad/Metal).
 float px=max(fwidth(d),1e-4),tw=max(fwidth(tone),.012),hpx=max(fwidth(hd),1e-4),unitCss=1./(px*uDpr);
 if(d>px*uDpr*6.+vE.w*.3)discard;
 float soft=vE.w;
 d+=(fbm(q*7.+seed*3.1)-.5)*px*uDpr*(2.4+vE.z*7.)*(1.-soft);
 float cover=1.-smoothstep(-max(px,soft*.22),px,d);
 tw=max(tw,soft*.14);
 float tn=clamp(tone+(fbm(q*1.6+seed*9.)-.5)*.2,0.,1.);
 float b1=smoothstep(.34-tw,.34+tw,tn),b2=smoothstep(.67-tw,.67+tw,tn);
 vec3 col=mix(mix(vD.rgb,vM.rgb,b1),vL.rgb,b2);
 col*=1.-max(0.,max(1.-abs(tn-.34)/(tw*2.2),1.-abs(tn-.67)/(tw*2.2)))*.1*(1.-soft);
 float lum=dot(vD.rgb,vec3(.3,.59,.11));vec3 pig=clamp(mix(vec3(lum),vD.rgb,1.45)*.66,0.,1.);
 // Pigment edges fade out on small shapes so little particles never look like stickers.
 float big=smoothstep(4.,18.,unitCss);
 float ow=1.2*uDpr*px,iw=clamp(unitCss*.035,1.5,4.5)*uDpr*px;
 float line=(1.-smoothstep(ow*.45,ow*1.25,-d))*vM.w*(1.-soft)*big*(.4+.6*smoothstep(.2,.6,vn(q*2.3+seed*4.)));
 float pool=(1.-smoothstep(0.,iw*1.6,-d))*vM.w*(1.-soft*.6)*big;
 col=mix(col,mix(col,vD.rgb*.92,.6),pool*.5);
 col=mix(col,pig,line*.8);
 float white=1.-smoothstep(-hpx,hpx,hd);
 if(vE.y>0.)white=max(white,smoothstep(.63,.69,fbm(q*2.2+seed*2.3))*b2*vE.y);
 col=mix(col,vec3(1.,.996,.975),white*.9);
 vec2 sp=gl_FragCoord.xy/uDpr;float g=vn(sp*.85)*.55+vn(sp*.29+7.)*.45;
 col*=1.-(g-.5)*.16*(1.-b2*.45);
 col*=1.+(fbm(vQ*1.2+seed*4.)-.5)*.07;
 float a=cover*vA.z*fill*mix(.9,1.,max(line,pool*.6));
 a*=.95+.05*g;
 float dis=vL.w;if(dis>0.){float e=fbm(vQ*2.6+seed*5.3)*1.1-.05,m=smoothstep(dis-.06,dis+.03,e);a*=m;col=mix(col,pig,(1.-smoothstep(dis,dis+.1,e))*.5*m);}
 if(a<.004)discard;oC=vec4(clamp(col,0.,1.),min(a,1.));
}`;
  const STRIDE = 40;
  let prog = null, vao = null, inst = null, cap = 0, uVP = null, uTime = null, uDpr = null, packed = new Float32Array(STRIDE * 256);
  function init() {
    const p = gl.createProgram();
    for (const [type, text] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]]) { const s = gl.createShader(type); gl.shaderSource(s, text); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error('Painted VFX shader: ' + gl.getShaderInfoLog(s)); gl.attachShader(p, s); gl.deleteShader(s); }
    gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error('Painted VFX program: ' + gl.getProgramInfoLog(p));
    prog = p; uVP = gl.getUniformLocation(p, 'uVP'); uTime = gl.getUniformLocation(p, 'uTime'); uDpr = gl.getUniformLocation(p, 'uDpr');
    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    inst = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    for (let i = 1; i <= STRIDE / 4; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 4, gl.FLOAT, false, STRIDE * 4, (i - 1) * 16); gl.vertexAttribDivisor(i, 1); }
    gl.bindVertexArray(null);
  }
  function draw(combat, world, vp, time, visible, opt = {}) {
    const list = plan(combat, world, time, visible, {...opt, vp});
    diagnostics.calls = 0; if (!gl || !list.length) return {calls: 0, triangles: 0};
    if (!prog) init();
    list.sort((a, b) => a.g - b.g || a.k - b.k || a.s - b.s);
    if (packed.length < list.length * STRIDE) packed = new Float32Array(2 ** Math.ceil(Math.log2(list.length * STRIDE)));
    for (let i = 0; i < list.length; i++) packed.set(list[i].v, i * STRIDE);
    const dpr = gl.canvas && gl.canvas.clientWidth ? gl.drawingBufferWidth / gl.canvas.clientWidth : 1;
    gl.useProgram(prog); gl.uniformMatrix4fv(uVP, false, vp); gl.uniform1f(uTime, time); gl.uniform1f(uDpr, Math.max(.5, Math.min(4, dpr || 1)));
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    const bytes = list.length * STRIDE * 4; if (bytes > cap) { cap = 2 ** Math.ceil(Math.log2(Math.max(8192, bytes))); gl.bufferData(gl.ARRAY_BUFFER, cap, gl.DYNAMIC_DRAW); }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, packed, 0, list.length * STRIDE);
    gl.disable(gl.CULL_FACE); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, list.length);
    gl.depthMask(true); gl.disable(gl.BLEND); gl.bindVertexArray(null);
    diagnostics.calls = 1; return {calls: 1, triangles: list.length * 2};
  }
  return {draw, plan, get diagnostics() { return {...diagnostics, kinds: {...diagnostics.kinds}}; }, get camera() { return {...cam}; },
    dispose() { if (gl && prog) { gl.deleteProgram(prog); gl.deleteVertexArray(vao); gl.deleteBuffer(inst); prog = null; } }};
}
