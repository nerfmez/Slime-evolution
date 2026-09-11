export const I=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
export function mul(a,b){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o}
export function model(x=0,y=0,z=0,sx=1,sy=sx,sz=sx,ry=0){let c=Math.cos(ry),s=Math.sin(ry);return new Float32Array([c*sx,0,-s*sx,0,0,sy,0,0,s*sz,0,c*sz,0,x,y,z,1])}
const norm=a=>{let l=Math.hypot(...a);return a.map(v=>v/l)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
export function look(eye,target){let z=norm(eye.map((v,i)=>v-target[i])),x=norm(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])}
export function ortho(w,h,n=.1,f=100){return new Float32Array([2/w,0,0,0,0,2/h,0,0,0,0,-2/(f-n),0,0,0,-(f+n)/(f-n),1])}
