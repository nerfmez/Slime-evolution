import fs from 'node:fs';
import {sunfallView} from '../vfx/sunfall-settings.js';
import {createSunfallRenderer} from '../vfx/sunfall-renderer.js';
import {mul,look,ortho} from '../math.js';
const kind=process.argv[2]||'sunfall';sunfallView.solo=kind==='sunfall-bands'?'bands':kind==='sunfall-smoke'?'smoke':'all';
const programs=[],geometries=[],frames=[];let prog,vao,buffer,draws=[],state={blend:false,cull:false,depth:true};
const gl=new Proxy({
 createShader:type=>({type}),shaderSource:(s,src)=>s.src=src,compileShader(){},getShaderParameter:()=>true,
 createProgram(){const p={id:programs.length,shaders:[],u:{}};programs.push(p);return p},attachShader:(p,s)=>p.shaders.push(s),linkProgram(){},getProgramParameter:()=>true,useProgram:p=>prog=p,
 getUniformLocation:(p,k)=>({p,k}),uniform1i:(u,v)=>u.p.u[u.k]={int:v},uniform1f:(u,v)=>u.p.u[u.k]=v,
 uniform2fv:(u,v)=>u.p.u[u.k]=Array.from(v),uniform3fv:(u,v)=>u.p.u[u.k]=Array.from(v),uniform4fv:(u,v)=>u.p.u[u.k]=Array.from(v),uniformMatrix4fv:(u,t,v)=>u.p.u[u.k]=Array.from(v),
 createVertexArray(){const g={id:geometries.length,attrs:{}};geometries.push(g);return g},bindVertexArray:v=>vao=v,createBuffer:()=>({}),bindBuffer:(type,b)=>{buffer=b;if(type==='ELEMENT_ARRAY_BUFFER')vao.indices=b},bufferData:(type,a)=>buffer.data=Array.from(a),enableVertexAttribArray(){},vertexAttribPointer:(i,size)=>vao.attrs[i]={buffer,size},
 enable:k=>{if(k==='BLEND')state.blend=true;if(k==='CULL_FACE')state.cull=true},disable:k=>{if(k==='BLEND')state.blend=false;if(k==='CULL_FACE')state.cull=false},depthMask:v=>state.depth=v,cullFace(){},blendFunc(){},activeTexture(){},bindTexture(){},texParameteri(){},
 drawElements:(mode,count)=>draws.push({p:prog.id,g:vao.id,count,indexed:true,u:structuredClone(prog.u),state:{...state}}),drawArrays:(mode,start,count)=>draws.push({p:prog.id,g:vao.id,count,indexed:false,u:structuredClone(prog.u),state:{...state}})
},{get:(o,k)=>k in o?o[k]:k});
const fx=createSunfallRenderer(gl,[{},{},{}]),vp=mul(ortho(6.0,6.0),look([0,13,15],[0,1,0]));
for(let i=0;i<48;i++){const t=i*.05;draws=[];const combat={events:t<.5?[{type:'sun',x:0,z:0,age:t,delay:.5,s:{radius:1}}]:[],fx:t>=.5?[{type:'sun',x:0,z:0,r:1,age:t-.5}]:[]};fx.draw(combat,vp,[0,12,15],()=>true);frames.push({t,draws});}
fs.writeFileSync(`.dream-loop/${kind}-draws.json`,JSON.stringify({programs,geometries,frames,kind}));
