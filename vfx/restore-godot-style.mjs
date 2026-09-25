/**
 * Restores the readable elemental VFX language from the final Godot demo after
 * the web migration flattened several skills into single generic primitives.
 *
 * Scope: water, Tide, toxin, frost and Orbit visuals only.
 * Fire keeps its dedicated atlas/video renderer. Chain Spark is intentionally
 * byte-for-byte untouched by this patch because the web version has already
 * been rebuilt beyond the Godot reference.
 *
 * Gameplay, damage, cooldowns, hitboxes and ability lifetimes are not changed.
 */
export const VFX_RESTORE_VERSION = 'godot-vfx-demo-v1';

function one(source,label,from,to){
  const count=source.split(from).length-1;
  if(count!==1)throw Error(`${label}: expected one hook, found ${count}`);
  return source.replace(from,to);
}

export function applyRestoredSkillVfx(source){
  // Keep Chain Spark's palette exactly as-is while moving the other families
  // back toward the final Godot colors.
  source=one(
    source,
    'element palettes',
    'un={water:[.18,.75,.96],tide:[.65,.37,.98],toxin:[.48,.72,.16],chain:[.62,.83,1],frost:[.46,.84,.96],orbit:[.37,.83,.88],wind:[1,.89,.64]}',
    'un={water:[.22,.72,1],tide:[.56,.39,1],toxin:[.30,.68,.12],chain:[.62,.83,1],frost:[.44,.82,1],orbit:[.45,.87,1],wind:[1,.89,.64]}'
  );

  // Water shot regains a bright inner body; Frost projectiles regain crystalline
  // satellites instead of reading like the same generic bolt.
  source=one(
    source,
    'water frost projectile layers',
    'if(t.kind===`bolt`||t.kind===`crystal`||t.kind===`borer`){let n=t.kind===`borer`?.85:.3;l(t.x,t.z,m,n,t.dx,t.dz,e,f,t.family===`water`),d(t.x-t.dx*(t.kind===`borer`?1.4:.6),t.z-t.dz*(t.kind===`borer`?1.4:.6),t.x,t.z,.35,p,m*.55,f,!1)}',
    'if(t.kind===`bolt`||t.kind===`crystal`||t.kind===`borer`){let n=t.kind===`borer`?.85:.3;l(t.x,t.z,m,n,t.dx,t.dz,e,f,t.family===`water`),d(t.x-t.dx*(t.kind===`borer`?1.4:.6),t.z-t.dz*(t.kind===`borer`?1.4:.6),t.x,t.z,.35,p,m*.55,f,!1);if(t.family===`water`)l(t.x,t.z,m*.56,n*.86,t.dx,t.dz,fn,f*.92,!0);if(t.family===`frost`){c(t.x,.38,t.z,m*.44,n*.52,fn,f*.9,n);for(let r=0;r<2;r++){let i=n*5+r*Math.PI,a=m*(.58+r*.18);c(t.x+Math.cos(i)*a,.28+r*.06,t.z+Math.sin(i)*a,m*.18,n*.34,e,f*.75,i)}}}'
  );

  // Railgun / Pressure Jet: retain the old three-band body and restore muzzle +
  // impact water rings so the beam has a readable beginning and end.
  source=one(
    source,
    'water beam endpoints',
    'else if([`beam`,`jet`].includes(t.kind)){for(let n=0;n<3;n++){let r=(n-1)*m*.5;d(t.x-t.dz*r,t.z+t.dx*r,t.x+t.dx*t.length-t.dz*r,t.z+t.dz*t.length+t.dx*r,.32+n*.045,n===1?p:e,m*(n===1?.3:.45),f,!1)}for(let e=0;e<7;e++){let r=(n*2+e/7)%1*t.length;c(t.x+t.dx*r,.4,t.z+t.dz*r,m*.35,m*.4,p,f)}}',
    'else if([`beam`,`jet`].includes(t.kind)){for(let n=0;n<3;n++){let r=(n-1)*m*.5;d(t.x-t.dz*r,t.z+t.dx*r,t.x+t.dx*t.length-t.dz*r,t.z+t.dz*t.length+t.dx*r,.32+n*.045,n===1?p:e,m*(n===1?.3:.45),f,!1)}for(let e=0;e<7;e++){let r=(n*2+e/7)%1*t.length;c(t.x+t.dx*r,.4,t.z+t.dz*r,m*.35,m*.4,p,f)}if(t.family===`water`){s(t.x,t.z,m*1.9,.16,.055,fn,f*.86,n*5),s(t.x+t.dx*t.length,t.z+t.dz*t.length,m*2.25,.12,.07,e,f*.72,-n*4)}}'
  );

  // Tidal Surge recovers the folded crest + pale foam language of the Godot
  // mesh instead of one thin strip.
  source=one(
    source,
    'tidal surge crest',
    'else if(t.kind===`wave`){let r=[];for(let i=0;i<=20;i++){let o=(i/20-.5)*2,s=o*m,c=(1-o*o)*.3,l=t.x-t.dz*s+t.dx*c,u=t.z+t.dx*s+t.dz*c,d=.7+Math.sin(o*9-n*12)*.13;if(r.push([l,d,u]),i){let t=r[i-1],n=[l,.06,u];a([t[0],.06,t[2]],n,t,e,.85*f),a(n,r[i],t,e,.85*f)}}o(r.map(e=>[e[0],e[1]+.035,e[2]]),.1,fn,f);for(let n=0;n<2;n++)o(r.map(e=>[e[0]-t.dx*.08,e[1]*(.35+n*.24),e[2]-t.dz*.08]),.055,dn(e,fn,.3+n*.18),f*.8)}',
    'else if(t.kind===`wave`){let r=[];for(let i=0;i<=20;i++){let o=(i/20-.5)*2,s=o*m,c=(1-o*o)*.3,l=t.x-t.dz*s+t.dx*c,u=t.z+t.dx*s+t.dz*c,d=.7+Math.sin(o*9-n*12)*.13;if(r.push([l,d,u]),i){let t=r[i-1],n=[l,.06,u];a([t[0],.06,t[2]],n,t,e,.85*f),a(n,r[i],t,e,.85*f)}}o(r.map(e=>[e[0],e[1]+.035,e[2]]),.1,fn,f);for(let n=0;n<2;n++)o(r.map(e=>[e[0]-t.dx*.08,e[1]*(.35+n*.24),e[2]-t.dz*.08]),.055,dn(e,fn,.3+n*.18),f*.8);o(r.map(e=>[e[0]+t.dx*.10,e[1]*.78+.10,e[2]+t.dz*.10]),.07,dn(e,fn,.72),f*.72);for(let i=1;i<20;i+=4){let a=r[i];c(a[0],a[1]+.08,a[2],m*.16,m*.22,fn,f*.78,n+i)}}'
  );

  // Tide Ring: three offset bands plus moving foam beads. Tesla/Chain Spark
  // remains on the old branch below with no extra geometry.
  source=one(
    source,
    'tide layered rings',
    'else if([`ring`,`resonance`,`vacuum`,`dome`,`tesla`].includes(t.kind)){let r=t.kind===`dome`||t.kind===`tesla`?m:t.kind===`vacuum`?m*Math.sin(i*Math.PI):m*Math.min(1,i*3);if(s(t.x,t.z,r,.12,.065,e,f,n*3),s(t.x,t.z,r*.94,.15,.022,p,f,n*3),t.kind===`dome`&&u(t.x,t.z,m,m*.55,e,f*.18),t.kind===`tesla`){c(t.x,.32,t.z,.16,.4,p,f,n);for(let r=0;r<6;r++){let i=n*3+r*Math.PI/3;d(t.x,t.z,t.x+Math.sin(i)*m,t.z+Math.cos(i)*m,.2,e,.024,f)}}}',
    'else if([`ring`,`resonance`,`vacuum`,`dome`,`tesla`].includes(t.kind)){let r=t.kind===`dome`||t.kind===`tesla`?m:t.kind===`vacuum`?m*Math.sin(i*Math.PI):m*Math.min(1,i*3);if(s(t.x,t.z,r,.12,.065,e,f,n*3),s(t.x,t.z,r*.94,.15,.022,p,f,n*3),t.family===`tide`){s(t.x,t.z,r*.86,.105,.042,dn(e,fn,.72),f*.58,n*2.5);for(let a=0;a<8;a++){let o=a*Math.PI/4+n*2.7,l=r*(.92+Math.sin(n*4.6+a)*.045);c(t.x+Math.cos(o)*l,.09+Math.sin(o*1.6+n*6.5)*.028,t.z+Math.sin(o)*l,.045+(a%3)*.008,.07,dn(e,fn,.58),f*.68,o)}}if(t.kind===`dome`&&u(t.x,t.z,m,m*.55,e,f*.18),t.kind===`tesla`){c(t.x,.32,t.z,.16,.4,p,f,n);for(let r=0;r<6;r++){let i=n*3+r*Math.PI/3;d(t.x,t.z,t.x+Math.sin(i)*m,t.z+Math.cos(i)*m,.2,e,.024,f)}}}'
  );

  // Orbit/toxin arcs get a soft secondary stroke. Chain uses the original
  // zig-zag call exactly once and receives no new stroke.
  source=one(
    source,
    'non chain arc halo',
    'else if(t.kind===`arc`)d(t.x,t.z,t.tx,t.tz,.45,e,m,f,t.family===`chain`);',
    'else if(t.kind===`arc`){d(t.x,t.z,t.tx,t.tz,.45,e,m,f,t.family===`chain`);if(t.family!==`chain`)d(t.x,t.z,t.tx,t.tz,.39,p,m*.42,f*.48,!1)}'
  );

  // The airborne toxin blob returns to a dark-green shell with a bright inner
  // core and impact halo.
  source=one(
    source,
    'toxin lob core',
    'else if(t.kind===`lob`){let r=i;c(t.x+(t.tx-t.x)*r,.3+Math.sin(r*Math.PI)*1.4,t.z+(t.tz-t.z)*r,m,.24,e,1,n)}',
    'else if(t.kind===`lob`){let r=i,a=t.x+(t.tx-t.x)*r,o=t.z+(t.tz-t.z)*r,l=.3+Math.sin(r*Math.PI)*1.4;c(a,l,o,m,.24,e,1,n),c(a-m*.16,l+m*.18,o-m*.12,m*.52,.14,p,.95,-n*1.3),s(a,o,m*1.38,l-.23,.028,p,.42,n*2)}'
  );

  // Poison pools keep the broad puddle but regain visible bubbling. Bloom and
  // miasma still keep their existing specialized motion.
  source=one(
    source,
    'toxin pool bubbles',
    'else if([`pool`,`bloom`,`miasma`,`infection`].includes(t.kind)){if(t.kind===`infection`){for(let r=0;r<4;r++){let i=n*4+r*Math.PI/2;c(t.x+Math.cos(i)*.35,.45,t.z+Math.sin(i)*.35,.1,.2,e,f)}continue}let r=m*Math.min(1,i*8);if(u(t.x,t.z,r,t.kind===`miasma`?.65:.1,e,f*(t.kind===`miasma`?.45:.68)),s(t.x,t.z,r,.12,.06,p,f*.7,n),t.kind===`bloom`)for(let r=0;r<6;r++){let i=r*Math.PI/3+n*.7;c(t.x+Math.cos(i)*.25,.3,t.z+Math.sin(i)*.25,.18,.5,e,f,i)}for(let e=0;e<5;e++){let r=e*2.399+n*.3,i=m*(.2+e*.12);c(t.x+Math.cos(r)*i,.2+(n*.3+e*.17)%1*.6,t.z+Math.sin(r)*i,.05,.07,p,f*.65)}}',
    'else if([`pool`,`bloom`,`miasma`,`infection`].includes(t.kind)){if(t.kind===`infection`){for(let r=0;r<4;r++){let i=n*4+r*Math.PI/2;c(t.x+Math.cos(i)*.35,.45,t.z+Math.sin(i)*.35,.1,.2,e,f)}continue}let r=m*Math.min(1,i*8);if(u(t.x,t.z,r,t.kind===`miasma`?.65:.1,e,f*(t.kind===`miasma`?.45:.68)),s(t.x,t.z,r,.12,.06,p,f*.7,n),s(t.x,t.z,r*.78,.13,.028,e,f*.42,-n*.7),t.kind===`bloom`)for(let r=0;r<6;r++){let i=r*Math.PI/3+n*.7;c(t.x+Math.cos(i)*.25,.3,t.z+Math.sin(i)*.25,.18,.5,e,f,i)}for(let e=0;e<5;e++){let r=e*2.399+n*.3,i=m*(.2+e*.12);c(t.x+Math.cos(r)*i,.2+(n*.3+e*.17)%1*.6,t.z+Math.sin(r)*i,.05,.07,p,f*.65)}if(t.kind===`pool`)for(let e=0;e<3;e++){let r=e*2.1+n*.55,i=m*(.28+e*.08);c(t.x+Math.cos(r)*i,.10+((n*.45+e*.21)%1)*.24,t.z+Math.sin(r)*i,.035+e*.009,.055,p,f*.72,r)}}'
  );

  // Whiteout Breath becomes a denser three-depth mist fan, echoing the three
  // Godot frost sheets while keeping the current hit cone unchanged.
  source=one(
    source,
    'frost breath sheets',
    'else if(t.kind===`cone`)for(let r=0;r<9;r++){let i=Math.atan2(t.dx,t.dz)+(r/8-.5)*t.angle*2,a=(n*1.7+r*.16)%1,o=a*t.length;d(t.x,t.z,t.x+Math.sin(i)*o,t.z+Math.cos(i)*o,.25,e,.075,f*(1-a)),c(t.x+Math.sin(i)*o,.3,t.z+Math.cos(i)*o,.075,.18,p,f*(1-a),i)}',
    'else if(t.kind===`cone`)for(let r=0;r<11;r++){let i=Math.atan2(t.dx,t.dz)+(r/10-.5)*t.angle*2,a=(n*1.55+r*.13)%1,o=a*t.length,h=f*(1-a);d(t.x,t.z,t.x+Math.sin(i)*o,t.z+Math.cos(i)*o,.18,e,.09,h),d(t.x,t.z,t.x+Math.sin(i)*o*.96,t.z+Math.cos(i)*o*.96,.32,dn(e,fn,.55),.055,h*.68),d(t.x,t.z,t.x+Math.sin(i)*o*.9,t.z+Math.cos(i)*o*.9,.45,fn,.032,h*.38),c(t.x+Math.sin(i)*o,.3,t.z+Math.cos(i)*o,.07,.18,p,h,i)}'
  );

  // Frost shatter gets a second white shock ring and slightly more radial
  // shards, without touching damage or chain generations.
  source=one(
    source,
    'frost shatter layers',
    'else if([`burst`,`chainburst`].includes(t.kind)){s(t.x,t.z,m*Math.min(1,i*3),.12,.06,e,f);for(let n=0;n<7;n++){let r=n*Math.PI*2/7,a=m*.7;c(t.x+Math.cos(r)*a,.16,t.z+Math.sin(r)*a,.12,Math.sin(Math.min(1,i*2)*Math.PI*.5)*.6,e,f,r)}}',
    'else if([`burst`,`chainburst`].includes(t.kind)){let r=m*Math.min(1,i*3);s(t.x,t.z,r,.12,.06,e,f),s(t.x,t.z,r*.82,.16,.028,fn,f*.62,-n);for(let n=0;n<9;n++){let r=n*Math.PI*2/9,a=m*(.62+(n%3)*.07);c(t.x+Math.cos(r)*a,.16,t.z+Math.sin(r)*a,.105,Math.sin(Math.min(1,i*2)*Math.PI*.5)*(.52+(n%2)*.08),n%2?fn:e,f,r)}}'
  );

  // Orbit Core restores its old double-layer core/halo and two small motes.
  source=one(
    source,
    'orbit layered core',
    'for(let t of e.orbs||[])c(t.x,.4,t.z,t.r,t.r*1.2,un.orbit,1,t.angle),s(t.x,t.z,t.r*1.1,.4,.035,fn,.8,t.angle);',
    'for(let t of e.orbs||[]){c(t.x,.4,t.z,t.r,t.r*1.2,un.orbit,1,t.angle),c(t.x,.43,t.z,t.r*.52,t.r*.72,fn,.92,-t.angle),s(t.x,t.z,t.r*1.1,.4,.035,fn,.8,t.angle),s(t.x,t.z,t.r*1.62,.38,.022,un.orbit,.46,-t.angle);for(let e=0;e<2;e++){let r=t.angle*1.7+e*Math.PI,a=t.r*1.42;c(t.x+Math.cos(r)*a,.42+Math.sin(r)*.03,t.z+Math.sin(r)*a,t.r*.16,t.r*.24,fn,.62,r)}}'
  );

  // Marker used by build/tests. Do not use this marker to branch game logic.
  source=one(source,'restore marker','function pn(e,t,n,r=()=>!0){','/* GODOT_STYLE_VFX_RESTORED */function pn(e,t,n,r=()=>!0){');
  return source;
}
