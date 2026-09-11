import test from 'node:test';
import assert from 'node:assert/strict';
import {createGrassBend,BEND_SIZE} from '../grass-bend.js';
const empty={fx:[],patches:[],cyclones:[],projectiles:[]};
const center=(48*BEND_SIZE+48)*4+3;
test('fire clears vegetation, stays charred, regrows and reheats without changing bend channels',()=>{
 const field=createGrassBend();
 field.update([],0,null,{...empty,fx:[{type:'blast',x:0,z:0,r:2,age:0}]});
 assert.equal(field.pixels[center],0);
 assert.deepEqual([...field.pixels.slice(center-3,center)],[128,128,0]);
 field.update([],6,null,empty);assert.equal(field.pixels[center],0);
 field.update([],1.5,null,empty);assert(Math.abs(field.pixels[center]-128)<2);
 field.update([],1.5,null,empty);assert.equal(field.pixels[center],255);
 for(const [key,value] of [['patches',{x:0,z:0,r:2}],['cyclones',{x:0,z:0,r:2}],['projectiles',{x:.375,z:.375,ember:true}],['fx',{x:0,z:0,r:2,type:'meteor',age:.1}]]){
  field.reset();field.update([],0,null,{...empty,[key]:[value]});if(key==='projectiles'){assert(field.pixels[center]>100&&field.pixels[center]<255);field.update([],2,null,empty);assert.equal(field.pixels[center],255);}else assert.equal(field.pixels[center],0,key);
 }
 field.reset();assert.equal(field.pixels[center],255);
});
