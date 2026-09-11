import {program,uniform} from '../gl.js';
export const flameVertex=`
layout(location=0) in vec2 corner;
layout(location=1) in vec4 origin;
layout(location=2) in vec4 shape;
uniform mat4 vp;uniform float clock;
out vec2 uv;out float opacity;out float phase;
void main(){
 uv=corner;opacity=shape.z;phase=shape.y;
 float t=corner.y,flow=clock*3.6+phase;
 float bend=sin(t*3.8-flow)*t*t*.32;
 vec2 q=vec2((corner.x*(1.-t*.78)+bend)*origin.w,t*shape.x);
 gl_Position=vp*vec4(origin.xyz,1.);
 gl_Position.xy+=q*vec2(length(vec3(vp[0][0],vp[1][0],vp[2][0])),length(vec3(vp[0][1],vp[1][1],vp[2][1])));
}`;
export const flameFragment=`
in vec2 uv;in float opacity;in float phase;uniform float clock;out vec4 color;
void main(){
 float t=uv.y,flow=clock*3.6+phase;
 float edge=abs(uv.x)+t*.14+sin(t*9.-flow)*.12;
 float aa=max(fwidth(edge),.015),mask=1.-smoothstep(.83-aa,.83+aa,edge);
 mask*=smoothstep(0.,.08,t)*(1.-smoothstep(.78,1.,t));
 if(mask*opacity<.02)discard;
 float core=(1.-abs(uv.x))*(1.-t)+sin(t*6.-flow)*.07;
 vec3 c=mix(vec3(.68,.23,.10),vec3(.94,.44,.14),smoothstep(.12,.22,core));
 c=mix(c,vec3(1.,.72,.29),smoothstep(.38,.48,core));
 c=mix(c,vec3(1.,.91,.63),smoothstep(.68,.78,core));
 color=vec4(c,mask*opacity);
}`;
export function createFlameBatch(gl){
 const p=program(gl,flameVertex,flameFragment),vao=gl.createVertexArray();gl.bindVertexArray(vao);
 const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,0,1,0,-1,1,-1,1,1,0,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
 const buffer=gl.createBuffer(),data=new Float32Array(512*8);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data.byteLength,gl.DYNAMIC_DRAW);
 for(let i=1;i<=2;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,4,gl.FLOAT,false,32,(i-1)*16);gl.vertexAttribDivisor(i,1);}
 let count=0;
 return {reset(){count=0;},add(x,y,z,w,h,phase,fade=1){if(count===512||fade<=.01)return;data.set([x,y,z,w,h,phase,fade,0],count++*8);},draw(vp,time){
  if(!count)return {calls:0,triangles:0};gl.useProgram(p);uniform(gl,p,'vp',vp);uniform(gl,p,'clock',time);gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,data.subarray(0,count*8));gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.disable(gl.CULL_FACE);gl.drawArraysInstanced(gl.TRIANGLES,0,6,count);gl.depthMask(true);gl.disable(gl.BLEND);return {calls:1,triangles:count*2};
 }};
}
