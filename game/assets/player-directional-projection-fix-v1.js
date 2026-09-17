// Fix diagonal squash/stretch axis so it follows the camera-projected movement direction.
// World diagonals are not 45 degrees on screen with the gameplay camera; stretching at 45°
// makes NE/NW/SE/SW look like they shear sideways. This shim rebuilds only the player's
// 2D deform matrix from the projected octant and rotates the matching lead shift with it.
(()=>{
  const GL=globalThis.WebGL2RenderingContext;
  if(!GL)return;
  const P=GL.prototype;
  const old={
    getUniformLocation:P.getUniformLocation,
    uniform1f:P.uniform1f,
    uniform2f:P.uniform2f,
    uniform3fv:P.uniform3fv,
    uniformMatrix2fv:P.uniformMatrix2fv,
    uniformMatrix4fv:P.uniformMatrix4fv,
  };
  const names=new WeakMap();
  const ctxState=new WeakMap();
  const STEP=Math.PI/4;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function S(gl){
    let s=ctxState.get(gl);
    if(!s){
      s={vp:null,model:null,time:0,playerSprite:false,moving:false,awaitLead:false,oldTheta:0,newTheta:0};
      ctxState.set(gl,s);
    }
    return s;
  }
  function wrapPi(a){
    a=(a+Math.PI)%(Math.PI*2);
    if(a<0)a+=Math.PI*2;
    return a-Math.PI;
  }
  function pt(m,x,y,z){
    const w=m[3]*x+m[7]*y+m[11]*z+m[15];
    if(Math.abs(w)<1e-7)return null;
    return [
      (m[0]*x+m[4]*y+m[8]*z+m[12])/w,
      (m[1]*x+m[5]*y+m[9]*z+m[13])/w,
    ];
  }
  function dirInfo(s){
    if(!s.vp||!s.model)return null;
    const m=s.model,x=m[12],z=m[14],yaw=Math.atan2(-m[2],m[0]);
    const dir=((Math.round(yaw/STEP)%8)+8)%8;
    const qYaw=dir*STEP;
    const dx=Math.sin(qYaw),dz=Math.cos(qYaw);
    const p0=pt(s.vp,x,.30,z),p1=pt(s.vp,x+dx,.30,z+dz);
    if(!p0||!p1)return null;
    const sx=p1[0]-p0[0],sy=p1[1]-p0[1];
    if(Math.hypot(sx,sy)<1e-7)return null;
    const api=globalThis.__slimeDirectionalV3||globalThis.__slimeDirectionalV2;
    const axis=((api?.tune?.axis)||0)*Math.PI/180;
    return {
      dir,
      qYaw,
      oldTheta:wrapPi(qYaw-Math.PI/2+axis),
      newTheta:wrapPi(Math.atan2(sy,sx)+axis),
      tune:api?.tune,
    };
  }
  function deformValues(s,info){
    const T=info.tune||{};
    const cycle=Math.max(.05,Number(T.cycle)||.96);
    const phase=(Number(T.phase)||0)*Math.PI/180;
    const g=Array.isArray(T.g)?(Number(T.g[info.dir])||1):1;
    let al=1,cr=1;
    if(s.moving&&T.on!==false){
      const wave=Math.sin(s.time*Math.PI*2/cycle+phase)*g;
      al=1+(Number(T.stretch)||0)*wave;
      cr=1-(Number(T.squash)||0)*wave;
    }else{
      const idle=Math.max(0,Number(T.idle)||0);
      const idleSpeed=Math.max(.01,Number(T.idleSpeed)||2.15);
      const wave=Math.sin(s.time*idleSpeed)*.12;
      al=1+idle*wave;
      cr=1-idle*.5*wave;
    }
    return {al,cr};
  }

  P.getUniformLocation=function(program,name){
    const loc=old.getUniformLocation.call(this,program,name);
    if(loc)names.set(loc,name);
    return loc;
  };
  P.uniform1f=function(loc,value){
    const s=S(this),name=names.get(loc);
    if(name==='time')s.time=Number(value)||0;
    return old.uniform1f.call(this,loc,value);
  };
  P.uniformMatrix4fv=function(loc,transpose,value){
    const s=S(this),name=names.get(loc);
    if(name==='vp')s.vp=new Float32Array(value);
    else if(name==='model')s.model=new Float32Array(value);
    return old.uniformMatrix4fv.call(this,loc,transpose,value);
  };
  P.uniform3fv=function(loc,value){
    const s=S(this),name=names.get(loc);
    if(name==='jellyMotion'){
      // The special player draw sends [lean, 0, stretch] just before the directional sprite.
      if(Math.abs(Number(value[1])||0)<1e-7){
        s.playerSprite=true;
        s.moving=Math.abs(Number(value[0])||0)>.004;
      }else{
        s.playerSprite=false;
        s.awaitLead=false;
      }
    }
    return old.uniform3fv.call(this,loc,value);
  };
  P.uniformMatrix2fv=function(loc,transpose,value){
    const s=S(this);
    if(s.playerSprite&&value&&value.length===4){
      const info=dirInfo(s);
      if(info){
        const {al,cr}=deformValues(s,info),c=Math.cos(info.newTheta),q=Math.sin(info.newTheta);
        const A=al*c*c+cr*q*q,B=(al-cr)*c*q,D=al*q*q+cr*c*c;
        s.oldTheta=info.oldTheta;
        s.newTheta=info.newTheta;
        s.awaitLead=true;
        return old.uniformMatrix2fv.call(this,loc,transpose,new Float32Array([A,B,B,D]));
      }
    }
    return old.uniformMatrix2fv.call(this,loc,transpose,value);
  };
  P.uniform2f=function(loc,x,y){
    const s=S(this);
    if(s.playerSprite&&s.awaitLead){
      s.awaitLead=false;
      // The uniform immediately after the deform matrix is leadShift.
      // Preserve its signed magnitude, but rotate it from the old 45° world-octant axis
      // to the actual camera-projected screen axis.
      const signed=(Number(x)||0)*Math.cos(s.oldTheta)+(Number(y)||0)*Math.sin(s.oldTheta);
      return old.uniform2f.call(this,loc,Math.cos(s.newTheta)*signed,Math.sin(s.newTheta)*signed);
    }
    return old.uniform2f.call(this,loc,x,y);
  };

  globalThis.__slimeDirectionalProjectionFix={version:1};
})();
