import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const engine=process.env.BROWSER||'chromium',base=process.env.SMOKE_URL||'http://127.0.0.1:4173/';
const options={headless:true,...(engine==='chromium'?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']}:{})};
if(engine==='chromium'&&process.env.LOCAL_CHROMIUM)options.executablePath=process.env.LOCAL_CHROMIUM;
await mkdir('test-results',{recursive:true});const errors=[];let report={engine,url:base,passed:false};
const browser=await ({chromium,webkit}[engine]).launch(options),page=await browser.newPage({viewport:{width:1000,height:700},deviceScaleFactor:1});
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`HTTP ${r.status()} ${r.url()}`);});
await page.addInitScript(()=>{const raf=requestAnimationFrame.bind(window);window.__pacingRAF=raf;window.__pacingFreeze=false;window.requestAnimationFrame=f=>raf(t=>{if(!__pacingFreeze)f(t)});localStorage.setItem('slime.graphics.v1',JSON.stringify({preset:'low',showStats:false}));});
async function capture(name,clock){await page.evaluate(()=>document.querySelector('#step').click());assert.equal(await page.locator('#skill-choice').evaluate(e=>e.hidden),true);const status=await page.locator('#status').textContent();assert.ok(status.includes(clock+' / 10:00'),status);(report.screens||=[]).push({name,status});await page.waitForTimeout(150);await page.evaluate(()=>{__slimeGameQA.draw();document.querySelector('#world').getContext('webgl2').finish();});await page.waitForTimeout(200);await page.screenshot({path:`test-results/pacing-${engine}-${name}.png`});}
try{
 const u=new URL(base);u.searchParams.set('qa','1');assert.ok((await page.goto(u.href,{waitUntil:'load',timeout:60000})).ok());
 await page.waitForFunction(()=>document.querySelector('#error')?.hidden===false||(window.__slimeGameQA?.pandaRenderer&&document.querySelector('.skill-card')),null,{timeout:60000});
 assert.equal(await page.locator('#error').evaluate(e=>e.hidden),true,await page.locator('#error').textContent());
 const openings=await page.evaluate(()=>Array.from({length:12},()=>__slimeGameQA.combat.initialCards()));
 const openingKeys=openings.map(cards=>cards.join('|')),openingUnique=new Set(openingKeys).size;
 assert.ok(openingUnique>1,'opening skill choices repeated identically across entropy samples');
 for(const cards of openings){assert.equal(cards.length,3);assert.equal(new Set(cards.map(x=>x.split(':')[0])).size,3,'opening cards must use three distinct skill families');}
 report.openings={unique:openingUnique,samples:openings.slice(0,4)};
 await page.locator('.skill-card').first().click({force:true});await page.evaluate(()=>{__pacingFreeze=true;});await page.waitForTimeout(250);await page.evaluate(()=>{window.requestAnimationFrame=__pacingRAF;});
 const cases=await page.evaluate(async()=>{
  const {encounterPhase,ELITE_EVENTS}=await import('./assets/encounter-director.js');const q=__slimeGameQA,w=q.world,p=q.state.player;
  w.reset('auto',0);w.update(.05,p,100);const intro={count:w.enemies.length,phase:encounterPhase(w.time).kind,xp:w.enemies[0]?.xp};
  const lulls=[];for(const time of [75,150,230,330,420,510,580]){w.reset('auto',time);w.update(.05,p,100);lulls.push({time,count:w.enemies.length,ordinary:w.enemies.filter(e=>!e.elite&&!e.miniBoss&&!e.boss).length});}
  const unlocks=[];for(const time of [119,120,239,240,359,360]){w.reset('auto',time);w.update(.05,p,100);unlocks.push({time,unlocked:w.unlocked()});}
  w.reset('auto',545);w.hp=1e6;for(let i=0;i<700;i++)w.update(.05,p,100);const capped={ordinary:w.enemies.filter(e=>!e.elite&&!e.miniBoss&&!e.boss).length,elites:w.enemies.filter(e=>e.elite).length,serial:w.serial};
  const before=w.enemies.map(e=>e.id);w.time=580;w.update(.05,p,100);const keepsSurvivors=before.every(id=>w.enemies.some(e=>e.id===id));
  w.reset('auto',300);w.update(.05,p,100);const panda=w.enemies.find(e=>e.miniBoss);const firstPanda={count:w.enemies.length,hp:panda?.maxHP,xp:panda?.xp,ordinary:w.enemies.filter(e=>!e.elite&&!e.miniBoss&&!e.boss).length};
  w.time=600;w.update(.05,p,100);const bossDeferred=!w.bossSpawned;
  for(const e of w.enemies)e.hp=0;w.update(.05,p,100);w.time=601;w.update(.05,p,100);const bossAfterClear=w.enemies.filter(e=>e.boss).length;
  w.reset('auto',480);w.update(.05,p,100);const p2=w.enemies.find(e=>e.miniBoss);const secondPanda={hp:p2?.maxHP,xp:p2?.xp};
  const elites=[];for(const event of ELITE_EVENTS){w.reset('auto',event.time);w.update(.05,p,100);const e=w.enemies.find(e=>e.elite);elites.push({time:event.time,type:e?.type,elite:e?.elite,hp:e?.maxHP,damage:e?.cozyStats?.damage,xp:e?.xp,scale:e?.scale,ordinary:w.enemies.filter(x=>!x.elite&&!x.miniBoss&&!x.boss).length});}
  w.reset('auto',599.9);w.update(.05,p,100);const beforeBoss=w.enemies.length;w.time=600;w.update(.05,p,100);const boss=w.enemies.find(e=>e.boss);const atBoss={count:w.enemies.filter(e=>e.boss).length,hp:boss?.maxHP,xp:boss?.xp};const serial=w.serial;for(let i=0;i<40;i++)w.update(.05,p,100);const noAdds=w.serial===serial;
  boss.hp=0;w.update(.05,p,100);const victory={finished:w.finished,bossDefeated:w.bossDefeated};
  w.reset('auto',365);w.update(.05,p,100);const victim=w.enemies.find(e=>!e.elite&&!e.miniBoss&&!e.boss),expectedXP=victim.xp;victim.hp=0;w.update(.05,p,100);
  const c=q.combat;c.reset();c.cards=[];c.opening=false;c.cooldown=1e6;c.update(.01,w,p);const dropped=c.souls.reduce((sum,s)=>sum+s.value,0),sourceTypes=c.souls.map(s=>s.sourceType);c.update(.01,w,p);const notDuplicated=c.souls.reduce((sum,s)=>sum+s.value,0)===dropped;for(const soul of c.souls){soul.x=p[0];soul.z=p[2];soul.age=1;}for(let i=0;i<24;i++)c.update(.01,w,p);const collected=c.xp;
  w.reset('panda');w.update(.05,p,100);const training={hp:w.enemies[0].maxHP,xp:w.enemies[0].xp};
  const hitResilience={};
  w.reset('elite-thorn');w.update(.05,p,100);let e=w.enemies[0];Object.assign(e,{x:p[0]-2,z:p[2],attack:0,hit:0,windup:0});w.update(.05,p,100);e.hit=.25;const frogBefore=e.windup;w.update(.05,p,100);hitResilience.frog={started:frogBefore>0,continued:e.windup>0&&e.windup<frogBefore};
  w.reset('elite-spark');w.update(.05,p,100);e=w.enemies[0];Object.assign(e,{x:p[0]-2.5,z:p[2],attack:0,hit:0});w.update(.05,p,100);const sparkBefore=e.sparkAge;e.hit=.25;w.update(.05,p,100);hitResilience.spark={started:sparkBefore!=null,continued:e.sparkAge!=null&&e.sparkAge>sparkBefore};
  w.reset('elite-turtle');w.update(.05,p,100);e=w.enemies[0];Object.assign(e,{x:p[0]-2,z:p[2],hit:.25,turtleGuardCooldown:0,turtleGuardRequested:true});w.update(.05,p,100);hitResilience.turtle={guard:e.turtleGuardAge!=null};
  w.reset('elite-water');w.update(.05,p,100);e=w.enemies[0];Object.assign(e,{x:p[0]-3,z:p[2],hit:.25,attack:0,windup:0,waterShotPose:0});w.update(.05,p,100);hitResilience.water={charge:e.windup>0};
  return {intro,lulls,unlocks,capped,keepsSurvivors,firstPanda,bossDeferred,bossAfterClear,secondPanda,elites,beforeBoss,atBoss,noAdds,victory,reward:{expectedXP,dropped,notDuplicated,collected,sourceTypes},training,hitResilience};
 });report.cases=cases;
 assert.equal(cases.intro.phase,'lull');assert.ok(cases.intro.count>=1);assert.equal(cases.intro.xp,2);
 assert.ok(cases.lulls.every(x=>x.ordinary>=1));assert.ok(cases.keepsSurvivors);
 for(const row of cases.unlocks)assert.deepEqual(row.unlocked,row.time<120?['thorn']:row.time<240?['thorn','spark']:row.time<360?['thorn','spark','turtle']:['thorn','spark','turtle','water']);
 assert.equal(cases.capped.ordinary,36);assert.ok(cases.capped.elites<=2);assert.ok(cases.firstPanda.count>=2);assert.equal(cases.firstPanda.hp,420);assert.equal(cases.firstPanda.xp,40);assert.ok(cases.firstPanda.ordinary>=1);assert.ok(cases.bossDeferred);assert.equal(cases.bossAfterClear,1);
 assert.deepEqual(cases.secondPanda,{hp:640,xp:55});
 assert.deepEqual(cases.elites.map(e=>[e.time,e.type,e.xp]),[[95,'thorn',18],[150,'thorn',18],[205,'spark',22],[255,'spark',22],[395,'turtle',28],[445,'turtle',28],[535,'water',30],[570,'water',30]]);assert.ok(cases.elites.every(e=>e.scale>1&&e.ordinary>=1));
 assert.ok(cases.beforeBoss>=1);assert.deepEqual(cases.atBoss,{count:1,hp:6200,xp:28});assert.ok(cases.noAdds);assert.deepEqual(cases.victory,{finished:true,bossDefeated:true});
 assert.equal(cases.reward.dropped,cases.reward.expectedXP);assert.ok(cases.reward.expectedXP<=7);assert.ok(cases.reward.notDuplicated);assert.equal(cases.reward.collected,cases.reward.expectedXP);assert.deepEqual(cases.reward.sourceTypes,['water']);assert.deepEqual(cases.training,{hp:480,xp:35});
 for(const [name,state] of Object.entries(cases.hitResilience))assert.ok(Object.values(state).every(Boolean),name+' skill interrupted by hit');
 const menu=await page.evaluate(()=>({minutes:[...document.querySelector('#start-minute').options].map(e=>Number(e.value)),normal:document.querySelector('#normal-run').textContent}));report.menu=menu;assert.deepEqual(menu.minutes,[0,60,120,180,240,300,360,420,480,540,600]);assert.ok(menu.normal.includes('10'));
 await page.evaluate(()=>document.querySelector('#normal-run').click());const hud=await page.locator('#status').textContent();assert.ok(hud.includes('/ 10:00'),hud);report.hud=hud;
 await page.locator('.skill-card').first().click({force:true});assert.equal(await page.locator('#skill-choice').evaluate(e=>e.hidden),true);
 await page.evaluate(()=>{const q=__slimeGameQA;q.combat.cards=[];q.combat.opening=false;q.world.reset('auto',75);q.world.update(.05,q.state.player,100);q.draw();});await capture('lull','01:15');
 await page.evaluate(()=>{const q=__slimeGameQA,p=q.state.player,w=q.world;w.reset('auto',540);for(let i=0;i<4;i++)w.spawn(p,['thorn','spark','turtle','water'][i]);w.enemies.forEach((e,i)=>{e.x=p[0]-4.5+i*3;e.z=p[2]-1;e.attack=10;e.pandaCooldown=10;e.turtleGuardCooldown=10;});q.draw();});await capture('forest-creatures','09:00');
 await page.evaluate(()=>{const q=__slimeGameQA,p=q.state.player,w=q.world;w.reset('auto',300);w.update(.05,p,100);const panda=w.enemies.find(e=>e.miniBoss);Object.assign(panda,{x:p[0]-2.5,z:p[2]-.5,pandaAge:.4});q.draw();});await capture('panda-event','05:00');
 const gl=await page.evaluate(()=>document.querySelector('#world').getContext('webgl2').getError());assert.equal(gl,0);assert.deepEqual(errors,[]);
 report={...report,passed:true,errors};console.log('PACING VERIFIED',JSON.stringify({engine,cases,menu,hud,errors}));
}catch(e){report={...report,error:e.stack,errors};console.error(JSON.stringify(report,null,2));process.exitCode=1;}
finally{await writeFile(`test-results/pacing-${engine}.json`,JSON.stringify(report,null,2));await browser.close();}
