// Bamboo Panda mini-boss. Uses the approved, edge-cleaned real-video sprite atlas.
// The four ordinary enemy species and the final boss keep their existing systems.
export const PANDA_CELL_WORLD=3.35;
export const PANDA_FOOT=1-330/384;
export const PANDA_SPAWN_TIMES=Object.freeze([150,240]);
export const PANDA_CHARGE=.80;
export const PANDA_ROLL_SPEED=8;
export const PANDA_ROLL_TIME=1.20;
export const PANDA_ROLL_DISTANCE=PANDA_ROLL_SPEED*PANDA_ROLL_TIME;
export const PANDA_ROLL_END=PANDA_CHARGE+PANDA_ROLL_TIME;
export const PANDA_RECOVERY=.55;
export const PANDA_ATTACK_LENGTH=PANDA_ROLL_END+PANDA_RECOVERY;
export const PANDA_COOLDOWN=6.2;
export const PANDA_TRIGGER_RANGE=6.6;
export const PANDA_DEATH_LIFE=1.15;
export function pandaFacing(e){
 if(e.pandaAge!=null||e.pandaDeath!=null||e.hit>0)return e.pandaFacing===-1?-1:1;
 const x=Math.sin(Number.isFinite(e.yaw)?e.yaw:0);
 if(x>.15)e.pandaFacing=1;else if(x<-.15)e.pandaFacing=-1;
 return e.pandaFacing===-1?-1:1;
}
export function pandaPose(e){
 if(e.pandaDeath!=null)return {name:'death',cell:18,alpha:Math.min(1,Math.max(0,(PANDA_DEATH_LIFE-e.pandaDeath)/.3))};
 if(e.pandaAge!=null){
  const age=e.pandaAge;
  if(age<PANDA_CHARGE)return {name:'charge',cell:16,alpha:1};
  if(age<PANDA_ROLL_END)return {name:'roll',cell:8+Math.floor(((e.pandaRollDistance||0)/3.2%1)*8),alpha:1};
  return {name:'recover',cell:age<PANDA_ROLL_END+.35?16:0,alpha:1};
 }
 if(e.hit>0)return {name:'hurt',cell:17,alpha:1};
 if((e.walkBlend||0)<.06)return {name:'idle',cell:0,alpha:1};
 return {name:'walk',cell:Math.floor((((e.walkPhase||0)%1+1)%1)*8),alpha:1};
}
export function resetPandaWorld(w){
 w.pandaDead=[];w.pandaDust=[];w.pandaSpawnSlot=PANDA_SPAWN_TIMES.filter(t=>t<w.time).length;
}
export function tickPandaWorld(w,dt){
 w.pandaDead??=[];w.pandaDust??=[];
 for(const e of w.pandaDead)e.pandaDeath+=dt;
 w.pandaDead=w.pandaDead.filter(e=>e.pandaDeath<PANDA_DEATH_LIFE);
 for(const p of w.pandaDust)p.age+=dt;
 w.pandaDust=w.pandaDust.filter(p=>p.age<.45);
 for(const e of w.enemies)if(e.type==='panda')e.pandaCooldown=Math.max(0,(e.pandaCooldown||0)-dt);
}
export function spawnScheduledPanda(w,target){
 if(w.mode!=='auto'||w.time>=300||w.bossSpawned||w.finished)return;
 w.pandaSpawnSlot??=PANDA_SPAWN_TIMES.filter(t=>t<w.time-.1).length;
 while(w.pandaSpawnSlot<PANDA_SPAWN_TIMES.length&&w.time>=PANDA_SPAWN_TIMES[w.pandaSpawnSlot]){
  // A living Panda consumes, rather than queues, the later encounter. Never stack mini-bosses.
  if(w.enemies.some(e=>e.type==='panda'&&e.hp>0)){w.pandaSpawnSlot++;continue;}
  if(!w.spawn(target,'panda',false))return;
  w.pandaSpawnSlot++;
 }
}
/** True delegates walking to the current shared navigation/collision code. */
export function pandaAI(w,e,dt,target,distance,visible,damage){
 if(e.type!=='panda')throw Error('Panda AI received another species');
 if(!(dt>0)||e.hp<=0)return false;
 if(e.hit>0&&(e.pandaAge==null||e.pandaAge<PANDA_CHARGE)){
  delete e.pandaAge;e.pandaCooldown=Math.max(e.pandaCooldown||0,1.2);e.walkBlend=0;return false;
 }
 if(e.pandaAge==null){
  pandaFacing(e);
  if((e.pandaCooldown||0)>0||!visible||distance>PANDA_TRIGGER_RANGE){
   if(visible&&distance<e.radius+(w.playerRadius||.25)+.07&&e.attack<=0){w.damage(damage);e.attack=1.4;}
   return distance>e.radius+.29;
  }
  const dx=target[0]-e.x,dz=target[2]-e.z,d=Math.max(.001,Math.hypot(dx,dz));
  e.yaw=Math.atan2(dx,dz);pandaFacing(e);e.pandaAimX=dx/d;e.pandaAimZ=dz/d;
  e.pandaAge=0;e.pandaCooldown=PANDA_COOLDOWN;e.pandaRollDistance=0;e.pandaRollHit=false;e.pandaDustClock=0;e.walkBlend=0;
 }
 const before=e.pandaAge;let after=Math.min(PANDA_ATTACK_LENGTH,before+dt);
 const moving=Math.max(0,Math.min(after,PANDA_ROLL_END)-Math.max(before,PANDA_CHARGE));
 // Ignore sub-nanosecond overlap at the exact charge boundary; world-coordinate
 // rounding must not look like a blocking obstacle.
 if(moving>1e-9){
  const travel=moving*PANDA_ROLL_SPEED,steps=Math.max(1,Math.ceil(travel/.055));
  for(let i=0;i<steps;i++){
   const oldX=e.x,oldZ=e.z,step=travel/steps;
   w.moveEnemy(e,e.pandaAimX*step,e.pandaAimZ*step);
   const dx=e.x-oldX,dz=e.z-oldZ,along=dx*e.pandaAimX+dz*e.pandaAimZ;
   const moved=Math.hypot(dx,dz);e.pandaRollDistance+=moved;
   if(!e.pandaRollHit&&visible&&moved>0&&Math.hypot(target[0]-e.x,target[2]-e.z)<e.radius+(w.playerRadius||.25)+.04){
    e.pandaRollHit=true;w.damage(damage*1.5);
   }
   if(along<step*.70){after=PANDA_ROLL_END;e.pandaBlocked=true;break;}
  }
  e.pandaDustClock-=moving;
  if(e.pandaDustClock<=0&&e.pandaRollDistance>.05){
   (w.pandaDust??=[]).push({x:e.x-e.pandaAimX*.5,z:e.z-e.pandaAimZ*.5,age:0,facing:e.pandaFacing});
   w.pandaDust=w.pandaDust.slice(-8);e.pandaDustClock=.12;
  }
 }
 e.pandaAge=after;e.walkBlend=0;
 if(after>=PANDA_ATTACK_LENGTH){delete e.pandaAge;e.walkPhase=0;delete e.pandaBlocked;}
 return false;
}
export async function createBambooPandaRenderer(gl,{program,geometry,uniform,render}){
 const url=new URL('./enemies/bamboo-panda-atlas.webp',import.meta.url),response=await fetch(url);
 if(!response.ok)throw Error(`Bamboo Panda atlas ${response.status}`);
 const image=new Image(),objectURL=URL.createObjectURL(await response.blob());
 try{image.src=objectURL;await image.decode();}finally{URL.revokeObjectURL(objectURL);}
 if(image.naturalWidth!==1536||image.naturalHeight!==1920)throw Error('Panda atlas dimensions mismatch');
 const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE11);gl.bindTexture(gl.TEXTURE_2D,texture);
 const oldFlip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,oldFlip);
 for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
 for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
 gl.activeTexture(gl.TEXTURE0);
 const p=program(gl,`layout(location=0)in vec3 position;layout(location=2)in vec2 uv;
 uniform mat4 vp;uniform vec3 origin,cameraDirection;uniform float size,anchor;out vec2 UV;out vec3 world;
 void main(){vec3 forward=normalize(cameraDirection),right=normalize(cross(vec3(0,1,0),forward)),up=cross(forward,right);
 vec2 local=position.xy+vec2(0.,.5-anchor);world=origin+(right*local.x+up*local.y)*size;UV=uv;gl_Position=vp*vec4(world,1.);}`,
 `in vec2 UV;in vec3 world;uniform sampler2D atlas,canopy;uniform vec4 rect;uniform vec3 player;uniform float flipX,alpha;out vec4 color;
 void main(){vec2 u=vec2(flipX>.5?1.-UV.x:UV.x,UV.y);u=mix(vec2(.0014),vec2(.9986),u);vec4 c=texture(atlas,rect.xy+u*rect.zw);
 if(c.a<.035)discard;vec2 point=world.xz-vec2(.65,-.45)*max(world.y,0.);float shade=texture(canopy,(point+40.)/80.).r;
 c.rgb*=mix(vec3(1.),vec3(.63,.72,.66),shade);float fog=smoothstep(16.,34.,length(world.xz-player.xz));c.rgb=mix(c.rgb,vec3(.87,.88,.67),fog);c.a*=alpha;color=c;}`);
 const g=geometry(gl,[-.5,.5,0,.5,.5,0,.5,-.5,0,-.5,-.5,0],null,[0,1,1,1,1,0,0,0],[0,2,1,0,3,2]);
 gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'atlas'),11);gl.uniform1i(gl.getUniformLocation(p,'canopy'),1);
 const stats={calls:0,poses:{},last:null,textureBytes:1536*1920*4};
 function cellDraw(cell,origin,size,facing,alpha,vp,player,camera,dust=false){
  gl.activeTexture(gl.TEXTURE11);gl.bindTexture(gl.TEXTURE_2D,texture);gl.activeTexture(gl.TEXTURE0);gl.useProgram(p);
  for(const[k,v]of Object.entries({vp,origin,size,anchor:PANDA_FOOT,flipX:facing<0?1:0,alpha,player,cameraDirection:camera,rect:[cell%4*.25,1-(Math.floor(cell/4)+1)*.2,.25,.2]}))uniform(gl,p,k,v);
  gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(!dust);render(gl,g);gl.depthMask(true);gl.disable(gl.BLEND);stats.calls++;
  return {calls:1,triangles:2};
 }
 return {stats,draw(e,vp,player,camera=[0,12,15]){
  const pose=pandaPose(e),facing=pandaFacing(e),size=PANDA_CELL_WORLD*(e.scale||1);
  const result=cellDraw(pose.cell,[e.x,.025,e.z],size,facing,pose.alpha,vp,player,camera);
  stats.poses[pose.name]=(stats.poses[pose.name]||0)+1;stats.last={id:e.id,...pose,facing,size,pivot:[192,330]};return result;
 },drawDust(d,vp,player,camera=[0,12,15]){
  return cellDraw(19,[d.x,.03,d.z],1.35+d.age*.6,d.facing,.38*Math.max(0,1-d.age/.45),vp,player,camera,true);
 }};
}
