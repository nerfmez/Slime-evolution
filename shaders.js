import {terrainGLSL,CLEARING,DECALS} from './terrain.js';
export const vs=`layout(location=0) in vec3 position;layout(location=1) in vec3 normal;layout(location=2) in vec2 uv;layout(location=3) in vec3 nextPosition;layout(location=4) in vec3 nextNormal;uniform float enemyFrameMix,enemyPalette,slimeStepped;uniform vec3 enemyMotion;uniform mat4 vp,model;uniform float time,kind,outline,fade;uniform vec3 player,jellyMotion,viewDirection;uniform sampler2D grassBendTex;uniform vec4 treeHits[9];out vec3 vLocal;out float vAmbient;out float vBurn;out vec2 vUV;out vec2 vRoot;out vec3 vNormal,vWorld;void main(){vBurn=0.;vAmbient=1.;vec3 p=position,localNormal=normal;vUV=uv;vRoot=normal.xz;
if(kind==0.){
 p=mix(position,nextPosition,enemyFrameMix);localNormal=normalize(mix(normal,nextNormal,enemyFrameMix));
 if(enemyPalette==1.){
  float phase=enemyMotion.x,weight=enemyMotion.y;
  // Rigid weight shift, leaving the shell's shape intact.
  float roll=sin(phase)*.014*weight;
  mat2 tilt=mat2(cos(roll),sin(roll),-sin(roll),cos(roll));
  p.xy=tilt*(p.xy-vec2(0.,.30))+vec2(0.,.30);
  localNormal.xy=tilt*localNormal.xy;
  // Two weighted steps per gait cycle: a slower rise and a shorter landing.
  float stepPhase=fract(phase/3.14159265);
  float lift=smoothstep(0.,.68,stepPhase)*(1.-smoothstep(.68,1.,stepPhase));
  p.y+=lift*.048*weight;
  p.y+=(1.+sin(time*2.1+enemyMotion.z))*.002*(1.-weight*.65);
 }
}
if(kind==2.){vRoot+=model[3].xz;float h=normal.y;float sway=(sin(time*1.3+normal.x*.7+normal.z*.4)*.085+sin(time*2.2+normal.z*1.2)*.018)*h*h;vec2 away=p.xz+model[3].xz-player.xz;float push=(1.-smoothstep(.1,1.,length(away)))*h*h;p.xz+=vec2(sway,sway*.45)+normalize(away+vec2(.001))*push*.45;}
if(kind==19.){
 float phase=normal.z,t=time*.8+phase;
 vec3 center=position+vec3(sin(t*1.13)*.34+sin(t*2.37)*.09,.18+sin(t*1.7)*.16,cos(t*.93)*.30);
 float size=.043+.013*(sin(phase)*.5+.5);
 p=center+vec3(normal.x*size,normal.y*size*.78,-normal.y*size*.63);
 float age=mod(time+phase*3.,14.);
 vAmbient=smoothstep(0.,1.2,age)*(1.-smoothstep(10.,12.,age))*.94;
}
if(kind==20.){
 float phase=normal.z,cycle=27.+phase*.83,age=mod(time+phase*7.1,cycle);
 bool incoming=age>=12.;float localAge=age-(incoming?12.:0.);
 float t=clamp(localAge/2.1,0.,1.),travel=incoming?1.-t:t;
 vec3 route=vec3(sin(phase*2.1)*5.6,.24,cos(phase*2.1)*4.8);
 vec3 center=position+route*travel+vec3(sin(travel*3.14159)*.35,sin(travel*3.14159)*.30,0.);
 // Keep the tiny round body readable from the game camera; orient the beak along flight.
 vec2 heading=normalize(vec2(route.x,-route.z*.63))*(incoming?-1.:1.);
 vec2 sideways=vec2(heading.y,-heading.x);
 float beat=sin(time*87.+phase),wing=uv.x;
 vec2 shape=normal.xy;
 shape.x*=mix(1.,.60+.40*cos(time*87.+phase),wing);
 shape.y+=wing*abs(normal.x)*beat*.37;
 vec2 offset=(sideways*shape.x+heading*shape.y)*.23;
 p=center+vec3(offset.x,offset.y*.78,-offset.y*.63);
 vAmbient=(1.-smoothstep(.90,1.,travel))*step(0.,localAge)*(1.-step(2.1,localAge));
}
if(kind==23.){
 float habitat=floor(normal.z/100.),seed=mod(normal.z,100.),t=time;
 vRoot=vec2(habitat,seed);
 vec3 center=position;float size=.12;
 if(habitat<1.5){
  center+=vec3(sin(t*1.1+seed)*.44,.10*sin(t*2.+seed),cos(t*.9+seed)*.40);
  size=.16;
  vAmbient=smoothstep(0.,1.,mod(t+seed*2.,15.))*(1.-smoothstep(8.,10.,mod(t+seed*2.,15.)));
 }else if(habitat<2.5){
  center+=vec3(sin(t*.85+seed)*.65,sin(t*1.7+seed)*.23,cos(t*.7+seed)*.52);
  size=.14;
  vAmbient=smoothstep(0.,1.,mod(t+seed*1.7,19.))*(1.-smoothstep(10.,12.,mod(t+seed*1.7,19.)));
 }else{
  float age=mod(t+seed*.41,17.);
  center+=vec3(age*.13,sin(age*.24)*.30,sin(seed+age*.3)*.15);
  size=.040+mod(seed,3.)*.012;
  vAmbient=smoothstep(0.,2.,age)*(1.-smoothstep(5.,8.,age))*.38;
 }
 float flap=habitat<2.5?(.32+.68*abs(sin(t*(habitat<1.5?57.:19.)+seed))):1.;
 p=center+vec3(normal.x*size*flap,normal.y*size*.78,-normal.y*size*.63);
}
if(kind==17.){
 float h=normal.y;vec2 away=normal.xz-player.xz;
 float press=1.-smoothstep(.30,1.15,length(away));
 vec2 bend=normalize(away+vec2(.0001,.0002));
 p.y*=1.-press*.92;
 p.xz+=bend*press*.80*h*h;
 p.x+=sin(time*1.2+normal.x*.7+normal.z*.4)*.07*h*h*(1.-press*.85);
}
if(kind==15.){float height=normal.y*normal.y;p.x+=sin(time*.8+position.x*.7)*.024*height;p.xz+=treeHits[int(normal.x)].xy*height;}
if(kind==11.&&uv.x==14.){float h=normal.y;p.x+=sin(time*1.25+position.x*.7+position.z*.4)*.09*h*h;p.z+=sin(time*.95+position.x*.6)*.028*h*h;}
if(kind==11.&&uv.x>=10.&&uv.x<14.){p.y+=sin(time*.85+position.x*.9)*.004;}
if(kind==11.&&uv.x>.5&&uv.x<2.5){p.x+=sin(time*.9+p.z*.8)*.018*max(0.,p.y-.7);}
if(kind==9.){
 float h=clamp(p.y/.49,0.,1.);vec2 away=uv+model[3].xz-player.xz;
 float press=1.-smoothstep(.25,1.02,length(away));
 float sway=(sin(time*1.45+uv.x*.7+uv.y*.4)*.055+sin(time*2.1+uv.y*1.2)*.011)*h*h;
 p.xz+=vec2(sway,sway*.45)*(1.-press*.7)+normalize(away+vec2(.001,.002))*press*.57*h*h;
 p.y*=1.-press*.72;
}
if(kind==3.||kind==4.){float h=p.y/4.4;float a=time*(kind==3.?1.7:2.1)+h*.2;mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));p.xz=rot*p.xz;p.x+=sin(time*1.3+h*4.)*h*h*.10;p.z+=cos(time+h*3.)*h*h*.06;if(kind==3.){float angle=atan(p.z,p.x);p.xz*=1.+sin(angle*3.-h*8.+time*1.4)*.085*h;p.xz*=mix(.72,1.,fade);p.y+=(1.-fade)*.45*h;}}
if(kind==8.&&slimeStepped<.5){
 float h=clamp(p.y/.72,0.,1.);
 float wave=sin(time*2.5+p.y*7.)*.009+sin(time*3.2+p.x*6.+p.z*4.)*.006;
 p.xz*=1.+wave*sin(h*3.14159);
 p.z+=jellyMotion.x*h*h;
 localNormal.y-=normal.z*jellyMotion.x*2.*h/.72;
 p.x+=sin(time*2.0)*.007*h*h;
}
if(kind==2.||kind==17.||kind==9.){
 vec2 root=kind==9.?uv+model[3].xz:normal.xz+(kind==2.?model[3].xz:vec2(0.));
 vec4 bend=texture(grassBendTex,(root+36.)/72.);vBurn=1.-bend.a;
 float h=kind==9.?clamp(position.y,0.,1.):normal.y;
 p.xz+=(bend.rg*255.-128.)/127.*h*h*.80;
 p.y*=1.-bend.b*h*.85;p.y*=bend.a;
}
vLocal=p;
p+=localNormal*outline;vec4 world=model*vec4(p,1.);vWorld=world.xyz;vNormal=normalize(mat3(model)*localNormal);gl_Position=vp*world;

}`;
export const fs=`in vec3 vLocal;in float vAmbient;in float vBurn;in vec2 vUV;in vec2 vRoot;in vec3 vNormal,vWorld;uniform sampler2D tex,canopyTex,clearingTex,meadowTex,grassBendTex;uniform vec3 player,viewDirection,jellyMotion;uniform float enemyLift,enemyPalette,enemyHit;uniform float kind,time,outline,fade;out vec4 color;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}float fbm(vec2 p){return noise(p)*.55+noise(p*2.03)*.28+noise(p*4.1)*.17;}
${terrainGLSL}
// Shared world-space pigment: grass roots and ground use exactly the same colour.
vec3 proceduralMeadow(vec2 p){
 vec2 wash=p*.48+vec2(noise(p*1.7),noise(p*1.7+19.))*.45;
 float pigment=fbm(wash);
 vec3 base=mix(vec3(.61,.72,.45),vec3(.86,.87,.60),smoothstep(.23,.76,pigment));
 float bloom=smoothstep(.48,.78,fbm(p*.16+7.));
 base=mix(base,vec3(.91,.90,.69),bloom*.40);
 // A few olive-gold pigment islands echo the painted wetland grass.
 float shore=min(min(length((p-vec2(9.,-6.))/vec2(6.4,6.8)),length((p-vec2(21.,-23.))/vec2(5.4,8.4))),length((p-vec2(-8.,6.))/vec2(4.8,5.1)));
 float nearby=smoothstep(.42,.72,shore)*(1.-smoothstep(.92,1.42,shore));
 float flecks=smoothstep(.55,.76,noise(p*.92+vec2(21.,7.)));
 base=mix(base,vec3(.78,.79,.43),nearby*flecks*.26);
 float grain=noise(p*22.)-.5;
 base+=grain*.012;
 float edge=abs(max(abs(p.x),abs(p.y))-33.75);
 float inside=1.-smoothstep(32.65,33.54,max(abs(p.x),abs(p.y)));
 base=mix(base,vec3(.65,.83,.77),(1.-inside)*.17);
 return mix(base,vec3(.67,.89,.86),1.-smoothstep(.16,.23,edge));
}
// Static pigment is baked once; sampling replaces layered noise per grass fragment.
vec3 meadow(vec2 p){if(max(abs(p.x),abs(p.y))>39.9)return proceduralMeadow(p);return texture(meadowTex,(p+40.)/80.).rgb;}
float paintedCoverage(sampler2D sourceTex,vec2 uv){vec3 a=texture(sourceTex,uv).rgb;return 1.-smoothstep(-.01,.035,min(a.r,a.b)-a.g);}
vec3 paintedSurface(sampler2D sourceTex,vec2 uv,vec3 floorColor,vec2 worldPoint){
 vec2 sampleUV=uv;
 if(kind==16.){
  float interior=texture(canopyTex,(worldPoint+40.)/80.).b;
  if(interior>0.){
   vec2 flow=vec2(sin(worldPoint.y*2.0+worldPoint.x*.65-time*.95)+.38*sin(worldPoint.x*3.1+time*.63),cos(worldPoint.x*1.85-worldPoint.y*.45-time*.78)+.35*sin(worldPoint.y*2.7+time*.54));
   vec2 span=worldPoint.x>15.6&&worldPoint.y< -14.6?vec2(10.8,16.8):vec2(12.8,13.6);
   sampleUV+=flow*(.035/span)*smoothstep(0.,1.,interior);
   // Periodic local refraction at the two circles already painted into the
   // northern water. No extra ring mesh, colour overlay or bright outlines.
   if(worldPoint.x>15.6&&worldPoint.y< -14.6){
    for(int i=0;i<2;i++){
     vec2 center=i==0?vec2(491.,665.):vec2(329.,1002.);
     vec2 ellipse=vec2(95./1024.,65./1536.);
     vec2 q=(uv-center/vec2(1024.,1536.))/ellipse;
     float radius=length(q);
     if(radius<2.3){
      float age=mod(time+(i==0?0.:3.1),i==0?7.4:8.6);
      float envelope=smoothstep(0.,.35,age)*(1.-smoothstep(1.65,2.8,age));
      float wave=sin(radius*7.-age*6.5)*exp(-pow((radius-age*.60)*1.8,2.));
      sampleUV+=q/max(radius,.001)*ellipse*wave*.075*envelope*smoothstep(0.,.6,interior);
     }
    }
   }
  }
 }
 vec3 art=texture(sourceTex,sampleUV).rgb;
 if(art.b>art.g+.01&&art.r>art.g+.01)return floorColor;
 vec3 c=art;c.r=min(c.r,c.g*1.16);
 float coverage=0.;
 for(int i=0;i<8;i++){float a=float(i)*.785398;coverage+=paintedCoverage(sourceTex,uv+vec2(cos(a),sin(a))*.067);}
 float join=smoothstep(.48,1.,coverage*.125);
 float foliage=smoothstep(.80,1.01,art.g/max(art.r,.01))*smoothstep(.12,.26,art.g-art.b);
 vec3 matched=floorColor*(.98+(dot(c,vec3(.3,.6,.1))-.60)*.30);
 float waterMask=0.;
 if(worldPoint.x>15.6&&worldPoint.x<26.4&&worldPoint.y>-31.4&&worldPoint.y< -14.6)waterMask=texture(canopyTex,(worldPoint+40.)/80.).g;
 c=mix(c,matched,foliage*.86*(1.-waterMask));
 join=mix(join,1.,waterMask);
 return mix(floorColor,c,join);
}
vec3 groundPigment(vec2 p){
 vec3 base=meadow(p);
 vec2 uv=(p-vec2(${CLEARING.x.toFixed(1)},${CLEARING.z.toFixed(1)}))/vec2(${(CLEARING.rx*2).toFixed(1)},${(CLEARING.rz*2).toFixed(1)})+.5;
 if(all(greaterThan(uv,vec2(0.)))&&all(lessThan(uv,vec2(1.))))return paintedSurface(clearingTex,uv,base,p);
 return base;
}
// One directional light and one toon ramp for both the player and enemies.
const vec3 SUN_DIRECTION=vec3(.65,1.,-.45);
vec3 characterLighting(vec3 N,float worldHeight){
 float light=dot(N,normalize(SUN_DIRECTION));
 // Pigment bleeding is anchored to the body, so the edge cannot crawl as it walks.
 float feather=.03;
 if(kind==8.||kind==0.){
  vec2 pigment=vLocal.xz*13.+vec2(vLocal.y*8.,-vLocal.y*11.);
  float bleed=noise(pigment)*.65+noise(pigment*2.1+7.)*.35;
  light+=(bleed-.5)*.085;
  feather=.105+bleed*.055;
 }
 float low=smoothstep(-.07-feather,-.07+feather,light);
 float mid=smoothstep(.32-feather,.32+feather,light);
 float high=smoothstep(.69-feather,.69+feather,light);
 // Meadow palette: sage-grey shade, soft green reflected light, warm ivory sun.
 vec3 shade=vec3(.54,.63,.60)+low*vec3(.21,.17,.13)+mid*vec3(.21,.19,.15)+high*vec3(.12,.09,.08);
 float bounce=(1.-smoothstep(.02,.58,worldHeight))*.05;
 if(kind==8.)shade=mix(shade,vec3(1.),.075);
 return shade+vec3(.45,.55,.28)*bounce;
}
void main(){vec3 c;float alpha=1.;if((kind==2.||kind==17.||kind==9.)&&vBurn>.98)discard;if(kind==22.){color=vec4(proceduralMeadow(vWorld.xz),1.);return;}if(outline>0.){if(kind==8.&&abs(dot(normalize(vNormal),normalize(viewDirection)))>.24)discard;color=kind==8.?vec4(.075,.18,.19,.90):vec4(.075,.18,.19,1.);return;}
if(kind==8.){
 vec3 N=normalize(vNormal),V=normalize(viewDirection);
 float facing=max(0.,dot(N,V)),rim=1.-facing;
 float height=clamp(vLocal.y/.72,0.,1.);
 // Clear sky-blue shell with a distinct liquid mass suspended inside it.
 c=mix(vec3(.43,.71,.82),vec3(.64,.82,.86),smoothstep(.03,.92,height));
 float wave=.31+.027*sin(vLocal.x*10.+time*1.6)+.018*sin(vLocal.z*8.-time*1.1);
 float water=1.-smoothstep(wave-.026,wave+.026,vLocal.y+jellyMotion.x*vLocal.z*.7);
 c=mix(c,vec3(.29,.61,.78),water*.55);
 // Looking through the shell to the blue pool at its base gives it depth.
 vec3 rel=vWorld-player;
 float ray=(rel.y-.065)/max(V.y,.12);
 vec2 floorPoint=rel.xz-V.xz*ray*.78;
 float pool=1.-smoothstep(.31,.415,length(floorPoint));
 c=mix(c,vec3(.22,.49,.66),pool*.34);
 vec3 L=normalize(SUN_DIRECTION),lighting=characterLighting(N,vWorld.y);
 float light=dot(N,L),sunlit=smoothstep(-.10,.35,light);
 c*=lighting;
 // The gel rim receives the same shade; the reflection follows the sun.
 float innerRim=smoothstep(.57,.87,rim)*(1.-smoothstep(.94,1.,rim));
 c=mix(c,vec3(.69,.86,.86)*lighting,innerRim*(.24+.52*sunlit));
 vec3 right=normalize(cross(vec3(0.,1.,0.),V)),up=normalize(cross(V,right));
 vec3 H=normalize(V+L);
 float spec=dot(N,H);
 float streak=smoothstep(.938,.959,spec)*sunlit;
 float halo=smoothstep(.87,.953,spec)*sunlit;
 c=mix(c,vec3(.83,.91,.87),halo*.26);
 c=mix(c,vec3(.95,.97,.89),streak*.86);
 vec2 bubbleLight=normalize(vec2(dot(L,right),dot(L,up)))*.46;
 // A few small submerged bubbles: rim plus soft interior, viewed through blue.
 for(int i=0;i<3;i++){
  float fi=float(i);
  vec3 bubble=i==0?vec3(-.24,.17,.14):i==1?vec3(.10,.33,.02):vec3(.26,.14,.03);
  bubble.y+=sin(time*1.4+fi)*.012;
  vec3 delta=rel-bubble;
  vec2 q=vec2(dot(delta,right),dot(delta,up));
  float r=.023+mod(fi,2.)*.007,d=length(q)/r;
  float ring=smoothstep(.70,.87,d)*(1.-smoothstep(.94,1.06,d));
  c=mix(c,vec3(.63,.81,.86)*lighting,ring*.60);
  float gleam=1.-smoothstep(.10,.29,length(q/r-bubbleLight));
  c=mix(c,vec3(.91,.95,.88)*lighting,gleam*.75);
 }
 alpha=.91+streak*.08;

}
else if(kind==0.){
 vec3 source=texture(tex,vUV).rgb;
 // Preserve every texture region's original hue and relative contrast.
 // Select only moss greens / crystal blues; retain skin, shell and stone regions.
 if(enemyPalette==1.){
  float moss=smoothstep(.025,.16,source.g-max(source.r,source.b));
  // Pale stone on the upper shell only; exclude green moss and the head/legs.
  float shell=smoothstep(.36,.54,vLocal.y)*(1.-smoothstep(.25,.48,vLocal.z));
  float stoneValue=dot(source,vec3(.30,.59,.11));
  float stone=shell*(1.-moss)*smoothstep(.30,.52,stoneValue);
  stone*=1.-smoothstep(.10,.22,source.r-source.g);
  vec3 chalk=vec3(.94,.95,.96)*(stoneValue*.68+.30);
  source=mix(source,chalk,stone*.90);
  source=mix(source,source*vec3(1.07,.91,1.12)+vec3(.018,.008,.018),moss*.75);
 }else if(enemyPalette==2.){
  float crystal=smoothstep(.10,.35,source.b-source.r)*smoothstep(.24,.55,source.g);
  float luma=dot(source,vec3(.30,.59,.11));
  vec3 mineral=mix(source,vec3(luma),.24)*vec3(.98,1.02,.91)+vec3(.035,.012,.008);
  source=mix(source,mineral,crystal);
 }
 float value=dot(source,vec3(.30,.59,.11));
 vec3 paint=mix(source,vec3(value),.12);
 paint=mix(paint,sqrt(max(paint,vec3(0.))),enemyLift);
 c=paint*mix(characterLighting(normalize(vNormal),vWorld.y),vec3(1.),.15);
 c=mix(c,vec3(1.,.85,.55),enemyHit*.40);

}
else if(kind==1.){c=meadow(vWorld.xz);}
else if(kind==16.||kind==17.){
 vec4 art=texture(tex,vUV);
 if(art.b>art.g+.01&&art.r>art.g+.01)discard;
 c=art.rgb;c.r=min(c.r,c.g*1.16);
 if(kind==16.){
  c=paintedSurface(tex,vUV,meadow(vWorld.xz),vWorld.xz);
  // Motion comes only from sampling the painted water at gently warped UVs.
 }else{
  // Depth alone cannot stop a leaf plane cutting through the jelly volume.
  // Clip only the interior after bending; visible leaves remain around its feet.
  vec3 jelly=(vWorld-player-vec3(0.,.29,0.))/vec3(.55,.34,.52);
  if(dot(jelly,jelly)<1.)discard;
  float height=clamp((.835-vUV.y)/.735,0.,1.);
  vec3 rootColor=groundPigment(vRoot);
  float pigment=dot(c,vec3(.3,.6,.1));
  vec3 leafColor=mix(rootColor*(.79+pigment*.31),c,.42);
  c=mix(rootColor,leafColor,smoothstep(.04,.52,height));
 }

}
else if(kind==2.){
 float mask=texture(tex,vUV).r;if(mask<.085)discard;
 vec3 inside=(vWorld-player-vec3(0.,.29,0.))/vec3(.49,.35,.49);
 if(dot(inside,inside)<1.&&vWorld.y>.025)discard;


 float h=1.-vUV.y;
 vec3 base=groundPigment(vRoot);
 float tip=smoothstep(.22,1.,h);
 float variation=(hash(vRoot)-.5)*.025;
 // No root darkening, per-tuft tint or mask shading at the ground seam.
 c=base+tip*(vec3(.040,.035,.012)+variation+(mask-.5)*.018);

}
else if(kind==9.){
 vec3 jelly=(vWorld-player-vec3(0.,.29,0.))/vec3(.49,.34,.49);if(dot(jelly,jelly)<1.)discard;
 vec3 base=meadow(vUV);
 vec3 pigment=vRoot.x<.5?base*vec3(.88,.92,.84):vRoot.x<1.5?vec3(.94,.93,.79):vRoot.x<2.5?vec3(.88,.81,.49):vRoot.x<3.5?vec3(.76,.67,.36):vec3(.76,.74,.82);
 c=mix(base,pigment,vRoot.x<.5?.65:.83);c+=(noise(vWorld.xz*64.)-.5)*.026;
}
else if(kind==15.){vec4 paint=texture(tex,vUV);float chroma=max(paint.r,max(paint.g,paint.b))-min(paint.r,min(paint.g,paint.b));if(paint.a<.45||chroma<.14)discard;c=mix(paint.rgb,vec3(dot(paint.rgb,vec3(.2126,.7152,.0722))),.12);}
else if(kind==11.){
 float type=vUV.x;
 if(type>=10.){
  if(type==14.){
   float h=clamp(vWorld.y,0.,1.);
   c=mix(vec3(.40,.48,.25),vec3(.69,.71,.41),smoothstep(.05,1.,h));
  }else if(type==10.||type==11.){
   c=type==10.?vec3(.56,.66,.33):vec3(.69,.73,.43);
   c+=(noise(vWorld.xz*24.)-.5)*.055;
  }else if(type==12.){c=vec3(.96,.91,.72);}
  else {c=vec3(.29,.43,.32);}
 }else{
  vec3 pigment=type<.5?vec3(.48,.39,.25):type<1.5?vec3(.43,.55,.31):type<2.5?vec3(.65,.71,.40):vec3(.67,.66,.52);
  float light=dot(normalize(vNormal),normalize(vec3(.65,1.,-.45)));
  float band=smoothstep(-.2,.1,light)*.14+smoothstep(.4,.65,light)*.13;
  float brush=fbm(vWorld.xz*10.+vWorld.y*3.);
  c=pigment*(.86+band)+(brush-.5)*vec3(.09,.09,.05);
  if(type>2.5){
   // Warm limestone, matching the painted shoreline boulders; no moss tint.
   c=mix(vec3(.46,.45,.40),vec3(.70,.68,.57),smoothstep(-.24,.35,light+(brush-.5)*.12));
   c=mix(c,vec3(.87,.83,.67),smoothstep(.40,.90,light+(brush-.5)*.10));
   c+=(brush-.5)*vec3(.075,.068,.054);
  }
 }

}
else if(kind==3.){float h=vUV.y;float angle=vUV.x*6.283185;vec2 circular=vec2(cos(angle),sin(angle));float f=fbm(circular*2.8+vec2(h*3.,h*6.-time*1.65));float bands=sin(angle*3.+h*23.-time*4.+(f-.5)*2.)*.5+.5;float cut=.24+smoothstep(.65,1.,h)*.44;float coverage=f*.55+bands*.45;float dissolve=(1.-fade)*(1.05+(1.-h)*.25);if(coverage<cut+dissolve||h>.99||fade<=.001)discard;float hot=smoothstep(.3,.76,coverage)+(1.-h)*.24;c=mix(vec3(.68,.23,.105),vec3(.97,.52,.17),smoothstep(.25,.55,hot));c=mix(c,vec3(1.,.89,.58),smoothstep(.79,1.07,hot));alpha=1.;}
else if(kind==4.){float edge=sin(vUV.y*3.14159);float ends=smoothstep(0.,.18,vUV.x)*(1.-smoothstep(.72,1.,vUV.x));c=vec3(1.,.94,.73);alpha=edge*ends*.88*fade;}
else if(kind==5.){vec2 p=vUV*2.-1.;float r=length(p);float a=atan(p.y,p.x);float ring=exp(-pow((r-.64)*9.,2.));float sweep=.55+.45*sin(a*3.+r*9.-time*4.);c=vec3(1.,.40,.035);alpha=ring*sweep*.30*fade;}
else if(kind==19.){float r=length(vUV*2.-1.);alpha=(1.-smoothstep(.48,1.,r))*vAmbient;c=mix(vec3(1.,.98,.85),vec3(.60,.65,.43),smoothstep(.35,.85,r)*.48);if(alpha<.015)discard;}
else if(kind==23.){
 vec2 q=vUV*2.-1.;float shape;
 if(vRoot.x<1.5){
  float body=1.-smoothstep(.065,.14,abs(q.x));body*=1.-smoothstep(.65,.94,abs(q.y));
  float wings=1.-smoothstep(.65,1.,pow(abs(q.x)/.92,2.)+pow((abs(q.y)-.24)/.19,2.));
  shape=max(body,wings*.68);c=mix(vec3(.62,.76,.70),vec3(.24,.38,.34),body);
 }else if(vRoot.x<2.5){
  float wings=1.-smoothstep(.66,1.,pow((abs(q.x)-.43)/.52,2.)+pow((q.y-.08)/.74,2.));
  float body=(1.-smoothstep(.05,.10,abs(q.x)))*(1.-smoothstep(.48,.68,abs(q.y)));
  shape=max(wings,body);c=mix(mod(vRoot.y,3.)<1.?vec3(.86,.78,.51):vec3(.96,.91,.73),vec3(.40,.40,.25),body*.8);
 }else{shape=1.-smoothstep(.12,1.,length(q));c=vec3(.85,.78,.58);}
 alpha=shape*vAmbient;if(alpha<.015)discard;
}
else if(kind==28.){
 float flame=fbm(vLocal.xz*5.+vec2(vLocal.y*4.,-time*6.));
 c=mix(vec3(.82,.10,.018),vec3(1.,.50,.035),smoothstep(.22,.60,flame));
 c=mix(c,vec3(1.,.90,.38),smoothstep(.58,.77,flame));
}
else if(kind==29.){c=vec3(1.,.95,.65);}
else if(kind==30.){float shade=dot(normalize(vNormal),normalize(SUN_DIRECTION));c=mix(vec3(.60,.60,.55),vec3(.91,.90,.80),smoothstep(-.3,.7,shade));alpha=fade;}
else if(kind==31.){float r=length(vUV*2.-1.);if(r>1.)discard;float n=noise(vWorld.xz*6.+vec2(time*1.5,-time*2.));c=mix(vec3(.66,.18,.035),vec3(1.,.64,.12),n);alpha=(1.-smoothstep(.55,1.,r))*fade*.76;}
else if(kind==32.){float light=dot(normalize(vNormal),normalize(SUN_DIRECTION));c=mix(vec3(.15,.52,.60),vec3(.70,.98,.90),smoothstep(-.5,.7,light));alpha=fade;}
else if(kind==33.){float r=length(vUV*2.-1.);alpha=(1.-smoothstep(.025,.11,abs(r-.78)))*fade*.8;c=vec3(1.,.80,.38);}
else if(kind==27.){
 float light=dot(normalize(vNormal),normalize(SUN_DIRECTION));
 c=mix(vec3(.19,.42,.62),vec3(.67,.88,.91),smoothstep(-.45,.8,light));
 c=mix(c,vec3(.90,.96,.91),smoothstep(.81,.96,light)*.45);alpha=fade;
}
else if(kind==26.){vec2 q=vUV*2.-1.;float r=length(q);if(r>1.)discard;alpha=(1.-smoothstep(.5,1.,r))*fade;c=mix(vec3(.88,.83,1.),vec3(.51,.41,.70),r);}
else if(kind==20.){alpha=vAmbient*.90;c=mix(vec3(.30,.38,.30),vec3(.43,.48,.36),vUV.x);if(alpha<.015)discard;}
else if(kind==6.){float r=length(vUV*2.-1.);c=vec3(.30,.39,.24);alpha=(1.-smoothstep(.05,1.,r))*.24*fade;}
else {c=vec3(1.,.62,.08);alpha=fade;}
// The same baked canopy field shades ground, live grass, props and characters.
// One small texture lookup; no extra shadow pass or per-tree fragment loops.
if(kind==0.||kind==1.||kind==2.||kind==8.||kind==9.||kind==11.||kind==16.||kind==17.){
 vec2 shadowPoint=vWorld.xz-vec2(.65,-.45)*max(vWorld.y,0.);
 vec4 shadeField=texture(canopyTex,(shadowPoint+40.)/80.);float shade=shadeField.r;
 vec3 shadowTint=(kind==11.&&vUV.x>2.5&&vUV.x<10.)?vec3(.64,.63,.59):vec3(.61,.71,.66);
 c*=mix(vec3(1.),shadowTint,shade);
 if(kind==1.||kind==16.||kind==2.||kind==17.||kind==9.){
  c*=mix(vec3(1.),vec3(.62,.63,.55),shadeField.a*(1.-smoothstep(.12,.85,vWorld.y)));
 }
}
// A shared contact shadow reaches the floor and the short grass above it.
if((kind==1.||kind==16.||kind==2.||kind==17.)&&abs(vWorld.x-player.x)<2.3&&abs(vWorld.z-player.z)<1.7){
 vec2 contact=(vWorld.xz-player.xz)/vec2(.48,.36);
 vec2 shadowOffset=(vWorld.xz-player.xz-vec2(-.38,.27))/vec2(.98,.66);
 float core=exp(-dot(contact,contact)*2.1)*.55;
 float penumbra=exp(-dot(shadowOffset,shadowOffset)*1.8)*.52;
 float cover=1.-(1.-core)*(1.-penumbra);
 float receiver=1.-smoothstep(.035,.65,vWorld.y);
 c*=mix(vec3(1.),vec3(.38,.48,.35),cover*receiver);
}
float fog=smoothstep(16.,34.,length(vWorld.xz-player.xz));c=mix(c,vec3(.87,.88,.67),fog);if(kind==1.||kind==16.){float burned=1.-texture(grassBendTex,(vWorld.xz+36.)/72.).a;c=mix(c,vec3(.19,.15,.115),burned*.78);}if(kind==2.||kind==17.||kind==9.)c=mix(c,vec3(.24,.20,.13),vBurn*.7);
color=vec4(c,alpha);}`;
