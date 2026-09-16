// Round-base slime mode: always sample the center blob and deform it in-game.
// Direction is used only for the stretch axis, never for choosing artwork.
(()=>{
  const GL=globalThis.WebGL2RenderingContext;
  if(!GL)return;
  const P=GL.prototype;
  const old={
    getUniformLocation:P.getUniformLocation,
    uniform4f:P.uniform4f,
    uniform1i:P.uniform1i,
  };
  const meta=new WeakMap();
  const slimePrograms=new WeakSet();
  const CENTER=1/3;
  const EPS=1e-5;

  P.getUniformLocation=function(program,name){
    const loc=old.getUniformLocation.call(this,program,name);
    if(loc)meta.set(loc,{program,name});
    if(loc&&name==='pushCount')slimePrograms.add(program);
    return loc;
  };

  // player-directional-v1 caches the original getUniformLocation before this module runs,
  // so some sprite uniforms bypass the hook above. The sprite sampler is bound to texture
  // unit 10; use that draw-time signal to identify the actual player-sprite program too.
  P.uniform1i=function(loc,value){
    const program=this.getParameter(this.CURRENT_PROGRAM);
    if(program&&value===10)slimePrograms.add(program);
    const m=meta.get(loc);
    if(m?.name==='pushCount'&&slimePrograms.has(m.program))return old.uniform1i.call(this,loc,0);
    return old.uniform1i.call(this,loc,value);
  };

  P.uniform4f=function(loc,a,b,c,d){
    const program=this.getParameter(this.CURRENT_PROGRAM);
    const m=meta.get(loc);
    const atlasRect=Math.abs(c-CENTER)<EPS&&Math.abs(d-CENTER)<EPS&&
      Math.abs(a*3-Math.round(a*3))<EPS&&Math.abs(b*3-Math.round(b*3))<EPS;
    if((m?.name==='r'&&slimePrograms.has(m.program))||(program&&slimePrograms.has(program)&&atlasRect)){
      // Center cell of the 3x3 atlas is the round slime. Never sample a directional tail cell.
      return old.uniform4f.call(this,loc,CENTER,CENTER,CENTER,CENTER);
    }
    return old.uniform4f.call(this,loc,a,b,c,d);
  };

  function clearTailSculpt(){
    const api=globalThis.__slimeDirectionalV3||globalThis.__slimeDirectionalV2;
    const pushes=api?.tune?.pushes;
    if(Array.isArray(pushes)){
      for(let i=0;i<8;i++)pushes[i]=[];
      try{api.save?.()}catch{}
    }
  }

  function lockCenterBounds(){
    const api=globalThis.__slimeDirectionalV3||globalThis.__slimeDirectionalV2;
    const b=api?.runtime?.b;
    if(!b?.[1]?.[1])return false;
    const center=[...b[1][1]];
    for(let y=0;y<3;y++)for(let x=0;x<3;x++)b[y][x]=[...center];
    api.runtime.roundBase=true;
    clearTailSculpt();
    return true;
  }

  clearTailSculpt();
  if(!lockCenterBounds()){
    let tries=0;
    const timer=setInterval(()=>{
      if(lockCenterBounds()||++tries>240)clearInterval(timer);
    },25);
  }

  function simplifyTuner(){
    const root=document.getElementById('slime-motion-tuner');
    if(!root)return false;
    const summary=root.querySelector('summary');
    if(summary)summary.textContent='ปรับยืด–หดสไลม์ก้อนกลม';
    const shape=root.querySelector('[data-p="shape"]');
    if(shape)shape.hidden=true;
    const shapeTools=root.querySelector('#sm-shape-tools');
    if(shapeTools)shapeTools.hidden=true;
    return true;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{
    if(!simplifyTuner()){
      const mo=new MutationObserver(()=>simplifyTuner()&&mo.disconnect());
      mo.observe(document.body,{childList:true,subtree:true});
    }
  },{once:true});
  else if(!simplifyTuner()){
    const mo=new MutationObserver(()=>simplifyTuner()&&mo.disconnect());
    mo.observe(document.body,{childList:true,subtree:true});
  }

  globalThis.__slimeRoundBase={enabled:true,cell:[1,1],directionalArtwork:false,version:2};
})();
