import {program,geometry,render,uniform} from './gl.js';

// Safe frog pass: only the normal Thorn visual is replaced. Elite Thorn keeps its authored model path.
const JUMP=[0,1,2,3,4,5,6,7];
const DEATH=[8,9,10,11,12];
const HIT=9; // approved death frame 2
const ATTACK=[.25,0,.75,.25]; // tongue attack strip on atlas bottom row
const DEATH_FRAME=.095;

function cellRect(cell){
 const col=cell%4,row=Math.floor(cell/4);
 return [col*.25,(3-row)*.25,.25,.25];
}
function frogRect(e){
 if(e.__frogCorpse||e.hp<=0){
  const age=Math.max(0,e.__frogDeathAge||0);
  return cellRect(DEATH[Math.min(4,Math.floor(age/DEATH_FRAME))]);
 }
 if(e.hit>0)return cellRect(HIT);
 if((e.__frogAttackPose||0)>0)return ATTACK;
 const phase=((e.walkPhase||0)%1+1)%1;
 return cellRect(JUMP[Math.min(7,Math.floor(phase*8))]);
}

export function thornSpriteCell(yaw,phase,count=8){
 return Math.min(7,Math.floor((((phase%1)+1)%1)*8));
}

export async function createThornSprite(gl){
 const response=await fetch('./assets/enemies/frog-moveset.webp');
 if(!response.ok)throw Error(`โหลดภาพ Moss Frog ไม่สำเร็จ (${response.status})`);
 const bitmap=await createImageBitmap(await response.blob());
 const texture=gl.createTexture();
 gl.activeTexture(gl.TEXTURE10);gl.bindTexture(gl.TEXTURE_2D,texture);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);bitmap.close();
 for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
 for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
 gl.activeTexture(gl.TEXTURE0);
 const p=program(gl,
 `layout(location=0)in vec3 position;layout(location=2)in vec2 uv;uniform mat4 vp;uniform vec3 origin;uniform float spriteScale;out vec2 UV;out vec3 world;void main(){vec3 f=normalize(vec3(0,12,15)),right=normalize(cross(vec3(0,1,0),f)),up=cross(f,right);world=origin+right*position.x*spriteScale+up*position.y*spriteScale;world+=f*max(0.,(origin.y-world.y)/f.y);UV=uv;gl_Position=vp*vec4(world,1.);}`,
 `in vec2 UV;in vec3 world;uniform sampler2D atlas,canopy;uniform vec4 rect;uniform vec3 player;out vec4 color;void main(){vec2 local=mix(vec2(.004),vec2(.996),UV);vec4 c=texture(atlas,rect.xy+local*rect.zw);if(c.a<.18)discard;vec2 shadowPoint=world.xz-vec2(.65,-.45)*max(world.y,0.);float shade=texture(canopy,(shadowPoint+40.)/80.).r;c.rgb*=mix(vec3(1.),vec3(.63,.72,.66),shade);float fog=smoothstep(16.,34.,length(world.xz-player.xz));c.rgb=mix(c.rgb,vec3(.87,.88,.67),fog);color=c;}`);
 const g=geometry(gl,[-.82,.82,0,.82,.82,0,.82,-.82,0,-.82,-.82,0],null,[0,1,1,1,1,0,0,0],[0,2,1,0,3,2]);
 gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'atlas'),10);gl.uniform1i(gl.getUniformLocation(p,'canopy'),1);
 return {draw(e,vp,player){
  gl.useProgram(p);uniform(gl,p,'vp',vp);uniform(gl,p,'origin',[e.x,.02,e.z]);uniform(gl,p,'player',player);uniform(gl,p,'rect',frogRect(e));uniform(gl,p,'spriteScale',(e.scale||1)*1.02);
  gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);render(gl,g);gl.disable(gl.BLEND);return {calls:1,triangles:2};
 }};
}
