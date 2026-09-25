import {undoPandaFile} from './panda-provenance.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const proof=JSON.parse(readFileSync(new URL('../docs/turtle-integration-proof.json',import.meta.url),'utf8'));
const sha=s=>createHash('sha256').update(s).digest('hex');
export function undoTurtleBundle(source){
  source=undoPandaFile('assets/main-critter-v4.js',source);
  assert.equal(sha(source),proof.afterBundleSHA256,'Current Turtle bundle matches its exact reviewed bytes');
  for(const e of proof.reverse){assert.equal(source.slice(e.start,e.start+e.new.length),e.new,e.label);source=source.slice(0,e.start)+e.old+source.slice(e.start+e.new.length);}
  assert.equal(sha(source),proof.beforeBundleSHA256,'Undoing Turtle recovers the entire last deployed main bundle');
  return source;
}
