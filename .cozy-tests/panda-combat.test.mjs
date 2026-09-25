import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,lstat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {pandaAI,pandaPose,pandaFacing,tickPandaWorld,PANDA_CHARGE,PANDA_ROLL_DISTANCE,PANDA_ATTACK_LENGTH,PANDA_COOLDOWN,PANDA_DODGE_DISTANCE,PANDA_DODGE_LENGTH,PANDA_DODGE_CHARGE,PANDA_DODGE_END,PANDA_DODGE_COOLDOWN} from '../game/assets/bamboo-panda.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function setup(id=2){
 const e={id,type:'panda',miniBoss:true,hp:10000,maxHP:10000,x:0,z:0,radius:.62,yaw:Math.PI/2,hit:0,attack:100,pandaCooldown:0};
 const w={enemies:[e],playerRadius:.25,hits:[],moveEnemy(e,dx,dz){assert.ok(Math.hypot(dx,dz)<=.055+1e-8);e.x+=dx;e.z+=dz;},damage(d){this.hits.push(d);}};
 return {w,e};
}
function step(w,e,dt,target=[5,0,0],visible=true){tickPandaWorld(w,dt);return pandaAI(w,e,dt,target,Math.hypot(target[0]-e.x,target[2]-e.z),visible,12);}
test('continuous ordinary hits cannot prevent starting or finishing the .8s charge and 9.6-unit attack',()=>{
 for(const dt of [.01,.025,.05]){
  const {w,e}=setup();let samples=0,roll=false;
  for(let time=0;time<PANDA_ATTACK_LENGTH-1e-8;time+=dt){e.hp-=1;e.hit=.12;samples++;step(w,e,dt);if(time+dt<PANDA_CHARGE-1e-8){close(e.x,0);assert.equal(pandaPose(e).name,'charge');}roll ||= pandaPose(e).name==='roll';assert.equal(e.pandaDodgeAge,undefined);}
  close(e.pandaRollDistance,PANDA_ROLL_DISTANCE);close(e.x,9.6);assert.equal(roll,true);assert.deepEqual(w.hits,[18]);close(e.hp,10000-samples);
  assert.ok(e.pandaCooldown<PANDA_COOLDOWN-2,'hits did not restart cooldown');
 }
});
test('continuous damage still permits repeated offensive attacks; defensive rolls cannot starve them',()=>{
 const {w,e}=setup();let previous=false,starts=[];
 for(let i=0;i<1600;i++){
  e.hp-=.1;e.hit=.12;step(w,e,.01,[e.x+5,0,e.z]);
  const attacking=e.pandaAge!=null;
  if(attacking&&!previous)starts.push(i*.01);previous=attacking;
 }
 assert.ok(starts.length>=3);close(starts[0],0);
 for(let i=1;i<starts.length;i++)assert.ok(starts[i]-starts[i-1]<=PANDA_COOLDOWN+PANDA_DODGE_LENGTH+.03);
 close(e.hp,9840);
});
test('new damage during cooldown triggers one short sideways dodge with no outgoing damage or immunity',()=>{
 const {w,e}=setup();e.pandaCooldown=5;e.pandaLastHP=e.hp;let changed=0,poses=new Set();
 for(let i=0;i<65;i++){e.hp-=2;e.hit=.12;changed+=2;step(w,e,.01);poses.add(pandaPose(e).name);if(i<9){close(e.x,0);close(e.z,0);}assert.equal(e.pandaAge,undefined);}
 close(e.x,0);close(e.z,2.4);close(e.pandaDodgeDistance,PANDA_DODGE_DISTANCE);close(e.hp,10000-changed);assert.deepEqual(w.hits,[]);
 assert.ok(poses.has('dodge-charge')&&poses.has('dodge')&&poses.has('dodge-recover'));assert.equal(e.pandaDodgeAge,undefined);
 assert.ok(e.pandaDodgeCooldown>3.8);close(e.pandaCooldown,4.35);
 assert.equal(e.invulnerable,undefined);assert.equal(e.immune,undefined);
});
test('dodge checks both sides without moving the real Panda; opposite open side wins and blocked terrain stops motion',()=>{
 let {w,e}=setup(1);e.pandaCooldown=5;e.pandaLastHP=e.hp;e.hp-=1;e.hit=.12;
 w.moveEnemy=(p,dx,dz)=>{if(p.z+dz>=-1e-8){p.x+=dx;p.z+=dz;}};
 step(w,e,.01);close(e.x,0);close(e.z,0);assert.equal(e.pandaDodgeZ,1);
 for(let i=0;i<65;i++)step(w,e,.01);close(e.z,2.4);assert.deepEqual(w.hits,[]);
 ({w,e}=setup());e.pandaCooldown=5;e.hit=.12;w.moveEnemy=()=>{};
 step(w,e,.01);assert.equal(e.pandaDodgeAge,undefined);close(e.x,0);close(e.z,0);
 // A newly blocked path after committing the dodge must also stop, not teleport.
 ({w,e}=setup());e.pandaCooldown=5;e.hit=.12;step(w,e,.01);w.moveEnemy=()=>{};
 for(let i=0;i<30;i++)step(w,e,.01);close(e.z,0);assert.equal(e.pandaDodgeAge,undefined);
});
test('dodge locks direction, retains all eight original roll poses, and gives death priority',()=>{
 const {w,e}=setup();e.pandaCooldown=5;e.hit=.12;step(w,e,.01);
 const locked=[e.pandaDodgeX,e.pandaDodgeZ],face=pandaFacing(e);e.yaw=-Math.PI/2;
 for(let i=0;i<60;i++){step(w,e,.01,[-5,0,0]);if(e.pandaDodgeAge!=null){assert.deepEqual([e.pandaDodgeX,e.pandaDodgeZ],locked);assert.equal(pandaFacing(e),face);}}
 assert.deepEqual(Array.from({length:8},(_,i)=>pandaPose({pandaDodgeAge:.2,pandaDodgeDistance:(i+.1)/8*2.4,hit:1}).cell),[8,9,10,11,12,13,14,15]);
 assert.equal(pandaPose({pandaDodgeAge:.2,pandaDeath:.1,hit:1}).cell,18);
 const x=e.x,z=e.z;e.hp=0;step(w,e,.1);close(e.x,x);close(e.z,z);
});
test('no unsolicited dodge, no cooldown bypass, no repeated reactions to a stale hurt pose, and ready attack wins',()=>{
 for(const mode of ['no-hit','cooldown','hidden','far']){
  const {w,e}=setup();e.pandaCooldown=5;e.pandaLastHP=e.hp;
  if(mode!=='no-hit'){e.hp-=1;e.hit=.12;}if(mode==='cooldown')e.pandaDodgeCooldown=2;
  step(w,e,.01,mode==='far'?[12,0,0]:[5,0,0],mode!=='hidden');assert.equal(e.pandaDodgeAge,undefined,mode);
 }
 const {w,e}=setup();e.hit=.12;step(w,e,.01);assert.ok(e.pandaAge>0);assert.equal(e.pandaDodgeAge,undefined);
 const idle=setup();idle.e.pandaCooldown=100;idle.e.hit=.12;step(idle.w,idle.e,.01);
 for(let i=0;i<700;i++)step(idle.w,idle.e,.01);close(idle.e.pandaDodgeDistance,2.4);close(idle.e.z,2.4);
});
test('only the Panda AI module changes in the entire 1263-file deployed game; original art and all other systems retained',async()=>{
 const root=fileURLToPath(new URL('../game',import.meta.url));
 const p=JSON.parse(await readFile(new URL('../docs/panda-combat-proof.json',import.meta.url),'utf8'));
 const hash=b=>createHash('sha256').update(b).digest('hex');
 let raw=await readFile(join(root,p.path),'utf8');assert.equal(hash(raw),p.afterSHA256);
 for(const edit of p.reverse){assert.equal(raw.slice(edit.start,edit.start+edit.new.length),edit.new);raw=raw.slice(0,edit.start)+edit.old+raw.slice(edit.start+edit.new.length);}
 assert.equal(hash(raw),p.beforeSHA256);
 const git=(type,b)=>createHash('sha1').update(Buffer.concat([Buffer.from(`${type} ${b.length}\0`),b])).digest();let fileCount=0;
 async function tree(dir,prefix=''){
  const entries=[];
  for(const name of await readdir(dir)){const path=join(dir,name),rel=prefix?prefix+'/'+name:name,s=await lstat(path);assert.ok(!s.isSymbolicLink());
   if(s.isDirectory())entries.push({sort:name+'/',mode:'40000',name,sha:await tree(path,rel)});
   else{fileCount++;const bytes=rel===p.path?Buffer.from(raw):await readFile(path);entries.push({sort:name,mode:s.mode&0o111?'100755':'100644',name,sha:git('blob',bytes)});}}
  entries.sort((a,b)=>Buffer.compare(Buffer.from(a.sort),Buffer.from(b.sort)));
  return git('tree',Buffer.concat(entries.map(e=>Buffer.concat([Buffer.from(`${e.mode} ${e.name}\0`),e.sha]))));
 }
 assert.equal((await tree(root)).toString('hex'),p.parentGameTree);assert.equal(fileCount,1263);
});
