import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');
const edits=[["export const TURTLE_CELL_WORLD=2.16;", "export const TURTLE_CELL_WORLD=2.42;"], ["export const TURTLE_DAMAGE_MULTIPLIER=.30;\n", "export const TURTLE_DAMAGE_MULTIPLIER=.30;\n// Eight chronological poses from the existing color-matched video atlas.\nexport const TURTLE_WALK_SEQUENCE=Object.freeze([0,1,3,4,6,7,9,10]);\n"], ["  return {name:'walk',cell:Math.min(11,Math.floor(phase*12)),alpha:1,shield:0};", "  const step=Math.min(TURTLE_WALK_SEQUENCE.length-1,Math.floor(phase*TURTLE_WALK_SEQUENCE.length));\n  return {name:'walk',cell:TURTLE_WALK_SEQUENCE[step],alpha:1,shield:0};"]];
export function undoTurtleSizeWalk(source){
 for(const [before,after] of edits){
  assert.equal(source.split(after).length-1,1,'Expected exact Turtle size/walk edit');
  source=source.replace(after,before);
 }
 assert.equal(sha(source),'be03fc66f972d3b030c551eba1a7d4227a6f60d955b53e81bae9f661029db9af','All remaining Turtle behavior/shader bytes must match palette main');
 return source;
}
