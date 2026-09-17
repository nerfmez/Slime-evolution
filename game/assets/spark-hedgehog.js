// Approved Spark Hedgehog art: 6 run + 6 attack + original hurt/death poses.
// This module owns ONLY the Spark species. Existing pathfinding and world.damage
// remain the source of truth; no prototype interception or legacy model fallback.
export const SPARK_CELL_WORLD=2.10;
export const SPARK_FOOT=1-330/384;
export const SPARK_DEATH_LIFE=.76;
export const SPARK_ATTACK_DURATIONS=Object.freeze([.14,.11,.14,.10,.11,.16]);
export const SPARK_ATTACK_LENGTH=SPARK_ATTACK_DURATIONS.reduce((a,b)=>a+b,0);
export const SPARK_IMPACT_TIME=.39;
const RUN_RETURN_PHASE=1.02/6;

export function sparkFacing(e){
  if(e.sparkDeath!=null||e.sparkAge!=null||e.hit>0)return e.sparkFacing===-1?-1:1;
  const x=Math.sin(Number.isFinite(e.yaw)?e.yaw:0);
  if(x>.15)e.sparkFacing=1;else if(x<-.15)e.sparkFacing=-1;
  return e.sparkFacing===-1?-1:1;
}
export function sparkAttackFrame(age){
  let end=0;
  for(let i=0;i<SPARK_ATTACK_DURATIONS.length;i++){
    end+=SPARK_ATTACK_DURATIONS[i];if(age<end-1e-8)return i;
  }
  return 5;
}
export function sparkPose(e){
  if(e.sparkDeath!=null)return {name:'death',cell:13,alpha:Math.min(1,Math.max(0,(SPARK_DEATH_LIFE-e.sparkDeath)/.20))};
  if(e.hit>0)return {name:'hurt',cell:12,alpha:1};
  if(e.sparkAge!=null)return {name:'attack',cell:6+sparkAttackFrame(e.sparkAge),alpha:1};
  if((e.walkBlend||0)<.06)return {name:'idle',cell:6,alpha:1};
  const cycle=(((e.walkPhase||0)%1)+1)%1;
  return {name:'run',cell:Math.min(5,Math.floor(cycle*6)),alpha:1};
}
export function sparkImpactPoint(e){
  return {x:e.x+(e.sparkAimX||0)*.35,z:e.z+(e.sparkAimZ||0)*.35};
}
export function tickSparkWorld(world,dt){
  world.sparkDead??=[];
  for(const e of world.sparkDead)e.sparkDeath+=dt;
  world.sparkDead=world.sparkDead.filter(e=>e.sparkDeath<SPARK_DEATH_LIFE);
}
/** Return whether the shared pursuit/pathfinding step should move this Spark. */
export function sparkMelee(world,e,dt,target,distance,canSee,damage){
  if(e.type!=='spark')throw Error('Spark AI received another species');
  if(!(dt>0)||e.hp<=0)return false;
  if(e.hit>0){
    delete e.sparkAge;e.sparkWasHit=true;e.attack=Math.max(e.attack,.32);
    e.walkBlend=0;return false;
  }
  if(e.sparkWasHit){e.sparkWasHit=false;e.walkPhase=RUN_RETURN_PHASE;}
  if(e.sparkAge==null){
    sparkFacing(e);
    if(e.attack>0||!canSee||distance>1.22)return distance>e.radius+.29;
    const dx=target[0]-e.x,dz=target[2]-e.z,d=Math.max(.001,Math.hypot(dx,dz));
    e.yaw=Math.atan2(dx,dz);sparkFacing(e);
    e.sparkAimX=dx/d;e.sparkAimZ=dz/d;e.sparkAge=0;e.sparkHitApplied=false;
    e.attack=1.90;e.walkBlend=0;
  }
  const before=e.sparkAge,after=Math.min(SPARK_ATTACK_LENGTH,before+dt);
  // Only frame 3 is airborne/dashing. The aim locks before wind-up, so this is dodgeable.
  const dashTime=Math.max(0,Math.min(after,.39)-Math.max(before,.25));
  if(dashTime>0){
    const distance=dashTime*4.0,steps=Math.max(1,Math.ceil(distance/.055));
    for(let i=0;i<steps;i++)world.moveEnemy(e,e.sparkAimX*distance/steps,e.sparkAimZ*distance/steps);
  }
  e.sparkAge=after;e.walkBlend=0;
  if(before<SPARK_IMPACT_TIME&&after>=SPARK_IMPACT_TIME&&!e.sparkHitApplied){
    e.sparkHitApplied=true;const p=sparkImpactPoint(e);
    if(canSee&&Math.hypot(target[0]-p.x,target[2]-p.z)<.39+(world.playerRadius||.25))world.damage(damage);
  }
  if(after>=SPARK_ATTACK_LENGTH){delete e.sparkAge;e.walkPhase=RUN_RETURN_PHASE;}
  return false;
}

