import {program,geometry,render,uniform} from '../gl.js';
import {infernoSettings as s,rgb} from './inferno-settings.js';
// Cached flame cards: one draw for the entire low burning bank, one per gameplay ember.
export function createInfernoRemnants(gl){
 const p=program(gl,`layout(location=0)in vec3 position;uniform mat4 vp;uniform vec3 origin,viewDirection,velocity;uniform float mode,age,radius,height,fade,tail,sway,density,flameWidth,spread,groundOpacity;out vec2 UV;out float seed;out float alive;void main(){
 float i=position.z;seed=i*2.39996;UV=position.xy;alive=step(i,density-.5);
 vec3 right=normalize(cross(vec3(0,1,0),viewDirection));vec3 up=normalize(cross(normalize(viewDirection),right));vec3 q;
 if(mode>1.5){q=origin+vec3(UV.x*radius,0,(UV.y*2.-1.)*radius);}
 else if(mode<.5){
  float a=seed,d=sqrt((i+.5)/max(1.,density))*(.65+.08*sin(seed*3.))*spread;vec3 base=origin+vec3(cos(a)*radius*d,0,sin(a)*radius*d);
  float t=UV.y,phase=age*sway*6.+seed;
  float bend=(sin(phase-t*4.)*.32+sin(phase*.63+t*7.)*.16)*t*t;
  float width=radius*(.13+.025*sin(seed*1.3))*flameWidth;float h=height*(.72+.26*sin(seed*1.7)+.12*sin(seed+age*sway*5.));
  q=base+right*(UV.x*width*pow(sin((t*.92+.04)*3.14159),.65)*(1.-t*.62)+bend*height)+vec3(0,t*h*fade,0);
 }else{
  vec2 motion=vec2(dot(velocity,right),dot(velocity,up));motion=normalize(motion+vec2(.0001));
  vec2 side=vec2(-motion.y,motion.x);float t=UV.y;
  float bulb=.07+.90*exp(-pow((t-.18)/.22,2.));vec2 point=side*(UV.x*radius*bulb+sin(t*8.-age*12.)*t*t*radius*.15)+motion*(.24-t*(1.+tail))*height;
  q=origin+right*point.x+up*point.y;
 }
 gl_Position=vp*vec4(q,1.);}`,`in vec2 UV;in float seed,alive;uniform float mode,age,fade,sway,groundOpacity;uniform vec3 body,hot,core,rim;out vec4 color;
 void main(){if(mode>1.5){vec2 q=vec2(UV.x,UV.y*2.-1.);float r=length(q);float mask=1.-smoothstep(.28,1.,r);if(mask<.02)discard;vec3 tint=mix(body,hot,(1.-smoothstep(0.,.65,r))*.16);color=vec4(tint,mask*fade*groundOpacity);return;}if(alive<.5)discard;float x=UV.x,t=UV.y;float edge;
 if(mode<.5){float curl=sin(t*10.-age*sway*7.+seed)*.10*t;edge=abs(x+curl);float notch=.69+.15*sin(t*13.-age*sway*7.+seed)+.09*sin(t*27.+seed);if(edge>notch||t>.98)discard;}
 else{edge=abs(x);if(edge>.90||t>.98)discard;}
 float heat=(1.-abs(x))*(1.-t)*(mode<.5?.82:1.);float fold=sin(t*12.-age*sway*5.+seed+x*4.);vec3 c=mix(rim,body,step(.20,heat+fold*.045));c=mix(c,hot,step(.43,heat+fold*.075));c=mix(c,core,step(.72,heat));if(mode>.5){float head=exp(-pow((t-.17)/.19,2.))*(1.-abs(x));c=mix(body,hot,step(.30,head));c=mix(c,core,step(.65,head));}float alpha=fade*(1.-smoothstep(.88,1.,t));if(mode<.5){float rise=smoothstep(.03,.42,t);c=mix(mix(body,hot,.08),c,rise);alpha*=smoothstep(0.,.22,t);alpha*=mix(1.-smoothstep(.40,.78,edge),1.,smoothstep(.05,.35,t));}if(alpha<.025)discard;color=vec4(c,alpha);}`);
 function cards(n){const v=[],ix=[];for(let i=0;i<n;i++)for(let j=0;j<=12;j++){let k=v.length/3;v.push(-1,j/12,i,1,j/12,i);if(j<12)ix.push(k,k+1,k+2,k+1,k+3,k+2);}return geometry(gl,v,null,null,ix);}

 const bank=cards(10),ember=cards(1),scorch=geometry(gl,[-1,0,0,1,0,0,1,1,0,-1,1,0],null,null,[0,1,2,0,2,3]);
 return {draw(combat,vp,direction,visible,solo='all'){
 let calls=0,triangles=0;gl.useProgram(p);for(const[k,v]of Object.entries({vp,viewDirection:direction,body:rgb(s.body),hot:rgb(s.hot),core:rgb(s.core),rim:rgb(s.rim),sway:s.groundSway,flameWidth:s.groundWidth,spread:s.groundSpread,groundOpacity:s.groundOpacity}))uniform(gl,p,k,v);
 gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
 const draw=(g,values)=>{for(const[k,v]of Object.entries(values))uniform(gl,p,k,v);render(gl,g);calls++;triangles+=g.count/3;};
 if(['all','sparks'].includes(solo))for(const e of combat.projectiles)if(e.ember&&visible(e.x,e.z,1)){
  const age=Math.max(0,1.1-e.life),t=age/1.1,arc=4*s.emberArc*t*(1-t),vertical=4*s.emberArc*(1-2*t)/1.1;
  draw(ember,{origin:[e.x,.10+arc,e.z],velocity:[e.vx,vertical,e.vz],mode:1,age,radius:s.emberSize*.65,height:s.emberSize,tail:s.emberTail,fade:Math.min(1,e.life/.18,age/.035),density:1});
 }
 if(['all','ground'].includes(solo))for(const f of (combat.patches??[]))if(visible(f.x,f.z,f.r+1)){
  const age=f.age??0,fade=Math.min(1,age/.16,f.life/s.groundFade);
  const end=Math.min(1,f.life/.9),groundFade=Math.min(1,age/.18)*end*end*(3-2*end);
  draw(scorch,{origin:[f.x,.043,f.z],velocity:[0,0,0],mode:2,age,radius:f.r,height:0,tail:0,fade:groundFade,density:1});
  draw(bank,{origin:[f.x,.055,f.z],velocity:[0,0,0],mode:0,age,radius:f.r,height:s.groundHeight,tail:0,fade,density:s.groundCount});
 }
 gl.depthMask(true);gl.disable(gl.BLEND);return {calls,triangles};
 }};
}
