import {program,geometry,render,uniform} from '../gl.js';
// Real curved strips in world space. Positive azimuth moves clockwise from the game camera.
const vertex=`layout(location=0)in vec3 position;layout(location=2)in vec2 uv;
uniform mat4 vp;uniform vec3 origin,viewDirection;uniform float radius,latitude,tilt,phase,width;
out vec2 UV;out float front;
void main(){float a=position.x+phase;float lat=latitude+sin(a)*tilt;
float rr=radius*sqrt(max(.02,1.-lat*lat));
vec3 q=vec3(cos(a)*rr,lat*radius+(position.y-.5)*width,sin(a)*rr);
q.y+=sin(position.x*5.-phase*1.2)*width*.13;
UV=uv;front=dot(normalize(viewDirection.xz),normalize(q.xz));gl_Position=vp*vec4(origin+q,1.);}`;
const fragment=`in vec2 UV;in float front;uniform float opacity,phase;uniform sampler2D flamePaint;out vec4 color;
void main(){if(front<.03)discard;float u=UV.x*6.2831853,v=UV.y;
float crest=.68+.22*sin(u*5.-v*2.+phase*.4)+.09*sin(u*11.+v*4.);
float low=.08+.06*sin(u*7.+phase*.6);if(v>crest||v<low)discard;
vec3 paint=texture(flamePaint,vec2(fract(UV.x*2.-phase*.065),1.-v)).rgb;
if(v>.48&&paint.g<.40)discard;
float heat=smoothstep(.48,.91,paint.g)*(.6+.4*sin(3.14159*clamp((v-low)/(crest-low),0.,1.)));
vec3 c=mix(vec3(.98,.20,.018),vec3(1.,.87,.30),heat);
c*=.80+.20*smoothstep(low,low+.22,v);
color=vec4(c,opacity*smoothstep(.03,.2,front));}`;
export function createSunfallBands(gl){
 const p=program(gl,vertex,fragment),pos=[],uv=[],ix=[],N=96;
 for(let i=0;i<=N;i++)for(let j=0;j<2;j++){pos.push(i/N*Math.PI*2,j,0);uv.push(i/N,j);}
 for(let i=0;i<N;i++){const k=i*2;ix.push(k,k+1,k+2,k+1,k+3,k+2);}
 const g=geometry(gl,pos,null,uv,ix);
 return {draw(vp,view,x,y,z,r,age,flight,s){
  const p0=flight?1:Math.min(1,Math.max(0,age/.2));
  const fade=flight?1:Math.min(1,age/.06)*Math.max(0,Math.min(1,(.70-age)/.20));
  if(fade<=0||s.bandStrength<=0)return {calls:0,triangles:0};
  gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'flamePaint'),5);uniform(gl,p,'vp',vp);uniform(gl,p,'origin',[x,y+r*s.bandHeight,z]);uniform(gl,p,'viewDirection',view);
  uniform(gl,p,'radius',r*p0*s.bandRadius);uniform(gl,p,'opacity',fade*s.opacity*s.bandStrength);
  for(let i=0;i<2;i++){
   uniform(gl,p,'latitude',Math.max(-.9,Math.min(.9,flight?(i?-.30:.32)*s.bandSpacing:.45+(i?.20:-.20)*s.bandSpacing)));
   uniform(gl,p,'tilt',(flight?.24:.12)*s.bandTilt);uniform(gl,p,'phase',age*s.bandSpeed+i*2.1+s.bandPhase);
   uniform(gl,p,'width',r*(flight?.40:.46)*s.bandWidth);render(gl,g);
  }
  return {calls:2,triangles:N*4};
 }};
}
