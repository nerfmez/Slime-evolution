import {readFileSync,writeFileSync} from 'node:fs';

function read(path){return readFileSync(path,'utf8')}
function write(path,text){writeFileSync(path,text)}
function once(text,from,to,label){const n=text.split(from).length-1;if(n!==1)throw new Error(`${label}: expected 1 match, got ${n}`);return text.replace(from,to)}

let main=read('main.js');
main=once(main,"import {createStageOneAnimalSprites,STAGE1_SPRITE_TYPES} from './stage1-animals.js';\n","import {createStageOneAnimalSprites,STAGE1_SPRITE_TYPES} from './stage1-animals.js';\nimport {createWaterCalfSprite} from './water-calf-sprite.js';\n",'main import Water Calf');
main=once(main,"import {loadEnemyAsset} from './enemy-assets.js';\n",'', 'remove legacy model loader');
main=once(main,"let enemyAssets={},thornSprite,animalSprites,fireVFX,soulVFX,vegetationDepth;","let enemyAssets={},thornSprite,animalSprites,waterCalfSprite,fireVFX,soulVFX,vegetationDepth;",'declare exact Water Calf sprite');
main=once(main,"  if(animalSprites)for(const e of visibleEnemies)if(e.type!=='thorn'&&STAGE1_SPRITE_TYPES.has(e.type)){const n=animalSprites.draw(e,vp,state.player);draws+=n.calls;tris+=n.triangles;}\n  gl.useProgram(prog);","  if(animalSprites)for(const e of visibleEnemies)if(e.type!=='thorn'&&e.type!=='crystal'&&STAGE1_SPRITE_TYPES.has(e.type)){const n=animalSprites.draw(e,vp,state.player);draws+=n.calls;tris+=n.triangles;}\n  if(waterCalfSprite)for(const e of visibleEnemies)if(e.type==='crystal'){const n=waterCalfSprite.draw(e,vp,state.player);draws+=n.calls;tris+=n.triangles;}\n  gl.useProgram(prog);",'draw exact Water Calf');
main=once(main,"  for(const b of enemyWorld.bullets){uniform(gl,prog,'enemySkillColor',b.color||[.45,.78,.95]);if(b.kind==='water_shot'){draw(quad,31,model(b.x,.10,b.z,.23,1,.23),.95);}else{const scale=b.kind==='seed_volley'?1.65:1;draw(crystalShard,27,model(b.x,b.kind==='seed_volley'?.52:.40,b.z,scale,scale,scale,Math.atan2(b.vx,b.vz)),1);}}","  for(const b of enemyWorld.bullets){uniform(gl,prog,'enemySkillColor',b.color||[.45,.78,.95]);if(b.kind==='water_shot'&&waterCalfSprite){const n=waterCalfSprite.drawShot(b,vp,state.player);draws+=n.calls;tris+=n.triangles;gl.useProgram(prog);}else{const scale=b.kind==='seed_volley'?1.65:1;draw(crystalShard,27,model(b.x,b.kind==='seed_volley'?.52:.40,b.z,scale,scale,scale,Math.atan2(b.vx,b.vz)),1);}}",'draw exact Water Shot');
main=once(main,"enemyAssets={boss:await loadEnemyAsset(gl,'boss')};animalSprites=await createStageOneAnimalSprites(gl);try{thornSprite=await createThornSprite(gl);}","enemyAssets={};animalSprites=await createStageOneAnimalSprites(gl);waterCalfSprite=await createWaterCalfSprite(gl);try{thornSprite=await createThornSprite(gl);}",'stop loading legacy enemy models');
write('main.js',main);

