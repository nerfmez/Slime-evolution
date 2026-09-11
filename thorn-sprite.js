import {program,geometry,render,uniform} from './gl.js';
export function thornSpriteCell(yaw,phase,count=32){
 count=[16,24,32].includes(count)?count:32;
 const direction=((Math.round(yaw/(Math.PI/4))%8)+8)%8;
 const step=Math.floor(((phase%1)+1)%1*count)%count;
 const frame=Math.round(step*32/count)%32;
 return direction*32+frame;
}
export async function createThornSprite(gl){
 const response=await fetch('./assets/enemies/thorn-sprite.png');if(!response.ok)throw Error('โหลดภาพ Thorn ไม่สำเร็จ');
 const bitmap=await createImageBitmap(await response.blob());const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE10);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);bitmap.close();
 for(const k of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
 for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);gl.activeTexture(gl.TEXTURE0);
 const p=program(gl,`layout(location=0)in vec3 position;layout(location=2)in vec2 uv;uniform mat4 vp;uniform vec3 origin;out vec2 UV;out vec3 world;void main(){vec3 f=normalize(vec3(0,12,15)),right=normalize(cross(vec3(0,1,0),f)),up=cross(f,right);world=origin+right*position.x+up*position.y;world+=f*max(0.,(origin.y-world.y)/f.y);UV=uv;gl_Position=vp*vec4(world,1.);}`,`in vec2 UV;in vec3 world;uniform sampler2D atlas,canopy;uniform float cell,hit;uniform vec3 player;out vec4 color;void main(){vec2 tile=vec2(mod(cell,16.),floor(cell/16.));vec4 c=texture(atlas,(tile+clamp(UV,vec2(.00390625),vec2(.99609375)))/16.);if(c.a<.25)discard;c.rgb=mix(c.rgb,vec3(1.,.85,.55),hit*.40);vec2 shadowPoint=world.xz-vec2(.65,-.45)*max(world.y,0.);float shade=texture(canopy,(shadowPoint+40.)/80.).r;c.rgb*=mix(vec3(1.),vec3(.61,.71,.66),shade);float fog=smoothstep(16.,34.,length(world.xz-player.xz));c.rgb=mix(c.rgb,vec3(.87,.88,.67),fog);color=c;}`);
 const g=geometry(gl,[-.675,.675,0,.675,.675,0,.675,-.675,0,-.675,-.675,0],null,[0,0,1,0,1,1,0,1],[0,2,1,0,3,2]);
 gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'atlas'),10);gl.uniform1i(gl.getUniformLocation(p,'canopy'),1);
 return {draw(e,vp,player,count=32){gl.useProgram(p);uniform(gl,p,'vp',vp);uniform(gl,p,'origin',[e.x,.015,e.z]);uniform(gl,p,'player',player);uniform(gl,p,'cell',thornSpriteCell(e.yaw,e.walkPhase,count));uniform(gl,p,'hit',e.hit>0?1:0);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);render(gl,g);gl.disable(gl.BLEND);return {calls:1,triangles:2};}};
}
