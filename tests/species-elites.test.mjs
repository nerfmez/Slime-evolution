import {execFileSync} from 'node:child_process';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {eliteEnemies,miniBossEnemies} from '../species/enemy-roster.js';
import {sparkMelee,SPARK_ATTACK_LENGTH} from '../species/spark-hedgehog.js';
import {reflectEliteTurtleProjectile,TURTLE_GUARD_CHARGE,turtleShieldActive,turtleGuard} from '../species/pond-turtle.js';
import {waterRanged} from '../species/water-calf.js';
import {ELITE_FROG_ATLAS_WIDTH,ELITE_FROG_ATLAS_HEIGHT,ELITE_FROG_FRAME,eliteFrogPose,eliteFrogLift} from '../species/elite-frog.js';
import {ATLAS_URL,WATER_ATLAS_URL,WATER_EXP_RECTS,SPECIES_EXP_FRAMES} from '../species/critters-v4/atlas.js';
import {SPECIES_EXP_SIZE,syncExpAppearance} from '../species/critters-v4/catalog.js';
import {assemble,sha256} from '../pacing/assemble.mjs';
import {applySpeciesBundle,applySpeciesHtml,SPECIES_VERSION} from '../species/assemble.mjs';
import {treeHash} from '../scripts/canon.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('ordinary Elites remain larger but now pay lower EXP; Panda is still mini-boss only',()=>{
 assert.deepEqual(Object.keys(eliteEnemies),['thorn','spark','turtle','water']);
 assert.deepEqual(Object.values(eliteEnemies).map(e=>e.xp),[18,22,28,30]);
 for(const [id,e] of Object.entries(eliteEnemies)){assert.ok(e.scale>1,id);assert.ok(e.hp>0);assert.ok(/Elite|Alpha/.test(e.name));}
 assert.equal(eliteEnemies.panda,undefined);assert.equal(miniBossEnemies.panda.xp,35);
});

test('EXP critter identity stays species-specific and Water remains visibly larger',()=>{
 assert.deepEqual(Object.keys(SPECIES_EXP_FRAMES),['thorn','spark','turtle','panda','water']);
 assert.deepEqual(SPECIES_EXP_FRAMES.water,['water_elephant_f','water_elephant_b']);assert.ok(ATLAS_URL.includes('critters-v4/atlas.webp'));assert.ok(WATER_ATLAS_URL.endsWith('/atlas.webp'));assert.equal(WATER_EXP_RECTS.length,2);
 for(const id of ['thorn','spark','turtle','water','panda']){const c=syncExpAppearance({value:8,sourceType:id,sourceElite:false},{seed:.9});assert.equal(c.sourceType,id);assert.equal(c.expSize,SPECIES_EXP_SIZE[id]);}
 assert.ok(SPECIES_EXP_SIZE.water>=.26);
});


test('supplied Elite Frog atlas has dedicated idle/hit/death, eight movement and eight tongue frames',async()=>{
 assert.equal(ELITE_FROG_ATLAS_WIDTH,1280);assert.equal(ELITE_FROG_ATLAS_HEIGHT,3520);
 assert.deepEqual(ELITE_FROG_FRAME.walk,[5,6,7,8,9,10,11,12]);assert.deepEqual(ELITE_FROG_FRAME.attack,[13,14,15,16,17,18,19,20]);
 const bytes=await readFile(new URL('../species/enemies/elite-frog-atlas.webp',import.meta.url));
 const hires=JSON.parse(await readFile(new URL('../art/elite-frog/hires-atlas-source.json',import.meta.url),'utf8'));assert.equal(sha256(bytes),hires.atlasSHA256,'body atlas is the 4x rebuild from the supplied originals');assert.equal(hires.scale,4);assert.ok(hires.frames.every(f=>f.alphaMAE<4),'every 4x frame keeps the approved silhouette');assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
 const base={hp:190,elite:true,type:'thorn',hit:0,windup:0,frogAttack:0,frogDeath:null,frogHopActive:false,frogHopPhase:0};
 assert.equal(eliteFrogPose(base),0);assert.equal(eliteFrogPose({...base,hit:.2}),1);
 assert.deepEqual([0,.13,.26].map(frogDeath=>eliteFrogPose({...base,hp:0,frogDeath})),[2,3,4]);
 assert.deepEqual([.01,.14,.27,.39,.51,.64,.76,.89].map(frogHopPhase=>eliteFrogPose({...base,frogHopActive:true,frogHopPhase})),[5,6,7,8,9,10,11,12]);
 const tongue=[.55,.45,.35,.25,.15,.05].map(windup=>eliteFrogPose({...base,hit:.3,windup,frogAttack:.38}));
 assert.deepEqual(tongue,[13,13,13,14,14,14]);assert.equal(eliteFrogPose({...base,hit:.3,frogEliteTongueAge:.3}),16);assert.equal(eliteFrogPose({...base,hit:.3,frogAttack:.20}),20);assert.equal(eliteFrogPose({...base,hit:.3,frogAttack:.01}),20);
 assert.ok(eliteFrogLift({...base,frogHopActive:true,frogHopPhase:.55})>.25);assert.equal(eliteFrogLift({...base,frogHopActive:true,frogHopPhase:.55,frogAttack:.2}),0);
});

