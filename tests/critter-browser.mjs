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
 page=await browser.newPage({viewport:{width:1180,height:820},hasTouch:true,deviceScaleFactor:1});
 const errors=[],missing=[];page.on('pageerror',e=>errors.push(String(e)));
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))missing.push(r.url());});
 await page.addInitScript(()=>{localStorage.setItem('slime.audio.v1',JSON.stringify({enabled:false,volume:.35}));localStorage.setItem('slime.graphics.v1',JSON.stringify({preset:'balanced',showStats:true}));});
 await page.route('**/main-critter-v1.js',route=>route.fulfill({contentType:'text/javascript',body:readFileSync('published/2026-09-14/assets/main-critter-v1.js','utf8')+'\nwindow.__critterTest={combat:Y,world:J,state:W,renderer:()=>Hr,vp:()=>X};'}));
 await page.goto('http://127.0.0.1:8765',{waitUntil:'load',timeout:60000});
 await page.waitForFunction(()=>Number(document.getElementById('stats').dataset.frames)>2,{},{timeout:120000});
 await page.evaluate(()=>{
  const {combat:c,world:w,state:s}=window.__critterTest;c.reset();c.cards=[];c.opening=false;c.needed=99999;c.equipped=[];w.enemies=[];w.defeated=[];s.mobs=0;s.paused=true;
  c.souls=Array.from({length:3},(_,i)=>({x:s.player[0]+(i-1)*1.1,z:s.player[2]-2.2,id:i+1,value:4,age:1,critter:{variant:i,seed:.3,homeX:0,homeZ:0,facing:1,phase:.5,moving:0,eat:0,finished:false}}));
  c.pickups=['heal','magnet','nova'].map((kind,i)=>({kind,x:s.player[0]+(i-1)*1.1,z:s.player[2]+1.1,age:1}));
 });
 await page.waitForTimeout(700);
 await page.screenshot({path:'/tmp/critter-review/critter-game.png'});
 const result=await page.evaluate(()=>{
  const {combat:c,world:w,state:s,renderer,vp}=window.__critterTest,p=s.player;
  function setup(){c.reset();c.cards=[];c.opening=false;c.needed=99999;c.equipped=[];w.enemies=[];w.defeated=[];w.finished=false;w.hp=40;}
  function step(n=100){for(let i=0;i<n;i++)c.update(1/60,w,p);}
  setup();c.pickups=[{kind:'heal',x:p[0],z:p[2],age:1}];step();const heal=w.hp;
  setup();c.souls=[{x:p[0]+15,z:p[2],age:1,value:7,id:50}];c.pickups=[{kind:'magnet',x:p[0],z:p[2],age:1}];step(180);const magnetXP=c.xp;step(60);const repeatedXP=c.xp;
  setup();w.enemies=[{id:500,type:'thorn',x:p[0]+2,z:p[2],hp:10,radius:.3},{id:501,type:'thorn',elite:true,x:p[0]+3,z:p[2],hp:30,radius:.4}];c.pickups=[{kind:'nova',x:p[0],z:p[2],age:1}];step();const novaHP=w.enemies.map(e=>e.hp);
  setup();const many=Array.from({length:1000},(_,i)=>({x:p[0]+(i%25)*.08,z:p[2]+Math.floor(i/25)*.05,value:2,id:i+1,age:1}));
  const batch=renderer().draw(many,vp(),1,p,()=>true);const glError=document.getElementById('world').getContext('webgl2').getError();
  setup();s.paused=false;return {heal,magnetXP,repeatedXP,novaHP,batch,glError};
 });
 assert.equal(result.heal,62);assert.equal(result.magnetXP,7);assert.equal(result.repeatedXP,7);assert.equal(result.novaHP[0],0);assert.equal(result.novaHP[1],30);assert.equal(result.batch.calls,1);assert.equal(result.batch.count,1000);assert.equal(result.glError,0);
 const before=await page.evaluate(()=>[...window.__critterTest.state.player]);
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:210,y:610}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:280,y:610}]});
 await page.waitForTimeout(600);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const after=await page.evaluate(()=>[...window.__critterTest.state.player]);
 assert.ok(Math.hypot(after[0]-before[0],after[2]-before[2])>.01,'Touch joystick must still move the slime');
 await page.screenshot({path:'/tmp/critter-review/critter-after-touch.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 const report={...result,touchMoved:true,errors,missing,verification:'Chromium software WebGL2, touch-emulated viewport; not physical iPad/Android FPS'};
 writeFileSync('/tmp/critter-review/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){
 writeFileSync('/tmp/critter-review/error.txt',error.stack||String(error));
 if(page){await page.screenshot({path:'/tmp/critter-review/failure.png'}).catch(()=>{});writeFileSync('/tmp/critter-review/page.txt',await page.locator('body').innerText().catch(()=>''));}
 throw error;
}finally{await browser?.close();server.kill();}
