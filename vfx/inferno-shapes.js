// One smooth connected billowing cloud bank, cached once at startup.
export function smokeLoop(){
 const lobes=[];
 for(let i=0;i<13;i++){const a=i*Math.PI*2/13,r=.98+.035*Math.sin(i*2.1),size=.26+.045*Math.sin(i*1.7);lobes.push([Math.cos(a)*r,.23+.055*Math.sin(i*2.4),Math.sin(a)*r,size,.26+.045*Math.sin(i*1.3),size]);}
 function smooth(a,b,k){const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;}
 function field(x,y,z){
  let d=Math.hypot(Math.hypot(x,z)-.98,(y-.11)*1.5)-.17;
  for(const [a,b,c,rx,ry,rz] of lobes){const q=(Math.hypot((x-a)/rx,(y-b)/ry,(z-c)/rz)-1)*Math.min(rx,ry,rz);d=smooth(d,q,.12);}
  return d;
 }
 const pos=[],normals=[],uv=[],indices=[],cache=new Map(),nx=40,ny=12,nz=40,grid=[];
 const corner=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
 const at=(i,j,k)=>((i*(ny+1)+j)*(nz+1)+k);
 for(let i=0;i<=nx;i++)for(let j=0;j<=ny;j++)for(let k=0;k<=nz;k++){const p=[-1.55+i/nx*3.1,-.15+j/ny*1.15,-1.55+k/nz*3.1];grid[at(i,j,k)]={p,d:field(...p)};}
 function vertex(a,b){const t=a.d/(a.d-b.d),p=a.p.map((v,i)=>v+(b.p[i]-v)*t),key=p.map(v=>v.toFixed(5)).join(',');if(cache.has(key))return cache.get(key);const e=.002,n=[field(p[0]+e,p[1],p[2])-field(p[0]-e,p[1],p[2]),field(p[0],p[1]+e,p[2])-field(p[0],p[1]-e,p[2]),field(p[0],p[1],p[2]+e)-field(p[0],p[1],p[2]-e)],l=Math.hypot(...n)||1,id=pos.length/3;pos.push(...p);normals.push(...n.map(v=>v/l));uv.push(p[0],p[2]);cache.set(key,id);return id;}
 function tri(a,b,c){const A=pos.slice(a*3,a*3+3),B=pos.slice(b*3,b*3+3),C=pos.slice(c*3,c*3+3),u=B.map((v,i)=>v-A[i]),v=C.map((x,i)=>x-A[i]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],dot=cross.reduce((sum,x,i)=>sum+x*normals[a*3+i],0);indices.push(a,...(dot>0?[b,c]:[c,b]));}
 for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)for(let k=0;k<nz;k++){const cube=corner.map(([x,y,z])=>grid[at(i+x,j+y,k+z)]);for(const tet of tets){const inside=tet.map(q=>cube[q]).filter(p=>p.d<0),outside=tet.map(q=>cube[q]).filter(p=>p.d>=0);if(!inside.length||!outside.length)continue;if(inside.length===1||outside.length===1){const a=inside.length===1?inside[0]:outside[0],others=inside.length===1?outside:inside;tri(...others.map(b=>vertex(a,b)));}else{const a=vertex(inside[0],outside[0]),b=vertex(inside[0],outside[1]),c=vertex(inside[1],outside[0]),d=vertex(inside[1],outside[1]);tri(a,b,c);tri(b,d,c);}}}
 return {pos,normals,uv,indices};
}
