import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const engine = process.env.BROWSER || 'chromium';
if (!['chromium','webkit'].includes(engine)) throw new Error(`Unknown browser ${engine}`);
const url = process.env.SMOKE_URL || 'http://127.0.0.1:4173/';
const label = `${new URL(url).hostname === '127.0.0.1' ? 'local' : 'live'}-${engine}`;
await mkdir('test-results',{recursive:true});
const browser = await ({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium' ? {args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']} : {})});
const page = await browser.newPage({viewport:{width:640,height:480},deviceScaleFactor:1});
page.setDefaultTimeout(30000);
const problems = [], ignoredCancellations = [], urls = new Set();
page.on('pageerror',e=>problems.push(`JS: ${e.message}`));
page.on('request',r=>urls.add(r.url()));
page.on('response',r=>{if(r.status()>=400 && !r.url().endsWith('/favicon.ico')) problems.push(`HTTP ${r.status()}: ${r.url()}`);});
page.on('requestfailed',r=>{
  const error=r.failure()?.errorText||'failed';
  // The canonical directional-player module intentionally replaces its first image request.
  if (/player-slime-directions\.webp\?v=3/.test(r.url()) && /abort|cancel/i.test(error)) ignoredCancellations.push({url:r.url(),error});
  else problems.push(`NETWORK ${r.url()}: ${error}`);
});
await page.addInitScript(()=>{
  const nativeRAF=window.requestAnimationFrame.bind(window);
  window.__canonQA={frames:0,freeze:false};
  window.requestAnimationFrame=callback=>nativeRAF(time=>{window.__canonQA.frames++; if(!window.__canonQA.freeze)callback(time);});
});
let report={browser:engine,url,passed:false};
try {
  const response=await page.goto(url,{waitUntil:'load',timeout:60000});
  assert.ok(response?.ok(),'game HTML must load');
  await page.waitForFunction(()=>document.querySelector('#error')?.hidden===false || (typeof window.__slimeFrogFrame==='function' && document.querySelector('.skill-card')),{},{timeout:60000});
  const bootError=await page.locator('#error').textContent();
  assert.equal(await page.locator('#error').evaluate(e=>e.hidden),true,bootError);
  const probes=await page.evaluate(()=>{
    const f={hp:10,frogHopActive:true,frogHopPhase:.5,frogAttack:0,hit:0,yaw:Math.PI/2};
    return {lift:__slimeFrogHopLift(f),restLift:__slimeFrogHopLift({...f,frogHopActive:false}),right:__slimeFrogFacing({...f}),left:__slimeFrogFacing({...f,yaw:-Math.PI/2}),idle:__slimeFrogFrame({...f,frogHopActive:false}).r,hop:__slimeFrogFrame(f).r,hit:__slimeFrogFrame({...f,hit:1}).r,attack:__slimeFrogFrame({...f,frogAttack:.1}).r,death0:__slimeFrogFrame({...f,hp:0,frogDeath:0}).r,deathEnd:__slimeFrogFrame({...f,hp:0,frogDeath:.4}).r,sprite:document.querySelector('#thorn-view')?.value,hasAudio:!!document.querySelector('#audio-toggle'),hasGraphics:!!document.querySelector('#graphics-preset')};
  });
  assert.ok(probes.lift>.25); assert.equal(probes.restLift,0);
  assert.equal(probes.right,1); assert.equal(probes.left,-1); assert.equal(probes.sprite,'sprite');
  assert.notDeepEqual(probes.hop,probes.idle); assert.deepEqual(probes.attack,[.25,0,.75,.25]);
  assert.deepEqual(probes.hit,[.25,.25,.25,.25]); assert.notDeepEqual(probes.death0,probes.deathEnd);
  assert.ok(probes.hasAudio && probes.hasGraphics,'preserve complete game UI, not the old Vite prototype');
  // Actual image decoding, not only checking a URL returns 200.
  const decoded=await page.evaluate(async()=>{
    const paths=['assets/grass-painted.png','assets/tree-reference-b.png','assets/pond-painted.png','assets/enemies/frog-moveset.png','assets/cards/inferno.png'];
    for(const path of paths){const image=new Image();image.src=new URL(path,location.href);await image.decode();if(!image.naturalWidth)throw new Error(path);}
    const cards=[...document.querySelectorAll('.skill-card img')];
    await Promise.all(cards.map(i=>i.decode()));
    return {required:paths.length,cards:cards.length};
  });
  await page.evaluate(()=>{
    const set=(id,value)=>{const e=document.getElementById(id);if(e){e.value=value;e.dispatchEvent(new Event('change',{bubbles:true}));}};
    set('enemy-mode','thorn'); set('mobs','12');
    // Lower only the test device's settings, never the canonical game files or defaults.
    set('graphics-preset','low');set('grass','1200');
    document.querySelector('#restart')?.click();
    document.querySelector('#panel')?.close?.();
  });
  const card=page.locator('.skill-card').first();
  await card.waitFor({state:'visible',timeout:15000}); await card.click({force:true});
  await page.waitForFunction(()=>/[1-9]\d* มอน/.test(document.querySelector('#stats')?.textContent||''),{},{timeout:60000});
  const startFrames=await page.evaluate(()=>__canonQA.frames);
  await page.waitForFunction(n=>__canonQA.frames>n+3,startFrames,{timeout:30000});
  const live=await page.evaluate(()=>({status:document.querySelector('#status')?.textContent,roster:document.querySelector('#roster')?.textContent,stats:document.querySelector('#stats')?.textContent,error:document.querySelector('#error')?.textContent,errorHidden:document.querySelector('#error')?.hidden,choosing:document.querySelector('#skill-choice')?.hidden===false,frames:__canonQA.frames,webgl:!!document.querySelector('#world')?.getContext('webgl2')}));
  assert.equal(live.errorHidden,true,live.error);assert.equal(live.choosing,false);assert.ok(live.webgl);assert.match(live.roster,/Moss Frog/);
  assert.equal([...urls].some(u=>/thorn-sprite\.png|\/enemies\/crystal(?:\.|-elite)/i.test(u)),false,'no obsolete normal Thorn sprite or Crystal model requested');
  assert.deepEqual(problems,[],'no failed gameplay requests or JavaScript errors');
  report={...report,probes,decoded,live,problems,ignoredCancellations,requests:[...urls],runtimePassed:true};
  await writeFile(`test-results/${label}.json`,JSON.stringify(report,null,2));
  // Stop the test page's animation scheduling, then let GPU work finish before capture.
  await page.evaluate(()=>{__canonQA.freeze=true;});
  await page.waitForTimeout(750);
  await page.screenshot({path:`test-results/${label}.png`,timeout:45000});
  report.passed=true;
  console.log(`FROG CANON RUNTIME PASSED ${label}`,JSON.stringify({probes,decoded,live,gameErrors:problems.length}));
} catch(e) {
  report.error=e.stack||String(e);report.problems=problems;report.requests=[...urls];
  console.error(JSON.stringify(report,null,2));process.exitCode=1;
} finally {
  await writeFile(`test-results/${label}.json`,JSON.stringify(report,null,2));
  await browser.close();
}
