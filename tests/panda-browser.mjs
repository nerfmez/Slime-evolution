import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const engine=process.env.BROWSER||'chromium',base=process.env.SMOKE_URL||'http://127.0.0.1:4173/';
await mkdir('test-results',{recursive:true});
const launch={headless:true,...(engine==='chromium'?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']}:{})};
if(engine==='chromium'&&process.env.LOCAL_CHROMIUM)launch.executablePath=process.env.LOCAL_CHROMIUM;
const browser=await ({chromium,webkit}[engine]).launch(launch),page=await browser.newPage({viewport:{width:1000,height:700},deviceScaleFactor:1});
page.setDefaultTimeout(45000);let report={engine,url:base,passed:false},errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`)});
await page.addInitScript(()=>{const raf=requestAnimationFrame.bind(window);window.__pandaNativeRAF=raf;window.__pandaFreeze=false;window.requestAnimationFrame=f=>raf(t=>{if(!__pandaFreeze)f(t)});localStorage.setItem('slime.graphics.v1',JSON.stringify({preset:'low',showStats:false}));});
const close=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
async function capture(name){await page.waitForTimeout(150);await page.evaluate(()=>{__slimeGameQA.draw();document.querySelector('#world').getContext('webgl2').finish();});await page.waitForTimeout(180);await page.screenshot({path:`test-results/panda-${engine}-${name}.png`});}
try{
 const u=new URL(base);u.searchParams.set('qa','1');assert.ok((await page.goto(u.href,{waitUntil:'load',timeout:60000})).ok());
 await page.waitForFunction(()=>document.querySelector('#error')?.hidden===false||(window.__slimeGameQA?.pandaRenderer&&document.querySelector('.skill-card')),null,{timeout:60000});
 assert.equal(await page.locator('#error').evaluate(e=>e.hidden),true,await page.locator('#error').textContent());
 await page.locator('.skill-card').first().click({force:true});await page.waitForFunction(()=>window.__slimeGameQA?.world?.enemies.length>0);
 await page.evaluate(()=>{__pandaFreeze=true;});await page.waitForTimeout(400);await page.evaluate(()=>{window.requestAnimationFrame=window.__pandaNativeRAF;});
 const atlas=await page.evaluate(async()=>{
  const im=new Image();im.src='assets/enemies/bamboo-panda-atlas.webp';await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);const d=x.getImageData(0,0,c.width,c.height).data;
  const a=new Uint8Array(c.width*c.height),opaque=new Uint8Array(a.length*3);let k=0,clear=0,borders=0;const occupied=Array(20).fill(0);
  for(let i=0;i<a.length;i++){const y=Math.floor(i/c.width),z=i%c.width,v=d[i*4+3];a[i]=v;if(v===0)clear++;if(v===255){opaque[k++]=d[i*4];opaque[k++]=d[i*4+1];opaque[k++]=d[i*4+2];occupied[Math.floor(y/384)*4+Math.floor(z/384)]++;}if((y%384<2||y%384>381||z%384<2||z%384>381)&&v>10)borders++;}
  const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(x=>x.toString(16).padStart(2,'0')).join('');
  return {width:im.width,height:im.height,clear,borders,occupied,alphaSHA256:await hash(a),opaqueRGBSHA256:await hash(opaque.subarray(0,k))};
 });report.atlas=atlas;
 const meta=JSON.parse(await readFile('game/assets/enemies/bamboo-panda-atlas.json','utf8'));
 assert.equal(atlas.width,1536);assert.equal(atlas.height,1920);assert.equal(atlas.borders,0);assert.ok(atlas.clear>1600000);assert.ok(atlas.occupied.slice(0,19).every(n=>n>5000));assert.equal(atlas.alphaSHA256,meta.alphaSHA256);assert.equal(atlas.opaqueRGBSHA256,meta.opaqueRGBSHA256);
 const schedule=await page.evaluate(()=>{
  const q=__slimeGameQA,w=q.world,p=q.state.player;const count=()=>w.enemies.filter(e=>e.type==='panda').length;
  w.reset('auto',149.9);w.update(.05,p,12);const before=count();w.update(.05,p,12);w.update(.05,p,12);const first=count();w.time=239.99;w.update(.05,p,12);const noStack=count();
  w.reset('auto',239.99);w.update(.05,p,12);const second=count();w.reset('auto',300);w.update(.05,p,12);const afterBoss=count();
  w.reset('panda',150);w.update(.05,p,12);const test=w.enemies.map(e=>({type:e.type,miniBoss:e.miniBoss,elite:e.elite}));const options=[...document.querySelector('#enemy-mode').options].map(o=>o.value);
  return {before,first,noStack,second,afterBoss,test,options};
 });report.schedule=schedule;
 assert.equal(schedule.before,0);assert.equal(schedule.first,1);assert.equal(schedule.noStack,1);assert.equal(schedule.second,1);assert.equal(schedule.afterBoss,0);assert.deepEqual(schedule.test,[{type:'panda',miniBoss:true,elite:false}]);assert.ok(schedule.options.includes('panda'));
 const motion=await page.evaluate(async()=>{
  const q=__slimeGameQA,w=q.world,p=q.state.player;w.reset('panda',150);let line;
  // Search real terrain for a full clear corridor; do not mock moveEnemy or collision.
  outer:for(let z=-24;z<=24;z+=3)for(let x=-24;x<=24;x+=3)for(let j=0;j<16;j++){
   const angle=j*Math.PI/8,nx=Math.cos(angle),nz=Math.sin(angle);
   if(Array.from({length:105},(_,i)=>q.canStand(x+nx*i*.1,z+nz*i*.1,.62)).every(Boolean)){line={x,z,nx,nz};break outer;}
  }
  if(!line)throw Error('No real 10-unit Panda corridor found');
  p[0]=line.x+line.nx*5;p[2]=line.z+line.nz*5;w.update(.05,p,12);const e=w.enemies[0];
  Object.assign(e,{x:line.x,z:line.z,hp:10000,maxHP:10000,attack:0,hit:0,pandaCooldown:0});delete e.pandaAge;w.enemies=[e];w.spawnClock=w.nextElite=1e6;q.combat.cooldown=1e6;
  const {pandaPose}=await import('./assets/bamboo-panda.js');const trace=[],snapshots={};
  for(let i=0;i<55;i++){w.update(.05,p,12);trace.push({t:(i+1)*.05,x:e.x,z:e.z,age:e.pandaAge??null,roll:e.pandaRollDistance||0,cell:pandaPose(e).cell,hp:w.hp});if(i===8)snapshots.charge={...e};if(i===20)snapshots.roll={...e};if(i===42)snapshots.recover={...e};}
  return {line,trace,snapshots};
 });report.motion=motion;
 assert.ok(motion.trace.slice(0,16).every(e=>Math.hypot(e.x-motion.line.x,e.z-motion.line.z)<1e-6));
 close(motion.trace[40].roll,9.6);assert.ok(motion.trace.some(e=>e.hp===82));assert.equal(motion.trace.filter((v,i,a)=>i>0&&v.hp<a[i-1].hp).length,1);assert.ok([8,9,10,11,12,13,14,15].every(c=>motion.trace.some(e=>e.cell===c)));
 for(const [name,e]of Object.entries(motion.snapshots)){await page.evaluate(e=>{const q=__slimeGameQA;q.world.enemies=[e];q.draw();},e);await capture('real-'+name);}
 const death=await page.evaluate(()=>{
  const q=__slimeGameQA,w=q.world,p=q.state.player;w.reset('panda',150);w.update(.05,p,12);const e=w.enemies[0];Object.assign(e,{x:p[0]-2.2,z:p[2]-.2,hit:0,hp:50,attack:10,pandaCooldown:10});delete e.pandaAge;w.enemies=[e];q.combat.cooldown=1e6;
  q.combat.hit(e,20,e.x,e.z);q.draw();const hurt=q.pandaRenderer.stats.last.cell,hp=e.hp,kills=w.kills,rerolls=q.combat.rerolls;e.hp=0;w.update(.05,p,12);q.draw();
  const result={hurt,hp,cell:q.pandaRenderer.stats.last.cell,corpse:w.pandaDead.length,kills:w.kills-kills,defeated:w.defeated.filter(d=>d.id===e.id).length};
  q.combat.cards=[];q.combat.opening=false;q.combat.update(.01,w,p);result.rerolls=q.combat.rerolls-rerolls;q.combat.update(.01,w,p);result.rerollsAgain=q.combat.rerolls-rerolls;
  for(let i=0;i<26;i++)w.update(.05,p,12);result.expired=w.pandaDead.length;return result;
 });report.death=death;assert.equal(death.hurt,17);assert.equal(death.hp,30);assert.equal(death.cell,18);assert.equal(death.corpse,1);assert.equal(death.kills,1);assert.equal(death.defeated,1);assert.equal(death.rerolls,1);assert.equal(death.rerollsAgain,1);assert.equal(death.expired,0);
 const cells=[];
 for(const [name,data,expected]of [...Array.from({length:8},(_,i)=>[`walk-${i}`,{walkBlend:1,walkPhase:(i+.1)/8},i]),...Array.from({length:8},(_,i)=>[`roll-${i}`,{pandaAge:1,pandaRollDistance:(i+.1)/8*3.2},8+i]),['charge',{pandaAge:.4},16],['hurt',{hit:.2},17],['death',{pandaDeath:.2},18]]){
  const result=await page.evaluate(data=>{const q=__slimeGameQA,w=q.world,p=q.state.player;p[0]=0;p[2]=0;w.reset('panda',150);w.update(.05,p,12);const e=w.enemies[0];Object.assign(e,{x:p[0]-2.1,z:p[2]-.15,yaw:Math.PI/2,pandaFacing:1,walkBlend:0,hit:0,pandaCooldown:9},data);w.enemies=[e];q.state.camera='game';q.draw();return {...q.pandaRenderer.stats.last,gl:document.querySelector('#world').getContext('webgl2').getError()};},data);
  assert.equal(result.cell,expected);assert.equal(result.size,3.35);assert.equal(result.facing,1);assert.equal(result.gl,0);cells.push(result);await capture(name);
 }
 for(const [name,data]of [['walk',{walkBlend:1,walkPhase:.3}],['roll',{pandaAge:1,pandaRollDistance:.8}],['hurt',{hit:.2}],['death',{pandaDeath:.2}]]){
  const facing=await page.evaluate(data=>{const q=__slimeGameQA,w=q.world,p=q.state.player;w.reset('panda',150);w.update(.05,p,12);const e=w.enemies[0];Object.assign(e,{x:p[0]+2.1,z:p[2]-.15,yaw:-Math.PI/2,pandaFacing:-1,pandaCooldown:9,hit:0,walkBlend:0},data);w.enemies=[e];q.draw();return q.pandaRenderer.stats.last.facing;},data);assert.equal(facing,-1);await capture('left-'+name);
 }
 const mixed=await page.evaluate(()=>{const q=__slimeGameQA,w=q.world,p=q.state.player;w.reset('all',180);w.update(.05,p,12);w.enemies=w.enemies.slice(0,4);w.spawn(p,'panda',false);w.enemies.forEach((e,i)=>{e.x=p[0]-5+i*2.5;e.z=p[2]-.5;e.walkBlend=1;e.walkPhase=.25;e.turtleGuardCooldown=10;e.pandaCooldown=10;});q.draw();return w.enemies.map(e=>e.type);});assert.deepEqual(mixed,['thorn','spark','turtle','water','panda']);await capture('mixed');
 for(const camera of ['side','top']){await page.evaluate(camera=>{__slimeGameQA.state.camera=camera;__slimeGameQA.draw()},camera);await capture(camera);}
 assert.deepEqual(errors,[]);report={...report,passed:true,cells,mixed,errors};console.log('PANDA VERIFIED',JSON.stringify(report));
}catch(e){report={...report,error:e.stack,errors};console.error(report);await page.screenshot({path:`test-results/panda-${engine}-failure.png`}).catch(()=>{});process.exitCode=1;}
finally{await writeFile(`test-results/panda-${engine}.json`,JSON.stringify(report,null,2));await browser.close();}
