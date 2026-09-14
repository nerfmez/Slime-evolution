// Small signed-distance silhouettes, evaluated only for the chosen animal.
// Cosmetic shapes/palette; no reward or movement rules live here.
export const expShapes = `
float oval(vec2 p,float x,float y,float rx,float ry){return ellipse(p-vec2(x,y),vec2(rx,ry));}
float disc(vec2 p,float x,float y,float r){return length(p-vec2(x,y))-r;}
float triangle(vec2 p,vec2 a,vec2 b,vec2 c){
 vec2 ba=b-a,cb=c-b,ac=a-c,pa=p-a,pb=p-b,pc=p-c;
 float s=sign(ba.x*ac.y-ba.y*ac.x);
 vec2 d=min(min(vec2(dot(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.),pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.)),s*(pa.x*ba.y-pa.y*ba.x)),
 vec2(dot(pb-cb*clamp(dot(pb,cb)/dot(cb,cb),0.,1.),pb-cb*clamp(dot(pb,cb)/dot(cb,cb),0.,1.)),s*(pb.x*cb.y-pb.y*cb.x))),
 vec2(dot(pc-ac*clamp(dot(pc,ac)/dot(ac,ac),0.,1.),pc-ac*clamp(dot(pc,ac)/dot(ac,ac),0.,1.)),s*(pc.x*ac.y-pc.y*ac.x)));
 return -sqrt(d.x)*sign(d.y);
}
float ear(vec2 p,float x,float y,float w,float h){return triangle(p,vec2(x-w,y),vec2(x+w,y),vec2(x,y+h));}
float paws(vec2 p,float gait){return min(oval(p,-.35+gait*.035,-.46,.19,.10),oval(p,.27-gait*.035,-.46,.17,.10));}
float mammal(vec2 p,float gait){return min(min(oval(p,-.20,-.18,.45,.32),oval(p,.30,.06,.30,.27)),paws(p,gait));}
float beak(vec2 p,float x,float y){return triangle(p,vec2(x,y+.075),vec2(x,y-.065),vec2(x+.19,y-.01));}
float bird(vec2 p,float gait){return min(min(oval(p,-.08,-.12,.44,.39),disc(p,.20,.19,.27)),min(beak(p,.41,.17),paws(p,gait)));}
void expAnimal(vec2 p,float id,float gait,out float body,out float eye,out vec3 base,out float accent,out vec3 ac,out float detail){
 body=10.;eye=10.;accent=10.;detail=10.;base=vec3(.6);ac=vec3(.9,.86,.70);
 if(id<.5){ // 2A: caterpillar. Four bead segments, little feet, leaf-tail.
  for(int k=0;k<4;k++){float x=-.49+float(k)*.27,y=-.16+sin(float(k)*1.2+gait)*.035;body=min(body,disc(p,x,y,.22));body=min(body,oval(p,x,-.43,.09,.055));}
  body=min(body,disc(p,.39,.075,.25));body=min(body,line(p,vec2(.40,.22),vec2(.48,.42),.023));
  accent=oval(p,-.62,.16,.16,.08);body=min(body,accent);eye=length(p-vec2(.49,.12));base=vec3(.59,.73,.31);ac=vec3(.79,.85,.40);
  detail=min(abs(p.x+.24),abs(p.x-.03))-.011;detail=max(detail,abs(p.y+.14)-.16);
 }else if(id<1.5){ // 2B: seed beetle, thick shell and tiny antennae.
  body=min(oval(p,-.13,-.02,.47,.40),disc(p,.39,-.035,.23));
  for(int k=0;k<3;k++){float x=-.42+float(k)*.25;body=min(body,line(p,vec2(x,-.23),vec2(x-.08+gait*.035,-.52),.033));}
  body=min(body,line(p,vec2(.44,.12),vec2(.56,.34),.026));body=min(body,line(p,vec2(.51,.08),vec2(.72,.19),.026));
  accent=min(disc(p,-.33,.14,.10),disc(p,.02,-.12,.11));eye=length(p-vec2(.48,.04));base=vec3(.54,.60,.29);ac=vec3(.82,.76,.40);detail=max(abs(p.x+.13)-.016,abs(p.y)-.29);
 }else if(id<2.5){ // 2C: cricket. Bent jumping legs, long feelers.
  body=min(oval(p,-.13,-.06,.43,.24),disc(p,.39,.10,.22));
  body=min(body,line(p,vec2(-.42,-.12),vec2(-.14,.22),.073));body=min(body,line(p,vec2(-.14,.22),vec2(-.46+gait*.05,-.48),.047));
  body=min(body,line(p,vec2(.22,-.06),vec2(.42,-.43),.029));body=min(body,line(p,vec2(.48,.25),vec2(.68,.62),.019));body=min(body,line(p,vec2(.39,.25),vec2(.24,.67),.019));
  accent=oval(p,-.16,.015,.31,.13);eye=length(p-vec2(.48,.14));base=vec3(.49,.67,.37);ac=vec3(.75,.79,.45);
 }else if(id<3.5){ // 5A: leaf frog. Raised eyes and powerful hind feet.
  body=min(oval(p,-.08,-.16,.49,.32),oval(p,.09,.17,.43,.28));body=min(body,paws(p,gait));body=min(body,disc(p,-.15,.40,.16));body=min(body,disc(p,.31,.39,.16));
  eye=min(length(p-vec2(-.12,.42)),length(p-vec2(.34,.41)));accent=oval(p,.04,-.16,.31,.18);base=vec3(.41,.67,.42);ac=vec3(.82,.85,.49);detail=line(p,vec2(-.06,.13),vec2(.19,.13),.013);
 }else if(id<4.5){ // 5B: lizard. Long tapered tail, toes and dorsal stripe.
  body=min(oval(p,-.06,-.10,.40,.22),oval(p,.40,.015,.30,.21));
  body=min(body,line(p,vec2(-.34,-.10),vec2(-.72,.09),.080));body=min(body,line(p,vec2(-.69,.08),vec2(-.86,.27+gait*.02),.035));
  for(int k=0;k<2;k++){float x=-.24+float(k)*.48;body=min(body,line(p,vec2(x,-.12),vec2(x-.09,-.39),.038));body=min(body,line(p,vec2(x-.14,-.40),vec2(x+.015,-.40),.027));}
  accent=line(p,vec2(-.34,.015),vec2(.28,.11),.044);eye=length(p-vec2(.51,.09));base=vec3(.38,.63,.51);ac=vec3(.83,.82,.46);
 }else if(id<5.5){ // 5C: chick. Fluffy round body, tiny wing and feather sprout.
  body=bird(p,gait);body=min(body,line(p,vec2(.04,.38),vec2(-.07,.59),.061));body=min(body,line(p,vec2(.07,.39),vec2(.18,.60),.049));
  accent=oval(p,-.19,-.08,.20,.16);eye=length(p-vec2(.30,.23));base=vec3(.91,.77,.36);ac=vec3(.98,.87,.54);
 }else if(id<6.5){ // 6A: field mouse. Round ear, nose and long bare tail.
  body=mammal(p,gait);body=min(body,disc(p,.10,.37,.20));body=min(body,line(p,vec2(-.54,-.24),vec2(-.76,-.14),.031));body=min(body,line(p,vec2(-.76,-.14),vec2(-.82,.10+gait*.035),.026));
  accent=disc(p,.10,.39,.12);eye=length(p-vec2(.42,.11));base=vec3(.67,.57,.47);ac=vec3(.90,.69,.64);detail=line(p,vec2(.51,-.02),vec2(.73,.025),.014);
 }else if(id<7.5){ // 6B: sparrow. Pointed tail, brown cap, cream bib.
  body=bird(p,gait);body=min(body,triangle(p,vec2(-.36,-.14),vec2(-.79,.04),vec2(-.62,-.29)));
  accent=min(oval(p,-.14,-.08,.25,.20),max(disc(p,.21,.23,.27),-.26+p.y));eye=length(p-vec2(.31,.23));base=vec3(.70,.60,.44);ac=vec3(.44,.36,.27);
  detail=line(p,vec2(-.22,-.06),vec2(-.02,-.14),.019);
 }else if(id<8.5){ // 6C: small crab. Sideways pincers, eye stalks, six legs.
  body=oval(p,0.,-.10,.42,.29);
  for(int k=0;k<3;k++){float y=-.18-float(k)*.12;body=min(body,line(p,vec2(-.30,y),vec2(-.61,y-.13+gait*.025),.030));body=min(body,line(p,vec2(.30,y),vec2(.61,y-.13-gait*.025),.030));}
  body=min(body,line(p,vec2(-.34,.01),vec2(-.62,.24),.058));body=min(body,line(p,vec2(.34,.01),vec2(.62,.24),.058));
  float claws=min(max(disc(p,-.63,.30,.17),-ear(p,-.62,.32,.065,.20)),max(disc(p,.63,.30,.17),-ear(p,.62,.32,.065,.20)));body=min(body,claws);
  body=min(body,line(p,vec2(-.16,.10),vec2(-.19,.35),.035));body=min(body,line(p,vec2(.16,.10),vec2(.19,.35),.035));body=min(body,min(disc(p,-.19,.35,.09),disc(p,.19,.35,.09)));
  eye=min(length(p-vec2(-.19,.37)),length(p-vec2(.19,.37)));accent=oval(p,0.,-.05,.26,.13);base=vec3(.69,.47,.34);ac=vec3(.89,.69,.43);
 }else if(id<9.5){ // 10A: rabbit. Long ears, round tail, pale belly.
  body=mammal(p,gait);body=min(body,oval(p,.12,.47,.105,.37));body=min(body,oval(p,.37,.44,.098,.34));body=min(body,disc(p,-.65,-.10,.145));
  accent=min(oval(p,.12,.49,.047,.24),oval(p,.37,.48,.04,.21));eye=length(p-vec2(.41,.09));base=vec3(.84,.77,.61);ac=vec3(.91,.66,.64);
 }else if(id<10.5){ // 10B: squirrel. Large raised spiral tail, short triangular ears.
  float tail=oval(p,-.52,.14,.25,.45);body=min(mammal(p,gait),tail);body=min(body,ear(p,.13,.26,.10,.28));body=min(body,ear(p,.38,.26,.08,.24));
  accent=oval(p,-.53,.24,.12,.25);detail=line(p,vec2(-.57,-.04),vec2(-.46,.22),.021);eye=length(p-vec2(.41,.11));base=vec3(.77,.47,.28);ac=vec3(.93,.71,.39);
 }else if(id<11.5){ // 10C: hedgehog. Radial jagged mantle, pointed face.
  vec2 q=(p-vec2(-.19,-.11))/vec2(.54,.40);float a=atan(q.y,q.x);body=(length(q)-(1.+.11*cos(a*13.)))*.34;
  body=min(body,oval(p,.36,-.14,.30,.21));body=min(body,paws(p,gait));accent=oval(p,.38,-.12,.25,.16);
  for(int k=0;k<4;k++){float x=-.50+float(k)*.18;detail=min(detail,line(p,vec2(x,-.12),vec2(x+.045,.08),.017));}
  eye=length(p-vec2(.46,-.075));base=vec3(.54,.41,.32);ac=vec3(.88,.74,.54);
 }else if(id<12.5){ // 12A: moss turtle. Domed hex-marked shell and four broad feet.
  body=min(oval(p,-.18,-.05,.49,.41),oval(p,.43,-.21,.28,.21));body=min(body,paws(p,gait));
  accent=oval(p,-.19,.035,.38,.29);detail=abs(length((p-vec2(-.19,.04))/vec2(.24,.18))-1.)*.10-.013;
  detail=min(detail,max(abs(p.x+.19)-.013,abs(p.y-.035)-.24));eye=length(p-vec2(.53,-.145));base=vec3(.43,.52,.35);ac=vec3(.65,.70,.38);
 }else if(id<13.5){ // 12B: mole. Velvety dome, spade claws and pink long nose.
  body=min(oval(p,-.18,-.08,.51,.40),oval(p,.34,-.02,.29,.22));
  body=min(body,oval(p,-.27,-.39,.27,.14));body=min(body,oval(p,.34,-.36,.24,.14));body=min(body,oval(p,.63,-.07,.13,.105));
  accent=min(oval(p,.63,-.07,.13,.105),min(oval(p,-.27,-.39,.24,.09),oval(p,.34,-.36,.21,.09)));
  for(int k=0;k<3;k++)detail=min(detail,line(p,vec2(.21+float(k)*.10,-.34),vec2(.20+float(k)*.10,-.45),.014));
  eye=length(p-vec2(.35,.055));base=vec3(.49,.45,.48);ac=vec3(.85,.62,.57);
 }else if(id<14.5){ // 12C: chipmunk. Upright short tail and two dorsal cream stripes.
  body=mammal(p,gait);body=min(body,oval(p,-.57,.03,.18,.32));body=min(body,disc(p,.13,.31,.12));body=min(body,disc(p,.35,.30,.105));
  accent=min(line(p,vec2(-.48,-.02),vec2(.04,.17),.042),line(p,vec2(-.43,-.17),vec2(.08,.02),.032));eye=length(p-vec2(.42,.10));
  base=vec3(.63,.43,.29);ac=vec3(.94,.83,.62);detail=line(p,vec2(.30,.16),vec2(.57,.05),.014);
 }else if(id<15.5){ // 15A: chinchilla. Oversized ears, plush rounded body and curled tail.
  body=min(mammal(p,gait),disc(p,.02,.41,.24));body=min(body,disc(p,.38,.40,.21));body=min(body,oval(p,-.62,-.03,.15,.27));
  accent=min(disc(p,.02,.43,.14),disc(p,.38,.42,.12));eye=length(p-vec2(.41,.10));base=vec3(.66,.67,.72);ac=vec3(.84,.71,.73);
 }else if(id<16.5){ // 15B: ferret. Long low body, tapered tail and facial mask.
  body=min(oval(p,-.17,-.22,.50,.23),oval(p,.40,.01,.26,.24));body=min(body,disc(p,.26,.24,.12));body=min(body,disc(p,.48,.24,.10));body=min(body,paws(p,gait));
  body=min(body,line(p,vec2(-.49,-.24),vec2(-.82,-.04+gait*.04),.070));accent=oval(p,.41,.065,.21,.077);eye=length(p-vec2(.48,.07));base=vec3(.84,.75,.58);ac=vec3(.39,.32,.28);
 }else if(id<17.5){ // 15C: quail. Round speckled body and curved crown plume.
  body=bird(p,gait);body=min(body,line(p,vec2(.14,.42),vec2(.10,.61),.034));body=min(body,oval(p,.19,.62,.12,.07));
  accent=oval(p,-.13,-.08,.25,.21);for(int k=0;k<3;k++){float x=-.28+float(k)*.14;detail=min(detail,disc(p,x,-.09+mod(float(k),2.)*.12,.037));}
  eye=length(p-vec2(.30,.23));base=vec3(.70,.57,.40);ac=vec3(.89,.78,.57);
 }else if(id<18.5){ // 18A: fennec. Very large pointed ears, brush tail and cream muzzle.
  body=mammal(p,gait);body=min(body,ear(p,.06,.20,.19,.62));body=min(body,ear(p,.39,.22,.18,.57));body=min(body,oval(p,-.59,-.02,.25,.16));
  accent=min(ear(p,.06,.31,.09,.37),ear(p,.39,.32,.082,.32));accent=min(accent,oval(p,.45,-.06,.22,.13));eye=length(p-vec2(.40,.11));base=vec3(.86,.65,.38);ac=vec3(.98,.85,.65);
 }else if(id<19.5){ // 18B: raccoon. Ringed tail, round ears and dark eye mask.
  body=mammal(p,gait);body=min(body,oval(p,-.59,.02,.19,.34));body=min(body,disc(p,.12,.33,.14));body=min(body,disc(p,.40,.31,.12));
  accent=oval(p,.32,.12,.27,.105);for(int k=0;k<3;k++)accent=min(accent,max(oval(p,-.59,.02,.19,.34),abs(p.y-(-.18+float(k)*.18))-.043));
  eye=length(p-vec2(.43,.13));base=vec3(.65,.66,.60);ac=vec3(.29,.32,.31);
 }else if(id<20.5){ // 18C: red panda. Triangular cream ears, drooping thick striped tail.
  body=mammal(p,gait);body=min(body,oval(p,-.63,-.08,.19,.36));body=min(body,ear(p,.09,.25,.14,.27));body=min(body,ear(p,.39,.24,.13,.25));
  accent=min(oval(p,.11,.075,.115,.14),oval(p,.42,.035,.13,.145));accent=min(accent,min(ear(p,.09,.29,.08,.17),ear(p,.39,.28,.07,.16)));
  for(int k=0;k<3;k++)detail=min(detail,max(oval(p,-.63,-.08,.19,.36),abs(p.y-(-.30+float(k)*.20))-.035));eye=length(p-vec2(.42,.095));base=vec3(.78,.39,.27);ac=vec3(.96,.86,.67);
 }else if(id<21.5){ // 30A: leaf fawn. Slender legs, leaf ears and branching antler buds.
  body=min(oval(p,-.16,-.12,.42,.27),oval(p,.26,.22,.23,.28));body=min(body,oval(p,.46,.16,.19,.12));
  for(int k=0;k<2;k++){float x=-.36+float(k)*.57;body=min(body,line(p,vec2(x,-.23),vec2(x+gait*.025,-.54),.060));}
  body=min(body,ear(p,.03,.39,.15,.23));body=min(body,ear(p,.42,.40,.13,.21));body=min(body,line(p,vec2(.16,.42),vec2(.10,.71),.038));body=min(body,line(p,vec2(.31,.43),vec2(.40,.70),.038));
  body=min(body,line(p,vec2(.12,.59),vec2(-.01,.65),.026));body=min(body,line(p,vec2(.36,.58),vec2(.49,.62),.026));
  accent=min(ear(p,.03,.43,.085,.14),ear(p,.42,.43,.07,.13));for(int k=0;k<3;k++)accent=min(accent,disc(p,-.39+float(k)*.17,.015,.036));
  eye=length(p-vec2(.37,.26));base=vec3(.72,.52,.33);ac=vec3(.77,.81,.44);
 }else if(id<22.5){ // 30B: boarlet. Stocky profile, bristly mane, round snout and little tusk.
  body=min(oval(p,-.18,-.08,.49,.34),oval(p,.35,-.09,.27,.28));body=min(body,oval(p,.62,-.14,.13,.17));body=min(body,paws(p,gait));
  body=min(body,ear(p,.21,.10,.15,.30));for(int k=0;k<4;k++)body=min(body,ear(p,-.51+float(k)*.17,.18,.095,.14));
  accent=oval(p,.63,-.14,.12,.145);body=min(body,ear(p,.51,-.35,.058,.20));eye=length(p-vec2(.42,.015));base=vec3(.56,.40,.30);ac=vec3(.79,.60,.48);detail=min(disc(p,.60,-.13,.029),disc(p,.69,-.13,.027));
 }else if(id<23.5){ // 30C: owlet. Broad face discs, brow tufts and folded wings.
  body=min(oval(p,0.,-.15,.42,.40),oval(p,0.,.19,.43,.31));body=min(body,paws(p,gait));body=min(body,ear(p,-.29,.31,.135,.28));body=min(body,ear(p,.29,.31,.135,.28));
  accent=min(oval(p,-.18,.19,.20,.22),oval(p,.18,.19,.20,.22));eye=min(length(p-vec2(-.18,.22)),length(p-vec2(.18,.22)));
  detail=min(line(p,vec2(-.29,-.06),vec2(-.21,-.34),.021),line(p,vec2(.29,-.06),vec2(.21,-.34),.021));body=min(body,beak(p,-.06,.04));base=vec3(.52,.47,.39);ac=vec3(.92,.83,.60);
 }else if(id<24.5){ // 56A: forest dragon. Bat-like leaf wings, curved tail and horns.
  body=mammal(p,gait);body=min(body,line(p,vec2(-.50,-.22),vec2(-.80,.01),.078));body=min(body,ear(p,.13,.28,.075,.27));body=min(body,ear(p,.39,.29,.067,.25));
  float wing=triangle(p,vec2(-.38,-.08),vec2(-.60,.59),vec2(.035,.36));wing=max(wing,-disc(p,-.31,.43,.13));accent=wing;body=min(body,wing);
  detail=line(p,vec2(-.39,.04),vec2(-.54,.43),.020);eye=length(p-vec2(.42,.13));base=vec3(.34,.59,.46);ac=vec3(.67,.77,.37);
 }else if(id<25.5){ // 56B: griffin chick. Feathered wing, eagle beak, lion tail, feather ears.
  body=mammal(p,gait);body=min(body,beak(p,.49,.05));body=min(body,ear(p,.14,.25,.09,.31));body=min(body,line(p,vec2(-.50,-.25),vec2(-.75,-.03),.032));body=min(body,disc(p,-.77,.015,.105));
  float wing=10.;for(int k=0;k<3;k++){float x=-.41+float(k)*.12;wing=min(wing,line(p,vec2(-.25,-.13),vec2(x,.47-float(k)*.08),.090));}accent=wing;body=min(body,wing);
  accent=min(accent,oval(p,.30,.10,.23,.21));eye=length(p-vec2(.42,.14));base=vec3(.79,.57,.30);ac=vec3(.97,.87,.63);
 }else{ // 56C: kirin foal. Single spiral horn, leafy mane and scale-marked flank.
  body=min(oval(p,-.17,-.14,.41,.28),oval(p,.27,.18,.24,.29));body=min(body,oval(p,.46,.095,.20,.13));
  for(int k=0;k<2;k++){float x=-.35+float(k)*.54;body=min(body,line(p,vec2(x,-.25),vec2(x+gait*.02,-.54),.056));}
  body=min(body,ear(p,.10,.36,.13,.22));body=min(body,ear(p,.36,.41,.060,.38));body=min(body,line(p,vec2(-.51,-.17),vec2(-.75,.13),.071));
  float mane=10.;for(int k=0;k<3;k++)mane=min(mane,oval(p,.045,.32-float(k)*.16,.12,.105));accent=mane;body=min(body,mane);
  for(int k=0;k<3;k++)accent=min(accent,oval(p,-.39+float(k)*.16,-.065,.064,.082));eye=length(p-vec2(.39,.23));base=vec3(.71,.78,.63);ac=vec3(.38,.66,.61);detail=line(p,vec2(.335,.57),vec2(.39,.61),.017);
 }
}
`;
