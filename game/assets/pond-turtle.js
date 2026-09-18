// Pond Turtle: only approved source-video walk frames and approved still poses.
// An independent species; no old Mossback/model fallback or prototype interception.
export const TURTLE_CELL_WORLD=2.16;
export const TURTLE_FOOT=1-328/384;
export const TURTLE_DEATH_LIFE=1.0;
export const TURTLE_GUARD_CHARGE=.30;
export const TURTLE_GUARD_HOLD=2.40;
export const TURTLE_GUARD_RECOVERY=.25;
export const TURTLE_GUARD_LENGTH=TURTLE_GUARD_CHARGE+TURTLE_GUARD_HOLD+TURTLE_GUARD_RECOVERY;
export const TURTLE_GUARD_COOLDOWN=6.5;
export const TURTLE_GUARD_RANGE=3.2;
export const TURTLE_DAMAGE_MULTIPLIER=.30;

export function turtleFacing(e){
  if(e.turtleGuardAge!=null||e.turtleDeath!=null||e.hit>0)return e.turtleFacing===-1?-1:1;
  const side=Math.sin(Number.isFinite(e.yaw)?e.yaw:0);
  if(side>.15)e.turtleFacing=1;else if(side<-.15)e.turtleFacing=-1;
  return e.turtleFacing===-1?-1:1;
}
export function turtleShieldActive(e){
  return e.type==='turtle'&&e.hp>0&&e.turtleDeath==null&&e.turtleGuardAge!=null&&
    e.turtleGuardAge>=TURTLE_GUARD_CHARGE-1e-8&&e.turtleGuardAge<TURTLE_GUARD_CHARGE+TURTLE_GUARD_HOLD-1e-8;
}
export function turtlePose(e){
  if(e.turtleDeath!=null)return {name:'death',cell:13,alpha:Math.min(1,Math.max(0,(TURTLE_DEATH_LIFE-e.turtleDeath)/.25)),shield:0};
  if(e.turtleGuardAge!=null){
    const age=e.turtleGuardAge;
    const shield=age<TURTLE_GUARD_CHARGE?Math.max(0,age/TURTLE_GUARD_CHARGE):
      Math.min(1,Math.max(0,(TURTLE_GUARD_LENGTH-age)/TURTLE_GUARD_RECOVERY));
    return {name:age<TURTLE_GUARD_CHARGE?'charge':age<TURTLE_GUARD_CHARGE+TURTLE_GUARD_HOLD?'guard':'recover',cell:14,alpha:1,shield};
  }
  if(e.hit>0)return {name:'hurt',cell:12,alpha:1,shield:0};
  if((e.walkBlend||0)<.06)return {name:'idle',cell:0,alpha:1,shield:0};
  const phase=(((e.walkPhase||0)%1)+1)%1;
  return {name:'walk',cell:Math.min(11,Math.floor(phase*12)),alpha:1,shield:0};
}
/** Called by the existing central hit path AND its separate storm damage path.
 * Returns actual damage, so HP, displayed numbers, damage totals and rewards agree. */
export function turtleDamage(e,damage){
  if(e.type!=='turtle'||!(damage>0)||e.hp<=0)return damage;
  turtleFacing(e);
  if(turtleShieldActive(e)){e.turtleShieldFlash=.14;return damage*TURTLE_DAMAGE_MULTIPLIER;}
  e.turtleGuardRequested=true;return damage;
}
export function tickTurtleWorld(world,dt){
  world.turtleDead??=[];
  for(const e of world.turtleDead)e.turtleDeath+=dt;
  world.turtleDead=world.turtleDead.filter(e=>e.turtleDeath<TURTLE_DEATH_LIFE);
  for(const e of world.enemies)if(e.type==='turtle'){
    e.turtleGuardCooldown=Math.max(0,(e.turtleGuardCooldown||0)-dt);
    e.turtleShieldFlash=Math.max(0,(e.turtleShieldFlash||0)-dt);
    // Shield expires even when the shared freeze/stun logic skips movement.
    if(e.turtleGuardAge!=null){
      e.turtleGuardAge+=dt;
      if(e.turtleGuardAge>=TURTLE_GUARD_LENGTH){delete e.turtleGuardAge;e.walkPhase=0;e.walkBlend=0;}
    }
  }
}
/** True delegates movement to the unchanged shared navigation/collision code. */
export function turtleGuard(world,e,dt,target,distance,canSee){
  if(e.type!=='turtle')throw Error('Pond Turtle AI received another species');
  if(!(dt>0)||e.hp<=0)return false;
  if(e.turtleGuardAge!=null){e.walkBlend=0;return false;}
  if(e.hit>0){e.walkBlend=0;return false;}
  turtleFacing(e);
  if((e.turtleGuardCooldown||0)<=0&&(e.turtleGuardRequested||(canSee&&distance<=TURTLE_GUARD_RANGE))){
    e.yaw=Math.atan2(target[0]-e.x,target[2]-e.z);turtleFacing(e);
    e.turtleGuardAge=0;e.turtleGuardCooldown=TURTLE_GUARD_COOLDOWN;e.turtleGuardRequested=false;
    e.walkBlend=0;return false;
  }
  return distance>e.radius+.29;
}

