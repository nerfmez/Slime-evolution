import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173'],{stdio:['ignore','pipe','pipe']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitServer(){for(let i=0;i<80;i++){try{const r=await fetch('http://127.0.0.1:4173/');if(r.ok)return;}catch{}await sleep(150);}throw Error('Vite preview did not start');}
const transparentPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR4nGP8//8/AwMDAwMTAxQAADAGAwG63ES+AAAAAElFTkSuQmCC','base64');
const withTimeout=(promise,ms,label)=>Promise.race([promise,sleep(ms).then(()=>{throw Error(`${label} timed out after ${ms}ms`);})]);

mkdirSync('/tmp/stage1-animal-review',{recursive:true});
let browser,page,cdp;
async function capture(name){
 console.log('capture',name);
 const shot=await withTimeout(cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false}),7000,`capture ${name}`);
 writeFileSync(`/tmp/stage1-animal-review/${name}.png`,Buffer.from(shot.data,'base64'));
}
try{
 console.log('wait server');await waitServer();
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 page=await browser.newPage({viewport:{width:1180,height:820},hasTouch:true,deviceScaleFactor:1});page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(30000);
 cdp=await page.context().newCDPSession(page);
 await page.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;
  if(path.includes('/assets/vfx/')&&path.endsWith('.png'))return route.fulfill({status:200,contentType:'image/png',body:transparentPng});
  return route.continue();
 });
 const errors=[],missing=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))missing.push(`${r.status()} ${r.url()}`);});
 console.log('open game');await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});await page.waitForTimeout(1800);await capture('startup');
 const startupError=await page.locator('#error').isVisible()?await page.locator('#error').textContent():'';assert.equal(startupError,'',`game failed during startup: ${startupError}`);
 console.log('wait renderer');await page.waitForFunction(()=>Number(document.getElementById('stats')?.dataset.frames||0)>2,{},{timeout:10000});
 console.log('choose starter');await page.locator('#skill-choice .skill-card').first().waitFor({state:'visible',timeout:10000});await page.locator('#skill-choice .skill-card').first().click({timeout:10000});
 const modes=[['thorn','Moss Frog'],['moss','Spark Hedgehog'],['petal','Pond Turtle'],['crystal','Water Calf'],['panda','Forest Panda']];
 for(const [mode,name] of modes){
  console.log('review',name);
  await page.evaluate(selected=>{const select=document.getElementById('enemy-mode');select.value=selected;select.dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('restart').click();},mode);
  await page.waitForTimeout(2400);
  const gameError=await page.locator('#error').isVisible()?await page.locator('#error').textContent():'';assert.equal(gameError,'',`game error while reviewing ${name}: ${gameError}`);
  assert.match(await page.locator('#roster').textContent(),new RegExp(name));await capture(mode);
 }
 assert.deepEqual(errors,[],'page emitted JavaScript errors');assert.deepEqual(missing,[],'game requested missing non-VFX files');
 const report={modes:modes.map(x=>x[1]),errors,missing,verification:'Packaged game renderer in Chromium software WebGL2. Legacy migrated VFX PNG requests are stubbed only for this animal-focused review; physical iPad/Android FPS not measured.'};writeFileSync('/tmp/stage1-animal-review/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){writeFileSync('/tmp/stage1-animal-review/error.txt',error.stack||String(error));if(cdp)await capture('failure').catch(()=>{});throw error;}finally{if(browser)await browser.close();server.kill('SIGTERM');}
