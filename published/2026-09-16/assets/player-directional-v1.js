// Directional 2D slime renderer v3 — runtime squash/stretch + local push deformation.
(()=>{
  const G=globalThis.WebGL2RenderingContext;
  if(!G)return;

  const KEY='slime.player.directional.v3';
  const LEGACY_KEY='slime.player.directional.v2';
  const MAX_PUSHES=8;
  const defaults={
    on:true,cycle:.96,stretch:.075,squash:.038,lead:.18,phase:0,axis:0,scale:1,
    idle:.008,idleSpeed:2.15,threshold:.0105,g:[1,1,1,1,1,1,1,1],
    pushes:Array.from({length:8},()=>[])
  };
  const lim={cycle:[.25,2],stretch:[0,.28],squash:[0,.18],lead:[0,.75],phase:[-180,180],axis:[-45,45],scale:[.65,1.45],idle:[0,.04],idleSpeed:[.25,6],threshold:[.001,.08]};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const copyDefaults=()=>({...defaults,g:[...defaults.g],pushes:defaults.pushes.map(()=>[])});
  function cleanPush(p){
    if(!p||typeof p!=='object')return null;
    const x=Number(p.x),y=Number(p.y),dx=Number(p.dx),dy=Number(p.dy),r=Number(p.r),s=Number(p.s??1);
    if(![x,y,dx,dy,r,s].every(Number.isFinite))return null;
    return {x:clamp(x,0,1),y:clamp(y,0,1),dx:clamp(dx,-.7,.7),dy:clamp(dy,-.7,.7),r:clamp(r,.03,.65),s:clamp(s,.05,2)};
  }
  function clean(x={}){
    const r=copyDefaults();
    for(const[k,[a,b]]of Object.entries(lim))if(Number.isFinite(x[k]))r[k]=clamp(x[k],a,b);
    if(typeof x.on==='boolean')r.on=x.on;
    if(Array.isArray(x.g))x.g.forEach((v,i)=>{if(i<8&&Number.isFinite(v))r.g[i]=clamp(v,.35,1.8)});
    if(Array.isArray(x.pushes))for(let d=0;d<8;d++)if(Array.isArray(x.pushes[d]))r.pushes[d]=x.pushes[d].map(cleanPush).filter(Boolean).slice(-MAX_PUSHES);
    return r;
  }
  let T=(()=>{try{const raw=localStorage.getItem(KEY)||localStorage.getItem(LEGACY_KEY)||'{}';return clean(JSON.parse(raw))}catch{return clean()}})();
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(T))}catch{}};

  const P=G.prototype,O={g:P.getUniformLocation,u:P.uniform1f,v:P.uniform3fv,m:P.uniformMatrix4fv,e:P.drawElements,a:P.drawArrays};
  const N=new WeakMap,C=new WeakMap,R={img:null,ok:0,bad:0,b:null,asp:1,dir:4,moving:0,wave:0};
  function S(gl){let s=C.get(gl);return s||(s={kind:-1,kp:null,out:0,j:[0,0,0],time:0,vp:null,model:null,spr:null},C.set(gl,s)),s}
  P.getUniformLocation=function(p,n){const q=O.g.call(this,p,n);if(q)N.set(q,{p,n});return q};
  P.uniform1f=function(q,x){const i=N.get(q),s=S(this);if(i?.n==='kind'){s.kind=x;s.kp=i.p}else if(i?.n==='outline')s.out=x;else if(i?.n==='time')s.time=x;return O.u.call(this,q,x)};
  P.uniform3fv=function(q,x){if(N.get(q)?.n==='jellyMotion')S(this).j=[x[0],x[1],x[2]];return O.v.call(this,q,x)};
  P.uniformMatrix4fv=function(q,t,x){const n=N.get(q)?.n,s=S(this);if(n==='vp')s.vp=new Float32Array(x);else if(n==='model')s.model=new Float32Array(x);return O.m.call(this,q,t,x)};

  function bounds(im){
    const c=document.createElement('canvas'),w=im.naturalWidth,h=im.naturalHeight;c.width=w;c.height=h;
    const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(im,0,0);
    const d=x.getImageData(0,0,w,h).data,cw=w/3,ch=h/3,b=[];
    for(let row=0;row<3;row++){
      const line=[];
      for(let col=0;col<3;col++){
        let X=cw,Y=ch,A=0,B=0,hit=0,x0=Math.floor(col*cw),y0=Math.floor(row*ch),x1=Math.ceil((col+1)*cw),y1=Math.ceil((row+1)*ch);
        for(let yy=y0;yy<y1;yy+=2)for(let xx=x0;xx<x1;xx+=2)if(d[(yy*w+xx)*4+3]>12){hit=1;X=Math.min(X,xx-x0);A=Math.max(A,xx-x0);Y=Math.min(Y,yy-y0);B=Math.max(B,yy-y0)}
        line.push(hit?[X/cw,Y/ch,(A+2)/cw,(B+2)/ch]:[0,0,1,1]);
      }
      b.push(line);
    }
    R.asp=cw/ch;return b;
  }
  const I=new Image();R.img=I;I.decoding='async';
  I.onload=()=>{try{R.b=bounds(I)}catch{R.b=null;R.asp=I.naturalWidth/I.naturalHeight}R.ok=1};
  I.onerror=()=>{R.bad=1;console.warn('slime directional atlas failed')};
  I.src=new URL('./player-slime-directions.webp?v=3',import.meta.url).href;

  function sh(gl,t,s){const a=gl.createShader(t);gl.shaderSource(a,s);gl.compileShader(a);if(!gl.getShaderParameter(a,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(a)||'shader');return a}
  function pg(gl,v,f){const p=gl.createProgram(),a=sh(gl,gl.VERTEX_SHADER,v),b=sh(gl,gl.FRAGMENT_SHADER,f);gl.attachShader(p,a);gl.attachShader(p,b);gl.linkProgram(p);gl.deleteShader(a);gl.deleteShader(b);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p)||'link');return p}

  function makeGrid(gl,n=14){
    const verts=[],inds=[];
    for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){
      const u=x/n,v=y/n;verts.push(-1+2*u,-1+2*v,u,v);
    }
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const a=y*(n+1)+x,b=a+1,c=a+n+1,d=c+1;inds.push(a,c,b,b,c,d);
    }
    const va=gl.createVertexArray();gl.bindVertexArray(va);
    const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,16,0);
    gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,16,8);
    const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(inds),gl.STATIC_DRAW);gl.bindVertexArray(null);
    return {va,vb,ib,count:inds.length};
  }

  function sprite(gl){
    const s=S(gl);if(s.spr)return s.spr;if(!R.ok||R.bad)return null;
    const p=pg(gl,
`#version 300 es
precision highp float;
layout(location=0)in vec2 p;layout(location=1)in vec2 u;out vec2 U;
uniform vec2 c,h,l;uniform mat2 d;uniform float z;
uniform vec4 pushA[${MAX_PUSHES}];uniform vec2 pushB[${MAX_PUSHES}];uniform int pushCount;
void main(){
  vec2 q=p;
  for(int i=0;i<${MAX_PUSHES};i++){
    if(i>=pushCount)break;
    vec2 center=pushA[i].xy;vec2 delta=pushA[i].zw;float radius=pushB[i].x;float strength=pushB[i].y;
    vec2 brushUV=vec2(u.x,1.0-u.y);float dist=distance(brushUV,center);float w=1.0-smoothstep(0.0,radius,dist);w=w*w*(3.0-2.0*w);
    q+=vec2(delta.x,-delta.y)*2.0*w*strength;
  }
  gl_Position=vec4(c+d*(q*h)+l,z,1.0);U=u;
}`,
`#version 300 es
precision highp float;in vec2 U;uniform sampler2D a;uniform vec4 r;out vec4 o;
void main(){vec4 t=texture(a,r.xy+U*r.zw);if(t.a<.018)discard;o=vec4(t.rgb*t.a,t.a);}`);
    const grid=makeGrid(gl,14),tex=gl.createTexture(),ac=gl.getParameter(gl.ACTIVE_TEXTURE);gl.activeTexture(gl.TEXTURE10);
    const old=gl.getParameter(gl.TEXTURE_BINDING_2D),fy=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL),pm=gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
    gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,I);
    for(const q of[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,q,gl.LINEAR);
    for(const q of[gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,q,gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,fy);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,pm);gl.bindTexture(gl.TEXTURE_2D,old);gl.activeTexture(ac);
    const u={};for(const n of['c','h','l','d','z','a','r','pushCount'])u[n]=O.g.call(gl,p,n);
    u.pushA=O.g.call(gl,p,'pushA[0]');u.pushB=O.g.call(gl,p,'pushB[0]');
    return s.spr={p,grid,tex,u};
  }

  function pt(m,x,y,z){const w=m[3]*x+m[7]*y+m[11]*z+m[15];return[(m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w,(m[2]*x+m[6]*y+m[10]*z+m[14])/w]}
  const cell=[[1,2],[2,2],[2,1],[2,0],[1,0],[0,0],[0,1],[0,2]],names=['S','SE','E','NE','N','NW','W','SW'];
  function draw(gl){
    const s=S(gl),sp=sprite(gl);if(!sp||!s.vp||!s.model)return 0;
    const m=s.model,v=s.vp,x=m[12],z=m[14],yaw=Math.atan2(-m[2],m[0]),o=(Math.round(yaw/(Math.PI/4))%8+8)%8,mov=Math.abs(s.j[2])>T.threshold,[co,ro]=mov?cell[o]:[1,1];
    R.dir=o;R.moving=mov;
    const dep=pt(v,x,.3,z)[2],sx=Math.hypot(m[0],m[2]),sy=Math.abs(m[5]),sz=Math.hypot(m[8],m[10]),bs=Math.cbrt(Math.max(1e-6,sx*sy*sz))*T.scale;
    let miX=9,maX=-9,miY=9,maY=-9;
    for(let j=0;j<=6;j++){
      const l=j/6*Math.PI,rr=.012+.708*((1+Math.cos(l))*.5)**1.65,rad=.5*Math.sin(l);
      for(let k=0;k<8;k++){const a=k/8*Math.PI*2,q=pt(v,x+Math.cos(a)*rad*bs,rr*bs,z+Math.sin(a)*rad*bs);miX=Math.min(miX,q[0]);maX=Math.max(maX,q[0]);miY=Math.min(miY,q[1]);maY=Math.max(maY,q[1])}
    }
    const cen=[(miX+maX)/2,(miY+maY)/2],hh0=(maY-miY)/2,ph=s.time*Math.PI*2/Math.max(.05,T.cycle)+T.phase*Math.PI/180,g=T.g[o]||1,wav=mov&&T.on?Math.sin(ph)*g:Math.sin(s.time*T.idleSpeed)*.12;
    R.wave=wav;
    const al=mov&&T.on?1+T.stretch*wav:1+T.idle*wav,cr=mov&&T.on?1-T.squash*wav:1-T.idle*.5*wav,th=yaw-Math.PI/2+T.axis*Math.PI/180,c=Math.cos(th),q=Math.sin(th),A=al*c*c+cr*q*q,B=(al-cr)*c*q,Dd=al*q*q+cr*c*c;
    const bb=R.b?.[ro]?.[co]||[0,0,1,1],vh=Math.max(.2,bb[3]-bb[1]),hh=hh0/vh,hw=hh*R.asp,ox=((bb[0]+bb[2])/2-.5)*2*hw,oy=(.5-(bb[1]+bb[3])/2)*2*hh,cx=cen[0]-ox,cy=cen[1]-oy,ld=mov&&T.on?(al-1)*hh0*T.lead:0,lx=Math.cos(th)*ld,ly=Math.sin(th)*ld;

    const op=gl.getParameter(gl.CURRENT_PROGRAM),ov=gl.getParameter(gl.VERTEX_ARRAY_BINDING),ac=gl.getParameter(gl.ACTIVE_TEXTURE),cu=gl.isEnabled(gl.CULL_FACE),bl=gl.isEnabled(gl.BLEND),de=gl.isEnabled(gl.DEPTH_TEST),dm=gl.getParameter(gl.DEPTH_WRITEMASK);
    gl.useProgram(sp.p);gl.bindVertexArray(sp.grid.va);gl.activeTexture(gl.TEXTURE10);const ot=gl.getParameter(gl.TEXTURE_BINDING_2D);gl.bindTexture(gl.TEXTURE_2D,sp.tex);
    gl.uniform1i(sp.u.a,10);gl.uniform2f(sp.u.c,cx,cy);gl.uniform2f(sp.u.h,hw,hh);gl.uniformMatrix2fv(sp.u.d,false,new Float32Array([A,B,B,Dd]));gl.uniform2f(sp.u.l,lx,ly);gl.uniform1f(sp.u.z,dep);gl.uniform4f(sp.u.r,co/3,(2-ro)/3,1/3,1/3);
    const pushes=(mov?T.pushes[o]:[])||[],pa=new Float32Array(MAX_PUSHES*4),pb=new Float32Array(MAX_PUSHES*2),count=Math.min(MAX_PUSHES,pushes.length);
    for(let i=0;i<count;i++){const p=pushes[i];pa.set([p.x,p.y,p.dx,p.dy],i*4);pb.set([p.r,p.s],i*2)}
    gl.uniform1i(sp.u.pushCount,count);gl.uniform4fv(sp.u.pushA,pa);gl.uniform2fv(sp.u.pushB,pb);
    gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);O.e.call(gl,gl.TRIANGLES,sp.grid.count,gl.UNSIGNED_SHORT,0);
    gl.bindTexture(gl.TEXTURE_2D,ot);gl.activeTexture(ac);gl.bindVertexArray(ov);gl.useProgram(op);gl.depthMask(dm);cu?gl.enable(gl.CULL_FACE):gl.disable(gl.CULL_FACE);bl?gl.enable(gl.BLEND):gl.disable(gl.BLEND);de?gl.enable(gl.DEPTH_TEST):gl.disable(gl.DEPTH_TEST);return 1;
  }
  function rep(gl,fb){const s=S(gl);if(!R.ok||R.bad||s.kind!==8||gl.getParameter(gl.CURRENT_PROGRAM)!==s.kp)return fb();if(Math.abs(s.out)>.0001)return;try{return draw(gl)||fb()}catch(e){R.bad=1;console.warn('slime directional disabled',e);return fb()}}
  P.drawElements=function(m,c,t,o){return rep(this,()=>O.e.call(this,m,c,t,o))};
  P.drawArrays=function(m,f,c){return rep(this,()=>O.a.call(this,m,f,c))};

  const API={
    get tune(){return T},get runtime(){return R},names,MAX_PUSHES,clean,
    set(x){T=clean(x)},save,reset(){T=clean();save()},
    addPush(dir,p){dir=clamp(Math.round(dir),0,7);const cp=cleanPush(p);if(!cp)return false;(T.pushes[dir]||(T.pushes[dir]=[])).push(cp);T.pushes[dir]=T.pushes[dir].slice(-MAX_PUSHES);return true},
    undoPush(dir){dir=clamp(Math.round(dir),0,7);return T.pushes[dir]?.pop()||null},
    clearPushes(dir){dir=clamp(Math.round(dir),0,7);T.pushes[dir]=[]}
  };
  globalThis.__slimeDirectionalV3=API;globalThis.__slimeDirectionalV2=API;
  import('./player-directional-tuner-v2.js?v=3').catch(e=>console.warn('slime tuner unavailable',e));
})();
