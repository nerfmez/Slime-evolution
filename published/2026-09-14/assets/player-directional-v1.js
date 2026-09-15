// Directional 2D player slime v2 for the pinned 2026-09-14 release.
// 3x3 atlas: NW/N/NE, W/idle/E, SW/S/SE. Authored lighting stays fixed at upper-right.
(() => {
  const GL = globalThis.WebGL2RenderingContext;
  if (!GL) return;

  const SETTINGS_KEY = 'slime.player.directional.v2';
  const defaults = Object.freeze({
    enabled: true,
    cycle: 0.96,
    stretch: 0.075,
    squash: 0.038,
    lead: 0.18,
    phaseDeg: 0,
    axisDeg: 0,
    scale: 1,
    idleBreath: 0.008,
    idleSpeed: 2.15,
    moveThreshold: 0.0105,
    dirGain: [1,1,1,1,1,1,1,1],
  });
  const limits = {
    cycle:[0.25,2], stretch:[0,0.28], squash:[0,0.18], lead:[0,0.75],
    phaseDeg:[-180,180], axisDeg:[-45,45], scale:[0.65,1.45],
    idleBreath:[0,0.04], idleSpeed:[0.25,6], moveThreshold:[0.001,0.08],
  };
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function sanitize(raw={}){
    const out={...defaults,dirGain:[...defaults.dirGain]};
    for(const [k,[a,b]] of Object.entries(limits)) if(Number.isFinite(raw[k])) out[k]=clamp(raw[k],a,b);
    if(typeof raw.enabled==='boolean') out.enabled=raw.enabled;
    if(Array.isArray(raw.dirGain)) for(let i=0;i<8;i++) if(Number.isFinite(raw.dirGain[i])) out.dirGain[i]=clamp(raw.dirGain[i],.35,1.8);
    return out;
  }
  let tune=(()=>{try{return sanitize(JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'))}catch{return sanitize()}})();
  const save=()=>{try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(tune))}catch{}};

  const proto = GL.prototype;
  const original = {
    getUniformLocation: proto.getUniformLocation,
    uniform1f: proto.uniform1f,
    uniform3fv: proto.uniform3fv,
    uniformMatrix4fv: proto.uniformMatrix4fv,
    drawElements: proto.drawElements,
    drawArrays: proto.drawArrays,
  };

  const uniformNames = new WeakMap();
  const contexts = new WeakMap();
  const runtime = { image:null, ready:false, failed:false, bounds:null, cellAspect:1, lastDir:4, lastMoving:false, lastWave:0 };

  function contextState(gl) {
    let state = contexts.get(gl);
    if (!state) {
      state = { kind:-1, kindProgram:null, outline:0, jelly:[0,0,0], time:0, vp:null, model:null, sprite:null, playerDrawSerial:0 };
      contexts.set(gl, state);
    }
    return state;
  }
  function rememberLocation(program,name,location){ if(location) uniformNames.set(location,{program,name}); return location; }
  proto.getUniformLocation=function(program,name){return rememberLocation(program,name,original.getUniformLocation.call(this,program,name));};
  proto.uniform1f=function(location,value){
    const info=uniformNames.get(location);
    if(info?.name==='kind'){const state=contextState(this);state.kind=value;state.kindProgram=info.program;}
    else if(info?.name==='outline')contextState(this).outline=value;
    else if(info?.name==='time')contextState(this).time=value;
    return original.uniform1f.call(this,location,value);
  };
  proto.uniform3fv=function(location,value){
    const info=uniformNames.get(location); if(info?.name==='jellyMotion')contextState(this).jelly=[value[0],value[1],value[2]];
    return original.uniform3fv.call(this,location,value);
  };
  proto.uniformMatrix4fv=function(location,transpose,value){
    const info=uniformNames.get(location);
    if(info?.name==='vp')contextState(this).vp=new Float32Array(value);
    else if(info?.name==='model')contextState(this).model=new Float32Array(value);
    return original.uniformMatrix4fv.call(this,location,transpose,value);
  };

  function measureAtlasBounds(image){
    const cvs=document.createElement('canvas'),w=image.naturalWidth,h=image.naturalHeight;
    cvs.width=w;cvs.height=h;const ctx=cvs.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
    const data=ctx.getImageData(0,0,w,h).data,cw=w/3,ch=h/3,bounds=[];
    for(let row=0;row<3;row++){
      const line=[];
      for(let col=0;col<3;col++){
        let minX=cw,maxX=0,minY=ch,maxY=0,hit=false;
        const x0=Math.floor(col*cw),x1=Math.ceil((col+1)*cw),y0=Math.floor(row*ch),y1=Math.ceil((row+1)*ch);
        for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2){if(data[(y*w+x)*4+3]>12){hit=true;minX=Math.min(minX,x-x0);maxX=Math.max(maxX,x-x0);minY=Math.min(minY,y-y0);maxY=Math.max(maxY,y-y0);}}
        line.push(hit?[minX/cw,minY/ch,(maxX+2)/cw,(maxY+2)/ch]:[0,0,1,1]);
      }
      bounds.push(line);
    }
    runtime.cellAspect=cw/ch; return bounds;
  }

  const atlasUrl=new URL('./player-slime-directions.webp?v=2',import.meta.url).href;
  const image=new Image();runtime.image=image;image.decoding='async';
  image.onload=()=>{try{runtime.bounds=measureAtlasBounds(image)}catch{runtime.bounds=null;runtime.cellAspect=image.naturalWidth/image.naturalHeight}runtime.ready=true;};
  image.onerror=()=>{runtime.failed=true;console.warn('Directional slime atlas failed to load; keeping original player renderer.');};
  image.src=atlasUrl;

  function compile(gl,type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(shader)||'Directional slime shader compile failed';gl.deleteShader(shader);throw new Error(error)}return shader;}
  function link(gl,vertexSource,fragmentSource){const program=gl.createProgram(),vs=compile(gl,gl.VERTEX_SHADER,vertexSource),fs=compile(gl,gl.FRAGMENT_SHADER,fragmentSource);gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS)){const error=gl.getProgramInfoLog(program)||'Directional slime shader link failed';gl.deleteProgram(program);throw new Error(error)}return program;}

  function ensureSprite(gl){
    const state=contextState(gl);if(state.sprite)return state.sprite;if(!runtime.ready||runtime.failed)return null;
    const program=link(gl,
      `#version 300 es\nprecision highp float;\nlayout(location=0) in vec2 position;\nlayout(location=1) in vec2 uv;\nout vec2 UV;\nuniform vec2 center;\nuniform vec2 halfSize;\nuniform mat2 deform;\nuniform vec2 leadShift;\nuniform float depthNdc;\nvoid main(){vec2 p=deform*(position*halfSize)+leadShift;gl_Position=vec4(center+p,depthNdc,1.0);UV=uv;}`,
      `#version 300 es\nprecision highp float;\nin vec2 UV;\nuniform sampler2D atlas;\nuniform vec4 uvRect;\nout vec4 outColor;\nvoid main(){vec4 tex=texture(atlas,uvRect.xy+UV*uvRect.zw);if(tex.a<0.018)discard;outColor=vec4(tex.rgb*tex.a,tex.a);}`
    );
    const vertices=new Float32Array([-1,-1,0,0, 1,-1,1,0, 1,1,1,1, -1,1,0,1]),indices=new Uint16Array([0,1,2,0,2,3]),vao=gl.createVertexArray();
    gl.bindVertexArray(vao);const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFFR,vertices,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,16,8);const ibo=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);gl.bindVertexArray(null);
    const texture=gl.createTexture(),previousActive=gl.getParameter(gl.ACTIVE_TEXTURE);gl.activeTexture(gl.TEXTURE10);const previousTexture=gl.getParameter(gl.TEXTURE_BINDING_2D),previousFlip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL),previousPremultiply=gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,runtime.image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,previousFlip);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,previousPremultiply);gl.bindTexture(gl.TEXTURE_2D,previousTexture);gl.activeTexture(previousActive);
    const locations={};for(const name of ['center','halfSize','deform','leadShift','depthNdc','atlas','uvRect'])olocations[name]=original.getUniformLocation.call(gl,program,name);
    return state.sprite={program,vao,vbo,ibo,texture,locations};
  }

  function multiplyPoint(m,x,y,z){const w=m[3]*x+MÄ