import {ensureCritter} from './logic.js';
import {ATLAS_URL,SPRITES,EXP_FRAMES,PANDA_ROLL,ITEM_FRAMES} from './atlas.js';

export const critterVertex=`
layout(location=0) in vec2 corner;
layout(location=1) in vec4 actor;
layout(location=2) in vec4 rect;
layout(location=3) in vec4 misc;
uniform mat4 vp;
out vec2 uv;
out vec2 localUv;
flat out float special;
void main(){
  float c=cos(misc.x),s=sin(misc.x);
  vec2 q=vec2(c*corner.x-s*corner.y,s*corner.x+c*corner.y);
  gl_Position=vp*vec4(actor.xyz,1.);
  gl_Position.xy+=q*actor.w*vec2(length(vec3(vp[0][0],vp[1][0],vp[2][0])),length(vec3(vp[0][1],vp[1][1],vp[2][1])));
  vec2 t=corner*.5+.5;
  if(misc.y>.5)t.x=1.-t.x;
  t.y=1.-t.y;
  uv=mix(rect.xy,rect.zw,t);
  localUv=corner;special=misc.z;
}`;
export const critterFragment=`
in vec2 uv;in vec2 localUv;flat in float special;out vec4 color;
uniform sampler2D atlas;
uniform float clock;
void main(){
  vec4 tex=texture(atlas,uv);
  vec3 glow=special<1.5?vec3(1.,.26,.48):special<2.5?vec3(.15,.78,1.):vec3(1.,.61,.12);
  float pulse=.82+.18*sin(clock*3.2+special*1.7);
  float halo=0.;
  if(special>.5){
    vec2 texel=1./vec2(textureSize(atlas,0));
    vec2 cellSize=vec2(1./8.,1./4.);
    vec2 cellBase=floor(uv/cellSize)*cellSize;
    vec2 lo=cellBase+texel*.5,hi=cellBase+cellSize-texel*.5;
    vec2 d1=texel*4.0,d2=texel*7.0;
    float nearA=0.;
    nearA=max(nearA,texture(atlas,clamp(uv+vec2( d1.x,0.),lo,hi)).a);
    nearA=max(nearA,texture(atlas,clamp(uv+vec2(-d1.x,0.),lo,hi)).a);
    nearA=max(nearA,texture(atlas,clamp(uv+vec2(0., d1.y),lo,hi)).a);
    nearA=max(nearA,texture(atlas,clamp(uv+vec2(0.,-d1.y),lo,hi)).a);
    nearA=max(nearA,texture(atlas,clamp(uv+vec2( d1.x, d1.y),lo,hi)).a);
    nearA=max(nearA,texture(atlas,clamp(uv+vec2(-d1.x, d1.y),lo,hi)).a);
    nearA=max(nearA,texture(atlas,clamp(uv+vec2( d1.x,-d1.y),lo,hi)).a);
    nearA=max(nearA,texture(atlas,clamp(uv+vec2(-d1.x,-d1.y),lo,hi)).a);
    float farA=0.;
    farA=max(farA,texture(atlas,clamp(uv+vec2( d2.x,0.),lo,hi)).a);
    farA=max(farA,texture(atlas,clamp(uv+vec2(-d2.x,0.),lo,hi)).a);
    farA=max(farA,texture(atlas,clamp(uv+vec2(0., d2.y),lo,hi)).a);
    farA=max(farA,texture(atlas,clamp(uv+vec2(0.,-d2.y),lo,hi)).a);
    float silhouette=max(nearA,farA*.68);
    float rim=max(0.,silhouette-tex.a);
    float radial=1.-smoothstep(.35,1.28,length(localUv));
    float edge=max(abs(localUv.x),abs(localUv.y));
    float edgeFade=1.-smoothstep(.80,1.0,edge);
    halo=clamp((rim*1.05+radial*(1.-tex.a)*.38)*pulse*edgeFade,0.,.92);
  }
  float a=tex.a+halo*(1.-tex.a);
  if(a<.006)discard;
  vec3 prem=tex.rgb*tex.a+glow*halo*(1.-tex.a);
  color=vec4(prem/max(a,.001),a);
}`;
function compile(gl,type,source){
  const shader=gl.createShader(type);gl.shaderSource(shader,'#version 300 es\nprecision highp float;\n'+source);gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error('Critter shader: '+error);}return shader;
}
function frameFor(o,c){
  const back=c.back?1:0;
  if(o.kind)return ITEM_FRAMES[o.kind]?.[back]||ITEM_FRAMES.heal[back];
  if(c.expTier===2&&c.expForm===2&&c.moving>.2&&!c.eating)return PANDA_ROLL;
  return EXP_FRAMES[c.expTier||0]?.[c.expForm||0]?.[back]||EXP_FRAMES[0][0][back];
}
function specialCode(kind){return kind==='heal'?1:kind==='magnet'?2:kind==='nova'?3:0;}
export function createCritterRenderer(gl){
  const p=gl.createProgram(),v=compile(gl,gl.VERTEX_SHADER,critterVertex),f=compile(gl,gl.FRAGMENT_SHADER,critterFragment);
  gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Critter renderer: '+gl.getProgramInfoLog(p));
  const vao=gl.createVertexArray(),quad=gl.createBuffer(),buffer=gl.createBuffer(),vpLoc=gl.getUniformLocation(p,'vp'),clockLoc=gl.getUniformLocation(p,'clock'),atlasLoc=gl.getUniformLocation(p,'atlas');
  gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,quad);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  const stride=48;
  for(let a=1;a<=3;a++){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,4,gl.FLOAT,false,stride,(a-1)*16);gl.vertexAttribDivisor(a,1);}
  gl.bindVertexArray(null);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  let ready=false,disposed=false;
  const image=new Image();
  image.onload=()=>{if(disposed)return;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);ready=true;};
  image.src=ATLAS_URL;
  let capacity=0,data=new Float32Array(0);
  return {draw(souls,vp,time,player,visible=()=>true,pickups=[]){
    if(disposed||!ready)return {calls:0,triangles:0,count:0};
    const total=souls.length+pickups.length;
    if(total>capacity){capacity=Math.max(64,2**Math.ceil(Math.log2(total)));data=new Float32Array(capacity*12);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data.byteLength,gl.DYNAMIC_DRAW);}
    let count=0;
    for(const list of [souls,pickups])for(const o of list){
      if(o.done||o.value===0||!visible(o.x,o.z,1))continue;
      const c=ensureCritter(o),i=count++*12,kind=o.kind||'',small=kind?.30:c.expSize;
      const shrink=1-c.eat*.94,hop=c.eating?.10*Math.sin(c.eat*Math.PI):Math.max(0,Math.sin(c.phase))*c.moving*.035;
      const frame=frameFor(o,c),r=SPRITES[frame]||SPRITES.low_frog_f;
      const rolling=!kind&&c.expTier===2&&c.expForm===2&&c.moving>.2&&!c.eating;
      const rotation=rolling?c.phase*.20*(c.facing<0?-1:1):0;
      data[i]=o.x;data[i+1]=small*.72+hop+(player[1]||0)*c.eat;data[i+2]=o.z;data[i+3]=small*shrink;
      data[i+4]=r[0];data[i+5]=r[1];data[i+6]=r[2];data[i+7]=r[3];
      data[i+8]=rotation;data[i+9]=c.facing<0?1:0;data[i+10]=specialCode(kind);data[i+11]=0;
    }
    if(!count)return {calls:0,triangles:0,count:0};
    gl.useProgram(p);gl.uniformMatrix4fv(vpLoc,false,vp);gl.uniform1f(clockLoc,time);gl.uniform1i(atlasLoc,7);
    gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,data.subarray(0,count*12));
    gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
    gl.drawArraysInstanced(gl.TRIANGLES,0,6,count);gl.depthMask(true);gl.disable(gl.BLEND);gl.bindVertexArray(null);gl.activeTexture(gl.TEXTURE0);
    return {calls:1,triangles:count*2,count};
  },dispose(){if(disposed)return;disposed=true;image.src='';gl.deleteTexture(texture);gl.deleteBuffer(quad);gl.deleteBuffer(buffer);gl.deleteVertexArray(vao);gl.deleteProgram(p);}};
}
