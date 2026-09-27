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
    // Start waits for the game (v5): once the cards exist the button reads Start and is enabled.
    await page.waitForFunction(()=>{const b=document.getElementById('start-play');return b.textContent==='เริ่มเกม'&&!b.disabled},null,{timeout:10000});
    await page.waitForFunction(()=>!document.getElementById('start-hell').disabled,null,{timeout:10000});
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
  {
    // A failed start-up is shown in the menu with a reload button instead of hiding behind it (Android report, v5).
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.route('**/assets/scene/meadow-pigment-cache.webp',r=>r.abort());
    const menuUrl=new URL(base.href);menuUrl.searchParams.set('menu','1');
    await page.goto(menuUrl.href,{waitUntil:'load',timeout:60000});
    await page.waitForFunction(()=>document.getElementById('start-play').textContent==='โหลดใหม่',null,{timeout:90000});
    const shown=await page.evaluate(()=>({note:document.getElementById('start-load').textContent,disabled:document.getElementById('start-play').disabled}));
    assert.ok(shown.note.includes('เปิดฉากไม่สำเร็จ')&&!shown.disabled,JSON.stringify(shown));
    console.log('START MENU ERROR VERIFIED',engine);
    await page.close();
  }
  {
    // HELL (v6): the menu's Hell button starts a fresh round with the Hell flag, the status says so and the clock turns red.
    const page=await browser.newPage({viewport:{width:1000,height:695}});
    const menuUrl=new URL(base.href);menuUrl.searchParams.set('menu','1');
    await page.goto(menuUrl.href,{waitUntil:'load',timeout:60000});
    await page.waitForFunction(()=>globalThis.__slimeGameQA&&!document.getElementById('start-hell').disabled,null,{timeout:90000});
    await page.locator('#start-hell').click({timeout:60000});
    await page.waitForFunction(()=>__slimeGameQA.world.hell===true&&document.body.classList.contains('hell'),null,{timeout:30000});
    const alive=await page.evaluate(()=>{const q=__slimeGameQA,w=q.world,p=q.state.player;for(let i=0;i<200;i++){w.hp=100;w.update(.05,p,100);}return {alive:w.enemies.filter(e=>e.hp>0&&!e.elite&&!e.miniBoss&&!e.boss).length,status:document.getElementById('status').textContent}});
    assert.ok(alive.alive>=25&&/HELL/.test(alive.status),JSON.stringify(alive));
    await page.evaluate(()=>document.getElementById('restart').click());
    assert.equal(await page.evaluate(()=>__slimeGameQA.world.hell),false,'a test round is never Hell');
    console.log('HELL MODE VERIFIED',engine,JSON.stringify(alive));
    await page.close();
  }
  for(const [label,options] of [['desktop',{viewport:{width:1280,height:720}}],['phone',{viewport:{width:390,height:844},isMobile:engine==='chromium',hasTouch:true}]]){
    const page=await browser.newPage(options),errors=[];page.on('pageerror',e=>errors.push(e.message));
    assert.ok((await page.goto(base.href,{waitUntil:'load',timeout:60000}))?.ok());
    await page.waitForFunction(()=>globalThis.__slimeGameQA&&document.querySelector('.skill-card'),null,{timeout:90000});
    assert.equal(await page.title(),'Slime Evolution');
    // Card preview (v4): mouse hover shows the before/after rows and a click picks; on touch the first tap only shows them
    // (the card stays open, highlighted, with a confirm button) and a second tap on the same card picks it.
    if(options.hasTouch){
      await page.locator('.skill-card').first().tap({timeout:60000});
      const first=await page.evaluate(()=>({choosing:__slimeGameQA.combat.choosing,picked:!!document.querySelector('.skill-card.picked'),rows:document.querySelectorAll('#card-preview .pv-row').length,confirm:!!document.querySelector('.pv-confirm')}));
      assert.ok(first.choosing&&first.picked&&first.confirm&&first.rows>0,`${label}: first tap previews only ${JSON.stringify(first)}`);
      await page.locator('.skill-card').first().tap();
    }else{
      await page.locator('.skill-card').first().hover({timeout:60000});
      await page.waitForFunction(()=>document.querySelectorAll('#card-preview .pv-row').length>0,null,{timeout:10000});
      await page.locator('.skill-card').first().click({force:true});
    }
    await page.waitForFunction(()=>document.querySelector('#fire-slot .equipped-skill.empty'),null,{timeout:30000});
    // Skill details (v4): tapping the equipped chip opens the panel and pauses the round; closing it resumes.
    await page.locator('#fire-slot .equipped-skill:not(.empty)').first().click({timeout:30000});
    await page.waitForFunction(()=>document.getElementById('skill-info').open,null,{timeout:10000});
    const info=await page.evaluate(()=>document.querySelector('#skill-info .si-body').innerText);
    assert.match(info,/LV 1\/10/);assert.match(info,/DPS/);
    const paused=await page.evaluate(async()=>{const a=__slimeGameQA.world.time;await new Promise(r=>setTimeout(r,700));return __slimeGameQA.world.time===a});
    assert.ok(paused,`${label}: the round pauses while skill details are open`);
    // Pressed from the page: under CI's software GL a synthetic mouse click on the modal can stall for the full timeout.
    await page.evaluate(()=>document.querySelector('#skill-info .si-close').click());
    await page.waitForFunction(()=>!document.getElementById('skill-info').open,null,{timeout:10000});
    await page.waitForFunction(t=>__slimeGameQA.world.time>t,await page.evaluate(()=>__slimeGameQA.world.time),{timeout:30000});
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
