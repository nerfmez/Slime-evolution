// Cosmetic pickup actors. No combat RNG, reward values, drop rates or save keys change.
export const CRITTER = Object.freeze({roam: .48, speed: .24, swallow: .16, limit: 33.6});
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fract = n => n - Math.floor(n);
export function ensureCritter(o, canStand) {
  if (o.critter && (!canStand || o.critter.placed)) return o.critter;
  const seed = fract(Math.sin((o.id ?? o.x * 17 + o.z * 31) * 12.9898) * 43758.5453);
  const variant = {heal: 3, magnet: 4, nova: 5}[o.kind] ?? Math.floor(seed * 3);
  if (canStand && !canStand(o.x, o.z, .08)) {
    outer: for (const r of [.25, .5, .9, 1.4]) for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, x = clamp(o.x + Math.cos(a) * r, -CRITTER.limit, CRITTER.limit);
      const z = clamp(o.z + Math.sin(a) * r, -CRITTER.limit, CRITTER.limit);
      if (canStand(x, z, .08)) { o.x = x; o.z = z; break outer; }
    }
  }
  return o.critter = {...o.critter, placed: !!canStand, variant, seed, homeX: o.x, homeZ: o.z, facing: seed < .5 ? -1 : 1,
    phase: seed * Math.PI * 2, moving: 0, eating: false, eat: 0, finished: false};
}
function wander(o, dt, c, canStand) {
  c.moving = 0;
  const clock = (o.age ?? 0) + c.seed * 9;
  if (clock % 2.8 > 1.05) return;
  const angle = Math.floor(clock / 2.8) * 2.39996 + c.seed * 6.283;
  const tx = c.homeX + Math.cos(angle) * CRITTER.roam, tz = c.homeZ + Math.sin(angle) * CRITTER.roam;
  const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz);
  if (d < .015) return;
  const step = Math.min(d, CRITTER.speed * dt);
  const x = clamp(o.x + dx / d * step, -CRITTER.limit, CRITTER.limit);
  const z = clamp(o.z + dz / d * step, -CRITTER.limit, CRITTER.limit);
  if (!canStand || canStand(x, z, .08)) {
    o.x = x; o.z = z; c.facing = dx < 0 ? -1 : 1; c.moving = 1; c.phase += dt * 12;
  }
}
function swallow(o, dt, player, c) {
  c.eating = true; c.moving = 0; c.eat = Math.min(1, c.eat + dt / CRITTER.swallow);
  const f = 1 - Math.exp(-28 * dt);
  o.x += (player[0] - o.x) * f; o.z += (player[2] - o.z) * f;
  return c.eat >= 1;
}
export function attractAllCritters(combat) {
  for (const o of combat.souls) if (o.value > 0) o.critterMagnet = true;
}
export function updateCritterSouls(combat, dt, player, canStand) {
  if (!(dt > 0) || combat.choosing || combat.growth) return;
  const range = 3.4 + (combat.mods.magnet || 0) * .42;
  const mouth = .38 * Math.max(1, combat.size || 1);
  for (const o of combat.souls) {
    if (!(o.value > 0)) continue;
    const c = ensureCritter(o, canStand); o.age = (o.age || 0) + dt;
    const dx = player[0] - o.x, dz = player[2] - o.z, d = Math.hypot(dx, dz);
    if (o.age <= .12) continue;
    if (c.eating || d < mouth) {
      if (swallow(o, dt, player, c) && !c.finished) {
        c.finished = true;
        if (combat.level < 50) combat.xp += o.value * (1 + (combat.mods.soul || 0) * .05);
        o.value = 0;
      }
    } else if (d < range || o.critterMagnet) {
      const speed = o.critterMagnet ? 12 : 2.2 + 6.3 * (1 - d / range);
      const step = Math.min(d, speed * dt);
      o.x += dx / d * step; o.z += dz / d * step;
      c.moving = 1; c.facing = dx < 0 ? -1 : 1; c.phase += dt * 16;
    } else if (d < 18) wander(o, dt, c, canStand);
    else c.moving = 0;
  }
}
export function updateSpecialCritters(combat, dt, world, player, canStand) {
  if (!(dt > 0) || combat.choosing || combat.growth || world.hp <= 0 || world.finished) return;
  for (const o of combat.pickups || []) {
    if (o.done) continue;
    const c = ensureCritter(o, canStand); o.age = (o.age || 0) + dt;
    if (o.age <= .15) continue;
    const d = Math.hypot(o.x - player[0], o.z - player[2]);
    if (c.eating || d < .5 * Math.max(1, combat.size || 1)) {
      if (swallow(o, dt, player, c) && !c.finished) {
        c.finished = true; combat.collect(o, world);
      }
    } else if (d < 18) wander(o, dt, c, canStand);
    else c.moving = 0;
  }
}
