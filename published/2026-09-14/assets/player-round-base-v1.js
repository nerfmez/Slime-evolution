// Round-base slime mode: always sample the center blob and deform it in-game.
// Direction is still used for the stretch axis, but not for choosing artwork.
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

  P.getUniformLocation=function(program,name){
    const loc=old.getUniformLocation.call(this,program,name);
    if(loc)meta.set(loc,{program,name});
    // The directional slime sprite shader is the only one that exposes pushCount.
    if(loc&&name==='pushCount')slimePrograms.add(program);
    return loc;
  };

  P.uniform4f=function(loc,a,b,c,d){
    const m=meta.get(loc);
    if(m?.name==='r'&&slimePrograms.has(m.program)){
      // Lock artwork to the center 3x3 cell: round slime, no directional tail.
      return old.uniform4f.call(this,loc,CENTER,CENTER,CENTER,CENTER);
    }
    return old.uniform4f.call(this,loc,a,b,c,d);
  };

  P.uniform1i=function(loc,value){
    const m=meta.get(loc);
    if(m?.name==='pushCount'&&slimePrograms.has(m.program)){
      // The round base should be shaped only by live squash/stretch, not saved tail sculpting.
      return old.uniform1i.call(this,loc,0);
    }
    return old.uniform1i.call(this,loc,value);
  };

  function lockCenterBounds(){
    const api=globalThis.__slimeDirectionalV3||globalThis.__slimeDirectionalV2;
    const b=api?.runtime?.b;
    if(!b?.[1]?.[1])return false;
    const center=[...b[1][1]];
    for(let y=0;y<3;y++)for(let x=0;x<3;x++)b[y][x]=[...center];
    api.runtime.roundBase=true;
    return true;
  }

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

  globalThis.__slimeRoundBase={enabled:true,cell:[1,1],directionalArtwork:false};
})();
