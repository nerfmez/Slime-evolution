/**
 * Godot v100 -> WebGL2 visual-only adapter.
 * Mesh profiles, shader bodies and authored signatures come from the supplied
 * Slime-v100-fire-evo-components.zip. Combat objects are read, never mutated.
 * Fire has a separate renderer and is deliberately not handled here.
 * Primitives are instanced by mesh/material/pass; no per-frame GL object creation.
 */
export function createGodotSkillVfxRenderer(gl, sources = {}) {
  const TAU=Math.PI*2, clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const mix=(a,b,t)=>a+(b-a)*t, smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
  const add=(a,b)=>a.map((v,i)=>v+b[i]), sub=(a,b)=>a.map((v,i)=>v-b[i]), times=(a,b)=>a.map(v=>v*b);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit=a=>times(a,1/Math.max(1e-8,Math.hypot(...a)));
  const rgb=x=>typeof x==='string'?[1,3,5].map(i=>parseInt(x.slice(i,i+2),16)/255):x.slice(0,3);
  const color=(c,a=1)=>[...rgb(c),a], light=c=>rgb(c).map((x,i)=>Math.min(1,x+[.36,.30,.24][i]));
  const linear=x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
  const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  function matrix(pos=[0,0,0],scale=[1,1,1],yaw=0,roll=0,pitch=0){
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cz=Math.cos(roll),sz=Math.sin(roll),cx=Math.cos(pitch),sx=Math.sin(pitch);
    // R_y * R_x * R_z, then independent scale.
    const x=[cy*cz+sy*sx*sz,cx*sz,-sy*cz+cy*sx*sz];
    const y=[-cy*sz+sy*sx*cz,cx*cz,sy*sz+cy*sx*cz];
    const z=[sy*cx,-sx,cy*cx];return basis(pos,times(x,scale[0]),times(y,scale[1]),times(z,scale[2]));
  }
  function basis(pos,x,y,z){return [...x,0,...y,0,...z,0,...pos,1]}
  function multiply(a,b){let o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let x=0;for(let k=0;k<4;k++)x+=a[k*4+r]*b[c*4+k];o[c*4+r]=x}return o}
  const transform=(m,p)=>[0,1,2].map(r=>m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r]);
  const CPU=new Map(),GPU=new Map(),programs=new Map(),groups=new Map(),impactStates=new WeakMap();
  let commands=[],diagnostics={version:'godot-source-port-v1',commands:0,calls:0,triangles:0,kinds:{},invalid:0},currentTag='';
  function geometry(key,make){if(CPU.has(key))return key;const m=make();
    if(!m.v.every(Number.isFinite)||!m.i.every(x=>Number.isInteger(x)&&x>=0&&x<m.v.length/8))throw Error('Invalid Godot mesh '+key);
    CPU.set(key,{vertices:new Float32Array(m.v),indices:new Uint16Array(m.i)});return key;
  }
  function grid(rows,cols,point){let v=[],i=[];for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++)v.push(...point(r/rows,c/cols));
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){let a=r*(cols+1)+c,b=a+cols+1;i.push(a,b,a+1,b,b+1,a+1)}return{v,i}}
  const sphere=()=>geometry('sphere-12x8',()=>grid(8,12,(v,u)=>{let a=u*TAU,b=(v-.5)*Math.PI,p=[Math.cos(a)*Math.cos(b),Math.sin(b),Math.sin(a)*Math.cos(b)];return [...p,...p,u,v]}));
  const quad=()=>geometry('godot-quad',()=>({v:[-.5,-.5,0,0,0,1,0,1,.5,-.5,0,0,0,1,1,1,.5,.5,0,0,0,1,1,0,-.5,.5,0,0,0,1,0,0],i:[0,1,2,0,2,3]}));
  const cylinder=(ratio=.72)=>geometry('cylinder-'+ratio,()=>grid(1,6,(v,u)=>{let a=u*TAU,r=mix(1,ratio,v);return[Math.cos(a)*r,v-.5,Math.sin(a)*r,...unit([Math.cos(a),1-ratio,Math.sin(a)]),u,v]}));
  const torus=(inner,outer)=>geometry('torus-'+inner+'-'+outer,()=>grid(24,8,(u,v)=>{let a=u*TAU,b=v*TAU,R=(inner+outer)/2,r=(outer-inner)/2;return[Math.cos(a)*(R+Math.cos(b)*r),Math.sin(b)*r,Math.sin(a)*(R+Math.cos(b)*r),Math.cos(a)*Math.cos(b),Math.sin(b),Math.sin(a)*Math.cos(b),u,v]}));
  const disc=()=>geometry('disc-24',()=>{let v=[0,0,0,0,1,0,.5,.5],i=[];for(let j=0;j<=24;j++){let a=j/24*TAU;v.push(Math.cos(a),0,Math.sin(a),0,1,0,.5+Math.cos(a)*.5,.5+Math.sin(a)*.5);if(j)i.push(0,j,j+1)}return{v,i}});
  const wave=foam=>geometry(foam?'godot-tidal-foam-24x3':'godot-tidal-body-24x8',()=>{
    const profile=foam?[[.34,.99],[.50,1.19],[.67,.94]]:[[-.72,.03],[-.45,.09],[-.20,.24],[.02,.58],[.22,.96],[.48,1.16],[.64,.96],[.54,.64]];
    let v=[],i=[];for(let s=0;s<=24;s++){let ratio=s/24,lateral=(ratio-.5)*(foam?2.58:2.44),lift=Math.max(0,Math.sin(ratio*Math.PI))**.42,taper=smooth(0,.20,ratio)*smooth(0,.20,1-ratio),bow=(1-Math.abs(ratio*2-1)**1.7)*.18;
      for(let j=0;j<profile.length;j++){let p=profile[j];v.push(lateral,p[1]*lift+Math.sin(ratio*18+j*1.7)*.018*taper,p[0]*mix(.18,1,taper)+bow,0,1,0,ratio,j/(profile.length-1))}}
    for(let s=0;s<24;s++)for(let j=0;j<profile.length-1;j++){let a=s*profile.length+j,b=a+profile.length;i.push(a,b,a+1,b,b+1,a+1)}return{v,i};
  });
  function breathMesh(range,angle,height,width){const key='godot-breath-'+[range,angle,height,width].map(x=>x.toFixed(4)).join('-');return geometry(key,()=>grid(9,8,(v,u)=>{let z=mix(.05,range,v),side=u*2-1,half=Math.max(.04,Math.tan(angle)*z*width);return[side*half,height+(1-Math.abs(side))*Math.sin(v*Math.PI)*.10,z,0,1,0,u,v]}))}
  const dart=()=>geometry('godot-crystal-dart',()=>{let v=[0,0,-.28,0,0,-1,.5,0],i=[];for(let k=0;k<2;k++)for(let j=0;j<4;j++){let a=j*TAU/4+Math.PI/4,r=k?.12:.075;v.push(Math.cos(a)*r,Math.sin(a)*r,k?.08:-.13,...unit([Math.cos(a),Math.sin(a),k?.12:-.18]),j/4,k?.58:.24)}v.push(0,0,.36,0,0,1,.5,1);for(let j=0;j<4;j++){let n=(j+1)%4;i.push(0,1+n,1+j,1+j,1+n,5+j,1+n,5+n,5+j,5+j,5+n,9)}return{v,i}});
  const crystal=()=>geometry('godot-crystal-five-facets',()=>{let v=[],i=[];for(let k=0;k<2;k++)for(let j=0;j<5;j++){let a=j*TAU/5+(k?.1:0);v.push(Math.cos(a)*(k?.82:1),k?.68:0,Math.sin(a)*(k?.82:1),...unit([Math.cos(a),k?.16:.12,Math.sin(a)]),j/5,k?.68:0)}v.push(0,1,0,0,1,0,.5,1);for(let j=0;j<5;j++){let n=(j+1)%5;i.push(j,5+j,n,n,5+j,5+n,5+j,10,5+n)}return{v,i}});
  const drill=()=>geometry('godot-drill-core-12x10',()=>grid(10,12,(v,u)=>{let a=u*TAU,r=mix(.23,.012,v**.86);return[Math.cos(a)*r,Math.sin(a)*r,mix(-.52,.58,v),...unit([Math.cos(a),Math.sin(a),.20]),u,v]}));
  const helix=()=>geometry('godot-drill-helix-3.35-turns',()=>{let v=[],i=[];for(let j=0;j<=28;j++){let t=j/28,a=t*TAU*3.35,r=mix(.25,.030,t**.84),w=mix(.052,.018,t);for(let side=0;side<2;side++){let rr=r+(side?w:-w);v.push(Math.cos(a)*rr,Math.sin(a)*rr,mix(-.50,.54,t)+(side?.025:0),Math.cos(a),Math.sin(a),0,side,t)}if(j){let n=(j-1)*2;i.push(n,n+1,n+2,n+1,n+3,n+2)}}return{v,i}});
  function emit(mesh,model,base,alpha=1,shader='stylized_procedural_vfx',extra={}){
    if(alpha<=.001)return;const c={mesh,model,base:color(base),edge:color(extra.edge||light(base)),p1:[alpha,extra.emission??1.12,extra.pulse??.025,extra.flow??1],p2:[extra.phase??0,extra.progress??0,extra.foam??0,extra.mode??0],layer:extra.layer??1,shader,tag:currentTag};
    if(![...model,...c.base,...c.edge,...c.p1,...c.p2].every(Number.isFinite)){diagnostics.invalid++;return}commands.push(c);
  }
  function ball(parent,p,r,c,alpha=1,scale=[1,1,1],shader='stylized_procedural_vfx',extra={}){emit(sphere(),multiply(parent,matrix(p,scale.map(x=>x*r))),c,alpha,shader,extra)}
  function ring(parent,inner,outer,c,alpha=1,extra={}){emit(torus(inner,outer),parent,c,alpha,'stylized_procedural_vfx',extra)}
  function tube(parent,a,b,width,c,alpha=1,extra={}){let d=sub(b,a),len=Math.hypot(...d);if(len<1e-5)return;let y=times(d,1/len),x=unit(cross(Math.abs(y[1])>.90?[1,0,0]:[0,1,0],y)),z=cross(x,y);emit(cylinder(extra.ratio??.72),multiply(parent,basis(times(add(a,b),.5),times(x,width),times(y,len),times(z,width))),c,alpha,extra.shader||'stylized_procedural_vfx',extra)}
  function arc(parent,r,start,end,height,lift,width,c,alpha=1,count=8){let p=[Math.cos(start)*r,height,Math.sin(start)*r];for(let j=1;j<=count;j++){let t=j/count,a=mix(start,end,t),q=[Math.cos(a)*r,height+Math.sin(t*Math.PI)*lift,Math.sin(a)*r];tube(parent,p,q,width,c,alpha);p=q}}
  function ground(pos,d,length,width,height,base,alpha,mode,flow=1,phase=0){emit(quad(),basis(add(pos,[0,height,0]),times(d,Math.max(.02,length)),times([-d[2],0,d[0]],Math.max(.02,width)),[0,1,0]),base,Math.min(.82,alpha*2),'procedural_water_vfx',{mode,flow,phase,layer:0})}
  function wash(parent,r,c,alpha,extra={}){emit(disc(),multiply(parent,matrix([0,0,0],[r,1,r])),c,alpha,'stylized_procedural_vfx',{...extra,layer:0})}
  const envelope=(age,life,fade=.78)=>smooth(0,.10,age/life)*(1-smooth(fade,1,age/life));
  function baseWater(t,time){const yaw=Math.atan2(t.dx,t.dz),scale=t.r/.14,root=matrix([t.x,.36,t.z],[scale,scale,scale],yaw),fade=Math.min(1,(t.life-t.age)*6);
    ball(root,[0,0,0],1,[.12,.68,1],fade,[.18*.75,.23*.75,.18*1.30],'standard',{emission:.35,edge:[.16,.78,.95]});
    ball(root,[-.035,.045,.035],1,[.72,.96,1],fade,[.12*.68,.21*.70,.12*1.12],'standard',{emission:.40,layer:2});
    for(let j=0;j<4;j++){let r=.04-j*.006;ball(root,[0,Math.sin(time*12-j)*.015,-.04-j*.07],r,[.12,.68,1],fade,[1,.9,1],'standard',{emission:.3})}
  }
  function water(t,time){let p=t.age/t.life,d=unit([t.dx??0,0,t.dz??1]),side=[-d[2],0,d[0]],pos=[t.x,0,t.z],w=t.r;
    if(t.kind==='bolt'){baseWater(t,time);return}
    if(t.kind==='beam'||t.kind==='jet'){
      let finish=add(pos,times(d,t.length)),pressure=t.kind==='jet';
      if(pressure){let a=envelope(t.age,t.life,.82),mid=times(add(pos,finish),.5);
        ground(mid,d,t.length,w*1.7,.47,[.35,.84,1],a,0,2.4);ground(mid,d,t.length,w*.72,.48,[.92,1,1],a,0,1.7,1.97);
        ground(mid,d,t.length,w*3.1,.50,[.68,.93,1],a*.36,3,1.2,3.94);ground(finish,d,w*2.7,w*2.7,.43,[.72,.96,1],a*.62,3,3,5.91);
      }else{let tip=add(pos,times(d,t.length*clamp((p-.08)/.52))),a=1-smooth(.75,1,p),length=Math.max(w,Math.hypot(...sub(tip,pos))),mid=times(add(pos,tip),.5);
        ground(mid,d,length,w*2.8,.47,[.22,.72,1],a,0,3);ground(mid,d,length*.96,w*1.45,.48,[.92,1,1],a,0,1.8,1.97);
        ground(pos,d,w*3.2,w*3.2,.43,[.50,.90,1],(1-smooth(.50,.82,p))*.7,2,3.4,3.94);ground(finish,d,w*4.9,w*4.9,.42,[.72,.96,1],smooth(.52,.75,p)*a,2,2.2,5.91);
      }return;
    }
    if(t.kind==='wave'){
      let a=envelope(t.age,t.life),surge=Math.sin(p*Math.PI),lift=.82+surge*.22+Math.sin(t.age*10)*.08;
      const bm=basis(add(pos,add(times(d,.05+Math.sin(t.age*13)*.055),[0,.03,0])),times(side,w),[0,lift,0],d);
      const fm=basis(add(pos,add(times(d,.10+surge*.12),[0,.045,0])),times(side,w),[0,lift,0],d);
      emit(wave(false),bm,[.16,.62,.96],Math.min(.82,a*.96*1.85),'tidal_wave_surface',{progress:p,phase:t.age*.30,flow:1,layer:1});
      emit(wave(true),fm,[.86,.99,1],Math.min(.82,a*.98*1.85),'tidal_wave_surface',{progress:p,phase:1.70+t.age*.42,flow:1.22,foam:1,layer:2});
      ground(sub(pos,times(d,.34)),d,w*1.10,w*2.20,.075,[.24,.70,1],a*.54,5,2.8);
      ground(sub(pos,times(d,.16)),d,w*.72,w*2.34,.09,[.86,.99,1],a*(.38+surge*.22),5,4.2,1.97);
      ground(add(pos,add(times(side,w*.88),times(d,.36))),d,w*.72,w*.72,.18,[.8,.98,1],a*(.45+surge*.22),3,2,3.94);
      ground(add(pos,add(times(side,-w*.88),times(d,.36))),times(d,-1),w*.72,w*.72,.18,[.55,.9,1],a*(.34+surge*.18),3,-1.8,5.91);
    }
  }
  function tide(t,time){let p=clamp(t.age/t.life),r=t.r,root=matrix([t.x,.04,t.z]),fade=1-smooth(.58,1,p);
    if(t.kind==='ring'||t.kind==='resonance'){
      // The shader is the original three-layer pre-EVO ring, not polygon ribbons.
      const radius=r*Math.min(1,p*3),normalized=radius/Math.max(.01,r);
      for(let j=0;j<3;j++)emit(quad(),basis([t.x,.05+j*.005,t.z],[r*2.8,0,0],[0,0,r*2.8],[0,1,0]),['#8f64ff','#c6a7ff','#efe2ff'][j],fade,'boundary_ripple',{progress:clamp(normalized*(.86-j*.055),0,.96),phase:t.age*(1+j*.17),pulse:.010+j*.003,foam:.052+j*.014,layer:0});
      for(let j=0;j<10;j++){let a=j*TAU/10+t.age*2.7,rr=radius*(.92+Math.sin(t.age*4.6+j)*.05),s=.92+Math.sin(t.age*14+j*.8)*.18;ball(root,[Math.cos(a)*rr,.04+Math.sin(a*1.6+t.age*6.5)*.03,Math.sin(a)*rr],(.065-j%3*.01)*s,[.68,.42,1],fade,[1,.85,1],'standard',{edge:[.86,.80,1],emission:.46})}return;
    }
    if(t.kind==='dome'){
      let a=envelope(t.age,t.life),pulse=.96+.06*(t.age%.18)/.18;
      ball(root,[0,r*.18,0],r,'#b997ff',a*.23,[pulse,.42*pulse,pulse],'standard',{emission:.08,layer:0});
      const m=multiply(root,matrix([0,.035,0],[r/.48,.28,r/.48],t.age*.22));ring(m,.24,.48,[.62,.38,1],a*.72);ring(m,.34,.42,[.94,.82,1],a*.66);
      for(let j=0;j<8;j++){let a=j*TAU/8;ball(m,[Math.cos(a)*.45,.035,Math.sin(a)*.45],.045,[.88,.70,1],fade*.68)}return;
    }
    if(t.kind==='vacuum'){
      let radius=Math.max(.04,r*Math.sin(p*Math.PI)),m=multiply(root,matrix([0,.035,0],[radius/.48,.6,radius/.48],t.age*1.7));
      ring(m,.18,.48,[.42,.18,.76],.72*fade);ring(m,.30,.38,[.86,.66,1],.68*fade);
      for(let j=0;j<6;j++){let a=j*TAU/6+.35;tube(m,[Math.cos(a)*.45,.03,Math.sin(a)*.45],[Math.cos(a+.42)*.16,.08,Math.sin(a+.42)*.16],.024,[.76,.52,1],.68*fade)}
    }
  }
  function toxinSignature(parent,kind,time,alpha=1){
    if(kind==='infection'){
      ball(parent,[0,0,0],.22,[.34,.72,.05],alpha,[1.18,.88,1.06]);ball(parent,[-.035,.065,-.09],.135,[.78,1,.24],alpha,[.92,1.08,.86],'stylized_procedural_vfx',{layer:2});
      for(let j=0;j<4;j++){let a=j*TAU/4+.42;ball(parent,[Math.cos(a)*.19,.08+j%2*.075,Math.sin(a)*.19],.045+j%2*.012,[.88,1,.44],alpha,[1,1.22,.92])}return;
    }
    if(kind==='bloom'){
      ball(parent,[0,0,0],.15,[.62,.92,.18],alpha);
      for(let j=0;j<8;j++){let a=j*TAU/8,m=multiply(parent,matrix([Math.cos(a)*.30,.02,Math.sin(a)*.30],[1.45,.48,.78],-a));ball(m,[0,0,0],.12,[.76,1,.36],alpha)}return;
    }
    wash(parent,.48,kind==='miasma'?[.30,.54,.04]:[.18,.48,.03],alpha*.56);
    const count=kind==='miasma'?9:4;
    for(let j=0;j<count;j++){let a=kind==='miasma'?j*2.38:j*TAU/4+.24,rr=kind==='miasma'?.12+j%3*.10:.18;
      let p=[Math.cos(a)*rr+Math.sin(time*2.8+j)*.015,.05+j%2*.04+Math.max(0,Math.sin(time*4.2+j))*.030,Math.sin(a)*rr+Math.cos(time*3.1+j)*.015];
      ball(parent,p,kind==='miasma'?.11:.12+j%2*.03,kind==='miasma'?[.48,.74,.08]:[.54,.92,.14],alpha,[1.35,.62,1.10]);
    }
    for(let j=0;j<(kind==='miasma'?3:5);j++){let a=j*2.18;ball(parent,[Math.cos(a)*.28,.12+j%2*.08+Math.max(0,Math.sin(time*4.2+j))*.03,Math.sin(a)*.28],.040+j%2*.014,[.90,1,.42],alpha,[1,1.20,.92],'stylized_procedural_vfx',{layer:2})}
  }
  function toxin(t,time){let p=clamp(t.age/t.life),r=t.r||.22,alpha=1-smooth(.70,1,p),root=matrix([t.x,.05,t.z]);
    if(t.kind==='lob'){
      const pos=[mix(t.x,t.tx,p),.26+Math.sin(p*Math.PI)*1.10,mix(t.z,t.tz,p)],size=.84+Math.sin(t.age*15)*.08,m=matrix(pos,[size,size,size],t.age*8);
      ball(m,[0,0,0],1,'#2f842c',1,[.22,.18,.22],'standard',{edge:rgb('#3d9f37'),emission:.55});ball(m,[-.055,.055,-.14],1,'#a5f15a',1,[.12,.10,.12],'standard',{edge:rgb('#8edc49'),emission:.85,layer:2});
      toxinSignature(multiply(m,matrix([0,0,0],[.66,.35,.66])),'pool',t.age,.35);return;
    }
    if(t.kind==='pool'){
      const s=(.90+Math.sin(t.age*7)*.05)*(.72+(1-p)*.28),m=multiply(root,matrix([0,0,0],[s,s,s]));wash(m,r,[.12,.66,.04],alpha*.66);
      const appear=smooth(0,.20,p),disappear=smooth(.62,1,p),ss=mix(mix(.42,1,appear),1.10,disappear);
      toxinSignature(multiply(m,matrix([0,.026,0],[r*2.12*ss,r*2.12*ss,r*2.12*ss],t.age*.06)),'pool',t.age,alpha*.76);
      for(let j=0;j<3;j++)ball(m,[Math.cos(j*2.1)*r*.42,.08+j*.028,Math.sin(j*2.1)*r*.42],.045+j*.012,'#d5ff7b',alpha,[1,.96,1],'standard',{emission:.35,layer:2});return;
    }
    if(t.kind==='infection'){
      toxinSignature(matrix([t.x,.36,t.z],[1.15,1.15,1.15],t.age*3.2),'infection',t.age,alpha*.76);
      ring(matrix([t.x,.045,t.z],[1, .4,1]),.42,.48,'#8fe85e',alpha*.72);return;
    }
    if(t.kind==='bloom'){
      let pulse=(t.age%.45)/.45,sz=.88+smooth(0,.25,p)*.20;toxinSignature(multiply(root,matrix([0,.06,0],[r*1.5*sz,1.5,r*1.5*sz],t.age*.7)),'bloom',t.age,alpha*.76);
      for(let j=0;j<8;j++){let a=j*TAU/8+t.age,dist=r*(.15+.72*pulse);ball(root,[Math.cos(a)*dist,.12+.18*(j%2)+Math.sin(pulse*Math.PI)*.24,Math.sin(a)*dist],.07+j%2*.025,'#b4f475',alpha*(1-pulse),[1,1,1],'stylized_procedural_vfx',{layer:2})}return;
    }
    if(t.kind==='miasma'){toxinSignature(multiply(root,matrix([0,.08,0],[r*2.0,r*1.6,r*2.0],t.age*.25)),'miasma',t.age,alpha*.76);return}
    if(t.kind==='burst'){const s=mix(.16,1.16,smooth(0,.65,p));toxinSignature(multiply(root,matrix([0,0,0],[r*2.35*s,r*s,r*2.35*s],t.age*1.8)),'pool',t.age,alpha*.76);return}
    if(t.kind==='arc'){let end=[t.tx,.35,t.tz],start=[t.x,.24,t.z],q=clamp(p);ball(identity(),add(times(start,1-q),times(end,q)),.09,'#baff71',alpha);}
  }
  function frost(t,time){let p=clamp(t.age/t.life),fade=1-smooth(.70,1,p),yaw=Math.atan2(t.dx??0,t.dz??1),root=matrix([t.x,.36,t.z],[1,1,1],yaw);
    if(t.kind==='crystal'){emit(dart(),root,[.46,.80,1],fade,'ice_crystal',{edge:[.94,.995,1],emission:1.22});return}
    if(t.kind==='borer'){
      const scale=Math.max(.5,t.r/.25),m=multiply(root,matrix([0,0,0],[scale,scale,scale*1.35],0,t.age*13));
      emit(drill(),m,[.42,.78,1],fade,'ice_crystal',{edge:[.92,.99,1],emission:1.24});emit(helix(),m,[.78,.94,1],fade,'ice_crystal',{edge:[1,1,1],phase:1.83,emission:1.24,layer:2});return;
    }
    if(t.kind==='cone'){
      const m=matrix([t.x,.03,t.z],[1+Math.sin(t.age*7)*.018,1,1],yaw),alpha=envelope(t.age,t.life);
      [[1,1,.08,1,[.44,.82,1],0],[.96,.88,.25,.84,[.76,.94,1],1.71],[.90,.68,.43,.62,[.92,.99,1],3.18]].forEach(([range,angle,height,width,c,phase],idx)=>emit(breathMesh(t.length*range,t.angle*angle,height,width),m,c,alpha,'frost_breath',{edge:[.94,.995,1],phase,flow:.92+phase*.05,layer:idx}));return;
    }
    if(t.kind==='chainburst'||t.kind==='burst'){
      const cluster=t.kind==='chainburst',r=t.r,positions=[[0,0],[-.24,.10],[.20,.13],[-.10,-.20],[.28,-.14],[-.30,-.12]],heights=[.92,.62,.72,.48,.56,.40];
      if(cluster){for(let j=0;j<(t.generation>0?4:6);j++){let growth=smooth(0,1,clamp((p-j*.025)/Math.max(.05,.30-j*.025))),h=r*heights[j],w=h*(.15+j%2*.025);emit(crystal(),matrix([t.x+positions[j][0]*r,.04,t.z+positions[j][1]*r],[Math.max(.001,w*growth),Math.max(.001,h*growth),Math.max(.001,w*growth)],j*1.17,-.16+(j+1)%3*.13,-.12+j%3*.11),[.42+j%2*.12,.78+j%3*.05,1],fade,'ice_crystal',{phase:j*1.37,edge:[.92,.99,1]})}}
      else{[-.34,.92,2.08,3.36,4.72].forEach((a,j)=>{let q=1-(1-p)**2,end=r*(.58+j%3*.10),dist=mix(r*.10,end,q),sz=.55+Math.sin(p*Math.PI)*.62;emit(crystal(),matrix([t.x+Math.cos(a)*dist,.08+q*(.12+j%2*.10)*r,t.z+Math.sin(a)*dist],[r*.055*sz,r*(.24+j%2*.06)*sz,r*.055*sz],-a,.22*Math.sin(a*2),.88+j%2*.18),[.42+j%2*.12,.78+j%3*.05,1],fade,'ice_crystal',{phase:j*1.37,edge:[.92,.99,1]})})}return;
    }
  }
  function chainArc(start,end,age,life,width=.090,white=true,seed=1){
    let delta=sub(end,start),distance=Math.hypot(...delta);if(distance<.01)return;let dir=times(delta,1/distance),side=unit([-dir[2],0,dir[0]]),steps=clamp(Math.floor(distance/.55)+2,3,7),amp=clamp(distance*.10,.08,.42),points=[start],fade=1-clamp(age/life);
    if(Math.hypot(...side)<.1)side=[1,0,0];
    for(let j=1;j<steps;j++){let q=j/steps;points.push(add(add(start,times(delta,q)),add(times(side,Math.sin(q*10.8+seed*1.34+j*.92)*amp),[0,Math.cos(q*13.4+seed*.51)*amp*.22,0])))}points.push(end);
    for(let j=1;j<points.length;j++){tube(identity(),points[j-1],points[j],width,'#18bfff',fade*.96,{shader:'standard',emission:.45,ratio:.55});if(white)tube(identity(),points[j-1],points[j],width*.444,'#f8ffff',fade*.96,{shader:'standard',emission:.15,ratio:.55,layer:2})}
    for(let q of [start,end])ball(identity(),q,.11,[.62,.94,1],fade,[1,.9,1],'standard',{emission:.4,layer:2});
    if(points.length>3){let a=points[2],bd=unit(add(add(times(dir,.48),times(side,seed%2?-.75:.75)),[0,.25,0])),b=add(a,times(bd,clamp(distance*.30,.35,.75)));tube(identity(),a,b,.040,'#52e8ff',fade,{shader:'standard',emission:.3,ratio:.55})}
  }
  function chain(t,time){let p=clamp(t.age/t.life),fade=1-p,root=matrix([t.x,.15,t.z]);
    if(t.kind==='arc'){chainArc([t.x,.45,t.z],[t.tx,.45,t.tz],t.age,t.life);return}
    if(t.kind==='strike'){
      chainArc([t.x-.10,3.50,t.z],[t.x,.20,t.z],t.age,t.life,.13,true,3);ring(root,.22,.42,[.32,.72,1],fade*.80);return;
    }
    if(t.kind==='network'){
      const sz=1.65;for(let j=0;j<6;j++){let a=j*TAU/6,q=[Math.cos(a)*.42*sz,Math.sin(j*2.1)*.10,Math.sin(a)*.42*sz];tube(root,[0,0,0],q,.032,[.42,.86,1],fade*.80);ball(root,q,.052,[.82,.98,1],fade*.80)}return;
    }
    if(t.kind==='tesla'||t.kind==='ring'){
      // Source Tesla signature has OPEN branching discharges, never a ground ring.
      const sz=(t.r||1)/.48,m=multiply(root,matrix([0,0,0],[sz,Math.max(1,sz*.5),sz],time*2.35)),alpha=envelope(t.age,t.life)*(.82+.18*Math.sin(t.age*42));
      ball(m,[0,.08,0],.075,[.92,1,1],alpha*.80);
      for(let j=0;j<9;j++){let a=j*TAU/9+j%2*.13,sa=a+(j%2?-.30:.34),mid=[Math.cos(sa)*.23,.13+j%3*.035,Math.sin(sa)*.23],end=[Math.cos(a)*(.43+j%3*.025),.04+j%2*.08,Math.sin(a)*(.43+j%3*.025)];tube(m,[0,.08,0],mid,.024,[.90,1,1],alpha*.80);tube(m,mid,end,.030,[.48,.84,1],alpha*.80);if(j%2===0)tube(m,mid,add(mid,times([Math.cos(a+.72),.08,Math.sin(a+.72)],.15)),.017,[.72,.94,1],alpha*.72)}
    }
  }
  function orbitSignature(parent,style,time,alpha=.80){
    if(style==='power'){
      ball(parent,[0,0,0],.31,[.46,.34,.92],alpha);ball(parent,[-.03,.06,-.12],.18,[.88,.76,1],alpha,[1,1,1],'stylized_procedural_vfx',{layer:2});ring(parent,.33,.44,[.40,.72,1],alpha);return;
    }
    ball(parent,[0,style==='halo'?.14:0,0],style==='halo'?.13:.16,style==='halo'?[.94,.90,1]:[.80,.96,1],alpha);
    if(style==='halo'){
      arc(parent,.40,-1.08,1.16,.05,.11,.024,[.58,.80,1],alpha);arc(parent,.43,1.92,4.22,.14,-.09,.022,[.82,.62,1],alpha);arc(parent,.34,.46,2.04,.26,.07,.018,[.88,.92,1],alpha,6);
      for(let j=0;j<5;j++){let a=j*TAU/5+.24;ball(parent,[Math.cos(a)*.42,.08+j%2*.12,Math.sin(a)*.42],.052+j%2*.012,[.68,.90,1],alpha)}return;
    }
    arc(parent,.25,-.92,.96,0,.055,.018,[.76,.58,1],alpha,6);arc(parent,.25,2.18,4.04,.04,-.045,.018,[.54,.88,1],alpha,6);
    if(style==='multi'){for(let j=0;j<5;j++){let a=j*TAU/5;ball(parent,[Math.cos(a)*.40,.04,Math.sin(a)*.40],.09,[.66,.88,1],alpha)}}
    else{arc(parent,.36,1.92,4.22,.12,-.08,.018,[.76,.58,1],alpha*.70);for(let j=0;j<3;j++){let a=j*TAU/3;ball(parent,[Math.cos(a)*.38,.04+j%2*.06,Math.sin(a)*.38],.060+j%2*.012,[.58,.88,1],alpha*.80)}}
  }
  function orbit(t,time){let p=clamp(t.age/t.life),fade=1-smooth(.62,1,p);
    if(t.kind==='arc'){tube(identity(),[t.x,.45,t.z],[t.tx,.45,t.tz],.025,'#c8fbff',fade*.85,{shader:'standard',emission:.4,layer:2});return}
    if(t.kind==='ring'){
      // Original Arc Halo pulse: suspended curved machinery, not another Tide.
      let size=(t.r||1)*1.45*mix(.10,1.16,smooth(0,.6,p)),m=matrix([t.x,.72,t.z],[size,size,size],t.age*1.35,.08*Math.sin(t.age*3.2));orbitSignature(m,'halo',t.age,fade*.8);
    }
  }
  function impactPlan(combat,time,visible){
    const clock=combat.clock??time;let state=impactStates.get(combat);
    if(!state||clock<state.clock){state={clock,previous:new Map(),events:[]};impactStates.set(combat,state)}
    for(const [t,count]of state.previous){const hits=t.hit?.size||0;if(hits>count&&t.kind==='bolt')state.events.push({x:t.x,z:t.z,dx:t.dx,dz:t.dz,born:clock})}
    state.previous=new Map((combat.abilities||[]).filter(t=>t.family==='water'&&t.kind==='bolt').map(t=>[t,t.hit?.size||0]));
    state.events=state.events.filter(e=>clock-e.born<.22).slice(-48);state.clock=clock;
    for(const e of state.events){if(!visible(e.x,e.z,.5))continue;const p=clamp((clock-e.born)/.22),d=[e.dx,0,e.dz],side=[-e.dz,0,e.dx],root=matrix([e.x,.08,e.z]);currentTag='water:impact';
      ball(root,[0,.035,0],.075,'#53d8ff',1-p,[mix(1.18,1.36,p),mix(.42,.24,p),mix(1.06,1.18,p)],'standard',{emission:.4});
      for(let j=0;j<4;j++){let off=(j-1.5)*.045,q=add(add(times(d,.045+j%2*.025+p*(.11+j%2*.04)),times(side,off*(1+p*.55))),[0,.045+Math.sin(p*Math.PI)*(.08+j%2*.035),0]);ball(root,q,(.026-j%2*.004)*mix(1,.24,p),'#53d8ff',1-p,[1,.83,1],'standard',{emission:.4})}
    }
  }
  function plan(combat,world={},time=0,visible=()=>true){commands=[];diagnostics.invalid=0;diagnostics.kinds={};impactPlan(combat,time,visible);
    for(const t of combat.abilities||[]){if(t.delay>0||t.life<=0||t.age>=t.life||t.family==='fire'||t.family==='chain')continue;
      if(!Number.isFinite(t.x+t.z+t.age+t.life)){diagnostics.invalid++;continue}
      let x=t.x,z=t.z,r=Math.max(t.r||1,t.length||0);if(t.kind==='lob'){x=mix(t.x,t.tx,clamp(t.age/t.life));z=mix(t.z,t.tz,clamp(t.age/t.life))}
      if(!visible(x,z,r+1))continue;currentTag=t.family+':'+t.kind;diagnostics.kinds[currentTag]=(diagnostics.kinds[currentTag]||0)+1;
      if(t.family==='water')water(t,time);else if(t.family==='tide')tide(t,time);else if(t.family==='toxin')toxin(t,time);else if(t.family==='frost')frost(t,time);else if(t.family==='chain')chain(t,time);else if(t.family==='orbit')orbit(t,time);
    }
    let style=combat.skills?.orbit?.evo||'';for(const o of combat.orbs||[]){if(!Number.isFinite(o.x+o.z+o.r)||!visible(o.x,o.z,o.r+1))continue;currentTag='orbit:orb';diagnostics.kinds[currentTag]=(diagnostics.kinds[currentTag]||0)+1;
      const scale=o.r/(style==='power'?.31:.16),root=matrix([o.x,.44+.055*Math.sin(time*5.4),o.z],[scale,scale,scale],time*3.4);
      orbitSignature(root,style,time,.80);
    }
    diagnostics.commands=commands.length;return commands;
  }
  // Shader bodies below are unmodified originals. Only Godot I/O and the six
  // spatial material declarations are mapped onto instanced WebGL attributes.
  const mappings={base_color:'gdBase',tint:'gdBase',ring_color:'gdBase',edge_color:'gdEdge',frost_color:'gdEdge',alpha_multiplier:'gdP1.x',emission_strength:'gdP1.y',pulse_strength:'gdP1.z',edge_variation:'gdP1.z',flow_speed:'gdP1.w',phase:'gdP2.x',phase_offset:'gdP2.x',progress:'gdP2.y',life_progress:'gdP2.y',foam_layer:'gdP2.z',band_width:'gdP2.z',shape_mode:'int(gdP2.w+.5)'};
  const standard='void fragment(){ALBEDO=base_color.rgb;EMISSION=edge_color.rgb*emission_strength;ALPHA=alpha_multiplier;}';
  function shaderPair(name){let raw=name==='standard'?standard:sources[name];if(typeof raw!=='string')throw Error('Missing ORIGINAL Godot shader: '+name);
    raw=raw.replace(/^\s*(shader_type|render_mode)[^;]*;\s*$/gm,'').replace(/uniform\s+\w+\s+\w+\s*(?::[^=;\n]+)?(?:=[^;\n]*)?;/g,'');
    const defines=Object.entries(mappings).map(([k,v])=>'#define '+k+' ('+v+')').join('\n');
    const globals='vec3 VERTEX,NORMAL,VIEW,ALBEDO,EMISSION;vec2 UV;float ALPHA;\n';
    const uniform='uniform mat4 gdVP;uniform vec3 gdView;uniform float TIME;\n';
    const varying='vec4 gdBase;\n';
    const vertex=`#version 300 es\nprecision highp float;precision highp int;\nlayout(location=0)in vec3 gdPosition;layout(location=1)in vec3 gdN;layout(location=2)in vec2 gdUV;layout(location=3)in mat4 gdModel;layout(location=7)in vec4 gdBase;layout(location=8)in vec4 gdEdge;layout(location=9)in vec4 gdP1;layout(location=10)in vec4 gdP2;\nout vec2 gdOutUV;out vec3 gdOutN;flat out vec4 gdOutBase,gdOutEdge,gdOutP1,gdOutP2;\n${uniform}${globals}${defines}\n${raw}\nvoid main(){VERTEX=gdPosition;NORMAL=gdN;UV=gdUV;VIEW=gdView;${/void\s+vertex\s*\(/.test(raw)?'vertex();':''}gdOutUV=UV;gdOutN=transpose(inverse(mat3(gdModel)))*NORMAL;gdOutBase=gdBase;gdOutEdge=gdEdge;gdOutP1=gdP1;gdOutP2=gdP2;gl_Position=gdVP*gdModel*vec4(VERTEX,1.);}`;
    const fragment=`#version 300 es\nprecision highp float;precision highp int;\nin vec2 gdOutUV;in vec3 gdOutN;flat in vec4 gdOutBase,gdOutEdge,gdOutP1,gdOutP2;out vec4 gdColor;\n#define gdBase gdOutBase\n#define gdEdge gdOutEdge\n#define gdP1 gdOutP1\n#define gdP2 gdOutP2\n${uniform}${globals}${defines}\n${raw}\nvec3 gdToSRGB(vec3 v){v=max(v,vec3(0));return mix(v*12.92,1.055*pow(v,vec3(1./2.4))-.055,step(vec3(.0031308),v));}\nvoid main(){UV=gdOutUV;NORMAL=normalize(gdOutN);VIEW=normalize(gdView);ALBEDO=vec3(0);EMISSION=vec3(0);ALPHA=1.;fragment();if(ALPHA<=.003)discard;gdColor=vec4(gdToSRGB(ALBEDO+EMISSION),clamp(ALPHA,0.,1.));}`;
    return{vertex,fragment};
  }
  function program(name){if(programs.has(name))return programs.get(name);const pair=shaderPair(name),p=gl.createProgram();for(const [type,text] of [[gl.VERTEX_SHADER,pair.vertex],[gl.FRAGMENT_SHADER,pair.fragment]]){const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Godot VFX '+name+': '+gl.getShaderInfoLog(s));gl.attachShader(p,s);gl.deleteShader(s)}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Godot VFX '+name+': '+gl.getProgramInfoLog(p));const o={p,vp:gl.getUniformLocation(p,'gdVP'),view:gl.getUniformLocation(p,'gdView'),time:gl.getUniformLocation(p,'TIME')};programs.set(name,o);return o}
  function gpuMesh(key){if(GPU.has(key))return GPU.get(key);const cpu=CPU.get(key),vao=gl.createVertexArray(),vb=gl.createBuffer(),ib=gl.createBuffer(),instances=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,cpu.vertices,gl.STATIC_DRAW);for(let [i,n,offset]of [[0,3,0],[1,3,12],[2,2,24]]){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,n,gl.FLOAT,false,32,offset)}gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,cpu.indices,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,instances);for(let i=3;i<=10;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,4,gl.FLOAT,false,128,(i-3)*16);gl.vertexAttribDivisor(i,1)}const o={vao,vb,ib,instances,count:cpu.indices.length,capacity:0};GPU.set(key,o);return o}
  function draw(combat,world,vp,time,visible){const items=plan(combat,world,time,visible);if(!gl)return{calls:0,triangles:0,commands:items};
    groups.clear();for(const c of items){const key=c.layer+'|'+c.shader+'|'+c.mesh;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c)}let calls=0,triangles=0;
    const view=unit(cross([vp[0],vp[4],vp[8]],[vp[1],vp[5],vp[9]]));
    gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
    for(const list of [...groups.values()].sort((a,b)=>a[0].layer-b[0].layer)){
      const first=list[0],p=program(first.shader),mesh=gpuMesh(first.mesh),data=new Float32Array(list.length*32);
      for(let j=0;j<list.length;j++){const c=list[j];data.set(c.model,j*32);data.set([...c.base.slice(0,3).map(linear),c.base[3],...c.edge.slice(0,3).map(linear),c.edge[3],...c.p1,...c.p2],j*32+16)}
      gl.useProgram(p.p);gl.uniformMatrix4fv(p.vp,false,vp);gl.uniform3fv(p.view,view);gl.uniform1f(p.time,time);gl.bindVertexArray(mesh.vao);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.instances);
      if(data.byteLength>mesh.capacity){mesh.capacity=2**Math.ceil(Math.log2(Math.max(128,data.byteLength)));gl.bufferData(gl.ARRAY_BUFFER,mesh.capacity,gl.DYNAMIC_DRAW)}gl.bufferSubData(gl.ARRAY_BUFFER,0,data);gl.drawElementsInstanced(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0,list.length);calls++;triangles+=mesh.count/3*list.length;
    }
    gl.bindVertexArray(null);gl.depthMask(true);gl.disable(gl.BLEND);diagnostics.calls=calls;diagnostics.triangles=triangles;return{calls,triangles};
  }
  if(gl)for(const name of Object.keys(sources).concat('standard'))program(name);
  return{draw,plan,shaderPair,get meshes(){return CPU},get diagnostics(){return {...diagnostics}},dispose(){if(!gl)return;for(const m of GPU.values()){gl.deleteVertexArray(m.vao);gl.deleteBuffer(m.vb);gl.deleteBuffer(m.ib);gl.deleteBuffer(m.instances)}for(const p of programs.values())gl.deleteProgram(p.p);GPU.clear();programs.clear();CPU.clear()}};
}
