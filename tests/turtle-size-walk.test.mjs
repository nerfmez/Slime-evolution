import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {turtlePose,TURTLE_WALK_SEQUENCE,TURTLE_CELL_WORLD} from '../game/assets/pond-turtle.js';
import {undoTurtleSizeWalk} from './turtle-size-walk-provenance.mjs';
const read=p=>readFile(new URL('../'+p,import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
test('eight-pose loop keeps original order and full cycle; no invented or duplicate end pose',async()=>{
 const expected=[0,1,3,4,6,7,9,10];assert.deepEqual(TURTLE_WALK_SEQUENCE,expected);assert.ok(Object.isFrozen(TURTLE_WALK_SEQUENCE));
 const metadata=JSON.parse(await read('game/assets/enemies/pond-turtle-atlas.json'));
 assert.deepEqual(expected.map(i=>metadata.cells[i].videoFrame),[72,78,90,96,108,114,126,132]);
 for(const offset of [-2,-1,0,1,2]){
  const cells=Array.from({length:800},(_,i)=>turtlePose({walkBlend:1,walkPhase:offset+(i+.1)/800}).cell);
  assert.deepEqual(cells.filter((v,i,a)=>i===0||v!==a[i-1]),expected);
 }
 assert.equal(turtlePose({walkBlend:1,walkPhase:1}).cell,0);assert.equal(turtlePose({walkBlend:1,walkPhase:.9999}).cell,10);
 assert.equal(turtlePose({walkBlend:0,walkPhase:.8}).cell,0);assert.equal(TURTLE_CELL_WORLD,2.42);
});
test('all approved colored pixels, alpha, static poses and extraction metadata remain byte-identical',async()=>{
 assert.equal(sha(await read('game/assets/enemies/pond-turtle-atlas.webp')),'a825634101b2b6bede7148e2374cf2499077799a572a3f67496710ea526d4c40');
 assert.equal(sha(await read('game/assets/enemies/pond-turtle-atlas.json')),'6feb863fae3b3c2d48b7669ddc5a10d95627c326423ab157101d9ba2d03d90a1');
});
test('only size and pose selection change in the Turtle module; exact reverse rejects any extra behavior edit',async()=>{
 const current=(await read('game/assets/pond-turtle.js')).toString();
 const before=undoTurtleSizeWalk(current);assert.notEqual(before,current);
 assert.throws(()=>undoTurtleSizeWalk(current.replace('TURTLE_GUARD_HOLD=2.40','TURTLE_GUARD_HOLD=8')));
 assert.throws(()=>undoTurtleSizeWalk(current+'//unrequested change'));
});