export async function createPondTurtleRenderer(gl,{program,geometry,uniform,render}){
  const url=new URL('./enemies/pond-turtle-atlas.webp',import.meta.url),response=await fetch(url);
  if(!response.ok)throw Error(`Pond Turtle atlas ${response.status}: ${url.pathname}`);
  const image=new Image(),objectURL=URL.createObjectURL(await response.blob());
  try{image.src=objectURL;await image.decode();}finally{URL.revokeObjectURL(objectURL);}
  if(image.naturalWidth!==1536||image.naturalHeight!==1536)throw Error('Pond Turtle atlas dimensions mismatch');
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
    `in vec2 UV;in vec3 world;uniform sampler2D atlas,canopy;uniform vec4 rect;uniform vec3 player;
    uniform float flipX,alpha,emissive;out vec4 color;
    void main(){vec2 u=vec2(flipX>.5?1.-UV.x:UV.x,UV.y);u=mix(vec2(.0014),vec2(.9986),u);
    vec4 c=texture(atlas,rect.xy+u*rect.zw);if(c.a<.035)discard;
    vec2 point=world.xz-vec2(.65,-.45)*max(world.y,0.);float shade=texture(canopy,(point+40.)/80.).r;
    c.rgb*=mix(vec3(1.),vec3(.63,.72,.66),shade*(1.-emissive));
    float fog=smoothstep(16.,34.,length(world.xz-player.xz));c.rgb=mix(c.rgb,vec3(.87,.88,.67),fog);
    c.a*=alpha;color=c;}`);
  const g=geometry(gl,[-.5,.5,0,.5,.5,0,.5,-.5,0,-.5,-.5,0],null,[0,1,1,1,1,0,0,0],[0,2,1,0,3,2]);
  gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'atlas'),11);gl.uniform1i(gl.getUniformLocation(p,'canopy'),1);
  const stats={calls:0,poses:{},cells:{},last:null,textureBytes:1536*1536*4};
  return {stats,draw(e,vp,player,camera=[0,12,15]){
    const pose=turtlePose(e),facing=turtleFacing(e),baseSize=TURTLE_CELL_WORLD*(e.scale||1);
    gl.activeTexture(gl.TEXTURE11);gl.bindTexture(gl.TEXTURE_2D,texture);gl.activeTexture(gl.TEXTURE0);gl.useProgram(p);
    const values={vp,origin:[e.x,.025,e.z],player,size:baseSize,anchor:TURTLE_FOOT,cameraDirection:camera,flipX:facing<0?1:0,alpha:pose.alpha,emissive:0,
      rect:[pose.cell%4*.25,1-(Math.floor(pose.cell/4)+1)*.25,.25,.25]};
    for(const [key,value]of Object.entries(values))uniform(gl,p,key,value);
    gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);render(gl,g);
    let calls=1;
    if(pose.shield>0){
      // Independent aura breathes; the approved shell/head/limbs never warp or double.
      const pulse=Math.sin((e.turtleGuardAge||0)*7);
      uniform(gl,p,'rect',[.75,0,.25,.25]);uniform(gl,p,'size',baseSize*(1+.012*pulse));
      uniform(gl,p,'emissive',1);uniform(gl,p,'alpha',Math.min(1,pose.shield*(.90+.07*pulse)+(e.turtleShieldFlash||0)));
      gl.depthMask(false);render(gl,g);calls++;
    }
    gl.depthMask(true);gl.disable(gl.BLEND);stats.calls+=calls;
    stats.poses[pose.name]=(stats.poses[pose.name]||0)+1;stats.cells[pose.cell]=(stats.cells[pose.cell]||0)+1;
    stats.last={id:e.id,name:pose.name,cell:pose.cell,facing,pivot:[192,328],size:baseSize,shield:pose.shield,guarded:turtleShieldActive(e)};
    return {calls,triangles:2*calls};
  }};
}
