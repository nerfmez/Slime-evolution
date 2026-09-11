// Records the actual Inferno renderer for deterministic offscreen visual review.
import fs from 'node:fs';
import {createInfernoRenderer} from '../vfx/inferno-renderer.js';
import {infernoView} from '../vfx/inferno-settings.js';
import {mul,look,ortho} from '../math.js';
const programs=[],geometries=[],frames=[];let prog,vao,buffer,draws=[],state={blend:false,cull:false,depth:true};
const gl=new Proxy({
 createShader:type=>({type}),shaderSource:(s,src)=>s.src=src,compileShader(){},getShaderParameter:()=>true,
 createProgram(){const p={id:programs.length,shaders:[],u:{}};programs.push(p);return p},attachShader:(p,s)=>p.shaders.push(s),linkProgram(){},getProgramParameter:()=>true,useProgram:p=>prog=p,
 getUniformLocation:(p,k)=>({p,k}),uniform1i:(u,v)=>u.p.u[u.k]={int:v},uniform1f:(u,v)=>u.p.u[u.k]=v,
 uniform2fv:(u,v)=>u.p.u[u.k]=Array.from(v),uniform3fv:(u,v)=>u.p.u[u.k]=Array.from(v),uniform4fv:(u,v)=>u.p.u[u.k]=Array.from(v),uniformMatrix4fv:(u,t,v)=>u.p.u[u.k]=Array.from(v),
 createVertexArray(){const g={id:geometries.length,attrs:{}};geometries.push(g);return g},bindVertexArray:v=>vao=v,createBuffer:()=>({}),bindBuffer:(type,b)=>{buffer=b;if(type==='ELEMENT_ARRAY_BUFFER')vao.indices=b},bufferData:(type,a)=>buffer.data=Array.from(a),enableVertexAttribArray(){},vertexAttribPointer:(i,size)=>vao.attrs[i]={buffer,size},
 enable:k=>{if(k==='BLEND')state.blend=true;if(k==='CULL_FACE')state.cull=true},disable:k=>{if(k==='BLEND')state.blend=false;if(k==='CULL_FACE')state.cull=false},depthMask:v=>state.depth=v,cullFace(){},blendFunc(){},
 drawElements:(mode,count)=>draws.push({p:prog.id,g:vao.id,count,indexed:true,u:structuredClone(prog.u),state:{...state}}),drawArrays:(mode,start,count)=>draws.push({p:prog.id,g:vao.id,count,indexed:false,u:structuredClone(prog.u),state:{...state}})
},{get:(o,k)=>k in o?o[k]:k});
const fire=createInfernoRenderer(gl),vp=mul(ortho(6.3,6.3),look([0,12.75,14],[0,.75,-1]));
const kind=process.argv.includes('--scatter')?'scatter':process.argv.includes('--ground')?'ground':'inferno';
const times=process.argv.includes('--poses')?(kind==='ground'?[.02,.20,.60,1.4,2.4,2.92]:[.02,.10,.20,.34,.65,1.0]):Array.from({length:kind==='ground'?161:113},(_,i)=>i/50);
if(process.argv.includes('--solo'))infernoView.solo=kind==='ground'?'ground':'sparks';
for(const t of times){draws=[];const combat={projectiles:[],patches:[],fx:[{type:'blast',x:0,z:0,r:1.3,age:t}]};
 if(kind==='scatter'&&t<1.1)for(let i=0;i<10;i++){let a=i*Math.PI*2/10,vx=Math.cos(a)*5.8,vz=Math.sin(a)*5.8;combat.projectiles.push({x:vx*t,z:vz*t,vx,vz,ember:true,life:1.1-t});}
 if(kind==='ground'&&t<2.96)combat.patches=[{x:0,z:0,r:1.02,age:t,life:2.96-t}];
 fire.draw(combat,vp,t,[0,12,15],()=>true,{add(){}},true);frames.push({t,draws});}
fs.writeFileSync('.dream-loop/inferno-draws.json',JSON.stringify({programs,geometries,frames,kind}));
