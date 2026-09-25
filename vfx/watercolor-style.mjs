/** Cel-shaded watercolour skill style (owner request, 2026-09-25).
 * One shared look for every skill: stepped (cel) values, same-hue pigment pooling at edges
 * (no black outlines), paper grain and irregular wet edges. Fire is rebuilt with the same
 * mesh/shader system instead of the painted fire images.
 * Presentation only: combat objects are read, never changed. The old look stays available
 * through the Settings > Test switch while the style is being reviewed.
 */
export const WATERCOLOR_STYLE_VERSION = 'cel-watercolor-v1';

function replaceOne(source, from, to, label) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw Error(`${label}: expected exactly one baseline, found ${count}`);
  return source.replace(from, () => to);
}

// Fragment-stage style function. Inputs are the effect's own (linear) colour and alpha, so every
// original shape, motion and timing is kept; only the rendering of colour and edges changes.
const STYLE_GLSL = `uniform vec4 gdStyle;uniform vec4 gdStyle2;
float gdH(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float gdN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(gdH(i),gdH(i+vec2(1,0)),f.x),mix(gdH(i+vec2(0,1)),gdH(i+vec2(1,1)),f.x),f.y);}
vec4 gdWatercolor(vec3 lin,float a,vec3 n,vec3 v){
 vec3 c=gdToSRGB(lin);
 if(gdStyle.x<.5)return vec4(c,a);
 float wash=gdStyle.y,bands=gdStyle.z,edgeK=gdStyle.w;
 vec2 sp=gl_FragCoord.xy/max(gdStyle2.x,.5);
 float grain=gdN(sp*.85)*.5+gdN(sp*.33)*.3+gdN(sp*.11)*.2;
 float blot=gdN(sp*.021+vec2(TIME*.02,-TIME*.015));
 float cut=.09+(blot-.5)*.10*wash;
 float dA=(a-cut)/max(fwidth(a),1e-4);
 float body=clamp(dA+.5,0.,1.);
 float facing=abs(dot(normalize(n),normalize(v)));
 float dF=facing/max(fwidth(facing),1e-4);
 float edgePx=mix(1.2,4.,edgeK)*max(gdStyle2.x,1.);
 float rim=max(1.-smoothstep(0.,edgePx,dA),1.-smoothstep(0.,edgePx*1.4,dF));
 float L=max(dot(c,vec3(.299,.587,.114)),1e-3);
 float shade=L*(.80+.20*smoothstep(.18,.62,facing));
 float x=shade*bands;float stepped=(floor(x)+smoothstep(.44,.56,fract(x)))/bands;
 vec3 col=c*(clamp(stepped,.06,1.)/L);
 float g=dot(col,vec3(.299,.587,.114));col=mix(vec3(g),col,.80);
 col*=mix(vec3(1.),vec3(.92,1.,1.08),(blot-.5)*1.5*wash);
 col*=1.-(grain-.5)*.24*wash;
 col*=1.-rim*.42*edgeK;
 col=clamp(col,0.,1.);
 float alpha=a*body;
 alpha=mix(alpha*mix(1.,.70,wash),min(1.,alpha*1.25+.12),rim*.85);
 alpha*=1.-(grain-.5)*.26*wash;
 return vec4(col,clamp(alpha,0.,1.));
}
`;

