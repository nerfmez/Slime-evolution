import {program,geometry,render} from './gl.js';
// Supersample only a small player-sized tile. Composite its real depth into the scene.
export function createSlimeAA(gl){
 const fb=gl.createFramebuffer(),color=gl.createTexture(),depth=gl.createTexture();let size=0;
 const p=program(gl,`layout(location=0)in vec3 position;layout(location=2)in vec2 uv;out vec2 UV;uniform vec4 rect;void main(){UV=uv;gl_Position=vec4(rect.xy+position.xy*rect.zw,0.,1.);}`,`in vec2 UV;uniform sampler2D image,depthImage;out vec4 color;void main(){vec4 c=texture(image,UV);if(c.a<.003)discard;vec2 d=.5/vec2(textureSize(depthImage,0));gl_FragDepth=min(min(texture(depthImage,UV+d).r,texture(depthImage,UV-d).r),min(texture(depthImage,UV+vec2(d.x,-d.y)).r,texture(depthImage,UV+vec2(-d.x,d.y)).r));color=c;}`);
 const quad=geometry(gl,[-1,-1,0,1,-1,0,1,1,0,-1,1,0],null,[0,0,1,0,1,1,0,1],[0,1,2,0,2,3]);
 return {draw(vp,origin,w,h,drawPlayer){
  const old=gl.getParameter(gl.FRAMEBUFFER_BINDING),project=(x,y,z)=>[vp[0]*x+vp[4]*y+vp[8]*z+vp[12],vp[1]*x+vp[5]*y+vp[9]*z+vp[13]];
  const center=project(origin[0],.4,origin[2]);
  const radius=Math.ceil(Math.max((Math.abs(vp[0])+Math.abs(vp[4])+Math.abs(vp[8]))*w,(Math.abs(vp[1])+Math.abs(vp[5])+Math.abs(vp[9]))*h)*.65)+4;
  const side=Math.max(32,Math.ceil(radius*2/32)*32),s=side*2;
  const cx=Math.round((center[0]*.5+.5)*w),cy=Math.round((center[1]*.5+.5)*h),nx=cx/w*2-1,ny=cy/h*2-1,rx=side/w,ry=side/h;
  gl.activeTexture(gl.TEXTURE11);gl.bindFramebuffer(gl.FRAMEBUFFER,fb);
  if(size!==s){size=s;for(const [tex,internal,format,type] of [[color,gl.RGBA8,gl.RGBA,gl.UNSIGNED_BYTE],[depth,gl.DEPTH_COMPONENT24,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT]]){gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,internal,s,s,0,format,type,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,tex===color?gl.LINEAR:gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,tex===color?gl.LINEAR:gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,color,0);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,depth,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Slime AA framebuffer');}
  const local=new Float32Array(vp);for(let i=0;i<4;i++){local[i*4]=(vp[i*4]-nx*vp[i*4+3])/rx;local[i*4+1]=(vp[i*4+1]-ny*vp[i*4+3])/ry;}
  gl.viewport(0,0,s,s);gl.clearColor(0,0,0,0);gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.activeTexture(gl.TEXTURE0);drawPlayer(local);
  gl.bindFramebuffer(gl.FRAMEBUFFER,old);gl.viewport(0,0,w,h);gl.useProgram(p);gl.activeTexture(gl.TEXTURE11);gl.bindTexture(gl.TEXTURE_2D,color);gl.activeTexture(gl.TEXTURE12);gl.bindTexture(gl.TEXTURE_2D,depth);gl.uniform1i(gl.getUniformLocation(p,'image'),11);gl.uniform1i(gl.getUniformLocation(p,'depthImage'),12);gl.uniform4f(gl.getUniformLocation(p,'rect'),nx,ny,rx,ry);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);render(gl,quad);gl.disable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.activeTexture(gl.TEXTURE0);
 }};
}
