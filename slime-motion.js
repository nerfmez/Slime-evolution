import {slimeWalkGeometry,neutralRegions} from './slime-walk.js';
import {sampleKeys,putKey,readClip,clone,restoreBase,baseDefaults} from './slime-keyframes.js';
const $=id=>document.getElementById(id),canvas=$('stage'),ctx=canvas.getContext('2d');
let regions=neutralRegions();
const defaults={...baseDefaults};let settings={...defaults};
let keys=[0,1].map(t=>({t,regions:neutralRegions()})),smooth=true,clipboard=null,draft=null;
const readStored=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
const originalBase=readStored('slime.motion3d.v1'),savedBase=readStored('slime.motion3d.base.v1');let loadedClip=null,loadedData=null;
try{loadedData=readStored('slime.motion3d.keys.v2')||readStored('slime.motion3d.keys.v1');if(loadedData){loadedClip=readClip(loadedData);keys=loadedClip.keys;smooth=loadedClip.smooth;}}catch{}
settings=restoreBase(originalBase,savedBase,loadedClip);
// Keep unsaved shape drafts by timestamp. They never enter the animation until explicitly keyed.
const drafts=new Map();const draftTime=()=>Math.round(phase*1000)/1000;
try{for(const [t,d] of readStored('slime.motion3d.drafts.v1')||[]){if(!Number.isFinite(t)||t<0||t>1)continue;const checked=readClip({format:'slime-motion-keyframes',version:1,duration:.96,keys:[0,1].map(time=>({t:time,regions:d.regions}))});drafts.set(t,{regions:checked.keys[0].regions});}}catch{}
function persistDrafts(){try{localStorage.setItem('slime.motion3d.drafts.v1',JSON.stringify([...drafts]));}catch{}}
const specs=[['duration','เวลาต่อรอบ',.4,2,.02],['squash','แรงยุบและเด้งคืน',0,2,.05],['stretch','การยืดไปข้างหน้า',0,3,.05],['lean','การเอนและมวลตาม',0,3,.05],['flow','เนื้อไหลนำด้านหน้า',0,3,.05],['lag','หน่วงมวลด้านหลัง',0,2,.05]];
for(const [key,name,min,max,step] of specs){settings[key]=Math.max(min,Math.min(max,settings[key]));const label=document.createElement('label');label.innerHTML=`${name}<output id="value-${key}"></output><input aria-label="${name}" type="range" min="${min}" max="${max}" step="${step}" value="${settings[key]}">`;label.querySelector('input').oninput=e=>{settings[key]=Number(e.target.value);persistBase();sync();dirty=true;};$('controls').append(label);}
function sync(){for(const [k] of specs)$('value-'+k).textContent=settings[k].toFixed(2)+(k==='duration'?' วินาที':' ×');}sync();
let phase=0,playing=false,yaw=.7,tilt=39*Math.PI/180,wire=false,dirty=true,last=0;
const project=([x,y,z])=>{const a=x*Math.cos(yaw)+z*Math.sin(yaw),b=-x*Math.sin(yaw)+z*Math.cos(yaw);return [a,b*Math.sin(tilt)-y*Math.cos(tilt),b*Math.cos(tilt)+y*Math.sin(tilt)];};
function draw(){
 const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,1.5);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const scale=Math.min(w*.40,h*.57),cx=w/2,cy=h*.65;
 const screen=p=>{const q=project(p);return [cx+q[0]*scale,cy+q[1]*scale,q[2]];};
 ctx.strokeStyle='rgba(60,85,50,.14)';ctx.lineWidth=1;
 for(let i=-4;i<=4;i++){for(const axis of [0,1]){const a=screen(axis?[i*.3,0,-1.2]:[-1.2,0,i*.3]),b=screen(axis?[i*.3,0,1.2]:[1.2,0,i*.3]);ctx.beginPath();ctx.moveTo(...a.slice(0,2));ctx.lineTo(...b.slice(0,2));ctx.stroke();}}
 const shape=!playing&&draft?draft:sampleKeys(keys,phase,smooth);
 const g=slimeWalkGeometry($('base-motion').checked?phase:0,56,36,{...settings,regions:shape.regions}),verts=[],norm=[];
 for(let i=0;i<g.pos.length;i+=3){verts.push(screen(g.pos.slice(i,i+3)));norm.push(g.normals.slice(i,i+3));}
 // One compound footprint, so overlapping triangles do not darken the shadow.
 ctx.fillStyle='rgba(43,64,36,.17)';ctx.beginPath();
 for(let i=0;i<g.indices.length;i+=3){const q=g.indices.slice(i,i+3).map(k=>screen([g.pos[k*3],0,g.pos[k*3+2]]));const area=(q[1][0]-q[0][0])*(q[2][1]-q[0][1])-(q[1][1]-q[0][1])*(q[2][0]-q[0][0]);if(area<0)q.reverse();q.forEach((p,j)=>j?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();}ctx.fill();
 const faces=[];for(let i=0;i<g.indices.length;i+=3){const ids=g.indices.slice(i,i+3),v=ids.map(k=>verts[k]);const cross=(v[1][0]-v[0][0])*(v[2][1]-v[0][1])-(v[1][1]-v[0][1])*(v[2][0]-v[0][0]);if(cross>=0)continue;faces.push({ids,v,z:v.reduce((s,p)=>s+p[2],0)/3});}faces.sort((a,b)=>a.z-b.z);
 for(const f of faces){const n=[0,1,2].map(k=>f.ids.reduce((s,i)=>s+norm[i][k],0)/3),lit=Math.max(0,Math.min(1,n[0]*.45+n[1]*.8+n[2]*.4)),height=f.ids.reduce((s,i)=>s+g.pos[i*3+1],0)/3;const band=lit>.65?1:lit>.2?.85:.68;const c=[65+height*62,153+height*65,190+height*37].map(v=>Math.round(v*band));ctx.fillStyle=`rgb(${c})`;ctx.strokeStyle=wire?'rgba(17,56,65,.4)':ctx.fillStyle;ctx.lineWidth=wire?.65:.6;ctx.beginPath();f.v.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();ctx.stroke();}
 // Outline follows the actual union of projected triangles, including concave waists.
 // Draw behind the opaque body so only the external contour remains visible.
 ctx.save();ctx.globalCompositeOperation='destination-over';ctx.strokeStyle='#173e48';ctx.lineWidth=3.2;ctx.lineJoin='round';
 for(const f of faces){ctx.beginPath();f.v.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.stroke();}ctx.restore();
 // Ground direction marker keeps forward readable even for a faceless character.
 const a=screen([0,.002,.65]),b=screen([0,.002,1]);ctx.strokeStyle='#9e6035';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();ctx.fillStyle='#754c31';ctx.font='13px system-ui';ctx.textAlign='center';ctx.fillText('ด้านหน้า',b[0],b[1]+16);
 $('phase').value=Math.round(phase*1000);const label=phase<.2?'ยุบสะสมแรง':phase<.44?'ส่วนหน้านำ':phase<.6?'มวลไหลตาม':phase<.72?'ยุบรับแรง':phase<.9?'เด้งคืนตัว':'คืนทรง';$('status').textContent=`${Number((phase*100).toFixed(1))}% · ${!playing&&draft?'ตัวอย่าง · ยังไม่บันทึกคีย์':keys.some(k=>Math.abs(k.t-phase)<.0005)?'คีย์เฟรม':'ระหว่างคีย์เฟรม'}`;
}
function tick(now){requestAnimationFrame(tick);if(now-last<33&&!dirty)return;const dt=last?Math.min((now-last)/1000,.1):0;last=now;if(playing)phase=(phase+dt/settings.duration)%1;if(playing||dirty){draw();dirty=false;}}requestAnimationFrame(tick);
function pause(){playing=false;$('play').textContent='เล่น';}
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'หยุด':'เล่น';if(playing&&phase>=1)phase=0;if(!playing)refreshShape();last=0;};$('phase').oninput=e=>{pause();phase=Number(e.target.value)/1000;refreshShape();dirty=true;};$('step').onclick=()=>{pause();phase=Math.min(1,phase+1/32);refreshShape();dirty=true;};$('view').onchange=e=>{tilt=Number(e.target.value)*Math.PI/180;dirty=true;};$('wire').onclick=()=>{wire=!wire;$('wire').textContent=wire?'ซ่อนโครงโมเดล':'ดูโครงโมเดล';dirty=true;};
let pointer=null;canvas.onpointerdown=e=>{pointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(!pointer)return;yaw+=(e.clientX-pointer.x)*.012;tilt=Math.max(.08,Math.min(1.4,tilt+(e.clientY-pointer.y)*.006));pointer={x:e.clientX,y:e.clientY};dirty=true;};canvas.onpointerup=canvas.onpointercancel=()=>pointer=null;
function persistBase(){try{localStorage.setItem('slime.motion3d.base.v1',JSON.stringify({...settings,enabled:$('base-motion').checked}));}catch{}}
const serialize=()=>({format:'slime-motion-keyframes',version:2,duration:settings.duration,baseSettings:{...settings},smooth,baseMotion:$('base-motion').checked,keys});
$('save').onclick=()=>{try{persistBase();localStorage.setItem('slime.motion3d.keys.v2',JSON.stringify(serialize()));$('notice').textContent='เซฟค่าพื้นฐานและคีย์ที่บันทึกแล้ว'+(drafts.size?' · ยังมีรูปทรงตัวอย่างที่ไม่ได้กดบันทึกคีย์':'');}catch{$('notice').textContent='บันทึกไม่ได้';}};
$('reset').onclick=()=>{settings={...defaults};persistBase();refreshShape();dirty=true;$('notice').textContent='คืนเฉพาะค่าการเดินพื้นฐาน · คีย์เฟรมยังอยู่';};
$('restore-base').onclick=()=>{if(!originalBase){$('notice').textContent='ไม่พบเซฟการเดินรุ่นเดิมในเบราว์เซอร์นี้';return;}settings=restoreBase(originalBase,null,null);$('base-motion').checked=true;persistBase();refreshShape();dirty=true;$('notice').textContent='คืนค่าการเดินจากเซฟเดิมแล้ว · คีย์เฟรมยังอยู่';};
window.onresize=()=>dirty=true;

