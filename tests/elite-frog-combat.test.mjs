import {test} from 'node:test';
import assert from 'node:assert/strict';
import {insideEliteFrogCone,eliteFrogAttack,ELITE_FROG_WINDUP} from '../species/elite-frog-combat.js';
test('wide ranged cone hits both sides but not behind or beyond its visible sector',()=>{
 for(const sign of [-1,1])assert.ok(insideEliteFrogCone(sign*3,2,0,1));
 assert.ok(insideEliteFrogCone(0,4.5,0,1));
 assert.equal(insideEliteFrogCone(0,4.51,0,1),false);
 assert.equal(insideEliteFrogCone(0,-1,0,1),false);
 assert.equal(insideEliteFrogCone(4,1,0,1),false);
});
test('locked aim can be dodged; an ordinary hit cannot cancel cone damage and three-second poison',()=>{
 for(const dodge of [false,true]){
  const hits=[],w={damage:v=>hits.push(v)},e={type:'thorn',elite:true,x:0,z:0,attack:0,hit:.2};
  assert.equal(eliteFrogAttack(w,.05,e,4,[0,0,4],true,10),false);
  assert.equal(e.windup,ELITE_FROG_WINDUP);assert.equal(hits.length,0);
  eliteFrogAttack(w,ELITE_FROG_WINDUP,e,4,dodge?[0,0,-4]:[3,0,2],true,10);
  assert.equal(hits.length,dodge?0:1);assert.equal(w.playerPoisonTime,dodge?undefined:3);
  assert.equal(w.eliteFx.length,1);assert.equal(w.eliteFx[0].length,4.5);
  eliteFrogAttack(w,.05,e,4,[0,0,4],true,10);assert.equal(hits.length,dodge?0:1);
 }
 assert.equal(eliteFrogAttack({},.05,{type:'thorn',elite:false},1,[0,0,1],true,10),null);
});
