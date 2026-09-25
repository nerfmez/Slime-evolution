import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.SMOKE_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:480,height:360},deviceScaleFactor:1});
try{
  const url=new URL(base);url.searchParams.set('qa','1');
  assert.ok((await page.goto(url.href,{waitUntil:'domcontentloaded',timeout:60000}))?.ok());
  await page.waitForFunction(()=>typeof globalThis.__slimeGameQA?.combat?.initialCards==='function',null,{timeout:30000});
  const result=await page.evaluate(()=>{
    const combat=__slimeGameQA.combat,seedBefore=combat.seed;
    const samples=Array.from({length:40},()=>combat.initialCards());
    return {samples,seedBefore,seedAfter:combat.seed,crypto:!!globalThis.crypto?.getRandomValues};
  });
  assert.equal(result.crypto,true,'browser crypto entropy unavailable');
  assert.equal(result.seedAfter,result.seedBefore,'opening choices must not consume combat RNG');
  for(const cards of result.samples){
    assert.equal(cards.length,3);
    assert.equal(new Set(cards.map(x=>x.split(':')[0])).size,3,'opening must contain three distinct skill families');
  }
  const unique=new Set(result.samples.map(x=>x.join('|'))).size;
  assert.ok(unique>1,`opening choices did not vary: ${JSON.stringify(result.samples.slice(0,4))}`);
  console.log('OPENING RANDOM VERIFIED',JSON.stringify({unique,samples:result.samples.slice(0,6),seed:result.seedBefore}));
}finally{await browser.close();}
