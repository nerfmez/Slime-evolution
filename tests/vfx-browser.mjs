import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';

const engine=process.env.BROWSER||'chromium';
const url=process.env.SMOKE_URL||'http://127.0.0.1:4173/';
await mkdir('test-results',{recursive:true});
const browser=await({chromium,webkit}[engine]).launch({
  headless:true,
  ...(engine==='chromium'?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']}:{})
});
const page=await browser.newPage({viewport:{width:900,height:650},deviceScaleFactor:1});
page.setDefaultTimeout(45000);
const errors=[];
page.on('pageerror',e=>errors.push('JS '+e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push(`HTTP ${r.status()} ${r.url()}`)});
page.on('requestfailed',r=>errors.push(`NETWORK ${r.url()}: ${r.failure()?.errorText||'failed'}`));

const frames=[];
async function capture(id,delay){
  const value=await page.evaluate(id=>{
    const select=document.getElementById('lab-preset');
    select.value=id;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    document.getElementById('lab-cast').click();
    return select.value;
  },id);
  assert.equal(value,id,'missing skill preset '+id);
  await page.waitForTimeout(delay);
  const state=await page.evaluate(()=>{
    const q=globalThis.__slimeGameQA;
    q.draw();
    const gl=document.querySelector('#world').getContext('webgl2');
    gl.finish();
    return {
      gl:gl.getError(),
      errorHidden:document.getElementById('error').hidden,
      labHidden:document.getElementById('skill-lab').hidden,
      preset:document.getElementById('lab-preset').value
    };
  });
  assert.equal(state.gl,0,id+' WebGL error');
  assert.equal(state.errorHidden,true,id+' game error panel');
  assert.equal(state.labHidden,false,id+' lab closed unexpectedly');
  const path=`test-results/vfx-${engine}-${id}.png`;
  await page.screenshot({path,timeout:45000});
  frames.push({id,path,...state});
}

let report={engine,url,passed:false,frames:[],errors};
try{
  const address=new URL(url);
  address.searchParams.set('qa','1');
  assert.ok((await page.goto(address.href,{waitUntil:'load',timeout:60000}))?.ok());
  await page.waitForFunction(()=>document.querySelector('#error')?.hidden===false||(globalThis.__slimeGameQA?.waterRenderer&&document.querySelector('.skill-card')),null,{timeout:60000});
  assert.equal(await page.locator('#error').evaluate(e=>e.hidden),true,await page.locator('#error').textContent());
  await page.locator('.skill-card').first().click({force:true});
  await page.waitForFunction(()=>!!document.getElementById('skill-test'),null,{timeout:30000});
  await page.evaluate(()=>{
    document.getElementById('skill-test').click();
    const repeat=document.getElementById('lab-repeat');
    repeat.checked=false;
    repeat.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForFunction(()=>document.getElementById('skill-lab')?.hidden===false);

  // Base + representative evolutions. Chain is intentionally omitted from visual
  // restoration and is guarded separately by the source-level regression test.
  for(const [id,delay] of [
    ['water',90],['water-power',150],['water-flow',210],
    ['tide',210],['tide-impact',260],
    ['toxin',120],['toxin-contagion',300],
    ['frost-freeze',280],['frost-shatter',230],
    ['orbit',280],['orbit-pulse',360],
    ['inferno',250],['sun',560]
  ])await capture(id,delay);

  assert.deepEqual(errors,[]);
  report={engine,url,passed:true,frames,errors};
  console.log('VFX VISUAL PROOF',JSON.stringify({engine,frames:frames.map(f=>f.id),errors}));
}catch(e){
  report={engine,url,passed:false,frames,errors,error:e.stack};
  console.error(JSON.stringify(report,null,2));
  process.exitCode=1;
}finally{
  await writeFile(`test-results/vfx-${engine}.json`,JSON.stringify(report,null,2));
  await browser.close();
}
