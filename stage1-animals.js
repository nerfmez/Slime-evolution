import {program,geometry,render,uniform} from './gl.js';
import {EnemyWorld} from './enemies.js';

export const STAGE1_SPRITE_TYPES=new Set(['thorn','moss','petal','crystal','panda']);
const ATLAS_ROWS={moss:0,petal:1,crystal:2,panda:3};
const RENDER_SCALE={moss:.72,petal:.82,crystal:.86,panda:.92};
const DEATH_LIFE=.58;

function facingFor(e){
 const horizontal=Math.sin(Number.isFinite(e?.yaw)?e.yaw:0);let facing=e?.__animalFacing===-1?-1:1;
 if(horizontal>.12)facing=1;else if(horizontal<-.12)facing=-1;
 if(e)e.__animalFacing=facing;return facing;
}
function frameFor(e){
 if(e.__animalCorpse||e.hp<=0)return 5;
 if(e.hit>0)return 2;
 if((e.skillWindup||0)>0||(e.castPose||0)>0||(e.guardTime||0)>0)return 3+(Math.floor((e.anim||0)*10+(e.id||0))&1);
 return ((Math.floor((((e.walkPhase||0)%1+1)%1)*4))&1);
}
function atlasRect(type,frame){
 const row=ATLAS_ROWS[type]??0;
 return [frame/6,(3-row)/4,1/6,1/4];
}
function patchAnimalDeathPoses(){
 const proto=EnemyWorld.prototype;if(proto.__stage1AnimalSpritePatch)return;proto.__stage1AnimalSpritePatch=true;
 const reset=proto.reset;proto.reset=function(...args){const out=reset.apply(this,args);this.__animalCorpses=[];return out;};
 const update=proto.update;proto.update=function(dt,player,limit,storm){
  this.__animalCorpses=this.__animalCorpses||[];
  if(this.enemies?.some(e=>e.__animalCorpse))this.enemies=this.enemies.filter(e=>!e.__animalCorpse);
  const before=new Map((this.enemies||[]).filter(e=>ATLAS_ROWS[e.type]!==undefined&&!e.isBoss).map(e=>[e.id,e]));
  const out=update.call(this,dt,player,limit,storm);const live=new Set((this.enemies||[]).map(e=>e.id));
  if(dt>0){
   for(const corpse of this.__animalCorpses)corpse.__animalDeathAge=(corpse.__animalDeathAge||0)+dt;
   for(const [id,old] of before)if(!live.has(id)&&old.hp<=0&&!old.__animalCorpseMade){old.__animalCorpseMade=true;this.__animalCorpses.push({...old,__animalCorpse:true,__animalDeathAge:0,hit:0,skillWindup:0,castPose:0,guardTime:0});}
  }
  this.__animalCorpses=this.__animalCorpses.filter(e=>(e.__animalDeathAge||0)<DEATH_LIFE);this.enemies.push(...this.__animalCorpses);return out;
 };
}
patchAnimalDeathPoses();

function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>resolve(image);image.onerror=()=>reject(Error('โหลด Stage 1 animal atlas ไม่สำเร็จ: '+url));image.src=url;});}

export async function createStageOneAnimalSprites(gl){
 const image=await loadImage('./assets/enemies/stage1-animals.svg?v=20260916-a1');
 const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE11);gl.bindTexture(gl.TEXTURE_2D,texture);
 const previousFlip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,previousFlip);
 for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
 for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);gl.activeTexture(gl.TEXTURE0);
 const p=program(gl,
 `layout(location=0)in vec3 position;layout(location=2)in vec2 uv;uniform mat4 vp;uniform vec3 origin;uniform float spriteScale;out vec2 UV;out vec3 world;void main(){vec3 f=normalize(vec3(0,12,15)),right=normalize(cross(vec3(0,1,0),f)),up=cross(f,right);world=origin+right*position.x*spriteScale+up*position.y*spriteScale;world+=f*max(0.,(origin.y-world.y)/f.y);UV=uv;gl_Position=vp*vec4(world,1.);}`,
 `in vec2 UV;in vec3 world;uniform sampler2D atlas,canopy;uniform vec4 rect;uniform vec3 player;uniform float flipX,elite,hitFlash;out vec4 color;void main(){vec2 inset=vec2(.004);vec2 suv=vec2(flipX>.5?1.-UV.x:UV.x,UV.y);vec2 local=mix(inset,vec2(1.)-inset,suv);vec4 c=texture(atlas,rect.xy+local*rect.zw);if(c.a<.14)discard;vec2 shadowPoint=world.xz-vec2(.65,-.45)*max(world.y,0.);float shade=texture(canopy,(shadowPoint+40.)/80.).r;c.rgb*=mix(vec3(1.),vec3(.63,.72,.66),shade);c.rgb=mix(c.rgb,c.rgb*vec3(1.08,.96,.78),elite*.20);c.rgb=mix(c.rgb,vec3(1.,.82,.72),hitFlash*.34);float fog=smoothstep(16.,34.,length(world.xz-player.xz));c.rgb=mix(c.rgb,vec3(.87,.88,.67),fog);color=c;}`);
 const g=geometry(gl,[-.92,.92,0,.92,.92,0,.92,-.92,0,-.92,-.92,0],null,[0,1,1,1,1,0,0,0],[0,2,1,0,3,2]);
 gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'atlas'),11);gl.uniform1i(gl.getUniformLocation(p,'canopy'),1);
 return {draw(e,vp,player){
  if(ATLAS_ROWS[e.type]===undefined)return {calls:0,triangles:0};const frame=frameFor(e),facing=facingFor(e),base=RENDER_SCALE[e.type]||.8,scale=base*(e.scale||1),moving=(e.walkBlend||0)>.05,bounce=moving&&frame<2?Math.sin((e.walkPhase||0)*Math.PI*2)*.025:0;
  gl.useProgram(p);uniform(gl,p,'vp',vp);uniform(gl,p,'origin',[e.x,.02+bounce,e.z]);uniform(gl,p,'player',player);uniform(gl,p,'rect',atlasRect(e.type,frame));uniform(gl,p,'spriteScale',scale);uniform(gl,p,'flipX',facing<0?1:0);uniform(gl,p,'elite',e.isElite?1:0);uniform(gl,p,'hitFlash',e.hit>0?1:0);
  gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);render(gl,g);gl.disable(gl.BLEND);return {calls:1,triangles:2};
 }};
}
