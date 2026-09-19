// The visible tongue centreline is also the collision path. No ground sector.
export const ELITE_FROG_RANGE=4.5;
export const ELITE_FROG_HALF_ANGLE=Math.PI/3;
export const ELITE_FROG_WINDUP=.55;
export const ELITE_FROG_RECOVERY=.22;
export const ELITE_FROG_TONGUE_DURATION=.66;
export const ELITE_FROG_TONGUE_SEGMENTS=28;
const clamp=v=>Math.max(0,Math.min(1,v));
export function insideEliteFrogCone(x,z,dx,dz){
 const distance=Math.hypot(x,z);
 return distance<=ELITE_FROG_RANGE&&(distance<1e-6||(x*dx+z*dz)/distance>=Math.cos(ELITE_FROG_HALF_ANGLE));
}
export function eliteFrogTonguePoints(e,age=e.frogEliteTongueAge){
 if(age==null||age<0||age>ELITE_FROG_TONGUE_DURATION||e.hp<=0||e.frogDeath!=null)return [];
 const reach=clamp(age/.12)*clamp((ELITE_FROG_TONGUE_DURATION-age)/.12);
 const sweep=clamp((age-.12)/.42),aim=Math.atan2(e.frogEliteAimX??0,e.frogEliteAimZ??1);
 const tipAngle=aim-ELITE_FROG_HALF_ANGLE+2*ELITE_FROG_HALF_ANGLE*sweep;
 const points=[];
 for(let i=0;i<=ELITE_FROG_TONGUE_SEGMENTS;i++){
  const t=i/ELITE_FROG_TONGUE_SEGMENTS;
  const angle=tipAngle-.24*Math.sin(Math.PI*t),r=ELITE_FROG_RANGE*reach*t;
  points.push({x:e.x+Math.sin(angle)*r,z:e.z+Math.cos(angle)*r,y:.90*(e.scale||1)+(.38-.90*(e.scale||1))*t*reach+.20*Math.sin(Math.PI*t)*reach,width:(.11+.08*Math.sin(Math.PI*t))*(.25+.75*reach)});
 }
 return points;
}
function distanceToSegment(x,z,a,b){
 const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
 const t=length?clamp(((x-a.x)*dx+(z-a.z)*dz)/length):0;
 return Math.hypot(x-a.x-t*dx,z-a.z-t*dz);
}
export function tongueTouchesPlayer(e,from,to,player,radius=.25){
 // Subsample time as well as length so a fast sweep cannot tunnel on slow frames.
 const samples=Math.max(1,Math.ceil((to-from)/.008));
 for(let j=0;j<=samples;j++){
  const points=eliteFrogTonguePoints(e,from+(to-from)*j/samples);
  for(let i=1;i<points.length;i++)if(distanceToSegment(player[0],player[2],points[i-1],points[i])<=radius+points[i].width)return true;
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
  e.windup=ELITE_FROG_WINDUP;e.attack=2.65;e.frogAttack=ELITE_FROG_RECOVERY;e.frogEliteFired=false;
  e.frogHopActive=false;e.frogHopPhase=0;e.frogRest=.18;e.walkBlend=0;
  return false;
 }
 return distance>1.05;
}
