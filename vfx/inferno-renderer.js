import {createInfernoRemnants} from './inferno-remnants.js';
import {createAtlasRenderer,smokePlayback} from './inferno-atlas.js';
import {program,geometry,render,uniform} from '../gl.js';
import {model,mul} from '../math.js';
import {infernoSettings as settings,infernoView,rgb,domeState} from './inferno-settings.js';
export const infernoVertex=`
layout(location=0) in vec3 position;layout(location=1) in vec3 normal;layout(location=2) in vec2 uv;
uniform mat4 vp,model;uniform float mode,phase,flow,bulge,asymmetry,breakup,rollRate;
out vec3 local,N,rest;out vec2 UV;out float layer;
void main(){vec3 p=position,n=normal;UV=uv;rest=position;layer=position.z;
 if(mode>.5&&mode<1.5){
  // Horizontal advection: each material point keeps its latitude.
  // Cartesian coordinates remain regular at the pole (no atan-based pinwheel).
  float h=max(0.,position.y),turn=phase*flow*(2.4+.55*sin(h*5.));
  mat2 rotation=mat2(cos(turn),-sin(turn),sin(turn),cos(turn));
  vec2 radial=rotation*position.xz;
  float fold=sin(position.x*5.+position.z*3.+h*8.-phase*flow*4.);
  float radius=1.+bulge*fold*(1.-h*h);
  p=vec3(radial.x*radius,h,radial.y*radius);
  p.xz*=1.+breakup*.25;p.y*=1.-breakup*.25;
  p.x+=asymmetry*h*h;n=normalize(vec3(radial.x,h,radial.y));
 }else if(mode>1.5&&mode<2.5){
  float life=breakup,r=length(position.xz),a=atan(position.z,position.x);
  vec2 direction=position.xz/max(.001,r);
  float turn=(1.-exp(-life*3.))*rollRate*1.8;
  float roll=turn*(.3+.7*smoothstep(.0,.5,position.y));
  mat2 rotation=mat2(cos(roll),-sin(roll),sin(roll),cos(roll));
  vec2 section=rotation*vec2(r-.98,position.y-.22);
  float reach=.68+.92*(1.-pow(1.-life,3.));
  float radial=reach+section.x*(1.+life*.3);
  float height=section.y+.22;
  height=.5*(height+sqrt(height*height+.001));
  p=vec3(direction.x*radial,height*(1.-life*.3),direction.y*radial);
  float nr=dot(normal.xz,direction);vec2 rn=rotation*vec2(nr,normal.y);
  n=normalize(vec3(normal.x, rn.y,normal.z)+vec3(direction.x*(rn.x-nr),0,direction.y*(rn.x-nr)));
  rest=position;
 }else if(mode<.5){p*=1.+bulge*sin(atan(p.z,p.x)*3.+p.y*4.-phase*flow)*max(0.,p.y);}
 local=p;N=normalize(mat3(transpose(inverse(model)))*n);gl_Position=vp*model*vec4(p,1.);}`;
