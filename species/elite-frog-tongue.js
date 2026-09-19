import {eliteFrogTonguePoints,ELITE_FROG_TONGUE_SEGMENTS} from './elite-frog-combat.js';
// One reusable ribbon mesh, with a dark ink outline and warm pink inner tongue.
export function createEliteFrogTongueRenderer(gl,{program,geometry,uniform,render}){
 const count=ELITE_FROG_TONGUE_SEGMENTS+1,positions=new Float32Array(count*6),uv=[],indices=[];
 for(let i=0;i<count;i++){uv.push(i/(count-1),0,i/(count-1),1);if(i<count-1){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
 const mesh=geometry(gl,positions,null,uv,indices);
 const p=program(gl,`layout(location=0)in vec3 position;layout(location=2)in vec2 uv;uniform mat4 vp;out vec2 UV;void main(){UV=uv;gl_Position=vp*vec4(position,1.);}`,
 `in vec2 UV;out vec4 color;void main(){float edge=abs(UV.y-.5)*2.;float tip=smoothstep(.93,1.,UV.x);if(tip>0.&&edge>sqrt(max(0.,1.-tip*tip)))discard;vec3 ink=vec3(.24,.19,.09),flesh=mix(vec3(.66,.22,.24),vec3(.94,.51,.43),1.-edge);float rim=smoothstep(.68,.83,edge);vec3 c=mix(flesh,vec3(.67,.67,.25),rim);c=mix(c,ink,smoothstep(.83,.95,edge));float shine=(1.-smoothstep(.025,.13,abs(UV.y-.32)))*.28;c=mix(c,vec3(1.,.85,.65),shine);color=vec4(c,1.);}`);
 return {draw(e,vp,camera){
  const points=eliteFrogTonguePoints(e);if(points.length<2)return {calls:0,triangles:0};
  for(let i=0;i<count;i++){
   const a=points[Math.max(0,i-1)],b=points[Math.min(count-1,i+1)],q=points[i];
   // Ribbon width faces the camera, keeping the tongue readable from all views.
   const tx=b.x-a.x,ty=b.y-a.y,tz=b.z-a.z;
   let nx=ty*camera[2]-tz*camera[1],ny=tz*camera[0]-tx*camera[2],nz=tx*camera[1]-ty*camera[0];
   const len=Math.hypot(nx,ny,nz)||1;nx=nx/len*q.width;ny=ny/len*q.width;nz=nz/len*q.width;
   positions.set([q.x-nx,q.y-ny,q.z-nz,q.x+nx,q.y+ny,q.z+nz],i*6);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffers[0]);gl.bufferSubData(gl.ARRAY_BUFFER,0,positions);
  gl.useProgram(p);uniform(gl,p,'vp',vp);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.depthMask(true);render(gl,mesh);
  return {calls:1,triangles:ELITE_FROG_TONGUE_SEGMENTS*2};
 }};
}
