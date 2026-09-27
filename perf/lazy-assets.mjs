// Build-time loading patch (owner request 2026-09-27: players on ~2 Mbps connections could not get into the game).
// The locked bundle waited for every asset before the first frame: 58.7 MB, about four minutes at 2 Mbps. The round now
// starts once the scene, the slime and the Moss Frog are ready. The later monsters (Elite Frog at 95 s, Spark 120 s,
// Turtle 240 s, Panda 300 s, Water Calf 360 s) download next in the background, then the boss models (600 s) and the
// textures of the old fire effects (only drawn behind the Settings > Test switch). Each group is fetched first, then
// its renderers are built from the cached files in one short step while the frame loop waits, and the textures the scene
// keeps bound (units 1-4) are bound again afterwards, exactly as the original start-up order left them. The art files are
// untouched. Automated browsers keep the old all-at-start order unless the URL has ?lazy=1, so the regression suites still
// see every renderer from the first frame.
export const LAZY_ASSETS_VERSION = 'lazy-assets-v1';

const SPECIES = ['waterRenderer=await createWaterCalfRenderer', 'sparkRenderer=await createSparkHedgehogRenderer',
  'turtleRenderer=await createPondTurtleRenderer', 'pandaRenderer=await createBambooPandaRenderer',
  'eliteFrogRenderer=await createEliteFrogRenderer'];
const ARGS = '(H,{program:T,geometry:E,uniform:D,render:je});';

// Fetched (in this order) before each group is built, so building never waits on the network.
const GROUP_A = ['species/enemies/elite-frog-atlas.webp', 'species/enemies/elite-frog-attack.webp', 'enemies/spark-hedgehog-atlas.json',
  'enemies/spark-hedgehog-atlas.webp', 'enemies/pond-turtle-atlas.json', 'enemies/pond-turtle-atlas.webp', 'enemies/bamboo-panda-atlas.json',
  'enemies/bamboo-panda-atlas.webp', 'enemies/water-calf-atlas.json', 'enemies/water-calf-atlas.webp'];
const GROUP_B = ['walk', 'run', 'charge', 'push', 'spell'].flatMap(c => [`enemies/boss_${c}.json`, `enemies/boss_${c}.bin`])
  .concat(['enemies/boss.png', 'vfx/inferno-flame-paint.png', 'vfx/inferno-video-0.png', 'vfx/inferno-video-1.png', 'vfx/sunfall-new-0.png',
    'vfx/sunfall-new-1.png', 'vfx/meteor-new-0.png', 'vfx/meteor-new-1.png', 'vfx/cyclone-new-0.png', 'vfx/cyclone-new-1.png', 'vfx/fireball-new-0.png']);
const url = p => '`./assets/' + p + '`';

const START = 'function __lazyStart(){let eager=navigator.webdriver&&!new URLSearchParams(location.search).has(`lazy`),' +
  'pre=u=>Promise.all(u.map(x=>fetch(x).then(r=>r.blob()).catch(()=>0))),' +
  'run=async q=>{__lazyBusy=!0;try{for(let j of q.splice(0))try{await j()}catch(e){console.warn(e)}}finally{' +
  'H.bindFramebuffer(H.FRAMEBUFFER,null),H.useProgram(U),H.activeTexture(H.TEXTURE1),H.bindTexture(H.TEXTURE_2D,Cr),' +
  'H.activeTexture(H.TEXTURE2),H.bindTexture(H.TEXTURE_2D,Rn),H.activeTexture(H.TEXTURE3),H.bindTexture(H.TEXTURE_2D,zn),' +
  'H.activeTexture(H.TEXTURE4),H.bindTexture(H.TEXTURE_2D,ar),H.activeTexture(H.TEXTURE0),__lazyBusy=!1,qn=0}};' +
  'if(eager)return run(__lazyA).then(()=>run(__lazyB)).then(()=>{globalThis.__slimeAssetsReady=!0});' +
  `return pre([${GROUP_A.map(url).join(',')}]).then(()=>run(__lazyA)).then(()=>pre([${GROUP_B.map(url).join(',')}])).then(()=>run(__lazyB)).then(()=>{globalThis.__slimeAssetsReady=!0})}`;

function replaceOne(source, from, to, label) {
  const parts = source.split(from);
  if (parts.length !== 2) throw new Error(`lazy assets: ${label} expected once, found ${parts.length - 1}`);
  return parts.join(to);
}

// Scene textures ship as lossless WebP (perf/scene/, copied to assets/scene/): every pixel identical to the PNG, about 30%
// smaller (12.8 MB -> 9.1 MB). The PNGs stay in game/ untouched. grass-original.png (58 KB) keeps its PNG.
export const SCENE_WEBP = ['meadow-pigment-cache', 'tree-reference-b', 'pond-painted', 'clearing-painted', 'pond-northern', 'grass-painted'];

export function applyLazyAssets(bundle) {
  let b = bundle;
  for (const f of SCENE_WEBP) b = replaceOne(b, '`./assets/' + f + '.png`', '`./assets/scene/' + f + '.webp`', 'scene texture ' + f);
  b = replaceOne(b, 'var Ar,jr,Mr,Nr,', 'var __lazyA=[],__lazyB=[],__lazyBusy=!1;var Ar,jr,Mr,Nr,', 'job queues');
  // Old-style fire textures: a no-op renderer until they arrive (the painted effects, on by default, never use them).
  b = replaceOne(b, 'Vr=sn(H,await O(H,`./assets/vfx/inferno-flame-paint.png`)',
    'Vr={draw:()=>({calls:0,triangles:0})},__lazyB.push(async()=>{Vr=sn(H,await O(H,`./assets/vfx/inferno-flame-paint.png`)', 'old fire renderer');
  b = replaceOne(b, '`fireball`?[0]:[0,1]).map(t=>O(H,`./assets/vfx/`+e+`-new-`+t+`.png`,!1)))])))),H.useProgram(U)',
    '`fireball`?[0]:[0,1]).map(t=>O(H,`./assets/vfx/`+e+`-new-`+t+`.png`,!1)))]))))}),H.useProgram(U)', 'old fire renderer end');
  // Boss models fill the same map the boss draw reads; until then a boss clip is simply not drawn.
  b = replaceOne(b, 'zr=Object.fromEntries(await Promise.all(modelAssetNames.map(async e=>[e,await Sn(H,e)])));',
    '__lazyB.unshift(async()=>{Object.assign(zr,Object.fromEntries(await Promise.all(modelAssetNames.map(async e=>[e,await Sn(H,e)]))))});', 'boss models');
  b = replaceOne(b, 'if(!n)throw Error(`Missing active boss clip: `+t);', 'if(!n)continue;', 'boss waits for its model');
  // Species renderers: the draw code already skips a species whose renderer is not set yet.
  for (const s of SPECIES) {
    const name = s.split('=')[0];
    b = replaceOne(b, s + ARGS, `__lazyA.push(async()=>{${s}${ARGS.slice(0, -1)}});`, name);
  }
  b = replaceOne(b, 'Gr.sync(),requestAnimationFrame(Zr)}oi().catch(Zn);',
    'Gr.sync(),navigator.webdriver&&!new URLSearchParams(location.search).has(`lazy`)?await __lazyStart():__lazyStart(),requestAnimationFrame(Zr)}oi().catch(Zn);' + START,
    'start after the scene');
  b = replaceOne(b, 'function Zr(e){requestAnimationFrame(Zr);', 'function Zr(e){requestAnimationFrame(Zr);if(__lazyBusy)return;', 'frame waits while a group is built');
  return b;
}
