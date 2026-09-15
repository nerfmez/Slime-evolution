import {geometry,loadTexture} from './gl.js';

function connectNextFrameBuffers(gl,frames){
 for(let i=0;i<frames.length;i++){
  gl.bindVertexArray(frames[i].vao);const next=frames[(i+1)%frames.length];
  for(const [slot,buffer] of [[3,next.buffers[0]],[4,next.buffers[1]]]){
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(slot);gl.vertexAttribPointer(slot,3,gl.FLOAT,false,0,0);
  }
 }
 gl.bindVertexArray(null);
}

function readExtraFrames(gl,buffer,meta,uv,indices){
 let offset=0;const frames=[];
 for(let i=0;i<meta.frames;i++){
  const p=new Float32Array(buffer,offset,meta.vertices*3);offset+=meta.vertices*12;
  const normals=new Float32Array(buffer,offset,meta.vertices*3);offset+=meta.vertices*12;
  frames.push(geometry(gl,p,normals,uv,indices));
 }
 connectNextFrameBuffers(gl,frames);return frames;
}

function readStandaloneFrames(gl,buffer,meta,uv,indices){
 let offset=meta.vertices*8+meta.indices*4;const frames=[];
 for(let i=0;i<meta.frames;i++){
  const p=new Float32Array(buffer,offset,meta.vertices*3);offset+=meta.vertices*12;
  const normals=new Float32Array(buffer,offset,meta.vertices*3);offset+=meta.vertices*12;
  frames.push(geometry(gl,p,normals,uv,indices));
 }
 connectNextFrameBuffers(gl,frames);return frames;
}

async function loadBossClips(gl,base,baseMeta,uv,indices){
 const specs={charge:'boss_charge',run:'boss_run',push:'boss_push',spell:'boss_spell'};
 const entries=await Promise.all(Object.entries(specs).map(async([name,file])=>{
  const [metaResponse,dataResponse]=await Promise.all([fetch(base+file+'.json'),fetch(base+file+'.bin')]);
  if(!metaResponse.ok||!dataResponse.ok)throw Error('โหลดคลิปบอสไม่สำเร็จ: '+name);
  const meta=await metaResponse.json();
  if(meta.vertices!==baseMeta.vertices||meta.indices!==baseMeta.indices)throw Error('ข้อมูลคลิปบอสไม่ตรงกับโมเดลหลัก: '+name);
  return [name,{frames:readStandaloneFrames(gl,await dataResponse.arrayBuffer(),meta,uv,indices),duration:meta.duration}];
 }));
 return Object.fromEntries(entries);
}

export async function loadEnemyAsset(gl,key){
 const base='./assets/enemies/';
 const sourceKey=key==='boss'?'boss_walk':key;
 const [metaResponse,dataResponse]=await Promise.all([fetch(base+sourceKey+'.json'),fetch(base+sourceKey+'.bin')]);
 if(!metaResponse.ok||!dataResponse.ok)throw Error('โหลดมอนสเตอร์ไม่สำเร็จ: '+key);
 const meta=await metaResponse.json(),buffer=await dataResponse.arrayBuffer(),n=meta.vertices;let offset=0;
 const uv=new Float32Array(buffer,offset,n*2);offset+=n*8;
 const indices=new Uint32Array(buffer,offset,meta.indices);offset+=meta.indices*4;
 const frames=[];for(let i=0;i<meta.frames;i++){
  const p=new Float32Array(buffer,offset,n*3);offset+=n*12;const normals=new Float32Array(buffer,offset,n*3);offset+=n*12;
  frames.push(geometry(gl,p,normals,uv,indices));
 }
 connectNextFrameBuffers(gl,frames);
 const clips={walk:{frames,duration:meta.duration}};
 if(key==='boss')Object.assign(clips,await loadBossClips(gl,base,meta,uv,indices));
 if(meta.flight_clip){
  const response=await fetch(base+meta.flight_clip.bin);if(!response.ok)throw Error('โหลดท่าบิน Elite ไม่สำเร็จ: '+key);
  const clipMeta={...meta.flight_clip,vertices:n};clips.flight={frames:readExtraFrames(gl,await response.arrayBuffer(),clipMeta,uv,indices),duration:meta.flight_clip.duration};
 }
 if(meta.extra_clips){
  for(const [name,clip] of Object.entries(meta.extra_clips)){
   const response=await fetch(base+clip.bin);if(!response.ok)throw Error('โหลดคลิป '+name+' ไม่สำเร็จ: '+key);
   clips[name]={frames:readExtraFrames(gl,await response.arrayBuffer(),{...clip,vertices:n},uv,indices),duration:clip.duration};
  }
 }
 const [tex,eliteTex]=await Promise.all([
  loadTexture(gl,base+meta.texture),
  meta.elite_texture?loadTexture(gl,base+meta.elite_texture):Promise.resolve(null)
 ]);
 return {frames,mesh:frames[0],clips,tex,eliteTex,duration:meta.duration,height:meta.height,meta};
}
