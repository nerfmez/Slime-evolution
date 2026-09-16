import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';

function replaceOnce(text,oldText,newText,label){
 const hits=text.split(oldText).length-1;
 if(hits===0&&text.includes(newText))return text;
 if(hits!==1)throw Error(`${label}: expected 1 match, found ${hits}`);
 return text.replace(oldText,newText);
}
function replaceVariant(text,variants,newText,label){
 if(text.includes(newText))return text;
 for(const oldText of variants){if(text.includes(oldText))return replaceOnce(text,oldText,newText,label);}
 throw Error(`${label}: no supported source variant found`);
}

copyFileSync('scripts/stage1-enemies.template.js','enemies.js');
let enemies=readFileSync('enemies.js','utf8');
enemies=replaceOnce(enemies,
 "  if(this.mode!=='auto')return [this.mode];",
 "  if(this.mode.startsWith('elite-'))return [this.mode.slice(6)];\n  if(this.mode!=='auto')return [this.mode];",
 'single elite family mode');
enemies=replaceOnce(enemies,
 "  if(this.initial){if(this.mode==='boss')this.spawnBoss(player);else if(this.mode==='elites')for(const type of STAGE1_FAMILIES){this.spawnCounts[type]=1;this.spawn(player,type,{elite:true});}else if(this.mode==='auto')this.spawn(player,'thorn');else{const types=this.unlocked();for(let i=0;i<Math.min(8,limit);i++)this.spawn(player,types[i%types.length]);}this.initial=false;}",
 "  if(this.initial){if(this.mode==='boss')this.spawnBoss(player);else if(this.mode==='elites')for(const type of STAGE1_FAMILIES){this.spawnCounts[type]=1;this.spawn(player,type,{elite:true});}else if(this.mode.startsWith('elite-')){const type=this.mode.slice(6);this.spawnCounts[type]=1;for(let i=0;i<Math.min(4,limit);i++)this.spawn(player,type,{elite:true});}else if(this.mode==='auto')this.spawn(player,'thorn');else{const types=this.unlocked();for(let i=0;i<Math.min(8,limit);i++)this.spawn(player,types[i%types.length]);}this.initial=false;}",
 'single elite spawn mode');
writeFileSync('enemies.js',enemies);

let main=readFileSync('main.js','utf8');
if(!main.includes("from './stage1-animals.js'")){
 main=replaceOnce(main,
  "import {createThornSprite} from './thorn-sprite.js';",
  "import {createThornSprite} from './thorn-sprite.js';\nimport {createStageOneAnimalSprites,STAGE1_SPRITE_TYPES} from './stage1-animals.js';",
  'stage1 animal import');
}
main=replaceOnce(main,
 "let enemyAssets={},thornSprite,fireVFX,soulVFX,vegetationDepth;",
 "let enemyAssets={},thornSprite,animalSprites,fireVFX,soulVFX,vegetationDepth;",
 'animal sprite state');
main=replaceOnce(main,
 "for(const e of visibleEnemies){\n  if(e.type==='thorn'&&!e.isElite&&state.thornView==='sprite'&&state.camera==='game'&&thornSprite&&!proofCamera)continue;\n  const asset=enemyAssets[e.assetType||e.type];",
 "for(const e of visibleEnemies){\n  if(!e.isBoss&&STAGE1_SPRITE_TYPES.has(e.type))continue;\n  const asset=enemyAssets[e.assetType||e.type];",
 'skip 3d animal models');
const originalAnimalDraw=" if(state.thornView==='sprite'&&state.camera==='game'&&thornSprite&&!proofCamera){\n  for(const e of visibleEnemies)if(e.type==='thorn'&&!e.isElite){const n=thornSprite.draw(e,vp,state.player,state.thornFrames);draws+=n.calls;tris+=n.triangles;}\n  gl.useProgram(prog);\n }";
const migratedAnimalDraw=" if(state.thornView==='sprite'&&!proofCamera){\n  if(thornSprite)for(const e of visibleEnemies)if(e.type==='thorn'){const n=thornSprite.draw(e,vp,state.player,state.thornFrames);draws+=n.calls;tris+=n.triangles;}\n  if(animalSprites)for(const e of visibleEnemies)if(e.type!=='thorn'&&STAGE1_SPRITE_TYPES.has(e.type)){const n=animalSprites.draw(e,vp,state.player);draws+=n.calls;tris+=n.triangles;}\n  gl.useProgram(prog);\n }";
const finalAnimalDraw=" if(!proofCamera){\n  if(thornSprite)for(const e of visibleEnemies)if(e.type==='thorn'){const n=thornSprite.draw(e,vp,state.player,state.thornFrames);draws+=n.calls;tris+=n.triangles;}\n  if(animalSprites)for(const e of visibleEnemies)if(e.type!=='thorn'&&STAGE1_SPRITE_TYPES.has(e.type)){const n=animalSprites.draw(e,vp,state.player);draws+=n.calls;tris+=n.triangles;}\n  gl.useProgram(prog);\n }";
main=replaceVariant(main,[originalAnimalDraw,migratedAnimalDraw],finalAnimalDraw,'draw five animal sprites');
main=replaceOnce(main,
 "for(const b of enemyWorld.bullets){uniform(gl,prog,'enemySkillColor',b.color||[.45,.78,.95]);const scale=b.kind==='seed_volley'?1.65:1;draw(crystalShard,27,model(b.x,b.kind==='seed_volley'?.52:.40,b.z,scale,scale,scale,Math.atan2(b.vx,b.vz)),1);}",
 "for(const b of enemyWorld.bullets){uniform(gl,prog,'enemySkillColor',b.color||[.45,.78,.95]);if(b.kind==='water_shot'){draw(quad,31,model(b.x,.10,b.z,.23,1,.23),.95);}else{const scale=b.kind==='seed_volley'?1.65:1;draw(crystalShard,27,model(b.x,b.kind==='seed_volley'?.52:.40,b.z,scale,scale,scale,Math.atan2(b.vx,b.vz)),1);}}",
 'water shot renderer');