// Procedural fire, drawn with the same helpers (emit/ball/wash) as the other elements.
const FIRE_PLAN = `
  const WC_FIRE={core:'#fff4c4',hot:'#ffd06a',body:'#ff9a45',rim:'#f26a3d',deep:'#d0493a',scorch:'#8a4632',smoke:'#8a7a70',ash:'#c4b8ac'};
  const wcHash=(n)=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s)};
  const flame=()=>geometry('wc-flame-teardrop-12x10',()=>grid(10,12,(v,u)=>{const a=u*TAU,r=v<.38?Math.sqrt(Math.max(0,1-((v-.38)/.38)**2)):Math.pow(Math.max(0,1-(v-.38)/.62),1.25),y=v*1.55-.42;return[Math.cos(a)*r*.5,y,Math.sin(a)*r*.5,...unit([Math.cos(a),.35,Math.sin(a)]),u,v]}));
  function tongue(parent,p,size,time,seed,alpha,colors=null,tilt=0,yaw=0){
    const f=1+Math.sin(time*13+seed*5.1)*.14+Math.sin(time*21+seed*2.3)*.06,sway=Math.sin(time*9+seed*3.7)*.14,w=size*(1-(f-1)*.4)*.78;
    const m=multiply(parent,matrix(p,[1,1,1],yaw,tilt+sway));
    emit(flame(),multiply(m,matrix([0,0,0],[w*1.12,size*f*1.05,w*1.12])),WC_FIRE.rim,alpha*.62,'stylized_procedural_vfx',{edge:WC_FIRE.deep,emission:.8,pulse:.02});
    emit(flame(),multiply(m,matrix([0,-size*.04,0],[w*.78,size*f*.78,w*.78])),WC_FIRE.body,alpha*.9,'stylized_procedural_vfx',{edge:WC_FIRE.rim,emission:.95,pulse:.02,layer:2});
    emit(flame(),multiply(m,matrix([0,-size*.10,0],[w*.42,size*f*.46,w*.42])),WC_FIRE.core,alpha,'stylized_procedural_vfx',{edge:WC_FIRE.hot,emission:1.05,pulse:.02,layer:3});
  }
  function wcFireball(t,time){
    const dx=t.vx??(t.tx-t.x),dz=t.vz??(t.tz-t.z),yaw=Math.atan2(dx||0,dz||1),age=1.8-(t.life??1.8),root=matrix([t.x,(t.y??.36)+.06,t.z],[1,1,1],yaw);
    ball(root,[0,0,-.04],.26,WC_FIRE.body,.92,[1,1,1.45],'stylized_procedural_vfx',{edge:WC_FIRE.rim,emission:.9});
    ball(root,[0,.01,.02],.15,WC_FIRE.core,1,[1,1,1.2],'stylized_procedural_vfx',{edge:WC_FIRE.hot,emission:1.1,layer:2});
    for(let j=0;j<3;j++)tongue(root,[Math.sin(time*11+j*2)*.05,.02,-.26-j*.12],.34-j*.07,time,j+age,.85-j*.18,null,-Math.PI/2);
    for(let j=0;j<4;j++){const k=(time*2.6+j*.25)%1;ball(root,[Math.sin(j*2.4+time*7)*.08,.04+k*.10,-.30-k*.55],.045*(1-k),WC_FIRE.hot,(1-k)*.9,[1,1,1],'stylized_procedural_vfx',{edge:WC_FIRE.rim,emission:1,layer:2})}
  }
  function wcEmber(t,time){
    const dx=t.vx??0,dz=t.vz??1,yaw=Math.atan2(dx,dz),fade=Math.min(1,(t.life??1)*3),root=matrix([t.x,(t.y??.16)+.08,t.z],[1,1,1],yaw);
    ball(root,[0,0,0],.075,WC_FIRE.hot,fade,[1,1,1.3],'stylized_procedural_vfx',{edge:WC_FIRE.rim,emission:1});
    tongue(root,[0,0,-.10],.14,time,t.x*3+t.z,fade*.8,null,-Math.PI/2);
  }
  function wcBlast(e,time){
    const D=1.05,p=clamp(e.age/D);if(p>=1)return;const r=e.r||1,root=matrix([e.x,.02,e.z]);
    wash(root,r*mix(.35,1.05,smooth(0,.25,p)),WC_FIRE.scorch,(1-smooth(.55,1,p))*.62,{edge:WC_FIRE.deep});
    const dome=mix(.25,.78,smooth(0,.22,p));
    ball(root,[0,r*.10,0],r*dome,WC_FIRE.body,1-smooth(.22,.55,p),[1,.62,1],'stylized_procedural_vfx',{edge:WC_FIRE.rim,emission:.95});
    if(p<.32)ball(root,[0,r*.14,0],r*.42*(1-p*2.4),WC_FIRE.core,1-smooth(.12,.32,p),[1,.7,1],'stylized_procedural_vfx',{edge:WC_FIRE.hot,emission:1.1,layer:2});
    const petals=7,spread=mix(.18,.62,smooth(0,.35,p)),height=r*(.95*(1-smooth(.28,.85,p))+.12);
    for(let j=0;j<petals;j++){const a=j/petals*TAU+e.x;tongue(root,[Math.cos(a)*r*spread,0,Math.sin(a)*r*spread],height*(.75+wcHash(j+e.z)*.4),time,j+e.x,1-smooth(.42,.86,p),null,.32,-a+Math.PI/2)}
    for(let j=0;j<5;j++){const a=j*1.26+e.z,k=smooth(.22,1,p);ball(root,[Math.cos(a)*r*.35,.35+k*r*1.1+j*.05,Math.sin(a)*r*.35],r*(.18+k*.20),j%2?WC_FIRE.smoke:WC_FIRE.ash,smooth(.22,.42,p)*(1-smooth(.68,1,p))*.72,[1,.85,1],'stylized_procedural_vfx',{edge:WC_FIRE.ash,emission:.35})}
    for(let j=0;j<10;j++){const a=j/10*TAU+e.z*2,s=p*r*1.4,y=.2+p*1.6-p*p*1.7;if(y>0)ball(root,[Math.cos(a)*s,y,Math.sin(a)*s],.05,WC_FIRE.hot,(1-smooth(.5,.9,p)),[1,1,1],'stylized_procedural_vfx',{edge:WC_FIRE.rim,emission:1,layer:2})}
  }
  function wcPatch(t,time,i){
    const fade=clamp((t.life??1)*2),root=matrix([t.x,.02,t.z]),r=t.r||.8;
    wash(root,r,WC_FIRE.deep,fade*.46,{edge:WC_FIRE.scorch});
    for(let j=0;j<4;j++){const a=wcHash(i*7+j)*TAU,d=r*(.2+wcHash(i*3+j*5)*.55);tongue(root,[Math.cos(a)*d,0,Math.sin(a)*d],r*(.28+wcHash(j+i)*.18),time,i*4+j,fade*.9)}
  }
  function wcBurning(e,time){
    const fade=Math.min(.9,(e.burnTime||0)/.3),rad=(e.radius||.5)*.72;
    for(let j=0;j<2;j++){const a=time*1.3+j*Math.PI;tongue(identity(),[e.x+Math.cos(a)*rad,.18,e.z+Math.sin(a)*rad],.34+j*.06,time,(e.id||0)+j*2.3,fade)}
  }
  function fire(combat,world,time,visible){
    for(const t of combat.projectiles||[]){if(!Number.isFinite(t.x+t.z)||!visible(t.x,t.z,2))continue;currentTag='fire:'+(t.ember?'ember':'fireball');diagnostics.kinds[currentTag]=(diagnostics.kinds[currentTag]||0)+1;t.ember?wcEmber(t,time):wcFireball(t,time)}
    for(const e of combat.fx||[]){if(e.type!=='blast'||!visible(e.x,e.z,(e.r||1)*3.5))continue;currentTag='fire:blast';diagnostics.kinds[currentTag]=(diagnostics.kinds[currentTag]||0)+1;wcBlast(e,time)}
    (combat.patches||[]).forEach((t,i)=>{if(!visible(t.x,t.z,(t.r||1)+1))return;currentTag='fire:patch';diagnostics.kinds[currentTag]=(diagnostics.kinds[currentTag]||0)+1;wcPatch(t,time,i)});
    for(const e of world.enemies||[]){if(!(e.hp>0&&e.burnTime>0)||!visible(e.x,e.z,1))continue;currentTag='fire:burning';diagnostics.kinds[currentTag]=(diagnostics.kinds[currentTag]||0)+1;wcBurning(e,time)}
  }
  function plan(`;

