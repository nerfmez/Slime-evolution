import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173'],{stdio:['ignore','pipe','pipe']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitServer(){for(let i=0;i<80;i++){try{const r=await fetch('http://127.0.0.1:4173/');if(r.ok)return;}catch{}await sleep(150);}throw Error('Vite preview did not start');}
const transparentPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFUlEQVR4nGP8//8/AwMDAwMTAxQAADAGAwG63ES+AAAAAElFTkSuQmCC','base64');

mkdirSync('/tmp/stage1-animal-review',{recursive:true});
let browser,page;
try{
 await waitServer();
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 page=await browser.newPage({viewport:{width:1180,height:820},hasTouch:true,deviceScaleFactor:1});page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(30000);
 // Some legacy fire-VFX PNGs were never copied into the migrated source tree. They are
 // unrelated to the Stage 1 animal pass, so stub only those requests for this focused runtime check.
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url()),path=url.pathname;
  if(path.includes('/assets/vfx/')&&path.endsWith('.png'))return route.fulfill({status:200,contentType:'image/png',body:transparentPng});
  return route.continue();
 });
 const errors=[],missing=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))missing.push(`${r.status()} ${r.url()}`);});
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'load'});await page.waitForTimeout(1200);
 const startupError=await page.locator('#error').isVisible()?await page.locator('#error').textContent():'';assert.equal(startupError,'',`game failed during startup: ${startupError}`);
 await page.waitForFunction(()=>Number(document.getElementById('stats')?.dataset.frames||0)>2,{},{timeout:10000});
 await page.locator('#skill-choice .skill-card').first().waitFor({state:'visible',timeout:10000});await page.locator('#skill-choice .skill-card').first().click({timeout:10000});
 const modes=[['thorn','Moss Frog'],['moss','Spark Hedgehog'],['petal','Pond Turtle'],['crystal','Water Calf'],['panda','Forest Panda']];
 const checked=[];
 for(const [mode,name] of modes){
  await page.evaluate(selected=>{const select=document.getElementById('enemy-mode');select.value=selected;select.dispatchEvent(new Event('change',{bubbles:true}));document.getElementById('restart').click();},mode);
  await page.waitForTimeout(1500);
  const gameError=await page.locator('#error').isVisible()?await page.locator('#error').textContent():'';assert.equal(gameError,'',`game error while reviewing ${name}: ${gameError}`);
  const roster=await page.locator('#roster').textContent();assert.match(roster,new RegExp(name));
  const glError=await page.evaluate(()=>document.getElementById('world').getContext('webgl2').getError());assert.equal(glError,0,`${name} left a WebGL error`);
  checked.push({name,roster,glError});
 }
 assert.deepEqual(errors,[],'page emitted JavaScript errors');assert.deepEqual(missing,[],'game requested missing non-VFX files');
 const report={checked,errors,missing,verification:'Packaged build ran all five Stage 1 enemy modes in Chromium software WebGL2 with no page/game/WebGL errors. Legacy migrated VFX PNGs were stubbed only for this focused animal runtime check; visual approval and physical iPad/Android FPS are separate checks.'};writeFileSync('/tmp/stage1-animal-review/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){writeFileSync('/tmp/stage1-animal-review/error.txt',error.stack||String(error));throw error;}finally{if(browser)await browser.close();server.kill('SIGTERM');}
