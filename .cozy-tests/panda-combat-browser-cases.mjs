import assert from 'node:assert/strict';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
/** Runs on the real existing scene and central combat.hit; no collision or AI mocks. */
export async function verifyPandaCombat(page,capture){
 const result=await page.evaluate(async()=>{
  const q=__slimeGameQA,w=q.world,p=q.state.player;
  const {pandaPose}=await import('./assets/bamboo-panda.js');
  let line;
  outer:for(let z=-21;z<=21;z+=3)for(let x=-21;x<=21;x+=3)for(let j=0;j<16;j++){
   const a=j*Math.PI/8,nx=Math.cos(a),nz=Math.sin(a),sx=-nz,sz=nx;
   if(Array.from({length:101},(_,i)=>q.canStand(x+nx*i*.1,z+nz*i*.1,.62)).every(Boolean)&&
      Array.from({length:53},(_,i)=>q.canStand(x+sx*(i-26)*.1,z+sz*(i-26)*.1,.62)).every(Boolean)){line={x,z,nx,nz};break outer;}
  }
  if(!line)throw Error('No actual terrain corridor with clear side-roll route');
  const prepare=cooldown=>{
   p[0]=line.x+line.nx*5;p[2]=line.z+line.nz*5;
   w.reset('panda',150);w.update(.05,p,12);const e=w.enemies.find(e=>e.type==='panda');
   Object.assign(e,{x:line.x,z:line.z,hp:10000,maxHP:10000,hit:0,attack:100,pandaCooldown:cooldown,pandaDodgeCooldown:0,pandaLastHP:10000,pandaDodgeSide:1});
   delete e.pandaAge;delete e.pandaDodgeAge;w.enemies=[e];w.spawnClock=w.nextElite=1e6;q.combat.cooldown=1e6;
   q.combat.numbers=[];q.state.camera='game';return e;
  };
  let e=prepare(0);const barrage=[],attackSnapshots={};
  for(let i=0;i<51;i++){
   q.combat.hit(e,1,e.x,e.z);w.update(.05,p,12);
   barrage.push({t:(i+1)*.05,x:e.x,z:e.z,hp:e.hp,playerHP:w.hp,age:e.pandaAge??null,dodge:e.pandaDodgeAge??null,cooldown:e.pandaCooldown,roll:e.pandaRollDistance||0,pose:pandaPose(e).name});
   if(i===7)attackSnapshots['barrage-charge']={...e};if(i===21)attackSnapshots['barrage-roll']={...e};
  }
  e=prepare(5);const dodge=[],dodgeSnapshots={};
  for(let i=0;i<12;i++){
   q.combat.hit(e,2,e.x,e.z);w.update(.05,p,12);
   dodge.push({t:(i+1)*.05,x:e.x,z:e.z,hp:e.hp,playerHP:w.hp,age:e.pandaDodgeAge??null,attack:e.pandaAge??null,cooldown:e.pandaCooldown,dodgeCooldown:e.pandaDodgeCooldown,distance:e.pandaDodgeDistance||0,pose:pandaPose(e).name,cell:pandaPose(e).cell});
   if(i===0)dodgeSnapshots['dodge-charge']={...e};if(i===5)dodgeSnapshots['dodge-side']={...e};if(i===9)dodgeSnapshots['dodge-recover']={...e};
  }
  const direction=[e.pandaDodgeX,e.pandaDodgeZ];
  // Real freeze still suspends movement; normal damage is not an invulnerability grant.
  e=prepare(5);q.combat.hit(e,2,e.x,e.z);w.update(.05,p,12);const from={x:e.x,z:e.z,hp:e.hp,age:e.pandaDodgeAge};e.frozen=.20;
  q.combat.hit(e,7,e.x,e.z);for(let i=0;i<4;i++)w.update(.05,p,12);
  const frozen={before:from,after:{x:e.x,z:e.z,hp:e.hp,age:e.pandaDodgeAge}};
  e.frozen=0;for(let i=0;i<15;i++)w.update(.05,p,12);frozen.resumed=e.pandaDodgeDistance;
  // A fatal blow removes Panda mid-action through the ordinary world death/reward path.
  e=prepare(0);q.combat.hit(e,1,e.x,e.z);w.update(.05,p,12);q.combat.hit(e,20000,e.x,e.z);w.update(.05,p,12);q.draw();
  const killed={alive:w.enemies.some(n=>n.id===e.id),remnants:w.pandaDead.length,cell:q.pandaRenderer.stats.last.cell};
  return {line,barrage,dodge,direction,frozen,killed,snapshots:{...attackSnapshots,...dodgeSnapshots}};
 });
 page.__pandaCombatEvidence=result;
 const {line,barrage,dodge,direction,frozen,killed}=result;
 assert.ok(barrage.slice(0,16).every(e=>Math.hypot(e.x-line.x,e.z-line.z)<1e-6),'normal hits must not reset or move the charge');
 assert.ok(barrage.slice(0,15).every(e=>e.pose==='charge'));
 assert.ok(barrage.some(e=>e.pose==='roll'));assert.ok(barrage.every(e=>e.dodge===null));
 close(barrage.at(-1).roll,9.6);close(barrage.at(-1).hp,9949);
 assert.equal(barrage.filter((e,i,a)=>e.playerHP<(i?a[i-1].playerHP:100)).length,1);assert.equal(barrage.at(-1).playerHP,82);
 assert.ok(barrage.at(-1).cooldown<3.8,'incoming hits may not extend cooldown');
 close(dodge.at(-1).distance,2.4);close(dodge.at(-1).hp,9976);assert.ok(dodge.every(e=>e.playerHP===100&&e.attack===null));
 close(direction[0]*line.nx+direction[1]*line.nz,0);assert.ok(dodge.some(e=>e.pose==='dodge')&&dodge.some(e=>e.pose==='dodge-recover'));
 assert.ok(dodge.at(-1).dodgeCooldown>3.8);close(dodge.at(-1).cooldown,4.4);
 close(frozen.before.x,frozen.after.x);close(frozen.before.z,frozen.after.z);close(frozen.before.age,frozen.after.age);close(frozen.before.hp-frozen.after.hp,7);close(frozen.resumed,2.4);
 assert.deepEqual(killed,{alive:false,remnants:1,cell:18});
 for(const [name,e]of Object.entries(result.snapshots)){
  const pose=await page.evaluate(e=>{const q=__slimeGameQA;q.world.pandaDead=[];q.world.pandaDust=[];q.world.enemies=[e];q.draw();return {...q.pandaRenderer.stats.last,gl:document.querySelector('#world').getContext('webgl2').getError()};},e);
  assert.equal(pose.gl,0);assert.equal(pose.size,3.35);assert.ok(name.includes('dodge')?pose.name.startsWith('dodge'):['charge','roll'].includes(pose.name));await capture(name);
 }
 await page.evaluate(()=>{const q=__slimeGameQA;q.state.player[0]=0;q.state.player[2]=0;q.world.reset('panda',150);});
 delete result.snapshots;return result;
}
