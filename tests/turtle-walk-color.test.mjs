import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {files} from '../scripts/canon.mjs';
import {undoTurtleSizeWalk} from './turtle-size-walk-provenance.mjs';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root));
const sha=b=>createHash('sha256').update(b).digest('hex');
const metadata=JSON.parse(await read('game/assets/enemies/pond-turtle-atlas.json'));
test('Turtle color match is the reviewed 12-frame bake with exact preserved alpha and static poses',async()=>{
 const p=metadata.walkColorMatch;
 assert.equal(p.profile,'turtle-walk-to-approved-stills-v1');
 assert.equal(p.source.rgbaSHA256,'2d8194377ba0919d2f4d2324e0c20940d8c171e68ec4a6942645c7f6e88ee896');
 assert.equal(p.output.rgbaSHA256,'7522da66146cc5f31bf5efdf089ad15c4d60980760009a29e007e8b6297cb945');
 assert.deepEqual(p.appliedCells,Array.from({length:12},(_,i)=>i));assert.deepEqual(p.referenceCells,[12,13]);
 assert.deepEqual(metadata.walkFrames,[72,78,84,90,96,102,108,114,120,126,132,138]);
 assert.deepEqual(metadata.pivot,[192,328]);assert.equal(p.output.alphaSHA256,p.source.alphaSHA256);
 assert.deepEqual(p.output.cells.slice(12),p.source.cells.slice(12));
 for(let i=0;i<12;i++){assert.equal(p.output.cells[i].alphaSHA256,p.source.cells[i].alphaSHA256);assert.notEqual(p.output.cells[i].rgbaSHA256,p.source.cells[i].rgbaSHA256);}
 assert.equal(sha(await read('game/assets/enemies/pond-turtle-atlas.webp')),p.atlasSHA256);
 const prep=(await read('tools/prepare-turtle-assets.py')).toString();assert.ok(prep.includes('apply_walk_color(R)'));
});
test('color baseline remains exact after reversing only the requested Turtle size/eight-pose change',async()=>{
 const parent=JSON.parse(await read('docs/turtle-color-parent-manifest.json'));
 const allowed=new Set(['assets/enemies/pond-turtle-atlas.webp','assets/enemies/pond-turtle-atlas.json']);
 let same=0;for(const e of parent){if(!allowed.has(e.path)){const raw=await read('game/'+e.path);const preserved=e.path==='assets/pond-turtle.js'?undoTurtleSizeWalk(raw.toString()):raw;assert.equal(sha(preserved),e.sha256,e.path);same++;}}
 assert.equal(parent.length,1260);assert.equal(same,1258);
 assert.deepEqual((await files(fileURLToPath(new URL('game',root)))).sort(),parent.map(e=>e.path).sort());
});
