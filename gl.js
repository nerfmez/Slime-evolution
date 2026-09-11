export function program(gl,vs,fs){function shader(type,src){let s=gl.createShader(type);gl.shaderSource(s,'#version 300 es\nprecision highp float;\n'+src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}let p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p}
export function geometry(gl,pos,normals,uv,indices){const buffers=[];let vao=gl.createVertexArray();gl.bindVertexArray(vao);for(let [i,a,n] of [[0,pos,3],[1,normals,3],[2,uv,2]]){if(!a)continue;let b=gl.createBuffer();buffers[i]=b;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(a),gl.STATIC_DRAW);gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,n,gl.FLOAT,false,0,0)}let count=pos.length/3;if(indices){let b=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint32Array(indices),gl.STATIC_DRAW);count=indices.length}gl.bindVertexArray(null);return {vao,count,indexed:!!indices,buffers}}
export function render(gl,g){gl.bindVertexArray(g.vao);if(g.indexed)gl.drawElements(gl.TRIANGLES,g.count,gl.UNSIGNED_INT,0);else gl.drawArrays(gl.TRIANGLES,0,g.count)}
const locations=new WeakMap();
export function uniform(gl,p,key,val){
 let cache=locations.get(p);if(!cache){cache=new Map();locations.set(p,cache)}
 if(!cache.has(key))cache.set(key,{location:gl.getUniformLocation(p,key),value:undefined});
 const entry=cache.get(key),u=entry.location;if(u===null)return;
 if(typeof val==='number'){
  if(entry.value===val)return;entry.value=val;gl.uniform1f(u,val);
 }else{
  const previous=entry.value;let same=previous&&previous.length===val.length;
  if(same)for(let i=0;i<val.length;i++)if(previous[i]!==val[i]){same=false;break;}
  if(same)return;
  entry.value=Array.from(val);
  if(val.length===16)gl.uniformMatrix4fv(u,false,val);
  else if(val.length===3)gl.uniform3fv(u,val);
  else if(val.length>=4&&val.length%4===0)gl.uniform4fv(u,val);
  else if(val.length===2)gl.uniform2fv(u,val);
 }
}

export async function loadGLB(gl,url){let response=await fetch(url);if(!response.ok)throw Error('โหลดโมเดลไม่สำเร็จ '+response.status);let buffer=await response.arrayBuffer(),dv=new DataView(buffer);let len=dv.getUint32(12,true),j=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,len))),start=20+len+8;
 function accessor(id){let a=j.accessors[id],v=j.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],size={5126:4,5125:4,5123:2,5121:1}[a.componentType],out=[];for(let i=0;i<a.count;i++)for(let k=0;k<n;k++){let off=start+(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||n*size)+k*size;let x=a.componentType===5126?dv.getFloat32(off,true):a.componentType===5125?dv.getUint32(off,true):a.componentType===5123?dv.getUint16(off,true):dv.getUint8(off);out.push(x)}return out}
 let primitive=j.meshes[0].primitives[0],pos=accessor(primitive.attributes.POSITION),normal=accessor(primitive.attributes.NORMAL),uv=accessor(primitive.attributes.TEXCOORD_0);let acc=j.accessors[primitive.attributes.POSITION];let mat=j.materials[primitive.material],imageId=j.textures[mat.pbrMetallicRoughness.baseColorTexture.index].source,im=j.images[imageId],bv=j.bufferViews[im.bufferView];let blob=new Blob([new Uint8Array(buffer,start+(bv.byteOffset||0),bv.byteLength)],{type:im.mimeType}),bitmap=await createImageBitmap(blob);let tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);bitmap.close();return {mesh:geometry(gl,pos,normal,uv,accessor(primitive.indices)),tex,min:acc.min,max:acc.max,triangles:accessor(primitive.indices).length/3}}
export async function loadTexture(gl,url,mipmaps=true){const response=await fetch(url);if(!response.ok)throw Error('โหลดหญ้าไม่สำเร็จ '+response.status);const bitmap=await createImageBitmap(await response.blob());const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,bitmap);if(mipmaps)gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,mipmaps?gl.LINEAR_MIPMAP_LINEAR:gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);bitmap.close();return texture;}
