import {createSlimeAA} from './slime-aa.js';
import {createThornSprite} from './thorn-sprite.js';
import {createVegetationDepth} from './vfx/vegetation-depth.js';
import {mountSkillLab} from './skill-lab.js';
import {createBeadRenderer} from './vfx/beads.js';
import {createFireRenderer} from './vfx/fire-renderer.js';
import {FireCombat} from './fire-combat.js';
import {mountFireUI} from './fire-ui.js';
import {createGrassBend,BEND_SIZE} from './grass-bend.js';
import {EnemyWorld,ENEMY_TYPES} from './enemies.js';
import {loadEnemyAsset} from './enemy-assets.js';
import {liquidSlimeGeometry} from './slime.js';
import {treeHeight,ROCKS,wildMeadow,meadowPath,rockBlocked,rockGrassScale,bareGround,pondDistance,mudDistance,DECALS,waterBlocked,SCENERY,clearingAmount,clearingCover,CLEARING} from './terrain.js';
import {I,mul,model,look,ortho} from './math.js';
import {program,geometry,render,uniform,loadTexture} from './gl.js';
import {vs,fs} from './shaders.js';
import {createCanopyPixels,CANOPY_SIZE} from './canopy.js';
import {mountProof} from './proof.js';
const $=id=>document.getElementById(id),canvas=$('world');let gl,prog,slime,grassTexture,treeTexture,pondTexture,tuftTexture,northTexture,clearingTexture,meadowTexture;
const scenery=SCENERY;
const FIELD_LIMIT=33.75; // Godot main.gd PLAYFIELD_LIMIT and slime_player.gd world_limit
const state={thornView:'sprite',thornFrames:16,time:0,paused:false,speed:1,mobs:40,grass:10000,quality:1.2,camera:'game',solo:'all',loop:false,stormAge:6,player:[-2.5,0,1.8],moving:0,yaw:Math.PI,casts:1};
const storm=[1.1,0,-.6],keys=new Set();let input=[0,0],pointer=null,origin=[0,0],fpsFrames=[],frameCounter=0,lastFrame=0,lastStats=0,draws=0,tris=0;
function fail(e){console.error(e);$('error').hidden=false;$('error').textContent='เปิดฉากไม่สำเร็จ: '+e.message;$('status').textContent='เกิดข้อผิดพลาด'}
function mesh(pos,normal,uv,idx){return geometry(gl,pos,normal,uv,idx)}
function plane(size){return mesh([-size,0,-size,size,0,-size,size,0,size,-size,0,size],[0,1,0,0,1,0,0,1,0,0,1,0],[0,0,1,0,1,1,0,1],[0,2,1,0,3,2])}
function funnel(inner=false){let p=[],n=[],u=[],ix=[],sides=64,rows=34;for(let j=0;j<=rows;j++){let h=j/rows;let r=(.13+1.25*Math.pow(h,1.28))*(inner?.59:1);for(let k=0;k<=sides;k++){let a=k/sides*Math.PI*2,rr=r*(1+Math.sin(a*5+h*16)*.035);p.push(Math.cos(a)*rr,h*4.4,Math.sin(a)*rr);n.push(Math.cos(a),0,Math.sin(a));u.push(k/sides,h);if(j<rows&&k<sides){let q=j*(sides+1)+k;ix.push(q,q+1,q+sides+1,q+1,q+sides+2,q+sides+1)}}}return mesh(p,n,u,ix)}
function windRibbon(phase){let p=[],n=[],u=[],ix=[];for(let j=0;j<=100;j++){let t=j/100,h=.08+t*.84,a=t*Math.PI*2*1.65+phase,r=(.13+1.25*Math.pow(h,1.28))*1.24;for(let k=0;k<2;k++){p.push(Math.cos(a)*r,h*4.4+(k-.5)*.08,Math.sin(a)*r);n.push(0,1,0);u.push(t,k)}if(j<100){let q=j*2;ix.push(q,q+1,q+2,q+1,q+3,q+2)}}return mesh(p,n,u,ix)}
const ambientFlowerSites=[];
let seed=139;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
function grassGeometry(){
 const tiles=[];seed=139;
 for(let tx=-5;tx<=5;tx++)for(let tz=-5;tz<=5;tz++){
  let p=[],n=[],u=[];
  for(let i=0;i<710;i++){
   let x=tx*8+(random()-.5)*8,z=tz*8+(random()-.5)*8;
   if(bareGround(x,z)||bareGround(x-.35,z)||bareGround(x+.35,z))continue;
   const soil=clearingAmount(x,z),cover=clearingCover(x,z),sample=Math.sin(x*127.1+z*311.7)*43758.5453;
   if(sample-Math.floor(sample)<cover*(.78+soil*.17))continue;
   let patch=.5+.5*Math.sin(x*.6+Math.sin(z*.45))*Math.cos(z*.5);
   let h=.34+random()*.26+patch*.10,w=h*(.30+random()*.12),lean=(random()-.5)*.12;
   // Low grass at the trunk, returning gradually to the meadow height.
   let trunk=Infinity;for(const [sx,sz,type] of scenery)if(type===0)trunk=Math.min(trunk,Math.hypot(x-sx,z-sz));
   if(rockBlocked(x,z,.08))continue;
   const rockScale=rockGrassScale(x,z);h*=rockScale;w*=.7+.3*rockScale;
   h*=1.-cover*.65;w*=1.-cover*.25;
   const wild=wildMeadow(x,z),path=meadowPath(x,z),drift=.5+.5*Math.sin(x*.64+Math.sin(z*.47)*1.5)*Math.cos(z*.57);h*=1.+wild*(path*(.75+drift*.40)-(1.-path)*.20);
   h*=.42+.58*Math.max(0,Math.min(1,(trunk-.18)/.70));
   for(let [side,t] of [[-1,0],[1,0],[-1,1],[-1,1],[1,0],[1,1]]){p.push(x+side*w+t*lean,t*h,z);n.push(x,t,z);u.push((side+1)/2,1-t);}
  }
  tiles.push({x:tx*8,z:tz*8,mesh:mesh(p,n,u)});
 }
 return tiles;
}
// Static batches animated on the GPU: no per-insect draw calls or timers.
function crystalShardGeometry(){
 const p=[],n=[],u=[],ring=[];
 for(let k=0;k<5;k++){let a=k*Math.PI*2/5;ring.push([Math.cos(a)*.115,Math.sin(a)*.115,0]);}
 function tri(a,b,c){const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]),normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],l=Math.hypot(...normal);for(const v of [a,b,c]){p.push(...v);n.push(...normal.map(x=>x/l));u.push(0,0);}}
 for(let k=0;k<5;k++){tri(ring[k],ring[(k+1)%5],[0,0,.48]);tri(ring[(k+1)%5],ring[k],[0,0,-.27]);}
 return mesh(p,n,u);
}
const grassBend=createGrassBend(),labGrassBend=createGrassBend();let grassBendTexture,crystalShard;
function initGrassBend(){
 grassBendTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,grassBendTexture);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,BEND_SIZE,BEND_SIZE,0,gl.RGBA,gl.UNSIGNED_BYTE,grassBend.pixels);
 for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
 for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
 gl.useProgram(prog);gl.uniform1i(gl.getUniformLocation(prog,'grassBendTex'),4);gl.activeTexture(gl.TEXTURE0);
}
let bendElapsed=0;
function updateGrassBend(dt){
 if(dt<=0)return;
 bendElapsed+=dt;if(bendElapsed<.05)return;
 const pixels=(skillLab.active?labGrassBend:grassBend).update(enemyWorld.enemies,bendElapsed,state.player,combat);bendElapsed=0;
 gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,grassBendTexture);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,BEND_SIZE,BEND_SIZE,gl.RGBA,gl.UNSIGNED_BYTE,pixels);gl.activeTexture(gl.TEXTURE0);
}
function ambientGeometry(){
 const p=[],n=[],u=[],birdsP=[],birdsN=[],birdsU=[];
 const corners=[[-1,-1],[1,-1],[-1,1],[-1,1],[1,-1],[1,1]];
 const sites=[];
 for(const [x,z,type] of scenery)if(type===0)for(let k=0;k<3;k++)sites.push([x+Math.cos(k*2.4)*.9,z+Math.sin(k*2.4)*.7]);
 for(const [wx,wz] of ambientFlowerSites){
  if(Math.abs(wx)<32&&Math.abs(wz)<32&&!bareGround(wx,wz)&&clearingCover(wx,wz)<.5)sites.push([wx,wz]);
 }
 sites.forEach(([x,z],i)=>{for(const [a,b] of corners){p.push(x,.62+wildMeadow(x,z)*.95,z);n.push(a,b,i*.731+1);u.push((a+1)/2,(b+1)/2);}});
 let i=0;
 for(const [x,z,type] of scenery)if(type===0){
  i++;const h=treeHeight(x,z);
  function tri(points,wing=0){for(const [a,b] of points){birdsP.push(x,h*.54,z-h*.54);birdsN.push(a,b,i);birdsU.push(wing,0);}}
  // Compact round silhouette with a small head, needle beak and short tail.
  function oval(cx,cy,rx,ry){for(let k=0;k<14;k++){
   const a=k*Math.PI*2/14,b=(k+1)*Math.PI*2/14;
   tri([[cx,cy],[cx+Math.cos(a)*rx,cy+Math.sin(a)*ry],[cx+Math.cos(b)*rx,cy+Math.sin(b)*ry]]);
  }}
  oval(0,-.03,.44,.46);oval(0,.34,.27,.26);
  tri([[-.045,.53],[.045,.53],[0,.94]]);
  tri([[-.15,-.36],[0,-.66],[.15,-.36]]);
  tri([[-.24,.20],[-.88,-.01],[-.62,-.27]],1);
  tri([[-.24,.20],[-.62,-.27],[-.25,-.19]],1);
  tri([[.24,.20],[.62,-.27],[.88,-.01]],1);
  tri([[.24,.20],[.25,-.19],[.62,-.27]],1);
 }
 const hp=[],hn=[],hu=[];
 function visitor(x,y,z,type,id){for(const [a,b] of corners){hp.push(x,y,z);hn.push(a,b,type*100+id);hu.push((a+1)/2,(b+1)/2);}}
 // Anchored to actual habitats: no screen-space particles.
 for(const d of DECALS.filter(d=>d.art==='pond'||d.art==='north')){
  let count=0;
  for(let k=0;k<60&&count<3;k++){
   const x=d.x+Math.sin(k*2.4)*d.rx*.48,z=d.z+Math.cos(k*2.4)*d.rz*.50;
   if(waterBlocked(x,z,.7))visitor(x,.50,z,1,++count+(d.art==='north'?5:0));
  }
 }
 for(let k=0;k<18;k++){
  const x=13+(k*3.71)%17,z=15+(k*5.13)%16;
  if(wildMeadow(x,z)>.65&&!rockBlocked(x,z,.5))visitor(x,1.9,z,2,k+1);
 }
 for(let k=0;k<36;k++){
  const x=CLEARING.x+Math.sin(k*2.4)*7,z=CLEARING.z+Math.cos(k*1.7)*8;
  if(clearingAmount(x,z)>.6)visitor(x,.18,z,3,k+1);
 }
 return {insects:mesh(p,n,u),birds:mesh(birdsP,birdsN,birdsU),habitats:mesh(hp,hn,hu)};
}
function tileVisible(x,z,r=4.6){
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(const dx of [-r,r])for(const dz of [-r,r])for(const y of [0,1]){
  let px=vp[0]*(x+dx)+vp[4]*y+vp[8]*(z+dz)+vp[12],py=vp[1]*(x+dx)+vp[5]*y+vp[9]*(z+dz)+vp[13];
  minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
 }
 return maxX>=-1&&minX<=1&&maxY>=-1&&minY<=1;
}
function flowerGeometry(){
 const tiles=[];seed=8241;ambientFlowerSites.length=0;
 for(let tx=-4;tx<=4;tx++)for(let tz=-4;tz<=4;tz++){
  const p=[],n=[],u=[],indices=[],shared=new Map(),placed=[];let rootX=0,rootZ=0;
  function vertex(x,y,z,type){const key=[x,y,z,type,rootX,rootZ].join(',');let id=shared.get(key);if(id===undefined){id=p.length/3;shared.set(key,id);p.push(x,y,z);n.push(type,1,0);u.push(rootX,rootZ);}indices.push(id);}
  function disk(x,y,z,rx,ry,type,angle=0){
   for(let k=0;k<5;k++)for(const a of [null,k*Math.PI*2/5,(k+1)*Math.PI*2/5]){
    const dx=a===null?0:Math.cos(a)*rx,dy=a===null?0:Math.sin(a)*ry;
    const xx=dx*Math.cos(angle)-dy*Math.sin(angle),yy=dx*Math.sin(angle)+dy*Math.cos(angle);
    vertex(x+xx,y+yy*.78,z-yy*.63,type);
   }
  }
  for(let c=0;c<340;c++){
   const x=tx*8+(random()-.5)*8,z=tz*8+(random()-.5)*8;
   if(Math.abs(x)>33||Math.abs(z)>33||bareGround(x,z)||waterBlocked(x,z,.08)||rockBlocked(x,z,.22)||clearingCover(x,z)>.35)continue;
   const wild=wildMeadow(x,z),path=meadowPath(x,z);
   if(c>=155&&wild<.05)continue;
   const drift=.5+.5*Math.sin(x*.64+Math.sin(z*.47)*1.5)*Math.cos(z*.57);
   if(random()>.058+wild*path*(.38+.48*drift))continue;
   const spacing=.88-wild*.48;
   if(placed.some(q=>Math.hypot(x-q[0],z-q[1])<spacing))continue;
   placed.push([x,z]);rootX=x;rootZ=z;
   if(placed.length===2)ambientFlowerSites.push([x,z]);
   const h=(.32+random()*.10)*(1+wild*1.50),r=(.061+random()*.020)*(1+wild*.12),lean=(random()-.5)*.18;
   const pick=random(),type=pick<.66?1:pick<.91?2:4;
   for(let segment=0;segment<2;segment++){
    const t=segment/2,t1=(segment+1)/2;
    for(const [side,v] of [[-1,t],[1,t],[-1,t1],[-1,t1],[1,t],[1,t1]])vertex(x+lean*v*v+side*.004,v*h,z,0);
   }
   disk(x+lean*.3,h*.45,z,.026,.010,0,.8);
   for(let k=0;k<5;k++){
    const a=k*Math.PI*2/5+(random()-.5)*.24;
    disk(x+lean+Math.cos(a)*r*.65,h+Math.sin(a)*r*.65*.78,z-Math.sin(a)*r*.65*.63,r*(.46+random()*.15),r*.32,type,a);
   }
   disk(x+lean,h+.003,z-.004,r*.27,r*.27,3);
  }
  if(p.length)tiles.push({x:tx*8,z:tz*8,mesh:mesh(p,n,u,indices)});
 }
 return tiles;
}
// Sparse landmarks leave the central combat area open.

