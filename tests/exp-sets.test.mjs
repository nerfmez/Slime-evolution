import {readFileSync} from 'node:fs';
import test from 'node:test';import assert from 'node:assert/strict';
import {EXP_SETS,expTier,syncExpAppearance} from '../critters/catalog.js';
import {ensureCritter,updateCritterSouls,attractAllCritters,critterAttractionRange} from '../critters/logic.js';
import {ATLAS_URL,SPRITES,EXP_FRAMES,PANDA_ROLL,ITEM_FRAMES} from '../critters/atlas.js';
function drop(value,id=11,x=0,z=0){return {id,x,z,value,age:1};}
function combat(){return {souls:[],mods:{magnet:0,soul:0},xp:0,level:1,size:1,choosing:false,growth:0};}
function tick(c,frames=80){for(let i=0;i<frames;i++)updateCritterSouls(c,1/60,[0,0,0],()=>true);}
test('exactly three EXP bands and three approved animals per band',()=>{assert.deepEqual(EXP_SETS.map(s=>[s.min,s.max]),[[1,9],[10,19],[20,Infinity]]);assert.equal(EXP_SETS.flatMap(s=>s.animals).length,9);for(const s of EXP_SETS)assert.equal(s.animals.length,3);});
test('bands are LOW 1-9 MID 10-19 HIGH 20+',()=>{for(let v=1;v<=9;v++)assert.equal(expTier(v),0);for(let v=10;v<=19;v++)assert.equal(expTier(v),1);for(const v of [20,24,30,56,9999])assert.equal(expTier(v),2);});
test('all nine forms are stable and reward value is untouched',()=>{const seen=new Set();for(const value of [2,12,24])for(let form=0;form<3;form++){const o=drop(value);const c=ensureCritter(o);c.seed=(form+.5)/3;c.expValue=null;ensureCritter(o);seen.add(c.expTier+':'+c.expForm);assert.equal(o.value,value);}assert.equal(seen.size,9);});
test('sizes stay lightweight and rise by band',()=>{assert.deepEqual(EXP_SETS.map(s=>s.size),[.18,.22,.26]);});
test('merge promotes visual band without resetting actor identity or reward',()=>{const o=drop(6);const c=ensureCritter(o,()=>true);Object.assign(c,{fleeArmed:false,fleeLeft:.1,eat:.3,phase:9,homeX:17,homeZ:4});const seed=c.seed;o.value=22;const next=ensureCritter(o,()=>true);assert.equal(next,c);assert.equal(c.expTier,2);assert.equal(c.seed,seed);assert.equal(c.eat,.3);assert.equal(o.value,22);});
test('no Magnet mod means no passive attraction',()=>{const c=combat();c.souls=[drop(2,1,.85)];tick(c,100);assert.equal(c.xp,0);assert.equal(critterAttractionRange(c),0);});
test('global magnet item still gathers exact EXP once',()=>{const c=combat();c.souls=[drop(7,1,15)];attractAllCritters(c);tick(c,180);assert.equal(c.xp,7);tick(c,30);assert.equal(c.xp,7);});
test('atlas contains front/back for 9 EXP animals, panda roll, and three item animals',()=>{assert.equal(EXP_FRAMES.length,3);assert.ok(EXP_FRAMES.every(set=>set.length===3&&set.every(pair=>pair.length===2)));assert.ok(SPRITES[PANDA_ROLL]);for(const kind of ['heal','magnet','nova']){assert.equal(ITEM_FRAMES[kind].length,2);for(const f of ITEM_FRAMES[kind])assert.ok(SPRITES[f]);}const png=readFileSync(new URL('../critters/atlas.png',import.meta.url));assert.equal(png.subarray(1,4).toString(),'PNG');assert.ok(ATLAS_URL.endsWith('/critters/atlas.png'));});
test('item actors do not get an EXP band',()=>{for(const kind of ['heal','magnet','nova']){const o={...drop(100),kind};const c=ensureCritter(o);assert.equal(c.expTier,undefined);}});
