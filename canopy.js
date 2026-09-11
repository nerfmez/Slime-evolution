import {treeHeight,SCENERY,DECALS,waterBlocked,ROCKS,rockDistance} from './terrain.js';
export const CANOPY_SIZE=512;
const ponds=DECALS.filter(d=>d.art==='pond'||d.art==='north');
const north=DECALS.find(d=>d.art==='north');
const trees=SCENERY.filter(t=>t[2]===0).map(([x,z])=>({x,z,h:treeHeight(x,z)}));
function smooth(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
// Static world-space shade: soft crown, small foliage gaps and a darker contact.
// Generated once from the actual tree positions; RGBA works on all WebGL2 devices.
export function createCanopyPixels(){
 const pixels=new Uint8Array(CANOPY_SIZE*CANOPY_SIZE*4);
 for(let row=0;row<CANOPY_SIZE;row++)for(let col=0;col<CANOPY_SIZE;col++){
  const x=(col+.5)/CANOPY_SIZE*80-40,z=(row+.5)/CANOPY_SIZE*80-40;
  let shade=0;
  for(const t of trees){
   if(Math.abs(x-t.x)>2.9||Math.abs(z-t.z)>2.5)continue;
   const qx=(x-t.x+.65)/(t.h*.46),qz=(z-t.z-.45)/(t.h*.34);
   const edge=qx*qx+qz*qz+.075*Math.sin(x*5+z*4)*Math.cos(z*5-x*2);
   const canopy=1-smooth(.25,1.25,edge);
   const gaps=.87+.10*Math.sin(x*9+z*3)*Math.sin(x*4-z*8);
   const root=(1-smooth(.015,.34,(x-t.x)**2+(z-t.z)**2))*.94;
   shade=Math.max(shade,canopy*gaps,root);
  }
  const i=(row*CANOPY_SIZE+col)*4;pixels[i]=Math.round(shade*255);
  // Reuse the green channel for the northern shoreline, matching collision data.
  pixels[i+1]=north&&Math.abs(x-north.x)<north.rx&&Math.abs(z-north.z)<north.rz&&waterBlocked(x,z)?255:0;
  // Interior-only water mask: two falloff bands keep the shore completely still.
  let ripple=0;
  if(ponds.some(d=>Math.abs(x-d.x)<d.rx&&Math.abs(z-d.z)<d.rz)&&waterBlocked(x,z)){
   for(const radius of [.28,.56]){
    if(![[radius,0],[-radius,0],[0,radius],[0,-radius]].every(([dx,dz])=>waterBlocked(x+dx,z+dz)))break;
    ripple+=.5;
   }
  }
  pixels[i+2]=Math.round(ripple*255);
  // Only model stones cast here. Shoreline artwork already contains its own
  // lighting and shadow; applying this field there would recolour the stones.
  let stoneShade=0;
  for(const r of ROCKS){
   if(Math.abs(x-r.x)>r.rx+.55||Math.abs(z-r.z)>r.rz+.45)continue;
   // Cast away from SUN_DIRECTION (.65, 1, -.45), proportional to height.
   // No expanded concentric contact ellipse or all-around dark halo.
   const cast=rockDistance(r,x+.65*r.h,z-.45*r.h,.025);
   const away=(-(x-r.x)*.65+(z-r.z)*.45)/Math.hypot(.65,.45);
   const unlitSide=smooth(-.025,.13,away);
   const shadow=(1-smooth(.88,1.06,cast))*unlitSide*.42;
   stoneShade=Math.max(stoneShade,shadow);
  }
  pixels[i+3]=Math.round(stoneShade*255);
 }
 return pixels;
}
