import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { REQUIRED, assertHTML, auditDist, seal, serve, verifyRemote } from '../scripts/release-guard.mjs';
const SHA='a'.repeat(40);
async function fixture(){
 const dir=await mkdtemp(join(tmpdir(),'slime-release-'));
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=','base64');
 for(const p of REQUIRED){await mkdir(dirname(join(dir,p)),{recursive:true});await writeFile(join(dir,p),p.endsWith('.png')?png:Buffer.from('RIFF1234WEBPtest'));}
 for(const p of ['index.html','slime-motion.html'])await writeFile(join(dir,p),'<html><head><script type="module" src="./assets/main.js"></script></head><body></body></html>');
 await writeFile(join(dir,'assets/main.js'),'console.log("fixture");');
 return dir;
}
test('reject historical CDN wrapper rather than accepting HTTP 200',()=>{
 assert.throws(()=>assertHTML('<base href="https://cdn.jsdelivr.net/gh/nerfmez/Slime-evolution@old/">'),/CDN wrapper/);
});
test('reject missing grass before release',async()=>{
 const dir=await fixture();try{await rm(join(dir,REQUIRED[0]));await assert.rejects(auditDist(dir),/Missing release asset: assets\/grass-painted/);}finally{await rm(dir,{recursive:true,force:true});}
});
test('reject HTML disguised as an image',async()=>{
 const dir=await fixture();try{await writeFile(join(dir,REQUIRED[0]),'<html>404</html>');await assert.rejects(auditDist(dir),/Invalid PNG/);}finally{await rm(dir,{recursive:true,force:true});}
});
test('reject a new missing dynamic-load literal in emitted JS',async()=>{
 const dir=await fixture();try{await writeFile(join(dir,'assets/main.js'),"fetch('./assets/new-enemy.png');");await assert.rejects(auditDist(dir),/Missing runtime URL/);}finally{await rm(dir,{recursive:true,force:true});}
});
test('remote checks reject wrong version, corrupted files and incomplete uploads',async()=>{
 const dir=await fixture();let server;
 try{
   await seal(dir,SHA);server=await serve(dir,0);const url=`http://127.0.0.1:${server.address().port}/`;
   await verifyRemote(url,SHA);
   await assert.rejects(verifyRemote(url,'b'.repeat(40)),/Wrong\/stale/);
   const original=await readFile(join(dir,REQUIRED[0]));
   await writeFile(join(dir,REQUIRED[0]),Buffer.concat([original,Buffer.from('changed')]));
   await assert.rejects(verifyRemote(url,SHA),/Mixed\/stale\/corrupt/);
   await writeFile(join(dir,REQUIRED[0]),original);await rm(join(dir,REQUIRED[0]));
   await assert.rejects(verifyRemote(url,SHA),/HTTP 404/);
 }finally{if(server)await new Promise(r=>server.close(r));await rm(dir,{recursive:true,force:true});}
});
