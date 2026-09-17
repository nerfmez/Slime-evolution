// Water Calf replaces the Crystal enemy slot, on the finished Moss Frog game.
// No prototype interception; gameplay calls these functions at the existing enemy interface.
const TAU=Math.PI*2;
export const WATER_CELL_WORLD=1.90;
export const WATER_FOOT=.09375;
export const WATER_DEATH_LIFE=.64;
export function waterFacing(e){
  const x=Math.sin(Number.isFinite(e.yaw)?e.yaw:0);
  if(x>.12)e.waterFacing=1;else if(x<-.12)e.waterFacing=-1;
  return e.waterFacing===-1?-1:1;
}
export function waterPose(e){
  if(e.waterDeath!=null)return {name:'death',cell:8+Math.min(3,Math.floor(e.waterDeath/.12)),alpha:Math.min(1,Math.max(0,(WATER_DEATH_LIFE-e.waterDeath)/.16))};
  if(e.hit>0)return {name:'hit',cell:14,alpha:1};
  if(e.windup>0)return {name:'charge',cell:12,alpha:1};
  if(e.waterShotPose>0)return {name:'shoot',cell:13,alpha:1};
  if((e.walkBlend||0)<.08)return {name:'idle',cell:18,alpha:1};
  // The canonical movement clock advances by actual distance, not wall-clock time.
  const cycle=((e.anim||0)%1+1)%1;
  return {name:'walk',cell:Math.floor(cycle*8),alpha:1};
}
export function waterMuzzle(e){
  const scale=e.scale||1;
  // Authored shoot pose's trunk tip, projected onto the projectile's y=.30 plane.
  // The same world coordinates drive the sprite AND collision; no visual-only offset.
  return {x:e.x+waterFacing(e)*.69*scale,z:e.z-.47*scale,y:.30};
}
export function emitWaterShot(world,e,target,damage){
  const p=waterMuzzle(e),dx=target[0]-p.x,dz=target[2]-p.z;
  const aim=Math.atan2(dx,dz),spread=e.elite?[-.12,0,.12]:[0];
  for(const offset of spread){
    const angle=aim+offset;
    world.bullets.push({kind:'water-shot',owner:e.id,x:p.x,z:p.z,y:p.y,vx:Math.sin(angle)*3.8,vz:Math.cos(angle)*3.8,life:3,age:0,radius:.10,damage:Math.round(damage*(e.elite?1.34:1))});
  }
  e.waterShotPose=.22;
}
export function waterRanged(world,e,dt,target,distance,canSee,damage){
  if(e.type!=='water')throw Error('Water AI received a different enemy');
  if(!canSee || distance>(e.elite?7.4:6.5)){e.windup=0;return distance>e.radius+.29;}
  const dx=target[0]-e.x,dz=target[2]-e.z;e.yaw=Math.atan2(dx,dz);waterFacing(e);
  if(e.waterShotPose>0)return false;
  if(e.attack<=0 && e.windup===0){e.windup=e.elite?.9:.6;e.attack=e.elite?3.8:2.7;}
  if(e.windup>0){
    e.windup=Math.max(0,e.windup-dt);
    if(e.windup===0)emitWaterShot(world,e,target,damage);
    return false;
  }
  return distance>4.5;
}
export function tickWaterWorld(world,dt){
  world.waterDead??=[];world.waterSplashes??=[];
  for(const e of world.waterDead)e.waterDeath+=dt;
  world.waterDead=world.waterDead.filter(e=>e.waterDeath<WATER_DEATH_LIFE);
  for(const e of world.waterSplashes)e.age+=dt;
  world.waterSplashes=world.waterSplashes.filter(e=>e.age<.26);
  for(const e of world.enemies)if(e.type==='water')e.waterShotPose=Math.max(0,(e.waterShotPose||0)-dt);
  for(const b of world.bullets)if(b.kind==='water-shot')b.age=(b.age||0)+dt;
}
export function finishWaterBullets(world){
  for(const b of world.bullets)if(b.kind==='water-shot'&&b.life<=0){
    (world.waterSplashes??=[]).push({x:b.x,z:b.z,y:b.y,age:0});
  }
}
export async function createWaterCalfRenderer(gl,{program,geometry,uniform,render}){
  const url=new URL('./enemies/water-calf-atlas.webp',import.meta.url);
  const response=await fetch(url);
  if(!response.ok)throw Error(`Water Calf atlas ${response.status}: ${url.pathname}`);
  const image=new Image(),objectURL=URL.createObjectURL(await response.blob());
  try{image.src=objectURL;await image.decode();}finally{URL.revokeObjectURL(objectURL);}
  if(image.naturalWidth!==1536||image.naturalHeight!==1920)throw Error('Water Calf atlas has wrong dimensions');
  const texture=gl.createTexture();
  gl.activeTexture(gl.TEXTURE11);gl.bindTexture(gl.TEXTURE_2D,texture);
  const oldFlip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,oldFlip);
  for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
  for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
  gl.activeTexture(gl.TEXTURE0);
  const p=program(gl,`layout(location=0)in vec3 position;layout(location=2)in vec2 uv;
  uniform mat4 vp;uniform vec3 origin;uniform vec3 cameraDirection;uniform vec4 rect;uniform float size,angle,anchor;
  out vec2 UV;out vec3 world;
  void main(){vec3 forward=normalize(cameraDirection),right=normalize(cross(vec3(0,1,0),forward)),up=cross(forward,right);
  vec2 local=position.xy+vec2(0.,.5-anchor);float c=cos(angle),s=sin(angle);local=mat2(c,s,-s,c)*local;
  world=origin+(right*local.x+up*local.y)*size;UV=uv;gl_Position=vp*vec4(world,1.);}`,
  `in vec2 UV;in vec3 world;uniform sampler2D atlas,canopy;uniform vec4 rect;uniform vec3 player;uniform float flipX,alpha,lit;out vec4 color;
  void main(){vec2 u=vec2(flipX>.5?1.-UV.x:UV.x,UV.y);u=mix(vec2(.002),vec2(.998),u);vec4 c=texture(atlas,rect.xy+u*rect.zw);if(c.a<.10)discard;
  vec2 point=world.xz-vec2(.65,-.45)*max(world.y,0.);float shade=texture(canopy,(point+40.)/80.).r;
  c.rgb*=mix(vec3(1.),vec3(.63,.72,.66),shade*lit);float fog=smoothstep(16.,34.,length(world.xz-player.xz));c.rgb=mix(c.rgb,vec3(.87,.88,.67),fog);c.a*=alpha;color=c;}`);
  const g=geometry(gl,[-.5,.5,0,.5,.5,0,.5,-.5,0,-.5,-.5,0],null,[0,1,1,1,1,0,0,0],[0,2,1,0,3,2]);
  gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'atlas'),11);gl.uniform1i(gl.getUniformLocation(p,'canopy'),1);
  const stats={calls:0,poses:{},projectileFrames:{},splashes:0};
  function drawCell(cell,origin,vp,player,size,flip,alpha,angle,anchor,lit,camera){
    // Unit 11 is also used by the canonical slime AA pass. Rebind EVERY draw.
    gl.activeTexture(gl.TEXTURE11);gl.bindTexture(gl.TEXTURE_2D,texture);gl.activeTexture(gl.TEXTURE0);
    gl.useProgram(p);
    for(const [key,value] of Object.entries({vp,origin,player,size,flipX:flip,alpha,angle,anchor,lit,cameraDirection:camera,rect:[cell%4*.25,1-(Math.floor(cell/4)+1)*.2,.25,.2]}))uniform(gl,p,key,value);
    gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);render(gl,g);gl.disable(gl.BLEND);
    stats.calls++;return {calls:1,triangles:2};
  }
  return {stats,draw(e,vp,player,camera=[0,12,15]){
    const pose=waterPose(e);stats.poses[pose.name]=(stats.poses[pose.name]||0)+1;
    return drawCell(pose.cell,[e.x,.025,e.z],vp,player,WATER_CELL_WORLD*(e.scale||1),waterFacing(e)<0?1:0,pose.alpha,0,WATER_FOOT,1,camera);
  },drawProjectile(b,vp,player,camera=[0,12,15]){
    const cell=15+Math.floor((b.age||0)*12)%2;stats.projectileFrames[cell]=(stats.projectileFrames[cell]||0)+1;
    return drawCell(cell,[b.x,b.y??.3,b.z],vp,player,.84,0,1,Math.atan2(-b.vz*.625,b.vx),.45,0,camera);
  },drawSplash(b,vp,player,camera=[0,12,15]){
    stats.splashes++;return drawCell(17,[b.x,.025,b.z],vp,player,.85,0,Math.min(1,(.26-b.age)/.12),0,WATER_FOOT,0,camera);
  }};
}
