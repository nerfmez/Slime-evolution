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
  for(const time of [0,59,60,119,120,179,180,240,299]){
   w.reset('auto',time);w.update(.05,p,100);
   snapshots.push({time,unlocked:w.unlocked(),types:[...new Set(w.enemies.map(e=>e.type))],count:w.enemies.length});
  }
  const modes=[];for(const mode of ['all','thorn','water','elites','elite-water','moss','petal','elite-thorn','elite-moss','elite-petal']){
   w.reset(mode,180);w.update(.05,p,100);modes.push({requested:mode,mode:w.mode,types:[...new Set(w.enemies.map(e=>e.type))],elite:w.enemies.map(e=>e.elite),count:w.enemies.length});
  }
  const denied=[];for(const[type,elite]of[['moss',false],['petal',false],['thorn',true],['moss',true],['petal',true],['crystal',false]])denied.push(w.spawn(p,type,elite));
  w.reset('auto',0);w.update(.05,p,100);w.kills=30;w.update(.05,p,100);const earlyElite=w.enemies.some(e=>e.elite);
  w.time=180;w.spawn(p,'water');w.update(.05,p,100);const waterElites=w.enemies.filter(e=>e.elite).map(e=>e.type);
  w.reset('auto',299);w.update(.05,p,100);const normalCount=w.enemies.filter(e=>!e.boss).length;
  w.time=299.99;w.update(.05,p,100);const bossCount=w.enemies.filter(e=>e.boss).length;
  const nextId=w.serial;w.spawnClock=-100;for(let n=0;n<20;n++)w.update(.05,p,100);
  const transition={normalCount,afterNormalCount:w.enemies.filter(e=>!e.boss).length,bossCount,afterBossCount:w.enemies.filter(e=>e.boss).length,serialUnchanged:w.serial===nextId};
  return {snapshots,modes,denied,earlyElite,waterElites,transition,models:q.modelAssets,graphics:{view:q.state.thornView,quality:q.state.quality,grass:q.state.grass,sentinel:localStorage.getItem('roster-save-sentinel')},options:[...document.querySelector('#enemy-mode').options].map(e=>e.value)};
 });
 for(const row of result.snapshots){assert.ok(row.count>0);assert.deepEqual(row.unlocked,row.time<180?['thorn']:['thorn','water']);assert.ok(row.types.every(t=>row.unlocked.includes(t)));}
 for(const row of result.modes){assert.ok(row.count>0,row.requested);assert.ok(row.types.every(t=>['thorn','water'].includes(t)),row.requested);}
 assert.ok(result.denied.every(v=>v===false));assert.equal(result.earlyElite,false);assert.deepEqual(result.waterElites,['water']);
 assert.equal(result.transition.bossCount,1);assert.equal(result.transition.afterBossCount,1);assert.equal(result.transition.serialUnchanged,true);
 assert.deepEqual(result.models,['boss_walk','boss_run','boss_charge','boss_push','boss_spell']);
 assert.deepEqual(result.graphics,{view:'sprite',quality:1,grass:1200,sentinel:'keep'});
 assert.deepEqual(result.options,['auto','all','thorn','water','elites','elite-water','boss']);
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
 const cameras=[];
 for(const camera of ['game','side','top']){
  const state=await page.evaluate(camera=>{
   const q=__slimeGameQA,w=q.world,p=q.state.player;w.reset('all',180);w.update(.05,p,12);
   w.enemies=w.enemies.slice(0,2);w.enemies.forEach((e,i)=>{e.x=p[0]-2+i*4;e.z=p[2]-.5});
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
 assert.ok(skills.length>=10);assert.ok(skills.every(s=>s.targets.every(t=>['thorn','water'].includes(t))));
 assert.ok(!requests.some(u=>/\/enemies\/(?:thorn|moss|petal|crystal)(?:[.-])/.test(u)),'no removed model/atlas requested');
 assert.deepEqual(errors,[]);
 report={...report,passed:true,result,attacks,death,cameras,skills,errors,requests,cancellations};
 console.log('THREE SPECIES VERIFIED',JSON.stringify({engine,transition:result.transition,models:result.models,attacks:attacks.map(e=>e.kind),skills:skills.length,errors}));
}catch(e){report={...report,error:e.stack,errors,requests};console.error(JSON.stringify(report,null,2));process.exitCode=1;}
finally{await writeFile(`test-results/roster-${engine}.json`,JSON.stringify(report,null,2));await browser.close();}
