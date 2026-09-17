import {program,geometry,render,uniform} from './gl.js';

const CELL=.25;
const WALK_CELLS=Object.freeze([0,1,2,3,4,5,6,7]);
const FALL_CELLS=Object.freeze([8,9,10,11]);
const CHARGE_CELL=12;
const HIT_CELL=13;
const IDLE_CELL=14;
const PROJECTILE_CELL=15;
const RENDER_SCALE=.82;

function cellRect(cell){
 const col=cell%4,row=Math.floor(cell/4);
 return [col*CELL,(3-row)*CELL,CELL,CELL];
}
function loadImage(url){
 return new Promise((resolve,reject)=>{
  const image=new Image();image.decoding='async';
  image.onload=()=>resolve(image);
  image.onerror=()=>reject(Error('โหลดภาพ Water Calf ไม่สำเร็จ: '+url));
  image.src=url;
 });
}
function facing(e){
 const horizontal=Math.sin(Number.isFinite(e?.yaw)?e.yaw:0);
 let side=e?.__waterFacing===-1?-1:1;
 if(horizontal>.12)side=1;else if(horizontal<-.12)side=-1;
 if(e)e.__waterFacing=side;
 return side;
}
function walkCell(e){
 if(e.hit>0)return HIT_CELL;
 if(e.windup>0||e.skillWindup>0)return CHARGE_CELL;
 if((e.__waterDeathAge||0)>0)return FALL_CELLS[Math.min(FALL_CELLS.length-1,Math.floor(e.__waterDeathAge/.10))];
 if((e.walkBlend||0)<.08)return IDLE_CELL;
 const phase=Number.isFinite(e.walkPhase)?e.walkPhase:(e.anim||0);
 return WALK_CELLS[Math.floor((((phase%1)+1)%1)*WALK_CELLS.length)];
}

export async function createWaterCalfSprite(gl){
 const image=await loadImage('./assets/enemies/water-calf-atlas.webp?v=20260917-water-calf1');
 const texture=gl.createTexture();
 gl.activeTexture(gl.TEXTURE11);gl.bindTexture(gl.TEXTURE_2D,texture);
 const previousFlip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,previousFlip);
 for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.LINEAR);
 for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
 gl.activeTexture(gl.TEXTURE0);
 const p=program(gl,
 `layout(location=0)in vec3 position;layout(location=2)in vec2 uv;uniform mat4 vp;uniform vec3 origin;uniform float spriteScale,spriteWidth,spriteOffsetX;out vec2 UV;out vec3 world;void main(){vec3 f=normalize(vec3(0,12,15)),right=normalize(cross(vec3(0,1,0),f)),up=cross(f,right);world=origin+right*(position.x*spriteWidth+spriteOffsetX)*spriteScale+up*position.y*spriteScale;world+=f*max(0.,(origin.y-world.y)/f.y);UV=uv;gl_Position=vp*vec4(world,1.);}`,
 `in vec2 UV;in vec3 world;uniform sampler2D atlas,canopy;uniform vec4 rect;uniform vec3 player;uniform float flipX,alpha;out vec4 color;void main(){vec2 inset=vec2(.004);vec2 sampleUV=vec2(flipX>.5?1.-UV.x:UV.x,UV.y);vec2 local=mix(inset,vec2(1.)-inset,sampleUV);vec4 c=texture(atlas,rect.xy+local*rect.zw);if(c.a<.12)discard;vec2 shadowPoint=world.xz-vec2(.65,-.45)*max(world.y,0.);float shade=texture(canopy,(shadowPoint+40.)/80.).r;c.rgb*=mix(vec3(1.),vec3(.66,.75,.70),shade);float fog=smoothstep(16.,34.,length(world.xz-player.xz));c.rgb=mix(c.rgb,vec3(.87,.88,.67),fog);c.a*=alpha;color=c;}`);
 const g=geometry(gl,[-.82,.82,0,.82,.82,0,.82,-.82,0,-.82,-.82,0],null,[0,1,1,1,1,0,0,0],[0,2,1,0,3,2]);
 gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'atlas'),11);gl.uniform1i(gl.getUniformLocation(p,'canopy'),1);
 function drawCell(origin,cell,vp,player,scale,flipX=0,width=1,offset=0,alpha=1){
  gl.useProgram(p);uniform(gl,p,'vp',vp);uniform(gl,p,'origin',origin);uniform(gl,p,'player',player);uniform(gl,p,'rect',cellRect(cell));uniform(gl,p,'spriteScale',scale);uniform(gl,p,'spriteWidth',width);uniform(gl,p,'spriteOffsetX',offset);uniform(gl,p,'flipX',flipX);uniform(gl,p,'alpha',alpha);
  gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);render(gl,g);gl.disable(gl.BLEND);return {calls:1,triangles:2};
 }
 return {
  draw(e,vp,player){const side=facing(e);return drawCell([e.x,.02,e.z],walkCell(e),vp,player,(e.scale||1)*RENDER_SCALE,side<0?1:0);},
  drawProjectile(b,vp,player){const side=(b.vx||0)<0?-1:1;return drawCell([b.x,.42,b.z],PROJECTILE_CELL,vp,player,.56,side<0?1:0,1,0,.98);}
 };
}
