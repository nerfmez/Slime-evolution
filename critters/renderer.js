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
flat out vec4 atlasRect;
flat out float special;
flat out float mirrorX;
void main(){
  float c=cos(misc.x),s=sin(misc.x);
  vec2 q=vec2(c*corner.x-s*corner.y,s*corner.x+c*corner.y);
  gl_Position=vp*vec4(actor.xyz,1.);
  gl_Position.xy+=q*actor.w*vec2(length(vec3(vp[0][0],vp[1][0],vp[2][0])),length(vec3(vp[0][1],vp[1][1],vp[2][1])));
  vec2 t=corner*.5+.5;
  if(misc.y>.5)t.x=1.-t.x;
  t.y=1.-t.y;
  uv=mix(rect.xy,rect.zw,t);
  localUv=corner;
  atlasRect=rect;
  special=misc.z;
  mirrorX=misc.y;
}`;
export const critterFragment=`
in vec2 uv;in vec2 localUv;
flat in vec4 atlasRect;
flat in float special;
flat in float mirrorX;
out vec4 color;
uniform sampler2D atlas;
uniform float clock;
void main(){
  vec4 tex;
  if(special>.5){
    // Item sprites are kept at their normal visual size while the quad is enlarged for a clearly bigger aura.
    const float spriteScale=.54;
    vec2 spriteLocal=localUv/spriteScale;
    if(max(abs(spriteLocal.x),abs(spriteLocal.y))<=1.){
      vec2 t=spriteLocal*.5+.5;
      if(mirrorX>.5)t.x=1.-t.x;
      t.y=1.-t.y;
      tex=texture(atlas,mix(atlasRect.xy,atlasRect.zw,t));
    }else tex=vec4(0.);
  }else tex=texture(atlas,uv);

  vec3 glow=special<1.5?vec3(1.,.26,.48):special<2.5?vec3(.15,.78,1.):vec3(1.,.61,.12);
  float halo=0.;
  if(special>.5){
    // Filled circular aura, not an outline. A persistent soft body makes special animals readable at a glance.
    float d=length(localUv);
    float base=1.-smoothstep(.18,.76,d);
    float baseAura=base*.12;

    // Repeating outward expansion: each pulse grows beyond the animal and fades before restarting.
    float phase=fract(clock*.24+special*.13);
    float radius=mix(.52,.96,phase);
    float filled=1.-smoothstep(radius*.52,radius,d);
    float pulseFade=1.-smoothstep(.38,1.,phase);
    float pulseAura=filled*(.25*pulseFade);

    // A slower breathing component slightly changes the filled aura size/strength so it never feels static.
    float breathe=.5+.5*sin(clock*.72+special*.61);
    float breatheRadius=.68+.10*breathe;
    float breatheFill=(1.-smoothstep(breatheRadius*.48,breatheRadius,d))*(.05+.05*breathe);

    float circleMask=1.-smoothstep(.94,1.,d);
    halo=(baseAura+pulseAura+breatheFill)*circleMask*(1.-tex.a);
  }
  float a=tex.a+halo;
  if(a<.006)discard;
  vec3 prem=tex.rgb*tex.a+glow*halo;
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
      const auraScale=kind?1.85:1;
      data[i]=o.x;data[i+1]=small*.72+hop+(player[1]||0)*c.eat;data[i+2]=o.z;data[i+3]=small*shrink*auraScale;
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
