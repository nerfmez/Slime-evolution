// Stability shim for directional player sprite.
// Fixes walk/idle flicker caused by using the oscillating jelly stretch as a movement signal,
// and adds a small direction hysteresis so touch steering near octant boundaries does not chatter.
(()=>{
  const GL=globalThis.WebGL2RenderingContext;
  if(!GL)return;
  const P=GL.prototype;
  const old={
    getUniformLocation:P.getUniformLocation,
    uniform1f:P.uniform1f,
    uniform3fv:P.uniform3fv,
    uniformMatrix4fv:P.uniformMatrix4fv,
  };
  const names=new WeakMap();
  const state=new WeakMap();
  const STEP=Math.PI/4;
  const HYST=8*Math.PI/180;
  const MOVE_GAIN=.72;

  function S(gl){
    let s=state.get(gl);
    if(!s){
      s={lastModel:null,lastModelLoc:null,lastLean:0,stableDir:null,moving:false};
      state.set(gl,s);
    }
    return s;
  }
  function wrapPi(a){
    a=(a+Math.PI)%(Math.PI*2);
    if(a<0)a+=Math.PI*2;
    return a-Math.PI;
  }
  function qDir(yaw){return ((Math.round(yaw/STEP)%8)+8)%8}
  function centerYaw(dir){return dir*STEP}
  function stableDir(s,yaw){
    const cand=qDir(yaw);
    if(s.stableDir==null){s.stableDir=cand;return cand}
    const center=centerYaw(s.stableDir);
    const diff=wrapPi(yaw-center);
    if(Math.abs(diff)>STEP*.5+HYST)s.stableDir=cand;
    return s.stableDir;
  }
  function stabilizedModel(s){
    if(!s.lastModel)return null;
    const m=new Float32Array(s.lastModel);
    const yaw=Math.atan2(-m[2],m[0]);
    const dir=stableDir(s,yaw);
    const a=centerYaw(dir),ca=Math.cos(a),sa=Math.sin(a);
    const sx=Math.hypot(m[0],m[2])||1;
    const sz=Math.hypot(m[8],m[10])||1;
    m[0]=ca*sx;m[2]=-sa*sx;
    m[8]=sa*sz;m[10]=ca*sz;
    return m;
  }

  P.getUniformLocation=function(program,name){
    const loc=old.getUniformLocation.call(this,program,name);
    if(loc)names.set(loc,name);
    return loc;
  };
  P.uniformMatrix4fv=function(loc,transpose,value){
    const s=S(this),name=names.get(loc);
    if(name==='model'){
      s.lastModel=new Float32Array(value);
      s.lastModelLoc=loc;
    }
    return old.uniformMatrix4fv.call(this,loc,transpose,value);
  };
  P.uniform3fv=function(loc,value){
    const name=names.get(loc),s=S(this);
    if(name==='jellyMotion'){
      s.lastLean=Number(value[0])||0;
      // The player draw sends [lean, 0, stretch]. Stretch crosses zero every bounce,
      // so the renderer used to think the player stopped twice per cycle. Replace only
      // that draw-time third component with the non-oscillating lean envelope.
      if(Math.abs(Number(value[1])||0)<1e-7){
        const v=new Float32Array(value);
        v[2]=Math.abs(s.lastLean)*MOVE_GAIN;
        s.moving=v[2]>.003;
        return old.uniform3fv.call(this,loc,v);
      }
    }
    return old.uniform3fv.call(this,loc,value);
  };
  P.uniform1f=function(loc,value){
    const name=names.get(loc),s=S(this);
    if(name==='kind'&&value===8&&s.lastModelLoc&&s.lastModel){
      // Re-submit only the player's model using an octant with hysteresis. This keeps
      // E/NE etc. from alternating every frame when a finger sits on a boundary.
      const m=stabilizedModel(s);
      if(m)old.uniformMatrix4fv.call(this,s.lastModelLoc,false,m);
    }
    return old.uniform1f.call(this,loc,value);
  };

  globalThis.__slimeDirectionalStability={
    get state(){return [...state.values?.()||[]]},
    moveGain:MOVE_GAIN,
    hysteresisDeg:8,
  };
})();

// Load the camera-projection correction after the stability shim is installed.
import('./player-directional-projection-fix-v1.js?v=1').catch(e=>console.warn('slime diagonal projection fix unavailable',e));
