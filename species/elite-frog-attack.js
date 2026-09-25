import {ATTACK_ART} from './elite-frog-attack-frames.js';
// The only geometry for an attack pose is one complete frog+mouth+tongue image.
export const FROG_CAMERA=[0,12,15];
export function eliteFrogAttackFrame(e){
 if(e.hp<=0||e.frogDeath!=null)return null;
 const age=e.frogEliteTongueAge;
 if(age!=null&&age>=0&&age<ATTACK_ART.duration)return ATTACK_ART.ends.findIndex(end=>age<end);
 return null;
}
export function eliteFrogAttackFacing(e){
 if(e.frogEliteFacing===-1||e.frogEliteFacing===1)return e.frogEliteFacing;
 const x=e.frogEliteAimX??Math.sin(e.yaw||0);
 return Math.abs(x)>.12?(x<0?-1:1):(e.eliteFrogFacing===-1?-1:1);
}
export function eliteFrogAttackLayout(e,frame,camera=FROG_CAMERA){
 const length=Math.hypot(...camera),upY=camera[2]/length,upZ=-camera[1]/length;
 return {frame,rect:ATTACK_ART.frames[frame].rect,pixelSize:ATTACK_ART.pixelWorld*(e.scale||1),facing:eliteFrogAttackFacing(e),right:[1,0,0],up:[0,upY,upZ],pivot:ATTACK_ART.pivot,cell:ATTACK_ART.cell};
}
export async function createEliteFrogAttackRenderer(gl,{program,geometry,uniform,render}){
 const response=await fetch(new URL('./enemies/elite-frog-attack.webp',import.meta.url));
 if(!response.ok)throw Error(`Elite Frog full attack atlas ${response.status}`);
 const image=new Image(),url=URL.createObjectURL(await response.blob());
 try{image.src=url;await image.decode();}finally{URL.revokeObjectURL(url);}
 const scale=ATTACK_ART.textureScale||1;
 if(image.naturalWidth!==ATTACK_ART.width*scale||image.naturalHeight!==ATTACK_ART.height*scale)throw Error('Full Frog attack dimensions mismatch');
 const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE12);gl.bindTexture(gl.TEXTURE_2D,texture);
 const flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);
 for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
 for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
 gl.activeTexture(gl.TEXTURE0);
 const p=program(gl,`layout(location=0)in vec3 position;layout(location=2)in vec2 uv;
 uniform mat4 vp;uniform vec3 origin,right,up;uniform vec2 cell,pivot;uniform float pixelSize,facing;
 out vec2 UV;out vec3 world;
 void main(){
  vec2 local=vec2((position.x*cell.x-pivot.x)*facing,position.y*cell.y-(cell.y-pivot.y))*pixelSize;
  world=origin+right*local.x+up*local.y;UV=uv;gl_Position=vp*vec4(world,1.);
 }`,`in vec2 UV;in vec3 world;uniform sampler2D atlas,canopy;uniform vec4 rect;uniform vec3 player;out vec4 color;
 void main(){
  vec2 u=clamp(UV,vec2(.002,.0052),vec2(.998,.9948));
  vec4 c=texture(atlas,rect.xy+u*rect.zw);if(c.a<.055)discard;
  vec2 shadowPoint=world.xz-vec2(.65,-.45)*max(world.y,0.);
  float shade=texture(canopy,(shadowPoint+40.)/80.).r;
  c.rgb*=mix(vec3(1.),vec3(.63,.72,.66),shade);
  float fog=smoothstep(16.,34.,length(world.xz-player.xz));c.rgb=mix(c.rgb,vec3(.87,.88,.67),fog);color=c;
 }`);
 const mesh=geometry(gl,[0,1,0,1,1,0,1,0,0,0,0,0],null,[0,1,1,1,1,0,0,0],[0,2,1,0,3,2]);
 gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'atlas'),12);gl.uniform1i(gl.getUniformLocation(p,'canopy'),1);
 return {textureBytes:ATTACK_ART.width*ATTACK_ART.height*scale*scale*4,draw(e,frame,vp,player,camera){
  const layout=eliteFrogAttackLayout(e,frame,camera);e.frogSpriteCamera=camera;
  gl.activeTexture(gl.TEXTURE12);gl.bindTexture(gl.TEXTURE_2D,texture);gl.activeTexture(gl.TEXTURE0);gl.useProgram(p);
  const {right,up,pixelSize,facing,cell,pivot,rect}=layout;
  for(const [key,value] of Object.entries({vp,origin:[e.x,.02,e.z],right,up,pixelSize,facing,cell,pivot,rect,player}))uniform(gl,p,key,value);
  gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);render(gl,mesh);gl.disable(gl.BLEND);
  return {calls:1,triangles:2};
 }};
}
