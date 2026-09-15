import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const base='http://127.0.0.1:4173';
const server=spawn('python3',['-m','http.server','4173','--bind','127.0.0.1','--directory','published/2026-09-14'],{stdio:['ignore','pipe','pipe']});
let log='';server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);

async function waitForServer(){
 for(let i=0;i<80;i++){
  try{const r=await fetch(base);if(r.ok)return;}catch{}
  await new Promise(r=>setTimeout(r,125));
 }
 throw new Error('Authoritative release server did not start\n'+log);
}

try{
 await waitForServer();
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1024,height:768}});
  const pageErrors=[];const oldThornRequests=[];const failedRequests=[];
  page.on('pageerror',e=>pageErrors.push(String(e)));
  page.on('requestfailed',r=>failedRequests.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText||'failed'}`));
  page.on('request',r=>{if(r.url().includes('thorn-sprite.png'))oldThornRequests.push(r.url());});
  await page.goto(base,{waitUntil:'networkidle',timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#stats')?.textContent.includes('FPS'),null,{timeout:15000});

  assert.deepEqual(pageErrors,[],'browser must not throw page errors');
  const relevantFailed=failedRequests.filter(x=>!x.includes('player-slime-directions.webp?v=3 :: net::ERR_ABORTED'));
  assert.deepEqual(relevantFailed,[],'authoritative release must not have unexpected failed requests');

  const frogAsset=await page.evaluate(async()=>{
   const r=await fetch('/assets/enemies/frog-moveset.png',{cache:'no-store'});
   const bytes=(await r.arrayBuffer()).byteLength;
   return {status:r.status,ok:r.ok,bytes,type:r.headers.get('content-type')||''};
  });
  assert.equal(frogAsset.status,200,'frog atlas must be present in the authoritative release');
  assert.ok(frogAsset.bytes>10000,'frog atlas must contain the real image, not a placeholder');
  assert.match(frogAsset.type,/image\/png/,'frog atlas must be served as PNG');
  assert.equal(oldThornRequests.length,0,'normal Thorn sprite atlas must not be requested');

  const rendererState=await page.evaluate(()=>{
   const select=document.querySelector('#thorn-view');
   return {
    value:select?.value,
    disabled:select?.options?.[0]?.disabled===true,
    frogFrameHook:typeof globalThis.__slimeFrogFrame==='function'
   };
  });
  assert.equal(rendererState.value,'sprite','Moss Frog sprite renderer must initialize');
  assert.equal(rendererState.disabled,false,'Moss Frog sprite renderer must not fall back to the model');
  assert.equal(rendererState.frogFrameHook,true,'patched Moss Frog renderer must execute');

  await page.evaluate(()=>{
   const mode=document.querySelector('#enemy-mode');
   const mobs=document.querySelector('#mobs');
   mode.value='thorn';
   mode.dispatchEvent(new Event('change',{bubbles:true}));
   if(mobs){mobs.value=[...mobs.options].some(o=>o.value==='12')?'12':mobs.value;mobs.dispatchEvent(new Event('change',{bubbles:true}));}
   document.querySelector('#restart')?.click();
  });
  await page.waitForTimeout(1800);

  await mkdir('/tmp/frog-review',{recursive:true});
  await page.screenshot({path:'/tmp/frog-review/frog-game.png',fullPage:true});
  const debugState=await page.evaluate(()=>({
   status:document.querySelector('#status')?.textContent||'',
   roster:document.querySelector('#roster')?.textContent||'',
   stats:document.querySelector('#stats')?.textContent||'',
   error:document.querySelector('#error')?.textContent||'',
   errorHidden:document.querySelector('#error')?.hidden!==false
  }));
  await writeFile('/tmp/frog-review/state.json',JSON.stringify(debugState,null,2));

  assert.match(debugState.roster,/Moss Frog/,'normal Thorn slot must identify as Moss Frog');
  assert.match(debugState.stats,/FPS/,'render loop must be alive');
  assert.equal(debugState.errorHidden,true,`game error panel must stay hidden: ${debugState.error}`);
 }finally{await browser.close();}
}finally{
 server.kill('SIGTERM');
}