export async function createSparkHedgehogRenderer(gl,{program,geometry,uniform,render}){
  const url=new URL('./enemies/spark-hedgehog-atlas.webp',import.meta.url);
  const response=await fetch(url);
  if(!response.ok)throw Error(`Spark Hedgehog atlas ${response.status}: ${url.pathname}`);
  const image=new Image(),objectURL=URL.createObjectURL(await response.blob());
  try{image.src=objectURL;await image.decode();}finally{URL.revokeObjectURL(objectURL);}
  if(image.naturalWidth!==1536||image.naturalHeight!==1536)throw Error('Spark atlas dimensions mismatch');
  const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE11);gl.bindTexture(gl.TEXTURE_2D,texture);
  const oldFlip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,oldFlip);
  for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
  for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
  gl.activeTexture(gl.TEXTURE0);
  const p=program(gl,`layout(location=0)in vec3 position;layout(location=2)in vec2 uv;
    uniform mat4 vp;uniform vec3 origin,cameraDirection;uniform float size,anchor;
    out vec2 UV;out vec3 world;
    void main(){vec3 forward=normalize(cameraDirection),right=normalize(cross(vec3(0,1,0),forward)),up=cross(forward,right);
    vec2 local=position.xy+vec2(0.,.5-anchor);world=origin+(right*local.x+up*local.y)*size;UV=uv;gl_Position=vp*vec4(world,1.);}`,
    `in vec2 UV;in vec3 world;uniform sampler2D atlas,canopy;uniform vec4 rect;uniform vec3 player;uniform float flipX,alpha;out vec4 color;
    void main(){vec2 u=vec2(flipX>.5?1.-UV.x:UV.x,UV.y);u=mix(vec2(.0014),vec2(.9986),u);vec4 c=texture(atlas,rect.xy+u*rect.zw);if(c.a<.035)discard;
    vec2 point=world.xz-vec2(.65,-.45)*max(world.y,0.);float shade=texture(canopy,(point+40.)/80.).r;
    c.rgb*=mix(vec3(1.),vec3(.63,.72,.66),shade);float fog=smoothstep(16.,34.,length(world.xz-player.xz));
    c.rgb=mix(c.rgb,vec3(.87,.88,.67),fog);c.a*=alpha;color=c;}`);
  const g=geometry(gl,[-.5,.5,0,.5,.5,0,.5,-.5,0,-.5,-.5,0],null,[0,1,1,1,1,0,0,0],[0,2,1,0,3,2]);
  gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'atlas'),11);gl.uniform1i(gl.getUniformLocation(p,'canopy'),1);
  const stats={calls:0,poses:{},cells:{},last:null,textureBytes:1536*1536*4};
  return {stats,draw(e,vp,player,camera=[0,12,15]){
    const pose=sparkPose(e),cell=pose.cell,facing=sparkFacing(e);
    // Unit 11 is shared with the existing slime AA and Water passes. Rebind per draw.
    gl.activeTexture(gl.TEXTURE11);gl.bindTexture(gl.TEXTURE_2D,texture);gl.activeTexture(gl.TEXTURE0);gl.useProgram(p);
    const values={vp,origin:[e.x,.025,e.z],player,size:SPARK_CELL_WORLD*(e.scale||1),anchor:SPARK_FOOT,
      cameraDirection:camera,flipX:facing<0?1:0,alpha:pose.alpha,rect:[cell%4*.25,1-(Math.floor(cell/4)+1)*.25,.25,.25]};
    for(const [key,value] of Object.entries(values))uniform(gl,p,key,value);
    gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);
    render(gl,g);gl.disable(gl.BLEND);stats.calls++;stats.poses[pose.name]=(stats.poses[pose.name]||0)+1;
    stats.cells[cell]=(stats.cells[cell]||0)+1;stats.last={id:e.id,name:pose.name,cell,facing,pivot:[192,330],size:values.size};
    return {calls:1,triangles:2};
  }};
}
