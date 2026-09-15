// Detailed live controls + realtime preview for the directional slime renderer.
(()=>{
function mount(){
  const A=globalThis.__slimeDirectionalV2,h=document.getElementById('settings-tools');
  if(!A||!h||document.getElementById('slime-motion-tuner'))return;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  const r=document.createElement('details');
  r.id='slime-motion-tuner';
  r.innerHTML=`
    <summary>ปรับยืด–หดสไลม์ 8 ทิศ</summary>
    <p class="settings-note">ปรับภาพการเคลื่อนที่เท่านั้น ไม่เปลี่ยนความเร็ว ดาเมจ หรือ collision</p>
    <div id="sm-preview" style="border:1px solid #c9c5ab;border-radius:14px;padding:10px;margin:8px 0 12px;background:#eef0d9;overflow:hidden">
      <canvas id="sm-preview-canvas" width="720" height="420" style="display:block;width:100%;height:auto;max-height:280px;border-radius:10px;background:#eef0d9"></canvas>
      <div id="sm-dir-buttons" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:8px"></div>
      <div class="settings-actions" style="margin-top:8px"><button type="button" data-p="play">หยุดตัวอย่าง</button><button type="button" data-p="ghost">ซ่อนต้นฉบับ</button></div>
      <label style="display:grid;grid-template-columns:1fr auto;gap:4px;margin:8px 0 0">ตำแหน่งในรอบ <output id="sm-preview-phase">กำลังเล่น</output><input id="sm-preview-scrub" type="range" min="0" max="1" step="0.01" value="0" disabled></label>
      <div id="sm-preview-readout" class="settings-note" style="margin-top:5px"></div>
    </div>
    <div id="smst" class="settings-note"></div>
    <div id="smc"></div>
    <div class="settings-actions"><button type="button" data-x="s">บันทึก</button><button type="button" data-x="r">คืนค่า</button><button type="button" data-x="c">คัดลอกค่า</button></div>
    <textarea id="smj" rows="5" style="width:100%;margin-top:8px" aria-label="ค่าการยืดหดสไลม์"></textarea>`;
  const hd=h.querySelector('h3');hd?hd.after(r):h.prepend(r);

  const c=r.querySelector('#smc'),st=r.querySelector('#smst'),j=r.querySelector('#smj'),M=new Map,n=A.names;
  const canvas=r.querySelector('#sm-preview-canvas'),ctx=canvas.getContext('2d'),dirBox=r.querySelector('#sm-dir-buttons'),scrub=r.querySelector('#sm-preview-scrub'),phaseOut=r.querySelector('#sm-preview-phase'),previewRead=r.querySelector('#sm-preview-readout');
  const cells=[[1,2],[2,2],[2,1],[2,0],[1,0],[0,0],[0,1],[0,2]],ordered=[4,3,2,1,0,7,6,5];
  let selected=(A.runtime?.moving?A.runtime.dir:2),playing=true,ghost=true,pausedPhase=0,lastNow=performance.now(),raf=0;

  function styleRange(i){
    i.style.cssText='grid-column:1/-1;width:100%;min-width:0;height:48px;min-height:48px;margin:0;padding:0;touch-action:none;accent-color:#708866;cursor:pointer;';
  }
  function snapRange(i,value){
    const lo=Number(i.min),hi=Number(i.max),step=Number(i.step)||1;
    let v=clamp(value,lo,hi);v=Math.round((v-lo)/step)*step+lo;
    const digits=(String(step).split('.')[1]||'').length;
    i.value=Number(v.toFixed(digits));
    i.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function robustRange(i){
    styleRange(i);
    let active=false,pid=null;
    const fromPointer=e=>{const b=i.getBoundingClientRect();if(!b.width)return;const p=clamp((e.clientX-b.left)/b.width,0,1);snapRange(i,Number(i.min)+(Number(i.max)-Number(i.min))*p)};
    i.addEventListener('pointerdown',e=>{if(i.disabled)return;active=true;pid=e.pointerId;try{i.setPointerCapture(pid)}catch{}fromPointer(e);e.preventDefault()});
    i.addEventListener('pointermove',e=>{if(!active||e.pointerId!==pid)return;fromPointer(e);e.preventDefault()});
    const end=e=>{if(e.pointerId!==pid)return;active=false;try{i.releasePointerCapture(pid)}catch{}pid=null};
    i.addEventListener('pointerup',end);i.addEventListener('pointercancel',end);i.addEventListener('lostpointercapture',()=>{active=false;pid=null});
  }

  robustRange(scrub);
  function dirLabel(i){return n[i]||['S','SE','E','NE','N','NW','W','SW'][i]}
  function markDir(){for(const b of dirBox.querySelectorAll('button')){const on=Number(b.dataset.dir)===selected;b.style.background=on?'#dce5c8':'#f6f0de';b.style.borderColor=on?'#758b68':'#9ba98f';b.setAttribute('aria-pressed',String(on))}}
  for(const i of ordered){const b=document.createElement('button');b.type='button';b.dataset.dir=i;b.textContent=dirLabel(i);b.style.cssText='min-height:42px;padding:5px 4px';b.onclick=()=>{selected=i;markDir();drawPreview(performance.now())};dirBox.append(b)}markDir();

  function fitVisible(img,row,col){
    const cw=img.naturalWidth/3,ch=img.naturalHeight/3,bb=A.runtime?.b?.[row]?.[col]||[0,0,1,1];
    const sx=(col+bb[0])*cw,sy=(row+bb[1])*ch,sw=Math.max(1,(bb[2]-bb[0])*cw),sh=Math.max(1,(bb[3]-bb[1])*ch),ratio=sw/sh,baseH=Math.min(235,172*(A.tune.scale||1));
    return{sx,sy,sw,sh,baseW:baseH*ratio,baseH};
  }
  function drawArrow(x,y,ang,len){ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.strokeStyle='#50624e';ctx.fillStyle='#50624e';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-len*.5,0);ctx.lineTo(len*.5,0);ctx.stroke();ctx.beginPath();ctx.moveTo(len*.5,0);ctx.lineTo(len*.5-14,-9);ctx.lineTo(len*.5-14,9);ctx.closePath();ctx.fill();ctx.restore()}
  function drawPreview(now){
    const W=canvas.width,H=canvas.height,T=A.tune,img=A.runtime?.img;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);
    const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#f5f1df');grad.addColorStop(1,'#dfe8c8');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(86,110,74,.16)';for(let x=22;x<W;x+=48)for(let y=32;y<H;y+=48){ctx.beginPath();ctx.ellipse(x+(y%96?8:0),y,7,3,-.5,0,Math.PI*2);ctx.fill()}
    ctx.fillStyle='#3e5545';ctx.font='600 22px system-ui';ctx.textAlign='left';ctx.fillText('ตัวอย่างเรียลไทม์ · '+dirLabel(selected),22,34);
    if(!img||!img.complete||!img.naturalWidth){ctx.font='18px system-ui';ctx.fillText('กำลังโหลดภาพสไลม์…',22,70);return}
    const [col,row]=cells[selected],q=fitVisible(img,row,col),cy=226,cx=W/2,Tcycle=Math.max(.05,T.cycle||.96),base=playing?now/1000/Tcycle:pausedPhase;
    const phase=base*Math.PI*2+(T.phase||0)*Math.PI/180,g=(T.g?.[selected]??1),wave=T.on?Math.sin(phase)*g:0,along=T.on?1+(T.stretch||0)*wave:1,cross=T.on?1-(T.squash||0)*wave:1;
    const ang=Math.PI/2-selected*Math.PI/4+(T.axis||0)*Math.PI/180,lead=T.on?(along-1)*(q.baseH/2)*(T.lead||0):0,ldx=Math.cos(ang)*lead,ldy=Math.sin(ang)*lead;
    ctx.save();ctx.translate(cx,cy+22);ctx.scale(1,.34);ctx.fillStyle='rgba(48,69,55,.17)';ctx.beginPath();ctx.ellipse(0,0,q.baseW*.42,q.baseH*.18,0,0,Math.PI*2);ctx.fill();ctx.restore();
    if(ghost){ctx.save();ctx.globalAlpha=.22;ctx.drawImage(img,q.sx,q.sy,q.sw,q.sh,cx-q.baseW/2,cy-q.baseH/2,q.baseW,q.baseH);ctx.restore()}
    ctx.save();ctx.translate(cx+ldx,cy+ldy);ctx.rotate(ang);ctx.scale(along,cross);ctx.rotate(-ang);ctx.drawImage(img,q.sx,q.sy,q.sw,q.sh,-q.baseW/2,-q.baseH/2,q.baseW,q.baseH);ctx.restore();drawArrow(cx,382,ang,92);
    previewRead.textContent=`${dirLabel(selected)} · wave ${wave.toFixed(2)} · ยาว ${(along*100).toFixed(1)}% · กว้าง ${(cross*100).toFixed(1)}% · เลื่อนมวล ${lead.toFixed(1)} px`;
    if(playing){phaseOut.textContent='กำลังเล่น';scrub.value=((base%1)+1)%1}else{phaseOut.textContent=Math.round(pausedPhase*100)+'%';scrub.value=pausedPhase}
  }
  function loop(now){lastNow=now;if(r.open)drawPreview(now);raf=requestAnimationFrame(loop)}raf=requestAnimationFrame(loop);
  r.querySelector('[data-p=play]').onclick=e=>{playing=!playing;if(!playing)pausedPhase=((lastNow/1000/Math.max(.05,A.tune.cycle||.96))%1+1)%1;e.currentTarget.textContent=playing?'หยุดตัวอย่าง':'เล่นตัวอย่าง';scrub.disabled=playing;drawPreview(performance.now())};
  r.querySelector('[data-p=ghost]').onclick=e=>{ghost=!ghost;e.currentTarget.textContent=ghost?'ซ่อนต้นฉบับ':'ซ้อนต้นฉบับ';drawPreview(performance.now())};
  scrub.oninput=()=>{pausedPhase=Number(scrub.value);drawPreview(performance.now())};

  const defs=[['on','เปิดยืด–หด','b'],['cycle','รอบยืด–หด (วินาที)','r',.25,2,.01],['stretch','ยืดตามทิศ','r',0,.28,.002],['squash','หดด้านข้าง','r',0,.18,.002],['lead','เลื่อนมวลไปข้างหน้า','r',0,.75,.01],['phase','เฟสเริ่ม (องศา)','r',-180,180,1],['axis','ชดเชยแกนยืด (องศา)','r',-45,45,1],['scale','ขนาดตัว','r',.65,1.45,.01],['idle','หายใจตอนหยุด','r',0,.04,.001],['idleSpeed','ความเร็วหายใจ','r',.25,6,.05],['threshold','เกณฑ์เริ่มเดิน','r',.001,.08,.001]];
  function add(d,to=c){
    const[k,name,t,a,b,s]=d,l=document.createElement('div');l.style.cssText='display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 8px;margin:10px 0 14px;padding-bottom:10px;border-bottom:1px solid #d8d2b7';
    const title=document.createElement('span');title.textContent=name;l.append(title);
    if(t==='b'){const i=document.createElement('input');i.type='checkbox';i.style.cssText='width:24px;height:24px';i.checked=!!A.tune[k];i.onchange=()=>{A.tune[k]=i.checked;show();drawPreview(performance.now())};l.append(i);M.set(k,i)}
    else{
      const o=document.createElement('output');o.style.cssText='font-variant-numeric:tabular-nums;font-weight:650';
      const row=document.createElement('div');row.style.cssText='grid-column:1/-1;display:grid;grid-template-columns:46px minmax(0,1fr) 46px;align-items:center;gap:8px';
      const minus=document.createElement('button'),plus=document.createElement('button'),i=document.createElement('input');minus.type=plus.type='button';minus.textContent='−';plus.textContent='+';minus.style.cssText=plus.style.cssText='min-width:46px;width:46px;min-height:44px;padding:0;font-size:22px';
      i.type='range';i.min=a;i.max=b;i.step=s;i.value=A.tune[k];robustRange(i);
      const digits=s<.01?3:s<1?2:0,f=()=>o.textContent=(+i.value).toFixed(digits),apply=()=>{A.tune[k]=+i.value;f();show();drawPreview(performance.now())};f();i.oninput=apply;
      minus.onclick=()=>snapRange(i,Number(i.value)-Number(i.step));plus.onclick=()=>snapRange(i,Number(i.value)+Number(i.step));
      l.append(o);row.append(minus,i,plus);l.append(row);M.set(k,{i,o,s,apply});
    }
    to.append(l);
  }
  defs.forEach(d=>add(d));
  const ad=document.createElement('details');ad.innerHTML='<summary>แรงแยกแต่ละทิศ</summary><p class="settings-note">1.00 = เท่าค่าหลัก ใช้แก้เฉพาะทิศที่แรงเกิน/น้อยเกิน</p>';c.append(ad);
  for(let x=0;x<8;x++){add(['g'+x,dirLabel(x)+' · ตัวคูณแรง','r',.35,1.8,.01],ad);const v=M.get('g'+x);v.i.value=A.tune.g[x];v.o.textContent=A.tune.g[x].toFixed(2);v.i.oninput=()=>{A.tune.g[x]=+v.i.value;v.o.textContent=A.tune.g[x].toFixed(2);show();drawPreview(performance.now())}}

  function show(){const R=A.runtime,T=A.tune;st.textContent=`ในเกมตอนนี้: ${R.moving?dirLabel(R.dir):'หยุด'} · wave ${R.wave.toFixed(2)} · รอบ ${T.cycle.toFixed(2)}s`;j.value=JSON.stringify(T,null,2)}
  r.querySelector('[data-x=s]').onclick=()=>{A.save();show();st.textContent+=' · บันทึกแล้ว'};
  r.querySelector('[data-x=c]').onclick=async()=>{show();try{await navigator.clipboard.writeText(j.value);st.textContent+=' · คัดลอกแล้ว'}catch{j.select()}};
  r.querySelector('[data-x=r]').onclick=()=>{A.reset();location.reload()};
  j.onchange=()=>{try{A.set(JSON.parse(j.value));A.save();location.reload()}catch{st.textContent='JSON ไม่ถูกต้อง'}};
  const timer=setInterval(()=>r.open&&show(),220);r.addEventListener('toggle',()=>{if(r.open)drawPreview(performance.now())});window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);clearInterval(timer)},{once:true});show();drawPreview(performance.now());
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount,{once:true}):mount();
})();
