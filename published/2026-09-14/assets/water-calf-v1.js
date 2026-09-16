// Stage 1 Water Calf renderer. Keeps the current production scene intact and adds only the new elephant.
export function createWaterCalfRenderer(gl){
  const CELL=128, FRAMES=6;
  const atlas=document.createElement('canvas'); atlas.width=CELL*FRAMES; atlas.height=CELL;
  const c=atlas.getContext('2d'); c.lineJoin='round'; c.lineCap='round';
  const ink='#33413f', body='#8faeb4', body2='#a8c0c3', dark='#73949b', leaf='#748f58', water='#55bfea';
  function E(x,y,rx,ry,fill,stroke=ink,w=2.4){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
  function P(points,fill,stroke=ink,w=2.1){c.beginPath();c.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)c.lineTo(points[i][0],points[i][1]);c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
  function L(points,stroke=ink,w=2.2){c.beginPath();c.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)c.lineTo(points[i][0],points[i][1]);c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}
  function eye(x,y,closed=false){if(closed){L([[x-5,y],[x+4,y+1]],ink,2.4);return;}E(x,y,4.2,4.2,'#24302e',null);E(x+1.2,y-1.4,1.2,1.2,'rgba(255,255,255,.9)',null);}
  function drop(x,y,s=1){c.beginPath();c.moveTo(x,y-11*s);c.bezierCurveTo(x-11*s,y+2*s,x-8*s,y+12*s,x,y+13*s);c.bezierCurveTo(x+8*s,y+12*s,x+11*s,y+2*s,x,y-11*s);c.fillStyle=water;c.fill();c.strokeStyle=ink;c.lineWidth=1.6;c.stroke();}
  function drawFrame(f){
    c.save();c.translate(f*CELL,0);let x=58,y=76;
    if(f===1){x+=2;y-=3;} if(f===2)y+=6;
    E(x,108,41,5,'rgba(60,52,43,.16)',null);
    if(f===5){
      E(x-3,82,35,18,body);E(x+29,83,16,13,body2);E(x-23,96,10,6,dark);E(x+5,97,10,6,dark);
      L([[x+39,88],[x+48,98]],ink,3);eye(x+32,82,true);P([[x-7,66],[x+1,56],[x+10,66],[x+3,71]],leaf,ink,1.6);c.restore();return;
    }
    E(x-4,y,34,26,body);E(x-22,y+25,9,12,dark);E(x+8,y+25,9,12,dark);
    if(f===1){E(x-18,y+26,9,11,dark);E(x+14,y+24,9,12,dark);}
    E(x+27,y-3,20,20,body2);E(x+16,y-4,14,18,dark);E(x+39,y-4,12,17,dark);
    let trunk=f>=3?[[x+39,y+7],[x+52,y+4],[x+61,y-4],[x+58,y-12],[x+52,y-9],[x+51,y],[x+35,y+16]]:[[x+38,y+7],[x+49,y+13],[x+50,y+29],[x+45,y+40],[x+39,y+39],[x+43,y+28],[x+35,y+17]];
    P(trunk,body2,ink,2);eye(x+32,y-7,f===2);P([[x-7,y-27],[x+1,y-38],[x+10,y-28],[x+3,y-23]],leaf,ink,1.7);
    if(f===2){L([[x+25,y-3],[x+37,y+2]],'#6f4d47',3);}
    if(f===3){drop(x+65,y-12,.5);}
    if(f===4){L([[x+60,y-7],[x+92,y-13],[x+116,y-10]],water,6);drop(x+118,y-10,.42);}
    c.restore();
  }
  for(let f=0;f<FRAMES;f++)drawFrame(f);

  function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'Water Calf shader');return s;}
  function prog(vs,fs){const p=gl.createProgram(),v=shader(gl.VERTEX_SHADER,vs),f=shader(gl.FRAGMENT_SHADER,fs);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p)||'Water Calf program');return p;}
  const VS=`#version 300 es\nprecision highp float;\nlayout(location=0)in vec2 pos;layout(location=1)in vec2 uv;out vec2 U;uniform mat4 vp;uniform vec3 origin;uniform vec3 cameraDir;uniform vec2 size;void main(){vec3 f=normalize(cameraDir);vec3 right=normalize(cross(vec3(0.,1.,0.),f));vec3 up=normalize(cross(f,right));vec3 world=origin+right*pos.x*size.x+up*pos.y*size.y;gl_Position=vp*vec4(world,1.);U=uv;}`;
  const spriteP=prog(VS,`#version 300 es\nprecision highp float;in vec2 U;uniform sampler2D atlas;uniform vec4 rect;uniform float flipX;out vec4 color;void main(){vec2 q=vec2(flipX>.5?1.-U.x:U.x,U.y);vec4 c=texture(atlas,rect.xy+q*rect.zw);if(c.a<.04)discard;color=c;}`);
  const shotP=prog(VS,`#version 300 es\nprecision highp float;in vec2 U;out vec4 color;void main(){vec2 p=(U-.5)*2.;p.x*=1.18;float d=dot(p,p);float tail=smoothstep(.38,-.8,p.y)*smoothstep(.72,.05,abs(p.x));float a=max(1.-smoothstep(.62,.9,d),tail*.72);if(a<.04)discard;vec3 col=mix(vec3(.25,.64,.86),vec3(.72,.94,1.),clamp(.65-U.y,0.,1.));color=vec4(col,a*.94);}`);
  const verts=new Float32Array([-1,-.68,0,0, 1,-.68,1,0, 1,1,1,1, -1,1,0,1]);
  const idx=new Uint16Array([0,1,2,0,2,3]);
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,verts,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,16,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,16,8);
  const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idx,gl.STATIC_DRAW);gl.bindVertexArray(null);
  const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE13);gl.bindTexture(gl.TEXTURE_2D,tex);const oldFlip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,oldFlip);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.activeTexture(gl.TEXTURE0);
  const cam=(mode)=>mode==='side'?[0,4,18]:mode==='top'?[0,21,.1]:[0,12,15];
  function frame(e){if(e.__calfCorpse||e.hp<=0)return 5;if(e.hit>0)return 2;if((e.windup||0)>0)return e.windup>.26?3:4;return (e.walkBlend||0)>.05?(Math.floor(((e.walkPhase||0)%1+1)%1*2)&1):0;}
  function withState(fn){const pr=gl.getParameter(gl.CURRENT_PROGRAM),va=gl.getParameter(gl.VERTEX_ARRAY_BINDING),ac=gl.getParameter(gl.ACTIVE_TEXTURE),blend=gl.isEnabled(gl.BLEND),cull=gl.isEnabled(gl.CULL_FACE),depth=gl.isEnabled(gl.DEPTH_TEST),mask=gl.getParameter(gl.DEPTH_WRITEMASK);try{gl.bindVertexArray(vao);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);fn();gl.drawElements(gl.TRIANGLES,6,gl.UNSIGNED_SHORT,0);}finally{gl.depthMask(mask);blend?gl.enable(gl.BLEND):gl.disable(gl.BLEND);cull?gl.enable(gl.CULL_FACE):gl.disable(gl.CULL_FACE);depth?gl.enable(gl.DEPTH_TEST):gl.disable(gl.DEPTH_TEST);gl.bindVertexArray(va);gl.activeTexture(ac);gl.useProgram(pr);}}
  function common(p,vp,origin,mode,size){gl.useProgram(p);gl.uniformMatrix4fv(gl.getUniformLocation(p,'vp'),false,vp);gl.uniform3fv(gl.getUniformLocation(p,'origin'),origin);gl.uniform3fv(gl.getUniformLocation(p,'cameraDir'),cam(mode));gl.uniform2fv(gl.getUniformLocation(p,'size'),size);}
  return {
    draw(e,vp,mode='game'){
      withState(()=>{common(spriteP,vp,[e.x,.64,e.z],mode,[.72*(e.scale||1),.76*(e.scale||1)]);const f=frame(e);gl.uniform4f(gl.getUniformLocation(spriteP,'rect'),f/6,0,1/6,1);gl.uniform1f(gl.getUniformLocation(spriteP,'flipX'),Math.sin(e.yaw||0)<0?1:0);gl.activeTexture(gl.TEXTURE13);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(gl.getUniformLocation(spriteP,'atlas'),13);});
      return {calls:1,triangles:2};
    },
    drawShot(b,vp,mode='game'){
      withState(()=>{common(shotP,vp,[b.x,.34,b.z],mode,[.18,.18]);});
      return {calls:1,triangles:2};
    }
  };
}
