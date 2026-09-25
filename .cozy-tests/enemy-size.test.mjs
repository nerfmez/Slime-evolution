import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {visualSizeEdits,undoVisualSize} from './enemy-size-provenance.mjs';
import {WATER_CELL_WORLD,WATER_FOOT,waterPose,waterMuzzle,emitWaterShot,createWaterCalfRenderer} from '../game/assets/water-calf.js';
import {SPARK_CELL_WORLD,SPARK_FOOT,sparkPose,sparkImpactPoint,createSparkHedgehogRenderer,SPARK_DASH_START,SPARK_DASH_SPEED,SPARK_TRIGGER_RANGE} from '../game/assets/spark-hedgehog.js';
import {normalEnemies,eliteEnemies} from '../game/assets/enemy-roster.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('size tuning reverses exactly to the two deployed modules; no art/AI/timing rewrite',async()=>{
 for(const path of Object.keys(visualSizeEdits)){
  const source=await readFile(new URL('../game/'+path,import.meta.url),'utf8');
  undoVisualSize(path,source);
  assert.throws(()=>undoVisualSize(path,source+'\n// unintended edit\n'));
 }
 close(WATER_CELL_WORLD/1.90,1.25);close(SPARK_CELL_WORLD/2.10,.80);
 assert.equal(WATER_FOOT,.09375);assert.equal(SPARK_FOOT,1-330/384);
 assert.deepEqual([SPARK_DASH_START,SPARK_DASH_SPEED,SPARK_TRIGGER_RANGE],[.6,8,3]);
 assert.deepEqual([normalEnemies.water.speed,normalEnemies.water.damage,normalEnemies.water.radius],[.85,6,.37]);
 assert.deepEqual([normalEnemies.spark.speed,normalEnemies.spark.damage,normalEnemies.spark.radius],[1.42,6,.30]);
 assert.equal(eliteEnemies.water.scale,1.55);
});

test('water bullets leave the resized trunk in both directions and Alpha retains its size ratio',()=>{
 for(const scale of [1,1.55])for(const facing of [-1,1]){
  const e={id:1,x:3,z:4,scale,yaw:facing*Math.PI/2,elite:scale>1};
  const p=waterMuzzle(e);close(p.x-e.x,facing*.69*scale*1.25);close(p.z-e.z,-.47*scale*1.25);assert.equal(p.y,.30);
  const w={bullets:[]};emitWaterShot(w,e,[0,0,0],6);
  assert.equal(w.bullets.length,e.elite?3:1);
  for(const b of w.bullets){assert.deepEqual([b.x,b.z,b.y],[p.x,p.z,p.y]);close(Math.hypot(b.vx,b.vz),3.8);assert.equal(b.radius,.10);}
 }
});

test('spark impact stays attached to the smaller sprite in every attack direction',()=>{
 for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.5]){
  const e={x:2,z:3,sparkAimX:Math.cos(angle),sparkAimZ:Math.sin(angle)},p=sparkImpactPoint(e);
  close(p.x-e.x,.28*e.sparkAimX);close(p.z-e.z,.28*e.sparkAimZ);
 }
});

test('actual renderers use one resized body scale and unchanged foot pivot in every pose/camera',async t=>{
 // Spy on the uniforms supplied by the real renderer; only network, image decode
 // and WebGL driver calls are mocked. Browser CI separately renders the real atlas.
 let height=1920;
 const oldImage=globalThis.Image;
 globalThis.Image=class{naturalWidth=1536;naturalHeight=height;async decode(){}};
 t.after(()=>{if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;});
 t.mock.method(globalThis,'fetch',async()=>new Response(new Blob(['image bytes are verified by the existing atlas tests'])));
 const noop=()=>{};
 const gl=new Proxy({getParameter:()=>false,createTexture:()=>({}),getUniformLocation:(_,name)=>name},{get:(o,k)=>k in o?o[k]:String(k).toUpperCase()===k?0:noop});
 const draws=[],values={};
 const helpers={program:()=>({}),geometry:()=>({}),uniform:(_g,_p,key,value)=>{values[key]=value},render:()=>draws.push({...values})};
 const water=await createWaterCalfRenderer(gl,helpers);height=1536;
 const spark=await createSparkHedgehogRenderer(gl,helpers);
 const waterStates=[{},...Array.from({length:8},(_,i)=>({walkBlend:1,anim:(i+.1)/8})),{windup:.3},{waterShotPose:.2},{hit:.2},...Array.from({length:4},(_,i)=>({waterDeath:i*.12+.01}))];
 const sparkStates=[{},...Array.from({length:6},(_,i)=>({walkBlend:1,walkPhase:(i+.1)/6})),...[0,.19,.61,.93,1.03,1.14].map(sparkAge=>({sparkAge})),{hit:.2},{sparkDeath:.2}];
 for(const camera of [[0,12,15],[0,4,18],[0,21,.1]])for(const facing of [-1,1]){
  for(const scale of [1,1.55])for(const state of waterStates){
   const e={x:3,z:4,scale,yaw:facing*Math.PI/2,...state};water.draw(e,[],[0,0,0],camera);
   const d=draws.at(-1),cell=waterPose(e).cell;close(d.size,2.375*scale);assert.equal(d.anchor,WATER_FOOT);assert.deepEqual(d.origin,[3,.025,4]);assert.equal(d.flipX,facing<0?1:0);assert.deepEqual(d.cameraDirection,camera);close(d.rect[0],cell%4*.25);
  }
  for(const state of sparkStates){
   const e={x:3,z:4,scale:1,yaw:facing*Math.PI/2,sparkFacing:facing,...state};spark.draw(e,[],[0,0,0],camera);
   const d=draws.at(-1);close(d.size,1.68);assert.equal(d.anchor,SPARK_FOOT);assert.deepEqual(d.origin,[3,.025,4]);assert.equal(d.flipX,facing<0?1:0);assert.equal(spark.stats.last.cell,sparkPose(e).cell);
  }
 }
 water.drawProjectile({x:0,z:0,age:0,vx:1,vz:0},[],[0,0,0]);close(draws.at(-1).size,.84);
 water.drawSplash({x:0,z:0,age:0},[],[0,0,0]);close(draws.at(-1).size,.85);
 assert.ok(draws.length>250);
});
