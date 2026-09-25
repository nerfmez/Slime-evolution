import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const base=new URL(process.env.SMOKE_URL||'http://127.0.0.1:4173/');base.searchParams.set('qa','1');
const engine=process.env.BROWSER||'chromium';
const browser=await ({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']}:{})});
try{
  for(const [label,options] of [['desktop',{viewport:{width:1280,height:720}}],['phone',{viewport:{width:390,height:844},isMobile:engine==='chromium',hasTouch:true}]]){
    const page=await browser.newPage(options),errors=[];page.on('pageerror',e=>errors.push(e.message));
    assert.ok((await page.goto(base.href,{waitUntil:'load',timeout:60000}))?.ok());
    await page.waitForFunction(()=>globalThis.__slimeGameQA&&document.querySelector('.skill-card'),null,{timeout:90000});
    assert.equal(await page.title(),'Slime — ทุ่งหญ้าสไลม์');
    await page.locator('.skill-card').first().click({force:true});
    await page.waitForFunction(()=>document.querySelector('#fire-slot .equipped-skill.empty'),null,{timeout:30000});
    const slots=await page.evaluate(()=>[...document.querySelectorAll('#fire-slot .equipped-skill.empty')].map(e=>[e.textContent,e.getAttribute('aria-label')]));
    assert.deepEqual(slots,[['+','ช่องสกิลว่าง'],['+','ช่องสกิลว่าง']]);
    await page.evaluate(()=>{const q=__slimeGameQA,w=q.world,p=q.state.player;w.enemies.length=0;w.spawnClock=w.nextElite=1e6;w.spawn(p,'panda',false)});
    await page.waitForFunction(()=>!document.getElementById('boss-health').hidden,null,{timeout:30000});
    const layout=await page.evaluate(()=>{const b=document.getElementById('boss-health'),t=document.querySelector('.title');return {text:b.querySelector('strong').textContent,bossTop:b.getBoundingClientRect().top,titleBottom:t.getBoundingClientRect().bottom,x:b.getBoundingClientRect().left<t.getBoundingClientRect().right}});
    assert.equal(layout.text,'มินิบอส · แพนด้าไผ่');
    if(layout.x)assert.ok(layout.bossTop>=layout.titleBottom,`${label}: boss banner must not cover the HUD ${JSON.stringify(layout)}`);
    await page.locator('#world').click({position:{x:5,y:300},force:true});
    await page.keyboard.down('d');
    await page.waitForFunction(()=>document.getElementById('hint').classList.contains('hint-done'),null,{timeout:60000});
    await page.keyboard.up('d');
    assert.deepEqual(errors,[]);
    console.log('HUD POLISH VERIFIED',engine,label,JSON.stringify(layout));
    await page.close();
  }
}finally{await browser.close();}
