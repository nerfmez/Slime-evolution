import {ATTACK_ART} from './elite-frog-attack-frames.js';
import {eliteFrogAttackLayout,FROG_CAMERA} from './elite-frog-attack.js';
// Contact samples come from solid tongue pixels, excluding painted poison mist.
export const ELITE_FROG_RANGE=4.5;
export const ELITE_FROG_HALF_ANGLE=Math.PI/3;
export const ELITE_FROG_WINDUP=.55;
export const ELITE_FROG_RECOVERY=.22;
export const ELITE_FROG_TONGUE_DURATION=ATTACK_ART.duration;
const clamp=v=>Math.max(0,Math.min(1,v));
export function insideEliteFrogCone(x,z,dx,dz){
 const distance=Math.hypot(x,z);
 return distance<=ELITE_FROG_RANGE&&(distance<1e-6||(x*dx+z*dz)/distance>=Math.cos(ELITE_FROG_HALF_ANGLE));
}
// The full image stays at constant body scale; the authored frames supply the sweep.
export function eliteFrogTongueState(e,age=e.frogEliteTongueAge){
 if(age==null||age<0||age>=ELITE_FROG_TONGUE_DURATION||e.hp<=0||e.frogDeath!=null)return null;
 const frame=ATTACK_ART.ends.findIndex(end=>age<end),art=ATTACK_ART.frames[frame];
 const layout=eliteFrogAttackLayout(e,frame,e.frogSpriteCamera||FROG_CAMERA);
 return {frame,closed:art.closed,rect:art.rect,scale:1,reach:Math.max(0,...art.samples.map(p=>p[0]))*layout.pixelSize,facing:layout.facing};
}
export function eliteFrogTonguePoints(e,age=e.frogEliteTongueAge){
 const state=eliteFrogTongueState(e,age);if(!state||state.closed)return [];
 const layout=eliteFrogAttackLayout(e,state.frame,e.frogSpriteCamera||FROG_CAMERA);
 // Project the painted tongue to the player's contact-height plane. This is
 // the inverse of the SAME billboard transform used to draw the whole frog.
 // No separately rotating cone or tongue mesh can drift away from these pixels.
 const height=.3,depth=Math.max(.01,-layout.up[2]);
 return ATTACK_ART.frames[state.frame].samples.map(([x,y,r])=>({
  x:e.x+x*layout.pixelSize*layout.facing,
  z:e.z+(layout.up[1]*(height-.02)-y*layout.pixelSize)/depth,
  width:r*layout.pixelSize,depthScale:depth
 }));
}
export function tongueTouchesPlayer(e,from,to,player,radius=.25){
 // Subsample time as well as length so a fast sweep cannot tunnel on slow frames.
 const samples=Math.max(1,Math.ceil((to-from)/.008));
 for(let j=0;j<=samples;j++){
  const points=eliteFrogTonguePoints(e,from+(to-from)*j/samples);
  for(const point of points)if(Math.hypot(player[0]-point.x,(player[2]-point.z)*point.depthScale)<=radius+point.width)return true;
 }
 return false;
}
export function eliteFrogAttack(world,dt,e,distance,player,visible,damage){
 if(!e.elite||e.type!=='thorn')return null;
 if(e.frogEliteTongueAge!=null){
  const before=e.frogEliteTongueAge,after=Math.min(ELITE_FROG_TONGUE_DURATION,before+dt);
  e.frogEliteTongueAge=after;e.frogAttack=ELITE_FROG_RECOVERY;e.frogHopActive=false;e.frogHopPhase=0;
  if(!e.frogEliteFired&&tongueTouchesPlayer(e,before,after,player,world.playerRadius||.25)){
   e.frogEliteFired=true;world.damage(Math.max(1,Math.round(damage*.82)));
   world.playerPoisonTime=Math.max(world.playerPoisonTime||0,3);
   world.playerPoisonTick=Math.min(world.playerPoisonTick||.72,.72);
   world.playerPoisonDamage=Math.max(world.playerPoisonDamage||0,Math.max(1,Math.round(damage*.28)));
  }
  if(after>=ELITE_FROG_TONGUE_DURATION)e.frogEliteTongueAge=null;
  return false;
 }
 if(e.windup>0){
  e.frogHopActive=false;e.frogHopPhase=0;e.windup=Math.max(0,e.windup-dt);e.frogAttack=ELITE_FROG_RECOVERY;
  if(e.windup===0)e.frogEliteTongueAge=0;
  return false;
 }
 if(e.frogAttack>0)return false;
 if(e.attack<=0&&visible&&distance<=ELITE_FROG_RANGE){
  const x=player[0]-e.x,z=player[2]-e.z;
  e.yaw=Math.hypot(x,z)>1e-6?Math.atan2(x,z):e.yaw||0;
  e.frogEliteAimX=Math.sin(e.yaw);e.frogEliteAimZ=Math.cos(e.yaw);
  e.frogEliteFacing=Math.abs(x)>.12?(x<0?-1:1):(e.eliteFrogFacing===-1?-1:1);
  e.windup=ELITE_FROG_WINDUP;e.attack=2.65;e.frogAttack=ELITE_FROG_RECOVERY;e.frogEliteFired=false;
  e.frogHopActive=false;e.frogHopPhase=0;e.frogRest=.18;e.walkBlend=0;
  return false;
 }
 return distance>1.05;
}