export const infernoFragment=`
in vec3 local,N,rest;in vec2 UV;in float layer;
uniform vec3 viewDirection,rim,body,hot,core,smokeDark,smokeLight;
uniform float mode,phase,flow,fade,breakup;uniform sampler2D flamePaint;out vec4 color;
float hash3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){vec3 c;float alpha=fade;
 if(mode<.5){
  float pigment=texture(flamePaint,UV+vec2(phase*flow*.055,0)).g;
  c=mix(body,hot,smoothstep(.4,.85,pigment));c=mix(c,core,smoothstep(.88,.97,pigment));
 }else if(mode<1.5){
  // Curved horizontal fronts carried by the rotating mass, with no upward drift.
  float h=rest.y;
  vec3 q=vec3(rest.x*2.0,h*3.0,rest.z*2.0);
  // Reuse the painted flame shapes, advected horizontally with the mass.
  // The planar cap removes the singularity of cylindrical UVs at the top.
  float u=atan(rest.z,rest.x)/6.283185+.5;
  vec2 sideUV=vec2(u,1.-h);
  vec2 capUV=rest.xz*.46+vec2(.5,.44);
  float sidePaint=texture(flamePaint,sideUV).g;
  float capPaint=texture(flamePaint,capUV).g;
  float pigment=mix(sidePaint,capPaint,smoothstep(.67,.93,h));
  c=mix(rim,body,smoothstep(.26,.40,pigment));
  c=mix(c,hot,smoothstep(.58,.85,pigment));
  c=mix(c,core,smoothstep(.88,.97,pigment));
  // The yellow source expands before the orange folds develop.
  float source=(1.-smoothstep(.02,.20,phase))+(1.-smoothstep(.03,.48,h))*.95;
  c=mix(c,mix(hot,core,.88),clamp(source,0.,1.));
  vec2 screenRight=normalize(vec2(viewDirection.z,-viewDirection.x));
  float across=dot(local.xz,screenRight);
  float coreSpot=1.-smoothstep(.10,.57,length(vec2(across,local.y*.95)));
  c=mix(c,mix(core,vec3(1.),.60),coreSpot*(1.-breakup)*.96);
  float tearing=noise3(q*1.45+vec3(0,breakup*.3,0));
  if(tearing<smoothstep(.16,1.,breakup)*.92)discard;
  c*=.95+.05*max(0.,dot(normalize(N),normalize(viewDirection)));
 }else if(mode<2.5){
  float erosion=.8*noise3(rest*5.+vec3(0,breakup*.8,0))+.2*noise3(rest*12.);
  if(erosion<mix(-.1,.93,smoothstep(.42,1.,breakup)))discard;
  float light=dot(normalize(N),normalize(vec3(-.35,.85,.4)))*.5+.5;
  c=mix(smokeDark,mix(smokeDark,smokeLight,.55),smoothstep(.25,.38,light));c=mix(c,smokeLight,smoothstep(.77,.90,light));
 }else if(mode<3.5){float edge=abs(UV.y*2.-1.);c=mix(body,hot,1.-edge);c=mix(c,core,(1.-edge)*(1.-UV.x)*.55);alpha*=1.-smoothstep(.8,1.,edge);
 }else if(mode<4.5){float r=length(UV*2.-1.);alpha*=smoothstep(.8,.84,r)*(1.-smoothstep(.88,.93,r));c=hot;
 }else if(mode>6.5){float r=length(UV*2.-1.);alpha*=pow(max(0.,1.-r),2.);c=mix(hot,core,.45);
 }else{c=mix(hot,core,.85+.15*max(0.,normalize(N).y));}
 if(alpha<.015)discard;color=vec4(c,alpha);}`;
