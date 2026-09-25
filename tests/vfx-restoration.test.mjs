import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assemble} from '../pacing/assemble.mjs';
import {applySpeciesBundle} from '../species/assemble.mjs';
import {applyRestoredSkillVfx,VFX_RESTORE_VERSION} from '../vfx/restore-godot-style.mjs';
import {createGodotSkillVfxRenderer} from '../vfx/godot-elemental-renderer.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const shaders=JSON.parse(read('vfx/godot-shaders.json'));
const provenance=JSON.parse(read('vfx/godot-provenance.json'));
const renderer=createGodotSkillVfxRenderer(null,shaders);
const families={water:['bolt','beam','jet','wave'],tide:['ring','dome','vacuum','resonance'],toxin:['lob','pool','infection','bloom','miasma','burst','arc'],frost:['crystal','borer','cone','chainburst','burst'],orbit:['arc','ring']};
test('six shader bodies are exact supplied Godot source, including vertex motion',()=>{
 for(const [name,body]of Object.entries(shaders))assert.equal(createHash('sha256').update(body).digest('hex'),provenance.originals['shaders/'+name+'.gdshader']);
 assert.equal(Object.keys(shaders).length,6);
 assert.match(renderer.shaderPair('tidal_wave_surface').vertex,/VERTEX.z \+= crest_weight/);
 assert.match(renderer.shaderPair('frost_breath').vertex,/length_weight \* 0.055/);
});
test('restored non-Fire/non-Chain families emit finite geometry in eight directions without mutating gameplay',()=>{
 for(const [family,kinds]of Object.entries(families))for(const kind of kinds)for(let direction=0;direction<8;direction++){
  const angle=direction*Math.PI/4,dx=Math.sin(angle),dz=Math.cos(angle);
  const c={abilities:[{family,kind,x:0,z:0,dx,dz,tx:3,tz:2,r:2,age:.2,life:.8,length:5,angle:.5}],orbs:[]};
  const before=structuredClone(c),commands=renderer.plan(c,{},.2);assert.ok(commands.length,family+':'+kind);assert.deepEqual(c,before);assert.equal(renderer.diagnostics.invalid,0);
  if(kind==='crystal'){const m=commands[0].model;assert.ok(m[8]*dx+m[10]*dz>.99,'crystal travel axis');}
 }
 for(const {vertices,indices}of renderer.meshes.values()){assert.ok(vertices.every(Number.isFinite));assert.ok(indices.every(i=>i<vertices.length/8));}
});
test('original curled cross section and three subdivided mist sheets replace flat strips',()=>{
 const mesh=renderer.meshes.get('godot-tidal-body-24x8');assert.equal(mesh.indices.length,24*7*6);
 assert.equal(renderer.meshes.get('godot-tidal-foam-24x3').indices.length,24*2*6);
 const v=mesh.vertices,offset=12*8*8;assert.ok(v[offset+6*8+2]>v[offset+7*8+2],'crest must curl back');
 assert.equal(renderer.meshes.get('godot-breath-5.0000-0.5000-0.0800-1.0000').indices.length,9*8*6);
 assert.ok(renderer.meshes.has('godot-drill-helix-3.35-turns'));
});
test('Orbit keeps its four signatures; Fire and rebuilt Chain never enter the source-port renderer',()=>{
 for(const style of ['','power','multi','pulse'])assert.ok(renderer.plan({abilities:[],skills:{orbit:{evo:style}},orbs:[{x:0,z:0,r:.2}]},{},.2).length);
 assert.equal(renderer.plan({abilities:[{family:'fire',kind:'blast',age:.2,life:1}],projectiles:[{x:1,z:1}],fx:[{type:'blast'}],orbs:[]},{},.2).length,0);
 assert.equal(renderer.plan({abilities:[{family:'chain',kind:'arc',x:0,z:0,tx:2,tz:1,age:.2,life:1}],orbs:[]},{},.2).length,0);
});
test('only elemental rendering changes; combat, Fire, scene and latest creature code are byte-identical',()=>{
 const source=applySpeciesBundle(assemble(read('game/assets/main-critter-v4.js'),read('game/index.html')).bundle),result=applyRestoredSkillVfx(source);
 assert.equal(result.slice(0,result.indexOf('un={water:')),source.slice(0,source.indexOf('un={water:')));
 assert.equal(result.slice(result.indexOf('function hn(')),source.slice(source.indexOf('function hn(')));
 assert.ok(!result.includes('for(let t of e.abilities||[])'),'rejected skill renderer remains');
 assert.match(result,/GODOT_V100_SOURCE_PORT/);assert.equal(VFX_RESTORE_VERSION,'godot-source-port-v1');
});
