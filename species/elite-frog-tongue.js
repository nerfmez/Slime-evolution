import {eliteFrogTonguePoints,ELITE_FROG_TONGUE_SEGMENTS} from './elite-frog-combat.js';
// Reusable tongue and close-fitting poison mist; no ground or sector geometry.
export function createEliteFrogTongueRenderer(gl,{program,geometry,uniform,render}){
 const count=ELITE_FROG_TONGUE_SEGMENTS+1,positions=new Float32Array(count*6),uv=[],indices=[];
 for(let i=0;i<count;i++){uv.push(i/(count-1),0,i/(count-1),1);if(i<count-1){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
 const mesh=geometry(gl,positions,null,uv,indices);
 const vertex=`layout(location=0)in vec3 position;layout(location=2)in vec2 uv;uniform mat4 vp;out vec2 UV;void main(){UV=uv;gl_Position=vp*vec4(position,1.);}`;
 const p=program(gl,vertex,`in vec2 UV;out vec4 color;
 void main(){
  float edge=abs(UV.y-.5)*2.,tip=smoothstep(.965,1.,UV.x);
  if(edge>sqrt(max(0.,1.-tip*tip)))discard;
  float grain=sin(UV.x*113.+sin(UV.y*37.))*sin(UV.y*83.+UV.x*59.);
  vec3 flesh=mix(vec3(.48,.16,.19),vec3(.87,.43,.35),sqrt(max(0.,1.-edge*edge)));
  flesh+=grain*.023;
  float highlight=exp(-pow((UV.y-.32)/.085,2.))*.36;
  vec3 c=mix(flesh,vec3(.99,.77,.48),highlight);
  float slime=smoothstep(.74,.83,edge)*(.6+.2*sin(UV.x*65.));
  c=mix(c,vec3(.48,.52,.18),slime);
  c=mix(c,vec3(.20,.16,.10),smoothstep(.84,.96,edge));
  color=vec4(c,1.);
 }`);
 const mistPositions=new Float32Array(positions.length),mistMesh=geometry(gl,mistPositions,null,uv,indices);
 const mist=program(gl,vertex,`in vec2 UV;out vec4 color;uniform float age;
 void main(){
  float edge=abs(UV.y-.5)*2.;
  float wisps=.55+.45*sin(UV.x*63.+UV.y*19.-age*12.)*sin(UV.x*29.-UV.y*21.);
  float alpha=pow(max(0.,1.-edge),2.)*wisps*.32*smoothstep(.10,.45,UV.x)*(1.-smoothstep(.94,1.,UV.x));
  color=vec4(mix(vec3(.40,.24,.46),vec3(.46,.55,.17),smoothstep(.2,.85,UV.y)),alpha);
 }`);
 return {draw(e,vp,camera){
  const points=eliteFrogTonguePoints(e);if(points.length<2)return {calls:0,triangles:0};
  for(let i=0;i<count;i++){
   const a=points[Math.max(0,i-1)],b=points[Math.min(count-1,i+1)],q=points[i];
   // Ribbon width faces the camera, keeping the tongue readable from all views.
   const tx=b.x-a.x,ty=b.y-a.y,tz=b.z-a.z;
   let nx=ty*camera[2]-tz*camera[1],ny=tz*camera[0]-tx*camera[2],nz=tx*camera[1]-ty*camera[0];
   const len=Math.hypot(nx,ny,nz)||1;nx=nx/len*q.width;ny=ny/len*q.width;nz=nz/len*q.width;
   positions.set([q.x-nx,q.y-ny,q.z-nz,q.x+nx,q.y+ny,q.z+nz],i*6);
   // Keep the poison close to the moving tongue, never filling its swept area.
   const spread=2.5+.5*Math.sin(i*.8+e.frogEliteTongueAge*13.);
   mistPositions.set([q.x-nx*spread,q.y-ny*spread,q.z-nz*spread,q.x+nx*spread,q.y+ny*spread,q.z+nz*spread],i*6);
  }
  gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  gl.bindBuffer(gl.ARRAY_BUFFER,mistMesh.buffers[0]);gl.bufferSubData(gl.ARRAY_BUFFER,0,mistPositions);
  gl.useProgram(mist);uniform(gl,mist,'vp',vp);uniform(gl,mist,'age',e.frogEliteTongueAge);render(gl,mistMesh);
  gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffers[0]);gl.bufferSubData(gl.ARRAY_BUFFER,0,positions);
  gl.useProgram(p);uniform(gl,p,'vp',vp);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.depthMask(true);render(gl,mesh);
  return {calls:2,triangles:ELITE_FROG_TONGUE_SEGMENTS*4};
 }};
}