function sceneryGeometry(){
 const p=[],n=[],u=[];
 // Broad weathered planes, softened normals and an asymmetric, grounded profile.
 for(const [id,r] of ROCKS.entries()){
  const form=id%5,sides=[9,11,8,10,12][form],rings=[];
  const profiles=[[.96,1,.85,.43],[.91,1,.70,.24],[.98,1,.87,.52],[.83,1,.68,.29],[.94,1,.77,.36]];
  const heights=[[-.025,.13,.64,.91],[-.025,.20,.76,.94],[-.025,.12,.76,.96],[-.025,.26,.69,.88],[-.025,.17,.72,.97]];
  for(let j=0;j<4;j++){
   const radial=profiles[form][j],height=heights[form][j];const ring=[];
   for(let k=0;k<sides;k++){
    const a=(k+.10*Math.sin(k*1.7+id))*2*Math.PI/sides,warp=.90+.075*Math.sin(k*2.1+id*1.3);
    const dx=Math.cos(a)*r.rx*radial*warp+(j/3)*r.rx*([.15,-.12,.04,.17,-.08][form]),dz=Math.sin(a)*r.rz*radial*warp;
    ring.push([r.x+dx*Math.cos(r.a)-dz*Math.sin(r.a),height*r.h*(1+.12*Math.sin(k*1.7+id)+.07*Math.cos(a+id)),r.z+dx*Math.sin(r.a)+dz*Math.cos(r.a)]);
   }rings.push(ring);
  }
  function tri(a,b,c){
   const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);
   let normal=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
   const len=Math.hypot(...normal);normal=normal.map(v=>v/len);
   for(const q of [a,b,c]){
    const smooth=[(q[0]-r.x)/(r.rx*r.rx),(q[1]+r.h*.3)/(r.h*r.h),(q[2]-r.z)/(r.rz*r.rz)],sl=Math.hypot(...smooth);
    p.push(...q);n.push(...normal.map((v,i)=>v*.38+smooth[i]/sl*.62));u.push(3,id);
   }
  }
  for(let j=0;j<3;j++)for(let k=0;k<sides;k++){
   const next=(k+1)%sides;
   tri(rings[j][k],rings[j+1][k],rings[j][next]);tri(rings[j][next],rings[j+1][k],rings[j+1][next]);
  }
  const top=[r.x+r.rx*.035,r.h,r.z];
  for(let k=0;k<sides;k++)tri(rings[3][k],top,rings[3][(k+1)%sides]);
 }
 return mesh(p,n,u);
}
function treeGeometry(){
 const p=[],n=[],u=[];let treeIndex=0;
 for(const [x,z,type,size=1,width=1,mirror=1,lean=0] of scenery){if(type!==0)continue;
  let h=treeHeight(x,z),w=h*.47*width;
  for(const [side,t] of [[-1,0],[1,0],[-1,1],[-1,1],[1,0],[1,1]]){
   p.push(x+side*w+lean*h*t*t,t*h*.78,z-t*h*.63);n.push(treeIndex,t,1);u.push((side*mirror+1)/2,.973*(1-t));
  }
  treeIndex++;
 }
 return mesh(p,n,u);
}
function wetlandDetails(){
 const p=[],n=[],u=[];seed=7852;
 const groups=[];
 for(const [x,z,type] of scenery){
  if(type!==0){groups.push([x+.7,z+.2],[x-.6,z-.1]);continue;}
  const phase=random()*6.283;
  for(let i=0,count=3+Math.floor(random()*2);i<count;i++){
   const angle=phase+i*2.39996,radius=.48+random()*.42;
   groups.push([x+Math.cos(angle)*radius,z+Math.sin(angle)*radius,.76+random()*.28]);
  }
 }
 groups.push([-27,-19,.85],[-25,-30,.8],[-11,-25,.75],[-10,-15,.9],[-23,-9,.8],[-16,-29,.85],[-2.5,-6],[-3,8],[3,5],[-12,1],[14,3],[4,-12],[22,-15]);
 // Uneven, sparse companions outside the painted fringe, not a ring of reeds.
 for(const d of DECALS.filter(d=>d.art==='pond'||d.art==='north')){
  let placed=[];
  for(let attempt=0;attempt<180&&placed.length<13;attempt++){
   let a=random()*Math.PI*2,r=.70+random()*.23,x=d.x+Math.cos(a)*d.rx*r,z=d.z+Math.sin(a)*d.rz*r;
   if(bareGround(x,z)||waterBlocked(x,z,.45)||placed.some(q=>Math.hypot(q[0]-x,q[1]-z)<1.0))continue;
   placed.push([x,z]);groups.push([x,z,.72+random()*.25]);
  }
 }
 // Loose, staggered stands in the south-east; preserve a low winding passage.
 for(let i=0;i<2200;i++){
  const x=9+random()*24,z=12+random()*21,wild=wildMeadow(x,z),path=meadowPath(x,z);
  const drift=.5+.5*Math.sin(x*.65+z*.24)*Math.cos(z*.57);
  if(random()<wild*path*(.36+.42*(1-drift)))groups.push([x,z,1.35+random()*.65]);
 }
 for(const [x,z,size=1] of groups){if(bareGround(x,z)||waterBlocked(x,z,.22)||rockBlocked(x,z,.10))continue;
  let h=(1.0+random()*.35)*size*.78*rockGrassScale(x,z),w=h*.54,flip=random()<.5;
  // Crop empty texture margins so the painted root actually touches the ground.
  // Six strips allow a curved bend while keeping the root anchored.
  for(let row=0;row<6;row++){
   let lo=row/6,hi=(row+1)/6;
   for(const [side,t] of [[-1,lo],[1,lo],[-1,hi],[-1,hi],[1,lo],[1,hi]]){
    p.push(x+side*w,t*h*.86,z-t*h*.45);n.push(x,t,z);
    u.push(.17+(flip?(1-side)/2:(side+1)/2)*.69,.835-t*.735);
   }
  }
 }
 return mesh(p,n,u);
}
// A foot-sized circle collides with water, trunks, and rocks. Small substeps
// prevent tunnelling even when the simulation-speed control is increased.
const PLAYER_RADIUS=.25;
function canStand(x,z){
 if(Math.abs(x)>FIELD_LIMIT||Math.abs(z)>FIELD_LIMIT||waterBlocked(x,z,PLAYER_RADIUS)||rockBlocked(x,z,PLAYER_RADIUS))return false;
 for(const [sx,sz,type] of scenery){
  if(type!==0)continue;const radius=.31;
  if((x-sx)**2+(z-sz)**2<(radius+PLAYER_RADIUS)**2)return false;
 }
 return true;
}
const treeReactions=scenery.filter(t=>t[2]===0).map(([x,z])=>({x,z,dx:0,dz:0,vx:0,vz:0,contact:false}));
const treeMotion=new Float32Array(treeReactions.length*4);
function touchTrees(x,z,dx,dz){
 const length=Math.hypot(dx,dz);if(length<1e-8)return;
 for(const tree of treeReactions){
  if(Math.hypot(x+dx-tree.x,z+dz-tree.z)>=.31+PLAYER_RADIUS)continue;
  const distance=Math.hypot(tree.x-x,tree.z-z);
  const approach=(dx*(tree.x-x)+dz*(tree.z-z))/(length*Math.max(distance,.001));
  if(!tree.contact&&approach>.05){
   tree.vx+=dx/length*1.1*approach;tree.vz+=dz/length*1.1*approach;
   tree.contact=true;
  }
 }
}
function updateTrees(dt){
 const steps=Math.max(1,Math.ceil(dt/.008)),h=dt/steps;
 for(let i=0;i<treeReactions.length;i++){
  const tree=treeReactions[i];
  if(Math.hypot(state.player[0]-tree.x,state.player[2]-tree.z)>.68)tree.contact=false;
  for(let step=0;step<steps;step++){
   tree.vx+=(-70*tree.dx-7*tree.vx)*h;tree.vz+=(-70*tree.dz-7*tree.vz)*h;
   tree.dx+=tree.vx*h;tree.dz+=tree.vz*h;
  }
  treeMotion[i*4]=tree.dx;treeMotion[i*4+1]=tree.dz;
 }
}
function movePlayer(dx,dz){
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));dx/=steps;dz/=steps;
 for(let i=0;i<steps;i++){
  const x=state.player[0],z=state.player[2];
  if(canStand(x+dx,z+dz)){state.player[0]+=dx;state.player[2]+=dz;}
  else {touchTrees(x,z,dx,dz);if(canStand(x+dx,z)){state.player[0]+=dx;}
  else if(canStand(x,z+dz)){state.player[2]+=dz;}}
 }
}

