import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const engine=process.env.BROWSER||'chromium',url=process.env.SMOKE_URL||'http://127.0.0.1:4173/';
await mkdir('test-results',{recursive:true});
const browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']}:{})});
const page=await browser.newPage({viewport:{width:800,height:600},deviceScaleFactor:1});
const errors=[],requests=[],cancellations=[];let report={engine,url,passed:false};
page.on('pageerror',e=>errors.push('JS '+e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push(`HTTP ${r.status()} ${r.url()}`)});
page.on('request',r=>requests.push(r.url()));
page.on('requestfailed',r=>{const e=r.failure()?.errorText||'failed';if(/player-slime-directions\.webp\?v=3/.test(r.url())&&/abort|cancel/i.test(e))cancellations.push(r.url());else errors.push(`NETWORK ${r.url()}: ${e}`)});
await page.addInitScript(()=>{const raf=requestAnimationFrame.bind(window);window.__waterTestFreeze=false;window.requestAnimationFrame=cb=>raf(t=>{if(!window.__waterTestFreeze)cb(t)})});
async function capture(name){
 // Present the current state twice and finish GPU work: a frozen WebKit canvas can
 // otherwise screenshot the preceding buffer, misleadingly labelling poses.
 await page.waitForTimeout(100);
 await page.evaluate(()=>{__slimeGameQA.draw();document.querySelector('#world').getContext('webgl2').finish()});
 await page.waitForTimeout(150);
 await page.screenshot({path:`test-results/water-${engine}-${name}.png`,timeout:30000});
}
try{
 const address=new URL(url);address.searchParams.set('qa','1');
 assert.ok((await page.goto(address.href,{waitUntil:'load',timeout:60000}))?.ok());
 await page.waitForFunction(()=>document.querySelector('#error')?.hidden===false||(window.__slimeGameQA?.waterRenderer&&document.querySelector('.skill-card')),null,{timeout:60000});
 assert.equal(await page.locator('#error').evaluate(e=>e.hidden),true,await page.locator('#error').textContent());
 await page.evaluate(()=>{for(const[id,value]of[['enemy-mode','water'],['mobs','12'],['graphics-preset','low'],['grass','1200']]){const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event('change',{bubbles:true}))}document.querySelector('#restart').click();document.querySelector('#panel').close?.()});
 await page.locator('.skill-card').first().click({force:true});await page.evaluate(()=>{const w=globalThis.__slimeGameQA?.world;if(w?.mode==='auto')w.time=Math.max(w.time,15)});
 await page.waitForFunction(()=>__slimeGameQA.world.enemies.length>0,null,{timeout:30000});
 const spawned=await page.evaluate(()=>__slimeGameQA.world.enemies.map(e=>e.type));
 assert.ok(spawned.every(t=>t==='water'));
 await page.evaluate(async()=>{
  const {waterMuzzle}=await import('./assets/water-calf.js');const q=__slimeGameQA,w=q.world,e=w.enemies[0],p=q.state.player;
  let spot=null;
  for(let x=2.5;x<=4.5;x+=.5)for(let z=-2;z<=2;z+=.5){
   const candidate={...e,x:p[0]+x,z:p[2]+z,yaw:-Math.PI/2};const m=waterMuzzle(candidate);
   if(!spot&&q.canStand(candidate.x,candidate.z,.5)&&Array.from({length:20},(_,i)=>{const a=i/19;return q.canStand(m.x+(p[0]-m.x)*a,m.z+(p[2]-m.z)*a,.12)}).every(Boolean))spot=candidate;
  }
  if(!spot)throw Error('No safe QA firing position');Object.assign(e,spot,{hp:10000,maxHP:10000,attack:0,windup:0,waterShotPose:0});
  w.enemies=[e];w.initial=false;w.spawnClock=1e6;w.nextElite=1e6;q.combat.cooldown=1e6;
 });
 await page.waitForFunction(()=>Object.keys(__slimeGameQA.waterRenderer.stats.projectileFrames).length===2,null,{timeout:45000});
 await page.waitForFunction(()=>__slimeGameQA.world.hp<100,null,{timeout:30000});
 const afterShot=await page.evaluate(()=>({hp:__slimeGameQA.world.hp,stats:structuredClone(__slimeGameQA.waterRenderer.stats)}));
 assert.ok(afterShot.hp<=94,'water projectile must actually damage the player');
 assert.ok(afterShot.stats.poses.charge>0&&afterShot.stats.poses.shoot>0);
 await page.evaluate(()=>{__slimeGameQA.world.enemies[0].hit=.30});
 await page.waitForFunction(()=>__slimeGameQA.waterRenderer.stats.poses.hit>0,null,{timeout:10000});
 await page.evaluate(()=>{__slimeGameQA.world.enemies[0].hp=0});
 await page.waitForFunction(()=>__slimeGameQA.waterRenderer.stats.poses.death>0,null,{timeout:10000});
 await page.waitForFunction(()=>__slimeGameQA.world.waterDead.length===0,null,{timeout:20000});
 await page.evaluate(()=>{const q=__slimeGameQA;q.world.reset('elite-water');q.world.update(.05,q.state.player,12);q.combat.cooldown=1e6;});
 const elite=await page.evaluate(()=>__slimeGameQA.world.enemies.map(e=>({type:e.type,elite:e.elite,hp:e.hp})));
 assert.ok(elite.some(e=>e.type==='water'&&e.elite&&e.hp===314));
 const decoded=await page.evaluate(async()=>{
  const paths=['assets/grass-painted.png','assets/enemies/frog-moveset.png','assets/enemies/water-calf-atlas.webp','assets/cards/inferno.png'];
  const sizes=[];for(const path of paths){const image=new Image();image.src=path;await image.decode();sizes.push({path,width:image.naturalWidth,height:image.naturalHeight})}return sizes;
 });
 assert.ok(decoded.every(d=>d.width>0));
 await page.evaluate(()=>{window.__waterTestFreeze=true;__slimeGameQA.state.paused=true});await page.waitForTimeout(400);
 const poseFrames=[];
 for(let frame=0;frame<8;frame++){
  const pose=await page.evaluate(async i=>{const q=__slimeGameQA,w=q.world,p=q.state.player,e=w.enemies[0];e.elite=false;e.scale=1;e.x=p[0]-2.5;e.z=p[2]+.2;e.yaw=Math.PI/2;e.waterFacing=1;e.anim=(i+.1)/8;e.walkBlend=1;e.hit=0;e.windup=0;e.waterShotPose=0;e.hp=28;w.enemies=[e];w.waterDead=[];q.draw();const {waterPose}=await import('./assets/water-calf.js');return waterPose(e).cell},frame);
  poseFrames.push(pose);await capture(`walk-${frame}`);
 }
 assert.deepEqual(poseFrames,[0,1,2,3,4,5,6,7]);
 for(const name of ['charge','shoot','hit','death']){
  await page.evaluate(name=>{const q=__slimeGameQA,e=q.world.enemies[0];e.anim=0;e.walkBlend=0;e.windup=0;e.waterShotPose=0;e.hit=0;delete e.waterDeath;if(name==='charge')e.windup=.35;if(name==='shoot')e.waterShotPose=.2;if(name==='hit')e.hit=.2;if(name==='death')e.waterDeath=.38;q.draw()},name);
  await capture(name);
 }
 // A frozen renderer composition shows the authored projectile in the real scene.
 // Real trajectory, collision and damage were tested above using advancing gameplay.
 await page.evaluate(async()=>{const q=__slimeGameQA,w=q.world,e=w.enemies[0];delete e.waterDeath;e.hit=0;e.waterShotPose=.2;w.bullets=[];const {emitWaterShot}=await import('./assets/water-calf.js');emitWaterShot(w,e,q.state.player,6);for(const b of w.bullets){b.x+=b.vx*.18;b.z+=b.vz*.18;b.age=.18}q.draw()});
 await capture('water-shot');
 const final=await page.evaluate(()=>({errorHidden:document.querySelector('#error').hidden,stats:__slimeGameQA.waterRenderer.stats,glError:document.querySelector('#world').getContext('webgl2').getError(),frogHooks:[typeof __slimeFrogFrame,typeof __slimeFrogFacing,typeof __slimeFrogHopLift],audio:!!document.querySelector('#audio-toggle'),graphics:!!document.querySelector('#graphics-preset')}));
 assert.equal(final.errorHidden,true);assert.equal(final.glError,0);assert.ok(final.frogHooks.every(t=>t==='function'));assert.ok(final.audio&&final.graphics);
 assert.ok(!requests.some(u=>/\/enemies\/(?:crystal(?:\.|-elite)|water\.(?:json|bin))/.test(u)),'no old Crystal model/texture or imaginary water 3D file requested');
 assert.deepEqual(errors,[]);
 report={...report,passed:true,spawned,elite,afterShot,decoded,final,poseFrames,requests,cancellations,errors};
 console.log('WATER CALF GAMEPLAY VERIFIED',JSON.stringify({engine,hpAfterRealShot:afterShot.hp,walkFrames:poseFrames,poses:final.stats.poses,errors}));
}catch(e){report={...report,error:e.stack,requests,errors};console.error(JSON.stringify(report,null,2));process.exitCode=1;}
finally{await writeFile(`test-results/water-${engine}.json`,JSON.stringify(report,null,2));await browser.close();}
