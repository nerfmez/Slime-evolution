import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const proof=JSON.parse(readFileSync(new URL('../docs/spark-integration-proof.json',import.meta.url),'utf8'));
const sha=s=>createHash('sha256').update(s).digest('hex');
export function undoSparkBundle(source){
  assert.equal(sha(source),proof.afterBundleSHA256,'Current Spark bundle has its reviewed bytes');
  for(const e of proof.reverse){assert.equal(source.slice(e.start,e.start+e.new.length),e.new,e.label);source=source.slice(0,e.start)+e.old+source.slice(e.start+e.new.length);}
  assert.equal(sha(source),proof.beforeBundleSHA256,'Undoing Spark recovers exact latest main bundle');
  return source;
}
