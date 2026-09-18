import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const engine=process.env.BROWSER||'chromium',base=process.env.SMOKE_URL||'http://127.0.0.1:4173/';
await mkdir('test-results',{recursive:true});
const browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']}:{})});
const page=await browser.newPage({viewport:{width:1000,height:700},deviceScaleFactor:1});
page.setDefaultTimeout(45000);let report={engine,url:base,passed:false},errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`)});
await page.addInitScript(()=>{const raf=requestAnimationFrame.bind(window);window.__sparkFreeze=false;window.requestAnimationFrame=f=>raf(t=>{if(!__sparkFreeze)f(t)});localStorage.setItem('slime.graphics.v1',JSON.stringify({preset:'low',showStats:false}));});
// Let the previous buffer present before redrawing the same frozen state (WebKit software compositor).
async function capture(name){await page.waitForTimeout(150);await page.evaluate(()=>{__slimeGameQA.draw();document.querySelector('#world').getContext('webgl2').finish()});await page.waitForTimeout(180);await page.screenshot({path:`test-results/spark-${engine}-${name}.png`});}
try{
 const url=new URL(base);url.searchParams.set('qa','1');assert.ok((await page.goto(url.href,{waitUntil:'load',timeout:60000})).ok());
 await page.waitForFunction(()=>document.querySelector('#error')?.hidden===false||(window.__slimeGameQA?.sparkRenderer&&document.querySelector('.skill-card')),null,{timeout:60000});
 assert.equal(await page.locator('#error').evaluate(e=>e.hidden),true,await page.locator('#error').textContent());
 await page.locator('.skill-card').first().click({force:true});
 await page.waitForFunction(()=>window.__slimeGameQA?.world?.enemies.length>0);
 await page.evaluate(()=>{__sparkFreeze=true});await page.waitForTimeout(400);
 const atlas=await page.evaluate(async()=>{const im=new Image();im.src='assets/enemies/spark-hedgehog-atlas.webp';await im.decode();const c=document.createElement('canvas');c.width=c.height=1536;const x=c.getContext('2d');x.drawImage(im,0,0);let solid=0,clear=0,borders=0;const d=x.getImageData(0,0,1536,1536).data;for(let y=0;y<1536;y++)for(let z=0;z<1536;z++){const a=d[(y*1536+z)*4+3];if(a===0)clear++;if(a>220)solid++;if((y%384<2||y%384>381||z%384<2||z%384>381)&&a>10)borders++;}return {width:im.width,height:im.height,clear,solid,borders};});
 report.atlas=atlas;
 assert.equal(atlas.width,1536);assert.equal(atlas.height,1536);assert.ok(atlas.clear>1500000);assert.ok(atlas.solid>150000);assert.equal(atlas.borders,0,'effects must not be cropped at cell borders');
 const simulation=await page.evaluate(async()=>{
  const q=__slimeGameQA,w=q.world,p=q.state.player;w.reset('spark',60);w.update(.05,p,12);const types=w.enemies.map(e=>e.type);
  const e=w.enemies[0];let spot;
  for(let z=-1;z<=1;z+=.25)for(let x=.75;x<=1.05;x+=.1){if(!spot&&Array.from({length:12},(_,i)=>q.canStand(p[0]+x*(i/11),p[2]+z*(i/11),.30)).every(Boolean))spot={x:p[0]+x,z:p[2]+z};}
  if(!spot)throw Error('No open ground for real Spark collision test');
  Object.assign(e,spot,{hp:10000,maxHP:10000,attack:0,hit:0,sparkAge:null});delete e.sparkAge;w.enemies=[e];w.spawnClock=1e6;w.nextElite=1e6;q.combat.cooldown=1e6;
  const {sparkPose}=await import('./assets/spark-hedgehog.js');let frames=[],hp=[];
  for(let i=0;i<30;i++){w.update(.05,p,12);frames.push(sparkPose(e).cell);hp.push(w.hp);q.draw();}
  const beforeDeath=w.kills;e.hit=.2;q.draw();const hitCell=q.sparkRenderer.stats.last.cell;
  e.hp=0;w.update(.05,p,12);q.draw();const died={corpse:w.sparkDead.length,cell:q.sparkRenderer.stats.last.cell,defeated:w.defeated.some(d=>d.type==='spark'),kills:w.kills-beforeDeath};
  for(let i=0;i<20;i++)w.update(.05,p,12);
  return {types,frames,hp,hitCell,died,expired:w.sparkDead.length};
 });
 report.simulation=simulation;
 assert.ok(simulation.types.every(t=>t==='spark'));assert.ok(simulation.hp.slice(0,18).every(h=>h===100));assert.ok(simulation.hp.some(h=>h===94));
 assert.ok([6,7,8,9,10,11].every(f=>simulation.frames.includes(f)));assert.equal(simulation.hitCell,12);assert.deepEqual(simulation.died,{corpse:1,cell:13,defeated:true,kills:1});assert.equal(simulation.expired,0);
 const longRange=await page.evaluate(async()=>{
  const q=__slimeGameQA,w=q.world,p=q.state.player;
  w.reset('spark',60);w.update(.05,p,12);const e=w.enemies[0];let spot;
  for(let a=0;a<64&&!spot;a++){
   const angle=a*Math.PI*2/64,x=Math.cos(angle)*2.8,z=Math.sin(angle)*2.8;
   if(Array.from({length:65},(_,i)=>q.canStand(p[0]+x*i/64,p[2]+z*i/64,.30)).every(Boolean))spot={x:p[0]+x,z:p[2]+z};
  }
  if(!spot)throw Error('No collision-clear 2.8-unit lane for long-range charge test');
  Object.assign(e,spot,{hp:10000,maxHP:10000,attack:0,hit:0});delete e.sparkAge;delete e.sparkDashRemaining;
  w.enemies=[e];w.spawnClock=w.nextElite=1e6;q.combat.cooldown=1e6;
  const {sparkPose}=await import('./assets/spark-hedgehog.js'),trace=[],poses={};let elapsed=0;
  for(let i=0;i<30;i++){
   const x=e.x,z=e.z;w.update(.05,p,12);elapsed+=.05;
   trace.push({time:elapsed,age:e.sparkAge??null,cell:sparkPose(e).cell,hp:w.hp,x:e.x,z:e.z,speed:Math.hypot(e.x-x,e.z-z)/.05});
   if(i===5||i===13||i===18)poses[i===5?'charge':i===13?'dash':'impact']={...e};
   q.draw();
  }
  return {range:2.8,start:spot,trace,poses};
 });
 report.longRange=longRange;
 assert.ok(longRange.trace[0].age!==null,'skill must activate from 2.8 units, beyond the old 1.22 range');
 assert.ok(longRange.trace.slice(0,12).every(t=>Math.hypot(t.x-longRange.start.x,t.z-longRange.start.z)<1e-8),'charge must remain stationary for .60s');
 assert.ok(longRange.trace.slice(0,18).every(t=>t.hp===100),'no pre-impact damage');
 assert.ok(longRange.trace.some(t=>t.hp===94));assert.equal(longRange.trace.filter((t,i)=>t.hp<(i?longRange.trace[i-1].hp:100)).length,1);
 assert.ok(Math.abs(Math.max(...longRange.trace.map(t=>t.speed))-8)<1e-6,'dash speed must be doubled to 8 units/s');
 assert.ok([6,7,8,9,10,11].every(c=>longRange.trace.some(t=>t.cell===c)));
 for(const [name,pose] of Object.entries(longRange.poses)){
  await page.evaluate(pose=>{const q=__slimeGameQA,w=q.world;w.enemies=[pose];q.state.camera='game';q.draw()},pose);
  await capture(`long-range-${name}`);
 }
 const cells=[];
 for(const [name,data] of [['run',{walkBlend:1,walkPhase:.22}],['charge',{sparkAge:.30}],['dash',{sparkAge:.72}],['impact',{sparkAge:.97}],['recovery',{sparkAge:1.20}],['hurt',{hit:.2}],['death',{sparkDeath:.2}]]){
  const result=await page.evaluate(({name,data})=>{
   const q=__slimeGameQA,w=q.world,p=q.state.player;w.reset('spark',60);w.update(.05,p,12);const e=w.enemies[0];
   Object.assign(e,{x:p[0]-1.6,z:p[2]-.1,yaw:Math.PI/2,sparkFacing:1,walkBlend:0,hit:0},data);w.enemies=[e];q.state.camera='game';q.draw();return {...q.sparkRenderer.stats.last,gl:document.querySelector('#world').getContext('webgl2').getError()};
  },{name,data});assert.equal(result.gl,0);cells.push(result);await capture(name);
 }
 const runCells=[];
 for(let frame=0;frame<6;frame++){
  const result=await page.evaluate(frame=>{const q=__slimeGameQA,w=q.world,p=q.state.player;w.reset('spark',60);w.update(.05,p,12);const e=w.enemies[0];Object.assign(e,{x:p[0]-1.6,z:p[2]-.1,yaw:Math.PI/2,sparkFacing:1,walkBlend:1,walkPhase:(frame+.1)/6,hit:0});w.enemies=[e];q.draw();return {...q.sparkRenderer.stats.last};},frame);
  assert.equal(result.cell,frame);assert.equal(result.facing,1);runCells.push(result);await capture(`run-${frame}`);
 }
 const leftCells=[];
 for(const [name,data,cell]of[['run',{walkBlend:1,walkPhase:.22},1],['hurt',{hit:.2},12],['death',{sparkDeath:.2},13]]){
  const result=await page.evaluate(data=>{const q=__slimeGameQA,w=q.world,p=q.state.player;w.reset('spark',60);w.update(.05,p,12);const e=w.enemies[0];Object.assign(e,{x:p[0]+1.6,z:p[2]-.1,yaw:-Math.PI/2,sparkFacing:-1,walkBlend:0,hit:0},data);w.enemies=[e];q.draw();return {...q.sparkRenderer.stats.last};},data);
  assert.equal(result.cell,cell);assert.equal(result.facing,-1);leftCells.push(result);await capture(`left-${name}`);
 }
 const mixed=await page.evaluate(()=>{const q=__slimeGameQA,w=q.world,p=q.state.player;w.reset('all',180);w.update(.05,p,12);w.enemies=w.enemies.slice(0,3);w.enemies.forEach((e,i)=>{e.x=p[0]-3+i*3;e.z=p[2]-.5;e.walkBlend=1;e.walkPhase=.2});q.draw();return w.enemies.map(e=>e.type)});assert.deepEqual(mixed,['thorn','spark','water']);await capture('mixed-roster');
 for(const camera of ['side','top']){await page.evaluate(camera=>{__slimeGameQA.state.camera=camera;__slimeGameQA.draw()},camera);await capture(camera);}
 assert.deepEqual(errors,[]);report={engine,url:base,passed:true,atlas,simulation,longRange,cells,runCells,leftCells,mixed,errors};console.log('SPARK GAMEPLAY VERIFIED',JSON.stringify(report));
}catch(e){report={...report,error:e.stack,errors};await page.screenshot({path:`test-results/spark-${engine}-failure.png`}).catch(()=>{});console.error(report);process.exitCode=1;}
finally{await writeFile(`test-results/spark-${engine}.json`,JSON.stringify(report,null,2));await browser.close();}
