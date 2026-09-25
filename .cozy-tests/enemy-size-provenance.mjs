import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
// Only these four size/attachment edits are allowed relative to deployed 51ee5b9.
// Reversal must recover the entire original modules, not just selected functions.
export const visualSizeEdits=Object.freeze({
 'assets/water-calf.js':{
  parentSHA256:'7396b0137f1a1bf47e6d701f4a887ab1cdc246795ba66c37a08ead940c681ad9',
  edits:[
   ['export const WATER_CELL_WORLD=1.90;','export const WATER_CELL_WORLD=2.375;'],
   ['  const scale=e.scale||1;','  const scale=(e.scale||1)*(WATER_CELL_WORLD/1.90);']
  ]
 },
 'assets/spark-hedgehog.js':{
  parentSHA256:'a78e3384eac961876b0004e4ef6449a42e18161ff20e6d5aee16b808ec8b253b',
  edits:[
   ['export const SPARK_CELL_WORLD=2.10;','export const SPARK_CELL_WORLD=1.68;'],
   ['  return {x:e.x+(e.sparkAimX||0)*.35,z:e.z+(e.sparkAimZ||0)*.35};','  const offset=.35*(SPARK_CELL_WORLD/2.10);\n  return {x:e.x+(e.sparkAimX||0)*offset,z:e.z+(e.sparkAimZ||0)*offset};']
  ]
 }
});
export function undoVisualSize(path,source){
 const rule=visualSizeEdits[path];assert.ok(rule,`No size edit authorized for ${path}`);
 for(const [before,after] of rule.edits){
  assert.equal(source.split(after).length-1,1,`Size edit differs in ${path}`);
  source=source.replace(after,before);
 }
 assert.equal(createHash('sha256').update(source).digest('hex'),rule.parentSHA256,`Unrelated code changed in ${path}`);
 return source;
}
