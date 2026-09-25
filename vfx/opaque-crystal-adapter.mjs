/** WebGL material compatibility: an opaque crystal must resolve its nearest
 * surface instead of letting later back faces repaint the whole drill white.
 * Original ice shader body and meshes remain untouched. Translucent stages
 * retain non-writing depth; Fire's renderer and depth policy are not modified.
 */
export function adaptOpaqueCrystals(source){
 const from='gl.bufferSubData(gl.ARRAY_BUFFER,0,data);gl.drawElementsInstanced(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0,list.length);calls++;';
 const to="gl.bufferSubData(gl.ARRAY_BUFFER,0,data);gl.depthMask(first.shader==='ice_crystal'&&list.every(c=>c.p1[0]>=.98));gl.drawElementsInstanced(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0,list.length);gl.depthMask(false);calls++;";
 if(source.split(from).length!==2)throw Error('Opaque ice draw anchor changed');
 return source.replace(from,to);
}
