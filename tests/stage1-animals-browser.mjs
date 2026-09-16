import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4173'],{stdio:['ignore','pipe','pipe']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitServer(){for(let i=0;i<80;i++){try{const r=await fetch('http://127.0.0.1:4173/');if(r.ok)return;}catch{}await sleep(150);}throw Error('Vite did not start');}

mkdirSync('/tmp/stage1-animal-review',{recursive:true});
let browser;
try{
 await waitServer();
 browser=await chromium.launch({headless:true,args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1180,height:820}});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
 await page.locator('.skill-card').first().click();
 const modes=[['thorn','Moss Frog'],['moss','Spark Hedgehog'],['petal','Pond Turtle'],['crystal','Water Calf'],['panda','Forest Panda']];
 for(const [mode,name] of modes){
  await page.selectOption('#enemy-mode',mode);await page.click('#restart');await page.waitForTimeout(2400);
  assert.equal(await page.locator('#error').isHidden(),true,`game error while reviewing ${name}`);
  assert.match(await page.locator('#roster').textContent(),new RegExp(name));
  await page.screenshot({path:`/tmp/stage1-animal-review/${mode}.png`,fullPage:true});
 }
 assert.deepEqual(errors,[],'page emitted JavaScript errors');
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
