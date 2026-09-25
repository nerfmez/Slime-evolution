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
export const VFX_RESTORE_VERSION = 'godot-vfx-demo-v2';

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

  // The migrated renderer only had a crystal/spike primitive. Add a tiny
  // low-poly orb for foam, bubbles and Orbit so those families stop reading as ice.
  source=one(
    source,
    'rounded elemental orb helper',
    'u=(e,t,n,r,i,o)=>{',
    'b=(e,t,n,r,i,o=1)=>{for(let s=0;s<3;s++)for(let c=0;c<6;c++){let l=(q,h)=>{let g=q/6*Math.PI*2,_=(h/3-.5)*Math.PI,v=Math.cos(_);return[e+Math.cos(g)*v*r,t+Math.sin(_)*r,n+Math.sin(g)*v*r]};a(l(c,s),l(c+1,s),l(c,s+1),i,o),a(l(c+1,s),l(c+1,s+1),l(c,s+1),i,o)}},u=(e,t,n,r,i,o)=>{'
  );
// Water shot regains a bright inner body; Frost projectiles stay crystalline.
  source=one(
    source,
    'water frost projectile layers',
    'if(t.kind===`bolt`||t.kind===`crystal`||t.kind===`borer`){let n=t.kind===`borer`?.85:.3;l(t.x,t.z,m,n,t.dx,t.dz,e,f,t.family===`water`),d(t.x-t.dx*(t.kind===`borer`?1.4:.6),t.z-t.dz*(t.kind===`borer`?1.4:.6),t.x,t.z,.35,p,m*.55,f,!1)}',
    'if(t.kind===`bolt`||t.kind===`crystal`||t.kind===`borer`){let n=t.kind===`borer`?.85:.3;l(t.x,t.z,m,n,t.dx,t.dz,e,f,t.family===`water`),d(t.x-t.dx*(t.kind===`borer`?1.4:.6),t.z-t.dz*(t.kind===`borer`?1.4:.6),t.x,t.z,.35,p,m*.55,f,!1);if(t.family===`water`)b(t.x,.38,t.z,m*.46,fn,f*.92);if(t.family===`frost`){c(t.x,.38,t.z,m*.44,n*.52,fn,f*.9,n);for(let r=0;r<2;r++){let i=n*5+r*Math.PI,a=m*(.58+r*.18);c(t.x+Math.cos(i)*a,.28+r*.06,t.z+Math.sin(i)*a,m*.18,n*.34,e,f*.75,i)}}}'
  );

  // Railgun / Pressure Jet: thinner translucent bands, bright core and droplets.
  source=one(
    source,
    'water beam endpoints',
    'else if([`beam`,`jet`].includes(t.kind)){for(let n=0;n<3;n++){let r=(n-1)*m*.5;d(t.x-t.dz*r,t.z+t.dx*r,t.x+t.dx*t.length-t.dz*r,t.z+t.dz*t.length+t.dx*r,.32+n*.045,n===1?p:e,m*(n===1?.3:.45),f,!1)}for(let e=0;e<7;e++){let r=(n*2+e/7)%1*t.length;c(t.x+t.dx*r,.4,t.z+t.dz*r,m*.35,m*.4,p,f)}}',
    'else if([`beam`,`jet`].includes(t.kind)){for(let n=0;n<3;n++){let r=(n-1)*m*.32;d(t.x-t.dz*r,t.z+t.dx*r,t.x+t.dx*t.length-t.dz*r,t.z+t.dz*t.length+t.dx*r,.32+n*.045,n===1?fn:dn(e,fn,.28),m*(n===1?.10:.18),f*(n===1?.94:.52),!1)}for(let e=0;e<7;e++){let r=(n*2+e/7)%1*t.length;b(t.x+t.dx*r,.4,t.z+t.dz*r,m*.11,p,f*.74)}if(t.family===`water`){s(t.x,t.z,m*1.55,.12,.035,fn,f*.58,n*5),s(t.x+t.dx*t.length,t.z+t.dz*t.length,m*1.8,.10,.045,dn(e,fn,.55),f*.54,-n*4)}}'
  );

  // Tidal Surge: translucent folded water wall, pale crest and rounded foam.
  source=one(
    source,
    'tidal surge crest',
    'else if(t.kind===`wave`){let r=[];for(let i=0;i<=20;i++){let o=(i/20-.5)*2,s=o*m,c=(1-o*o)*.3,l=t.x-t.dz*s+t.dx*c,u=t.z+t.dx*s+t.dz*c,d=.7+Math.sin(o*9-n*12)*.13;if(r.push([l,d,u]),i){let t=r[i-1],n=[l,.06,u];a([t[0],.06,t[2]],n,t,e,.85*f),a(n,r[i],t,e,.85*f)}}o(r.map(e=>[e[0],e[1]+.035,e[2]]),.1,fn,f);for(let n=0;n<2;n++)o(r.map(e=>[e[0]-t.dx*.08,e[1]*(.35+n*.24),e[2]-t.dz*.08]),.055,dn(e,fn,.3+n*.18),f*.8)}',
    'else if(t.kind===`wave`){let r=[];for(let i=0;i<=20;i++){let o=(i/20-.5)*2,s=o*m,c=(1-o*o)*.3,l=t.x-t.dz*s+t.dx*c,u=t.z+t.dx*s+t.dz*c,d=.7+Math.sin(o*9-n*12)*.13;if(r.push([l,d,u]),i){let t=r[i-1],n=[l,.06,u];a([t[0],.06,t[2]],n,t,dn(e,fn,.18),.30*f),a(n,r[i],t,dn(e,fn,.18),.30*f)}}o(r.map(e=>[e[0],e[1]+.045,e[2]]),.072,fn,f*.82);o(r.map(e=>[e[0]-t.dx*.12,.10,e[2]-t.dz*.12]),.105,dn(e,fn,.22),f*.26);for(let i=2;i<20;i+=4){let a=r[i];b(a[0],a[1]+.06,a[2],m*.075,fn,f*.72)}}'
  );

  // Tide Ring: three purple bands plus rounded moving foam. Tesla/Chain stays unchanged.
  source=one(
    source,
    'tide layered rings',
    'else if([`ring`,`resonance`,`vacuum`,`dome`,`tesla`].includes(t.kind)){let r=t.kind===`dome`||t.kind===`tesla`?m:t.kind===`vacuum`?m*Math.sin(i*Math.PI):m*Math.min(1,i*3);if(s(t.x,t.z,r,.12,.065,e,f,n*3),s(t.x,t.z,r*.94,.15,.022,p,f,n*3),t.kind===`dome`&&u(t.x,t.z,m,m*.55,e,f*.18),t.kind===`tesla`){c(t.x,.32,t.z,.16,.4,p,f,n);for(let r=0;r<6;r++){let i=n*3+r*Math.PI/3;d(t.x,t.z,t.x+Math.sin(i)*m,t.z+Math.cos(i)*m,.2,e,.024,f)}}}',
    'else if([`ring`,`resonance`,`vacuum`,`dome`,`tesla`].includes(t.kind)){let r=t.kind===`dome`||t.kind===`tesla`?m:t.kind===`vacuum`?m*Math.sin(i*Math.PI):m*Math.min(1,i*3);if(s(t.x,t.z,r,.12,.065,e,f,n*3),s(t.x,t.z,r*.94,.15,.022,p,f,n*3),t.family===`tide`){s(t.x,t.z,r*.86,.105,.042,dn(e,fn,.72),f*.58,n*2.5);for(let a=0;a<8;a++){let o=a*Math.PI/4+n*2.7,l=r*(.92+Math.sin(n*4.6+a)*.045);b(t.x+Math.cos(o)*l,.09+Math.sin(o*1.6+n*6.5)*.028,t.z+Math.sin(o)*l,.045+(a%3)*.008,dn(e,fn,.58),f*.68)}}if(t.kind===`dome`&&u(t.x,t.z,m,m*.55,e,f*.18),t.kind===`tesla`){c(t.x,.32,t.z,.16,.4,p,f,n);for(let r=0;r<6;r++){let i=n*3+r*Math.PI/3;d(t.x,t.z,t.x+Math.sin(i)*m,t.z+Math.cos(i)*m,.2,e,.024,f)}}}'
  );

    // Orbit/toxin arcs get a soft secondary stroke. Chain uses the original
  // zig-zag call exactly once and receives no new stroke.
  source=one(
    source,
    'non chain arc halo',
    'else if(t.kind===`arc`)d(t.x,t.z,t.tx,t.tz,.45,e,m,f,t.family===`chain`);',
    'else if(t.kind===`arc`){d(t.x,t.z,t.tx,t.tz,.45,e,m,f,t.family===`chain`);if(t.family!==`chain`)d(t.x,t.z,t.tx,t.tz,.39,p,m*.42,f*.48,!1)}'
  );

