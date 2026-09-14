const $=id=>document.getElementById(id),count=16;
const large=$('large').getContext('2d'),small=$('small').getContext('2d'),all=$('all-directions').getContext('2d');
const directions={
 E:{label:'ขวา',x:1,y:0}, NE:{label:'ขวาบน',x:.707,y:-.442},
 N:{label:'ขึ้น · ห่างจากผู้เล่น',x:0,y:-.625}, NW:{label:'ซ้ายบน',x:-.707,y:-.442},
 W:{label:'ซ้าย',x:-1,y:0}, SW:{label:'ซ้ายล่าง',x:-.707,y:.442},
 S:{label:'ลง · เข้าหาผู้เล่น',x:0,y:.625}, SE:{label:'ขวาล่าง',x:.707,y:.442}
};
for(const [key,d] of Object.entries(directions))d.source=`slime-walk3d-${key.toLowerCase()}-16`;
const artworkRevision='shared-3d-gait-1';
const artworkURL=(source,extension)=>`../assets/slime/${source}.${extension}?v=${artworkRevision}`;
const assets=new Map();let frame=0,playing=true,last=0,elapsed=0,travel=0,ready=false;
const phases=['พัก','เริ่มยุบ','ยุบสะสมแรง','ยุบเต็มที่','ส่วนหน้านำ','ดึงตัวไปข้างหน้า','มวลไหลตาม','ยืดเต็มที่','มวลตามทัน','รวบมวลกลับ','ยุบรับแรง','รับน้ำหนัก','เด้งคืนตัว','คืนตัวสูงสุด','คลายแรง','กลับสู่ท่าพัก'];
function sprite(ctx,x,y,size,heading=$('direction').value){
 const d=directions[heading],asset=assets.get(d.source),pose=asset.poses[frame];
 // Fixed camera scale and projected world origin: no per-frame area normalization.
 const scale=size/256;
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 const m=pose.motion,c=Math.cos(pose.yaw),sn=Math.sin(pose.yaw);
 ctx.save();ctx.transform(c*m.width,-sn*.625*m.width,sn*m.length,c*.625*m.length,0,0);
 ctx.fillStyle='rgba(42,68,38,.17)';ctx.beginPath();ctx.arc(0,0,76,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.drawImage(asset.image,pose.x,pose.y,pose.w,pose.h,-pose.anchorX,-pose.anchorY,pose.w,pose.h);ctx.restore();
}

function draw(){
 if(!ready)return;
 large.clearRect(0,0,512,400);small.clearRect(0,0,960,300);all.clearRect(0,0,all.canvas.width,all.canvas.height);
 sprite(large,256,285,440);
 const d=directions[$('direction').value],distance=(travel%300)-150;
 sprite(small,480+d.x*distance,180+d.y*distance,110);
 // Compass arrangement: all eight directions at one shared gait phase.
 const keys=['NW','N','NE','W','E','SW','S','SE'],columns=all.canvas.width===480?2:4;
 keys.forEach((key,i)=>{const x=120+(i%columns)*240,y=110+Math.floor(i/columns)*180;sprite(all,x,y,130,key);all.fillStyle='#263d3b';all.textAlign='center';all.font=columns===2?'22px system-ui':'16px system-ui';all.fillText(directions[key].label,x,y+58);});
 $('frame').value=frame;$('status').textContent=`${d.label} · เฟรม ${frame+1} / 16 · ${phases[frame]}`;
}
function stop(){playing=false;$('play').textContent='เล่น';}
function tick(now){const dt=last?Math.min((now-last)/1000,.1):0;last=now;if(playing&&ready){const duration=Number($('duration').value),delta=dt*Number($('speed').value);elapsed+=delta;if(frame>=3&&frame<=10)travel+=delta*144/duration;const step=duration/count;while(elapsed>=step){elapsed-=step;frame=(frame+1)%count;}draw();}requestAnimationFrame(tick);}
function resizeComparison(){const compact=window.innerWidth<600;all.canvas.width=compact?480:960;all.canvas.height=compact?720:360;draw();}
window.addEventListener('resize',resizeComparison);resizeComparison();
async function load(source){const image=new Image();const decoded=new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;});image.src=artworkURL(source,'png');const response=await fetch(artworkURL(source,'json'));if(!response.ok)throw Error(source);const poses=await response.json();if(poses.length!==count)throw Error('pose count');await decoded;assets.set(source,{image,poses});}
$('play').onclick=()=>{playing=!playing;elapsed=0;$('play').textContent=playing?'หยุด':'เล่น';};$('step').onclick=()=>{stop();frame=(frame+1)%count;draw();};$('frame').oninput=()=>{stop();frame=Number($('frame').value);draw();};
$('direction').onchange=()=>{travel=0;$('sheet').src=artworkURL(directions[$('direction').value].source,'png');draw();};$('duration').onchange=()=>{elapsed=0;};document.addEventListener('visibilitychange',()=>{last=0;});
Promise.all([...new Set(Object.values(directions).map(d=>d.source))].map(load)).then(()=>{ready=true;$('error').textContent='';for(const id of ['play','step','direction','frame'])$(id).disabled=false;draw();requestAnimationFrame(tick);}).catch(()=>{$('error').textContent='โหลดภาพบางทิศไม่สำเร็จ กรุณารีโหลดหน้า';});
