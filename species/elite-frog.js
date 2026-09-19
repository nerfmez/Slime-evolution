import {createEliteFrogAttackRenderer,eliteFrogAttackFrame,eliteFrogAttackFacing} from './elite-frog-attack.js';
// Elite Moss Frog sprite renderer built from the user's supplied two-sheet art.
// The ordinary Moss Frog remains on the approved frog-moveset.png renderer.
export const ELITE_FROG_ATLAS_WIDTH=320;
export const ELITE_FROG_ATLAS_HEIGHT=880;
export const ELITE_FROG_CELL_WORLD=1.95;
export const ELITE_FROG_FRAME=Object.freeze({
  idle:0,hit:1,death:[2,3,4],
  walk:Object.freeze([5,6,7,8,9,10,11,12]),
  attack:Object.freeze([13,14,15,16,17,18,19,20])
});
const clamp01=v=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
export function eliteFrogFacing(e){
  const x=Math.sin(Number.isFinite(e?.yaw)?e.yaw:0);
  if(x>.12)e.eliteFrogFacing=1;else if(x<-.12)e.eliteFrogFacing=-1;
  return e?.eliteFrogFacing===-1?-1:1;
}
export function eliteFrogLift(e){
  if(e?.frogDeath!=null||e?.hp<=0||(e?.frogAttack||0)>0||!e?.frogHopActive)return 0;
  const t=clamp01(e.frogHopPhase||0);
  return t<=.18||t>=.92?0:Math.sin((t-.18)/.74*Math.PI)*.30;
}
export function eliteFrogPose(e){
  if(e?.frogDeath!=null||e?.hp<=0){
    const age=Math.max(0,e?.frogDeath||0);
    return ELITE_FROG_FRAME.death[Math.min(2,Math.floor(age/.13))];
  }
  // One complete pose owns the body, mouth and tongue, including recovery.
  const attackFrame=eliteFrogAttackFrame(e);
  if(attackFrame!=null)return ELITE_FROG_FRAME.attack[attackFrame];
  if((e?.hit||0)>0)return ELITE_FROG_FRAME.hit;
  if(e?.frogHopActive){
    const progress=clamp01(e.frogHopPhase||0);
    return ELITE_FROG_FRAME.walk[Math.min(7,Math.floor(progress*8))];
  }
  return ELITE_FROG_FRAME.idle;
}
function rectFor(frame){
  const col=frame%2,row=Math.floor(frame/2);
  return [col*.5,1-(row+1)/11,.5,1/11];
}
export async function createEliteFrogRenderer(gl,{program,geometry,uniform,render}){
  const url=new URL('./enemies/elite-frog-atlas.webp',import.meta.url),response=await fetch(url);
  if(!response.ok)throw Error(`Elite Frog atlas ${response.status}: ${url.pathname}`);
  const image=new Image(),objectURL=URL.createObjectURL(await response.blob());
  try{image.src=objectURL;await image.decode();}finally{URL.revokeObjectURL(objectURL);}
  if(image.naturalWidth!==ELITE_FROG_ATLAS_WIDTH||image.naturalHeight!==ELITE_FROG_ATLAS_HEIGHT)throw Error('Elite Frog atlas dimensions mismatch');
  const texture=gl.createTexture();
  gl.activeTexture(gl.TEXTURE12);gl.bindTexture(gl.TEXTURE_2D,texture);
  const oldFlip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,oldFlip);
  for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
  for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
  gl.activeTexture(gl.TEXTURE0);

  const p=program(gl,`layout(location=0)in vec3 position;layout(location=2)in vec2 uv;
    uniform mat4 vp;uniform vec3 origin,cameraDirection;uniform float size,facing;
    out vec2 UV;out vec3 world;
    void main(){
      vec3 forward=normalize(cameraDirection),right=normalize(cross(vec3(0,1,0),forward)),up=cross(forward,right);
      // Atlas cells are 2:1. The authored frog body pivot is one third across the cell.
      vec2 local=vec2((position.x+.1666667*facing)*2.,position.y+.474);
      world=origin+(right*local.x+up*local.y)*size;UV=uv;gl_Position=vp*vec4(world,1.);
    }`,
    `in vec2 UV;in vec3 world;uniform sampler2D atlas,canopy;uniform vec4 rect;uniform vec3 player;uniform float flipX,alpha;
    out vec4 color;
    void main(){
      vec2 u=vec2(flipX>.5?1.-UV.x:UV.x,UV.y);u=mix(vec2(.0015),vec2(.9985),u);
      vec4 c=texture(atlas,rect.xy+u*rect.zw);if(c.a<.055)discard;
      vec2 shadowPoint=world.xz-vec2(.65,-.45)*max(world.y,0.);
      float shade=texture(canopy,(shadowPoint+40.)/80.).r;
      c.rgb*=mix(vec3(1.),vec3(.63,.72,.66),shade);
      float fog=smoothstep(16.,34.,length(world.xz-player.xz));c.rgb=mix(c.rgb,vec3(.87,.88,.67),fog);
      c.a*=alpha;color=c;
    }`);
  const g=geometry(gl,[-.5,.5,0,.5,.5,0,.5,-.5,0,-.5,-.5,0],null,[0,1,1,1,1,0,0,0],[0,2,1,0,3,2]);
  gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'atlas'),12);gl.uniform1i(gl.getUniformLocation(p,'canopy'),1);
  const attack=await createEliteFrogAttackRenderer(gl,{program,geometry,uniform,render});
  const stats={calls:0,poses:{},last:null,textureBytes:ELITE_FROG_ATLAS_WIDTH*ELITE_FROG_ATLAS_HEIGHT*4};
  return {stats,draw(e,vp,player,camera=[0,12,15]){
    const attackFrame=eliteFrogAttackFrame(e);
    if(attackFrame!=null){
      stats.calls++;stats.poses.attack=(stats.poses.attack||0)+1;
      stats.last={id:e.id,frame:13+attackFrame,attackFrame,name:'attack',wholeBody:true,facing:eliteFrogAttackFacing(e),size:ELITE_FROG_CELL_WORLD*(e.scale||1),lift:0};
      return attack.draw(e,attackFrame,vp,player,camera);
    }
    const frame=eliteFrogPose(e),facing=eliteFrogFacing(e),lift=eliteFrogLift(e),size=ELITE_FROG_CELL_WORLD*(e.scale||1);
    gl.activeTexture(gl.TEXTURE12);gl.bindTexture(gl.TEXTURE_2D,texture);gl.activeTexture(gl.TEXTURE0);gl.useProgram(p);
    for(const [key,value] of Object.entries({vp,origin:[e.x,.02+lift,e.z],player,cameraDirection:camera,size,facing,flipX:facing<0?1:0,alpha:1,rect:rectFor(frame)}))uniform(gl,p,key,value);
    gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);render(gl,g);gl.disable(gl.BLEND);
    const name=frame===0?'idle':frame===1?'hit':frame<=4?'death':frame<=12?'walk':'attack';
    stats.calls++;stats.poses[name]=(stats.poses[name]||0)+1;stats.last={id:e.id,frame,name,facing,size,lift};
    return {calls:1,triangles:2};
  }};
}
