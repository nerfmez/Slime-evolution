import {EnemyWorld,ENEMY_TYPES} from './enemies.js';

ENEMY_TYPES.thorn.name='Moss Frog';
ENEMY_TYPES.thorn.stride=.82;

const JUMP_CELLS=Object.freeze([0,1,2,3,4,5,6,7]);
const DEATH_CELLS=Object.freeze([8,9,10,11,12]);
const HIT_CELL=9;
const DEATH_FRAME_TIME=.095;
const DEATH_LIFE=DEATH_FRAME_TIME*DEATH_CELLS.length+.035;

function jumpCell(e){
 if((e.walkBlend||0)<.055)return JUMP_CELLS[0];
 const phase=((e.walkPhase||0)%1+1)%1;
 return JUMP_CELLS[Math.min(7,Math.floor(phase*8))];
}
function frameSpec(e){
 if(e.__frogCorpse||e.hp<=0){
  const age=Math.max(0,e.__frogDeathAge||0),cell=DEATH_CELLS[Math.min(4,Math.floor(age/DEATH_FRAME_TIME))];
  return {col:cell%4,row:Math.floor(cell/4),cols:1};
 }
 if(e.hit>0)return {col:HIT_CELL%4,row:Math.floor(HIT_CELL/4),cols:1};
 if((e.__frogAttackPose||0)>0)return {col:1,row:3,cols:3};
 const cell=jumpCell(e);return {col:cell%4,row:Math.floor(cell/4),cols:1};
}

function patchFrogRuntime(){
 const proto=EnemyWorld.prototype;
 if(proto.__mossFrogPatched)return;
 proto.__mossFrogPatched=true;
 const originalReset=proto.reset;
 proto.reset=function(...args){const out=originalReset.apply(this,args);this.__frogCorpses=[];return out;};
 const originalUpdate=proto.update;
 proto.update=function(dt,player,limit,storm){
  this.__frogCorpses=this.__frogCorpses||[];
  if(this.enemies?.some(e=>e.__frogCorpse))this.enemies=this.enemies.filter(e=>!e.__frogCorpse);
  const before=new Map((this.enemies||[]).map(e=>[e.id,{enemy:e,attack:e.attack||0}]));
  const out=originalUpdate.call(this,dt,player,limit,storm),live=new Map((this.enemies||[]).map(e=>[e.id,e]));
  if(dt>0){
   for(const corpse of this.__frogCorpses)corpse.__frogDeathAge=(corpse.__frogDeathAge||0)+dt;
   for(const [id,snapshot] of before){
    const old=snapshot.enemy;if(old.type!=='thorn'||old.isElite)continue;const current=live.get(id);
    if(current){current.__frogAttackPose=Math.max(0,(current.__frogAttackPose||0)-dt);if((current.attack||0)>snapshot.attack+.35)current.__frogAttackPose=.18;}
    else if(old.hp<=0&&!old.__frogCorpseMade){old.__frogCorpseMade=true;this.__frogCorpses.push({...old,__frogCorpse:true,__frogDeathAge:0,__frogAttackPose:0});}
   }
  }
  this.__frogCorpses=this.__frogCorpses.filter(e=>(e.__frogDeathAge||0)<DEATH_LIFE);this.enemies.push(...this.__frogCorpses);return out;
 };
}
patchFrogRuntime();

export function thornSpriteCell(yaw,phase,count=8){return Math.min(7,Math.floor((((phase%1)+1)%1)*8));}

const atlasUrl=new URL('./assets/enemies/frog-moveset.png?v=20260915-dom10',import.meta.url).href;
const sprites=new Map();let layer=null,cleanupTimer=null;
function ensureLayer(){
 if(layer&&layer.isConnected)return layer;
 layer=document.createElement('div');layer.id='moss-frog-layer';Object.assign(layer.style,{position:'fixed',inset:'0',pointerEvents:'none',overflow:'hidden',zIndex:'3'});document.body.appendChild(layer);
 if(!cleanupTimer)cleanupTimer=setInterval(()=>{const now=performance.now();for(const [id,item] of sprites)if(now-item.seen>220){item.el.remove();sprites.delete(id);}},180);
 return layer;
}
function ensureSprite(id){
 let item=sprites.get(id);if(item)return item;const el=document.createElement('div'),img=document.createElement('img');
 Object.assign(el.style,{position:'absolute',overflow:'hidden',pointerEvents:'none',willChange:'transform,left:'0',top:'0'});
 Object.assign(img.style,{position:'absolute',maxWidth:'none',maxHeight:'none',userSelect:'none',pointerEvents:'none'});img.draggable=false;img.src=atlasUrl;el.appendChild(img);ensureLayer().appendChild(el);item={el,img,seen:performance.now()};sprites.set(id,item);return item;
}
function project(vp,x,y,z,w,h){return {x:(vp[0]*x+vp[4]*y+vp[8]*z+vp[12]+1)*w*.5,y:(1-(vp[1]*x+vp[5]*y+vp[9]*z+vp[13]))*h*.5};}

export async function createThornSprite(gl){
 ensureLayer();globalThis.__mossFrogSpriteReady='dom10';
 return {version:'dom10',draw(e,vp,player){
  const canvas=document.getElementById('world'),rect=canvas?.getBoundingClientRect();if(!rect)return {calls:0,triangles:0};
  const item=ensureSprite(e.id),spec=frameSpec(e),scale=e.scale||1;
  const p=project(vp,e.x,.58*scale,e.z,rect.width,rect.height),px=project(vp,e.x+1,.58*scale,e.z,rect.width,rect.height),py=project(vp,e.x,1.58*scale,e.z,rect.width,rect.height);
  const unit=Math.max(16,(Math.hypot(px.x-p.x,px.y-p.y)+Math.hypot(py.x-p.x,py.y-p.y))*.5),cell=Math.max(34,unit*1.62*scale),width=cell*spec.cols;
  Object.assign(item.el.style,{width:width+'px',height:cell+'px',transform:`translate(${p.x-width*.5}px,${p.y-cell*.58}px)`});
  Object.assign(item.img.style,{width:(cell*4)+'px',height:(cell*4)+'px',left:(-spec.col*cell)+'px',top:(-spec.row*cell)+'px'});item.seen=performance.now();
  return {calls:1,triangles:2};
 }};
}
