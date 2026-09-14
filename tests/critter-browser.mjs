import {createRequire} from 'node:module';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const require=createRequire('/tmp/critter-browser/package.json');
const {chromium}=require('playwright');
mkdirSync('/tmp/critter-review',{recursive:true});
const server=spawn('python3',['-m','http.server','8765','--directory','published/2026-09-14'],{stdio:'ignore'});
let browser,page;
try{
 for(let n=0;n<40;n++){try{await fetch('http://127.0.0.1:8765');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 page=await browser.newPage({viewport:{width:960,height:720},hasTouch:true,deviceScaleFactor:1});
 const errors=[],missing=[];page.on('pageerror',e=>errors.push(String(e)));
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))missing.push(r.url());});
 await page.addInitScript(()=>{localStorage.setItem('slime.audio.v1',JSON.stringify({enabled:false,volume:.35}));localStorage.setItem('slime.graphics.v1',JSON.stringify({preset:'low',showStats:true}));});
 await page.route('**/main-critter-v2.js',route=>route.fulfill({contentType:'text/javascript',body:readFileSync('published/2026-09-14/assets/main-critter-v2.js','utf8').replaceAll('requestAnimationFrame(Zr)','(window.__critterFreeze||requestAnimationFrame(Zr))')+'\nwindow.__critterTest={combat:Y,world:J,state:W,renderer:()=>Hr,vp:()=>X,frame:Zr};'}));
 await page.goto('http://127.0.0.1:8765',{waitUntil:'load',timeout:60000});
 await page.waitForFunction(()=>Number(document.getElementById('stats').dataset.frames)>2,{},{timeout:120000});
 await page.evaluate(()=>{
  const {combat:c,world:w,state:s}=window.__critterTest;const revision=c.revision+1;c.reset();c.revision=revision;c.cards=[];c.opening=false;c.needed=99999;c.equipped=[];w.enemies=[];w.defeated=[];s.mobs=0;s.paused=true;window.__critterFreeze=true;
  c.souls=Array.from({length:3},(_,i)=>({x:s.player[0]+(i-1)*1.1,z:s.player[2]-2.2,id:i+1,value:4,age:1,critter:{variant:i,seed:.3,homeX:0,homeZ:0,facing:1,phase:.5,moving:0,eat:0,finished:false}}));
  c.pickups=['heal','magnet','nova'].map((kind,i)=>({kind,x:s.player[0]+(i-1)*1.1,z:s.player[2]+1.1,age:1}));
 });
 await page.waitForTimeout(1600);
 await page.screenshot({path:'/tmp/critter-review/critter-game.png',timeout:60000});
 // Four real-game checkpoints of the bounded escape; separate from the design sheet.
 await page.evaluate(()=>{const {combat:c,world:w,state:s}=window.__critterTest;const p=s.player;c.souls=[{id:91,x:p[0]+.85,z:p[2],age:1,value:2}];c.pickups=[];w.hp=100;w.finished=false;});
 for(let frame=0;frame<4;frame++){
  await page.evaluate(()=>{const t=window.__critterTest;for(let i=0;i<10;i++)t.combat.update(1/60,t.world,t.state.player);t.frame(performance.now());});
  await page.screenshot({path:`/tmp/critter-review/critter-flee-${frame}.png`,timeout:60000});
 }
 await page.evaluate(async()=>{
  const {createCritterRenderer}=await import('/assets/critters-v2/renderer.js');
  const canvas=document.createElement('canvas');canvas.id='critter-shape-review';canvas.width=960;canvas.height=240;
  Object.assign(canvas.style,{position:'fixed',inset:'0',zIndex:'9999',width:'960px',height:'240px'});document.body.append(canvas);
  const gl=canvas.getContext('webgl2',{preserveDrawingBuffer:true});gl.clearColor(.13,.20,.18,1);gl.clear(gl.COLOR_BUFFER_BIT);
  const actors=Array.from({length:6},(_,i)=>({id:100+i,x:-5+i*2,z:0,value:4,kind:i>2?['heal','magnet','nova'][i-3]:undefined,age:2,critter:{variant:i,seed:.3,homeX:0,homeZ:0,facing:1,phase:.5,moving:0,eat:0,finished:false}}));
  // 12 by 3 orthographic sheet, enlarged only for review of shader details.
  const vp=new Float32Array([1/6,0,0,0,0,2/3,0,0,0,0,1,0,0,-.4,0,1]);
  for(const o of actors){o.critter.eat=0;}const draw=createCritterRenderer(gl);draw.draw(actors,vp,3,[0,0,0],()=>true);
 });
 await page.locator('#critter-shape-review').screenshot({path:'/tmp/critter-review/critter-designs.png'});
 await page.evaluate(()=>document.getElementById('critter-shape-review').remove());
 const result=await page.evaluate(()=>{
  const {combat:c,world:w,state:s,renderer,vp}=window.__critterTest,p=s.player;
  function setup(){const revision=c.revision+1;c.reset();c.revision=revision;c.cards=[];c.opening=false;c.needed=99999;c.equipped=[];w.enemies=[];w.defeated=[];w.finished=false;w.hp=40;}
  function step(n=100){for(let i=0;i<n;i++)c.update(1/60,w,p);}
  setup();c.souls=[{x:p[0]+.9,z:p[2],age:1,value:2,id:12}];step(90);const noModXP=c.xp,escapeDistance=Math.hypot(c.souls[0].x-p[0],c.souls[0].z-p[2]);step(180);const noModLaterXP=c.xp;
  setup();c.mods.magnet=1;c.souls=[{x:p[0]+.7,z:p[2],age:1,value:2,id:12}];step(90);const firstModXP=c.xp;
  setup();c.pickups=[{kind:'heal',x:p[0],z:p[2],age:1}];step();const heal=w.hp;
  setup();c.souls=[{x:p[0]+15,z:p[2],age:1,value:7,id:50}];c.pickups=[{kind:'magnet',x:p[0],z:p[2],age:1}];step(180);const magnetXP=c.xp;step(60);const repeatedXP=c.xp;
  setup();w.enemies=[{id:500,type:'thorn',x:p[0]+2,z:p[2],hp:10,radius:.3},{id:501,type:'thorn',elite:true,x:p[0]+3,z:p[2],hp:30,radius:.4}];c.pickups=[{kind:'nova',x:p[0],z:p[2],age:1}];step();const novaHP=w.enemies.map(e=>e.hp);
  setup();const many=Array.from({length:1000},(_,i)=>({x:p[0]+(i%25)*.08,z:p[2]+Math.floor(i/25)*.05,value:2,id:i+1,age:1}));
  const batch=renderer().draw(many,vp(),1,p,()=>true);const glError=document.getElementById('world').getContext('webgl2').getError();
  setup();s.paused=false;window.__critterFreeze=false;requestAnimationFrame(window.__critterTest.frame);return {noModXP,noModLaterXP,escapeDistance,firstModXP,heal,magnetXP,repeatedXP,novaHP,batch,glError};
 });
 writeFileSync('/tmp/critter-review/integration.json',JSON.stringify(result,null,2));
 assert.equal(result.noModXP,0);assert.equal(result.noModLaterXP,0);assert.ok(result.escapeDistance>.9);assert.ok(result.escapeDistance<1.4);assert.equal(result.firstModXP,2);assert.equal(result.heal,62);assert.equal(result.magnetXP,7);assert.equal(result.repeatedXP,7);assert.equal(result.novaHP[0],0);assert.equal(result.novaHP[1],30);assert.equal(result.batch.calls,1);assert.equal(result.batch.count,1000);assert.equal(result.glError,0);
 const before=await page.evaluate(()=>[...window.__critterTest.state.player]);
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:210,y:610}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:280,y:610}]});
 await page.waitForTimeout(1500);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const after=await page.evaluate(()=>[...window.__critterTest.state.player]);
 assert.ok(Math.hypot(after[0]-before[0],after[2]-before[2])>.01,'Touch joystick must still move the slime');
 await page.evaluate(()=>{window.__critterFreeze=true;});await page.waitForTimeout(1000);
 await page.screenshot({path:'/tmp/critter-review/critter-after-touch.png',timeout:60000});
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 const report={...result,touchMoved:true,errors,missing,verification:'Chromium software WebGL2, touch-emulated viewport; not physical iPad/Android FPS'};
 writeFileSync('/tmp/critter-review/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){
 writeFileSync('/tmp/critter-review/error.txt',error.stack||String(error));
 if(page){await page.evaluate(()=>{window.__critterFreeze=true;}).catch(()=>{});await page.screenshot({path:'/tmp/critter-review/failure.png'}).catch(()=>{});writeFileSync('/tmp/critter-review/page.txt',await page.locator('body').innerText().catch(()=>''));}
 throw error;
}finally{await browser?.close();server.kill();}
