// Frames are copied from the game's real WebGL renderer, not re-drawn in 2D.
export function mountProof(capture,onVisibility){
 const sheet=document.createElement('section');sheet.id='proof';sheet.setAttribute('aria-label','ตรวจภาพพายุไฟ');
 sheet.innerHTML=`<div class="proof-head"><div><small>SLIME · VFX FRAME CHECK 03</small><h1>พายุไฟ — ตรวจภาพตามเวลา</h1><p>พายุไฟรอบปรับ 03 · ก่อตัว / หมุน / สลาย</p></div><button id="proof-close">กลับไปเล่นเกม</button></div><div class="proof-tools"><label>ชั้นเอฟเฟกต์ <select id="proof-layer"><option value="all">ไฟ + ริ้วลม</option><option value="fire">เฉพาะไฟ</option><option value="wind">เฉพาะริ้วลม</option></select></label><button id="proof-motion">ดูการเคลื่อนไหว 2 วินาที</button><output id="proof-status" aria-live="polite">กำลังเรนเดอร์…</output></div><div id="proof-grid"></div><div id="proof-replay" hidden><canvas width="480" height="320"></canvas><p>เล่นภาพที่เรนเดอร์ไว้ 48 เฟรม · 24 เฟรม/วินาที · ไม่ใช่การวัด FPS ของเกม</p></div>`;
 document.body.append(sheet);
 const launch=document.createElement('button');launch.id='proof-open';launch.textContent='ตรวจภาพเอฟเฟกต์';document.querySelector('.right').append(launch);
 const grid=sheet.querySelector('#proof-grid'),status=sheet.querySelector('#proof-status'),layer=sheet.querySelector('#proof-layer'),replay=sheet.querySelector('#proof-replay');
 const samples=[.1,.25,.5,.8,1,1+1/30,1+2/30,1.1,4.8,5.1,5.4,5.59];
 let motion=[],raf=0,closed=false,busy=false,generation=0;
 function stop(){cancelAnimationFrame(raf);motion=[];replay.hidden=true;generation++}
 function build(){stop();grid.hidden=false;grid.replaceChildren();samples.forEach((age,i)=>{
  const figure=document.createElement('figure'),frame=capture(age,layer.value),caption=document.createElement('figcaption');
  caption.textContent=`${i<4?'ก่อตัว':i<8?'เฟรมติดกัน 30 fps':'สลาย'} · ${age.toFixed(3)} s`;
  figure.append(frame,caption);grid.append(figure);
 });status.textContent='12 ภาพจริง · พร้อมตรวจ';sheet.dataset.ready='true'}
 function show(){closed=false;sheet.hidden=false;document.body.classList.add('proof-visible');onVisibility(true);build()}
 function hide(){closed=true;stop();sheet.hidden=true;document.body.classList.remove('proof-visible');onVisibility(false)}
 sheet.querySelector('#proof-close').onclick=hide;launch.onclick=show;layer.onchange=build;
 sheet.querySelector('#proof-motion').onclick=async()=>{
  if(busy)return;stop();const run=generation;busy=true;status.textContent='กำลังเก็บภาพจาก WebGL…';
  try{for(let i=0;i<48;i++){
   if(closed||run!==generation)return;
   motion.push(capture(1+i/24,layer.value));
   if(i%4===3){status.textContent=`เก็บภาพ ${i+1}/48`;await new Promise(resolve=>requestAnimationFrame(resolve))}
  }
  if(closed||run!==generation)return;
  grid.hidden=true;replay.hidden=false;status.textContent='ช่วง 1.000–2.958 s · เล่นวน';
  const ctx=replay.querySelector('canvas').getContext('2d'),begin=performance.now();
  function tick(now){ctx.drawImage(motion[Math.floor((now-begin)/1000*24)%motion.length],0,0);raf=requestAnimationFrame(tick)}
  raf=requestAnimationFrame(tick);
  }catch(e){status.textContent='เก็บภาพไม่สำเร็จ: '+e.message}finally{busy=false}
 };
 if(new URLSearchParams(location.search).has('vfx'))show();else hide();
}
