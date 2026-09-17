import {program,geometry,render,uniform} from './gl.js';
import {EnemyWorld} from './enemies.js';

const ATLAS_URL='./assets/enemies/water-calf-atlas.webp?v=20260917-exact1';
const DEATH_FRAMES=[9,10,11,12];
const DEATH_FRAME_TIME=.105;
const DEATH_LIFE=DEATH_FRAME_TIME*DEATH_FRAMES.length+.08;

function patchWaterCalfDeathPoses(){
 const proto=EnemyWorld.prototype;if(proto.__waterCalfExactSpritePatch)return;proto.__waterCalfExactSpritePatch=true;
 const reset=proto.reset;proto.reset=function(...args){const out=reset.apply(this,args);this.__waterCalfCorpses=[];return out;};
 const update=proto.update;proto.update=function(dt,player,limit,storm){
  this.__waterCalfCorpses=this.__waterCalfCorpses||[];
  if(this.enemies?.some(e=>e.__waterCalfCorpse))this.enemies=this.enemies.filter(e=>!e.__waterCalfCorpse);
  const before=new Map((this.enemies||[]).filter(e=>e.type==='crystal'&&!e.isBoss).map(e=>[e.id,e]));
  const out=update.call(this,dt,player,limit,storm),live=new Set((this.enemies||[]).map(e=>e.id));
  if(dt>0){
   for(const corpse of this.__waterCalfCorpses)corpse.__animalDeathAge=(corpse.__animalDeathAge||0)+dt;
   for(const [id,old] of before)if(!live.has(id)&&old.hp<=0&&!old.__waterCalfCorpseMade){old.__waterCalfCorpseMade=true;this.__waterCalfCorpses.push({...old,__animalCorpse:true,__waterCalfCorpse:true,__animalDeathAge:0,hit:0,skillWindup:0,castPose:0});}
  }
  this.__waterCalfCorpses=this.__waterCalfCorpses.filter(e=>(e.__animalDeathAge||0)<DEATH_LIFE);this.enemies.push(...this.__waterCalfCorpses);return out;
 };
}
patchWaterCalfDeathPoses();

function loadImage(url){return new Promise((resolve,reject)=>{const image=new Image();image.decoding='async';image.onload=()=>resolve(image);image.onerror=()=>reject(Error('โหลดภาพ Water Calf ไม่สำเร็จ: '+url));image.src=url;});}
function facingFor(e){const h=Math.sin(Number.isFinite(e?.yaw)?e.yaw:0);let f=e?.__waterCalfFacing===-1?-1:1;if(h>.12)f=1;else if(h<-.12)f=-1;if(e)e.__waterCalfFacing=f;return f;}
function frameFor(e){
 if(e.__animalCorpse||e.hp<=0){const age=Math.max(0,e.__animalDeathAge||0);return DEATH_FRAMES[Math.min(DEATH_FRAMES.length-1,Math.floor(age/DEATH_FRAME_TIME))];}
 if(e.hit>0)return 8;
 if((e.skillWindup||0)>0||(e.castPose||0)>0)return 13;
 if((e.walkBlend||0)>.04)return Math.min(7,Math.floor((((e.walkPhase||0)%1+1)%1)*8));
 return 0;
}
function rectFor(frame){const col=frame%4,row=Math.floor(frame/4);return [col/4,(3-row)/4,1/4,1/4];}

export async function createWaterCalfSprite(gl){
 const image=await loadImage(ATLAS_URL),texture=gl.createTexture();
 gl.activeTexture(gl.TEXTURE12);gl.bindTexture(gl.TEXTURE_2D,texture);
 const flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);
 for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
 for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);gl.activeTexture(gl.TEXTURE0);
 const p=program(gl,
  `layout(location=0)in vec3 position;layout(location=2)in vec2 uv;uniform mat4 vp;uniform vec3 origin;uniform vec2 spriteSize;out vec2 UV;out vec3 world;void main(){vec3 f=normalize(vec3(0,12,15)),right=normalize(cross(vec3(0,1,0),f)),up=cross(f,right);world=origin+right*position.x*spriteSize.x+up*position.y*spriteSize.y;world+=f*max(0.,(origin.y-world.y)/f.y);UV=uv;gl_Position=vp*vec4(world,1.);}`,
  `in vec2 UV;in vec3 world;uniform sampler2D atlas,canopy;uniform vec4 rect;uniform vec3 player;uniform float flipX,fade,hitFlash;out vec4 color;void main(){vec2 inset=vec2(.004);vec2 suv=vec2(flipX>.5?1.-UV.x:UV.x,UV.y);vec2 local=mix(inset,vec2(1.)-inset,suv);vec4 c=texture(atlas,rect.xy+local*rect.zw);if(c.a<.08)discard;vec2 sp=world.xz-vec2(.65,-.45)*max(world.y,0.);float shade=texture(canopy,(sp+40.)/80.).r;c.rgb*=mix(vec3(1.),vec3(.66,.74,.69),shade);c.rgb=mix(c.rgb,vec3(1.,.84,.78),hitFlash*.22);float fog=smoothstep(16.,34.,length(world.xz-player.xz));c.rgb=mix(c.rgb,vec3(.87,.88,.67),fog);color=vec4(c.rgb,c.a*fade);}`);
 const g=geometry(gl,[-1,1,0,1,1,0,1,-1,0,-1,-1,0],null,[0,1,1,1,1,0,0,0],[0,2,1,0,3,2]);
 gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'atlas'),12);gl.uniform1i(gl.getUniformLocation(p,'canopy'),1);
 function drawFrame(frame,origin,size,vp,player,{flipX=0,fade=1,hitFlash=0}={}){
  gl.useProgram(p);uniform(gl,p,'vp',vp);uniform(gl,p,'origin',origin);uniform(gl,p,'spriteSize',size);uniform(gl,p,'player',player);uniform(gl,p,'rect',rectFor(frame));uniform(gl,p,'flipX',flipX);uniform(gl,p,'fade',fade);uniform(gl,p,'hitFlash',hitFlash);
  gl.activeTexture(gl.TEXTURE12);gl.bindTexture(gl.TEXTURE_2D,texture);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);render(gl,g);gl.disable(gl.BLEND);gl.activeTexture(gl.TEXTURE0);return {calls:1,triangles:2};
 }
 return {
  draw(e,vp,player){const frame=frameFor(e),facing=facingFor(e),scale=.98*(e.scale||1),bounce=(e.walkBlend||0)>.04&&frame<8?Math.sin((e.walkPhase||0)*Math.PI*2)*.025:0;return drawFrame(frame,[e.x,.05+bounce,e.z],[scale,scale],vp,player,{flipX:facing<0?1:0,hitFlash:+(e.hit>0)});},
  drawShot(b,vp,player){const flipX=(b.vx||0)<0?1:0;return drawFrame(14,[b.x,.28,b.z],[.34,.34],vp,player,{flipX});},
  drawSplash(fx,vp,player){const fade=Math.max(0,Math.min(1,(fx.life||0)/.28));return drawFrame(15,[fx.x,.08,fx.z],[.64,.64],vp,player,{fade});}
 };
}