let animals=read('stage1-animals.js');
animals=once(animals,"const ATLAS_ROWS={moss:0,petal:1,crystal:2,panda:3};","const ATLAS_ROWS={moss:0,petal:1,panda:3};",'remove placeholder Water Calf row');
animals=once(animals,"const RENDER_SCALE={moss:.72,petal:.82,crystal:.86,panda:.92};","const RENDER_SCALE={moss:.72,petal:.82,panda:.92};",'remove placeholder Water Calf scale');
const elephantStart=animals.indexOf(' function elephant(f){');
const pandaStart=animals.indexOf(' function panda(f){',elephantStart);
if(elephantStart<0||pandaStart<0)throw new Error('placeholder Water Calf function not found');
animals=animals.slice(0,elephantStart)+animals.slice(pandaStart);
animals=once(animals,"for(let f=0;f<6;f++){cell(f,0,hedge);cell(f,1,turtle);cell(f,2,elephant);cell(f,3,panda);}","for(let f=0;f<6;f++){cell(f,0,hedge);cell(f,1,turtle);cell(f,3,panda);}",'remove placeholder Water Calf atlas generation');
write('stage1-animals.js',animals);

let enemies=read('enemies.js');
enemies=once(enemies," panda:{name:'Forest Panda',eliteName:'Forest Panda Alpha',stride:.88,speed:.74,radius:.50,hp:58,damage:8,eliteScale:1.38,skill:'panda_roll'},\n // Boss remains the current Stage 1 review boss while the normal ecosystem is replaced.\n boss:{name:'Ancient Bloom Colossus',stride:2.35,speed:.92,radius:1.82,hp:1200,sourceHp:12000,damage:26,skill:'boss_cycle'}\n"," panda:{name:'Forest Panda',eliteName:'Forest Panda Alpha',stride:.88,speed:.74,radius:.50,hp:58,damage:8,eliteScale:1.38,skill:'panda_roll'}\n",'remove old boss definition');
enemies=once(enemies,"  if(this.mode==='boss')return ['boss'];\n",'', 'remove old boss mode');
const spawnBossStart=enemies.indexOf(' spawnBoss(player){');
const startSkillStart=enemies.indexOf(' startSkill(e,kind,windup,radius,player){',spawnBossStart);
if(spawnBossStart<0||startSkillStart<0)throw new Error('old boss spawn block not found');
enemies=enemies.slice(0,spawnBossStart)+enemies.slice(startSkillStart);
enemies=once(enemies,"e.animState=e.isBoss?(kind==='vine_lunge'?'charge':kind==='root_slam'?'push':'spell'):'cast';e.castPose=windup+.22;\n  const bossCd={vine_lunge:4.10,root_slam:3.55,seed_volley:3.40,bloom_burst:4.00}[kind];e.skillCooldown=(bossCd||ANIMAL_COOLDOWNS[kind]||4.2)*(e.isElite&&!e.isBoss?.78:1);","e.animState='cast';e.castPose=windup+.22;\n  e.skillCooldown=(ANIMAL_COOLDOWNS[kind]||4.2)*(e.isElite?.78:1);",'remove boss cast routing');
enemies=enemies.replace(/  if\(e\.isBoss\)\{if\(distance>6\.2\)[\s\S]*?return true;\}\n/,'');
enemies=once(enemies,"  if(this.initial){if(this.mode==='boss')this.spawnBoss(player);else if(this.mode==='elites')","  if(this.initial){if(this.mode==='elites')",'remove boss initial spawn');
enemies=once(enemies,"  if(limit>0&&!this.bossSpawned&&this.time>=300&&(this.mode==='auto'||this.mode==='all'))this.spawnBoss(player);\n",'', 'remove automatic old boss spawn');
enemies=once(enemies,"  if(dead.some(e=>e.isBoss)){this.finished=true;this.noticeText='ANCIENT BLOOM DEFEATED';this.noticeTime=3.0;}\n",'', 'remove old boss defeat flow');
write('enemies.js',enemies);

let html=read('index.html');
html=once(html,'<option value="boss">Boss · Ancient Bloom</option>','', 'remove old boss test option');
html=once(html,'<option value="295">ก่อนบอส 5 วิ</option>','', 'remove boss timing option');
html=once(html,'<p>สลับได้ทันที · มุมด้านข้างและด้านบนใช้ 3D</p>','<p>เวอร์ชันทดลองนี้ใช้เฉพาะสัตว์ใหม่แบบ 2D · ไม่มีโมเดลมอนเก่า</p>','clean trial note');
write('index.html',html);

console.log('Clean new-animal source patch applied.');
