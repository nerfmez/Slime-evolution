import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pandaAI,PANDA_ATTACK_LENGTH} from '../game/assets/bamboo-panda.js';

test('charge-boundary rounding at nonzero map coordinates cannot cancel an unobstructed roll',()=>{
 for(const [x,z]of [[-21,-24],[21,24],[-.2,.4],[0,0]])for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.25]){
  const nx=Math.cos(angle),nz=Math.sin(angle),target=[x+nx*5,0,z+nz*5];
  const e={id:1,type:'panda',hp:480,x,z,yaw:angle,radius:.62,attack:0,hit:0,pandaCooldown:0};
  const w={playerRadius:.25,hits:[],moveEnemy(e,dx,dz){e.x+=dx;e.z+=dz;},damage(n){this.hits.push(n);}};
  for(let i=0;i<16;i++)pandaAI(w,e,.05,target,5,true,12);
  assert.ok(Math.hypot(e.x-x,e.z-z)<1e-8);
  assert.equal(e.pandaBlocked,undefined,'floating-point substep is not a wall');
  for(let t=.8;t<PANDA_ATTACK_LENGTH+.1;t+=.05)pandaAI(w,e,.05,target,5,true,12);
  assert.ok(Math.abs(e.pandaRollDistance-9.6)<1e-8);
  assert.ok(Math.abs(e.x-(x+nx*9.6))<1e-8);assert.ok(Math.abs(e.z-(z+nz*9.6))<1e-8);
  assert.deepEqual(w.hits,[18]);assert.equal(e.pandaAge,undefined);
 }
});
