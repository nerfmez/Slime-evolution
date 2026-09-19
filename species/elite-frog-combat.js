// Shared world-space geometry for the Elite Frog's impact effect, hit and poison.
export const ELITE_FROG_RANGE = 4.5;
export const ELITE_FROG_HALF_ANGLE = Math.PI / 3; // 120-degree cone
export const ELITE_FROG_WINDUP = .55;
export const ELITE_FROG_RECOVERY = .22;
export function insideEliteFrogCone(x,z,dx,dz){
  const distance=Math.hypot(x,z);
  return distance<=ELITE_FROG_RANGE && (distance<1e-6 || (x*dx+z*dz)/distance>=Math.cos(ELITE_FROG_HALF_ANGLE));
}
export function eliteFrogAttack(world,dt,e,distance,player,visible,damage){
  if(!e.elite||e.type!=='thorn')return null;
  if(e.windup>0){
    e.frogHopActive=false;e.frogHopPhase=0;
    e.windup=Math.max(0,e.windup-dt);e.frogAttack=ELITE_FROG_RECOVERY;
    if(e.windup===0&&!e.frogEliteFired){
      e.frogEliteFired=true;
      const dx=e.frogEliteAimX??0,dz=e.frogEliteAimZ??1;
      if(insideEliteFrogCone(player[0]-e.x,player[2]-e.z,dx,dz)){
        world.damage(Math.max(1,Math.round(damage*.82)));
        world.playerPoisonTime=Math.max(world.playerPoisonTime||0,3);
        world.playerPoisonTick=Math.min(world.playerPoisonTick||.72,.72);
        world.playerPoisonDamage=Math.max(world.playerPoisonDamage||0,Math.max(1,Math.round(damage*.28)));
      }
      (world.eliteFx??=[]).push({kind:'frog-cone',x:e.x,z:e.z,dx,dz,length:ELITE_FROG_RANGE,angle:ELITE_FROG_HALF_ANGLE,age:0,life:.46});
    }
    return false;
  }
  if(e.frogAttack>0)return false;
  if(e.attack<=0&&visible&&distance<=ELITE_FROG_RANGE){
    const x=player[0]-e.x,z=player[2]-e.z,length=Math.hypot(x,z);
    e.yaw=length>1e-6?Math.atan2(x,z):e.yaw||0;
    e.frogEliteAimX=Math.sin(e.yaw);e.frogEliteAimZ=Math.cos(e.yaw);
    e.windup=ELITE_FROG_WINDUP;e.attack=2.65;e.frogAttack=ELITE_FROG_RECOVERY;e.frogEliteFired=false;
    e.frogHopActive=false;e.frogHopPhase=0;e.frogRest=.18;e.walkBlend=0;
    return false;
  }
  return distance>1.05;
}
