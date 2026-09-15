import {geometry,loadTexture} from './gl.js';

const DEBUG_TIMEOUT_MS=12000;

function debugRecord(stage,detail={}){
 const entry={time:new Date().toISOString(),stage,...detail};
 if(typeof window!=='undefined'){
  window.__slimeDebug=window.__slimeDebug||[];
  window.__slimeDebug.push(entry);
  if(window.__slimeDebug.length>120)window.__slimeDebug.shift();
  window.__slimeLastDebug=entry;
 }
 console.log('[SLIME DEBUG]',entry);
 return entry;
}

function withTimeout(promise,label,ms=DEBUG_TIMEOUT_MS){
 let timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' timeout '+Math.round(ms/1000)+'s')),ms);});
 return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));
}

async function fetchChecked(url,label){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),DEBUG_TIMEOUT_MS);
 debugRecord('fetch:start',{label,url});
 try{
  const response=await fetch(url,{signal:controller.signal,cache:'no-store'});
  if(!response.ok)throw new Error(label+' HTTP '+response.status+' '+url);
  debugRecord('fetch:ok',{label,url,status:response.status});
  return response;
 }catch(error){
  const message=error?.name==='AbortError'?label+' timeout '+Math.round(DEBUG_TIMEOUT_MS/1000)+'s '+url:(error?.message||String(error));
  debugRecord('fetch:error',{label,url,message});
  throw new Error(message);
 }finally{clearTimeout(timer);}
}

if(typeof window!=='undefined'&&!window.__slimeDebugHandlersInstalled){
 window.__slimeDebugHandlersInstalled=true;
 window.addEventListener('error',event=>debugRecord('window:error',{message:event.message,source:event.filename,line:event.lineno,column:event.colno}));
 window.addEventListener('unhandledrejection',event=>debugRecord('promise:unhandled',{message:event.reason?.stack||event.reason?.message||String(event.reason)}));
}

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
 // Standalone boss_*.bin files include their own UV and index header before frame data.
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
  const [metaResponse,dataResponse]=await Promise.all([
   fetchChecked(base+file+'.json','boss '+name+' meta'),
   fetchChecked(base+file+'.bin','boss '+name+' data')
  ]);
  const meta=await metaResponse.json();
  if(meta.vertices!==baseMeta.vertices||meta.indices!==baseMeta.indices)throw Error('ข้อมูลคลิปบอสไม่ตรงกับโมเดลหลัก: '+name);
  return [name,{frames:readStandaloneFrames(gl,await dataResponse.arrayBuffer(),meta,uv,indices),duration:meta.duration}];
 }));
 return Object.fromEntries(entries);
}

export async function loadEnemyAsset(gl,key){
 debugRecord('enemy:start',{key});
 try{
  const base='./assets/enemies/';
  // Boss authoring exports its normal locomotion as boss_walk.* rather than boss.*.
  const sourceKey=key==='boss'?'boss_walk':key;
  const [metaResponse,dataResponse]=await Promise.all([
   fetchChecked(base+sourceKey+'.json','enemy '+key+' meta'),
   fetchChecked(base+sourceKey+'.bin','enemy '+key+' data')
  ]);
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
   const response=await fetchChecked(base+meta.flight_clip.bin,'elite flight '+key);
   const clipMeta={...meta.flight_clip,vertices:n};clips.flight={frames:readExtraFrames(gl,await response.arrayBuffer(),clipMeta,uv,indices),duration:meta.flight_clip.duration};
  }
  if(meta.extra_clips){
   for(const [name,clip] of Object.entries(meta.extra_clips)){
    const response=await fetchChecked(base+clip.bin,'enemy clip '+key+'/'+name);
    clips[name]={frames:readExtraFrames(gl,await response.arrayBuffer(),{...clip,vertices:n},uv,indices),duration:clip.duration};
   }
  }
  const [tex,eliteTex]=await Promise.all([
   withTimeout(loadTexture(gl,base+meta.texture),'enemy '+key+' texture'),
   meta.elite_texture?withTimeout(loadTexture(gl,base+meta.elite_texture),'enemy '+key+' elite texture'):Promise.resolve(null)
  ]);
  debugRecord('enemy:done',{key,frames:frames.length,texture:meta.texture});
  return {frames,mesh:frames[0],clips,tex,eliteTex,duration:meta.duration,height:meta.height,meta};
 }catch(error){
  const message='โหลดมอน '+key+' ล้มเหลว: '+(error?.message||String(error));
  debugRecord('enemy:error',{key,message,stack:error?.stack||''});
  throw new Error(message);
 }
}
