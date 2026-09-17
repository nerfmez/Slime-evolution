import {ensureCritter} from './logic.js';
export const critterVertex = `
layout(location=0) in vec2 corner;
layout(location=1) in vec4 actor;
layout(location=2) in vec4 traits;
uniform mat4 vp;
out vec2 uv;
flat out vec4 info;
void main(){
 uv=corner; info=traits;
 gl_Position=vp*vec4(actor.xyz,1.);
 gl_Position.xy+=corner*actor.w*vec2(length(vec3(vp[0][0],vp[1][0],vp[2][0])),length(vec3(vp[0][1],vp[1][1],vp[2][1])));
}`;
export const critterFragment = `
in vec2 uv; flat in vec4 info; out vec4 color;
float ellipse(vec2 p,vec2 r){return (length(p/r)-1.)*min(r.x,r.y);}
float line(vec2 p,vec2 a,vec2 b,float r){vec2 d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.,1.))-r;}
void main(){
 vec2 p=uv; p.x*=info.z;
 float type=mod(info.x,3.), gait=sin(info.y), body,eye;
 vec3 base;
 if(type<.5){
  // Pond frog: squat body, folded hind feet, raised eyes.
  body=ellipse(p-vec2(-.03,-.13),vec2(.60,.39));
  body=min(body,ellipse(p-vec2(-.47,-.42),vec2(.28,.15)));
  body=min(body,ellipse(p-vec2(.40,-.40),vec2(.26,.13)));
  body=min(body,ellipse(p-vec2(.10,.24),vec2(.44,.33)));
  body=min(body,length(p-vec2(-.10,.45))-.17);
  body=min(body,length(p-vec2(.34,.42))-.17);
  eye=min(length(p-vec2(-.08,.47)),length(p-vec2(.36,.44)));
  base=vec3(.49,.68,.40);
 }else if(type<1.5){
  // Leaf beetle: shell, alternating feet, two antennae.
  body=ellipse(p-vec2(-.14,-.04),vec2(.47,.43));
  body=min(body,ellipse(p-vec2(.37,-.03),vec2(.28,.27)));
  for(int k=0;k<3;k++){
   float x=-.43+float(k)*.26;
   body=min(body,line(p,vec2(x,-.25),vec2(x-.10+gait*.04,-.55),.043));
  }
  body=min(body,line(p,vec2(.39,.12),vec2(.48,.40+gait*.025),.029));
  body=min(body,line(p,vec2(.51,.10),vec2(.72,.29-gait*.025),.029));
  eye=length(p-vec2(.47,.055));
  base=vec3(.47,.62,.54);
 }else{
  // Meadow rabbit: long ears, cream belly, little tail and hopping feet.
  body=ellipse(p-vec2(-.22,-.18),vec2(.46,.36));
  body=min(body,ellipse(p-vec2(.29,.02),vec2(.31,.29)));
  body=min(body,ellipse(p-vec2(.12,.45),vec2(.105,.38)));
  body=min(body,ellipse(p-vec2(.37,.43),vec2(.095,.36)));
  body=min(body,length(p-vec2(-.65,-.10))-.15);
  body=min(body,ellipse(p-vec2(.18+gait*.04,-.46),vec2(.25,.10)));
  eye=length(p-vec2(.40,.07));
  base=vec3(.83,.77,.60);
 }
 if(info.x>2.5&&info.x<3.5)base=vec3(.86,.49,.48);
 if(info.x>3.5&&info.x<4.5)base=vec3(.39,.66,.79);
 if(info.x>4.5)base=vec3(.90,.71,.34);
 float aa=max(fwidth(body),.010);
 float mask=1.-smoothstep(-aa,aa,body);
 float shadow=(1.-smoothstep(.65,1.,length((uv-vec2(0.,-.66))/vec2(.78,.13))))*.20;
 if(max(mask,shadow)<.01)discard;
 vec3 ink=vec3(.18,.27,.22);
 vec3 pigment=base*mix(.78,1.07,step(-.12,p.y+.25*p.x));
 float grain=fract(sin(dot(floor(p*95.),vec2(127.1,311.7)))*43758.5453);
 pigment*=.97+.06*grain;
 // Interior is negative SDF distance; retain pigment inside and ink at the edge.
 pigment=mix(ink,pigment,1.-smoothstep(-.049,-.031,body));
 if(type>1.5&&p.y>.18&&abs(p.x-.25)<.22) {
  float ear=min(ellipse(p-vec2(.12,.48),vec2(.043,.25)),ellipse(p-vec2(.37,.47),vec2(.034,.23)));
  pigment=mix(pigment,base*vec3(1.,.80,.81),1.-smoothstep(-.015,.015,ear));
 }
 if(type>.5&&type<1.5&&p.x<.18){
  float seam=abs(p.x+.14)-.018;
  pigment=mix(pigment,ink*.95, (1.-smoothstep(0.,.018,seam))*.58);
  float spot=min(length(p-vec2(-.35,.13)),length(p-vec2(.02,-.16)));
  pigment=mix(pigment,base*1.20,(1.-smoothstep(.055,.075,spot))*.7);
 }
 float blink=step(.988,sin(info.y*.09));
 float eyeMask=1.-smoothstep(.040,.055,eye);
 pigment=mix(pigment,ink,eyeMask*(1.-blink));
 float cheek=ellipse(p-vec2(type<.5?.31:type<1.5?.57:.46,type<.5?.23:-.055),vec2(.075,.042));
 pigment=mix(pigment,base*1.16,(1.-smoothstep(-.012,.010,cheek))*.55);
 float alpha=mask+shadow*(1.-mask);
 color=vec4(mix(ink,pigment,mask/max(alpha,.001)),alpha);
}`;
function compile(gl, type, source){
 const shader=gl.createShader(type);gl.shaderSource(shader,'#version 300 es\nprecision highp float;\n'+source);gl.compileShader(shader);
 if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error('Critter shader: '+error);}return shader;
}
export function createCritterRenderer(gl){
 const p=gl.createProgram(),v=compile(gl,gl.VERTEX_SHADER,critterVertex),f=compile(gl,gl.FRAGMENT_SHADER,critterFragment);
 gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Critter renderer: '+gl.getProgramInfoLog(p));
 const vao=gl.createVertexArray(),quad=gl.createBuffer(),buffer=gl.createBuffer(),vpLoc=gl.getUniformLocation(p,'vp');
 gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,quad);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 for(let a=1;a<=2;a++){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,4,gl.FLOAT,false,32,(a-1)*16);gl.vertexAttribDivisor(a,1);}
 gl.bindVertexArray(null);
 let capacity=0,data=new Float32Array(0),disposed=false;
 return {draw(souls,vp,time,player,visible=()=>true,pickups=[]){
  if(disposed)return {calls:0,triangles:0,count:0};
  const total=souls.length+pickups.length;
  if(total>capacity){capacity=Math.max(64,2**Math.ceil(Math.log2(total)));data=new Float32Array(capacity*8);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data.byteLength,gl.DYNAMIC_DRAW);}
  let count=0;
  for(const list of [souls,pickups])for(const o of list){
   if(o.done||o.value===0||!visible(o.x,o.z,1))continue;
   const c=ensureCritter(o),i=count++*8,small=o.kind ? .32 :.24+Math.min(.05,Math.log2(1+o.value)*.008);
   const shrink=1-c.eat*.94,hop=c.eating?.12*Math.sin(c.eat*Math.PI):Math.max(0,Math.sin(c.phase))*c.moving*.055;
   data[i]=o.x;data[i+1]=small*.73+hop+(player[1]||0)*c.eat;data[i+2]=o.z;data[i+3]=small*shrink;
   data[i+4]=c.variant;data[i+5]=c.phase+(o.age||0)*.22;data[i+6]=c.facing;data[i+7]=c.eat;
  }
  if(!count)return {calls:0,triangles:0,count:0};
  gl.useProgram(p);gl.uniformMatrix4fv(vpLoc,false,vp);gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,data.subarray(0,count*8));
  gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  gl.drawArraysInstanced(gl.TRIANGLES,0,6,count);gl.depthMask(true);gl.disable(gl.BLEND);gl.bindVertexArray(null);
  return {calls:1,triangles:count*2,count};
 },dispose(){if(disposed)return;disposed=true;gl.deleteBuffer(quad);gl.deleteBuffer(buffer);gl.deleteVertexArray(vao);gl.deleteProgram(p);}};
}
