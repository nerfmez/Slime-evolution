/** Run the preserved creature regressions against the new normal-play schedule.
 * Only explicit timing assertions and the now-15-second boot pause are adapted.
 * All art, collision, damage, attack, death, menu, save and skill assertions stay.
 * Generated copies are temporary test inputs, never deployed or committed.
 */
import {readFile,writeFile,mkdir,readdir,rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {replacements} from '../pacing/assemble.mjs';
export function adaptBrowserSource(name,source){
 const edits=[];
 const click="await page.locator('.skill-card').first().click({force:true});";
 if(source.includes(click))edits.push(['skip only the opening calm in legacy creature tests',click,click+"await page.evaluate(()=>{const w=globalThis.__slimeGameQA?.world;if(w?.mode==='auto')w.time=Math.max(w.time,15)});"]);
 if(name==='panda-browser-core.mjs'){
  edits.push(['Panda slots in normal play',
   "w.reset('auto',149.9);w.update(.05,p,12);const before=count();w.update(.05,p,12);w.update(.05,p,12);const first=count();w.time=239.99;w.update(.05,p,12);const noStack=count();\n  w.reset('auto',239.99);w.update(.05,p,12);const second=count();w.reset('auto',300);w.update(.05,p,12);const afterBoss=count();",
   "w.reset('auto',299.9);w.update(.05,p,12);const before=count();w.update(.05,p,12);w.update(.05,p,12);const first=count();w.time=479.99;w.update(.05,p,12);const noStack=count();\n  w.reset('auto',479.99);w.update(.05,p,12);const second=count();w.reset('auto',600);w.update(.05,p,12);const afterBoss=count();"]);
 }
 if(name==='roster-browser.mjs'){
  edits.push(['new normal-play samples','[0,59,60,119,120,179,180,240,299]','[0,15,119,120,239,240,300,359,365,420,480,599]']);
  edits.push(['elite is an authored event rather than a kill-counter burst',"w.time=180;w.spawn(p,'water');w.update(.05,p,100);const waterElites=", "w.time=420;w.spawn(p,'water');w.update(.05,p,100);const waterElites="]);
  edits.push(['boss preparation at ten minutes',"w.reset('auto',299);w.update(.05,p,100);const normalCount=","w.reset('auto',599);w.update(.05,p,100);const normalCount="]);
  edits.push(['boss threshold at ten minutes','w.time=299.99;w.update(.05,p,100);const bossCount=','w.time=599.99;w.update(.05,p,100);const bossCount=']);
  edits.push(['quiet samples may be empty',"for(const row of result.snapshots){assert.ok(row.count>0);assert.deepEqual(row.unlocked,row.time<60?['thorn']:row.time<120?['thorn','spark']:row.time<180?['thorn','spark','turtle']:['thorn','spark','turtle','water']);assert.ok(row.types.every(t=>row.unlocked.includes(t)));assert.deepEqual(row.miniBosses,row.time===240?['panda']:[]);}",
   "for(const row of result.snapshots){if([15,120,240,300,365,420,480].includes(row.time))assert.ok(row.count>0);else assert.equal(row.count,0);assert.deepEqual(row.unlocked,row.time<120?['thorn']:row.time<240?['thorn','spark']:row.time<360?['thorn','spark','turtle']:['thorn','spark','turtle','water']);assert.ok(row.types.every(t=>row.unlocked.includes(t)));assert.deepEqual(row.miniBosses,[300,480].includes(row.time)?['panda']:[]);}"]);
 }
 return replacements(source,edits);
}
async function run(){
 const root=resolve(fileURLToPath(new URL('..',import.meta.url))),scratch=resolve(root,'.cozy-tests');
 await rm(scratch,{recursive:true,force:true});await mkdir(scratch);
 try{
  for(const name of await readdir(resolve(root,'tests'))){if(!name.endsWith('.mjs'))continue;const source=await readFile(resolve(root,'tests',name),'utf8');await writeFile(resolve(scratch,name),name==='pacing-browser.mjs'?source:adaptBrowserSource(name,source));}
  const production=process.argv[2]==='production';
  const tests=production?['spark-browser.mjs','turtle-browser.mjs']:['frog-canon.mjs','water-browser.mjs','roster-browser.mjs','spark-browser.mjs','turtle-browser.mjs'];
  tests.push('pacing-browser.mjs');
  for(const name of tests){console.log('COZY REGRESSION',name);const r=spawnSync(process.execPath,[resolve(scratch,name)],{cwd:root,env:process.env,stdio:'inherit'});if(r.status!==0)throw Error(`${name} failed: ${r.status} ${r.error||''}`);}
 }finally{await rm(scratch,{recursive:true,force:true});}
}
if(process.argv[1]&&basename(process.argv[1])==='cozy-regressions.mjs')await run();
