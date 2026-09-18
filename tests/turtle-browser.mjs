import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const engine=process.env.BROWSER||'chromium',base=process.env.SMOKE_URL||'http://127.0.0.1:4173/';
await mkdir('test-results',{recursive:true});
const launch={headless:true,...(engine==='chromium'?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']}:{})};
if(engine==='chromium'&&process.env.LOCAL_CHROMIUM)launch.executablePath=process.env.LOCAL_CHROMIUM;
const browser=await({chromium,webkit}[engine]).launch(launch);
const page=await browser.newPage({viewport:{width:1000,height:700},deviceScaleFactor:1});
page.setDefaultTimeout(45000);let report={engine,url:base,passed:false},errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
await page.addInitScript(()=>{
 const raf=requestAnimationFrame.bind(window);window.__turtleNativeRAF=raf;window.__turtleFreeze=false;
 window.requestAnimationFrame=f=>raf(t=>{if(!__turtleFreeze)f(t)});
 localStorage.setItem('slime.graphics.v1',JSON.stringify({preset:'low',showStats:false}));
});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
async function capture(name){
 const snapshot=()=>page.evaluate(()=>({time:__slimeGameQA.world.time,enemies:__slimeGameQA.world.enemies.map(e=>[e.id,e.x,e.z,e.turtleGuardAge??null])}));
 const before=await snapshot();await page.waitForTimeout(150);
 await page.evaluate(()=>{__slimeGameQA.draw();document.querySelector('#world').getContext('webgl2').finish();});
 await page.waitForTimeout(180);await page.screenshot({path:`test-results/turtle-${engine}-${name}.png`});
 assert.deepEqual(await snapshot(),before,'capture must not tick the frozen world');
}
try{
 const url=new URL(base);url.searchParams.set('qa','1');assert.ok((await page.goto(url.href,{waitUntil:'load',timeout:60000})).ok());
 await page.waitForFunction(()=>document.querySelector('#error')?.hidden===false||(window.__slimeGameQA?.turtleRenderer&&document.querySelector('.skill-card')),null,{timeout:60000});
 assert.equal(await page.locator('#error').evaluate(e=>e.hidden),true,await page.locator('#error').textContent());
 await page.locator('.skill-card').first().click({force:true});await page.waitForFunction(()=>window.__slimeGameQA?.world?.enemies.length>0);
 await page.evaluate(()=>{__turtleFreeze=true;});await page.waitForTimeout(400);
 await page.evaluate(()=>{window.requestAnimationFrame=window.__turtleNativeRAF;});
 const atlas=await page.evaluate(async()=>{
  const im=new Image();im.src='assets/enemies/pond-turtle-atlas.webp';await im.decode();const c=document.createElement('canvas');c.width=c.height=1536;
  const x=c.getContext('2d');x.drawImage(im,0,0);const data=x.getImageData(0,0,1536,1536).data;let clear=0,solid=0,borders=0;const occupied=Array(16).fill(0);
  for(let y=0;y<1536;y++)for(let z=0;z<1536;z++){const a=data[(y*1536+z)*4+3];if(a===0)clear++;if(a>220){solid++;occupied[Math.floor(y/384)*4+Math.floor(z/384)]++;}
   if((y%384<2||y%384>381||z%384<2||z%384>381)&&a>10)borders++;}
  return {width:im.width,height:im.height,clear,solid,borders,occupied};
 });report.atlas=atlas;
 assert.equal(atlas.width,1536);assert.equal(atlas.height,1536);assert.ok(atlas.clear>1400000);assert.ok(atlas.solid>250000);assert.equal(atlas.borders,0);
 assert.ok(atlas.occupied.slice(0,15).every(x=>x>5000));
 const behavior=await page.evaluate(async()=>{
  const q=__slimeGameQA,w=q.world,p=q.state.player;w.reset('turtle',120);w.update(.05,p,12);const types=w.enemies.map(e=>e.type),e=w.enemies[0];let spot;
  for(let a=0;a<64&&!spot;a++){const angle=a*Math.PI*2/64,x=Math.cos(angle)*2.6,z=Math.sin(angle)*2.6;
   if(Array.from({length:64},(_,i)=>q.canStand(p[0]+x*i/63,p[2]+z*i/63,.42)).every(Boolean))spot={x:p[0]+x,z:p[2]+z};}
  if(!spot)throw Error('No collision-clear Turtle test position');
  Object.assign(e,spot,{hp:1000,maxHP:1000,attack:0,hit:0,turtleGuardCooldown:0,turtleGuardRequested:false});delete e.turtleGuardAge;
  w.enemies=[e];w.spawnClock=w.nextElite=1e6;q.combat.cooldown=1e6;
  const {turtlePose}=await import('./assets/pond-turtle.js');const trace=[],poses={};
  for(let i=0;i<69;i++){w.update(.05,p,12);trace.push({time:(i+1)*.05,x:e.x,z:e.z,age:e.turtleGuardAge??null,cooldown:e.turtleGuardCooldown,pose:turtlePose(e).name});
   if(i===3)poses.charge={...e};if(i===14)poses.guard={...e};if(i===57)poses.recover={...e};}
  const options=[...document.querySelector('#enemy-mode').options].map(x=>x.value);
  return {types,start:spot,trace,poses,options};
 });report.behavior=behavior;
 assert.ok(behavior.types.length>0&&behavior.types.every(t=>t==='turtle'));assert.ok(behavior.options.includes('turtle'));
 assert.ok(behavior.trace.slice(0,59).every(t=>Math.hypot(t.x-behavior.start.x,t.z-behavior.start.z)<1e-8),'guard must not slide');
 assert.ok(behavior.trace.some(t=>t.pose==='charge'));assert.ok(behavior.trace.some(t=>t.pose==='guard'));assert.ok(behavior.trace.some(t=>t.pose==='recover'));
 assert.ok(behavior.trace.slice(62).some(t=>Math.hypot(t.x-behavior.start.x,t.z-behavior.start.z)>0),'must resume walking after guard');
 for(const [name,e]of Object.entries(behavior.poses)){await page.evaluate(e=>{__slimeGameQA.world.enemies=[e];__slimeGameQA.draw();},e);await capture(name);}
 const damage=await page.evaluate(()=>{
  const q=__slimeGameQA,w=q.world,p=q.state.player;w.reset('turtle',120);w.update(.05,p,12);const e=w.enemies[0];
  Object.assign(e,{hp:1000,maxHP:1000,x:p[0]-2,z:p[2]-.2,hit:0,attack:10,turtleGuardAge:1,turtleGuardCooldown:6});w.enemies=[e];w.spawnClock=w.nextElite=1e6;
  let before=e.hp;q.combat.hit(e,20,e.x,e.z);const guarded=before-e.hp,number=q.combat.numbers.at(-1).value;
  const families=Object.keys(q.combat.damageTotals),byFamily={};
  for(const family of families){before=e.hp;q.combat.elementalHit(family,e,20,e.x,e.z);byFamily[family]=before-e.hp;}
  before=e.hp;w.update(.05,p,12,{x:e.x,z:e.z,age:0});const storm=before-e.hp;
  const guardedPose=q.turtleRenderer.stats.last;delete e.turtleGuardAge;e.hit=0;before=e.hp;q.combat.hit(e,20,e.x,e.z);const unguarded=before-e.hp;q.draw();const hurtCell=q.turtleRenderer.stats.last.cell;
  // The same central path still gives full damage to an unguarded other creature.
  const fake={...e,type:'spark',hp:1000};q.combat.hit(fake,20,fake.x,fake.z);const otherDamage=1000-fake.hp;
  const kills=w.kills;e.hp=1;e.turtleGuardAge=1;q.combat.hit(e,100,e.x,e.z);w.update(.05,p,12);q.draw();
  const died={corpse:w.turtleDead.length,cell:q.turtleRenderer.stats.last.cell,shield:q.turtleRenderer.stats.last.shield,defeated:w.defeated.filter(d=>d.id===e.id).length,kills:w.kills-kills};
  for(let i=0;i<23;i++)w.update(.05,p,12);
  return {guarded,number,byFamily,storm,unguarded,otherDamage,hurtCell,died,expired:w.turtleDead.length};
 });report.damage=damage;
 close(damage.guarded,6);close(damage.number,6);assert.ok(Object.keys(damage.byFamily).length>=5);for(const d of Object.values(damage.byFamily))close(d,6);
 close(damage.storm,.33);close(damage.unguarded,20);close(damage.otherDamage,20);assert.equal(damage.hurtCell,12);
 assert.deepEqual(damage.died,{corpse:1,cell:13,shield:0,defeated:1,kills:1});assert.equal(damage.expired,0);
 const cells=[];
 for(const [name,data,expected]of [...Array.from({length:12},(_,i)=>[`walk-${i}`,{walkBlend:1,walkPhase:(i+.1)/12},i]),['hurt',{hit:.2},12],['death',{turtleDeath:.25},13],['shield',{turtleGuardAge:1},14]]){
  const result=await page.evaluate(data=>{const q=__slimeGameQA,w=q.world,p=q.state.player;w.reset('turtle',120);w.update(.05,p,12);const e=w.enemies[0];
   Object.assign(e,{x:p[0]-1.7,z:p[2]-.15,yaw:Math.PI/2,turtleFacing:1,walkBlend:0,hit:0,turtleGuardCooldown:9},data);delete e.turtleGuardRequested;w.enemies=[e];q.state.camera='game';q.draw();
   return {...q.turtleRenderer.stats.last,gl:document.querySelector('#world').getContext('webgl2').getError()};},data);
  assert.equal(result.cell,expected);assert.equal(result.facing,1);assert.equal(result.size,2.16);assert.equal(result.gl,0);cells.push(result);await capture(name);
 }
 const mirrored=[];
 for(const [name,data]of [['walk',{walkBlend:1,walkPhase:.1}],['hurt',{hit:.2}],['death',{turtleDeath:.25}],['shield',{turtleGuardAge:1}]]){
  const result=await page.evaluate(data=>{const q=__slimeGameQA,w=q.world,p=q.state.player;w.reset('turtle',120);w.update(.05,p,12);const e=w.enemies[0];
   Object.assign(e,{x:p[0]+1.7,z:p[2]-.15,yaw:-Math.PI/2,turtleFacing:-1,walkBlend:0,hit:0,turtleGuardCooldown:9},data);w.enemies=[e];q.draw();return {...q.turtleRenderer.stats.last};},data);
  assert.equal(result.facing,-1);mirrored.push(result);await capture('left-'+name);
 }
 const mixed=await page.evaluate(()=>{const q=__slimeGameQA,w=q.world,p=q.state.player;w.reset('all',180);w.update(.05,p,12);w.enemies=w.enemies.slice(0,4);w.enemies.forEach((e,i)=>{e.x=p[0]-4.5+i*3;e.z=p[2]-.6;e.walkBlend=1;e.walkPhase=.18;e.turtleGuardCooldown=10;});q.draw();return w.enemies.map(e=>e.type);});
 assert.deepEqual(mixed,['thorn','spark','turtle','water']);await capture('mixed-roster');
 for(const camera of ['side','top']){await page.evaluate(camera=>{__slimeGameQA.state.camera=camera;__slimeGameQA.draw();},camera);await capture(camera);}
 assert.deepEqual(errors,[]);report={...report,passed:true,cells,mirrored,mixed,errors};console.log('POND TURTLE VERIFIED',JSON.stringify(report));
}catch(e){report={...report,error:e.stack,errors};await page.screenshot({path:`test-results/turtle-${engine}-failure.png`}).catch(()=>{});console.error(report);process.exitCode=1;}
finally{await writeFile(`test-results/turtle-${engine}.json`,JSON.stringify(report,null,2));await browser.close();}
