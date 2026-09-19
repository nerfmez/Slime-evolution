import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const engine=process.env.BROWSER||'chromium',url=process.env.SMOKE_URL||'http://127.0.0.1:4173/';
const errors=[],requests=[],cancellations=[];
await mkdir('test-results',{recursive:true});
const browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']}:{})});
const page=await browser.newPage({viewport:{width:640,height:480},deviceScaleFactor:1});
page.setDefaultTimeout(30000);
page.on('pageerror',e=>errors.push('JS '+e.message));
page.on('request',r=>requests.push(r.url()));
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push(`HTTP ${r.status()} ${r.url()}`)});
page.on('requestfailed',r=>{const error=r.failure()?.errorText||'failed';if(/player-slime-directions\.webp\?v=3/.test(r.url())&&/abort|cancel/i.test(error))cancellations.push(r.url());else errors.push(`NETWORK ${r.url()} ${error}`)});
await page.addInitScript(()=>{
 const raf=requestAnimationFrame.bind(window);window.__rosterQA={freeze:false,frames:0};
 window.requestAnimationFrame=cb=>raf(t=>{if(!__rosterQA.freeze){__rosterQA.frames++;cb(t)}});
 // Simulate an old saved model preference. Other preferences and keys must survive.
 localStorage.setItem('slime.graphics.v1',JSON.stringify({preset:'custom',quality:1,grass:1200,thornFrames:16,thornView:'model',ambientLife:false,showStats:true}));
 localStorage.setItem('roster-save-sentinel','keep');
});
async function capture(name){
 // A frozen software WebKit canvas can present the preceding buffer. Redraw the
 // same state and finish GPU work before capturing, as in the Water pose tests.
 await page.waitForTimeout(100);
 await page.evaluate(()=>{__slimeGameQA.draw();document.querySelector('#world').getContext('webgl2').finish()});
 await page.waitForTimeout(150);
 await page.screenshot({path:`test-results/roster-${engine}-${name}.png`,timeout:45000});
}
let report={engine,url,passed:false};
try{
 const address=new URL(url);address.searchParams.set('qa','1');
 assert.ok((await page.goto(address.href,{waitUntil:'load',timeout:60000}))?.ok());
 await page.waitForFunction(()=>document.querySelector('#error')?.hidden===false||(window.__slimeGameQA?.waterRenderer&&document.querySelector('.skill-card')),null,{timeout:60000});
 assert.equal(await page.locator('#error').evaluate(e=>e.hidden),true,await page.locator('#error').textContent());
 await page.locator('.skill-card').first().click({force:true});
 await page.waitForFunction(()=>__slimeGameQA.world.enemies.length>0,null,{timeout:30000});
 const start=await page.evaluate(()=>__rosterQA.frames);
 await page.waitForFunction(n=>__rosterQA.frames>n+3,start,{timeout:30000});
 await page.evaluate(()=>{__rosterQA.freeze=true;});await page.waitForTimeout(500);
 const result=await page.evaluate(()=>{
  const q=__slimeGameQA,w=q.world,p=q.state.player;const snapshots=[];
  for(const time of [0,75,95,120,205,240,300,360,395,480,535,599]){
   w.reset('auto',time);w.update(.05,p,100);
   snapshots.push({time,unlocked:w.unlocked(),types:[...new Set(w.enemies.filter(e=>!e.miniBoss).map(e=>e.type))],miniBosses:w.enemies.filter(e=>e.miniBoss).map(e=>e.type),count:w.enemies.length});
  }
  const modes=[];for(const mode of ['all','thorn','spark','turtle','water','elites','elite-thorn','elite-spark','elite-turtle','elite-water','moss','petal','elite-moss','elite-petal']){
   w.reset(mode,180);w.update(.05,p,100);modes.push({requested:mode,mode:w.mode,types:[...new Set(w.enemies.map(e=>e.type))],elite:w.enemies.map(e=>e.elite),count:w.enemies.length});
  }
  const denied=[];for(const[type,elite]of[['moss',false],['petal',false],['moss',true],['petal',true],['crystal',false]])denied.push(w.spawn(p,type,elite));
  w.reset('auto',0);w.update(.05,p,100);w.kills=30;w.update(.05,p,100);const earlyElite=w.enemies.some(e=>e.elite);
  const authoredElites=[];for(const time of [95,150,205,255,395,445,535,570]){w.reset('auto',time);w.update(.05,p,100);authoredElites.push(w.enemies.filter(e=>e.elite).map(e=>e.type));}
  w.reset('auto',599);w.update(.05,p,100);const normalCount=w.enemies.filter(e=>!e.boss).length;
  w.time=599.99;w.update(.05,p,100);const bossCount=w.enemies.filter(e=>e.boss).length;
  const nextId=w.serial;w.spawnClock=-100;for(let n=0;n<20;n++)w.update(.05,p,100);
  const transition={normalCount,afterNormalCount:w.enemies.filter(e=>!e.boss).length,bossCount,afterBossCount:w.enemies.filter(e=>e.boss).length,serialUnchanged:w.serial===nextId};
  return {snapshots,modes,denied,earlyElite,authoredElites,transition,models:q.modelAssets,graphics:{view:q.state.thornView,quality:q.state.quality,grass:q.state.grass,sentinel:localStorage.getItem('roster-save-sentinel')},options:[...document.querySelector('#enemy-mode').options].map(e=>e.value)};
 });
 for(const row of result.snapshots){assert.ok(row.count>0,row.time);assert.deepEqual(row.unlocked,row.time<120?['thorn']:row.time<240?['thorn','spark']:row.time<360?['thorn','spark','turtle']:['thorn','spark','turtle','water']);assert.ok(row.types.every(t=>row.unlocked.includes(t)));assert.deepEqual(row.miniBosses,[300,480].includes(row.time)?['panda']:[]);}
 for(const row of result.modes){assert.ok(row.count>0,row.requested);assert.ok(row.types.every(t=>['thorn','spark','turtle','water'].includes(t)),row.requested);}
 assert.ok(result.denied.every(v=>v===false));assert.equal(result.earlyElite,false);assert.deepEqual(result.authoredElites,[['thorn'],['thorn'],['spark'],['spark'],['turtle'],['turtle'],['water'],['water']]);
 assert.equal(result.transition.bossCount,1);assert.equal(result.transition.afterBossCount,1);assert.equal(result.transition.serialUnchanged,true);
 assert.deepEqual(result.models,['boss_walk','boss_run','boss_charge','boss_push','boss_spell']);
 assert.deepEqual(result.graphics,{view:'sprite',quality:1,grass:1200,sentinel:'keep'});
 assert.deepEqual(result.options,['auto','all','thorn','spark','turtle','water','elites','elite-thorn','elite-spark','elite-turtle','elite-water','panda','boss']);
 const attacks=[];
 for(const[name,combo,distance]of[['vine_lunge',0,9],['root_slam',0,4],['seed_volley',1,4],['bloom_burst',2,4]]){
  const attack=await page.evaluate(({combo,distance})=>{
   const q=__slimeGameQA,w=q.world,p=q.state.player;
   w.reset('boss');w.update(.05,p,100);const e=w.enemies[0];
   Object.assign(e,{x:p[0]+distance,z:p[2],specialCooldown:0,combo,special:null,dash:null,recovery:0,clip:'walk',clipTime:0});
   w.update(.05,p,100);const kind=e.special?.kind,hp=e.maxHP;const duration=e.special?.remaining;
   for(let i=0;i<Math.ceil(duration/.05)+1;i++)w.update(.05,p,100);
   q.state.camera='game';q.draw();document.querySelector('#world').getContext('webgl2').finish();
   return {kind,hp,dash:e.dash?.kind||null,seed:w.bullets.filter(b=>b.kind==='seed').length,hazards:w.hazards.length,clip:e.clip,gl:document.querySelector('#world').getContext('webgl2').getError()};
  },{combo,distance});
  assert.equal(attack.kind,name);assert.equal(attack.hp,12000);assert.equal(attack.gl,0);
  if(name==='vine_lunge')assert.equal(attack.dash,'vine_lunge');
  if(name==='seed_volley')assert.ok(attack.seed>=11);
  if(name==='root_slam'||name==='bloom_burst')assert.ok(attack.hazards>0);
  attacks.push(attack);await page.waitForTimeout(200);
 }
 await capture('boss');
 const death=await page.evaluate(()=>{const q=__slimeGameQA,w=q.world;w.enemies[0].hp=0;w.update(.05,q.state.player,100);return {finished:w.finished,bossDefeated:w.bossDefeated}});
 assert.deepEqual(death,{finished:true,bossDefeated:true});
 const eliteFrog=await page.evaluate(()=>{
  const q=__slimeGameQA,w=q.world,p=q.state.player;
  w.reset('elite-thorn');w.update(.05,p,100);
  const e=w.enemies[0];
  Object.assign(e,{x:p[0]-2.2,z:p[2]-.5,hit:0,windup:.24,frogAttack:.38,frogEliteFired:false});
  q.state.camera='game';q.state.paused=true;q.draw();
  const gl=document.querySelector('#world').getContext('webgl2');gl.finish();
  return {type:e.type,elite:e.elite,windup:e.windup,gl:gl.getError(),errorHidden:document.querySelector('#error').hidden};
 });
 assert.equal(eliteFrog.type,'thorn');assert.equal(eliteFrog.elite,true);assert.ok(eliteFrog.windup>0);
 assert.equal(eliteFrog.gl,0);assert.equal(eliteFrog.errorHidden,true);
 await capture('elite-frog');
 await page.evaluate(()=>{
  const q=__slimeGameQA,w=q.world,p=q.state.player,e=w.enemies[0];
  Object.assign(e,{x:p[0]-2.5,z:p[2]+1.5,windup:0,frogAttack:.22,frogEliteTongueAge:.33,frogEliteAimX:1,frogEliteAimZ:0,yaw:Math.PI/2});
  w.spawn(p,'thorn',false);const normal=w.enemies.find(n=>!n.elite);if(normal)Object.assign(normal,{x:p[0]+2,z:p[2]+2,hit:0});
  q.draw();document.querySelector('#world').getContext('webgl2').finish();
 });
 await capture('elite-frog-visible-tongue');
 for(const [label,age] of [['extend',.07],['curl',.24],['return',.59]]){
  await page.evaluate(age=>{const q=__slimeGameQA;q.world.enemies.find(e=>e.elite).frogEliteTongueAge=age;q.draw();document.querySelector('#world').getContext('webgl2').finish();},age);
  await capture('elite-frog-tongue-'+label);
 }

 assert.equal(await page.evaluate(()=>document.querySelector('#world').getContext('webgl2').getError()),0);

 const coneCombat=await page.evaluate(()=>{
  const q=__slimeGameQA,w=q.world,p=q.state.player;
  w.reset('elite-thorn');w.update(.05,p,100);const e=w.enemies[0];
  let spot;
  for(let a=0;a<96&&!spot;a++){
   const angle=a*Math.PI*2/96,x=Math.sin(angle)*4,z=Math.cos(angle)*4;
   if(Array.from({length:81},(_,i)=>q.canStand(p[0]+x*i/80,p[2]+z*i/80,e.radius)).every(Boolean))spot={x:p[0]+x,z:p[2]+z};
  }
  if(!spot)throw Error('No clear four-unit Elite Frog attack lane');
  Object.assign(e,spot,{attack:0,windup:0,frogAttack:0,hit:.3});
  w.hurt=0;const before=w.hp;w.update(.05,p,100);
  const started=e.windup>0,warningCount=w.eliteFx.length;
  // Move sideways inside the enlarged cone after aim locks.
  const dx=e.frogEliteAimX,dz=e.frogEliteAimZ;
  const target=[e.x+dx*2+dz*3,0,e.z+dz*2-dx*3];
  for(let i=0;i<26;i++){e.hit=.3;w.update(.05,target,100);}
  const impactHP=w.hp,poison=w.playerPoisonTime,fx=w.eliteFx.find(f=>f.kind==='frog-cone');
  e.attack=99;for(let i=0;i<18;i++)w.update(.05,[e.x-dx*6,0,e.z-dz*6],100);
  return {started,warningCount,impact:impactHP<before,poison,noSector:w.eliteFx.length===0,dot:w.hp<impactHP};
 });
 console.log("ELITE CONE",JSON.stringify(coneCombat));
 assert.equal(coneCombat.started,true);assert.equal(coneCombat.warningCount,0);
 assert.equal(coneCombat.impact,true);assert.ok(coneCombat.poison>2);
 assert.equal(coneCombat.noSector,true);assert.equal(coneCombat.dot,true);

 const cameras=[];
 for(const camera of ['game','side','top']){
  const state=await page.evaluate(camera=>{
   const q=__slimeGameQA,w=q.world,p=q.state.player;w.reset('all',180);w.update(.05,p,12);
   w.enemies=w.enemies.filter(e=>e.type==='thorn'||e.type==='water').slice(0,2);w.enemies.forEach((e,i)=>{e.x=p[0]-2+i*4;e.z=p[2]-.5});
   q.state.camera=camera;q.state.paused=true;q.draw();const gl=document.querySelector('#world').getContext('webgl2');gl.finish();
   return {camera,types:w.enemies.map(e=>e.type),gl:gl.getError(),errorHidden:document.querySelector('#error').hidden};
  },camera);
  assert.equal(state.gl,0);assert.equal(state.errorHidden,true);assert.deepEqual(state.types,['thorn','water']);cameras.push(state);
  await capture(camera);
 }
 // Exercise every existing skill preset through the unchanged UI/controller, with active targets.
 const skills=await page.evaluate(()=>{
  const q=__slimeGameQA;q.state.camera='game';document.getElementById('skill-test').click();
  const select=document.getElementById('lab-preset'),out=[];
  for(const option of select.options){select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));q.draw();out.push({id:option.value,targets:q.world.enemies.map(e=>e.type)});}
  document.getElementById('lab-close').click();return out;
 });
 report.skills=skills;assert.ok(skills.length>=10);
 // The skill lab lists combat targets, not the ordinary spawn pool: explicitly include the new Panda target.
 for(const skill of skills)assert.deepEqual(skill.targets,['thorn','spark','turtle','water','panda'],skill.id+' exact training targets');
 assert.ok(!requests.some(u=>/\/enemies\/(?:thorn|moss|petal|crystal)(?:[.-])/.test(u)),'no removed model/atlas requested');
 assert.ok(requests.some(u=>u.includes('/assets/species/enemies/elite-frog-atlas.webp')),'supplied Elite Frog atlas requested');
 assert.deepEqual(errors,[]);
 report={...report,passed:true,result,attacks,death,eliteFrog,cameras,skills,errors,requests,cancellations};
 console.log('ROSTER VERIFIED',JSON.stringify({engine,transition:result.transition,models:result.models,attacks:attacks.map(e=>e.kind),skills:skills.length,errors}));
}catch(e){report={...report,error:e.stack,errors,requests};console.error(JSON.stringify(report,null,2));process.exitCode=1;}
finally{await writeFile(`test-results/roster-${engine}.json`,JSON.stringify(report,null,2));await browser.close();}
