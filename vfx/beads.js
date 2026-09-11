import {program,uniform} from '../gl.js';
import {wildMeadow} from '../terrain.js';

export const beadVertex=`
layout(location=0) in vec2 corner;
layout(location=1) in vec4 bead;
uniform mat4 vp;
out vec2 uv;
void main(){
 uv=corner;
 gl_Position=vp*vec4(bead.xyz,1.);
 gl_Position.xy+=corner*bead.w*vec2(length(vec3(vp[0][0],vp[1][0],vp[2][0])),length(vec3(vp[0][1],vp[1][1],vp[2][1])));
}`;
export const beadFragment=`
in vec2 uv;out vec4 color;
void main(){
 float r=length(uv),aa=max(fwidth(r),.025);
 if(r>1.)discard;
 vec3 pigment=mix(vec3(.16,.43,.43),vec3(.42,.78,.70),(1.-smoothstep(.68,.96,r)));
 pigment=mix(pigment,vec3(.88,.96,.74),(1.-smoothstep(.17,.50,length(uv-vec2(-.23,.25))))*.85);
 color=vec4(pigment,1.-smoothstep(1.-aa,1.,r));
}`;

// Two triangles per soul, one draw for the entire visible collection.
export function createBeadRenderer(gl){
 const p=program(gl,beadVertex,beadFragment),vao=gl.createVertexArray();gl.bindVertexArray(vao);
 const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,16,0);gl.vertexAttribDivisor(1,1);
 let capacity=0,data=new Float32Array(0);
 return {draw(souls,vp,time,player,visible){
  if(souls.length>capacity){capacity=Math.max(64,2**Math.ceil(Math.log2(souls.length)));data=new Float32Array(capacity*4);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data.byteLength,gl.DYNAMIC_DRAW);}
  let count=0;
  for(const o of souls){if(!visible(o.x,o.z,2))continue;const i=count++*4,d=Math.hypot(o.x-player[0],o.z-player[2]);
   const hover=1.12+wildMeadow(o.x,o.z)*.95+Math.sin(time*2.6+o.id*2.4)*.035;
   data[i]=o.x;data[i+1]=.48+(hover-.48)*Math.min(1,d/1.3);data[i+2]=o.z;data[i+3]=.075+Math.min(.035,Math.log2(1+o.value)*.006);
  }
  if(!count)return {calls:0,triangles:0,count:0};
  gl.useProgram(p);uniform(gl,p,'vp',vp);gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,data.subarray(0,count*4));
  gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);gl.drawArraysInstanced(gl.TRIANGLES,0,6,count);gl.disable(gl.BLEND);
  return {calls:1,triangles:count*2,count};
 }};
}
