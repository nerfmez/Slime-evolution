import {program,geometry,render,uniform} from './gl.js';
import {EnemyWorld,ENEMY_TYPES} from './enemies.js';

ENEMY_TYPES.thorn.name='Moss Frog';
ENEMY_TYPES.thorn.stride=.82;

const JUMP_CELLS=Object.freeze([0,1,2,3,4,5,6,7]);
const DEATH_CELLS=Object.freeze([8,9,10,11,12]);
const HIT_CELL=9;
const ATTACK_RECT=Object.freeze([.25,0,.75,.25]);
const DEATH_FRAME_TIME=.095;
const DEATH_LIFE=DEATH_FRAME_TIME*DEATH_CELLS.length+.035;

function cellRect(cell){
 const col=cell%4,row=Math.floor(cell/4);
 return [col*.25,(3-row)*.25,.25,.25];
}
function jumpCell(e){
 if((e.walkBlend||0)<.055)return JUMP_CELLS[0];
 const phase=((e.walkPhase||0)%1+1)%1;
 return JUMP_CELLS[Math.min(7,Math.floor(phase*8))];
}
function frogRect(e){
 if(e.__frogCorpse||e.hp<=0){
  const age=Math.max(0,e.__frogDeathAge||0);
  return cellRect(DEATH_CELLS[Math.min(4,Math.floor(age/DEATH_FRAME_TIME))]);
 }
 if(e.hit>0)return cellRect(HIT_CELL);
 if((e.__frogAttackPose||0)>0)return ATTACK_RECT;
 return cellRect(jumpCell(e));
}
function frogAspect(e){return !e.__frogCorpse&&e.hp>0&&!(e.hit>0)&&(e.__frogAttackPose||0)>0?3:1;}

function patchFrogRuntime(){
 const proto=EnemyWorld.prototype;
 if(proto.__mossFrogPatched)return;
 proto.__mossFrogPatched=true;
 const originalReset=proto.reset;
 proto.reset=function(...args){
  const out=originalReset.apply(this,args);
  this.__frogCorpses=[];
  return out;
 };
 const originalUpdate=proto.update;
 proto.update=function(dt,player,limit,storm){
  this.__frogCorpses=this.__frogCorpses||[];
  if(this.enemies?.some(e=>e.__frogCorpse))this.enemies=this.enemies.filter(e=>!e.__frogCorpse);
  const before=new Map((this.enemies||[]).map(e=>[e.id,{enemy:e,attack:e.attack||0}]));
  const out=originalUpdate.call(this,dt,player,limit,storm);
  const live=new Map((this.enemies||[]).map(e=>[e.id,e]));
  if(dt>0){
   for(const corpse of this.__frogCorpses)corpse.__frogDeathAge=(corpse.__frogDeathAge||0)+dt;
   for(const [id,snapshot] of before){
    const old=snapshot.enemy;
    if(old.type!=='thorn'||old.isElite)continue;
    const current=live.get(id);
    if(current){
     current.__frogAttackPose=Math.max(0,(current.__frogAttackPose||0)-dt);
     if((current.attack||0)>snapshot.attack+.35)current.__frogAttackPose=.18;
    }else if(old.hp<=0&&!old.__frogCorpseMade){
     old.__frogCorpseMade=true;
     this.__frogCorpses.push({...old,__frogCorpse:true,__frogDeathAge:0,__frogAttackPose:0});
    }
   }
  }
  this.__frogCorpses=this.__frogCorpses.filter(e=>(e.__frogDeathAge||0)<DEATH_LIFE);
  this.enemies.push(...this.__frogCorpses);
  return out;
 };
}
patchFrogRuntime();

export function thornSpriteCell(yaw,phase,count=8){
 return Math.min(7,Math.floor((((phase%1)+1)%1)*8));
}

function loadSpriteImage(url){
 return new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=()=>resolve(image);
  image.onerror=()=>reject(Error('โหลดภาพ Moss Frog PNG ไม่สำเร็จ'));
  image.src=url;
 });
}

export async function createThornSprite(gl){
 const image=await loadSpriteImage('./assets/enemies/frog-moveset.png?v=20260915frog-live7');
 const texture=gl.createTexture();
 gl.activeTexture(gl.TEXTURE10);gl.bindTexture(gl.TEXTURE_2D,texture);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
 for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
 for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
 gl.activeTexture(gl.TEXTURE0);

 const p=program(gl,
 `layout(location=0)in vec3 position;layout(location=2)in vec2 uv;uniform mat4 vp;uniform vec3 origin;uniform float spriteScale,spriteAspect;out vec2 UV;out vec3 world;void main(){vec3 f=normalize(vec3(0,12,15)),right=normalize(cross(vec3(0,1,0),f)),up=cross(f,right);world=origin+right*position.x*spriteScale*spriteAspect+up*position.y*spriteScale;world+=f*max(0.,(origin.y-world.y)/f.y);UV=uv;gl_Position=vp*vec4(world,1.);}`,
 `in vec2 UV;in vec3 world;uniform sampler2D atlas,canopy;uniform vec4 rect;uniform vec3 player;out vec4 color;void main(){vec2 inset=vec2(.004);vec2 local=mix(inset,vec2(1.)-inset,UV);vec4 c=texture(atlas,rect.xy+local*rect.zw);if(c.a<.18)discard;vec2 shadowPoint=world.xz-vec2(.65,-.45)*max(world.y,0.);float shade=texture(canopy,(shadowPoint+40.)/80.).r;c.rgb*=mix(vec3(1.),vec3(.63,.72,.66),shade);float fog=smoothstep(16.,34.,length(world.xz-player.xz));c.rgb=mix(c.rgb,vec3(.87,.88,.67),fog);color=c;}`);
 const g=geometry(gl,[-.82,.82,0,.82,.82,0,.82,-.82,0,-.82,-.82,0],null,[0,1,1,1,1,0,0,0],[0,2,1,0,3,2]);
 gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'atlas'),10);gl.uniform1i(gl.getUniformLocation(p,'canopy'),1);
 globalThis.__mossFrogSpriteReady='frog-live7';
 return {version:'frog-live7',draw(e,vp,player){
  gl.useProgram(p);uniform(gl,p,'vp',vp);uniform(gl,p,'origin',[e.x,.02,e.z]);uniform(gl,p,'player',player);uniform(gl,p,'rect',frogRect(e));uniform(gl,p,'spriteScale',(e.scale||1)*1.02);uniform(gl,p,'spriteAspect',frogAspect(e));
  gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);render(gl,g);gl.disable(gl.BLEND);return {calls:1,triangles:2};
 }};
}
