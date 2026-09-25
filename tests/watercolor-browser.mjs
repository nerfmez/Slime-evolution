import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const engine=process.env.BROWSER||'chromium';
const base=new URL(process.env.SMOKE_URL||'http://127.0.0.1:4173/');base.searchParams.set('qa','1');
const browser=await ({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']}:{})});
try{
  const page=await browser.newPage({viewport:{width:640,height:480}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  assert.ok((await page.goto(base.href,{waitUntil:'load',timeout:60000}))?.ok());
  await page.waitForFunction(()=>globalThis.__slimeGameQA?.skillLab&&document.querySelector('.skill-card'),null,{timeout:90000});
  await page.evaluate(()=>{document.querySelector('.skill-card').click();globalThis.__vfxFreezeRAF=true;document.getElementById('skill-test').click();});
  const run=on=>page.evaluate(on=>{const q=__slimeGameQA,lab=q.skillLab.lab;globalThis.__slimeVfxStyle.on=on;lab.select('blast');lab.paused=true;lab.repeat=false;lab.showTargets=true;q.state.time=0;
    while(lab.elapsed<.5)lab.tick(1/60);q.state.time=lab.elapsed;q.draw();const gl=document.getElementById('world').getContext('webgl2');gl.finish();
    return {gl:gl.getError(),kinds:__slimeGodotVfx.diagnostics.kinds,controls:!!document.getElementById('vfx-style-on')}},on);
  const onState=await run(true),offState=await run(false);
  assert.equal(onState.gl,0);assert.equal(offState.gl,0);assert.equal(onState.controls,true);
  assert.ok(Object.keys(onState.kinds).some(k=>k.startsWith('fire:')),'new fire is drawn by the shared renderer when the style is on '+JSON.stringify(onState.kinds));
  assert.ok(!Object.keys(offState.kinds).some(k=>k.startsWith('fire:')),'old painted fire is used when the style is off');
  assert.deepEqual(errors,[]);
  console.log('WATERCOLOR STYLE VERIFIED',engine,JSON.stringify(onState.kinds));
}finally{await browser.close();}
