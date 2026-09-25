import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const engine=process.env.BROWSER||'chromium',url=process.env.SMOKE_URL||'http://127.0.0.1:4173/';
const folder='test-results/godot-vfx-'+engine;
await mkdir(folder,{recursive:true});
const browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']}:{})});
const page=await browser.newPage({viewport:{width:engine==='chromium'?640:960,height:engine==='chromium'?480:720},deviceScaleFactor:1});
page.setDefaultTimeout(30000);
const errors=[],network=[],frames=[],coverage={};
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push('HTTP '+r.status()+' '+r.url())});
page.on('requestfailed',r=>network.push({url:r.url(),reason:r.failure()?.errorText}));
await page.addInitScript(()=>{const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=f=>raf(t=>{if(!window.__vfxFreezeRAF)f(t)})});
const presets=['water','water-power','water-burst','water-flow','tide','tide-impact','tide-radius','tide-echo','toxin','toxin-venom','toxin-contagion','toxin-corrosion','frost','frost-drill','frost-freeze','frost-shatter','orbit','orbit-power','orbit-multi','orbit-pulse','chain','chain-overcharge','chain-relay','chain-static','inferno','blast','scatter','burn','sun','meteor','cyclone'];
const fire=new Set(presets.slice(24)),preserved=new Set(['chain','chain-overcharge','chain-relay','chain-static',...fire]);
async function reset(id,camera='game',targets=true){await page.evaluate(({id,camera,targets})=>{
 const q=globalThis.__slimeGameQA,lab=q.skillLab.lab;lab.select(id);lab.paused=true;lab.repeat=false;lab.showTargets=targets;q.state.time=0;q.state.camera=camera;
 document.getElementById('lab-preset').value=id;
},{id,camera,targets})}
async function capture(id,seconds,camera='game',masked=false){
 const data=await page.evaluate(({seconds,masked})=>{
  const q=globalThis.__slimeGameQA,lab=q.skillLab.lab;
  while(lab.elapsed+1e-8<seconds)lab.tick(Math.min(1/60,seconds-lab.elapsed));
  q.state.time=lab.elapsed;q.draw();
  const canvas=document.getElementById('world'),gl=canvas.getContext('webgl2');gl.finish();
  const status={gl:gl.getError(),errorHidden:document.getElementById('error').hidden,elapsed:lab.elapsed,damage:lab.damage,...globalThis.__slimeGodotVfx.diagnostics};
  const image=canvas.toDataURL('image/png').split(',')[1];
  if(masked){
   const read=()=>{const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const ctx=c.getContext('2d');ctx.drawImage(canvas,0,0);return ctx.getImageData(0,0,c.width,c.height).data};
   const pixels=read(),renderer=globalThis.__slimeGodotVfx,draw=renderer.draw;
   try{renderer.draw=()=>({calls:0,triangles:0});q.draw();const background=read();let count=0;for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-background[i])+Math.abs(pixels[i+1]-background[i+1])+Math.abs(pixels[i+2]-background[i+2])>18)count++;status.effectPixels=count;}finally{renderer.draw=draw;}
  }
  return{image,status};
 },{seconds,masked});
 assert.equal(data.status.gl,0,id+' WebGL');assert.equal(data.status.errorHidden,true,id+' error panel');assert.equal(data.status.invalid,0,id+' invalid geometry');
 const path=folder+'/'+id+'-'+camera+'-'+Math.round(seconds*1000).toString().padStart(4,'0')+'.png';
 await writeFile(path,Buffer.from(data.image,'base64'));frames.push({id,camera,seconds,path,...data.status});
 if(masked)coverage[id]=Math.max(coverage[id]||0,data.status.effectPixels);
}
let passed=false;
try{
 const address=new URL(url);address.searchParams.set('qa','1');
 assert.ok((await page.goto(address.href,{waitUntil:'load',timeout:60000}))?.ok());
 await page.waitForFunction(()=>document.getElementById('error')?.hidden===false||(globalThis.__slimeGameQA?.waterRenderer&&document.querySelector('.skill-card')),null,{timeout:60000});
 assert.equal(await page.locator('#error').evaluate(e=>e.hidden),true,await page.locator('#error').textContent());
 await page.evaluate(()=>{document.querySelector('.skill-card').click();globalThis.__vfxFreezeRAF=true;document.getElementById('skill-test').click();});
 assert.ok(await page.evaluate(()=>globalThis.__slimeGodotVfx?.diagnostics.version==='godot-source-port-v1'||globalThis.__slimeGodotVfx?.diagnostics.version==='godot-source-port-v2'));
 for(const id of presets){
  await reset(id);
  const moments=id==='toxin'?[.12,.32,.65]:id.startsWith('orbit')?[.12,.36,.8]:id==='chain-overcharge'?[.10,.40,.74]:fire.has(id)?[.12,.52,1.2]:[.08,.20,.46];
  for(const t of moments)await capture(id,t,'game',!preserved.has(id));
  if(!preserved.has(id))assert.ok(coverage[id]>8,id+' has no visible source-port effect pixels');
  if(id==='toxin-venom')assert.ok(coverage[id]>(engine==='chromium'?20:60),'Neurotoxin travel is occluded');
 }
 // Frame sequences, driven by simulation time rather than wall-clock delays.
 for(const id of ['water-flow','frost-freeze','frost-drill','toxin','orbit-pulse','chain-static']){
  await reset(id,'game',false);for(let i=1;i<=(engine==='chromium'?4:12);i++)await capture(id,i/(engine==='chromium'?5:15));
 }
 // The same authored mesh must remain readable in the real alternate cameras.
 for(const camera of ['side','top'])for(const id of ['water-flow','frost-freeze']){await reset(id,camera,false);await capture(id,.28,camera,true);}
 // Run an ordinary moving-enemy scenario with mixed Fire and three non-Fire skills.
 await page.evaluate(()=>{const q=__slimeGameQA;document.getElementById('lab-close').click();q.state.paused=true;q.combat.preset('water','flow',10);q.combat.equip('frost');Object.assign(q.combat.skills.frost,{level:10,evo:'freeze',b:{drill:4,freeze:4,shatter:2}});q.combat.equip('fire');q.combat.fireLevel=5;q.combat.branches={blast:2,scatter:1,burn:2};q.world.mode='all';q.world.hp=10000;q.world.enemies=[];for(let i=0;i<12;i++)q.world.spawn(q.state.player,['thorn','spark','turtle','water'][i%4]);});
 const mixed=await page.evaluate(()=>{const q=__slimeGameQA;for(let i=0;i<120;i++){q.combat.update(1/60,q.world,q.state.player);q.world.update(1/60,q.state.player,30);q.state.time+=1/60;}q.draw();const gl=document.getElementById('world').getContext('webgl2');gl.finish();return{gl:gl.getError(),image:document.getElementById('world').toDataURL().split(',')[1],diagnostics:__slimeGodotVfx.diagnostics}});
 assert.equal(mixed.gl,0);await writeFile(folder+'/mixed-gameplay.png',Buffer.from(mixed.image,'base64'));
 assert.deepEqual(errors,[]);passed=true;console.log('GODOT SOURCE VFX PIXELS VERIFIED',JSON.stringify({engine,presets:presets.length,frames:frames.length,coverage}));
}catch(e){errors.push(e.stack);process.exitCode=1;console.error(e.stack)}finally{
 await writeFile(folder+'/report.json',JSON.stringify({passed,engine,url,coverage,frames,errors,network,visualReviewRequired:true},null,2));
 await browser.close();
}
