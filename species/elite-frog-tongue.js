import {eliteFrogTongueState,eliteFrogTongueBasis} from './elite-frog-combat.js';
import {TONGUE_ART} from './elite-frog-tongue-frames.js';
// Every visible tongue/poison pixel comes from the supplied video atlas.
// This shader only places and lights the image, exactly like the Frog body.
export async function createEliteFrogTongueRenderer(gl,{program,geometry,uniform,render}){
 const url=new URL('./enemies/elite-frog-tongue.webp',import.meta.url),response=await fetch(url);
 if(!response.ok)throw Error(`Elite Frog tongue atlas ${response.status}`);
 const image=new Image(),objectURL=URL.createObjectURL(await response.blob());
 try{image.src=objectURL;await image.decode();}finally{URL.revokeObjectURL(objectURL);}
 if(image.naturalWidth!==TONGUE_ART.width||image.naturalHeight!==TONGUE_ART.height)throw Error('Elite Frog tongue atlas dimensions mismatch');
 const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE12);gl.bindTexture(gl.TEXTURE_2D,texture);
 const flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);
 for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
 for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
 gl.activeTexture(gl.TEXTURE0);
 const p=program(gl,`layout(location=0)in vec3 position;layout(location=2)in vec2 uv;
 uniform mat4 vp;uniform vec3 origin;uniform vec3 forward,up;uniform float pixelSize;
 out vec2 UV;out vec3 world;
 void main(){
  vec2 local=vec2(position.x*768.-8.,position.y*288.-88.)*pixelSize;
  world=origin+forward*local.x+up*local.y;
  UV=uv;gl_Position=vp*vec4(world,1.);
 }`, `in vec2 UV;in vec3 world;uniform sampler2D atlas,canopy;uniform vec4 rect;uniform vec3 player;out vec4 color;
 void main(){
  vec2 u=clamp(UV,vec2(.0015,.004),vec2(.9985,.996));
  vec4 c=texture(atlas,rect.xy+u*rect.zw);if(c.a<.035)discard;
  vec2 shadowPoint=world.xz-vec2(.65,-.45)*max(world.y,0.);
  float shade=texture(canopy,(shadowPoint+40.)/80.).r;
  c.rgb*=mix(vec3(1.),vec3(.63,.72,.66),shade);
  float fog=smoothstep(16.,34.,length(world.xz-player.xz));c.rgb=mix(c.rgb,vec3(.87,.88,.67),fog);
  color=c;
 }`);
 const mesh=geometry(gl,[0,1,0,1,1,0,1,0,0,0,0,0],null,[0,1,1,1,1,0,0,0],[0,2,1,0,3,2]);
 gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'atlas'),12);gl.uniform1i(gl.getUniformLocation(p,'canopy'),1);
 return {draw(e,vp,player){
  const state=eliteFrogTongueState(e);if(!state||state.scale<=0)return {calls:0,triangles:0};
  const basis=eliteFrogTongueBasis(e,state.angle);
  gl.activeTexture(gl.TEXTURE12);gl.bindTexture(gl.TEXTURE_2D,texture);gl.activeTexture(gl.TEXTURE0);gl.useProgram(p);
  for(const [key,value] of Object.entries({vp,origin:[e.x,.90*(e.scale||1),e.z],forward:basis.forward,up:basis.up,pixelSize:TONGUE_ART.pixelWorld*state.scale,rect:state.rect,player}))uniform(gl,p,key,value);
  gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);render(gl,mesh);gl.depthMask(true);gl.disable(gl.BLEND);
  return {calls:1,triangles:2};
 }};
}
