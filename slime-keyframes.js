import {neutralRegions} from './slime-walk.js';
export const axes=['sx','sy','sz','x','y','z'];
export const motionKeys=['squash','stretch','lean','flow','lag'];
export const baseDefaults={duration:.96,squash:1,stretch:1,lean:1,flow:1,lag:1};
export const clone=value=>JSON.parse(JSON.stringify(value));
export function restoreBase(legacy,independent,clip){
 const out={...baseDefaults};
 // Old keyed motion is only a fallback. The user's original walking preset wins.
 for(const source of [clip?.legacyMotion,legacy,clip?.baseSettings,independent])for(const k in out){
  const value=source?.[k],lo=k==='duration'?.4:0,hi=k==='duration'||k==='squash'||k==='lag'?2:3;
  if(Number.isFinite(value))out[k]=Math.max(lo,Math.min(hi,value));
 }
 return out;
}
export function sampleKeys(keys,time,smooth=true){
 const t=Math.max(0,Math.min(1,time));let a=keys[0],b=keys.at(-1);
 for(const k of keys){if(k.t<=t)a=k;if(k.t>=t){b=k;break;}}
 let u=b.t===a.t?0:(t-a.t)/(b.t-a.t);if(smooth)u=u*u*(3-2*u);
 return {regions:neutralRegions().map((r,i)=>{for(const k of axes)r[k]=a.regions[i][k]+(b.regions[i][k]-a.regions[i][k])*u;return r;})};
}
export function putKey(keys,time,shape){
 const t=Math.round(Math.max(0,Math.min(1,time))*1000)/1000;
 const result=keys.filter(k=>Math.abs(k.t-t)>.0001);result.push({t,regions:clone(shape.regions)});return result.sort((a,b)=>a.t-b.t);
}
export function readClip(data){
 if(data?.format!=='slime-motion-keyframes'||![1,2].includes(data.version)||!Array.isArray(data.keys)||data.keys.length<2||data.keys.length>1002)throw Error('Invalid animation');
 const keys=data.keys.map(k=>{
  if(!Number.isFinite(k.t)||k.t<0||k.t>1||!Array.isArray(k.regions)||k.regions.length!==3)throw Error('Invalid keyframe');
  for(const r of k.regions)for(const a of axes){const lo=a.startsWith('s')?.15:-.65,hi=a.startsWith('s')?2.5:.65;if(!Number.isFinite(r[a])||r[a]<lo||r[a]>hi)throw Error('Invalid shape');}
  return {t:Math.round(k.t*1000)/1000,regions:k.regions.map((r,i)=>({...r,anchor:neutralRegions()[i].anchor}))};
 }).sort((a,b)=>a.t-b.t);
 if(keys[0].t!==0||keys.at(-1).t!==1||new Set(keys.map(k=>k.t)).size!==keys.length||!Number.isFinite(data.duration)||data.duration<.4||data.duration>2)throw Error('Invalid timeline');
 if(data.version===2)for(const k in baseDefaults){const value=data.baseSettings?.[k];if(!Number.isFinite(value)||value<(k==='duration'?.4:0)||value>(k==='duration'||k==='squash'||k==='lag'?2:3))throw Error('Invalid base settings');}
 return {keys,duration:data.duration,smooth:data.smooth!==false,baseSettings:data.version===2?clone(data.baseSettings):null,legacyMotion:data.version===1?{...data.keys[0]?.motion,duration:data.duration}:null};
}
