import fs from 'node:fs';import vm from 'node:vm';
const root=process.cwd();
const bending=await import(root+'/grass-bend.js');let bendMap=[];
const enemies=await import(root+'/enemies.js');
const liquid=await import(root+'/slime.js');const math=await import(root+'/math.js');const terrain=await import(root+'/terrain.js');
let commands=[],current={},state={blend:false,depth:true,cull:null},geometries=[];
const elements=new Map();function element(id){if(!elements.has(id))elements.set(id,{width:1200,height:750,addEventListener(){},style:{},dataset:{},setAttribute(){}});return elements.get(id)}
const fakegl={BLEND:1,CULL_FACE:2,FRONT:3,BACK:4,SRC_ALPHA:5,ONE_MINUS_SRC_ALPHA:6,TEXTURE0:7,TEXTURE_2D:8,COLOR_BUFFER_BIT:16,DEPTH_BUFFER_BIT:32,clearColor(){},clear(){},useProgram(){},activeTexture(){},bindTexture(k,v){current.tex=v},blendFunc(){},depthMask(v){state.depth=v},cullFace(v){state.cull=v},enable(v){if(v===1)state.blend=true;if(v===2)state.culling=true},disable(v){if(v===1)state.blend=false;if(v===2)state.culling=false}};
function geometry(gl,pos,normals,uv,indices){let g={id:geometries.length,pos,normals,uv,indices,count:indices?indices.length:pos.length/3};geometries.push(g);return g}
function asset(file){const b=fs.readFileSync(root+'/public/assets/'+file),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12))),start=28+b.readUInt32LE(12);function a(id){let a=j.accessors[id],v=j.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],size={5126:4,5125:4,5123:2,5121:1}[a.componentType],out=[];for(let i=0;i<a.count;i++)for(let k=0;k<n;k++){const off=start+(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||n*size)+k*size;out.push(a.componentType===5126?b.readFloatLE(off):a.componentType===5125?b.readUInt32LE(off):a.componentType===5123?b.readUInt16LE(off):b.readUInt8(off))}return out}const pr=j.meshes[0].primitives[0];return {mesh:geometry(null,a(pr.attributes.POSITION),a(pr.attributes.NORMAL),a(pr.attributes.TEXCOORD_0),a(pr.indices)),tex:file}}
const assets=[asset('slime_meshy_exact_v3.glb'),asset('spiky_berry_v1.glb')];
const bakedAssets={};
for(const key of Object.keys(enemies.ENEMY_TYPES)){
 const meta=JSON.parse(fs.readFileSync(root+'/public/assets/enemies/'+key+'.json'));
 const b=fs.readFileSync(root+'/public/assets/enemies/'+key+'.bin');let offset=0;
 function floats(n){const a=[];for(let i=0;i<n;i++)a.push(b.readFloatLE(offset+i*4));offset+=n*4;return a;}
 const uv=floats(meta.vertices*2),indices=[];for(let i=0;i<meta.indices;i++)indices.push(b.readUInt32LE(offset+i*4));offset+=meta.indices*4;
 const frames=[];for(let i=0;i<meta.frames;i++)frames.push(geometry(null,floats(meta.vertices*3),floats(meta.vertices*3),uv,indices));
 bakedAssets[key]={frames,mesh:frames[0],tex:'enemies/'+meta.texture,duration:meta.duration};
}
const ctx={...bending,captureBend(p){bendMap=Array.from(p)},resetCommands(){commands=[]},...enemies,bakedAssets,...math,...terrain,...liquid,geometry,uniform(gl,p,k,v){current[k]=ArrayBuffer.isView(v)?Array.from(v):v},render(gl,g){commands.push({geometry:g.id,count:g.count,uniforms:{...current},state:{...state}})},document:{getElementById:element,activeElement:{tagName:'BODY'}},window:{addEventListener(){}},innerWidth:1200,innerHeight:750,devicePixelRatio:1,console,Math,Set,Float32Array,assets,fakegl};
let source=fs.readFileSync(root+'/main.js','utf8').replace(/^import .*;\n/gm,'').replace('start().catch(fail);','');
source+='\ngl=fakegl;prog={};ground=plane(60);quad=plane(1);crystalShard=crystalShardGeometry();grassMesh=grassGeometry();flowers=flowerGeometry();ambience=ambientGeometry();props=sceneryGeometry();wetPlants=wetlandDetails();treeCards=treeGeometry();outer=funnel();inner=funnel(true);winds=[windRibbon(0),windRibbon(Math.PI)];const shape=liquidSlimeGeometry();slime={mesh:mesh(shape.pos,shape.normals,shape.uv,shape.indices)};enemyAssets=bakedAssets;grassTexture="grass-original.png";treeTexture="tree-reference-b.png";pondTexture="pond-painted.png";tuftTexture="grass-painted.png";northTexture="pond-northern.png";clearingTexture="clearing-painted.png";state.time=1;renderScene();';
if(process.env.SCENE_PLAYER)source=source.replace('state.time=1;renderScene();','state.time=1;state.player='+JSON.stringify(JSON.parse(process.env.SCENE_PLAYER))+';renderScene();');
if(process.env.SCENE_ANCHOR){const a=JSON.parse(process.env.SCENE_ANCHOR);source=source.replace('let dx=state.player[0],dz=state.player[2]','let dx='+Number(a[0])+',dz='+Number(a[2]));}
if(process.env.SCENE_TIME)source=source.replace('state.time=1;', 'state.time='+Number(process.env.SCENE_TIME)+';');
if(process.env.SCENE_MOBS)source=source.replace('state.time=', 'state.mobs='+Number(process.env.SCENE_MOBS)+';state.time=');
if(process.env.SCENE_GRASS)source=source.replace('state.time=', 'state.grass='+Number(process.env.SCENE_GRASS)+';state.time=');
if(process.env.SCENE_ZOOM)source=source.replace("h=aspect<1?18:13", "h="+Number(process.env.SCENE_ZOOM));
if(process.env.SCENE_MOTION){const end=source.lastIndexOf('renderScene();');source=source.slice(0,end)+'for(let i=0;i<60;i++)updateJelly(1/60,1);for(let i=0;i<'+Number(process.env.SCENE_MOTION)+';i++)updateJelly(1/60,0);'+source.slice(end);}
if(process.env.SCENE_ROSTER){
 const end=source.lastIndexOf('renderScene();');
 source=source.slice(0,end)+"enemyWorld.reset('all');enemyWorld.update(.016,state.player,4);enemyWorld.enemies.forEach((e,i)=>{e.x=state.player[0]-3+i*2;e.z=state.player[2]-2.0;e.yaw=0;e.anim=state.time;});"+source.slice(end);
}else{
 const end=source.lastIndexOf('renderScene();');source=source.slice(0,end)+"enemyWorld.update(.016,state.player,state.mobs);"+source.slice(end);
}
if(process.env.SCENE_BAKE){const end=source.lastIndexOf('renderScene();');source=source.slice(0,end)+"vp=new Float32Array([.025,0,0,0,0,0,0,0,0,-.025,0,0,0,0,0,1]);draw(quad,22,model(0,0,0,40,1,40));"+source.slice(end+14);}
if(process.env.SCENE_TREE_HIT){const end=source.lastIndexOf('renderScene();');source=source.slice(0,end)+"state.player=[-8.65,0,-5];movePlayer(.14,0);updateTrees("+Number(process.env.SCENE_TREE_HIT)+");"+source.slice(end);}
if(process.env.SCENE_FRAMES)source+='for(let frame=1;frame<'+Number(process.env.SCENE_FRAMES)+';frame++){resetCommands();renderScene();}';
source+="captureBend(grassBend.update(enemyWorld.enemies.map(e=>({x:e.x,z:e.z,radius:ENEMY_TYPES[e.type].radius})),.016));";
if(process.env.SCENE_SHARD)source+='enemyWorld.bullets.push({x:1,z:0,vx:1,vz:1});resetCommands();renderScene();';
vm.runInNewContext(source,ctx);fs.writeFileSync('/tmp/scene-draws.json',JSON.stringify({geometries,commands,bendMap}));console.log({draws:commands.length,geometries:geometries.length});
