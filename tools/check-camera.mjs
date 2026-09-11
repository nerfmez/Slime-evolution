import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as math from '../math.js';
import * as terrain from '../terrain.js';
const element={width:1200,height:750,addEventListener(){},style:{},dataset:{}};
const context={...math,...terrain,assert,console,uniform(){},document:{getElementById(){return element}},window:{addEventListener(){}}};
const source=fs.readFileSync(new URL('../main.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('start().catch(fail);','');
vm.runInNewContext(source+`
for(const size of [[1200,750],[750,1200]])for(const mode of ['game','side','top'])for(const pos of [[0,0,0],[-19,0,-17],[32,0,32]]){
 canvas.width=size[0];canvas.height=size[1];state.camera=mode;state.player=pos;camera();
 const x=pos[0],y=.267,z=pos[2];
 const screenX=vp[0]*x+vp[4]*y+vp[8]*z+vp[12];
 const screenY=vp[1]*x+vp[5]*y+vp[9]*z+vp[13];
 assert(Math.abs(screenX)*canvas.width/2<.01&&Math.abs(screenY)*canvas.height/2<.01,'Slime centre must project to screen centre');
}
console.log('PASS: centred in landscape/portrait, all camera modes, origin/clearing/map edge');
`,context);