const regionSpecs=[['sx','กว้าง X',.15,2.5,.05],['sy','สูง Y',.15,2.5,.05],['sz','ยาว Z',.15,2.5,.05],['x','เลื่อน X',-.65,.65,.01],['y','เลื่อน Y',-.65,.65,.01],['z','เลื่อน Z',-.65,.65,.01]];
function mountRegions(){
 $('regions').replaceChildren();
 for(const [i,name] of ['ส่วนหลัง','ส่วนกลาง','ส่วนหน้า'].entries()){
  const box=document.createElement('details');box.open=i===1;const summary=document.createElement('summary');summary.textContent=name;box.append(summary);const grid=document.createElement('div');grid.className='controls';box.append(grid);
  for(const [key,title,min,max,step] of regionSpecs){const label=document.createElement('label'),value=document.createElement('output'),input=document.createElement('input');label.append(title,value,input);input.type='range';input.min=min;input.max=max;input.step=step;input.value=regions[i][key];input.setAttribute('aria-label',name+' '+title);value.textContent=regions[i][key].toFixed(2);input.oninput=()=>{beginEdit();regions[i][key]=Number(input.value);value.textContent=regions[i][key].toFixed(2);updateDraft();dirty=true;};grid.append(label);}
  $('regions').append(box);
 }
}
mountRegions();
function refreshShape(){draft=playing?null:(drafts.get(draftTime())||null);regions=clone((draft||sampleKeys(keys,phase,smooth)).regions);sync();for(const [i,[k]] of specs.entries())$('controls').children[i].querySelector('input').value=settings[k];for(const [i,box] of [...$('regions').children].entries())for(const [j,[k]] of regionSpecs.entries()){const label=box.querySelectorAll('label')[j];label.querySelector('input').value=regions[i][k];label.querySelector('output').textContent=regions[i][k].toFixed(2);}renderKeys();}
function beginEdit(){if(playing){pause();phase=draftTime();draft=drafts.get(draftTime())||null;regions=clone((draft||sampleKeys(keys,phase,smooth)).regions);}phase=draftTime();}
function updateDraft(){draft={regions:clone(regions)};drafts.set(draftTime(),draft);persistDrafts();renderKeys();}
function commitShape(){beginEdit();keys=putKey(keys,phase,draft||{regions});drafts.delete(draftTime());persistDrafts();draft=null;refreshShape();dirty=true;}
function renderKeys(){
 $('draft-list').replaceChildren();for(const t of [...drafts.keys()].sort((a,b)=>a-b)){const b=document.createElement('button');b.textContent=`ตัวอย่าง ${Number((t*100).toFixed(1))}%`;b.style.background='#f5e5ba';b.onclick=()=>{pause();phase=t;refreshShape();dirty=true;};$('draft-list').append(b);}
 $('key-list').replaceChildren();for(const k of keys){const button=document.createElement('button');button.textContent=Number((k.t*100).toFixed(1))+'%';button.setAttribute('aria-label','คีย์เฟรม '+Number((k.t*100).toFixed(1))+' เปอร์เซ็นต์');button.setAttribute('aria-pressed',String(Math.abs(k.t-phase)<.0005));button.onclick=()=>{pause();phase=k.t;refreshShape();dirty=true;};$('key-list').append(button);}
 $('delete-key').disabled=phase===0||phase===1||!keys.some(k=>Math.abs(k.t-phase)<.0005);$('paste-key').disabled=!clipboard;$('discard-draft').disabled=!draft;$('draft-status').textContent=drafts.size?`มีรูปทรงตัวอย่างยังไม่บันทึก ${drafts.size} จังหวะ · กดบันทึกคีย์เพื่อใช้ในแอนิเมชัน`: 'ปรับแล้วกดบันทึกคีย์ · ค่าการเดินพื้นฐานไม่ใช้คีย์เฟรม';
}
$('add-key').onclick=()=>{beginEdit();commitShape();};
$('discard-draft').onclick=()=>{drafts.delete(draftTime());persistDrafts();draft=null;refreshShape();dirty=true;};
$('delete-key').onclick=()=>{if(phase===0||phase===1)return;keys=keys.filter(k=>Math.abs(k.t-phase)>.0005);drafts.delete(draftTime());persistDrafts();refreshShape();dirty=true;};
$('copy-key').onclick=()=>{beginEdit();clipboard=clone(draft||sampleKeys(keys,phase,smooth));refreshShape();$('notice').textContent='คัดลอกรูปร่างแล้ว · เลื่อนไปจังหวะใหม่แล้วกดวาง';};
$('paste-key').onclick=()=>{if(!clipboard)return;beginEdit();regions=clone(clipboard.regions);updateDraft();refreshShape();dirty=true;};
$('curve').value=smooth?'smooth':'linear';$('curve').onchange=e=>{smooth=e.target.value==='smooth';refreshShape();dirty=true;};function showBaseControls(){for(const label of $('controls').children)label.style.display='grid';} $('base-motion').onchange=()=>{persistBase();showBaseControls();dirty=true;};
$('neutral-shape').onclick=()=>{beginEdit();regions=neutralRegions();updateDraft();refreshShape();dirty=true;};
$('hourglass').onclick=()=>{beginEdit();regions=neutralRegions();regions[1].sx=.15;regions[1].sy=.5;regions[0].sx=regions[2].sx=1.3;regions[0].z=-.14;regions[2].z=.14;updateDraft();tilt=75*Math.PI/180;yaw=0;$('view').value='75';refreshShape();dirty=true;};
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(serialize(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='slime-animation.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text()),clip=readClip(data);pause();keys=clip.keys;drafts.clear();persistDrafts();draft=null;settings=clip.baseSettings?restoreBase(null,null,clip):{...settings,duration:clip.duration};smooth=clip.smooth;$('curve').value=smooth?'smooth':'linear';$('base-motion').checked=data.baseMotion===true;showBaseControls();phase=0;refreshShape();dirty=true;$('notice').textContent='โหลดแอนิเมชันแล้ว';}catch{$('notice').textContent='ไฟล์แอนิเมชันไม่ถูกต้อง';}e.target.value='';};
$('base-motion').checked=savedBase?.enabled??(loadedData?.version===2?loadedData.baseMotion!==false:true);
$('play').textContent='เล่น';showBaseControls();refreshShape();
