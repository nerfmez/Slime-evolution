import {geometry,loadTexture} from './gl.js';
export async function loadEnemyAsset(gl,key){
 const base='./assets/enemies/';const [metaResponse,dataResponse]=await Promise.all([fetch(base+key+'.json'),fetch(base+key+'.bin')]);
 if(!metaResponse.ok||!dataResponse.ok)throw Error('โหลดมอนสเตอร์ไม่สำเร็จ: '+key);
 const meta=await metaResponse.json(),buffer=await dataResponse.arrayBuffer(),n=meta.vertices;let offset=0;
 const uv=new Float32Array(buffer,offset,n*2);offset+=n*8;
 const indices=new Uint32Array(buffer,offset,meta.indices);offset+=meta.indices*4;
 const frames=[];for(let i=0;i<meta.frames;i++){
  const p=new Float32Array(buffer,offset,n*3);offset+=n*12;const normals=new Float32Array(buffer,offset,n*3);offset+=n*12;
  frames.push(geometry(gl,p,normals,uv,indices));
 }
 // Link existing next-frame buffers once; interpolation adds no uploads or draw calls.
 for(let i=0;i<frames.length;i++){
  gl.bindVertexArray(frames[i].vao);const next=frames[(i+1)%frames.length];
  for(const [slot,buffer] of [[3,next.buffers[0]],[4,next.buffers[1]]]){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(slot);gl.vertexAttribPointer(slot,3,gl.FLOAT,false,0,0);}
 }
 gl.bindVertexArray(null);
 return {frames,mesh:frames[0],tex:await loadTexture(gl,base+meta.texture),duration:meta.duration,height:meta.height};
}
