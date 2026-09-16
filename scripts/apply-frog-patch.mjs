// Safe derivative patch for the authoritative published/2026-09-14 release.
// Run AFTER materialize-clean-atlas-v5.py + apply-critter-patch.mjs.
import {readFileSync,writeFileSync,copyFileSync,mkdirSync} from 'node:fs';
const release='published/2026-09-14',assets=release+'/assets',bundlePath=assets+'/main-critter-v4.js';
let bundle=readFileSync(bundlePath,'utf8');
function replaceOnce(text,old,next,label){const hits=text.split(old).length-1;if(hits!==1)throw Error(`${label}: expected 1 match, found ${hits}`);return text.replace(old,next);}

const alreadyPatched=bundle.includes('globalThis.__slimeFrogFrame=Fg');
if(!alreadyPatched){
 // Keep all stage balance/spawn/elite data intact. Only rename the normal family in UI/runtime.
 bundle=replaceOnce(bundle,'var ft={thorn:{name:`Thorn Mite`,stride:.42,speed:1.18,radius:.3,hp:18,damage:5},','var ft={thorn:{name:`Moss Frog`,stride:.42,speed:1.18,radius:.3,hp:18,damage:5},','normal Thorn name');

 // Give normal frogs a short visual attack latch without changing combat cooldown/damage.
 bundle=replaceOnce(bundle,'walkBlend:0,walkPhase:this.serial*.61803398875,anim:this.random(),attack:this.random()*1.5,windup:0,hit:0,clip:`walk`,clipTime:0','walkBlend:0,walkPhase:this.serial*.61803398875,anim:this.random(),attack:this.random()*1.5,frogAttack:0,windup:0,hit:0,clip:`walk`,clipTime:0','frog attack state');
 bundle=replaceOnce(bundle,'this.hazards=[],this.pendingHits=[],this.flightTrails=[]','this.hazards=[],this.pendingHits=[],this.flightTrails=[],this.frogDead=[]','frog corpse list');
 bundle=replaceOnce(bundle,'e=Math.min(e,.05),this.time+=e,this.hurt=Math.max(0,this.hurt-e)','e=Math.min(e,.05),this.frogDead||(this.frogDead=[]),this.frogDead.forEach(t=>t.frogDeath=(t.frogDeath||0)+e),this.frogDead=this.frogDead.filter(e=>e.frogDeath<.51),this.time+=e,this.hurt=Math.max(0,this.hurt-e)','frog corpse timer');
 bundle=replaceOnce(bundle,'if(n.attack-=e,n.hit=Math.max(0,n.hit-e),r&&r.age<4.8','if(n.attack-=e,n.frogAttack=Math.max(0,(n.frogAttack||0)-e),n.hit=Math.max(0,n.hit-e),r&&r.age<4.8','frog attack decay');
 bundle=replaceOnce(bundle,'s<i.radius+(this.playerRadius||.25)+.07&&n.attack<=0&&(this.damage(i.damage),n.attack=1.1);','s<i.radius+(this.playerRadius||.25)+.07&&n.attack<=0&&(this.damage(i.damage),n.attack=1.1,n.type===`thorn`&&!n.elite&&(n.frogAttack=.18));','frog tongue on contact attack');
 bundle=replaceOnce(bundle,'let s=this.enemies.length;for(let e of this.enemies)e.hp<=0&&(this.defeated.push(e),e.boss&&(this.bossDefeated=!0,this.finished=!0,this.pendingHits=[],this.bullets=[]));this.enemies=this.enemies.filter(e=>e.hp>0),this.kills+=s-this.enemies.length;','let s=this.enemies.length;for(let e of this.enemies)e.hp<=0&&(e.type===`thorn`&&!e.elite&&!e.boss&&this.frogDead.push({...e,frogDeath:0}),this.defeated.push(e),e.boss&&(this.bossDefeated=!0,this.finished=!0,this.pendingHits=[],this.bullets=[]));this.enemies=this.enemies.filter(e=>e.hp>0),this.kills+=s-this.enemies.length;','frog death capture');

 // Normal gameplay camera always uses frog when its renderer loaded, regardless of an old saved Thorn-view preference.
 bundle=replaceOnce(bundle,'if(e.type===`thorn`&&!e.elite&&W.thornView===`sprite`&&W.camera===`game`&&Br)continue;','if(e.type===`thorn`&&!e.elite&&W.camera===`game`&&Br)continue;','frog model skip');
 bundle=replaceOnce(bundle,'if(W.thornView===`sprite`&&W.camera===`game`&&Br){for(let e of t)if(e.type===`thorn`&&!e.elite){let t=Br.draw(e,X,W.player,W.thornFrames);Yn+=t.calls,Xn+=t.triangles}H.useProgram(U)}','if(W.camera===`game`&&Br){for(let e of t)if(e.type===`thorn`&&!e.elite){let t=Br.draw(e,X,W.player,W.thornFrames);Yn+=t.calls,Xn+=t.triangles}for(let e of J.frogDead||[])if(dr(e.x,e.z,1.4)){let t=Br.draw(e,X,W.player,8);Yn+=t.calls,Xn+=t.triangles}H.useProgram(U)}','frog live/death draw pass');
}

