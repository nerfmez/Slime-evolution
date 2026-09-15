// Detailed live controls + sticky realtime preview + local push-shape brush.
(()=>{
function mount(){
  const A=globalThis.__slimeDirectionalV3||globalThis.__slimeDirectionalV2,h=document.getElementById('settings-tools');
  if(!A||!h||document.getElementById('slime-motion-tuner'))return;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  const r=document.createElement('details');r.id='slime-motion-tuner';
  r.innerHTML=`
    <summary>ปรับยืด–หด / ทรงสไลม์ 8 ทิศ</summary>
    <p class="settings-note">ปรับเฉพาะภาพการเคลื่อนที่ ไม่เปลี่ยนความเร็ว ดาเมจ หรือ collision</p>
    <div id="sm-preview" style="position:sticky;top:0;z-index:20;border:1px solid #aaa98f;border-radius:14px;padding:8px;margin:8px 0 12px;background:#f5f0df;box-shadow:0 6px 18px #34452d24;overflow:hidden">
      <canvas id="sm-preview-canvas" width="720" height="330" style="display:block;width:100%;height:auto;max-height:195px;border-radius:10px;background:#eef0d9;touch-action:none"></canvas>
      <div id="sm-dir-buttons" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin-top:6px"></div>
      <div class="settings-actions" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:6px">
        <button type="button" data-p="play">หยุดตัวอย่าง</button><button type="button" data-p="ghost">ซ่อนต้นฉบับ</button><button type="button" data-p="shape">โหมดดันทรง</button>
      </div>
      <div id="sm-shape-tools" hidden style="margin-top:6px;border-top:1px solid #c9c5ab;padding-top:6px">
        <div class="settings-note" style="margin:0 0 4px">แตะบนตัวแล้วลาก: ลากหางเข้าหาตัว = หางสั้น · ลากออก = หางยาว</div>
        <div style="display:grid;grid-template-columns:auto minmax(80px,1fr) auto minmax(80px,1fr);gap:5px;align-items:center">
          <span>รัศมี</span><input id="sm-brush-radius" type="range" min="0.04" max="0.42" step="0.01" value="0.18">
          <span>แรง</span><input id="sm-brush-strength" type="range" min="0.10" max="2" step="0.05" value="1">
        </div>
        <div class="settings-actions" style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:5px"><button type="button" data-p="undo">ย้อนดันล่าสุด</button><button type="button" data-p="clear">ล้างทรงทิศนี้</button></div>
        <div id="sm-shape-readout" class="settings-note"></div>
      </div>
      <label id="sm-phase-row" style="display:grid;grid-template-columns:1fr auto;gap:3px;margin:6px 0 0">ตำแหน่งในรอบ <output id="sm-preview-phase">กำลังเล่น</output><input id="sm-preview-scrub" type="range" min="0" max="1" step="0.01" value="0" disabled></label>
      <div id="sm-preview-readout" class="settings-note" style="margin-top:3px"></div>
    </div>
    <div id="smst" class="settings-note"></div><div id="smc"></div>
    <div class="settings-actions"><button type="button" data-x="s">บันทึก</button><button type="button" data-x="r">คืนค่า</button><button type="button" data-x="c">คัดลอกค่า</button></div>
    <textarea id="smj" rows="5" style="width:100%;margin-top:8px" aria-label="ค่าการยืดหดสไลม์"></textarea>`;
  const hd=h.querySelector('h3');hd?hd.after(r):h.prepend(r);

  const c=r.querySelector('#smc'),st=r.querySelector('#smst'),j=r.querySelector('#smj'),M=new Map,n=A.names;
  const canvas=r.querySelector('#sm-preview-canvas'),ctx=canvas.getContext('2d'),dirBox=r.querySelector('#sm-dir-buttons'),scrub=r.querySelector('#sm-preview-scrub'),phaseOut=r.querySelector('#sm-preview-phase'),previewRead=r.querySelector('#sm-preview-readout');
  const shapeTools=r.querySelector('#sm-shape-tools'),shapeRead=r.querySelector('#sm-shape-readout'),brushRadius=r.querySelector('#sm-brush-radius'),brushStrength=r.querySelector('#sm-brush-strength');
  const cells=[[1,2],[2,2],[2,1],[2,0],[1,0],[0,0],[0,1],[0,2]],ordered=[4,3,2,1,0,7,6,5];
  let selected=(A.runtime?.moving?A.runtime.dir:2),playing=true,ghost=true,shapeMode=false,pausedPhase=0,lastNow=performance.now(),raf=0,previewGeom=null,drag=null,transient=null;

  function styleRange(i){i.style.cssText='grid-column:1/-1;width:100%;min-width:0;height:46px;min-height:46px;margin:0;padding:0;touch-action:none;accent-color:#708866;cursor:pointer'}
  function snapRange(i,value){const lo=Number(i.min),hi=Number(i.max),step=Number(i.step)||1;let v=clamp(value,lo,hi);v=Math.round((v-lo)/step)*step+lo;const digits=(String(step).split('.')[1]||'').length;i.value=Number(v.toFixed(digits));i.dispatchEvent(new Event('input',{bubbles:true}))}
  function robustRange(i){styleRange(i);let active=false,pid=null;const from=e=>{const b=i.getBoundingClientRect();if(!b.width)return;snapRange(i,Number(i.min)+(Number(i.max)-Number(i.min))*clamp((e.clientX-b.left)/b.width,0,1))};i.addEventListener('pointerdown',e=>{if(i.disabled)return;active=true;pid=e.pointerId;try{i.setPointerCapture(pid)}catch{}from(e);e.preventDefault()});i.addEventListener('pointermove',e=>{if(active&&e.pointerId===pid){from(e);e.preventDefault()}});const end=e=>{if(e.pointerId!==pid)return;active=false;try{i.releasePointerCapture(pid)}catch{}pid=null};i.addEventListener('pointerup',end);i.addEventListener('pointercancel',end);i.addEventListener('lostpointercapture',()=>{active=false;pid=null})}
  robustRange(scrub);styleRange(brushRadius);styleRange(brushStrength);

  const dirLabel=i=>n[i]||['S','SE','E','NE','N','NW','W','SW'][i];
  function markDir(){for(const b of dirBox.querySelectorAll('button')){const on=Number(b.dataset.dir)===selected;b.style.background=on?'#dce5c8':'#f6f0de';b.style.borderColor=on?'#758b68':'#9ba98f';b.setAttribute('aria-pressed',String(on))}}
  for(const i of ordered){const b=document.createElement('button');b.type='button';b.dataset.dir=i;b.textContent=dirLabel(i);b.style.cssText='min-height:38px;padding:4px';b.onclick=()=>{selected=i;drag=null;transient=null;markDir();drawPreview(performance.now())};dirBox.append(b)}markDir();

  function pushList(){return A.tune.pushes?.[selected]||[]}
  function allPushes(){const p=[...pushList()];if(transient)p.push(transient);return p}
  function falloff(u,v,p){const d=Math.hypot(u-p.x,v-p.y),t=1-clamp(d/Math.max(.001,p.r),0,1),w=t*t*(3-2*t);return w*(p.s??1)}
  function deformUV(u,v,pushes){let x=-1+2*u,y=-1+2*v;for(const p of pushes){const w=falloff(u,v,p);x+=p.dx*2*w;y+=p.dy*2*w}return[x,y]}

  function affine(s0,s1,s2,d0,d1,d2){
    const[x0,y0]=s0,[x1,y1]=s1,[x2,y2]=s2,[X0,Y0]=d0,[X1,Y1]=d1,[X2,Y2]=d2,det=x0*(y1-y2)+x1*(y2-y0)+x2*(y0-y1);if(Math.abs(det)<1e-7)return null;
    const a=(X0*(y1-y2)+X1*(y2-y0)+X2*(y0-y1))/det,c=(X0*(x2-x1)+X1*(x0-x2)+X2*(x1-x0))/det,e=(X0*(x1*y2-x2*y1)+X1*(x2*y0-x0*y2)+X2*(x0*y1-x1*y0))/det;
    const b=(Y0*(y1-y2)+Y1*(y2-y0)+Y2*(y0-y1))/det,d=(Y0*(x2-x1)+Y1*(x0-x2)+Y2*(x1-x0))/det,f=(Y0*(x1*y2-x2*y1)+Y1*(x2*y0-x0*y2)+Y2*(x0*y1-x1*y0))/det;return[a,b,c,d,e,f]
  }
  function tri(img,s0,s1,s2,d0,d1,d2){const m=affine(s0,s1,s2,d0,d1,d2);if(!m)return;ctx.save();ctx.beginPath();ctx.moveTo(...d0);ctx.lineTo(...d1);ctx.lineTo(...d2);ctx.closePath();ctx.clip();ctx.setTransform(...m);ctx.drawImage(img,0,0);ctx.restore()}

  function calcGeom(now){
    const T=A.tune,img=A.runtime?.img;if(!img?.naturalWidth)return null;
    const[col,row]=cells[selected],cw=img.naturalWidth/3,ch=img.naturalHeight/3,bb=A.runtime?.b?.[row]?.[col]||[0,0,1,1],vh=Math.max(.2,bb[3]-bb[1]),visW=Math.max(.2,bb[2]-bb[0]);
    const targetVisibleH=shapeMode?150:145,hh=(targetVisibleH/2)/vh,hw=hh*(A.runtime?.asp||cw/ch),visCX=(bb[0]+bb[2])/2,visCY=(bb[1]+bb[3])/2,cx=canvas.width/2-(visCX-.5)*2*hw,cy=177-(visCY-.5)*2*hh;
    let wave=0,al=1,cr=1,ang=Math.PI/2-selected*Math.PI/4+(T.axis||0)*Math.PI/180,lead=0;
    if(!shapeMode){const base=playing?now/1000/Math.max(.05,T.cycle||.96):pausedPhase,phase=base*Math.PI*2+(T.phase||0)*Math.PI/180,g=T.g?.[selected]??1;wave=T.on?Math.sin(phase)*g:0;al=T.on?1+(T.stretch||0)*wave:1;cr=T.on?1-(T.squash||0)*wave:1;lead=T.on?(al-1)*targetVisibleH*.5*(T.lead||0):0}
    const ca=Math.cos(ang),sa=Math.sin(ang),AA=al*ca*ca+cr*sa*sa,BB=(al-cr)*ca*sa,DD=al*sa*sa+cr*ca*ca,ldx=Math.cos(ang)*lead,ldy=Math.sin(ang)*lead,pushes=allPushes(),grid=10,verts=[];
    for(let gy=0;gy<=grid;gy++)for(let gx=0;gx<=grid;gx++){const u=gx/grid,v=gy/grid,[px,py]=deformUV(u,v,pushes),sx=px*hw,sy=py*hh;verts.push({u,v,x:cx+AA*sx+BB*sy+ldx,y:cy+BB*sx+DD*sy+ldy,srcX:(col+u)*cw,srcY:(row+v)*ch})}
    return{img,col,row,cw,ch,bb,hh,hw,cx,cy,wave,al,cr,ang,lead,grid,verts,targetVisibleH,visW}
  }
  function drawMesh(g,alpha=1){const{img,grid,verts}=g;ctx.save();ctx.globalAlpha=alpha;for(let y=0;y<grid;y++)for(let x=0;x<grid;x++){const a=y*(grid+1)+x,b=a+1,c=a+grid+1,d=c+1,A=verts[a],B=verts[b],C=verts[c],D=verts[d];tri(img,[A.srcX,A.srcY],[C.srcX,C.srcY],[B.srcX,B.srcY],[A.x,A.y],[C.x,C.y],[B.x,B.y]);tri(img,[B.srcX,B.srcY],[C.srcX,C.srcY],[D.srcX,D.srcY],[B.x,B.y],[C.x,C.y],[D.x,D.y])}ctx.restore()}
  function drawArrow(x,y,ang,len){ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.strokeStyle='#50624e';ctx.fillStyle='#50624e';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-len*.5,0);ctx.lineTo(len*.5,0);ctx.stroke();ctx.beginPath();ctx.moveTo(len*.5,0);ctx.lineTo(len*.5-13,-8);ctx.lineTo(len*.5-13,8);ctx.closePath();ctx.fill();ctx.restore()}
  function drawPreview(now){
    const W=canvas.width,H=canvas.height;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#f5f1df');grad.addColorStop(1,'#dfe8c8');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);ctx.fillStyle='rgba(86,110,74,.14)';for(let x=18;x<W;x+=46)for(let y=30;y<H;y+=46){ctx.beginPath();ctx.ellipse(x+(y%92?7:0),y,6,3,-.5,0,Math.PI*2);ctx.fill()}
    ctx.fillStyle='#3e5545';ctx.font='600 21px system-ui';ctx.textAlign='left';ctx.fillText((shapeMode?'ดันทรง · ':'ตัวอย่างเรียลไทม์ · ')+dirLabel(selected),18,30);
    const g=calcGeom(now);previewGeom=g;if(!g){ctx.font='18px system-ui';ctx.fillText('กำลังโหลดภาพสไลม์…',18,64);return}
    if(ghost&&!shapeMode){const saved=transient;transient=null;const base=calcGeom(now);transient=saved;drawMesh(base,.18)}
    ctx.save();ctx.translate(g.cx,g.cy+g.targetVisibleH*.48);ctx.scale(1,.28);ctx.fillStyle='rgba(48,69,55,.15)';ctx.beginPath();ctx.ellipse(0,0,g.targetVisibleH*.65,g.targetVisibleH*.18,0,0,Math.PI*2);ctx.fill();ctx.restore();drawMesh(g,1);
    if(shapeMode&&drag){ctx.strokeStyle='#5b765d';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(drag.startX,drag.startY);ctx.lineTo(drag.x,drag.y);ctx.stroke();ctx.fillStyle='rgba(91,118,93,.16)';ctx.beginPath();ctx.arc(drag.startX,drag.startY,Number(brushRadius.value)*Math.min(g.hw*2,g.hh*2),0,Math.PI*2);ctx.fill()}
    if(!shapeMode)drawArrow(canvas.width/2,306,g.ang,82);
    previewRead.textContent=shapeMode?`${dirLabel(selected)} · ดันไว้ ${pushList().length}/${A.MAX_PUSHES||8} จุด · รัศมี ${Number(brushRadius.value).toFixed(2)} · แรง ${Number(brushStrength.value).toFixed(2)}`:`${dirLabel(selected)} · wave ${g.wave.toFixed(2)} · ยาว ${(g.al*100).toFixed(1)}% · กว้าง ${(g.cr*100).toFixed(1)}% · เลื่อนมวล ${g.lead.toFixed(1)} px`;
    if(!shapeMode){if(playing){phaseOut.textContent='กำลังเล่น';scrub.value=((now/1000/Math.max(.05,A.tune.cycle||.96))%1+1)%1}else{phaseOut.textContent=Math.round(pausedPhase*100)+'%';scrub.value=pausedPhase}}
    shapeRead.textContent=`ทิศ ${dirLabel(selected)} · ${pushList().length} จุดดัน · แตะ/ลากบนตัวสไลม์ได้โดยตรง`;
  }
  function loop(now){lastNow=now;if(r.open)drawPreview(now);raf=requestAnimationFrame(loop)}raf=requestAnimationFrame(loop);

  r.querySelector('[data-p=play]').onclick=e=>{if(shapeMode)return;playing=!playing;if(!playing)pausedPhase=((lastNow/1000/Math.max(.05,A.tune.cycle||.96))%1+1)%1;e.currentTarget.textContent=playing?'หยุดตัวอย่าง':'เล่นตัวอย่าง';scrub.disabled=playing;drawPreview(performance.now())};
  r.querySelector('[data-p=ghost]').onclick=e=>{ghost=!ghost;e.currentTarget.textContent=ghost?'ซ่อนต้นฉบับ':'ซ้อนต้นฉบับ';drawPreview(performance.now())};
  r.querySelector('[data-p=shape]').onclick=e=>{shapeMode=!shapeMode;shapeTools.hidden=!shapeMode;r.querySelector('#sm-phase-row').hidden=shapeMode;e.currentTarget.textContent=shapeMode?'ออกจากดันทรง':'โหมดดันทรง';if(shapeMode){playing=false;scrub.disabled=true}else{playing=true;scrub.disabled=true}drag=null;transient=null;drawPreview(performance.now())};
  r.querySelector('[data-p=undo]').onclick=()=>{A.undoPush(selected);drawPreview(performance.now());show()};
  r.querySelector('[data-p=clear]').onclick=()=>{A.clearPushes(selected);drawPreview(performance.now());show()};
  scrub.oninput=()=>{pausedPhase=Number(scrub.value);drawPreview(performance.now())};

  function canvasPoint(e){const b=canvas.getBoundingClientRect(),sx=canvas.width/b.width,sy=canvas.height/b.height;return{x:(e.clientX-b.left)*sx,y:(e.clientY-b.top)*sy}}
  function nearestUV(x,y){if(!previewGeom)return null;let best=null,bd=1e9;for(const v of previewGeom.verts){const d=(v.x-x)**2+(v.y-y)**2;if(d<bd){bd=d;best=v}}return best&&bd<85*85?{u:best.u,v:best.v}:null}
  canvas.addEventListener('pointerdown',e=>{if(!shapeMode||!previewGeom)return;const p=canvasPoint(e),uv=nearestUV(p.x,p.y);if(!uv)return;drag={id:e.pointerId,startX:p.x,startY:p.y,x:p.x,y:p.y,u:uv.u,v:uv.v};try{canvas.setPointerCapture(e.pointerId)}catch{}e.preventDefault()});
  canvas.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id||!previewGeom)return;const p=canvasPoint(e);drag.x=p.x;drag.y=p.y;const dx=(p.x-drag.startX)/(previewGeom.hw*2),dy=(p.y-drag.startY)/(previewGeom.hh*2);transient={x:drag.u,y:drag.v,dx:clamp(dx,-.7,.7),dy:clamp(dy,-.7,.7),r:Number(brushRadius.value),s:Number(brushStrength.value)};drawPreview(performance.now());e.preventDefault()});
  function endPush(e){if(!drag||e.pointerId!==drag.id)return;if(transient&&Math.hypot(transient.dx,transient.dy)>.004)A.addPush(selected,transient);drag=null;transient=null;try{canvas.releasePointerCapture(e.pointerId)}catch{}drawPreview(performance.now());show()}
  canvas.addEventListener('pointerup',endPush);canvas.addEventListener('pointercancel',e=>{if(drag&&e.pointerId===drag.id){drag=null;transient=null;drawPreview(performance.now())}});

  const defs=[['on','เปิดยืด–หด','b'],['cycle','รอบยืด–หด (วินาที)','r',.25,2,.01],['stretch','ยืดตามทิศ','r',0,.28,.002],['squash','หดด้านข้าง','r',0,.18,.002],['lead','เลื่อนมวลไปข้างหน้า','r',0,.75,.01],['phase','เฟสเริ่ม (องศา)','r',-180,180,1],['axis','ชดเชยแกนยืด (องศา)','r',-45,45,1],['scale','ขนาดตัว','r',.65,1.45,.01],['idle','หายใจตอนหยุด','r',0,.04,.001],['idleSpeed','ความเร็วหายใจ','r',.25,6,.05],['threshold','เกณฑ์เริ่มเดิน','r',.001,.08,.001]];
  function add(d,to=c){
    const[k,name,t,a,b,s]=d,l=document.createElement('div');l.style.cssText='display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 8px;margin:10px 0 14px;padding-bottom:10px;border-bottom:1px solid #d8d2b7';const title=document.createElement('span');title.textContent=name;l.append(title);
    if(t==='b'){const i=document.createElement('input');i.type='checkbox';i.style.cssText='width:24px;height:24px';i.checked=!!A.tune[k];i.onchange=()=>{A.tune[k]=i.checked;show();drawPreview(performance.now())};l.append(i);M.set(k,i)}else{const o=document.createElement('output');o.style.cssText='font-variant-numeric:tabular-nums;font-weight:650';const row=document.createElement('div');row.style.cssText='grid-column:1/-1;display:grid;grid-template-columns:46px minmax(0,1fr) 46px;align-items:center;gap:8px';const minus=document.createElement('button'),plus=document.createElement('button'),i=document.createElement('input');minus.type=plus.type='button';minus.textContent='−';plus.textContent='+';minus.style.cssText=plus.style.cssText='min-width:46px;width:46px;min-height:44px;padding:0;font-size:22px';i.type='range';i.min=a;i.max=b;i.step=s;i.value=A.tune[k];robustRange(i);const digits=s<.01?3:s<1?2:0,f=()=>o.textContent=(+i.value).toFixed(digits),apply=()=>{A.tune[k]=+i.value;f();show();drawPreview(performance.now())};f();i.oninput=apply;minus.onclick=()=>snapRange(i,Number(i.value)-Number(i.step));plus.onclick=()=>snapRange(i,Number(i.value)+Number(i.step));l.append(o);row.append(minus,i,plus);l.append(row);M.set(k,{i,o,s,apply})}
    to.append(l);
  }
  defs.forEach(d=>add(d));
  const ad=document.createElement('details');ad.innerHTML='<summary>แรงยืด–หดแยกแต่ละทิศ</summary><p class="settings-note">1.00 = เท่าค่าหลัก ใช้แก้เฉพาะทิศที่แรงเกิน/น้อยเกิน</p>';c.append(ad);
  for(let x=0;x<8;x++){add(['g'+x,dirLabel(x)+' · ตัวคูณแรง','r',.35,1.8,.01],ad);const v=M.get('g'+x);v.i.value=A.tune.g[x];v.o.textContent=A.tune.g[x].toFixed(2);v.i.oninput=()=>{A.tune.g[x]=+v.i.value;v.o.textContent=A.tune.g[x].toFixed(2);show();drawPreview(performance.now())}}

  function show(){const R=A.runtime,T=A.tune,total=(T.pushes||[]).reduce((s,a)=>s+(a?.length||0),0);st.textContent=`ในเกมตอนนี้: ${R.moving?dirLabel(R.dir):'หยุด'} · รอบ ${T.cycle.toFixed(2)}s · จุดดันทรงรวม ${total}`;j.value=JSON.stringify(T,null,2)}
  r.querySelector('[data-x=s]').onclick=()=>{A.save();show();st.textContent+=' · บันทึกแล้ว'};
  r.querySelector('[data-x=c]').onclick=async()=>{show();try{await navigator.clipboard.writeText(j.value);st.textContent+=' · คัดลอกแล้ว'}catch{j.select()}};
  r.querySelector('[data-x=r]').onclick=()=>{A.reset();location.reload()};
  j.onchange=()=>{try{A.set(JSON.parse(j.value));A.save();location.reload()}catch{st.textContent='JSON ไม่ถูกต้อง'}};
  const timer=setInterval(()=>r.open&&show(),250);r.addEventListener('toggle',()=>{if(r.open)drawPreview(performance.now())});window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);clearInterval(timer)},{once:true});show();drawPreview(performance.now());
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount,{once:true}):mount();
})();
