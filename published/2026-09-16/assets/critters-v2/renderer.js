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
uniform float clock;
float ellipse(vec2 p,vec2 r){return (length(p/r)-1.)*min(r.x,r.y);}
float line(vec2 p,vec2 a,vec2 b,float r){vec2 d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.,1.))-r;}
void main(){
 bool special=info.x>2.5;
 vec2 p=uv*(special?1.30:1.); p.x*=info.z;
 float type=info.x, gait=sin(info.y), body,eye;
 float emblem=10.,accent=10.,detail=10.;
 vec3 base,glow=vec3(0.),accentColor=vec3(1.);
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
 }else if(type<2.5){
  // Meadow rabbit: long ears, cream belly, little tail and hopping feet.
  body=ellipse(p-vec2(-.22,-.18),vec2(.46,.36));
  body=min(body,ellipse(p-vec2(.29,.02),vec2(.31,.29)));
  body=min(body,ellipse(p-vec2(.12,.45),vec2(.105,.38)));
  body=min(body,ellipse(p-vec2(.37,.43),vec2(.095,.36)));
  body=min(body,length(p-vec2(-.65,-.10))-.15);
  body=min(body,ellipse(p-vec2(.18+gait*.04,-.46),vec2(.25,.10)));
  eye=length(p-vec2(.40,.07));
  base=vec3(.83,.77,.60);
 }else if(type<3.5){
  // Heart axolotl: broad head, six feathery gills and a heart-shaped chest marking.
  body=ellipse(p-vec2(-.17,-.25),vec2(.43,.28));
  body=min(body,line(p,vec2(-.45,-.21),vec2(-.78,-.08+gait*.035),.105));
  body=min(body,ellipse(p-vec2(-.37,-.47),vec2(.18,.09)));
  body=min(body,ellipse(p-vec2(.27,-.45),vec2(.18,.10)));
  body=min(body,ellipse(p-vec2(.08,.12),vec2(.50,.36)));
  for(int k=0;k<3;k++){
   float a=-.48+float(k)*.48;
   vec2 left=vec2(-.40,.12),right=vec2(.53,.12);
   vec2 dl=vec2(-.28, a*.55+gait*.018),dr=vec2(.24,a*.55-gait*.018);
   float g=min(line(p,left,left+dl,.050),line(p,right,right+dr,.050));
   g=min(g,line(p,left+dl*.62,left+dl+vec2(.005,.080),.027));
   g=min(g,line(p,right+dr*.62,right+dr+vec2(-.005,.080),.027));
   accent=min(accent,g);body=min(body,g);
  }
  eye=min(length(p-vec2(-.14,.18)),length(p-vec2(.31,.18)));
  vec2 h=(p-vec2(.045,-.105))/vec2(.17,.17);float q=dot(h,h)-1.;
  emblem=(q*q*q-h.x*h.x*h.y*h.y*h.y)*.020;
  detail=line(p,vec2(.04,.075),vec2(.13,.075),.016);
  base=vec3(.95,.71,.69);accentColor=vec3(.91,.34,.47);glow=vec3(1.,.47,.57);
 }else if(type<4.5){
  // Lodestone snail: low crawling foot and a U-shaped magnetic shell, not a beetle.
  body=ellipse(p-vec2(-.10,-.40),vec2(.69,.15));
  body=min(body,ellipse(p-vec2(.47,-.22),vec2(.19,.31)));
  body=min(body,line(p,vec2(.45,-.08),vec2(.49,.24+gait*.025),.033));
  body=min(body,line(p,vec2(.55,-.10),vec2(.74,.17-gait*.025),.033));
  body=min(body,length(p-vec2(.49,.25+gait*.025))-.070);
  body=min(body,length(p-vec2(.74,.18-gait*.025))-.065);
  eye=min(length(p-vec2(.505,.26+gait*.025)),length(p-vec2(.755,.19-gait*.025)));
  vec2 u=p-vec2(-.22,.19);
  float shell=max(abs(length(u)-.30)-.115,u.y);
  shell=min(shell,line(u,vec2(-.30,0.),vec2(-.30,.30),.115));
  shell=min(shell,line(u,vec2(.30,0.),vec2(.30,.30),.115));
  accent=shell;body=min(body,shell);
  emblem=min(ellipse(u-vec2(-.30,.28),vec2(.096,.045)),ellipse(u-vec2(.30,.28),vec2(.096,.045)));
  base=vec3(.57,.72,.70);accentColor=u.x<0.?vec3(.80,.37,.43):vec3(.33,.61,.85);glow=vec3(.38,.76,1.);
 }else{
  // Nova lantern moth: round radiant abdomen, four spread wings, short fuse antenna.
  vec2 wing=p;wing.y+=(abs(p.x)-.35)*gait*.045;
  float wings=ellipse(wing-vec2(-.47,.16),vec2(.30,.30));
  wings=min(wings,ellipse(wing-vec2(.47,.16),vec2(.30,.30)));
  wings=min(wings,ellipse(wing-vec2(-.41,-.19),vec2(.25,.20)));
  wings=min(wings,ellipse(wing-vec2(.41,-.19),vec2(.25,.20)));
  body=min(wings,ellipse(p-vec2(0.,-.14),vec2(.30,.40)));accent=wings;
  body=min(body,ellipse(p-vec2(0.,.29),vec2(.22,.19)));
  body=min(body,line(p,vec2(-.08,.40),vec2(-.18,.61),.034));
  body=min(body,line(p,vec2(.09,.40),vec2(.15,.56),.034));
  body=min(body,length(p-vec2(-.18,.64))-.065);
  for(int k=0;k<2;k++){float x=k==0?-.17:.17;body=min(body,line(p,vec2(x,-.32),vec2(x*1.5,-.51+gait*.03),.030));}
  eye=min(length(p-vec2(-.10,.31)),length(p-vec2(.10,.31)));
  vec2 star=p-vec2(0.,-.13);float a=atan(star.y,star.x);
  emblem=length(star)-(.145+.055*cos(a*6.));
  detail=min(abs(p.y+.32),abs(p.y-.01))-.019;
  base=vec3(.94,.62,.23);accentColor=vec3(.72,.50,.32);glow=vec3(1.,.72,.26);
 }

 float aa=max(fwidth(body),.010);
 float mask=1.-smoothstep(-aa,aa,body);
 float shadow=(1.-smoothstep(.65,1.,length((p-vec2(0.,-.66))/vec2(.78,.13))))*.20;
 // Soft local halo only for special items; no full-screen bloom or extra draw.
 float halo=special?exp(-max(body,0.)*10.)*.18*(.87+.13*sin(clock*2.4+info.x))*(1.-mask)*(1.-info.w):0.;
 halo*=1.-smoothstep(.90,1.,max(abs(uv.x),abs(uv.y)));
 if(max(mask,max(shadow,halo))<.006)discard;
 vec3 ink=vec3(.18,.27,.22);
 vec3 pigment=base*mix(.78,1.07,step(-.12,p.y+.25*p.x));
 float grain=fract(sin(dot(floor(p*95.),vec2(127.1,311.7)))*43758.5453);
 pigment*=.97+.06*grain;
 // Interior is negative SDF distance; retain pigment inside and ink at the edge.
 pigment=mix(ink,pigment,1.-smoothstep(-.049,-.031,body));
 if(type>1.5&&type<2.5&&p.y>.18&&abs(p.x-.25)<.22) {
  float ear=min(ellipse(p-vec2(.12,.48),vec2(.043,.25)),ellipse(p-vec2(.37,.47),vec2(.034,.23)));
  pigment=mix(pigment,base*vec3(1.,.80,.81),1.-smoothstep(-.015,.015,ear));
 }
 if(type>.5&&type<1.5&&p.x<.18){
  float seam=abs(p.x+.14)-.018;
  pigment=mix(pigment,ink*.95, (1.-smoothstep(0.,.018,seam))*.58);
  float spot=min(length(p-vec2(-.35,.13)),length(p-vec2(.02,-.16)));
  pigment=mix(pigment,base*1.20,(1.-smoothstep(.055,.075,spot))*.7);
 }
 if(special){
  float a=1.-smoothstep(-.035,-.012,accent);
  // Shell/gill/wing shapes have their own outline and colored interior.
  pigment=mix(pigment,accentColor,a);
  if(type>3.5&&type<4.5) pigment=mix(pigment,ink,(1.-smoothstep(.018,.034,abs(accent)))*.8);
  if(type<3.5||type>4.5){
   float m=1.-smoothstep(-.006,.012,emblem);
   pigment=mix(pigment,type<3.5?vec3(.96,.24,.40):vec3(1.,.96,.66),m);
   if(type>4.5)pigment=mix(pigment,base*.79,(1.-smoothstep(.0,.018,detail))*step(abs(p.x),.19)*(1.-m));
   else pigment=mix(pigment,ink,1.-smoothstep(-.004,.009,detail));
  }else pigment=mix(pigment,vec3(.89,.96,1.),1.-smoothstep(-.008,.008,emblem));
  pigment+=glow*.045*(1.-smoothstep(-.12,-.035,body));
 }
 float blink=step(.988,sin(info.y*.09));
 float eyeMask=1.-smoothstep(.040,.055,eye);
 pigment=mix(pigment,ink,eyeMask*(1.-blink));
 float cheek=ellipse(p-vec2(type<.5?.31:type<1.5?.57:.46,type<.5?.23:-.055),vec2(.075,.042));
 pigment=mix(pigment,base*1.16,(1.-smoothstep(-.012,.010,cheek))*.55);
 float alpha=mask+shadow*(1.-mask);
 vec3 premul=pigment*mask+ink*shadow*(1.-mask);
 premul+=glow*halo*(1.-alpha);alpha+=halo*(1.-alpha);
 color=vec4(premul/max(alpha,.001),alpha);
}`;
function compile(gl, type, source){
 const shader=gl.createShader(type);gl.shaderSource(shader,'#version 300 es\nprecision highp float;\n'+source);gl.compileShader(shader);
 if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error('Critter shader: '+error);}return shader;
}
export function createCritterRenderer(gl){
 const p=gl.createProgram(),v=compile(gl,gl.VERTEX_SHADER,critterVertex),f=compile(gl,gl.FRAGMENT_SHADER,critterFragment);
 gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Critter renderer: '+gl.getProgramInfoLog(p));
 const vao=gl.createVertexArray(),quad=gl.createBuffer(),buffer=gl.createBuffer(),vpLoc=gl.getUniformLocation(p,'vp'),clockLoc=gl.getUniformLocation(p,'clock');
 gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,quad);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 for(let a=1;a<=2;a++){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(0+a,4,gl.FLOAT,false,32,(a-1)*16);gl.vertexAttribDivisor(a,1);}
 gl.bindVertexArray(null);
 let capacity=0,data=new Float32Array(0),disposed=false;
 return {draw(souls,vp,time,player,visible=()=>true,pickups=[]){
  if(disposed)return {calls:0,triangles:0,count:0};
  const total=souls.length+pickups.length;
  if(total>capacity){capacity=Math.max(64,2**Math.ceil(Math.log2(total)));data=new Float32Array(capacity*8);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data.byteLength,gl.DYNAMIC_DRAW);}
  let count=0;
  for(const list of [souls,pickups])for(const o of list){
   if(o.done||o.value===0||!visible(o.x,o.z,1))continue;
   const c=ensureCritter(o),i=count++*8,small=o.kind ? .44 :.24+Math.min(.05,Math.log2(1+o.value)*.008);
   const shrink=1-c.eat*.94,hop=c.eating?.12*Math.sin(c.eat*Math.PI):Math.max(0,Math.sin(c.phase))*c.moving*.055;
   data[i]=o.x;data[i+1]=small*.73/(o.kind?1.30:1)+hop+(player[1]||0)*c.eat;data[i+2]=o.z;data[i+3]=small*shrink;
   data[i+4]=c.variant;data[i+5]=c.phase+(o.age||0)*.22;data[i+6]=c.facing;data[i+7]=c.eat;
  }
  if(!count)return {calls:0,triangles:0,count:0};
  gl.useProgram(p);gl.uniformMatrix4fv(vpLoc,false,vp);gl.uniform1f(clockLoc,time);gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,data.subarray(0,count*8));
  gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  gl.drawArraysInstanced(gl.TRIANGLES,0,6,count);gl.depthMask(true);gl.disable(gl.BLEND);gl.bindVertexArray(null);
  return {calls:1,triangles:count*2,count};
 },dispose(){if(disposed)return;disposed=true;gl.deleteBuffer(quad);gl.deleteBuffer(buffer);gl.deleteVertexArray(vao);gl.deleteProgram(p);}};
}
