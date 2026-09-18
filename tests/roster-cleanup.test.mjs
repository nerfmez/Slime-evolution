import {pandaRuntimeAdditions} from './panda-provenance.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {undoSparkBundle} from './spark-provenance.mjs';
import {undoVisualSize} from './enemy-size-provenance.mjs';
import {normalEnemies,eliteEnemies,spawnSchedule,unlockedEnemies,normalizeEnemyMode,modelAssetNames,spriteCamera} from '../game/assets/enemy-roster.js';
const root=new URL('../',import.meta.url);
const text=p=>readFile(new URL(p,root),'utf8');
const sha=b=>createHash('sha256').update(b).digest('hex');
const proof=JSON.parse(await text('docs/roster-cleanup-proof.json'));
const currentBundle=await text('game/assets/main-critter-v4.js');
const bundle=undoSparkBundle(currentBundle);
function undoCleanup(source){
 for(const e of proof.reverse){assert.equal(source.slice(e.start,e.start+e.new.length),e.new,e.label);source=source.slice(0,e.start)+e.old+source.slice(e.start+e.new.length);}
 assert.equal(sha(source),proof.beforeBundleSHA256);
 return source;
}
test('Frog + Spark + Turtle + Water, only Water Alpha; explicit unlock times unchanged',()=>{
 assert.deepEqual(Object.keys(normalEnemies),['thorn','spark','turtle','water']);assert.deepEqual(Object.keys(eliteEnemies),['water']);
 for(const t of [0,59.9])assert.deepEqual(unlockedEnemies('auto',t),['thorn']);
 for(const t of [60,119.9])assert.deepEqual(unlockedEnemies('auto',t),['thorn','spark']);
 for(const t of [120,179.9])assert.deepEqual(unlockedEnemies('auto',t),['thorn','spark','turtle']);
 for(const t of [180,240,299,300,600])assert.deepEqual(unlockedEnemies('auto',t),['thorn','spark','turtle','water']);
 assert.deepEqual(unlockedEnemies('all'),['thorn','spark','turtle','water']);assert.deepEqual(unlockedEnemies('elites'),['water']);
 assert.deepEqual(unlockedEnemies('boss'),['boss']);assert.equal(normalEnemies.thorn.hp,18);assert.equal(eliteEnemies.water.hp,314);
 assert.deepEqual(modelAssetNames,['boss_walk','boss_run','boss_charge','boss_push','boss_spell']);
 assert.deepEqual(spriteCamera('game'),[0,12,15]);assert.deepEqual(spriteCamera('side'),[0,4,18]);assert.deepEqual(spriteCamera('top'),[0,21,.1]);
});
test('old modes cannot spawn retired types or yield an empty selection; save keys are retained',()=>{
 for(const mode of ['moss','petal','crystal','elite-thorn','elite-moss','elite-petal','elite-crystal',null,{},'__proto__','constructor']){
  assert.equal(normalizeEnemyMode(mode),'auto');assert.deepEqual(unlockedEnemies(mode,0),['thorn']);
 }
 assert.equal(normalizeEnemyMode('elite-water'),'elite-water');
 assert.ok(bundle.includes('slime.graphics.v1'));assert.ok(bundle.includes('thornView:[`sprite`]'));
});
test('all unrelated candidate bytes unchanged, deleted dependencies absent and old game bundles unreachable',async()=>{
 const before=JSON.parse(await text('roster-parent-manifest.json'));
 const changed=new Set(['index.html','assets/main-critter-v4.js','review/index.html','review/slime.html','review/frames.json']);
 const removed=new Set(proof.removed.map(e=>e.path));let same=0;
 for(const entry of before){
  const path=new URL('game/'+entry.path,root);
  if(removed.has(entry.path)){await assert.rejects(readFile(path),{code:'ENOENT'});continue;}
  const bytes=await readFile(path);if(!changed.has(entry.path)){const original=entry.path==='assets/water-calf.js'?undoVisualSize(entry.path,bytes.toString('utf8')):bytes;assert.equal(sha(original),entry.sha256,entry.path);same++;}
 }
 assert.equal(same,before.length-removed.size-changed.size);
 async function paths(dir,prefix=''){let out=[];for(const e of await readdir(new URL(dir,root),{withFileTypes:true})){let p=prefix+e.name;if(e.isDirectory())out.push(...await paths(dir+e.name+'/',p+'/'));else out.push(p);}return out;}
 const actual=await paths('game/');
 assert.deepEqual(actual.sort(),[...before.map(e=>e.path).filter(p=>!removed.has(p)),'assets/enemy-roster.js','assets/spark-hedgehog.js','assets/enemies/spark-hedgehog-atlas.webp','assets/enemies/spark-hedgehog-atlas.json','assets/pond-turtle.js','assets/enemies/pond-turtle-atlas.webp','assets/enemies/pond-turtle-atlas.json',...pandaRuntimeAdditions].sort());
 for(const bad of ['petal_swoop','petal-fly','moss_pillar_line','thorn_charge','Thorn Alpha','Mossback','Petal Skitter','flightTrails'])assert.ok(!bundle.includes(bad),bad);
 assert.ok(!bundle.includes('W.thornView=`model`'));
 const html=await text('game/index.html');
 for(const old of ['moss','petal','elite-thorn','elite-moss','elite-petal','crystal','elite-crystal','model'])assert.ok(!html.includes(`value="${old}"`),old);
 assert.ok(html.includes('value="100" selected'));assert.ok(html.includes('value="300"'));
 console.log(`ROSTER PRESERVED ${same} parent files; removed ${removed.size}; registry plus the explicit Spark and Turtle modules/atlases are the only additions.`);
});
test('two-level reverse audit reconstructs the exact finished-Frog bundle, including shared systems',async()=>{
 assert.equal(sha(bundle),proof.afterBundleSHA256);
 let restored=undoCleanup(bundle);
 const prefix="import {createWaterCalfRenderer,waterRanged,tickWaterWorld,finishWaterBullets} from './water-calf.js';\n";
 const suffix='\nif(new URLSearchParams(location.search).has("qa"))globalThis.__slimeGameQA={get world(){return J},get combat(){return Y},get state(){return W},get waterRenderer(){return waterRenderer},canStand:P,draw:Qr};\n';
 assert.ok(restored.startsWith(prefix));assert.ok(restored.endsWith(suffix));restored=restored.slice(prefix.length,-suffix.length);
 for(const e of JSON.parse(await text('docs/water-calf-reverse.json'))){assert.equal(restored.slice(e.start,e.start+e.new.length),e.new,e.label);restored=restored.slice(0,e.start)+e.old+restored.slice(e.start+e.new.length);}
 assert.equal(sha(restored),JSON.parse(await text('docs/water-calf-edits.json')).baselineBundleSHA256);
});
function functions(source){
 let code='';for(const [name,next] of [['Ee','De'],['De','Oe'],['Oe','ke'],['ke','Ae'],['Ae','T']]){
  const start=source.indexOf('function '+name+'('),end=source.indexOf('function '+next+'(',start);
  assert.ok(start>=0&&end>start,name);code+=source.slice(start,end)+'\n';
 }
 return code;
}
function bossSimulation(code,kind){
 const c=vm.createContext({Math});vm.runInContext(code,c);
 return JSON.parse(vm.runInContext(`(()=>{
 const boss={type:'boss',boss:true,elite:false,hp:12000,maxHP:12000,x:0,z:0,yaw:0,radius:2.912,scale:1.6,clip:'walk',clipTime:0,anim:0,walkPhase:0,walkBlend:0,hit:0,specialCooldown:0,combo:${kind==='root_slam'?0:kind==='seed_volley'?1:2}};
 const w={enemies:[boss],player:${kind==='vine_lunge'?'[9,0,0]':'[4,0,0]'},playerRadius:.25,hp:10000,bullets:[],pendingHits:[],hazards:[],moveEnemy(e,x,z){e.x+=x;e.z+=z},damage(n){this.hp-=n}};
 const stats={speed:.92,damage:26,stride:undefined};const log=[];
 for(let frame=0;frame<100;frame++){
  ke(w,boss,.05,w.player,stats);Ae(w,.05,w.player);
  log.push({x:boss.x,z:boss.z,yaw:boss.yaw,clip:boss.clip,clipTime:boss.clipTime,anim:boss.anim,walkPhase:boss.walkPhase,special:boss.special||null,dash:boss.dash||null,recovery:boss.recovery||0,hp:w.hp,bullets:w.bullets,hazards:w.hazards});
 }
 return JSON.stringify(log);
 })()`,c));
}
test('four boss attacks match original candidate numerically across 100 simulation frames each',()=>{
 const previous=functions(undoCleanup(bundle)),current=functions(bundle);
 for(const kind of ['vine_lunge','root_slam','seed_volley','bloom_burst'])assert.deepEqual(bossSimulation(current,kind),bossSimulation(previous,kind),kind);
});