// Upgrade the normal-frog renderer even when the previous frog patch is already materialized.
// The authored atlas faces screen-right; mirror UVs for world -X and keep the last side
// while moving mostly toward/away from the fixed game camera. The wide tongue strip also
// shifts to the mirrored side so its hit pose stays anchored to the body.
const hasDirectionalFacing=bundle.includes('globalThis.__slimeFrogFacing=Fh');
if(!hasDirectionalFacing){
 const rendererStart=bundle.indexOf('function Pe('),rendererEnd=bundle.indexOf('function Ie(',rendererStart);
 if(rendererStart<0||rendererEnd<rendererStart)throw Error('Frog renderer boundary not found');
 const frogRenderer=`function Pe(e,t,n=8){if(!(t>0))return 0;let r=(((t||0)*(.42/.82))%1+1)%1;return Math.min(7,Math.floor(r*8))}function Fh(e){let t=Math.sin(Number.isFinite(e?.yaw)?e.yaw:0),n=e?.frogFacing===-1?-1:1;return t>.12?n=1:t<-.12&&(n=-1),e&&(e.frogFacing=n),n}function Fg(e){if(e.frogDeath!=null){let t=Math.min(4,Math.floor(Math.max(0,e.frogDeath)/.095)),n=[8,9,10,11,12][t],r=n%4,i=Math.floor(n/4);return{r:[r*.25,(3-i)*.25,.25,.25],w:1,o:0}}if(e.hit>0)return{r:[.25,.25,.25,.25],w:1,o:0};if((e.frogAttack||0)>0)return{r:[.25,0,.75,.25],w:3,o:1.64};let t=e.walkBlend>.055?Pe(e.yaw,e.walkPhase,8):0,n=t%4,r=Math.floor(t/4);return{r:[n*.25,(3-r)*.25,.25,.25],w:1,o:0}}globalThis.__slimeFrogFrame=Fg;globalThis.__slimeFrogFacing=Fh;function Fi(e){return new Promise((t,n)=>{let r=new Image;r.decoding='async',r.onload=()=>t(r),r.onerror=()=>n(Error('โหลดภาพ Moss Frog ไม่สำเร็จ: '+e)),r.src=e})}async function Fe(e){let t=await Fi('./assets/enemies/frog-moveset.png?v=20260915-facing1'),n=e.createTexture();e.activeTexture(e.TEXTURE10),e.bindTexture(e.TEXTURE_2D,n);let r=e.getParameter(e.UNPACK_FLIP_Y_WEBGL);e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,r);for(let t of[e.TEXTURE_MIN_FILTER,e.TEXTURE_MAG_FILTER])e.texParameteri(e.TEXTURE_2D,t,e.LINEAR);for(let t of[e.TEXTURE_WRAP_S,e.TEXTURE_WRAP_T])e.texParameteri(e.TEXTURE_2D,t,e.CLAMP_TO_EDGE);e.activeTexture(e.TEXTURE0);let i=T(e,\`layout(location=0)in vec3 position;layout(location=2)in vec2 uv;uniform mat4 vp;uniform vec3 origin;uniform float spriteScale,spriteWidth,spriteOffsetX;out vec2 UV;out vec3 world;void main(){vec3 f=normalize(vec3(0,12,15)),right=normalize(cross(vec3(0,1,0),f)),up=cross(f,right);world=origin+right*(position.x*spriteWidth+spriteOffsetX)*spriteScale+up*position.y*spriteScale;world+=f*max(0.,(origin.y-world.y)/f.y);UV=uv;gl_Position=vp*vec4(world,1.);}\`,\`in vec2 UV;in vec3 world;uniform sampler2D atlas,canopy;uniform vec4 rect;uniform vec3 player;uniform float flipX;out vec4 color;void main(){vec2 sampleUV=vec2(flipX>.5?1.-UV.x:UV.x,UV.y);vec2 local=mix(vec2(.004),vec2(.996),sampleUV);vec4 c=texture(atlas,rect.xy+local*rect.zw);if(c.a<.18)discard;vec2 shadowPoint=world.xz-vec2(.65,-.45)*max(world.y,0.);float shade=texture(canopy,(shadowPoint+40.)/80.).r;c.rgb*=mix(vec3(1.),vec3(.63,.72,.66),shade);float fog=smoothstep(16.,34.,length(world.xz-player.xz));c.rgb=mix(c.rgb,vec3(.87,.88,.67),fog);color=c;}\`),a=E(e,[-.82,.82,0,.82,.82,0,.82,-.82,0,-.82,-.82,0],null,[0,1,1,1,1,0,0,0],[0,2,1,0,3,2]);return e.useProgram(i),e.uniform1i(e.getUniformLocation(i,'atlas'),10),e.uniform1i(e.getUniformLocation(i,'canopy'),1),{draw(t,r,o,s=8){let c=Fg(t),l=Fh(t);return e.activeTexture(e.TEXTURE10),e.bindTexture(e.TEXTURE_2D,n),e.activeTexture(e.TEXTURE0),e.useProgram(i),D(e,i,'vp',r),D(e,i,'origin',[t.x,.02,t.z]),D(e,i,'player',o),D(e,i,'rect',c.r),D(e,i,'spriteScale',(t.scale||1)*.714),D(e,i,'spriteWidth',c.w),D(e,i,'spriteOffsetX',c.o*l),D(e,i,'flipX',l<0?1:0),e.disable(e.CULL_FACE),e.enable(e.BLEND),e.blendFunc(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA),e.depthMask(!0),je(e,a),e.disable(e.BLEND),{calls:1,triangles:2}}}}`;
 bundle=bundle.slice(0,rendererStart)+frogRenderer+bundle.slice(rendererEnd);
}

