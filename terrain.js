// Broad, low shoreline stones: each footprint is also the collision source.
export const ROCKS=[
 {x:3.7,z:-10.8,rx:.83,rz:.55,h:.48,a:.25},
 {x:4.8,z:-11.1,rx:.40,rz:.30,h:.25,a:-.4},
 {x:26.8,z:-25.8,rx:.80,rz:.54,h:.50,a:-.55},
 {x:27.7,z:-25.3,rx:.34,rz:.28,h:.23,a:.7},
 {x:-25.4,z:-24.3,rx:.87,rz:.58,h:.46,a:.38},
 {x:-24.25,z:-24.0,rx:.42,rz:.31,h:.24,a:-.65},
 {x:-11.5,z:8.6,rx:.72,rz:.53,h:.40,a:-.3},
 {x:-11.1,z:9.3,rx:.31,rz:.26,h:.21,a:.9},
 {x:26.5,z:22.8,rx:1.02,rz:.66,h:.55,a:.2},
 {x:27.8,z:23.1,rx:.47,rz:.35,h:.28,a:-.6},
 {x:11.5,z:26.5,rx:.69,rz:.47,h:.38,a:-.3},
 {x:10.7,z:26.9,rx:.29,rz:.23,h:.18,a:.8}
];
// Original nine tree positions, before reflection-driven repositioning.
export const SCENERY=[[-8,-5,0],[13,-1,0],[26,-16,0],[-26,-26,0],[-12,-10,0],[-24,13,0],[20,22,0],[4,27,0],[-8,22,0],...ROCKS.map(r=>[r.x,r.z,1])];
export function treeHeight(x,z){const t=SCENERY.find(t=>t[2]===0&&t[0]===x&&t[1]===z);return (2.8+.24*Math.sin(x*2))*1.33*(t?.[3]??1);}
// An irregular south-eastern meadow with a sinuous low-grass passage.
export function wildMeadow(x,z){
 const q=Math.hypot((x-21)/11.8,(z-23)/10.5)+.07*Math.sin(x*.57+z*.32)+.045*Math.cos(z*.8);
 const t=Math.max(0,Math.min(1,(1.1-q)/.34));return t*t*(3-2*t);
}
export function meadowPath(x,z){
 const d=Math.abs(x-(17.5+Math.sin(z*.30)*2.3));
 const t=Math.max(0,Math.min(1,(d-.7)/1.1));return t*t*(3-2*t);
}
import {ZONE_MASKS} from './zone-masks.js';
import {PAINT_MASKS} from './terrain-mask.js';
export const DECALS=[{x:9,z:-6,rx:6.4,rz:6.8,art:'pond'},{x:21,z:-23,rx:5.4,rz:8.4,art:'north'},{x:-19,z:-20,rx:10.8,rz:13.5,art:'clearing'}];
export const CLEARING=DECALS.find(d=>d.art==='clearing');

// Collision also covers rocks painted into the northern pond artwork.
const northRocks=DECALS.find(d=>d.art==='north');
export const PAINTED_ROCKS=[[155,1153,70,52],[257,1177,27,25],[224,1211,27,23]].map(([x,y,rx,rz])=>({x:northRocks.x+(x/1024-.5)*northRocks.rx*2,z:northRocks.z+(y/1536-.5)*northRocks.rz*2,rx:rx/1024*northRocks.rx*2,rz:rz/1536*northRocks.rz*2}));
export const ROCK_FOOTPRINTS=[...ROCKS,...PAINTED_ROCKS];
export function rockDistance(r,x,z,padding=0){const a=r.a||0,dx=x-r.x,dz=z-r.z;return Math.hypot((dx*Math.cos(a)+dz*Math.sin(a))/(r.rx+padding),(-dx*Math.sin(a)+dz*Math.cos(a))/(r.rz+padding));}
export function rockBlocked(x,z,padding=.25){return ROCK_FOOTPRINTS.some(r=>rockDistance(r,x,z,padding)<1);}
export function rockGrassScale(x,z){
 let distance=Infinity;
 for(const r of ROCK_FOOTPRINTS)distance=Math.min(distance,(rockDistance(r,x,z)-1)*Math.min(r.rx,r.rz));
 const t=Math.max(0,Math.min(1,distance/1.1));return .28+.72*t*t*(3-2*t);
}

