import {program,geometry,render,uniform} from './gl.js';
import {EnemyWorld} from './enemies.js';

export const STAGE1_SPRITE_TYPES=new Set(['thorn','moss','petal','crystal','panda']);
const ATLAS_ROWS={moss:0,petal:1,panda:3};
const RENDER_SCALE={moss:.72,petal:.82,panda:.92};
const DEATH_LIFE=.58;
const CELL=128;

function facingFor(e){
 const horizontal=Math.sin(Number.isFinite(e?.yaw)?e.yaw:0);let facing=e?.__animalFacing===-1?-1:1;
 if(horizontal>.12)facing=1;else if(horizontal<-.12)facing=-1;
 if(e)e.__animalFacing=facing;return facing;
}
function frameFor(e){
 if(e.__animalCorpse||e.hp<=0)return 5;
 if(e.hit>0)return 2;
 if((e.skillWindup||0)>0||(e.castPose||0)>0||(e.guardTime||0)>0){const t=(e.skillWindup||e.castPose||e.guardTime||0)*13;return 3+(Math.floor(t)&1);}
 return Math.floor((((e.walkPhase||0)%1+1)%1)*4)&1;
}
function atlasRect(type,frame){const row=ATLAS_ROWS[type]??0;return [frame/6,(3-row)/4,1/6,1/4];}

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

