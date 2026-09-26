import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const base=new URL(process.env.SMOKE_URL||'http://127.0.0.1:4173/');base.searchParams.set('qa','1');
const engine=process.env.BROWSER||'chromium';
const browser=await ({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']}:{})});
try{
  // Start menu (forced on with ?menu=1 because automated browsers skip it by default).
  {
    const page=await browser.newPage({viewport:{width:1000,height:695}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    const menuUrl=new URL(base.href);menuUrl.searchParams.set('menu','1');
    assert.ok((await page.goto(menuUrl.href,{waitUntil:'load',timeout:60000}))?.ok());
    await page.waitForFunction(()=>globalThis.__slimeGameQA&&document.querySelector('.skill-card'),null,{timeout:90000});
    const menu=await page.evaluate(()=>({title:document.getElementById('start-title')?.textContent,visible:!!document.getElementById('start-menu')?.getBoundingClientRect().width,top:document.elementFromPoint(innerWidth/2,innerHeight/2)?.closest('#start-menu')!==null}));
    assert.deepEqual(menu,{title:'Slime Evolution',visible:true,top:true});
    await page.locator('#start-howto summary').click();
    assert.equal(await page.locator('#start-howto').evaluate(e=>e.open),true);
    // Under software GL (CI, xvfb) the game renders ~4 fps behind the blurred menu, so closing it can take 5-15 s on main too.
    await page.locator('#start-play').click({timeout:60000});
    await page.waitForFunction(()=>!document.getElementById('start-menu'),null,{timeout:60000});
    await page.locator('.skill-card').first().click({timeout:60000});
    await page.waitForFunction(()=>__slimeGameQA.world.time>0,null,{timeout:60000});
    assert.deepEqual(errors,[]);
    console.log('START MENU VERIFIED',engine);
    await page.close();
  }
  for(const [label,options] of [['desktop',{viewport:{width:1280,height:720}}],['phone',{viewport:{width:390,height:844},isMobile:engine==='chromium',hasTouch:true}]]){
    const page=await browser.newPage(options),errors=[];page.on('pageerror',e=>errors.push(e.message));
    assert.ok((await page.goto(base.href,{waitUntil:'load',timeout:60000}))?.ok());
    await page.waitForFunction(()=>globalThis.__slimeGameQA&&document.querySelector('.skill-card'),null,{timeout:90000});
    assert.equal(await page.title(),'Slime Evolution');
    await page.locator('.skill-card').first().click({force:true});
    await page.waitForFunction(()=>document.querySelector('#fire-slot .equipped-skill.empty'),null,{timeout:30000});
    const slots=await page.evaluate(()=>[...document.querySelectorAll('#fire-slot .equipped-skill.empty')].map(e=>[e.textContent,e.getAttribute('aria-label')]));
    assert.deepEqual(slots,[['+','ช่องสกิลว่าง'],['+','ช่องสกิลว่าง']]);
    await page.evaluate(()=>{const q=__slimeGameQA,w=q.world,p=q.state.player;w.enemies.length=0;w.spawnClock=w.nextElite=1e6;w.spawn(p,'panda',false)});
    await page.waitForFunction(()=>!document.getElementById('boss-health').hidden,null,{timeout:30000});
    const layout=await page.evaluate(()=>{const b=document.getElementById('boss-health'),t=document.querySelector('.title');return {text:b.querySelector('strong').textContent,bossTop:b.getBoundingClientRect().top,titleBottom:t.getBoundingClientRect().bottom,x:b.getBoundingClientRect().left<t.getBoundingClientRect().right}});
    assert.equal(layout.text,'BAMBOO PANDA · MINI-BOSS');
    if(options.viewport.width>=960)assert.ok(layout.bossTop<40,`${label}: wide screens keep the boss banner in the top row ${JSON.stringify(layout)}`);
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