// Water edges traced in source-art pixels: north 1024 x 1536; others 1536 x 1024.
// Banks, mud paths, and painted grass remain walkable; reflections/lilies are water.
export const WATER_OUTLINES={
 north:[[[563,290],[578,255],[621,217],[682,194],[739,188],[798,200],[852,224],[885,251],[922,288],[941,337],[954,389],[949,444],[927,490],[898,529],[882,565],[869,617],[871,665],[840,704],[800,740],[741,765],[676,774],[619,790],[585,803],[537,817],[528,850],[547,880],[587,904],[627,932],[658,970],[677,1018],[678,1070],[663,1125],[636,1176],[593,1213],[534,1244],[467,1267],[405,1274],[342,1262],[290,1241],[251,1214],[203,1181],[170,1152],[137,1102],[119,1054],[101,1008],[105,957],[130,910],[163,862],[192,825],[225,795],[263,768],[292,730],[320,687],[350,652],[387,627],[431,606],[475,581],[516,548],[547,514],[573,477],[584,443],[580,401],[560,360],[551,321]]],
 pond:[[[285,540],[309,483],[369,441],[438,416],[502,392],[551,351],[623,329],[643,280],[628,245],[674,211],[738,187],[809,188],[878,204],[934,244],[1003,269],[1053,293],[1104,337],[1162,375],[1195,423],[1191,466],[1166,500],[1116,537],[1074,578],[1063,625],[1034,687],[990,739],[946,786],[886,797],[834,813],[787,839],[732,860],[672,854],[616,832],[580,818],[550,784],[552,742],[558,716],[532,670],[486,650],[438,642],[385,639],[330,613],[299,582]]],
 mud:[
 [[722,324],[759,301],[817,286],[859,264],[850,240],[889,225],[945,224],[999,226],[1049,246],[1050,276],[1090,297],[1135,330],[1196,350],[1239,381],[1272,416],[1272,452],[1240,488],[1195,516],[1147,539],[1081,552],[1024,547],[970,526],[939,509],[925,475],[922,450],[895,437],[877,421],[867,397],[829,383],[790,378],[765,358],[731,349]],
 [[304,487],[328,461],[380,446],[420,432],[458,433],[489,440],[523,440],[549,460],[561,477],[594,488],[611,513],[591,535],[554,545],[511,551],[473,559],[426,576],[390,567],[365,546],[329,534],[309,513]],
 [[552,659],[600,638],[646,625],[669,608],[706,587],[749,580],[790,586],[830,593],[862,610],[864,631],[880,650],[913,668],[944,696],[935,720],[904,733],[865,735],[817,736],[793,752],[810,768],[830,788],[802,805],[752,809],[715,795],[683,780],[669,750],[641,728],[602,710],[570,690]]
 ]
};
const waterPolygons=DECALS.flatMap(d=>(WATER_OUTLINES[d.art]||[]).map(points=>points.map(([x,y])=>[d.x+(x/(d.art==='north'?1024:1536)-.5)*2*d.rx,d.z+(y/(d.art==='north'?1536:1024)-.5)*2*d.rz])));
export function waterBlocked(x,z,radius=0){
 for(const points of waterPolygons){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
   const [ax,az]=points[j],[bx,bz]=points[i];
   if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
   const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
   if((x-ax-t*dx)**2+(z-az-t*dz)**2<=radius*radius)return true;
  }
  if(inside)return true;
 }
 return false;
}

// CPU and GPU share wetland outlines, so the grass mesh omits wet ground.
function pool(x,z,cx,cz,rx,rz){let a=(x-cx)/rx,b=(z-cz)/rz,t=Math.atan2(b,a);return Math.hypot(a,b)*(1+.10*Math.sin(t*3+.5)+.055*Math.cos(t*5))}
export function pondDistance(x,z){return Math.min(pool(x,z,9,-6,5.3,3.4),pool(x,z,19,-19,4.4,3.1))}
export function mudDistance(x,z){return Math.hypot((x+8)/3.2,(z-5)/4.0)+.075*Math.sin(x*1.8)*Math.sin(z*1.4)}
export function bareGround(x,z){
 for(const d of DECALS){if(d.art==='clearing')continue;let u=(x-d.x)/(d.rx*2)+.5,v=(z-d.z)/(d.rz*2)+.5;if(u<0||v<0||u>=1||v>=1)continue;
  let px=Math.floor(u*128),py=Math.floor(v*128),solid=true;
  // Only the interior excludes live grass; the painted fringe receives real blades.
  for(const [dx,dy] of [[0,0],[-4,0],[4,0],[0,-4],[0,4],[-3,-3],[3,-3],[-3,3],[3,3]]){
   if((PAINT_MASKS[d.art]||ZONE_MASKS[d.art])[Math.max(0,Math.min(127,py+dy))][Math.max(0,Math.min(127,px+dx))]!=='1')solid=false;
  }if(solid)return true;
 }return false;
}
export function clearingCover(x,z){
 const d=CLEARING,u=(x-d.x)/(2*d.rx)+.5,v=(z-d.z)/(2*d.rz)+.5;
 if(u<0||v<0||u>=1||v>=1)return 0;
 return Number(ZONE_MASKS.clearing[Math.floor(v*128)][Math.floor(u*128)]);
}
export function clearingAmount(x,z){
 const d=CLEARING,u=(x-d.x)/(2*d.rx)+.5,v=(z-d.z)/(2*d.rz)+.5;
 if(u<0||v<0||u>=1||v>=1)return 0;
 return Number(ZONE_MASKS.soil[Math.floor(v*128)][Math.floor(u*128)])/9;
}
export const terrainGLSL=`
float poolShape(vec2 p,vec2 center,vec2 radius){vec2 q=(p-center)/radius;float a=atan(q.y,q.x);return length(q)*(1.+.10*sin(a*3.+.5)+.055*cos(a*5.));}
float pond(vec2 p){return min(poolShape(p,vec2(9.,-6.),vec2(5.3,3.4)),poolShape(p,vec2(19.,-19.),vec2(4.4,3.1)));}
float mudDistance(vec2 p){return length((p-vec2(-8.,5.))/vec2(3.2,4.))+.075*sin(p.x*1.8)*sin(p.y*1.4);}
float mud(vec2 p){return max(1.-smoothstep(.78,1.11,mudDistance(p)),1.-smoothstep(1.,1.11,pond(p)));}
float puddle(vec2 p){return min(min(poolShape(p,vec2(-8.8,2.8),vec2(1.35,.8)),poolShape(p,vec2(-6.8,5.),vec2(1.2,.80))),poolShape(p,vec2(-8.6,7.2),vec2(1.5,.86)));}
`;