let ambience;
let ground,grassMesh,flowers,props,wetPlants,treeCards,outer,inner,winds,quad;let enemyWorld=new EnemyWorld(),combat=new FireCombat();let slimeAA,slimeWalkPhase=0,heldSlime={time:0,stretch:0,lean:0},slimePoseTick=-1;
let enemyAssets={},thornSprite,fireVFX,soulVFX,vegetationDepth;
const fireUI=mountFireUI(combat,enemyWorld,()=>{keys.clear();release();lastFrame=0;});
let vp,proofCamera=false,proofOpen=false;
let savedRun=null;
const skillLab=mountSkillLab({
 enter(lab){labGrassBend.reset();savedRun={combat,enemyWorld,state:{...state,player:[...state.player]},jelly:{...jelly}};combat=lab.combat;enemyWorld=lab.world;Object.assign(state,{player:[...lab.player],time:0,paused:false,loop:false,stormAge:6,camera:'game',mobs:4});keys.clear();release();panel(false);lastFrame=0;updateEncounterHUD();},
 exit(){combat=savedRun.combat;enemyWorld=savedRun.enemyWorld;Object.assign(state,savedRun.state);Object.assign(jelly,savedRun.jelly);savedRun=null;keys.clear();release();lastFrame=0;fireUI.sync();updateEncounterHUD();},
 onStep(dt,unused,absolute=false){state.time=absolute?dt:state.time+dt;},onCamera(value){state.camera=value;},capture:captureInfernoFrame
});

