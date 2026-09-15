// Compatibility bridge for the published 2026-09-14 runtime.
// The bundled runtime still asks for the old 16x16 Thorn atlas. Build that atlas
// in memory from the approved Moss Frog 4x4 sheet so the latest game can keep all
// existing systems while normal Thorn renders as the frog.
const nativeFetch=globalThis.fetch.bind(globalThis);
const THORN_RE=/\/assets\/enemies\/thorn-sprite\.png(?:[?#]|$)/;
const FROG='./assets/enemies/frog-moveset.png?v=20260915frog-published1';
const HIT_CELL=255;
let atlasPromise=null;

async function imageFromBlob(blob){
 const url=URL.createObjectURL(blob);
 try{
  const image=new Image();
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Moss Frog image decode failed'));image.src=url});
  return image;
 }finally{setTimeout(()=>URL.revokeObjectURL(url),0)}
}

async function buildAtlas(){
 const response=await nativeFetch(FROG,{cache:'no-store'});
 if(!response.ok)throw Error('Moss Frog atlas unavailable: '+response.status);
 const source=await imageFromBlob(await response.blob());
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,1024,1024);ctx.imageSmoothingEnabled=true;
 const src=source.naturalWidth/4,dst=64;
 const drawCell=(sourceCell,targetCell)=>{
  const sx=(sourceCell%4)*src,sy=Math.floor(sourceCell/4)*src;
  const dx=(targetCell%16)*dst,dy=Math.floor(targetCell/16)*dst;
  ctx.drawImage(source,sx,sy,src,src,dx,dy,dst,dst);
 };
 // Old renderer addresses 8 directions x 32 walk frames. Frog always faces the
 // player, so every direction shares the same approved 8-frame jump cycle.
 for(let direction=0;direction<8;direction++)for(let frame=0;frame<32;frame++){
  drawCell(Math.min(7,Math.floor(frame/4)),direction*32+frame);
 }
 // Death frame 2 is the approved hit pose. Keep it in an otherwise-unused cell
 // and redirect the old `hit` uniform to this cell below.
 drawCell(9,HIT_CELL);
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Moss Frog atlas encode failed')),'image/png'));
 globalThis.__mossFrogPublishedAtlas=true;
 return blob;
}

globalThis.fetch=async function(input,init){
 const url=typeof input==='string'?input:input?.url||String(input);
 if(!THORN_RE.test(url))return nativeFetch(input,init);
 atlasPromise??=buildAtlas();
 try{return new Response(await atlasPromise,{status:200,headers:{'Content-Type':'image/png','Cache-Control':'no-store'}})}
 catch(error){console.error(error);throw error}
};

// The published Thorn shader has separate `cell` and `hit` uniforms. Redirect
// `cell` to the approved hit pose while hit>0, then restore the normal cell.
const GL=globalThis.WebGL2RenderingContext;
if(GL){
 const P=GL.prototype,oldGet=P.getUniformLocation,old1f=P.uniform1f;
 const meta=new WeakMap(),programs=new WeakMap();
 P.getUniformLocation=function(program,name){
  const loc=oldGet.call(this,program,name);
  if(loc){meta.set(loc,{program,name});let state=programs.get(program);if(!state)programs.set(program,state={});state[name]=loc;}
  return loc;
 };
 P.uniform1f=function(loc,value){
  const m=meta.get(loc),state=m&&programs.get(m.program);
  if(m?.name==='cell'&&state){state.normalCell=value;return old1f.call(this,loc,state.hit?HIT_CELL:value)}
  if(m?.name==='hit'&&state?.cell){state.hit=value>.5;old1f.call(this,state.cell,state.hit?HIT_CELL:(state.normalCell??0));}
  return old1f.call(this,loc,value);
 };
}

// Avoid stale local labels making it look like the old monster is still active.
const rename=()=>{
 for(const option of document.querySelectorAll('option[value="thorn"]'))option.textContent='Moss Frog';
 const label=document.querySelector('label[for="thorn-view"]');if(label&&label.firstChild)label.firstChild.textContent='การแสดงผล Moss Frog';
};
rename();new MutationObserver(rename).observe(document.documentElement,{subtree:true,childList:true});
globalThis.__mossFrogPublishedPatch='published-frog-v1';