main=replaceOnce(main,
 "enemyAssets=Object.fromEntries(await Promise.all(Object.keys(ENEMY_TYPES).map(async key=>[key,await loadEnemyAsset(gl,key)])));try{thornSprite=await createThornSprite(gl);}catch(error){state.thornView='model';$('thorn-view').value='model';$('thorn-view').options[0].disabled=true;console.warn(error);}",
 "enemyAssets={boss:await loadEnemyAsset(gl,'boss')};animalSprites=await createStageOneAnimalSprites(gl);try{thornSprite=await createThornSprite(gl);}catch(error){console.warn(error);}",
 'load sprite animals');
main=main.replace("['thorn','moss','petal','crystal'].map(k=>ENEMY_TYPES[k].eliteName)","['thorn','moss','petal','crystal','panda'].map(k=>ENEMY_TYPES[k].eliteName)");
writeFileSync('main.js',main);

let combat=readFileSync('fire-combat.js','utf8');
combat=replaceOnce(combat,
 "if(e.type==='petal'&&e.isElite&&e.flying)applied=Math.max(1,Math.round(applied*1.5));e.hp-=applied;",
 "if(e.type==='petal'&&e.isElite&&e.flying)applied=Math.max(1,Math.round(applied*1.5));if(e.guardTime>0)applied=Math.max(1,Math.round(applied*.42));e.hp-=applied;",
 'turtle shell damage reduction');
combat=replaceOnce(combat,
 "resist=e.isBoss?.06:e.type==='moss'?(e.isElite?.18:.25):e.type==='crystal'&&e.isElite?.43:e.type==='petal'&&e.isElite?.85:e.isElite?.55:1",
 "resist=e.isBoss?.06:e.type==='petal'?(e.isElite?.12:.22):e.type==='panda'?(e.isElite?.18:.30):e.type==='crystal'?(e.isElite?.32:.55):e.type==='moss'?(e.isElite?.55:.82):e.isElite?.55:1",
 'animal push resistance');
combat=replaceOnce(combat,
 "const baseValue={thorn:2,moss:5,petal:6,crystal:10,boss:24}[e.type]||2",
 "const baseValue={thorn:3,moss:5,petal:6,crystal:7,panda:9,boss:24}[e.type]||2",
 'five animal soul values');
combat=combat.replace("const pull=dt*(e.type==='moss'?.15:.5)","const pull=dt*(e.type==='petal'?.15:e.type==='panda'?.25:.5)");
writeFileSync('fire-combat.js',combat);

let html=readFileSync('index.html','utf8');
html=html.replace('Thorn · ทดลองภาพ 2D','สัตว์ด่าน 1 · ภาพ 2D')
 .replace('<option value="sprite" selected>2D · ภาพเดิน 8 ทิศ</option><option value="model">3D · โมเดลเดิม</option>','<option value="sprite" selected>2D · เดิน / โดนตี / ใช้สกิล / ตาย</option>')
 .replace('เฟรมเดิน Thorn','เฟรมเดิน Moss Frog')
 .replace('ดูท่าเดิน Thorn','ดูท่าเดิน Moss Frog')
 .replace('ทดสอบครบ 4 ชนิด','ทดสอบครบ 5 ชนิด')
 .replace('Elite · Alpha ทั้ง 4','Alpha · ทั้ง 5 ชนิด')
 .replace('<option value="thorn">Thorn Mite</option>','<option value="thorn">Moss Frog · Poison</option>')
 .replace('<option value="moss">Mossback</option>','<option value="moss">Spark Hedgehog · Lightning</option>')
 .replace('<option value="petal">Petal Skitter</option>','<option value="petal">Pond Turtle · Guard</option>')
 .replace('<option value="crystal">Crystal Warden</option>','<option value="crystal">Water Calf · Water Shot</option><option value="panda">Forest Panda · Roll</option>');
writeFileSync('index.html',html);

let handoff=readFileSync('HANDOFF.md','utf8');
const note=`\n## Stage 1 five-animal ecosystem pass (2026-09-16)\n\nNormal Stage 1 roster is now five real-animal-derived species: Moss Frog / Poison Tongue, Spark Hedgehog / Chain Spark, Pond Turtle / Shell Guard, Water Calf / Water Shot, and Forest Panda / Roll. Each has walk, hit, cast and short death poses in the 2D animal atlas. The existing Ancient Bloom boss remains while balance is still being tuned. Internal type keys are intentionally stable (thorn/moss/petal/crystal + panda) to reduce migration risk. Animal sprites are always used even if an older local graphics save still contains the removed 3D Thorn view option.\n`;
if(!handoff.includes('Stage 1 five-animal ecosystem pass'))writeFileSync('HANDOFF.md',handoff+note);
console.log('Stage 1 five-animal roster materialized.');