// The airborne toxin blob regains a rounded dark shell, bright core and halo.
  source=one(
    source,
    'toxin lob core',
    'else if(t.kind===`lob`){let r=i;c(t.x+(t.tx-t.x)*r,.3+Math.sin(r*Math.PI)*1.4,t.z+(t.tz-t.z)*r,m,.24,e,1,n)}',
    'else if(t.kind===`lob`){let r=i,a=t.x+(t.tx-t.x)*r,o=t.z+(t.tz-t.z)*r,l=.3+Math.sin(r*Math.PI)*1.4;b(a,l,o,m,e,1),b(a-m*.16,l+m*.15,o-m*.12,m*.48,p,.95),s(a,o,m*1.26,l-.04,.022,p,.34,n*2)}'
  );

  // Poison pools/blooms are translucent liquid with rounded bubbles and spores.
  source=one(
    source,
    'toxin pool bubbles',
    'else if([`pool`,`bloom`,`miasma`,`infection`].includes(t.kind)){if(t.kind===`infection`){for(let r=0;r<4;r++){let i=n*4+r*Math.PI/2;c(t.x+Math.cos(i)*.35,.45,t.z+Math.sin(i)*.35,.1,.2,e,f)}continue}let r=m*Math.min(1,i*8);if(u(t.x,t.z,r,t.kind===`miasma`?.65:.1,e,f*(t.kind===`miasma`?.45:.68)),s(t.x,t.z,r,.12,.06,p,f*.7,n),t.kind===`bloom`)for(let r=0;r<6;r++){let i=r*Math.PI/3+n*.7;c(t.x+Math.cos(i)*.25,.3,t.z+Math.sin(i)*.25,.18,.5,e,f,i)}for(let e=0;e<5;e++){let r=e*2.399+n*.3,i=m*(.2+e*.12);c(t.x+Math.cos(r)*i,.2+(n*.3+e*.17)%1*.6,t.z+Math.sin(r)*i,.05,.07,p,f*.65)}}',
    'else if([`pool`,`bloom`,`miasma`,`infection`].includes(t.kind)){if(t.kind===`infection`){for(let r=0;r<4;r++){let i=n*4+r*Math.PI/2;b(t.x+Math.cos(i)*.35,.42,t.z+Math.sin(i)*.35,.075,e,f*.72)}continue}let r=m*Math.min(1,i*8);if(u(t.x,t.z,r,t.kind===`miasma`?.48:.035,e,f*(t.kind===`miasma`?.30:.24)),s(t.x,t.z,r,.105,.045,p,f*.72,n),s(t.x,t.z,r*.78,.11,.025,e,f*.40,-n*.7),t.kind===`bloom`)for(let r=0;r<6;r++){let i=r*Math.PI/3+n*.7;b(t.x+Math.cos(i)*m*.34,.18+Math.sin(n*3+i)*.06,t.z+Math.sin(i)*m*.34,.07,p,f*.72)}for(let e=0;e<5;e++){let r=e*2.399+n*.3,i=m*(.2+e*.12);b(t.x+Math.cos(r)*i,.12+(n*.3+e*.17)%1*.34,t.z+Math.sin(r)*i,.035+e*.006,p,f*.55)}if(t.kind===`pool`)for(let e=0;e<3;e++){let r=e*2.1+n*.55,i=m*(.28+e*.08);b(t.x+Math.cos(r)*i,.08+((n*.45+e*.21)%1)*.20,t.z+Math.sin(r)*i,.032+e*.008,p,f*.68)}}'
  );

  // Whiteout Breath: three translucent mist sheets, then sparse drifting motes.
  source=one(
    source,
    'frost breath sheets',
    'else if(t.kind===`cone`)for(let r=0;r<9;r++){let i=Math.atan2(t.dx,t.dz)+(r/8-.5)*t.angle*2,a=(n*1.7+r*.16)%1,o=a*t.length;d(t.x,t.z,t.x+Math.sin(i)*o,t.z+Math.cos(i)*o,.25,e,.075,f*(1-a)),c(t.x+Math.sin(i)*o,.3,t.z+Math.cos(i)*o,.075,.18,p,f*(1-a),i)}',
    'else if(t.kind===`cone`){let r=Math.atan2(t.dx,t.dz);for(let i=0;i<3;i++){let o=t.length*(1-i*.05),s=t.angle*(1-i*.16),c=.08+i*.16,l=dn(e,fn,.18+i*.32),u=f*(.17-i*.025),d=[t.x,c,t.z],h=[t.x+Math.sin(r-s)*o,c+.035,t.z+Math.cos(r-s)*o],g=[t.x+Math.sin(r+s)*o,c+.035,t.z+Math.cos(r+s)*o];a(d,h,g,l,u)}for(let i=0;i<9;i++){let a=(n*1.35+i*.137)%1,o=(i/8-.5)*t.angle*1.7,s=Math.atan2(t.dx,t.dz)+o,c=a*t.length;b(t.x+Math.sin(s)*c,.14+(i%3)*.12,t.z+Math.cos(s)*c,.045+(i%2)*.012,i%3===2?fn:p,f*(1-a)*.52)}}'
  );

    // Frost shatter gets a second white shock ring and slightly more radial
  // shards, without touching damage or chain generations.
  source=one(
    source,
    'frost shatter layers',
    'else if([`burst`,`chainburst`].includes(t.kind)){s(t.x,t.z,m*Math.min(1,i*3),.12,.06,e,f);for(let n=0;n<7;n++){let r=n*Math.PI*2/7,a=m*.7;c(t.x+Math.cos(r)*a,.16,t.z+Math.sin(r)*a,.12,Math.sin(Math.min(1,i*2)*Math.PI*.5)*.6,e,f,r)}}',
    'else if([`burst`,`chainburst`].includes(t.kind)){let r=m*Math.min(1,i*3);s(t.x,t.z,r,.12,.06,e,f),s(t.x,t.z,r*.82,.16,.028,fn,f*.62,-n);for(let n=0;n<9;n++){let r=n*Math.PI*2/9,a=m*(.62+(n%3)*.07);c(t.x+Math.cos(r)*a,.16,t.z+Math.sin(r)*a,.105,Math.sin(Math.min(1,i*2)*Math.PI*.5)*(.52+(n%2)*.08),n%2?fn:e,f,r)}}'
  );

// Orbit Core: rounded cyan body, white inner core, halo and two tiny motes.
  source=one(
    source,
    'orbit layered core',
    'for(let t of e.orbs||[])c(t.x,.4,t.z,t.r,t.r*1.2,un.orbit,1,t.angle),s(t.x,t.z,t.r*1.1,.4,.035,fn,.8,t.angle);',
    'for(let t of e.orbs||[]){b(t.x,.40,t.z,t.r,un.orbit,1),b(t.x-.03,.43,t.z-.02,t.r*.48,fn,.92),s(t.x,t.z,t.r*1.12,.40,.03,fn,.72,t.angle),s(t.x,t.z,t.r*1.58,.38,.018,un.orbit,.40,-t.angle);for(let e=0;e<2;e++){let r=t.angle*1.7+e*Math.PI,a=t.r*1.42;b(t.x+Math.cos(r)*a,.42+Math.sin(r)*.03,t.z+Math.sin(r)*a,t.r*.14,fn,.58)}}'
  );

    // Marker used by build/tests. Do not use this marker to branch game logic.
  source=one(source,'restore marker','function pn(e,t,n,r=()=>!0){','/* GODOT_STYLE_VFX_RESTORED */function pn(e,t,n,r=()=>!0){');
  return source;
}