// Size-only upgrade for already directional builds: reduce the in-game sprite by 30%.
const hasReducedScale=bundle.includes("D(e,i,'spriteScale',(t.scale||1)*.714)");
if(!hasReducedScale){
 bundle=replaceOnce(bundle,"D(e,i,'spriteScale',(t.scale||1)*1.02)","D(e,i,'spriteScale',(t.scale||1)*.714)",'frog render scale');
}

// Natural frog locomotion: crouch, lift and travel only during the hop, land, then
// remain completely still for a short rest before the next hop. Elite Thorn stays unchanged.
const hasNaturalHop=bundle.includes('globalThis.__slimeFrogHopLift=Fl');
if(!hasNaturalHop){
 if(!bundle.includes('frogHopPhase:0')){
  bundle=replaceOnce(bundle,'frogAttack:0,windup:0','frogAttack:0,frogHopPhase:0,frogHopActive:!1,frogRest:.08+this.serial%5*.03,frogHopCount:0,windup:0','frog hop state');
 }
 if(!bundle.includes('frogMoveScale')){
  const gateMatch=bundle.match(/:n\.windup=0,([A-Za-z_$][A-Za-z0-9_$]*)\)\{/);
  if(!gateMatch)throw Error('frog hop gate: movement anchor not found');
  const moving=gateMatch[1];
  const gateNext=':n.windup=0;let frogMoveScale=1;if(n.type===`thorn`&&!n.elite&&!n.boss){if(n.frogHopActive){if((n.frogHopPhase||0)>=1)n.frogHopActive=!1,n.frogHopPhase=0,n.frogHopCount=(n.frogHopCount||0)+1,n.frogRest=.18+.16*(.5+.5*Math.sin(n.id*12.9898+n.frogHopCount*4.17));else n.frogHopPhase=Math.min(1,(n.frogHopPhase||0)+e/.46)}else n.frogRest=Math.max(0,(n.frogRest||0)-e),n.frogHopPhase=0,'+moving+'&&n.frogRest<=0&&(n.frogHopActive=!0,n.frogHopPhase=Math.min(1,e/.46));let fp=n.frogHopPhase||0;frogMoveScale=n.frogHopActive&&fp>.16&&fp<.86?2.1:0}if('+moving+'&&frogMoveScale>0){';
  bundle=replaceOnce(bundle,gateMatch[0],gateNext,'frog hop gate');
  bundle=replaceOnce(bundle,'let o=Math.min(i.speed*e,Math.hypot(l-n.x,u-n.z));','let o=Math.min(i.speed*e*frogMoveScale,Math.hypot(l-n.x,u-n.z));','frog hop travel speed');
 }
 if(!bundle.includes('n.frogHopActive=!1,n.frogHopPhase=0,n.frogRest=.26')){
  bundle=replaceOnce(bundle,'n.type===`thorn`&&!n.elite&&(n.frogAttack=.18)','n.type===`thorn`&&!n.elite&&(n.frogAttack=.18,n.frogHopActive=!1,n.frogHopPhase=0,n.frogRest=.26)','ground tongue attack');
 }
 const rendererStart=bundle.indexOf('function Pe('),rendererEnd=bundle.indexOf('function Ie(',rendererStart);
 if(rendererStart<0||rendererEnd<rendererStart)throw Error('Natural-hop frog renderer boundary not found');
 const frogRenderer=`function Pe(e,t,n=8){if(!(t>0))return 0;return Math.min(7,Math.floor(Math.max(0,Math.min(1,t))*8))}function Fh(e){let t=Math.sin(Number.isFinite(e?.yaw)?e.yaw:0),n=e?.frogFacing===-1?-1:1;return t>.12?n=1:t<-.12&&(n=-1),e&&(e.frogFacing=n),n}function Fl(e){if(e.frogDeath!=null||e.hp<=0||(e.frogAttack||0)>0||!e.frogHopActive)return 0;let t=Math.max(0,Math.min(1,e.frogHopPhase||0));return t<=.18||t>=.92?0:Math.sin((t-.18)/.74*Math.PI)*.30}function Fg(e){if(e.frogDeath!=null){let t=Math.min(4,Math.floor(Math.max(0,e.frogDeath)/.095)),n=[8,9,10,11,12][t],r=n%4,i=Math.floor(n/4);return{r:[r*.25,(3-i)*.25,.25,.25],w:1,o:0}}if(e.hit>0)return{r:[.25,.25,.25,.25],w:1,o:0};if((e.frogAttack||0)>0)return{r:[.25,0,.75,.25],w:3,o:1.64};let t=e.frogHopActive?Pe(0,e.frogHopPhase||0,8):0,n=t%4,r=Math.floor(t/4);return{r:[n*.25,(3-r)*.25,.25,.25],w:1,o:0}}globalThis.__slimeFrogFrame=Fg;globalThis.__slimeFrogFacing=Fh;globalThis.__slimeFrogHopLift=Fl;function Fi(e){return new Promise((t,n)=>{let r=new Image;r.decoding='async',r.onload=()=>t(r),r.onerror=()=>n(Error('โหลดภาพ Moss Frog ไม่สำเร็จ: '+e)),r.src=e})}async function Fe(e){let t=await Fi('./assets/enemies/frog-moveset.png?v=20260916-hop1'),n=e.createTexture();e.activeTexture(e.TEXTURE10),e.bindTexture(e.TEXTURE_2D,n);let r=e.getParameter(e.UNPACK_FLIP_Y_WEBGL);e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!0),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,e.RGBA,e.UNSIGNED_BYTE,t),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,r);for(let t of[e.TEXTURE_MIN_FILTER,e.TEXTURE_MAG_FILTER])e.texParameteri(e.TEXTURE_2D,t,e.LINEAR);for(let t of[e.TEXTURE_WRAP_S,e.TEXTURE_WRAP_T])e.texParameteri(e.TEXTURE_2D,t,e.CLAMP_TO_EDGE);e.activeTexture(e.TEXTURE0);let i=T(e,\`layout(location=0)in vec3 position;layout(location=2)in vec2 uv;uniform mat4 vp;uniform vec3 origin;uniform float spriteScale,spriteWidth,spriteOffsetX;out vec2 UV;out vec3 world;void main(){vec3 f=normalize(vec3(0,12,15)),right=normalize(cross(vec3(0,1,0),f)),up=cross(f,right);world=origin+right*(position.x*spriteWidth+spriteOffsetX)*spriteScale+up*position.y*spriteScale;world+=f*max(0.,(origin.y-world.y)/f.y);UV=uv;gl_Position=vp*vec4(world,1.);}\`,\`in vec2 UV;in vec3 world;uniform sampler2D atlas,canopy;uniform vec4 rect;uniform vec3 player;uniform float flipX;out vec4 color;void main(){vec2 sampleUV=vec2(flipX>.5?1.-UV.x:UV.x,UV.y);vec2 local=mix(vec2(.004),vec2(.996),sampleUV);vec4 c=texture(atlas,rect.xy+local*rect.zw);if(c.a<.18)discard;vec2 shadowPoint=world.xz-vec2(.65,-.45)*max(world.y,0.);float shade=texture(canopy,(shadowPoint+40.)/80.).r;c.rgb*=mix(vec3(1.),vec3(.63,.72,.66),shade);float fog=smoothstep(16.,34.,length(world.xz-player.xz));c.rgb=mix(c.rgb,vec3(.87,.88,.67),fog);color=c;}\`),a=E(e,[-.82,.82,0,.82,.82,0,.82,-.82,0,-.82,-.82,0],null,[0,1,1,1,1,0,0,0],[0,2,1,0,3,2]);return e.useProgram(i),e.uniform1i(e.getUniformLocation(i,'atlas'),10),e.uniform1i(e.getUniformLocation(i,'canopy'),1),{draw(t,r,o,s=8){let c=Fg(t),l=Fh(t),u=Fl(t);return e.activeTexture(e.TEXTURE10),e.bindTexture(e.TEXTURE_2D,n),e.activeTexture(e.TEXTURE0),e.useProgram(i),D(e,i,'vp',r),D(e,i,'origin',[t.x,.02+u,t.z]),D(e,i,'player',o),D(e,i,'rect',c.r),D(e,i,'spriteScale',(t.scale||1)*.714),D(e,i,'spriteWidth',c.w),D(e,i,'spriteOffsetX',c.o*l),D(e,i,'flipX',l<0?1:0),e.disable(e.CULL_FACE),e.enable(e.BLEND),e.blendFunc(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA),e.depthMask(!0),je(e,a),e.disable(e.BLEND),{calls:1,triangles:2}}}}`;
 bundle=bundle.slice(0,rendererStart)+frogRenderer+bundle.slice(rendererEnd);
}
writeFileSync(bundlePath,bundle);

mkdirSync(assets+'/enemies',{recursive:true});
copyFileSync('public/assets/enemies/frog-moveset.png',assets+'/enemies/frog-moveset.png');
let html=readFileSync(release+'/index.html','utf8');
html=html.replace('การแสดงผล Thorn','การแสดงผล Moss Frog').replace('ความลื่นท่าเดิน Thorn','เฟรมการเคลื่อนไหว Moss Frog').replace('<option value="thorn">Thorn Mite</option>','<option value="thorn">Moss Frog</option>');
writeFileSync(release+'/index.html',html);
console.log(hasNaturalHop?'Verified natural Moss Frog hop-and-rest release.':'Applied natural Moss Frog hop-and-rest behavior to authoritative release.');