const DEFAULT_STYLE = {on: true, wash: .5, bands: 3, edge: .6};

/** Adapt the Godot elemental renderer module source (string) before it is embedded. */
export function adaptWatercolorStyle(module) {
  let s = module;
  // Shared style at the single colour-output point of every effect shader.
  s = replaceOne(s, 'vec3 gdToSRGB(vec3 v){v=max(v,vec3(0));return mix(v*12.92,1.055*pow(v,vec3(1./2.4))-.055,step(vec3(.0031308),v));}\\n',
    'vec3 gdToSRGB(vec3 v){v=max(v,vec3(0));return mix(v*12.92,1.055*pow(v,vec3(1./2.4))-.055,step(vec3(.0031308),v));}\\n' + STYLE_GLSL.replace(/\n/g, '\\n'), 'style GLSL');
  s = replaceOne(s, 'if(ALPHA<=.003)discard;gdColor=vec4(gdToSRGB(ALBEDO+EMISSION),clamp(ALPHA,0.,1.));}',
    'if(ALPHA<=.003)discard;gdColor=gdWatercolor(ALBEDO+EMISSION,clamp(ALPHA,0.,1.),NORMAL,VIEW);if(gdColor.a<=.003)discard;}', 'style output');
  s = replaceOne(s, "time:gl.getUniformLocation(p,'TIME')};", "time:gl.getUniformLocation(p,'TIME'),style:gl.getUniformLocation(p,'gdStyle'),style2:gl.getUniformLocation(p,'gdStyle2')};", 'style uniforms');
  s = replaceOne(s, 'gl.uniform1f(p.time,time);',
    `gl.uniform1f(p.time,time);{const S=globalThis.__slimeVfxStyle||${JSON.stringify(DEFAULT_STYLE)};gl.uniform4f(p.style,S.on?1:0,S.wash,S.bands,S.edge);gl.uniform4f(p.style2,globalThis.devicePixelRatio||1,0,0,0);}`, 'style values');
  // New fire in the same system, only while the style is on (the old painted fire draws otherwise).
  s = replaceOne(s, '  function plan(', FIRE_PLAN, 'fire plan');
  s = replaceOne(s, '    diagnostics.commands=commands.length;return commands;',
    '    if((globalThis.__slimeVfxStyle||{on:true}).on)fire(combat,world,time,visible);\n    diagnostics.commands=commands.length;return commands;', 'fire call');
  return s;
}

