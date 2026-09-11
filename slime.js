// A closed, smooth liquid dome. No scanned mesh or painted skin is used.
export function liquidSlimeGeometry(sides=64,rows=40,deform=p=>p){
 const pos=[],normals=[],uv=[],indices=[];
 function point(t,a){
  const h=(1+Math.cos(t))*.5,y=.012+.708*Math.pow(h,1.65);
  const skirt=Math.exp(-Math.pow((y-.085)/.13,2));
  const r=.5*Math.sin(t)*(1+skirt*(.009*Math.cos(a*3+.4)+.005*Math.sin(a*5)));
  return deform([r*Math.cos(a)-.016*Math.pow(y/.72,2),y,r*Math.sin(a)]);
 }
 for(let j=0;j<=rows;j++)for(let i=0;i<=sides;i++){
  const t=j/rows*Math.PI,a=i/sides*Math.PI*2,p=point(t,a),e=.0001;
  const u=point(t+e,a),v=point(t-e,a),w=point(t,a+e),z=point(t,a-e);
  const dt=u.map((x,k)=>x-v[k]),da=w.map((x,k)=>x-z[k]);
  let n=[dt[1]*da[2]-dt[2]*da[1],dt[2]*da[0]-dt[0]*da[2],dt[0]*da[1]-dt[1]*da[0]];
  if(j===0)n=[0,1,0];else if(j===rows)n=[0,-1,0];else n=n.map(x=>-x);
  const len=Math.hypot(...n);pos.push(...p);normals.push(...(len>1e-12?n.map(x=>x/len):[0,-1,0]));uv.push(i/sides,j/rows);
  if(j<rows&&i<sides){const q=j*(sides+1)+i;
   if(j>0)indices.push(q,q+1,q+sides+1);
   if(j<rows-1)indices.push(q+1,q+sides+2,q+sides+1);
  }
 }
 return {pos,normals,uv,indices};
}
