import {sunfallSettings as s,sunfallClock,sunfallView} from './sunfall-settings.js';
import {createSunfallSmoke3D} from './sunfall-smoke3d.js';
import {createSunfallBands} from './sunfall-bands.js';
import {program,geometry,render,uniform} from '../gl.js';
export const SUN_FALL_DURATION=2.4;
export const sunfallVertex=`layout(location=0)in vec3 position;layout(location=2)in vec2 uv;
uniform mat4 vp;uniform vec3 origin,viewDirection;uniform vec2 size,anchor;out vec2 UV;
void main(){vec3 f=normalize(viewDirection),right=normalize(cross(vec3(0,1,0),f)),up=cross(f,right);
vec3 p=origin+right*(uv.x-anchor.x)*size.x+up*(anchor.y-uv.y)*size.y;
p+=f*max(0.,.025-p.y)/max(.01,f.y);UV=uv;gl_Position=vp*vec4(p,1.);}`;
export const sunfallFragment=`in vec2 UV;uniform sampler2D atlas,flightTex,smokeTex;
uniform float frame,opacity,mode,phase,smokeSpin,smokeStretch,smokeHalf;out vec4 color;
float sat(float x){return clamp(x,0.,1.);}
vec4 safeSmoke(vec2 q){if(any(lessThan(q,vec2(0.)))||any(greaterThan(q,vec2(1.))))return vec4(0);return texture(smokeTex,q);}
void main(){vec4 c;
 if(mode<.5){
  vec2 center=vec2(.5,.72),metric=vec2(1.,1.226),q=(UV-center)*metric;
  float r=length(q),a=atan(q.y,q.x),turn=phase*1.65+.18*sin(phase*13.);
  float swell=1.+.035*sin(a*4.-phase*17.);
  vec2 rotating=center+vec2(cos(a-turn),sin(a-turn))*r/swell/metric;
  vec2 tailUV=UV;float tail=1.-smoothstep(.35,.65,UV.y);
  tailUV.x+=(sin(UV.y*23.-phase*25.)*.028+sin(UV.y*39.+phase*19.)*.015)*tail;
  tailUV.y+=sin(UV.x*21.+phase*17.)*.025*tail;
  vec4 body=texture(flightTex,clamp(rotating,0.,1.)),tip=texture(flightTex,clamp(tailUV,0.,1.));
  c=mix(tip,body,1.-smoothstep(.25,.39,r));
  c.a*=smoothstep(.12,.38,c.r-c.b)*smoothstep(.35,.65,c.r);
 }
 else if(mode<1.5){vec2 tile=vec2(mod(frame,6.),floor(frame/6.));c=texture(atlas,(tile+clamp(UV,vec2(.001),vec2(.999)))/vec2(6.,4.));}
 else if(mode<2.5){
  float t=sat(phase),roll=smoothstep(0.,.34,t),stretch=smoothstep(.27,.60,t),thin=smoothstep(.43,.82,t);
  float spin=(roll*1.25+stretch*.36)*smokeSpin;
  float radius=.245+.055*roll+.045*stretch;
  c=vec4(0.);
  // Upright billows travel around the ellipse; their local silhouette never rotates flat.
  for(int i=0;i<10;i++){
   float id=float(i),angle=id*6.2831853/10.+spin+.085*sin(id*3.1);
   vec2 center=vec2(.5)+vec2(cos(angle)*radius,sin(angle)*radius*.76);
   if((smokeHalf<0.&&sin(angle)>0.)||(smokeHalf>0.&&sin(angle)<=0.))continue;
   float size=(.080+.018*sin(id*2.37))*(1.-thin*.58);
   float end=.70+.19*(.5+.5*sin(id*4.13));
   float life=smoothstep(0.,.10,t)*(1.-smoothstep(end-.12,end,t));
   vec2 d=UV-center;d.y+=size*.20;
   float lean=.30*cos(angle)+.12*sin(id*2.);
   vec2 local=vec2(d.x*cos(lean)-d.y*sin(lean),d.x*sin(lean)+d.y*cos(lean));
   if(sin(id*2.31)<0.)local.x=-local.x;
   vec2 q=local/vec2(size*(1.27+stretch*.65),size*1.50);
   float swell=.94+.07*sin(id*3.+t*13.);
   float shape=min(length(q-vec2(-.36,.1))/.75,min(length(q-vec2(.2,-.28))/.82,length(q-vec2(.61,.20))/.59));
   vec2 tangent=normalize(vec2(-sin(angle),cos(angle)*.76));
   float along=dot(d,tangent),crosswise=dot(d,vec2(-tangent.y,tangent.x));
   float tailLength=size*(1.+stretch*3.8*smokeStretch);
   float trail=sat(-along/tailLength);
   float tailShape=abs(crosswise+sin(trail*4.)*size*.19)/(size*.43*(1.-trail)+.001);
   float tailAlpha=(1.-smoothstep(.72,1.,tailShape))*step(-tailLength,along)*step(along,0.)*(1.-trail)*stretch*.68;
   vec2 puffUV=vec2(.375+q.x*.155,.775+q.y*.20);
   vec4 paint=safeSmoke(puffUV);
   float crop=(1.-smoothstep(.84,1.12,abs(q.x)))*(1.-smoothstep(.86,1.10,abs(q.y)));
   float head=paint.a*crop;
   float erosion=.5+.26*sin(q.x*11.+q.y*7.+id)+.24*sin(q.y*17.-q.x*6.);
   float alpha=max(head*(1.-stretch*.30)*(1.-thin*.55),tailAlpha*.8)*life;
   alpha*=1.-smoothstep(1.-thin*.86,1.08-thin*.86,erosion);
   vec3 shade=mix(vec3(.72,.66,.55),paint.rgb,smoothstep(.05,.4,head));
   // Premultiplied accumulation avoids seams where the connected bank overlaps.
   c.rgb=shade*alpha+c.rgb*(1.-alpha);c.a=alpha+c.a*(1.-alpha);
  }
  c.rgb/=max(.001,c.a);
 }else{float d=length((UV-.5)/vec2(.48,.40));c=vec4(1.,.59,.13,pow(max(0.,1.-d),2.)*.65*phase);}
 if(c.a<.008)discard;color=vec4(c.rgb,c.a*opacity);
}`;
export function createSunfallRenderer(gl,textures){
 const [atlas,flight,smoke]=Array.isArray(textures)?textures:[textures,textures,textures];
 for(const [i,tex] of [atlas,flight,smoke].entries()){gl.activeTexture(gl.TEXTURE0+13+i);gl.bindTexture(gl.TEXTURE_2D,tex);for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);}
 gl.activeTexture(gl.TEXTURE0);
 const p=program(gl,sunfallVertex,sunfallFragment),g=geometry(gl,[-1,1,0,1,1,0,1,-1,0,-1,-1,0],null,[0,0,1,0,1,1,0,1],[0,2,1,0,3,2]),bands=createSunfallBands(gl),smoke3D=createSunfallSmoke3D(gl);
 const imageLayer=()=>sunfallView.solo==='all'||sunfallView.solo==='image';
 return {draw(combat,vp,view,visible){let calls=0,triangles=0;
  gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  const card=(x,y,z,w,h,anchor,mode,phase,frame=0,smokeHalf=0)=>{
   gl.useProgram(p);for(const [i,tex] of [atlas,flight,smoke].entries()){gl.activeTexture(gl.TEXTURE0+13+i);gl.bindTexture(gl.TEXTURE_2D,tex);}for(const [name,unit] of [['atlas',13],['flightTex',14],['smokeTex',15]])gl.uniform1i(gl.getUniformLocation(p,name),unit);
   for(const[k,v]of Object.entries({vp,viewDirection:view,origin:[x,y,z],size:[w,h*s.height],anchor,mode,phase,frame,smokeHalf,opacity:s.opacity,smokeSpin:s.smokeSpin,smokeStretch:s.smokeStretch}))uniform(gl,p,k,v);render(gl,g);calls++;triangles+=2;
  };
  const strips=(x,y,z,r,age,flight)=>{if(sunfallView.solo==='all'||sunfallView.solo==='bands'){const n=bands.draw(vp,view,x,y,z,r,age,flight,s);calls+=n.calls;triangles+=n.triangles;}};
  for(const e of combat.events)if(e.type==='sun'&&visible(e.x,e.z,e.s.radius*4)){
   const r=e.s.radius*s.size,t=Math.min(1,e.age/e.delay),y=r*(.32+s.flightHeight*(1-(.3*t+.7*t*t)));
   if(imageLayer())card(e.x,y,e.z,1.55*r,1.90*r,[.5,.72],0,e.age);
   strips(e.x,y,e.z,.43*r,e.age,true);
  }
  for(const f of combat.fx)if(f.type==='sun'&&visible(f.x,f.z,f.r*4*s.size)){
   const r=f.r*s.size,t=sunfallClock(f.age)-.5;
   const smokeVisible=t>.10&&t<1.9&&(sunfallView.solo==='all'||sunfallView.solo==='smoke');
   const smokePass=half=>{const n=smoke3D.draw(vp,view,f.x,f.z,r,(t-.10)/1.8,half,s);calls+=n.calls;triangles+=n.triangles;};
   if(smokeVisible)smokePass(-1);
   if(t<.76){if(imageLayer()){card(f.x,.04,f.z,3.8*r,1.9*r,[.5,.5],3,Math.min(1,t/.05)*Math.max(0,1-t/.8));card(f.x,.04,f.z,3*r,3*r,[.5,.80-.17*Math.min(1,t/.18)],1,t,Math.min(23,Math.floor(t/.72*24)));}strips(f.x,.04,f.z,1.3*r,t,false);}
   if(smokeVisible)smokePass(1);
  }
  gl.depthMask(true);gl.disable(gl.BLEND);gl.activeTexture(gl.TEXTURE0);return {calls,triangles};
 }};
}
