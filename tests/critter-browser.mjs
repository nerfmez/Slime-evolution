import {createRequire} from 'node:module';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const {chromium}=createRequire('/tmp/critter-browser/package.json')('playwright');
mkdirSync('/tmp/critter-review',{recursive:true});
const server=spawn('python3',['-m','http.server','8765','--directory','published/2026-09-14'],{stdio:'ignore'});
let browser,page;
try{
 for(let i=0;i<40;i++){try{await fetch('http://127.0.0.1:8765');break}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 page=await browser.newPage({viewport:{width:960,height:720},hasTouch:true,deviceScaleFactor:1});
 const errors=[],missing=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))missing.push(r.url())});
 await page.addInitScript(()=>{localStorage.setItem('slime.audio.v1',JSON.stringify({enabled:false,volume:.35}));localStorage.setItem('slime.graphics.v1',JSON.stringify({preset:'low',showStats:true}))});
 await page.route('**/main-critter-v4.js',route=>route.fulfill({contentType:'text/javascript',body:readFileSync('published/2026-09-14/assets/main-critter-v4.js','utf8').replaceAll('requestAnimationFrame(Zr)','(window.__critterFreeze||requestAnimationFrame(Zr))')+'\nwindow.__critterTest={combat:Y,world:J,state:W,renderer:()=>Hr,vp:()=>X,frame:Zr};'}));
 await page.goto('http://127.0.0.1:8765',{waitUntil:'load',timeout:60000});
 await page.waitForFunction(()=>Number(document.getElementById('stats').dataset.frames)>2,{},{timeout:120000});
 await page.evaluate(()=>{const t=window.__critterTest,{combat:c,world:w,state:s}=t;const rev=c.revision+1;c.reset();c.revision=rev;c.cards=[];c.opening=false;c.needed=99999;c.equipped=[];w.enemies=[];w.defeated=[];s.mobs=0;s.paused=true;window.__critterFreeze=true;c.souls=[{x:s.player[0]-1.2,z:s.player[2]-2.1,id:1,value:2,age:1},{x:s.player[0],z:s.player[2]-2.1,id:7,value:12,age:1},{x:s.player[0]+1.2,z:s.player[2]-2.1,id:18,value:24,age:1}];c.pickups=['heal','magnet','nova'].map((kind,i)=>({kind,x:s.player[0]+(i-1)*1.25,z:s.player[2]+1.2,age:1,id:90+i}));for(let i=0;i<2;i++)c.update(1/60,w,s.player);const high=c.souls[2].critter;high.seed=.9;high.expValue=null;high.moving=1;high.phase=8;t.frame(performance.now())});
 await page.waitForTimeout(1800);await page.evaluate(()=>window.__critterTest.frame(performance.now()));
 await page.screenshot({path:'/tmp/critter-review/approved-sprites-game.png',timeout:60000});
 const result=await page.evaluate(()=>{const {combat:c,world:w,state:s,renderer,vp}=window.__critterTest,p=s.player;function setup(){const rev=c.revision+1;c.reset();c.revision=rev;c.cards=[];c.opening=false;c.needed=99999;c.equipped=[];w.enemies=[];w.defeated=[];w.finished=false;w.hp=40;s.paused=true}function step(n=100){for(let i=0;i<n;i++)c.update(1/60,w,p)}
  setup();c.souls=[{x:p[0]+.9,z:p[2],age:1,value:2,id:12}];step(90);const noModXP=c.xp,escapeDistance=Math.hypot(c.souls[0].x-p[0],c.souls[0].z-p[2]);step(180);const noModLaterXP=c.xp;
  setup();c.mods.magnet=1;c.souls=[{x:p[0]+.7,z:p[2],age:1,value:2,id:13}];step(90);const firstModXP=c.xp;
  setup();c.pickups=[{kind:'heal',x:p[0],z:p[2],age:1,id:20}];step();const heal=w.hp;
  setup();c.souls=[{x:p[0]+15,z:p[2],age:1,value:7,id:50}];c.pickups=[{kind:'magnet',x:p[0],z:p[2],age:1,id:21}];step(180);const magnetXP=c.xp;step(60);const repeatedXP=c.xp;
  setup();w.enemies=[{id:500,type:'thorn',x:p[0]+2,z:p[2],hp:10,radius:.3},{id:501,type:'thorn',elite:true,x:p[0]+3,z:p[2],hp:30,radius:.4}];c.pickups=[{kind:'nova',x:p[0],z:p[2],age:1,id:22}];step();const novaHP=w.enemies.map(e=>e.hp);
  setup();const o={x:p[0]+8,z:p[2],age:1,value:12,id:199};c.souls=[o];step(1);const actor=o.critter,home=[actor.homeX,actor.homeZ],form=actor.expForm;w.defeated=[{type:'crystal',x:o.x,z:o.z,hp:0}];step(1);const promoted={value:o.value,tier:actor.expTier,sameActor:actor===o.critter,sameForm:form===actor.expForm,sameHome:home[0]===actor.homeX&&home[1]===actor.homeZ};
  setup();const vals=[2,5,6,10,12,15,18,24,30,56],many=Array.from({length:1000},(_,i)=>({x:p[0]+(i%25)*.08,z:p[2]+Math.floor(i/25)*.05,value:vals[i%vals.length],id:i+1,age:1}));const batch=renderer().draw(many,vp(),1,p,()=>true),glError=document.getElementById('world').getContext('webgl2').getError();
  setup();s.paused=false;window.__critterFreeze=false;requestAnimationFrame(window.__critterTest.frame);return {noModXP,noModLaterXP,escapeDistance,firstModXP,heal,magnetXP,repeatedXP,novaHP,promoted,batch,glError};});
 writeFileSync('/tmp/critter-review/integration.json',JSON.stringify(result,null,2));
 assert.deepEqual(result.promoted,{value:22,tier:2,sameActor:true,sameForm:true,sameHome:true});assert.equal(result.noModXP,0);assert.equal(result.noModLaterXP,0);assert.ok(result.escapeDistance>.9&&result.escapeDistance<1.4);assert.equal(result.firstModXP,2);assert.equal(result.heal,62);assert.equal(result.magnetXP,7);assert.equal(result.repeatedXP,7);assert.equal(result.novaHP[0],0);assert.equal(result.novaHP[1],30);assert.equal(result.batch.calls,1);assert.equal(result.batch.count,1000);assert.equal(result.glError,0);
 const before=await page.evaluate(()=>[...window.__critterTest.state.player]),cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:210,y:610}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:280,y:610}]});await page.waitForTimeout(1200);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const after=await page.evaluate(()=>[...window.__critterTest.state.player]);assert.ok(Math.hypot(after[0]-before[0],after[2]-before[2])>.01);
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);const report={...result,touchMoved:true,errors,missing,verification:'Chromium software WebGL2; physical iPad/Android FPS not measured'};writeFileSync('/tmp/critter-review/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){writeFileSync('/tmp/critter-review/error.txt',error.stack||String(error));if(page)await page.screenshot({path:'/tmp/critter-review/failure.png'}).catch(()=>{});throw error}finally{await browser?.close();server.kill()}