function makeAtlas(){
 const canvas=document.createElement('canvas');canvas.width=CELL*6;canvas.height=CELL*4;const c=canvas.getContext('2d');c.lineJoin='round';c.lineCap='round';
 const ink='#303630',shadow='rgba(64,54,42,.18)';
 function E(x,y,rx,ry,fill,stroke=ink,w=2.5){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
 function P(points,fill,stroke=ink,w=2.2){c.beginPath();c.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)c.lineTo(points[i][0],points[i][1]);c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
 function L(points,stroke=ink,w=2.3){c.beginPath();c.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)c.lineTo(points[i][0],points[i][1]);c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}
 function eye(x,y){E(x,y,4.5,4.5,'#202723',null);E(x+1.4,y-1.6,1.35,1.35,'rgba(255,255,255,.9)',null);}
 function ground(x,y,rx=39){E(x,y,rx,5,shadow,null);}
 function bolt(x,y,s=1){P([[x,y],[x-7*s,y+15*s],[x+1*s,y+15*s],[x-3*s,y+31*s],[x+12*s,y+10*s],[x+4*s,y+10*s]],'#f6d33d',ink,1.7);}
 function drop(x,y,s=1){c.beginPath();c.moveTo(x,y-12*s);c.bezierCurveTo(x-12*s,y+3*s,x-9*s,y+13*s,x,y+14*s);c.bezierCurveTo(x+9*s,y+13*s,x+12*s,y+3*s,x,y-12*s);c.fillStyle='#55bdeb';c.fill();c.strokeStyle=ink;c.lineWidth=1.8;c.stroke();}
 function cell(frame,row,draw){c.save();c.translate(frame*CELL,row*CELL);draw(frame);c.restore();}
 function hedge(f){let x=62,y=76;if(f===1)y-=3;if(f===2)y+=7;ground(x,106);if(f===5){E(x,76,31,31,'#5d4b3d');for(let i=0;i<10;i++){const a=i*Math.PI*2/10;L([[x+Math.cos(a)*27,y-2+Math.sin(a)*24],[x+Math.cos(a)*39,y-2+Math.sin(a)*35]],i%2?'#927049':'#5d4b3d',4);}L([[x-7,77],[x-1,77]],ink,2.2);return;}
  const spikes=[];for(let i=0;i<10;i++){const a=Math.PI*.85+i*.19;const bx=x-8+Math.cos(a)*34,by=y-8+Math.sin(a)*28;spikes.push([[bx-4,by+3],[x-8+Math.cos(a)*48,y-8+Math.sin(a)*42],[bx+5,by-2]]);}for(const p of spikes)P(p,'#7f6048');
  E(x,y,31,24,'#dfb373');E(x+19,y,20,18,'#f1d29c');E(x-17,y+23,10,5,'#87674f');E(x+11,y+23,10,5,'#87674f');eye(x+28,y-4);L([[x+37,y+7],[x+45,y+5]],ink,2);
  for(const [sx,sy] of [[x-22,y-30],[x,y-37],[x+20,y-31]])P([[sx-5,sy+8],[sx,sy-8],[sx+3,sy+2],[sx+8,sy-7],[sx+6,sy+9]],'#f6d43e',ink,1.6);
  if(f===2)L([[x+24,y-5],[x+32,y-2]],ink,3);if(f===3)bolt(x+45,y-38,.65);if(f===4){bolt(x+48,y-34,.8);bolt(x-30,y-37,-.55);}
 }
 function turtle(f){let x=60,y=77;if(f===1)x+=3;if(f===2)y+=6;ground(x,108,41);if(f===5){E(x,76,34,23,'#71934f');L([[x+22,82],[x+38,91]],ink,3);return;}
  E(x-2,y,36,27,'#71944f');E(x-2,y,29,21,'#8ead60','#506a43',2);L([[x-25,y],[x+22,y]],'#506a43',1.7);L([[x-11,y-20],[x-8,y+20]],'#506a43',1.7);L([[x+8,y-20],[x+11,y+19]],'#506a43',1.7);E(x-25,y+25,12,6,'#afc47a');E(x+11,y+25,12,6,'#afc47a');E(x+34,y+4,16,13,'#dce2a8');eye(x+40,y);P([[x-8,y-27],[x,y-40],[x+9,y-27],[x+2,y-21]],'#6e994f',ink,1.8);
  if(f===2)L([[x+37,y-1],[x+44,y+2]],ink,3);if(f===3||f===4){c.strokeStyle=f===3?'rgba(109,194,91,.75)':'rgba(211,239,166,.9)';c.lineWidth=f===3?4:5;c.beginPath();c.ellipse(x,y,45,34,0,0,Math.PI*2);c.stroke();if(f===4){c.strokeStyle='rgba(91,148,74,.85)';c.lineWidth=2;c.beginPath();c.ellipse(x,y,55,41,0,0,Math.PI*2);c.stroke();}}
 }
 function panda(f){let x=62,y=78;if(f===1){x+=2;y-=2}if(f===2)y+=6;ground(x,109,42);if(f===5){E(x,81,32,17,'#eadfbe');E(x-20,70,10,10,'#3b403c');E(x+20,70,10,10,'#3b403c');L([[x-7,83],[x-1,83]],ink,2.3);return;}
  E(x-20,y-26,10,10,'#3c413d');E(x+20,y-26,10,10,'#3c413d');E(x,y,34,29,'#eee2c3');E(x-14,y-5,11,14,'#424743');E(x+14,y-5,11,14,'#424743');eye(x-13,y-5);eye(x+13,y-5);E(x,y+9,6,4,'#302f2c');E(x-30,y+25,14,8,'#424743');E(x+30,y+25,14,8,'#424743');P([[x,y-28],[x+7,y-39],[x+16,y-29],[x+7,y-23]],'#6e914f',ink,1.7);
  if(f===2){L([[x-17,y-7],[x-10,y-4]],ink,3);L([[x+10,y-4],[x+17,y-7]],ink,3);}if(f===3){c.strokeStyle='rgba(148,133,101,.8)';c.lineWidth=3;c.beginPath();c.arc(x-47,y+5,18,-1.2,1.2);c.stroke();}if(f===4){c.strokeStyle='rgba(150,133,100,.8)';c.lineWidth=4;c.beginPath();c.ellipse(x,y,41,35,0,0,Math.PI*2);c.stroke();}
 }
 for(let f=0;f<6;f++){cell(f,0,hedge);cell(f,1,turtle);cell(f,3,panda);}return canvas;
}

export async function createStageOneAnimalSprites(gl){
 const image=makeAtlas();
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
