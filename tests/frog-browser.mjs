import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const base='http://127.0.0.1:4173';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4173'],{stdio:['ignore','pipe','pipe']});
let log='';server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);

async function waitForServer(){
 for(let i=0;i<80;i++){
  try{const r=await fetch(base);if(r.ok)return;}catch{}
  await new Promise(r=>setTimeout(r,125));
 }
 throw new Error('Vite preview did not start\n'+log);
}

try{
 await waitForServer();
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1024,height:768}});
  const pageErrors=[];const oldThornRequests=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  page.on('request',r=>{if(r.url().includes('thorn-sprite.png'))oldThornRequests.push(r.url());});
  await page.goto(base,{waitUntil:'networkidle',timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#stats')?.textContent.includes('FPS'),null,{timeout:15000});

  const initialStatus=await page.locator('#status').textContent();
  assert.ok(!initialStatus.includes('กำลังโหลด'),'game must leave the loading state');
  assert.deepEqual(pageErrors,[],'browser must not throw page errors');

  // Probe the production build directly instead of depending on response timing/hash behavior.
  const frogAsset=await page.evaluate(async()=>{
   const r=await fetch('/assets/enemies/frog-moveset.png',{cache:'no-store'});
   const bytes=(await r.arrayBuffer()).byteLength;
   return {status:r.status,ok:r.ok,bytes,type:r.headers.get('content-type')||''};
  });
  assert.equal(frogAsset.status,200,'frog atlas must be present in the production bundle');
  assert.ok(frogAsset.bytes>10000,'frog atlas must contain the real image, not a placeholder');
  assert.match(frogAsset.type,/image\/png/,'frog atlas must be served as PNG');
  assert.equal(oldThornRequests.length,0,'normal Thorn sprite atlas must not be requested');

  // createThornSprite failure flips this selector to model and disables the sprite option.
  const rendererState=await page.evaluate(()=>{
   const select=document.querySelector('#thorn-view');
   return {value:select?.value,disabled:select?.options?.[0]?.disabled===true};
  });
  assert.equal(rendererState.value,'sprite','Moss Frog sprite renderer must initialize');
  assert.equal(rendererState.disabled,false,'Moss Frog sprite renderer must not fall back to the model');

  await page.evaluate(()=>{
   const select=document.querySelector('#enemy-mode');
   select.value='thorn';
   select.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForTimeout(1000);
  const roster=await page.locator('#roster').textContent();
  assert.match(roster,/Moss Frog/,'normal Thorn slot must identify as Moss Frog');
  const stats=await page.locator('#stats').textContent();
  assert.match(stats,/FPS/,'render loop must be alive');

  await mkdir('/tmp/frog-review',{recursive:true});
  await page.screenshot({path:'/tmp/frog-review/frog-game.png',fullPage:true});
 }finally{await browser.close();}
}finally{
 server.kill('SIGTERM');
}
