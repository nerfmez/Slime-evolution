import {program,geometry,render,uniform} from '../gl.js';
// A broad grounded bank tapering into swept manga-like crests. No spheres or fog volume.
const vs=`layout(location=0)in vec3 position;layout(location=2)in vec2 uv;
uniform mat4 vp;uniform vec3 origin,viewDirection;
uniform float radius,time,spin,spread,puffSize,puffHeight,lift,stretch,roll,halfSide;
out vec2 UV;out float face,side;
void main(){float u=uv.x,v=uv.y,t=time;
float turn=smoothstep(0.,.35,t),pull=smoothstep(.26,.65,t),thin=smoothstep(.30,.86,t);
float phase=(turn*1.25+pull*.45)*spin;
float wave=.5+.5*sin(u*7.+.65*sin(u*3.));
float crest=.24+.76*pow(wave,1.7);
float a=u+phase-pow(v,1.25)*(.34+pull*.65)*stretch;
a+=sin(u*11.+v*5.-t*roll*5.)*.035*v;
float center=radius*(1.12+spread*(turn*.28+pull*.42)+.055*sin(u*5.));
float sector=.5+.5*sin(u*4.+.8*sin(u*7.));
float taper=smoothstep(.92*smoothstep(.34,.86,t)-.10,.92*smoothstep(.34,.86,t)+.14,sector);
float width=radius*.30*puffSize*pow(1.-v,1.65)*(1.-thin*.72)*(.12+.88*taper);
float r=center+position.x*width+radius*v*v*.055*sin(u*7.-t*roll*4.);
float height=radius*.62*puffHeight*crest*v*(1.-thin*.82)*taper;
height+=radius*lift*pull*v*v*.30;
vec3 radial=vec3(cos(a),0,sin(a));
vec3 q=origin+radial*r+vec3(0,height,0);
UV=vec2(u,v);face=position.x;side=dot(radial,normalize(vec3(viewDirection.x,0,viewDirection.z)))*halfSide;
gl_Position=vp*vec4(q,1.);}`;
const fs=`in vec2 UV;in float face,side;uniform float time,opacity,warmth;out vec4 color;
void main(){if(side<0.)discard;float u=UV.x,v=UV.y,t=time;
float thin=smoothstep(.40,.88,t);
// Long directional cuts peel off the upper edge; the broad foot survives longest.
float ribbon=.5+.32*sin(u*9.+v*5.)+.18*sin(u*17.-v*8.);
float cut=smoothstep(.48,.94,t);
if(ribbon<cut*(.45+.55*v))discard;
float crestCut=.83+.13*sin(u*19.+v*7.);
if(v>crestCut&&sin(u*11.+v*6.)>.2)discard;
float shade=.43+.32*v+.12*sin(u*7.+v*4.)+.08*sin(u*17.-v*9.)+.05*cos(u);
float toon=smoothstep(.34,.48,shade)*.57+smoothstep(.66,.79,shade)*.43;
vec3 c=mix(vec3(.61,.56,.47),vec3(.94,.88,.76),toon);
float ink=sin(u*13.+v*9.)+.45*sin(u*27.-v*5.);
c=mix(c,vec3(.69,.64,.54),smoothstep(.95,1.12,ink)*.32*(1.-v));
c=mix(c,vec3(1.,.57,.23),warmth*(1.-smoothstep(.1,.4,t))*(1.-v)*.25);
float sector=.5+.5*sin(u*4.+.8*sin(u*7.));
float peel=.92*smoothstep(.34,.86,t);
float a=smoothstep(0.,.07,t)*(1.-smoothstep(.78,1.,t));
a*=smoothstep(peel-.06,peel+.10,sector);
a*=1.-smoothstep(.25,.68,t)*.24;
a*=1.-smoothstep(.78,1.,v)*(.35+thin*.45);
if(a<.01)discard;color=vec4(c,a*opacity);}`;
export function createSunfallSmoke3D(gl){const p=program(gl,vs,fs),pos=[],uv=[],ix=[],U=192,V=12;
for(const face of [-1,1]){const base=pos.length/3;for(let y=0;y<=V;y++)for(let x=0;x<=U;x++){pos.push(face,0,0);uv.push(x/U*Math.PI*2,y/V);}
for(let y=0;y<V;y++)for(let x=0;x<U;x++){const k=base+y*(U+1)+x;ix.push(k,k+1,k+U+1,k+1,k+U+2,k+U+1);}}
const g=geometry(gl,pos,null,uv,ix);
return{draw(vp,view,x,z,r,t,half,s){gl.useProgram(p);gl.disable(gl.CULL_FACE);gl.depthMask(true);
for(const[k,v]of Object.entries({vp,viewDirection:view,origin:[x,.045,z],radius:r,time:t,spin:s.smokeSpin,spread:s.smokeSpread3D,puffSize:s.smokeSize3D,puffHeight:s.smokeHeight3D,lift:s.smokeLift3D,stretch:s.smokeStretch,roll:s.smokeRoll3D,halfSide:half,opacity:s.opacity*s.smokeOpacity3D,warmth:s.smokeWarmth3D}))uniform(gl,p,k,v);
render(gl,g);gl.depthMask(false);return{calls:1,triangles:ix.length/3};}};
}
