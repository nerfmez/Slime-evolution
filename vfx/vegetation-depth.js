// Own both depth attachments: default canvas depth formats differ across browsers.
// Single-sample rendering avoids an MSAA depth resolve on every foliage pass.
export function createVegetationDepth(gl){
 const scene=gl.createFramebuffer(),saved=gl.createFramebuffer();
 const color=gl.createRenderbuffer(),solid=gl.createRenderbuffer(),snapshot=gl.createRenderbuffer();
 let width=0,height=0;
 function attach(fbo,buffer,attachment,format,w,h){
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.bindRenderbuffer(gl.RENDERBUFFER,buffer);
  gl.renderbufferStorage(gl.RENDERBUFFER,format,w,h);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,attachment,gl.RENDERBUFFER,buffer);
 }
 function check(){if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('สร้างพื้นผิวแสดงผลเกมไม่สำเร็จ');}
 function copy(from,to,mask){
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER,from);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,to);
  gl.blitFramebuffer(0,0,width,height,0,0,width,height,mask,gl.NEAREST);
 }
 return {
  begin(w,h){
   if(w!==width||h!==height){
    attach(scene,color,gl.COLOR_ATTACHMENT0,gl.RGBA8,w,h);
    attach(scene,solid,gl.DEPTH_ATTACHMENT,gl.DEPTH_COMPONENT24,w,h);check();
    attach(saved,snapshot,gl.DEPTH_ATTACHMENT,gl.DEPTH_COMPONENT24,w,h);
    gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);check();width=w;height=h;
   }
   gl.bindFramebuffer(gl.FRAMEBUFFER,scene);
  },
  capture(){copy(scene,saved,gl.DEPTH_BUFFER_BIT);gl.bindFramebuffer(gl.FRAMEBUFFER,scene);},
  restore(){copy(saved,scene,gl.DEPTH_BUFFER_BIT);gl.bindFramebuffer(gl.FRAMEBUFFER,scene);},
  present(){copy(scene,null,gl.COLOR_BUFFER_BIT);gl.bindFramebuffer(gl.FRAMEBUFFER,null);}
 };
}