function draw(g,kind,m=I(),fade=1,texture=null,outline=0){uniform(gl,prog,'vp',vp);uniform(gl,prog,'model',m);uniform(gl,prog,'kind',kind);uniform(gl,prog,'outline',outline);uniform(gl,prog,'fade',fade);if(texture){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture)}render(gl,g);draws++;tris+=g.count/3}
function drawModel(asset,m,kind=0,textureOverride=null){
 gl.enable(gl.CULL_FACE);
 const texture=textureOverride||asset.tex||null;
 if(kind===8){
  gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.cullFace(gl.FRONT);draw(asset.mesh,kind,m,1,null,.009);
  gl.cullFace(gl.BACK);draw(asset.mesh,kind,m);
  gl.disable(gl.BLEND);
 }else{
  gl.cullFace(gl.FRONT);draw(asset.mesh,kind,m,1,texture,.009);
  gl.cullFace(gl.BACK);draw(asset.mesh,kind,m,1,texture);
 }
 gl.disable(gl.CULL_FACE);
}

function resize(){let d=Math.min(devicePixelRatio||1,state.quality);canvas.width=Math.round(innerWidth*d);canvas.height=Math.round(innerHeight*d);gl.viewport(0,0,canvas.width,canvas.height)}
function camera(){let aspect=canvas.width/canvas.height,h=skillLab.active?(aspect<1?17:11):(aspect<1?18:13)/.90;let target=[0,.267,0],eye=state.camera==='side'?[0,4.267,18]:state.camera==='top'?[0,21.267,.1]:[0,12.267,15];if(!proofCamera){let dx=state.player[0],dz=state.player[2];target[0]+=dx;target[2]+=dz;eye[0]+=dx;eye[2]+=dz;}if(proofCamera){h=6.3;target=[storm[0],2.1,storm[2]];eye=[storm[0],7,storm[2]+12]}vp=mul(ortho(h*aspect,h),look(eye,target));uniform(gl,prog,'viewDirection',eye.map((v,i)=>v-target[i]))}
const jelly={stretch:0,velocity:0,phase:0,lean:0,leanVelocity:0};
function updateJelly(dt,speed){
 // Substeps keep the damped spring stable across frame rates and time scaling.
 const count=Math.max(1,Math.ceil(dt/.008)),h=dt/count;
 jelly.phase+=dt*(4+speed*8);
 const target=speed*(.09+.035*Math.sin(jelly.phase));
 for(let i=0;i<count;i++){
  jelly.velocity+=((target-jelly.stretch)*150-jelly.velocity*10)*h;
  jelly.stretch+=jelly.velocity*h;
  jelly.leanVelocity+=((-speed*.075-jelly.lean)*95-jelly.leanVelocity*8)*h;
  jelly.lean+=jelly.leanVelocity*h;
 }
}
function frame(now){requestAnimationFrame(frame);if(proofOpen){lastFrame=now;return}let raw=lastFrame?(now-lastFrame)/1000:0;lastFrame=now;fpsFrames.push(raw);if(fpsFrames.length>90)fpsFrames.shift();let dt=skillLab.active?skillLab.lab.update(raw):(state.paused||combat.choosing||enemyWorld.hp<=0||enemyWorld.finished)?0:Math.min(raw,.05)*state.speed;state.time+=dt;if(skillLab.active&&skillLab.lab.previewMode)state.time=skillLab.lab.elapsed;state.stormAge+=dt;if(state.loop&&state.stormAge>6)state.stormAge=0;
 let x=input[0]+(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0),z=input[1]+(keys.has('s')||keys.has('ArrowDown')?1:0)-(keys.has('w')||keys.has('ArrowUp')?1:0),len=skillLab.active?0:Math.hypot(x,z);const previousX=state.player[0],previousZ=state.player[2];state.moving=len>.05?1:0;if(len>.05){movePlayer(x/Math.max(1,len)*dt*3,z/Math.max(1,len)*dt*3);state.yaw=Math.atan2(x,z)}
 if(skillLab.active)skillLab.sync();else{combat.update(dt,enemyWorld,state.player);enemyWorld.update(combat.choosing?0:dt,state.player,state.mobs);fireUI.sync();}
 updateGrassBend(dt);
 updateTrees(dt);
 updateJelly(dt,dt>0?Math.min(1,Math.hypot(state.player[0]-previousX,state.player[2]-previousZ)/(dt*3)):0);
 if(dt>0){const distance=Math.hypot(state.player[0]-previousX,state.player[2]-previousZ);if(distance>.00001)slimeWalkPhase=(slimeWalkPhase+dt/.96)%1;else if(slimeWalkPhase>0){const next=slimeWalkPhase+dt/.96;slimeWalkPhase=next>=1?0:next;}}
 renderScene();drawCombatFeedback();
 frameCounter++;if(now-lastStats>500){lastStats=now;let avg=fpsFrames.reduce((a,b)=>a+b,0)/fpsFrames.length;$('stats').textContent=`${Math.round(1/avg)} FPS · ${(avg*1000).toFixed(1)} ms\n${enemyWorld.enemies.length} มอน · ${state.grass.toLocaleString()} หญ้า`;$('stats').dataset.frames=String(frameCounter);$('stats').dataset.triangles=String(Math.round(tris));$('stats').dataset.draws=String(draws);$('stats').dataset.player=JSON.stringify(state.player);$('stats').dataset.casts=String(state.casts);$('stats').dataset.age=state.stormAge.toFixed(2);updateEncounterHUD()} }