test('Spark Elite keeps dash/burst skill active through ordinary hit-stun',()=>{
 const damage=[];const world={playerRadius:.25,hazards:[],eliteFx:[],damage:v=>damage.push(v),moveEnemy(e,dx,dz){e.x+=dx;e.z+=dz;}};
 const e={id:1,type:'spark',elite:true,x:0,z:0,radius:.4,hp:230,yaw:0,attack:0,hit:0,walkBlend:0,walkPhase:0};
 const target=[2.6,0,0];sparkMelee(world,e,.03,target,2.6,true,10);const before=e.sparkAge;e.hit=.25;sparkMelee(world,e,.03,target,2.6,true,10);assert.ok(e.sparkAge>before,'Elite hit must not cancel charge/dash');
 e.hit=0;for(let t=.06;t<SPARK_ATTACK_LENGTH+.12;t+=.03)sparkMelee(world,e,.03,target,2.6,true,10);
 assert.equal(world.eliteFx.filter(x=>x.kind==='spark-ring').length,1);assert.equal(world.hazards.filter(x=>x.kind==='elite-lightning').length,1);assert.ok(damage.length>=1);
});

test('Turtle Elite can enter Shell Guard while hit and still reflects projectiles',()=>{
 const world={bullets:[],hazards:[],eliteFx:[]},target=[3,0,0];
 const elite={id:7,type:'turtle',elite:true,hp:100,x:0,z:0,yaw:0,hit:.25,turtleGuardCooldown:0,turtleGuardRequested:true,walkBlend:1};
 assert.equal(turtleGuard(world,elite,.03,target,2,true),false);assert.equal(elite.turtleGuardAge,0);
 elite.turtleGuardAge=TURTLE_GUARD_CHARGE+.1;assert.equal(turtleShieldActive(elite),true);assert.equal(reflectEliteTurtleProjectile(world,elite,target,20),true);
 assert.equal(world.bullets.at(-1).kind,'turtle-reflect');
});

test('Water Alpha continues charge timing while hit',()=>{
 const world={bullets:[]},e={id:3,type:'water',elite:true,hp:100,x:0,z:0,yaw:0,hit:.25,attack:0,windup:0,waterShotPose:0,radius:.5};
 assert.equal(waterRanged(world,e,.03,[3,0,0],3,true,10),false);assert.ok(e.windup>.8);
 const before=e.windup;waterRanged(world,e,.03,[3,0,0],3,true,10);assert.ok(e.windup<before,'hit does not freeze Elite charge clock');
});

test('runtime patch keeps Frog Elite attack through hits and reduces fallback/boss EXP',async()=>{
 const c=JSON.parse(await read('CANON.json'));assert.equal(SPECIES_VERSION,'species-exp-elites-v4');
 assert.equal(await treeHash(fileURLToPath(new URL('../game',import.meta.url))),c.tree);
 assert.equal(await treeHash(fileURLToPath(new URL('../species',import.meta.url))),c.species.tree);
 assert.equal(sha256(await read('species/assemble.mjs')),c.species.assemblerSHA256);
 const pacing=assemble(await read('game/assets/main-critter-v4.js'),await read('game/index.html'));
 const bundle=applySpeciesBundle(pacing.bundle),html=applySpeciesHtml(pacing.html);
 execFileSync(process.execPath,["--check","--input-type=module"],{input:bundle});
 for(const marker of ['sourceType:e.type','FElite','frog-cone','spark-ring','reflectEliteTurtleProjectile','pt(e).name','./species/critters-v4/renderer.js','./species/elite-frog.js','createEliteFrogRenderer','eliteFrogRenderer.draw','if(n.type===`thorn`&&!n.boss){','xp:28,scale:1.6'])assert.ok(bundle.includes(marker),marker);
 assert.ok(!bundle.includes('if(n.hit>0){n.windup=0,n.frogAttack=0'));
 assert.ok(bundle.includes('e.hit>0&&!(e.elite&&(e.frogAttack||0)>0)'));
 assert.ok(bundle.includes('{thorn:1,spark:2,turtle:3,water:4,panda:8}'));
 for(const mode of ['elite-thorn','elite-spark','elite-turtle','elite-water'])assert.ok(html.includes(`value="${mode}"`),mode);
});
