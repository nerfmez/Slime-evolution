import {liquidSlimeGeometry} from './slime.js';
export const neutralRegions=()=>[-.32,0,.32].map(z=>({anchor:z,sx:1,sy:1,sz:1,x:0,y:0,z:0}));

// One grounded 3D gait, shared by every view. Local +Z is forward.
// phase, height, forward length, crown lag/lead, low leading bulge
const keys=[
 [0,1,1,0,0], [.12,.74,1.12,-.065,.02], [.20,.62,1.24,-.09,.045],
 [.32,.78,1.44,.055,.14], [.44,.84,1.50,.18,.13],
 [.57,.95,1.23,.13,.05], [.68,.70,1.16,.025,0],
 [.80,1.22,.86,-.065,-.022], [.91,1.05,.98,-.025,0], [1,1,1,0,0]
];
export function slimeWalkPose(phase){
 const p=((phase%1)+1)%1;let i=0;while(i<keys.length-2&&p>keys[i+1][0])i++;
 const a=keys[i],b=keys[i+1],u=(p-a[0])/(b[0]-a[0]),t=u*u*(3-2*u);
 const [height,length,lean,bulge]=a.slice(1).map((v,k)=>v+(b[k+1]-v)*t);
 return {height,length,lean,bulge,width:1/(height*length)};
}
export function slimeWalkGeometry(phase,sides=64,rows=40,settings={}){
 const m=slimeWalkPose(phase);
 m.height=Math.max(.28,1+(m.height-1)*(settings.squash??1));
 m.length=1+(m.length-1)*(settings.stretch??1);
 m.width=1/(m.height*m.length);
 m.lean*=settings.lean??1;m.bulge*=settings.flow??1;
 const trailing=slimeWalkPose(phase-.08*(settings.lag??1)).lean*(settings.lean??1);
 return liquidSlimeGeometry(sides,rows,([x,y,z])=>{
  const h=Math.max(0,Math.min(1,(y-.012)/.708));
  const front=.5+.5*Math.tanh(z*6);
  // Broad deformation through the body; the bottom never lifts or forms a neck.
  const roll=Math.sin(Math.PI*h);
  const p=[x*m.width, .012+(y-.012)*m.height,
   z*m.length+(m.lean*front+trailing*(1-front))*h*h+m.bulge*roll*(.35+.65*front)];
  if(!settings.regions)return p;
  const weights=settings.regions.map(r=>Math.exp(-Math.pow((z-r.anchor)/.18,2))),total=weights.reduce((a,b)=>a+b,0);
  const result=[0,0,0];
  settings.regions.forEach((r,i)=>{const w=weights[i]/total;
   result[0]+=w*(p[0]*r.sx+r.x);
   result[1]+=w*((p[1]-.012)*r.sy+.012+r.y);
   result[2]+=w*((p[2]-r.anchor*m.length)*r.sz+r.anchor*m.length+r.z);
  });
  result[1]=Math.max(.012,result[1]);return result;
 });
}
