import test from 'node:test';
import assert from 'node:assert/strict';
import {frogFrame,thornSpriteCell} from '../thorn-sprite.js';
import {ENEMY_TYPES} from '../enemies.js';

test('normal Thorn slot is renamed without changing Thorn Alpha stride',()=>{
 assert.equal(ENEMY_TYPES.thorn.name,'Moss Frog');
 assert.equal(ENEMY_TYPES.thorn.eliteName,'Thorn Alpha');
 assert.equal(ENEMY_TYPES.thorn.stride,.42);
});

test('approved hit pose is death frame 2',()=>{
 const f=frogFrame({hp:10,hit:.1,walkBlend:1,walkPhase:0,__frogAttackPose:0});
 assert.deepEqual(f.rect,[.25,.25,.25,.25]);
 assert.equal(f.width,1);
});

test('tongue attack uses the separate wide attack strip',()=>{
 const f=frogFrame({hp:10,hit:0,walkBlend:0,walkPhase:0,__frogAttackPose:.1});
 assert.deepEqual(f.rect,[.25,0,.75,.25]);
 assert.equal(f.width,3);
});

test('death sequence keeps exactly five approved frames',()=>{
 const ages=[0,.096,.191,.286,.381];
 const expected=[
  [0,.25,.25,.25],
  [.25,.25,.25,.25],
  [.5,.25,.25,.25],
  [.75,.25,.25,.25],
  [0,0,.25,.25]
 ];
 for(let i=0;i<ages.length;i++){
  const f=frogFrame({hp:0,__frogCorpse:true,__frogDeathAge:ages[i],hit:0});
  assert.deepEqual(f.rect,expected[i]);
 }
});

test('compatibility frame selector stays in the 8-frame jump range',()=>{
 for(let i=0;i<64;i++){
  const cell=thornSpriteCell(0,i/16,8);
  assert.ok(cell>=0&&cell<8);
 }
});
