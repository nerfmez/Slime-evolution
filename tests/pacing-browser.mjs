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
async function capture(name,clock){await page.evaluate(()=>document.querySelector('#step').click());assert.equal(await page.locator('#skill-choice').evaluate(e=>e.hidden),true,'real opening choice must close before field evidence');const status=await page.locator('#status').textContent();assert.ok(status.includes(clock+' / 10:00'),status);(report.screens||=[]).push({name,status,openingHidden:true});await page.waitForTimeout(150);await page.evaluate(()=>{__slimeGameQA.draw();document.querySelector('#world').getContext('webgl2').finish();});await page.waitForTimeout(200);await page.screenshot({path:`test-results/pacing-${engine}-${name}.png`});}
try{
 const u=new URL(base);u.searchParams.set('qa','1');assert.ok((await page.goto(u.href,{waitUntil:'load',timeout:60000})).ok());
 await page.waitForFunction(()=>document.querySelector('#error')?.hidden===false||(window.__slimeGameQA?.pandaRenderer&&document.querySelector('.skill-card')),null,{timeout:60000});
 assert.equal(await page.locator('#error').evaluate(e=>e.hidden),true,await page.locator('#error').textContent());
 await page.locator('.skill-card').first().click({force:true});await page.evaluate(()=>{__pacingFreeze=true;});await page.waitForTimeout(250);await page.evaluate(()=>{window.requestAnimationFrame=__pacingRAF;});
 const cases=await page.evaluate(async()=>{
  const {encounterPhase}=await import('./assets/encounter-director.js');const q=__slimeGameQA,w=q.world,p=q.state.player;
  w.reset('auto',0);w.update(.05,p,100);const intro={count:w.enemies.length,phase:encounterPhase(w.time).kind};
  w.time=14.96;w.update(.05,p,100);const first={count:w.enemies.length,hp:w.enemies[0]?.maxHP,xp:w.enemies[0]?.xp};
  const quiet=[];for(const time of [45,155,275,340,400,455,575]){w.reset('auto',time);w.update(.05,p,100);quiet.push({time,count:w.enemies.length});}
  const unlocks=[];for(const time of [119,120,239,240,359,365]){w.reset('auto',time);w.update(.05,p,100);unlocks.push({time,unlocked:w.unlocked(),types:w.enemies.map(e=>e.type)});}
  w.reset('auto',540);w.hp=1e6;for(let i=0;i<700;i++)w.update(.05,p,100);const capped={count:w.enemies.length,serial:w.serial,maxHP:Math.max(...w.enemies.map(e=>e.maxHP))};
  const before=w.enemies.map(e=>e.id);w.time=575;w.update(.05,p,100);const quietKeepsSurvivors=JSON.stringify(before)===JSON.stringify(w.enemies.map(e=>e.id));
  w.reset('auto',300);w.update(.05,p,100);const panda=w.enemies.find(e=>e.miniBoss);const firstPanda={count:w.enemies.length,hp:panda?.maxHP,xp:panda?.xp,boss:w.bossSpawned};
  w.time=420;w.update(.05,p,100);w.time=480;w.update(.05,p,100);const noStack=w.enemies.length;
  w.time=600;w.update(.05,p,100);const bossDeferred=!w.bossSpawned;
  panda.hp=0;w.update(.05,p,100);w.time+=8.1;w.update(.05,p,100);const bossAfterClear=w.enemies.filter(e=>e.boss).length;
  w.reset('auto',480);w.update(.05,p,100);const secondPanda={hp:w.enemies[0]?.maxHP,xp:w.enemies[0]?.xp};
  const elites=[];for(const time of [105,215,420,520]){w.reset('auto',time);w.update(.05,p,100);const e=w.enemies[0];elites.push({time,type:e?.type,elite:e?.elite,hp:e?.maxHP,damage:e?.cozyStats?.damage,xp:e?.xp,scale:e?.scale});}
  w.reset('auto',599.9);w.update(.05,p,100);const beforeBoss=w.enemies.length;w.update(.05,p,100);w.update(.05,p,100);const boss=w.enemies.find(e=>e.boss);const atBoss={count:w.enemies.filter(e=>e.boss).length,hp:boss?.maxHP};
  w.spawnClock=-100;for(let i=0;i<40;i++)w.update(.05,p,100);const noAdds=w.enemies.length===1;
  boss.hp=0;w.update(.05,p,100);const victory={finished:w.finished,bossDefeated:w.bossDefeated};
  w.reset('auto',365);w.update(.05,p,100);const victim=w.enemies[0],expectedXP=victim.xp;victim.hp=0;w.update(.05,p,100);
  const c=q.combat;c.reset();c.cards=[];c.opening=false;c.cooldown=1e6;c.update(.01,w,p);const dropped=c.souls.reduce((sum,s)=>sum+s.value,0),sourceTypes=c.souls.map(s=>s.sourceType);
  c.update(.01,w,p);const notDuplicated=c.souls.reduce((sum,s)=>sum+s.value,0)===dropped;
  for(const soul of c.souls){soul.x=p[0];soul.z=p[2];soul.age=1;}for(let i=0;i<24;i++)c.update(.01,w,p);const collected=c.xp;
  w.reset('panda');w.update(.05,p,100);const training={hp:w.enemies[0].maxHP,xp:w.enemies[0].xp};
  return {intro,first,quiet,unlocks,capped,quietKeepsSurvivors,firstPanda,noStack,bossDeferred,bossAfterClear,secondPanda,elites,beforeBoss,atBoss,noAdds,victory,reward:{expectedXP,dropped,notDuplicated,collected,sourceTypes},training};
 });report.cases=cases;
 assert.deepEqual(cases.intro,{count:0,phase:'calm'});assert.equal(cases.first.count,1);assert.equal(cases.first.xp,4);
 assert.ok(cases.quiet.every(p=>p.count===0));assert.ok(cases.quietKeepsSurvivors);
 for(const row of cases.unlocks)assert.deepEqual(row.unlocked,row.time<120?['thorn']:row.time<240?['thorn','spark']:row.time<360?['thorn','spark','turtle']:['thorn','spark','turtle','water']);
 assert.equal(cases.capped.count,28);assert.equal(cases.firstPanda.count,1);assert.equal(cases.firstPanda.hp,420);assert.equal(cases.firstPanda.boss,false);assert.equal(cases.noStack,1);assert.ok(cases.bossDeferred);assert.equal(cases.bossAfterClear,1);
 assert.deepEqual(cases.secondPanda,{hp:640,xp:140});assert.deepEqual(cases.elites.map(e=>[e.time,e.type,e.elite,e.hp,e.damage,e.xp]),[[105,'thorn',true,192,8,42],[215,'spark',true,247,10,50],[420,'turtle',true,430,8,62],[520,'water',true,394,25,60]]);assert.ok(cases.elites.every(e=>e.scale>1));
 assert.equal(cases.beforeBoss,0);assert.deepEqual(cases.atBoss,{count:1,hp:6200});assert.ok(cases.noAdds);assert.deepEqual(cases.victory,{finished:true,bossDefeated:true});
 assert.equal(cases.reward.dropped,cases.reward.expectedXP);assert.ok(cases.reward.notDuplicated);assert.equal(cases.reward.collected,cases.reward.expectedXP);assert.deepEqual(cases.reward.sourceTypes,['water']);assert.deepEqual(cases.training,{hp:480,xp:45});
 const menu=await page.evaluate(()=>({minutes:[...document.querySelector('#start-minute').options].map(e=>Number(e.value)),normal:document.querySelector('#normal-run').textContent}));report.menu=menu;assert.deepEqual(menu.minutes,[0,60,120,180,240,300,360,420,480,540,600]);assert.ok(menu.normal.includes('10'));
 // Actual normal-run button resets progression and immediately refreshes the 10:00 HUD.
 await page.evaluate(()=>document.querySelector('#normal-run').click());const hud=await page.locator('#status').textContent();assert.ok(hud.includes('/ 10:00'),hud);report.hud=hud;
 await page.locator('.skill-card').first().click({force:true});assert.equal(await page.locator('#skill-choice').evaluate(e=>e.hidden),true);
 await page.evaluate(()=>{const q=__slimeGameQA;q.combat.cards=[];q.combat.opening=false;q.world.reset('auto',45);q.world.update(.05,q.state.player,100);q.draw();});await capture('quiet','00:45');
 await page.evaluate(()=>{const q=__slimeGameQA,p=q.state.player,w=q.world;w.reset('auto',540);for(let i=0;i<4;i++)w.spawn(p,['thorn','spark','turtle','water'][i]);w.enemies.forEach((e,i)=>{e.x=p[0]-4.5+i*3;e.z=p[2]-1;e.attack=10;e.pandaCooldown=10;e.turtleGuardCooldown=10;});q.draw();});await capture('forest-creatures','09:00');
 await page.evaluate(()=>{const q=__slimeGameQA,p=q.state.player,w=q.world;w.reset('auto',300);w.update(.05,p,100);Object.assign(w.enemies[0],{x:p[0]-2.5,z:p[2]-.5,pandaAge:.4});q.draw();});await capture('panda-event','05:00');
 const gl=await page.evaluate(()=>document.querySelector('#world').getContext('webgl2').getError());assert.equal(gl,0);assert.deepEqual(errors,[]);
 report={...report,passed:true,errors};console.log('PACING VERIFIED',JSON.stringify({engine,cases,menu,hud,errors}));
}catch(e){report={...report,error:e.stack,errors};console.error(JSON.stringify(report,null,2));process.exitCode=1;}
finally{await writeFile(`test-results/pacing-${engine}.json`,JSON.stringify(report,null,2));await browser.close();}
