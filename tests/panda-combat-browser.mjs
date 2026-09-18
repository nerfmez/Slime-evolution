import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {verifyPandaCombat} from './panda-combat-browser-cases.mjs';
const engine=process.env.BROWSER||'chromium',base=process.env.SMOKE_URL||'http://127.0.0.1:4173/';
await mkdir('test-results',{recursive:true});
const launch={headless:true,...(engine==='chromium'?{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']}:{})};
if(engine==='chromium'&&process.env.LOCAL_CHROMIUM)launch.executablePath=process.env.LOCAL_CHROMIUM;
const browser=await ({chromium,webkit}[engine]).launch(launch),page=await browser.newPage({viewport:{width:1000,height:700},deviceScaleFactor:1});
page.setDefaultTimeout(60000);let report={engine,url:base,passed:false},errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
await page.addInitScript(()=>{const raf=requestAnimationFrame.bind(window);window.__combatNativeRAF=raf;window.__combatFreeze=false;window.requestAnimationFrame=f=>raf(t=>{if(!window.__combatFreeze)f(t)});localStorage.setItem('slime.graphics.v1',JSON.stringify({preset:'low',showStats:false}));});
async function capture(name){await page.waitForTimeout(150);await page.evaluate(()=>{__slimeGameQA.draw();document.querySelector('#world').getContext('webgl2').finish();});await page.waitForTimeout(180);await page.screenshot({path:`test-results/panda-combat-${engine}-${name}.png`});}
try{
 const url=new URL(base);url.searchParams.set('qa','1');assert.ok((await page.goto(url.href,{waitUntil:'load',timeout:60000})).ok());
 await page.waitForFunction(()=>document.querySelector('#error')?.hidden===false||(window.__slimeGameQA?.pandaRenderer&&document.querySelector('.skill-card')));
 assert.equal(await page.locator('#error').evaluate(e=>e.hidden),true,await page.locator('#error').textContent());
 await page.locator('.skill-card').first().click({force:true});await page.waitForFunction(()=>window.__slimeGameQA?.world?.enemies.length>0);
 await page.evaluate(()=>{__combatFreeze=true;});await page.waitForTimeout(400);await page.evaluate(()=>{window.requestAnimationFrame=window.__combatNativeRAF;});
 const combat=await verifyPandaCombat(page,capture);assert.deepEqual(errors,[]);report={...report,passed:true,combat,errors};console.log('PANDA CONTINUOUS DAMAGE AND DODGE VERIFIED',engine);
}catch(e){report={...report,error:e.stack,errors,evidence:page.__pandaCombatEvidence};console.error(e);await capture('failure').catch(()=>{});process.exitCode=1;}
finally{await writeFile(`test-results/panda-combat-${engine}.json`,JSON.stringify(report,null,2));await browser.close();}
