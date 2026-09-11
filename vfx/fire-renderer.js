import {createSunfallRenderer} from './sunfall-renderer.js';
import {createInfernoRenderer} from './inferno-renderer.js';
import {materials as sourceMaterials} from './materials.js';
import {meadowMaterials,FIRE_COLORS} from './theme.js';
import {createFlameBatch} from './flame-batch.js';
const materials=meadowMaterials(sourceMaterials);
import {program,geometry,render,uniform} from '../gl.js';
import {model,mul} from '../math.js';
const clamp=x=>Math.max(0,Math.min(1,x)),win=(t,a,b)=>clamp((t-a)/(b-a)),smooth=x=>x*x*(3-2*x),mix=(a,b,t)=>a+(b-a)*t;
export function blobState(t,i){
 const fire=[[0,.42,0],[-.38,.66,.14],[.42,.56,-.18],[.06,.92,.18]],smoke=[[0,.78,0],[-.66,1.20,.26],[.74,1.02,-.32],[.10,1.62,.32]],r=[.62,.46,.42,.36],delay=[0,.035,.055,.080];
 const soot=win(t,.28,.66),heat=1-win(t,.20,.66),drift=smooth(win(t,.28,1.5)),tail=smooth(win(t,1.16,1.5));
 return {position:fire[i].map((v,j)=>mix(v,smoke[i][j],drift)),radius:r[i],grow:Math.min(1.9,(1-(1-win(Math.max(0,t-delay[i]),0,.12))**3)*(1+.48*smooth(win(t,.12,1.5)))*mix(1,.08,tail)),soot,heat,fade:1-smooth(win(t,1.38,1.5)),churn:.65*Math.min(t,.28)+.365*Math.max(0,Math.min(t-.28,.38))+.08*Math.max(0,t-.66)};
}
export function createFireRenderer(gl,fireTexture,atlasTexture,betweenTexture,laterTexture,sunTexture){
 const sunfall=createSunfallRenderer(gl,sunTexture);
 const flames=createFlameBatch(gl),inferno=createInfernoRenderer(gl,fireTexture,atlasTexture,betweenTexture,laterTexture);
 const shaders=Object.fromEntries(Object.entries(materials).map(([k,v])=>[k,{...v,p:program(gl,v.vs,v.fs)}]));
 function mesh(p,n,u,ix){return geometry(gl,p,n,u,ix);}
 function sphere(rows,sides,radius=1){const p=[],n=[],u=[],ix=[];for(let j=0;j<=rows;j++)for(let k=0;k<=sides;k++){const a=k/sides*Math.PI*2,b=j/rows*Math.PI,x=Math.sin(b)*Math.cos(a),y=Math.cos(b),z=Math.sin(b)*Math.sin(a);p.push(x*radius,y*radius,z*radius);n.push(x,y,z);u.push(k/sides,j/rows);if(j<rows&&k<sides){const q=j*(sides+1)+k;ix.push(q,q+1,q+sides+1,q+1,q+sides+2,q+sides+1);}}return mesh(p,n,u,ix);}
 const volume=sphere(10,20),small=sphere(5,8),solar=sphere(12,24),rock=sphere(5,9,.30);
 const plane=mesh([-1,0,-1,1,0,-1,1,0,1,-1,0,1],[0,1,0,0,1,0,0,1,0,0,1,0],[0,0,1,0,1,1,0,1],[0,2,1,0,3,2]);
 const p=[],n=[],u=[],ix=[];for(let row=0;row<=6;row++)for(let side=0;side<=32;side++){const t=row/6,a=side*Math.PI*2/32,r=.12+t*.88;p.push(Math.cos(a)*r,Math.sin(t*Math.PI)*(.55+.20*Math.sin(a*5)),Math.sin(a)*r);n.push(0,1,0);u.push(side/32,t);if(row<6&&side<32){const q=row*33+side;ix.push(q,q+33,q+1,q+1,q+33,q+34);}}
 const crown=mesh(p,n,u,ix);
 function tongue(curved){const p=[],n=[],u=[],ix=[];for(let row=0;row<=10;row++){const t=row/10,w=(curved?.12:.105)*(1-t),x=curved?1+Math.sin(t*Math.PI)*.28:0,y=t*(curved?.75:1.8);for(const side of [-1,1]){p.push(x,y,w*side);n.push(1,0,0);u.push((side+1)/2,t);}if(row<10){const q=row*2;ix.push(q,q+1,q+2,q+1,q+3,q+2);}}return mesh(p,n,u,ix);}
 const corona=tongue(true),wake=tongue(false);
 const ribbon={p:program(gl,`layout(location=0) in vec3 position;layout(location=2) in vec2 uv;uniform mat4 vp,model;uniform float clock;out vec2 vUV;void main(){vec3 p=position;p.z+=sin(uv.y*9.-clock*7.)*uv.y*.06;vUV=uv;gl_Position=vp*model*vec4(p,1.);}`,`in vec2 vUV;uniform vec4 tint;out vec4 color;void main(){float edge=abs(vUV.x*2.-1.);float a=(1.-smoothstep(.65,1.,edge))*(1.-smoothstep(.68,1.,vUV.y))*tint.a;if(a<.03)discard;vec3 c=mix(tint.rgb,vec3(1.,.9,.60),(1.-edge)*(1.-vUV.y));color=vec4(c,a);}`),types:{tint:'vec4'},defaults:{tint:[.94,.43,.14,.9]}};
 shaders.ribbon=ribbon;
 // Unshaded material equivalent to StandardMaterial3D in the original scene.
 const plain={p:program(gl,'layout(location=0) in vec3 position;uniform mat4 vp,model;void main(){gl_Position=vp*model*vec4(position,1.);}','uniform vec4 tint;out vec4 color;void main(){color=tint;}'),types:{tint:'vec4'},defaults:{tint:[1,.52,.055,1]}};
 shaders.plain=plain;
 let vp,clock,view,calls=0,triangles=0;
 function draw(name,g,m,params={},blend=false){const sh=shaders[name];gl.useProgram(sh.p);gl.disable(gl.CULL_FACE);gl.depthMask(!blend);if(blend){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);}else gl.disable(gl.BLEND);
  uniform(gl,sh.p,'vp',vp);uniform(gl,sh.p,'model',m);uniform(gl,sh.p,'clock',clock);uniform(gl,sh.p,'viewDirection',view);
  for(const [key,defaultValue] of Object.entries(sh.defaults)){const value=params[key]??defaultValue,type=sh.types[key];if(type==='bool'||type==='int'){sh.intLocations??=new Map();if(!sh.intLocations.has(key))sh.intLocations.set(key,gl.getUniformLocation(sh.p,key));const loc=sh.intLocations.get(key);if(loc!==null)gl.uniform1i(loc,Number(value));}else uniform(gl,sh.p,key,value);}
  render(gl,g);calls++;triangles+=g.count/3;
 }
 function solid(g,m,tint){draw('plain',g,m,{tint},tint[3]<1);}
 function rotated(m,angle){const c=Math.cos(angle),s=Math.sin(angle);return mul(m,new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1]));}
 function seed(p){const age=Math.max(0,1.8-p.life),pulse=1+Math.sin(age*14)*.06,yaw=Math.atan2(p.vx||p.tx-p.x||0,p.vz||p.tz-p.z||1);
  if(p.ember){flames.add(p.x,p.y,p.z,.085,.23,age*3+p.vx,Math.min(1,p.life/.2));return;}
  // Luminous seed with an irregular, shaded silhouette and two rising tongues.
  const root=model(p.x,p.y+.07,p.z,.80*pulse,.80*pulse,1.4*pulse,yaw);
  draw('fire_volume',volume,mul(root,model(0,0,0,.24,.23,.27)),{...FIRE_COLORS,bulge:.25,blob_seed:3.7,churn:age*.9,ink:.16});
  for(let i=0;i<2;i++)flames.add(p.x+(i?-.10:.10),p.y+.08,p.z,.11,.34+i*.09,i*2.4+age,.92);
  if(p.s.embers)for(let i=0;i<Math.min(p.s.embers,5);i++){const a=age*6+i*2.4;flames.add(p.x+Math.cos(a)*.27,p.y+.05+Math.sin(a)*.08,p.z+Math.sin(a)*.27,.034,.12,i,.9);}
 }
 function fall(e){const sun=e.type==='sun',flight=sun?.50:Math.min(.42,e.delay),elapsed=Math.max(0,e.age-(e.delay-flight));if(e.age<e.delay-flight)return;const t=clamp(elapsed/flight),f=t**(sun?2.7:1.15),r=e.s.radius,angle=43*Math.PI/180,back=[Math.cos(angle)*1.8,4,Math.sin(angle)*1.8];
  const size=sun?r*.48*mix(.85,1,smooth(win(t,0,.3))):Math.max(.65,Math.min(1.3,r)),x=e.x+(sun?0:back[0]*(1-f)),y=sun?mix(4+size,size*.55,f):back[1]*(1-f)+.12,z=e.z+(sun?0:back[2]*(1-f));
  draw('celestial_fire',sun?solar:rock,model(x,y,z,size,size*(sun?1:1.25),size*(sun?1:.88),t*2.7),{rock:!sun,age:elapsed});
  draw('fire_ground',plane,model(e.x,.035,e.z,r*.9*mix(.75,1,t),1,r*.9*mix(.75,1,t)),{style:1,fade:.23},true);
  for(let i=0;i<(sun?7:3);i++){let m;if(sun)m=rotated(model(x,y,z,size,size,size,i*Math.PI*2/7+elapsed*.55),i*1.7);else{m=model(x,y+.20,z,size,size*.75,size,-angle);m=rotated(m,-Math.atan(.45));m=mul(m,model(0,0,0,1,1,1,i*Math.PI*2/3));}draw('ribbon',sun?corona:wake,m,{tint:[.94,.43,.14,.85]},true);}
 }
 function impact(f){const t=f.age,r=f.r,sun=f.type==='sun',meteor=f.type==='meteor';
  if(!sun&&!meteor){
   if(t<.13)solid(small,model(f.x,.12,f.z,r*.3*(1-t/.13),r*.2,r*.3),[1,.98,.90,1-t/.13]);
   for(let i=0;i<4;i++){const b=blobState(t,i);if(b.grow<.025||b.fade<=0)continue;draw('fire_volume',volume,model(f.x+b.position[0]*r,b.position[1]*r,f.z+b.position[2]*r,b.radius*r,b.radius*r,b.radius*r,[0,1.10,2.30,4.05][i]+t*.10),{grow:b.grow,heat:b.heat,soot:b.soot,fade:b.fade,churn:b.churn,blob_seed:[0,3.7,8.1,14.6][i],...FIRE_COLORS});}
   if(t<.44)draw('ground_flare',plane,model(f.x,.035,f.z,1.3*r,1,1.3*r),{grow:(1-(1-win(t,0,.09))**2.2)*(1+.20*win(t,0,.44)),fade:1-win(t,.16,.44),seed:.47},true);
  }
  if(t<.42){const expansion=r*mix(.16,1.16,1-(1-win(t,0,.42))**2);draw('fire_ground',plane,model(f.x,.075,f.z,expansion,1,expansion),{style:1,fade:1-smooth(win(t,.15,.42))},true);}
  if(sun||meteor){const duration=sun?.55:.4,p=clamp(t/duration),spread=r*mix(.18,1.15,1-(1-p)**3);if(p<1)draw('fire_impact_crown',crown,model(f.x,.055,f.z,spread,Math.max(.01,Math.sin(p*Math.PI)*(sun?.65:.38)*r),spread),{age:t,fade:1-smooth(win(p,.25,1)),dust:meteor},true);
   if(meteor&&t<2.4)draw('fire_ground',plane,model(f.x,.023,f.z,r*.82,1,r*.82),{style:0,age:t,fade:1-smooth(win(t,1.7,2.4))},true);
   // The impact retains a hot center before lifting into sage/ivory smoke.
   for(let i=0;i<(sun?4:2);i++){const b=blobState(t,i),spread=sun?.68:.46;if(b.grow<.025||b.fade<=0)continue;
    draw('fire_volume',volume,model(f.x+b.position[0]*r*spread,b.position[1]*r*spread,f.z+b.position[2]*r*spread,b.radius*r*spread,b.radius*r*spread,b.radius*r*spread,i*1.7),{...FIRE_COLORS,grow:b.grow,heat:b.heat,soot:b.soot,fade:b.fade,churn:b.churn,blob_seed:3.7+i*4.1});
   }
  }
  if(t<.8)for(let i=0;i<(sun?9:meteor?4:6);i++){const a=i*2.39996,speed=r*(.65+(i%3)*.22),h=.15+(1.6+(i%3)*.4)*t-2.7*t*t;flames.add(f.x+Math.cos(a)*speed*t,h,f.z+Math.sin(a)*speed*t,.035,.14+i%2*.07,i,1-smooth(win(t,.3,.8)));}

 }
 return {draw(combat,matrix,time,direction,visible,enemies=[],preview=false){vp=matrix;clock=time;view=direction;calls=0;triangles=0;flames.reset();

  for(const e of combat.events)if(e.type!=='sun'&&visible(e.x,e.z,5))fall(e);
  for(const f of combat.fx)if(f.type!=='sun'&&f.type!=='death'&&f.type!=='blast'&&visible(f.x,f.z,f.r*2+1))impact(f);
  for(const c of combat.cyclones)if(visible(c.x,c.z,4)){
   const fade=Math.min(1,c.age/.3,c.life/.4);draw('fire_ground',plane,model(c.x,.045,c.z,c.r,1,c.r),{style:1,fade:fade*.55},true);
   for(let i=0;i<12;i++){const h=(time*.46+i/12)%1,a=i*2.4-time*3.1,r=(.12+Math.pow(h,1.28)*1.25)*c.r/1.4;flames.add(c.x+Math.cos(a)*r,h*3.7,c.z+Math.sin(a)*r,.035,.15,i,fade*(1-h)*.8);}
  }
  for(const e of enemies)if(e.hp>0&&e.burnTime>0&&visible(e.x,e.z,1))for(let i=0;i<2;i++){const a=time*1.3+i*Math.PI;flames.add(e.x+Math.cos(a)*e.radius*.75,.25,e.z+Math.sin(a)*e.radius*.75,.09,.32+i*.10,e.id+i*2.3,Math.min(.82,e.burnTime/.3));}
  const sunResult=sunfall.draw(combat,vp,view,visible);calls+=sunResult.calls;triangles+=sunResult.triangles;
  const base=inferno.draw(combat,vp,time,direction,visible,flames,preview);calls+=base.calls;triangles+=base.triangles;
  const batch=flames.draw(vp,time);calls+=batch.calls;triangles+=batch.triangles;
  gl.depthMask(true);gl.disable(gl.BLEND);return {calls,triangles};}};
}
