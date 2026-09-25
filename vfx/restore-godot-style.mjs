/** v100 source port, replacing the rejected primitive-decoration patch.
 * No game input, fire renderer, damage logic, monster or environment is changed.
 * The three source inputs below are embedded statically into the canonical bundle.
 */
import {readFileSync} from 'node:fs';
export const VFX_RESTORE_VERSION='godot-source-port-v1';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
export function applyRestoredSkillVfx(source){
  const start=source.indexOf('un={water:'),end=source.indexOf('function hn(',start);
  if(start<0||end<start||source.indexOf('un={water:',start+1)>=0)throw Error('Elemental renderer baseline changed');
  const legacy=read('./legacy-status-renderer.txt');
  const module=read('./godot-elemental-renderer.mjs').replace('export function createGodotSkillVfxRenderer','function createGodotSkillVfxRenderer');
  const shaders=JSON.parse(read('./godot-shaders.json'));
  const wrapper=`function mn(e){
    const restored=createGodotSkillVfxRenderer(e,${JSON.stringify(shaders)});
    if(new URLSearchParams(globalThis.location?.search||'').has('qa'))globalThis.__slimeGodotVfx=restored;
    let t=T(e,cn,ln),n=e.createVertexArray(),r=e.createBuffer(),i=e.getUniformLocation(t,'vp');
    e.bindVertexArray(n);e.bindBuffer(e.ARRAY_BUFFER,r);
    for(let [t,n,r]of [[0,3,0],[1,3,12],[2,4,24]]){e.enableVertexAttribArray(t);e.vertexAttribPointer(t,n,e.FLOAT,false,40,r)}
    e.bindVertexArray(null);
    return {draw(a,o,s,c,l){
      const extra=restored.draw(a,o,s,c,l),u=pn(a,o,c,l);
      if(u.length){e.useProgram(t);e.bindVertexArray(n);e.bindBuffer(e.ARRAY_BUFFER,r);e.bufferData(e.ARRAY_BUFFER,u,e.DYNAMIC_DRAW);e.uniformMatrix4fv(i,false,s);e.disable(e.CULL_FACE);e.enable(e.BLEND);e.blendFunc(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA);e.depthMask(false);e.drawArrays(e.TRIANGLES,0,u.length/10);e.depthMask(true);e.disable(e.BLEND);e.bindVertexArray(null)}
      return {calls:extra.calls+(u.length?1:0),triangles:extra.triangles+u.length/30};
    }};
  }`;
  return source.slice(0,start)+legacy+'\n/* GODOT_V100_SOURCE_PORT */\n'+module+'\n'+wrapper+source.slice(end);
}