function renderScene(){
 vegetationDepth.begin(canvas.width,canvas.height);
 gl.disable(gl.CULL_FACE);
 gl.clearColor(.87,.88,.67,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(prog);uniform(gl,prog,'time',state.time);uniform(gl,prog,'player',state.player);uniform(gl,prog,'treeHits[0]',treeMotion);uniform(gl,prog,'jellyMotion',[jelly.lean,jelly.velocity,jelly.stretch]);camera();const visibleEnemies=proofCamera||state.mobs===0||(skillLab.active&&!skillLab.lab.showTargets)?[]:enemyWorld.enemies.filter(e=>tileVisible(e.x,e.z,1.4));draws=0;tris=0;gl.disable(gl.BLEND);gl.depthMask(true);draw(ground,1);if(!proofCamera)for(const d of DECALS)if(tileVisible(d.x,d.z,Math.max(d.rx,d.rz)))draw(quad,16,model(d.x,.01,d.z,d.rx,1,d.rz),1,({pond:pondTexture,north:northTexture,clearing:clearingTexture})[d.art]);
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);for(const e of visibleEnemies){let {x,z}=e;draw(quad,6,model(x-.24,.012,z+.16,.82,1,.46,-.55),.65);draw(quad,6,model(x,.017,z,.45,1,.33),1.2)}gl.depthMask(true);gl.disable(gl.BLEND);
 if(!proofCamera){draw(props,11);draw(wetPlants,17,I(),1,tuftTexture);draw(treeCards,15,I(),1,treeTexture);}
 if(slime){
  const tick=Math.floor(state.time/(.96/16));if(tick!==slimePoseTick){slimePoseTick=tick;heldSlime={time:tick*(.96/16),stretch:jelly.stretch,lean:jelly.lean};}
  const s=.94,breath=Math.sin(heldSlime.time*2.6)*.008,sx=s*(1-heldSlime.stretch*.24+breath),sz=s*(1+heldSlime.stretch),sy=s*s*s/(sx*sz),yaw=Math.round(state.yaw/(Math.PI/4))*(Math.PI/4);
  uniform(gl,prog,'slimeStepped',0);uniform(gl,prog,'time',heldSlime.time);uniform(gl,prog,'jellyMotion',[heldSlime.lean,0,heldSlime.stretch]);
  const sceneVP=vp;slimeAA.draw(sceneVP,state.player,canvas.width,canvas.height,localVP=>{vp=localVP;drawModel(slime,model(state.player[0],0,state.player[2],sx,sy,sz,yaw),8);});vp=sceneVP;draws++;tris+=2;gl.useProgram(prog);
  uniform(gl,prog,'time',state.time);uniform(gl,prog,'jellyMotion',[jelly.lean,jelly.velocity,jelly.stretch]);
 }
 for(const e of visibleEnemies){
  if(e.type==='thorn'&&!e.isElite&&state.thornView==='sprite'&&state.camera==='game'&&thornSprite&&!proofCamera)continue;
  const asset=enemyAssets[e.assetType||e.type];if(!asset)continue;
  let clip={frames:asset.frames,duration:asset.duration};
  if(e.type==='petal'&&e.flying&&asset.clips?.flight)clip=asset.clips.flight;
  else if(e.isBoss&&asset.clips?.[e.animState])clip=asset.clips[e.animState];
  const phase=e.isBoss&&e.animState!=='walk'?state.time/Math.max(.01,clip.duration):(e.stride?e.walkPhase:e.anim/Math.max(.01,clip.duration));
  const frame=(phase%1)*clip.frames.length;asset.mesh=clip.frames[Math.floor(frame)];
  uniform(gl,prog,'enemyFrameMix',frame-Math.floor(frame));
  uniform(gl,prog,'enemyMotion',[phase*Math.PI*2,e.walkBlend,e.id]);
  uniform(gl,prog,'enemyLift',e.isBoss?.48:e.type==='moss'?.22:e.type==='crystal'?.25:e.flying?.08:.18);
  uniform(gl,prog,'enemyPalette',e.isBoss?4:e.type==='moss'?1:e.type==='crystal'?2:e.type==='petal'?3:0);
  uniform(gl,prog,'enemyElite',e.isElite?1:0);uniform(gl,prog,'enemyBoss',e.isBoss?1:0);uniform(gl,prog,'enemyHit',e.hit>0?1:0);
  const texture=e.isElite&&asset.eliteTex?asset.eliteTex:asset.tex,flightPulse=e.flying?1.05+Math.sin(e.anim*46)*.045:1,scale=(e.scale||1)*flightPulse,y=e.flying?(e.skillWindup>0?.36:.55):.015;
  drawModel(asset,model(e.x,y,e.z,scale,scale,scale,e.yaw),0,texture);
 }
 uniform(gl,prog,'enemyElite',0);uniform(gl,prog,'enemyBoss',0);
 if(state.grass>0){
  vegetationDepth.capture(canvas.width,canvas.height);
  for(const tile of grassMesh)if(tileVisible(tile.x,tile.z)){
   let count=tile.mesh.count;tile.mesh.count=Math.floor(count/6*Math.min(1,state.grass/10000))*6;
   draw(tile.mesh,2,I(),1,grassTexture);tile.mesh.count=count;
  }
  for(const tile of flowers)if(tileVisible(tile.x,tile.z))draw(tile.mesh,9);
  vegetationDepth.restore();gl.useProgram(prog);
 }

 // Draw billboards against solid depth after foliage, without moving their ground anchor.
 if(state.thornView==='sprite'&&state.camera==='game'&&thornSprite&&!proofCamera){
  for(const e of visibleEnemies)if(e.type==='thorn'&&!e.isElite){const n=thornSprite.draw(e,vp,state.player,state.thornFrames);draws+=n.calls;tris+=n.triangles;}
  gl.useProgram(prog);
 }
 if(!proofCamera){
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  for(const e of visibleEnemies)if(e.skillWindup>0&&e.skillRadius>0){const targeted=['moss_pillar_line','crystal_burst','vine_lunge'].includes(e.skillKind),x=targeted?e.skillTargetX:e.x,z=targeted?e.skillTargetZ:e.z;uniform(gl,prog,'enemySkillColor',e.skillColor||[1,.78,.38]);draw(quad,33,model(x,.025,z,e.skillRadius,1,e.skillRadius),Math.min(1,.35+e.skillWindup));}
  for(const fx of enemyWorld.effects)if(tileVisible(fx.x,fx.z,fx.r+.5)){uniform(gl,prog,'enemySkillColor',fx.color||[1,.78,.38]);if(fx.kind==='petal_swoop_trail'){const dx=fx.x1-fx.x0,dz=fx.z1-fx.z0,len=Math.max(.16,Math.hypot(dx,dz)),yaw=Math.atan2(dx,dz);draw(quad,34,model(fx.x,.14,fx.z,.24,1,len*.72,yaw),Math.max(0,Math.min(1,fx.life/.34)));}else draw(quad,31,model(fx.x,.04,fx.z,fx.r,1,fx.r),Math.max(0,Math.min(1,fx.life/.42)));}
  gl.depthMask(true);gl.disable(gl.BLEND);
  for(const b of enemyWorld.bullets){uniform(gl,prog,'enemySkillColor',b.color||[.45,.78,.95]);const scale=b.kind==='seed_volley'?1.65:1;draw(crystalShard,27,model(b.x,b.kind==='seed_volley'?.52:.40,b.z,scale,scale,scale,Math.atan2(b.vx,b.vz)),1);}
  gl.enable(gl.BLEND);gl.depthMask(false);
  uniform(gl,prog,'enemySkillColor',[.45,.78,.95]);for(const e of visibleEnemies)if(e.windup>0)draw(crystalShard,27,model(e.x,.65,e.z,.4+(1-e.windup/.6)*.5,.4+(1-e.windup/.6)*.5,.4+(1-e.windup/.6)*.5,e.yaw),.80);
  gl.depthMask(true);gl.disable(gl.BLEND);uniform(gl,prog,'enemySkillColor',[1,.78,.38]);
 }

 if(!proofCamera)drawFireCombat();
 if(!proofCamera){gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.depthMask(false);draw(ambience.insects,19);draw(ambience.birds,20);draw(ambience.habitats,23);gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);}
 let age=state.stormAge,scale=Math.min(1,age/.5),fade=age<4.8?1:Math.max(0,1-(age-4.8)/.8);if(age<5.6){gl.enable(gl.BLEND);gl.depthMask(false);if(state.solo!=='wind')draw(quad,5,model(storm[0],.04,storm[2],2,1,2),fade*scale);gl.depthMask(true);gl.disable(gl.BLEND);if(state.solo!=='wind'){draw(inner,3,model(storm[0],0,storm[2],scale,scale,scale,state.time*.18),fade);draw(outer,3,model(storm[0],0,storm[2],scale,scale,scale),fade)}gl.enable(gl.BLEND);gl.depthMask(false);if(state.solo!=='fire')winds.forEach(w=>draw(w,4,model(storm[0],0,storm[2],scale,scale,scale),fade));gl.depthMask(true);gl.disable(gl.BLEND)}
 vegetationDepth.present();
}
function captureProofFrame(age,solo='all'){
 const previous={...state,player:[...state.player]};
 try{
  proofCamera=true;Object.assign(state,{time:age,stormAge:age,mobs:0,grass:0,solo});
  canvas.width=480;canvas.height=320;gl.viewport(0,0,480,320);renderScene();
  const shot=document.createElement('canvas');shot.width=480;shot.height=320;
  shot.getContext('2d').drawImage(canvas,0,0);return shot;
 }finally{Object.assign(state,previous);proofCamera=false;resize()}
}
function panel(show){$('panel').hidden=!show;$('settings').setAttribute('aria-expanded',String(show))}$('settings').onclick=()=>panel($('panel').hidden);$('close').onclick=()=>panel(false);
for(let id of ['camera','mobs','grass','quality','speed','solo'])$(id).onchange=e=>{state[id]=['mobs','grass','quality','speed'].includes(id)?Number(e.target.value):e.target.value;if(id==='quality')resize()};$('thorn-frames').onchange=e=>state.thornFrames=Number(e.target.value);$('thorn-view').onchange=e=>state.thornView=e.target.value;$('loop').onchange=e=>state.loop=e.target.checked;
$('pause').onclick=()=>{state.paused=!state.paused;$('pause').textContent=state.paused?'เล่นต่อ':'หยุดภาพ'};$('step').onclick=()=>{if(combat.choosing)return;state.paused=true;$('pause').textContent='เล่นต่อ';state.time+=1/60;state.stormAge+=1/60;combat.update(1/60,enemyWorld,state.player);enemyWorld.update(combat.choosing?0:1/60,state.player,state.mobs);fireUI.sync();updateEncounterHUD()};$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch(e){$('status').textContent='อุปกรณ์นี้ไม่รองรับเต็มจอ'}};
window.addEventListener('keydown',e=>{if(['INPUT','SELECT'].includes(document.activeElement.tagName)||(document.activeElement.tagName==='BUTTON'&&[' ','Enter'].includes(e.key)))return;keys.add(e.key);if(e.key===' ')e.preventDefault();});window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>{keys.clear();release()});
function release(){pointer=null;input=[0,0];$('knob').style.transform='';$('joystick').style.left='';$('joystick').style.top='';$('joystick').style.bottom=''}
canvas.addEventListener('pointerdown',e=>{if(skillLab.active)return;if(e.clientX>innerWidth*.55||pointer!==null)return;pointer=e.pointerId;origin=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);$('joystick').style.left=(origin[0]-52)+'px';$('joystick').style.top=(origin[1]-52)+'px';$('joystick').style.bottom='auto'});canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;let x=e.clientX-origin[0],y=e.clientY-origin[1],len=Math.hypot(x,y),r=Math.min(1,38/Math.max(1,len));input=[x*r/38,y*r/38];$('knob').style.transform=`translate(${x*r}px,${y*r}px)`});for(let event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(e.pointerId===pointer)release()});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fail(Error('ระบบกราฟิกหยุดทำงาน กรุณาเปิดหน้าใหม่'))});
function initCanopyShadow(){
 const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,texture);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,CANOPY_SIZE,CANOPY_SIZE,0,gl.RGBA,gl.UNSIGNED_BYTE,createCanopyPixels());
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.useProgram(prog);gl.uniform1i(gl.getUniformLocation(prog,'canopyTex'),1);gl.activeTexture(gl.TEXTURE0);
}
function updateEncounterHUD(){
 if(skillLab.active){$('status').textContent='ห้องทดสอบไฟ · รอบเล่นเดิมพักไว้';return;}
 const t=Math.max(0,Math.floor(enemyWorld.time)),clock=String(Math.floor(Math.min(t,300)/60)).padStart(2,'0')+':'+String(Math.min(t,300)%60).padStart(2,'0'),boss=enemyWorld.enemies.find(e=>e.isBoss);
 $('status').textContent=enemyWorld.hp<=0?'สไลม์หมดแรง · กดเริ่มใหม่':enemyWorld.finished?'ด่าน 1 ผ่าน · Ancient Bloom ถูกกำจัด':boss?'BOSS · ANCIENT BLOOM COLOSSUS':`ด่าน 1 · ${clock} / 05:00 · บอสใน ${Math.max(0,300-t)} วิ`;
 $('retry').hidden=enemyWorld.hp>0&&!enemyWorld.finished;$('health').max=combat.maxHP;$('health').value=enemyWorld.hp;$('health-text').textContent=`HP ${Math.ceil(enemyWorld.hp)} / ${combat.maxHP} · กำจัด ${enemyWorld.kills}`;
 if(enemyWorld.mode==='boss')$('roster').textContent='Ancient Bloom Colossus';
 else if(enemyWorld.mode==='elites')$('roster').textContent=['thorn','moss','petal','crystal'].map(k=>ENEMY_TYPES[k].eliteName).join(' · ');
 else $('roster').textContent=enemyWorld.unlocked().map(k=>ENEMY_TYPES[k].name).join(' · ')+(enemyWorld.enemies.some(e=>e.isElite&&!e.isBoss)?' · ALPHA ACTIVE':'');
}
function resetEncounter(){grassBend.reset();combat.reset();fireUI.sync();keys.clear();release();enemyWorld.reset($('enemy-mode').value,Number($('start-minute').value));state.stormAge=6;state.paused=false;$('pause').textContent='หยุดภาพ';updateEncounterHUD();}
$('enemy-mode').onchange=resetEncounter;$('start-minute').onchange=resetEncounter;$('restart').onclick=resetEncounter;$('retry').onclick=resetEncounter;
async function start(){gl=canvas.getContext('webgl2',{antialias:false,alpha:false,powerPreference:'high-performance'});if(!gl){const probe=document.createElement('canvas');const legacy=probe.getContext('webgl');throw Error(legacy?'รองรับ WebGL 1 เท่านั้น แต่ฉากนี้ต้องใช้ WebGL 2':'เบราว์เซอร์นี้เปิดทั้ง WebGL 2 และ WebGL 1 ไม่ได้ — ยังเรนเดอร์ฉาก 3D ไม่ได้');}prog=program(gl,vs,fs);vegetationDepth=createVegetationDepth(gl);initCanopyShadow();initGrassBend();crystalShard=crystalShardGeometry();soulVFX=createBeadRenderer(gl);fireVFX=createFireRenderer(gl,await loadTexture(gl,'./assets/vfx/inferno-flame-paint.png'),await loadTexture(gl,'./assets/vfx/inferno-atlas.png'),await loadTexture(gl,'./assets/vfx/inferno-inbetweens.png'),await loadTexture(gl,'./assets/vfx/inferno-inbetweens48.png'),await Promise.all(['sunfall-impact-hd.png','sunfall-flight-hd.png','sunfall-smoke-hd.png'].map(name=>loadTexture(gl,'./assets/vfx/'+name,false))));gl.useProgram(prog);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);ground=plane(60);quad=plane(1);grassMesh=grassGeometry();flowers=flowerGeometry();ambience=ambientGeometry();props=sceneryGeometry();wetPlants=wetlandDetails();treeCards=treeGeometry();outer=funnel();inner=funnel(true);winds=[windRibbon(0),windRibbon(Math.PI)];resize();window.addEventListener('resize',resize);[grassTexture,treeTexture,pondTexture,tuftTexture,northTexture,clearingTexture,meadowTexture]=await Promise.all([loadTexture(gl,'./assets/grass-original.png'),loadTexture(gl,'./assets/tree-reference-b.png'),loadTexture(gl,'./assets/pond-painted.png'),loadTexture(gl,'./assets/grass-painted.png'),loadTexture(gl,'./assets/pond-northern.png'),loadTexture(gl,'./assets/clearing-painted.png'),loadTexture(gl,'./assets/meadow-pigment-cache.png')]);enemyAssets=Object.fromEntries(await Promise.all(Object.keys(ENEMY_TYPES).map(async key=>[key,await loadEnemyAsset(gl,key)])));try{thornSprite=await createThornSprite(gl);}catch(error){state.thornView='model';$('thorn-view').value='model';$('thorn-view').options[0].disabled=true;console.warn(error);}gl.useProgram(prog);const shape=liquidSlimeGeometry();slime={mesh:mesh(shape.pos,shape.normals,shape.uv,shape.indices)};slimeAA=createSlimeAA(gl);gl.useProgram(prog);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,clearingTexture);gl.useProgram(prog);gl.uniform1i(gl.getUniformLocation(prog,'clearingTex'),2);gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,meadowTexture);gl.uniform1i(gl.getUniformLocation(prog,'meadowTex'),3);gl.activeTexture(gl.TEXTURE0);updateEncounterHUD();fireUI.sync();mountProof(captureProofFrame,visible=>{proofOpen=visible;lastFrame=0;fpsFrames=[];release()});requestAnimationFrame(frame)}start().catch(fail);

