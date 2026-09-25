import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.SMOKE_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
try{
  const fresh=await browser.newPage({viewport:{width:480,height:360},deviceScaleFactor:1});
  assert.ok((await fresh.goto(base,{waitUntil:'domcontentloaded',timeout:60000}))?.ok());
  await fresh.waitForSelector('#audio-volume',{state:'attached',timeout:30000});
  const freshState=await fresh.evaluate(()=>({value:document.getElementById('audio-volume').value,label:document.getElementById('audio-level').value||document.getElementById('audio-level').textContent}));
  assert.deepEqual(freshState,{value:'50',label:'50%'});
  await fresh.close();
  const saved=await browser.newPage({viewport:{width:480,height:360},deviceScaleFactor:1});
  await saved.addInitScript(()=>localStorage.setItem('slime.audio.v1',JSON.stringify({enabled:true,volume:.22})));
  assert.ok((await saved.goto(base,{waitUntil:'domcontentloaded',timeout:60000}))?.ok());
  await saved.waitForSelector('#audio-volume',{state:'attached',timeout:30000});
  await saved.waitForFunction(()=>document.getElementById('audio-volume')?.value==='22',null,{timeout:120000});
  const savedState=await saved.evaluate(()=>({value:document.getElementById('audio-volume').value,label:document.getElementById('audio-level').value||document.getElementById('audio-level').textContent}));
  assert.deepEqual(savedState,{value:'22',label:'22%'});
  console.log('AUDIO DEFAULT VERIFIED',JSON.stringify({fresh:freshState,saved:savedState}));
  await saved.close();
}finally{await browser.close();}
