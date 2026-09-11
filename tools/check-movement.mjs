// Exercise the same movement functions used by the frame loop, without a GPU.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as terrain from '../terrain.js';
import * as enemies from '../enemies.js';
import * as bending from '../grass-bend.js';
const dummy={addEventListener(){},style:{},dataset:{}};
const context={...bending,...enemies,...terrain,assert,console,document:{getElementById(){return dummy}},window:{addEventListener(){}}};
const source=fs.readFileSync(new URL('../main.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('start().catch(fail);','');
vm.runInNewContext(source+`
const world=(d,x,y)=>[d.x+(x/1536-.5)*2*d.rx,d.z+(y/1024-.5)*2*d.rz];
for(const d of DECALS.filter(d=>d.art==='pond')){
 for(const pixel of [[700,460],[900,470],[980,550],[730,800]])assert(waterBlocked(...world(d,...pixel)), 'Water, reflections and lilies must all block');
 assert(!waterBlocked(...world(d,220,660)), 'Pond bank must stay walkable');
 state.player=[d.x-d.rx-1,0,d.z];movePlayer(d.rx*2+2,0);
 assert(state.player[0]<d.x, 'Large movement must not tunnel across pond');
 assert(canStand(state.player[0],state.player[2]), 'Stop outside water with foot radius');
}
const north=DECALS.find(d=>d.art==='north');
const northern=(x,y)=>[north.x+(x/1024-.5)*north.rx*2,north.z+(y/1536-.5)*north.rz*2];
for(const pixel of [[720,310],[700,560],[420,870],[430,1160]])assert(!canStand(...northern(...pixel)), 'Northern water blocks at '+pixel);
assert(canStand(...northern(660,865)), 'New grassy tongue remains walkable');
state.player=[14.5,0,-23];movePlayer(13,0);
assert(state.player[0]<21&&canStand(state.player[0],state.player[2]), 'Northern shore stops fast movement');
state.player=[-25,0,-19];movePlayer(12,0);
assert(Math.abs(state.player[0]+13)<1e-8, 'Cross the whole clearing without invisible water collision');
assert(clearingAmount(-19,-20)>.5&&clearingCover(-19,-20)===1, 'Clearing density covers soil');
assert(clearingCover(0,0)===0, 'Grass elsewhere stays unchanged');
assert(!DECALS.some(d=>d.art==='mud'),'Removed puddle decal');
const oldMud={x:-8,z:6,rx:4.8,rz:5.1};
for(const pixel of [[1000,370],[440,510],[755,680],[700,510]]){
 const [x,z]=world(oldMud,...pixel);
 assert(canStand(x,z)&&!bareGround(x,z),'Former puddles are walkable grassy ground');
}
state.player=[-12,0,6];movePlayer(8,0);
assert(Math.abs(state.player[0]+4)<1e-8,'Cross removed puddles without invisible collision');
for(const [x,z] of scenery)assert(!canStand(x,z),'Tree and rock centres block');
state.player=[-10,0,-5];movePlayer(4,0);assert(state.player[0]<-8.5,'Trunk blocks walking');
state.player=[-8.57,0,-5];movePlayer(.4,.5);assert(state.player[2]>-4.6,'Slide along obstacle');
assert(canStand(state.player[0],state.player[2]),'Slide endpoint stays outside');
state.player=[0,0,20];movePlayer(.3,.4);assert(Math.abs(state.player[0]-.3)<1e-8&&Math.abs(state.player[2]-20.4)<1e-8,'Open ground preserves movement');
state.player=[33.7,0,30];movePlayer(3,0);assert(state.player[0]<=FIELD_LIMIT,'Field boundary blocks');
console.log('PASS: redesigned northern pond, walkable inlet, clearing crossing and density, original pond, lilies, removed puddles now grassy and walkable, trunks, rocks, sliding, no tunnelling, open ground, map boundary');
`,context);
