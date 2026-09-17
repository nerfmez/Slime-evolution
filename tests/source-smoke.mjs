import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { verifyRemote } from '../scripts/release-guard.mjs';

const url=process.env.SMOKE_URL || 'http://127.0.0.1:4173/';
const sha=process.env.EXPECTED_COMMIT || process.env.GITHUB_SHA;
const engine=process.env.BROWSER || 'chromium';
const output=process.env.SMOKE_OUTPUT || `test-results/${engine}`;
await mkdir(output,{recursive:true});
await verifyRemote(url,sha);
const browser=await (engine==='webkit'?webkit:chromium).launch({
  headless:engine!=='webkit',
  ...(engine==='chromium'?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']}: {})
});
const report={commit:sha,url,engine,cases:[]};
const extraHTTPHeaders=process.env.VERCEL_AUTOMATION_BYPASS_SECRET?{'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET}:{};
async function state(page){return page.evaluate(()=>({
  build:document.querySelector('meta[name="slime-build"]')?.content,
  errorHidden:document.getElementById('error')?.hidden===true,
  errorText:document.getElementById('error')?.textContent||'',
  frames:Number(document.getElementById('stats')?.dataset.frames||0),
  status:document.getElementById('status')?.textContent||'',
  roster:document.getElementById('roster')?.textContent||'',
  canvas:!!document.getElementById('world')?.width
}));}
async function ready(page){
  await page.waitForFunction(()=>!document.getElementById('error')?.hidden || Number(document.getElementById('stats')?.dataset.frames||0)>2,{},{timeout:60000});
  const s=await state(page);
  assert.equal(s.build,sha,'Wrong loaded build');
  assert.ok(s.errorHidden,`Scene error: ${s.errorText}`);
  assert.ok(s.frames>2 && s.canvas,`Render did not start: ${JSON.stringify(s)}`);
  return s;
}
async function healthy(page,errors){
  const before=(await state(page)).frames;
  await page.waitForFunction(n=>Number(document.getElementById('stats')?.dataset.frames||0)>n+2,before,{timeout:30000});
  const s=await state(page);
  assert.ok(s.errorHidden,`Scene error: ${s.errorText}`);
  assert.deepEqual(errors,[],'Runtime/network errors');
  return s;
}
try{
  for(const [name,viewport] of [['tablet',{width:1024,height:1366}],['phone',{width:390,height:844}]]){
    const context=await browser.newContext({viewport,hasTouch:true,deviceScaleFactor:1,extraHTTPHeaders});
    const page=await context.newPage(),errors=[],requests=new Set();
    page.on('pageerror',e=>errors.push(`JS: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon.ico'))errors.push(`console: ${m.text()}`);});
    page.on('requestfailed',r=>errors.push(`Network: ${r.url()} ${r.failure()?.errorText}`));
    page.on('request',r=>{
      const u=new URL(r.url());requests.add(u.pathname);
      if(u.protocol.startsWith('http') && u.origin!==new URL(url).origin)errors.push(`External dependency: ${r.url()}`);
      if(/\/assets\/enemies\/crystal(?:[.-]|\/)/.test(u.pathname))errors.push(`Removed Crystal requested: ${u.pathname}`);
    });
    page.on('response',r=>{
      if(r.status()>=400 && !r.url().endsWith('/favicon.ico'))errors.push(`HTTP ${r.status()}: ${r.url()}`);
      if(r.headers()['content-type']?.startsWith('text/html') && /\.(png|webp|json|bin|js|css)(?:\?|$)/.test(r.url()))errors.push(`HTML fallback: ${r.url()}`);
    });
    try{
      const response=await page.goto(url,{waitUntil:'load',timeout:60000});
      assert.ok(response?.ok(),'Page HTTP failure');
      await ready(page);
      await page.evaluate(()=>{const x=document.getElementById('mobs');x.value='12';x.dispatchEvent(new Event('change',{bubbles:true}));});
      const modes=[];
      for(const mode of ['water','thorn','moss','petal','all','elites','boss']){
        await page.evaluate(mode=>{
          const select=document.getElementById('enemy-mode');
          if(!select||![...select.options].some(o=>o.value===mode))throw Error(`Missing mode ${mode}`);
          select.value=mode;select.dispatchEvent(new Event('change',{bubbles:true}));
          document.getElementById('restart')?.click();
        },mode);
        const s=await healthy(page,errors);
        if(mode==='water'){
          assert.ok(s.roster.includes('Water Calf'),`Water Calf missing: ${s.roster}`);
          assert.ok(requests.has('/assets/enemies/water-calf-atlas.webp'),'Water Calf atlas was not requested');
          await page.screenshot({path:`${output}/${name}-water.png`});
        }
        modes.push({mode,frames:s.frames,roster:s.roster});
      }
      await page.reload({waitUntil:'load',timeout:60000});await ready(page);await healthy(page,errors);
      report.cases.push({name,result:'pass',modes,requestedFiles:requests.size});
    }catch(e){
      await page.screenshot({path:`${output}/${name}-failure.png`}).catch(()=>{});
      report.cases.push({name,result:'fail',error:e.message,state:await state(page).catch(()=>null),errors});throw e;
    }finally{await context.close();}
  }
  if(process.env.TEST_MISSING_ASSET==='1'){
    const context=await browser.newContext({viewport:{width:390,height:844},extraHTTPHeaders});const page=await context.newPage();
    try{
      await page.route('**/assets/grass-painted.png*',route=>route.fulfill({status:404,contentType:'text/plain',body:'Injected missing grass'}));
      await page.goto(url,{waitUntil:'load'});
      await page.waitForFunction(()=>document.getElementById('error')?.hidden===false,{},{timeout:30000});
      const s=await state(page);
      assert.match(s.errorText,/grass-painted\.png.*404/,'Missing grass must produce an explicit path + HTTP error, not a fake success');
      assert.equal(s.frames,0,'Must not report a booted scene when mandatory grass is missing');
      report.cases.push({name:'injected-grass-404',result:'correctly rejected',error:s.errorText});
    }finally{await context.close();}
  }
  console.log('RUNTIME VERIFIED',JSON.stringify(report));
}finally{
  await writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n');
  await browser.close();
}
