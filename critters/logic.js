// Pickup actors: gameplay changes are scoped to attraction and a small, catchable escape.
// Reward values, drop rates, combat RNG, audio and save keys are unchanged.
export const CRITTER = Object.freeze({roam:.48, speed:.24, swallow:.16, limit:33.6,
  magnetStep:.42, fleeNear:.95, fleeReset:1.65, fleeTime:.42, fleeSpeed:.95, fleeLeash:.96});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fract=n=>n-Math.floor(n);
export function ensureCritter(o,canStand){
  if(o.critter&&(!canStand||o.critter.placed))return o.critter;
  const seed=fract(Math.sin((o.id??o.x*17+o.z*31)*12.9898)*43758.5453);
  const variant={heal:3,magnet:4,nova:5}[o.kind]??Math.floor(seed*3);
  if(canStand&&!canStand(o.x,o.z,.08)){
    outer:for(const r of [.25,.5,.9,1.4])for(let k=0;k<8;k++){
      const a=k*Math.PI/4,x=clamp(o.x+Math.cos(a)*r,-CRITTER.limit,CRITTER.limit),z=clamp(o.z+Math.sin(a)*r,-CRITTER.limit,CRITTER.limit);
      if(canStand(x,z,.08)){o.x=x;o.z=z;break outer;}
    }
  }
  return o.critter={...o.critter,placed:!!canStand,variant,seed,homeX:o.x,homeZ:o.z,facing:seed<.5?-1:1,
    phase:seed*Math.PI*2,moving:0,eating:false,eat:0,finished:false,fleeArmed:true,fleeLeft:0};
}
export function critterAttractionRange(combat){
  const level=Math.max(0,combat.mods?.magnet||0);
  // No hidden base vacuum. A mod extends the physical contact radius by .42 per rank.
  return level>0?.38*Math.max(1,combat.size||1)+level*CRITTER.magnetStep:0;
}
function moveTo(o,x,z,c,canStand){
  x=clamp(x,-CRITTER.limit,CRITTER.limit);z=clamp(z,-CRITTER.limit,CRITTER.limit);
  const dx=x-o.x,dz=z-o.z,d=Math.hypot(dx,dz);
  if(d<.00001)return false;
  if(canStand)for(let i=1,n=Math.max(1,Math.ceil(d/.07));i<=n;i++)if(!canStand(o.x+dx*i/n,o.z+dz*i/n,.08))return false;
  o.x=x;o.z=z;if(Math.abs(dx)>.001)c.facing=dx<0?-1:1;return true;
}
function wander(o,dt,c,canStand){
  c.moving=0;
  const clock=(o.age??0)+c.seed*9;
  if(clock%2.8>1.05)return;
  const angle=Math.floor(clock/2.8)*2.39996+c.seed*6.283;
  const dx=c.homeX+Math.cos(angle)*CRITTER.roam-o.x,dz=c.homeZ+Math.sin(angle)*CRITTER.roam-o.z,d=Math.hypot(dx,dz);
  if(d<.015)return;
  const step=Math.min(d,CRITTER.speed*dt);
  if(moveTo(o,o.x+dx/d*step,o.z+dz/d*step,c,canStand)){c.moving=1;c.phase+=dt*12;}
}
function reactToPlayer(o,dt,player,c,mouth,canStand){
  const dx=o.x-player[0],dz=o.z-player[2],d=Math.hypot(dx,dz);
  c.moving=0;
  if(d>mouth+CRITTER.fleeReset)c.fleeArmed=true;
  if(c.fleeArmed!==false&&d<mouth+CRITTER.fleeNear){c.fleeArmed=false;c.fleeLeft=CRITTER.fleeTime;}
  if(c.fleeLeft>0){
    const step=CRITTER.fleeSpeed*Math.min(dt,c.fleeLeft),angle=Math.atan2(dz,dx)+(c.seed-.5)*.30;
    c.fleeLeft=Math.max(0,c.fleeLeft-dt);
    for(const turn of [0,.55,-.55,1.0,-1.0]){
      const x=o.x+Math.cos(angle+turn)*step,z=o.z+Math.sin(angle+turn)*step;
      if(Math.hypot(x-c.homeX,z-c.homeZ)>CRITTER.fleeLeash)continue;
      if(moveTo(o,x,z,c,canStand)){c.moving=1.4;c.phase+=dt*20;return;}
    }
    c.fleeLeft=0; // Cornered animals remain edible instead of clipping through terrain.
  }
  // One short escape per approach, not endless kiting; pause nearby after the hop.
  if(d>=mouth+CRITTER.fleeNear&&d<18)wander(o,dt,c,canStand);
}
function swallow(o,dt,player,c){
  c.eating=true;c.moving=0;c.fleeLeft=0;c.eat=Math.min(1,c.eat+dt/CRITTER.swallow);
  const f=1-Math.exp(-28*dt);o.x+=(player[0]-o.x)*f;o.z+=(player[2]-o.z)*f;
  return c.eat>=1;
}
export function attractAllCritters(combat){for(const o of combat.souls)if(o.value>0)o.critterMagnet=true;}
export function updateCritterSouls(combat,dt,player,canStand){
  if(!(dt>0)||combat.choosing||combat.growth)return;
  const range=critterAttractionRange(combat),mouth=.38*Math.max(1,combat.size||1);
  for(const o of combat.souls){
    if(!(o.value>0))continue;
    const c=ensureCritter(o,canStand);o.age=(o.age||0)+dt;
    const dx=player[0]-o.x,dz=player[2]-o.z,d=Math.hypot(dx,dz);
    if(o.age<=.12)continue;
    if(c.eating||d<mouth){
      if(swallow(o,dt,player,c)&&!c.finished){c.finished=true;if(combat.level<50)combat.xp+=o.value*(1+(combat.mods.soul||0)*.05);o.value=0;}
    }else if((range>0&&d<range)||o.critterMagnet){
      const speed=o.critterMagnet?12:2.2+6.3*(1-d/range),step=Math.min(d,speed*dt);
      o.x+=dx/d*step;o.z+=dz/d*step;c.fleeLeft=0;c.moving=1;c.facing=dx<0?-1:1;c.phase+=dt*16;
    }else reactToPlayer(o,dt,player,c,mouth,canStand);
  }
}
export function updateSpecialCritters(combat,dt,world,player,canStand){
  if(!(dt>0)||combat.choosing||combat.growth||world.hp<=0||world.finished)return;
  const mouth=.5*Math.max(1,combat.size||1);
  for(const o of combat.pickups||[]){
    if(o.done)continue;
    const c=ensureCritter(o,canStand);o.age=(o.age||0)+dt;
    if(o.age<=.15)continue;
    if(c.eating||Math.hypot(o.x-player[0],o.z-player[2])<mouth){
      if(swallow(o,dt,player,c)&&!c.finished){c.finished=true;combat.collect(o,world);}
    }else reactToPlayer(o,dt,player,c,mouth,canStand);
  }
}