// Old painted fire: while the new style is on, skip exactly the parts the new fire now draws
// (fireballs, embers, blasts, burn patches, burning-monster flames). The fire evolutions
// (Sunfall, Meteor, Cyclone) keep their painted renderer until they are rebuilt.
const LEGACY_FIRE_OLD = 'let n=Vr.draw(Y,X,W.time,W.camera===`side`?[0,4,18]:W.camera===`top`?[0,21,.1]:[0,12,15],dr,Z.active&&!Z.lab.showTargets?[]:J.enemies,Z.active);';
const LEGACY_FIRE_NEW = 'let wcOn=(globalThis.__slimeVfxStyle||{on:!0}).on,n=Vr.draw(wcOn?{...Y,projectiles:[],patches:[],fx:Y.fx.filter(e=>e.type!==`blast`)}:Y,X,W.time,W.camera===`side`?[0,4,18]:W.camera===`top`?[0,21,.1]:[0,12,15],dr,wcOn||Z.active&&!Z.lab.showTargets?[]:J.enemies,Z.active);';

const CONTROLS = '<details id="vfx-style-tools" open><summary>สไตล์เอฟเฟกต์สกิล (ต้นแบบ)</summary>' +
  '<label class="check"><input id="vfx-style-on" type="checkbox" checked>เซลเฉด + สีน้ำ (ปิด = แบบเดิม)</label>' +
  '<label for="vfx-style-wash">ความเข้มสีน้ำ <output id="vfx-style-wash-out">50</output></label><input id="vfx-style-wash" type="range" min="0" max="100" step="1" value="50">' +
  '<label for="vfx-style-bands">ระดับแสงเงา<select id="vfx-style-bands"><option value="2">2 ระดับ</option><option value="3" selected>3 ระดับ</option><option value="4">4 ระดับ</option></select></label>' +
  '<label for="vfx-style-edge">ขอบสีเข้ม <output id="vfx-style-edge-out">60</output></label><input id="vfx-style-edge" type="range" min="0" max="100" step="1" value="60">' +
  '<p class="settings-note">บันทึกในเครื่องนี้ · ใช้ปุ่ม "ลองสกิล" ด้านบนเพื่อดูทุกสกิล</p></details>';

// Runs before the game module: state is ready when the renderer first reads it.
const STATE_SCRIPT = '<script>(()=>{const K="slime.vfxStyle.v1",D=' + JSON.stringify(DEFAULT_STYLE) + ';let s={...D};' +
  'try{const v=JSON.parse(localStorage.getItem(K));if(v&&typeof v==="object")s={...D,...v}}catch{}' +
  'globalThis.__slimeVfxStyle=s;const save=()=>{try{localStorage.setItem(K,JSON.stringify(s))}catch{}};' +
  'const on=document.getElementById("vfx-style-on"),w=document.getElementById("vfx-style-wash"),b=document.getElementById("vfx-style-bands"),e=document.getElementById("vfx-style-edge");if(!on)return;' +
  'const show=()=>{on.checked=!!s.on;w.value=Math.round(s.wash*100);b.value=String(s.bands);e.value=Math.round(s.edge*100);document.getElementById("vfx-style-wash-out").textContent=w.value;document.getElementById("vfx-style-edge-out").textContent=e.value};show();' +
  'on.onchange=()=>{s.on=on.checked;save()};w.oninput=()=>{s.wash=w.value/100;show();save()};b.onchange=()=>{s.bands=Number(b.value);save()};e.oninput=()=>{s.edge=e.value/100;show();save()}})()</script>';

export function applyWatercolorUi(bundle, html) {
  return {
    bundle: replaceOne(bundle, LEGACY_FIRE_OLD, LEGACY_FIRE_NEW, 'legacy fire split'),
    html: replaceOne(replaceOne(html, '<h3>สกิลและภาพเอฟเฟกต์</h3>', '<h3>สกิลและภาพเอฟเฟกต์</h3>' + CONTROLS, 'style controls'),
      '</body></html>', STATE_SCRIPT + '</body></html>', 'style state'),
  };
}