export function createInfernoRenderer(gl,texture,atlasTexture,betweenTexture,laterTexture){
 const remnants=createInfernoRemnants(gl);
 const atlas=createAtlasRenderer(gl,atlasTexture,betweenTexture,laterTexture);
 const p=program(gl,infernoVertex,infernoFragment);gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'flamePaint'),5);if(texture){gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.activeTexture(gl.TEXTURE0);}
 function sphere(hemi){const pos=[],n=[],uv=[],ix=[],rows=hemi?32:20,cols=hemi?64:40;for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){const b=j/rows*Math.PI*(hemi?.5:1),a=k/cols*Math.PI*2,x=Math.sin(b)*Math.cos(a),y=Math.cos(b),z=Math.sin(b)*Math.sin(a);pos.push(x,y,z);n.push(x,y,z);uv.push(k/cols,j/rows);if(j<rows&&k<cols){const q=j*(cols+1)+k;ix.push(q,q+1,q+cols+1,q+1,q+cols+2,q+cols+1);}}return geometry(gl,pos,n,uv,ix);}
 const orb=sphere(false);
 // Wrapped crescent sheets, rather than separate floating fire spheres.
 function petal(tail=false){const pos=[],n=[],u=[],ix=[];for(let i=0;i<=30;i++){const t=i/30,a=t*4.4-.7,w=Math.sin(t*Math.PI)**.65*.68;for(const side of [-1,1]){if(tail){pos.push(side*w*.48+Math.sin(t*3.)*.2,t*.18,-.6-t*1.5);n.push(0,1,0);}else{const latitude=side*w;pos.push(Math.cos(a)*Math.cos(latitude)*1.04,Math.sin(a)*Math.cos(latitude)*1.04,Math.sin(latitude)*1.04);n.push(Math.cos(a),Math.sin(a),0);}u.push(t,(side+1)/2);}if(i<30){const q=i*2;ix.push(q,q+1,q+2,q+1,q+3,q+2);}}return geometry(gl,pos,n,u,ix);}
 const wrap=petal(),tail=petal(true),plane=geometry(gl,[-1,0,-1,1,0,-1,1,0,1,-1,0,1],[0,1,0,0,1,0,0,1,0,0,1,0],[0,0,1,0,1,1,0,1],[0,2,1,0,3,2]);
 let calls=0,triangles=0,s=settings,view;
 function draw(g,m,mode,phase,fade=1,breakup=0){if(fade<=.01)return;gl.useProgram(p);uniform(gl,p,'model',m);for(const [k,v] of Object.entries({mode,phase,fade,breakup,flow:s.flow,rollRate:s.smokeRoll,bulge:s.bulge,asymmetry:s.asymmetry}))uniform(gl,p,k,v);if(mode<2.5||(mode>4.5&&mode<6.5)){gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);}else gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask((mode<2.5||(mode>4.5&&mode<6.5))&&fade>.98);render(gl,g);calls++;triangles+=g.count/3;}
 return {draw(combat,vp,time,direction,visible,flames,preview=false){calls=0;triangles=0;s=settings;view=preview?infernoView:{solo:'all',mass:-1};gl.useProgram(p);uniform(gl,p,'vp',vp);uniform(gl,p,'viewDirection',direction);for(const k of ['rim','body','hot','core','smokeDark','smokeLight'])uniform(gl,p,k,rgb(s[k]));
  if(['all','projectile'].includes(view.solo))for(const o of combat.projectiles)if(!o.ember&&visible(o.x,o.z,2)){
   const age=1.8-o.life,size=s.bodySize*(1+Math.sin(age*15)*s.pulse),yaw=Math.atan2(o.vx||o.tx-o.x||0,o.vz||o.tz-o.z||1),root=model(o.x,o.y+.09,o.z,size,size,size*s.bodyStretch,yaw);
   draw(orb,root,0,age);for(let i=0;i<2;i++)draw(wrap,mul(root,model(0,0,0,1+s.wrap*.10,1+s.wrap*.10,1+s.wrap*.10,age*2+i*Math.PI*.8)),3,age,.95);
   draw(tail,mul(root,model(0,0,0,1,1,s.tail*2)),3,age,.94);
  }
  const extra=remnants.draw(combat,vp,direction,visible,view.solo);calls+=extra.calls;triangles+=extra.triangles;
  for(const f of combat.fx)if(f.type==='blast'&&visible(f.x,f.z,f.r*3.5)){
   const t=f.age,r=f.r,b=domeState(t,s),fire=['all','fire'].includes(view.solo),smoking=['all','smoke'].includes(view.solo);
   if(fire&&t<s.pop+s.hold+s.breakTime){const reach=r*Math.min(1,t/(s.pop+s.hold));draw(plane,model(f.x,.026,f.z,reach*1.8,1,reach*1.8),7,t,.55*(1-b.open));}
   if(fire){const fade=Math.max(0,Math.min(1,(s.pop+s.hold+s.breakTime+.24-t)/.24));const n=atlas.draw({...f,opacity:fade},vp,direction,s,'fire');calls+=n;triangles+=n>=3?144+(n-2)*2:n*2;}
   if(smoking){const clock=smokePlayback(t,s);if(clock){const n=atlas.draw({...f,...clock},vp,direction,s,'smoke');calls+=n;triangles+=n*2;}}
   if(view.solo==='ring'&&t<.5){const rr=r*(.18+1.20*(1-(1-Math.min(1,t/.5))**2));draw(plane,model(f.x,.032,f.z,rr*s.width,1,rr*s.depth),4,t,s.shock*(1-t/.5));}

  }
  gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);return {calls,triangles};
 }};
}
