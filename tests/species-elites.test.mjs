import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {eliteEnemies} from '../species/enemy-roster.js';
import {sparkMelee,SPARK_ATTACK_LENGTH} from '../species/spark-hedgehog.js';
import {reflectEliteTurtleProjectile,TURTLE_GUARD_CHARGE,turtleShieldActive} from '../species/pond-turtle.js';
import {ATLAS_URL,WATER_ATLAS_URL,WATER_EXP_RECTS,SPECIES_EXP_FRAMES} from '../species/critters-v4/atlas.js';
import {SPECIES_EXP_SIZE,syncExpAppearance} from '../species/critters-v4/catalog.js';
import {assemble,sha256} from '../pacing/assemble.mjs';
import {applySpeciesBundle,applySpeciesHtml,SPECIES_VERSION} from '../species/assemble.mjs';
import {treeHash} from '../scripts/canon.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('all ordinary species have one larger elite; Panda remains mini-boss only',()=>{
 assert.deepEqual(Object.keys(eliteEnemies),['thorn','spark','turtle','water']);
 for(const [id,e] of Object.entries(eliteEnemies)){assert.ok(e.scale>1,id);assert.ok(e.hp>0);assert.ok(e.xp>0);assert.ok(/Elite|Alpha/.test(e.name));}
 assert.equal(eliteEnemies.panda,undefined);
});

test('EXP critter identity follows defeated species and Water uses the new elephant pair',()=>{
 assert.deepEqual(Object.keys(SPECIES_EXP_FRAMES),['thorn','spark','turtle','panda','water']);
 assert.deepEqual(SPECIES_EXP_FRAMES.water,['water_elephant_f','water_elephant_b']);assert.ok(ATLAS_URL.includes('critters-v4/atlas.webp'));assert.ok(WATER_ATLAS_URL.includes('species/critters-v4/atlas.webp')||WATER_ATLAS_URL.endsWith('/atlas.webp'));assert.equal(WATER_EXP_RECTS.length,2);
 for(const id of ['thorn','spark','turtle','water','panda']){
  const c=syncExpAppearance({value:13,sourceType:id,sourceElite:false},{seed:.9});
  assert.equal(c.sourceType,id);assert.equal(c.expSize,SPECIES_EXP_SIZE[id]);if(id==='water')assert.ok(c.expSize>=.26);
 }
 const elite=syncExpAppearance({value:42,sourceType:'thorn',sourceElite:true},{seed:.1});
 assert.ok(elite.expSize>SPECIES_EXP_SIZE.thorn);
});

test('Spark elite keeps the original dash and adds one radial lightning burst at impact',()=>{
 const damage=[];const world={playerRadius:.25,hazards:[],eliteFx:[],damage:v=>damage.push(v),moveEnemy(e,dx,dz){e.x+=dx;e.z+=dz;}};
 const e={id:1,type:'spark',elite:true,x:0,z:0,radius:.4,hp:230,yaw:0,attack:0,hit:0,walkBlend:0,walkPhase:0};
 const target=[2.6,0,0];
 for(let t=0;t<SPARK_ATTACK_LENGTH+.12;t+=.03)sparkMelee(world,e,.03,target,2.6,true,10);
 assert.equal(world.eliteFx.filter(x=>x.kind==='spark-ring').length,1);
 assert.equal(world.hazards.filter(x=>x.kind==='elite-lightning').length,1);
 assert.ok(damage.length>=1);
});

test('active Elite Turtle shell reflects a projectile toward the player; normal Turtle never does',()=>{
 const world={bullets:[],hazards:[],eliteFx:[]};
 const elite={id:7,type:'turtle',elite:true,hp:100,x:0,z:0,turtleGuardAge:TURTLE_GUARD_CHARGE+.1};
 assert.equal(turtleShieldActive(elite),true);
 assert.equal(reflectEliteTurtleProjectile(world,elite,[3,0,0],20),true);
 assert.equal(world.bullets.length,1);assert.equal(world.bullets[0].kind,'turtle-reflect');assert.ok(world.bullets[0].vx>0);assert.ok(world.bullets[0].damage>0);
 const normal={...elite,id:8,elite:false};assert.equal(reflectEliteTurtleProjectile(world,normal,[3,0,0],20),false);
});

test('runtime patch is isolated from the reviewed game tree and contains elite UI, attacks and species EXP source',async()=>{
 const c=JSON.parse(await read('CANON.json'));assert.equal(SPECIES_VERSION,'species-exp-elites-v2');
 assert.equal(await treeHash(fileURLToPath(new URL('../game',import.meta.url))),c.tree);
 assert.equal(await treeHash(fileURLToPath(new URL('../species',import.meta.url))),c.species.tree);
 assert.equal(sha256(await read('species/assemble.mjs')),c.species.assemblerSHA256);
 const pacing=assemble(await read('game/assets/main-critter-v4.js'),await read('game/index.html'));
 const bundle=applySpeciesBundle(pacing.bundle),html=applySpeciesHtml(pacing.html);
 for(const marker of ['sourceType:e.type','FElite','frog-cone','spark-ring','reflectEliteTurtleProjectile','pt(e).name','./species/critters-v4/renderer.js','if(n.type===`thorn`&&!n.boss){'])assert.ok(bundle.includes(marker),marker);
 for(const mode of ['elite-thorn','elite-spark','elite-turtle','elite-water'])assert.ok(html.includes(`value="${mode}"`),mode);
});
