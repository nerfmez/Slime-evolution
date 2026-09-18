import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const proof=JSON.parse(readFileSync(new URL('../docs/panda-integration-proof.json',import.meta.url),'utf8'));
const hash=x=>createHash('sha256').update(x).digest('hex');
export function undoPandaFile(path,raw){
 const p=proof[path];if(!p)return raw;
 let text=raw.toString();assert.equal(hash(text),p.afterSHA256,path+' exactly matches the scoped Panda patch');
 for(const e of p.reverse){assert.equal(text.slice(e.start,e.start+e.new.length),e.new,e.label);text=text.slice(0,e.start)+e.old+text.slice(e.start+e.new.length);}
 assert.equal(hash(text),p.beforeSHA256,path+' restored to current deployed parent');return text;
}
export const pandaRuntimeAdditions=['assets/bamboo-panda.js','assets/enemies/bamboo-panda-atlas.webp','assets/enemies/bamboo-panda-atlas.json'];