function drawFireCombat(){
 gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.depthMask(true);
 const souls=soulVFX.draw(combat.souls,vp,state.time,state.player,tileVisible);draws+=souls.calls;tris+=souls.triangles;
 gl.useProgram(prog);
 for(const c of combat.cyclones)if(tileVisible(c.x,c.z,4)){const size=Math.min(1,c.age/.3,c.life/.35),r=c.r/1.4;draw(outer,3,model(c.x,0,c.z,r*size,size*.8,r*size),1);draw(inner,3,model(c.x,0,c.z,r*size,size*.8,r*size),1);}
 const counts=fireVFX.draw(combat,vp,state.time,state.camera==='side'?[0,4,18]:state.camera==='top'?[0,21,.1]:[0,12,15],tileVisible,skillLab.active&&!skillLab.lab.showTargets?[]:enemyWorld.enemies,skillLab.active);draws+=counts.calls;tris+=counts.triangles;gl.useProgram(prog);
 gl.depthMask(true);gl.disable(gl.BLEND);
}

function drawCombatFeedback(){
 const layer=$('combat-feedback'),w=canvas.clientWidth,h=canvas.clientHeight;if(layer.width!==w||layer.height!==h){layer.width=w;layer.height=h;}const ctx=layer.getContext('2d');ctx.clearRect(0,0,w,h);ctx.textAlign='center';ctx.font='bold 18px system-ui';ctx.lineWidth=3;
 const screen=(x,y,z)=>[(vp[0]*x+vp[4]*y+vp[8]*z+vp[12]+1)*w/2,(1-(vp[1]*x+vp[5]*y+vp[9]*z+vp[13]))*h/2];
 for(const n of combat.numbers){const [x,z]=screen(n.x,.75+n.age*.8,n.z);ctx.globalAlpha=Math.min(1,(.75-n.age)*4);ctx.strokeStyle='#5b301c';ctx.fillStyle='#fff0b9';ctx.strokeText(String(n.value),x,z);ctx.fillText(String(n.value),x,z);}ctx.globalAlpha=1;
 for(const e of enemyWorld.enemies)if(e.isElite){const [x,y]=screen(e.x,(e.isBoss?5.7:1.45)*(e.scale||1),e.z),bw=e.isBoss?Math.min(300,w*.58):84,bh=e.isBoss?12:7,ratio=Math.max(0,Math.min(1,e.hp/e.maxHp));ctx.fillStyle='#231c19cc';ctx.fillRect(x-bw/2,y,bw,bh);ctx.fillStyle=e.isBoss?'#d69d48':'#c85f45';ctx.fillRect(x-bw/2+1,y+1,(bw-2)*ratio,bh-2);ctx.font=e.isBoss?'bold 16px system-ui':'bold 11px system-ui';ctx.lineWidth=3;ctx.strokeStyle='#251b17';ctx.fillStyle='#fff2c9';ctx.strokeText(e.name,x,y-5);ctx.fillText(e.name,x,y-5);if(e.skillWindup>0&&e.skillLabel){ctx.font='bold 10px system-ui';ctx.fillStyle='#ffe292';ctx.fillText(e.skillLabel,x,y+bh+13);}}
 if(enemyWorld.noticeTime>0&&enemyWorld.noticeText){ctx.globalAlpha=Math.min(1,enemyWorld.noticeTime*1.5);ctx.font='bold 22px system-ui';ctx.lineWidth=5;ctx.strokeStyle='#3a2418';ctx.fillStyle='#ffe5a1';for(const [i,line] of enemyWorld.noticeText.split('\n').entries()){ctx.strokeText(line,w/2,70+i*28);ctx.fillText(line,w/2,70+i*28);}ctx.globalAlpha=1;}
}

function captureInfernoFrame(age){
 const lab=skillLab.lab,prior={age:lab.elapsed,time:state.time,width:canvas.width,height:canvas.height};
 try{lab.seek(age);state.time=age;renderScene();const shot=document.createElement('canvas');shot.width=prior.width;shot.height=prior.height;shot.getContext('2d').drawImage(canvas,0,0);return shot;}
 finally{lab.seek(prior.age);state.time=prior.time;renderScene();}
}
