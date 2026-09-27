// Build-time HUD polish. Presentation only: no combat, pacing, art or save data changes.
export const HUD_POLISH_VERSION='hud-polish-v8';

const ELITE_OLD='for(let e of J.enemies){if(!e.elite||e.hp<=0)continue;let a=({thorn:1.95,spark:1.08,turtle:1.25,water:1.38}[e.type]||1.15)*(e.scale||1),[o,s]=proj(e.x,a,e.z),c=Math.max(66,Math.min(104,74*(e.scale||1))),l=7,u=s-16,d=Math.max(0,Math.min(1,e.hp/Math.max(1,e.maxHP||e.hp)));r.font=`700 12px system-ui`,r.lineWidth=3,r.strokeStyle=`rgba(54,37,26,.9)`,r.fillStyle=`#fff4d7`,r.strokeText(pt(e).name,o,u-5),r.fillText(pt(e).name,o,u-5),r.fillStyle=`rgba(45,31,25,.88)`,r.fillRect(o-c/2-2,u-2,c+4,l+4),r.fillStyle=`#f1dfbb`,r.fillRect(o-c/2,u,c,l),r.fillStyle=d>.35?`#e74e47`:`#d43d3d`,r.fillRect(o-c/2,u,c*d,l),r.strokeStyle=`rgba(86,50,32,.9)`,r.lineWidth=1,r.strokeRect(o-c/2,u,c,l)}';
// Compact paper tags sized from measured text (fonts differ per OS; left-aligned from m.width because WebKit reports ink left/right differently under center alignment): star + roster name, HP only once damaged, stacked instead of overlapping, faded over the player.
const ELITE_NEW='{const tags=[],placed=[],[px,py]=proj(W.player[0],.45,W.player[2]);for(let e of J.enemies){if(!e.elite||e.hp<=0)continue;let a=({thorn:1.95,spark:1.08,turtle:1.25,water:1.38}[e.type]||1.15)*(e.scale||1),[o,s]=proj(e.x,a,e.z);tags.push({e,x:o,y:s-22})}tags.sort((a,b)=>b.y-a.y);r.font=`700 11px system-ui,sans-serif`,r.textAlign=`left`,r.textBaseline=`alphabetic`,r.lineWidth=1;for(let g of tags){let e=g.e,label=`★ `+pt(e).name,d=Math.max(0,Math.min(1,e.hp/Math.max(1,e.maxHP||e.hp))),hurt=d<.999,m=r.measureText(label),asc=m.actualBoundingBoxAscent||9,desc=m.actualBoundingBoxDescent||3,tw=m.width,th=asc+desc,w=Math.max(tw+16,hurt?60:0),h=th+(hurt?14:9),x=g.x,y=g.y;for(let k=0;k<6;k++){let hit=placed.find(p=>Math.abs(p.x-x)<(p.w+w)/2&&Math.abs(p.y-y)<(p.h+h)/2);if(!hit)break;y=hit.y-(hit.h+h)/2-2}placed.push({x,y,w,h});let top=y-h/2;r.globalAlpha=Math.abs(px-x)<w/2+18&&Math.abs(py-y)<h/2+28?.38:1,r.beginPath(),r.roundRect?r.roundRect(x-w/2,top,w,h,9):r.rect(x-w/2,top,w,h),r.fillStyle=`rgba(247,240,220,.92)`,r.fill(),r.strokeStyle=`rgba(120,96,64,.55)`,r.stroke(),r.fillStyle=`#35483a`,r.fillText(label,x-tw/2,top+4.5+asc);if(hurt){let bw=w-14,bx=x-bw/2,by=top+th+7.5;r.fillStyle=`#ddd3b6`,r.fillRect(bx,by,bw,4),r.fillStyle=d>.35?`#bd6658`:`#a8402f`,r.fillRect(bx,by,bw*d,4)}}r.textAlign=`center`,r.globalAlpha=1}';

const BUNDLE_EDITS=[
  ['elite tags',ELITE_OLD,ELITE_NEW],
  // The movement hint retires once the player has actually moved. The round clock (top centre) and the stage line (the status
  // without the time, which moves to the clock) update with it; #status keeps its full text for tools and screen readers.
  ['hint retire','B(`retry`).hidden=J.hp>0&&!J.finished,','W.moving&&B(`hint`)?.classList.add(`hint-done`),B(`stage-line`)&&(B(`stage-line`).textContent=B(`status`).textContent.replace(/ · \\d\\d:\\d\\d \\/ \\d\\d:\\d\\d/,``)),B(`clock`)&&(B(`clock`).hidden=J.hp<=0||J.finished||J.bossSpawned,B(`clock`).firstChild.textContent=t,B(`clock`).style.setProperty(`--p`,String(e/(J.mode===`auto`?600:300)))),B(`retry`).hidden=J.hp>0&&!J.finished,'],
  // Fullscreen (owner report): the settings dialog sat under the fullscreen page, so it vanished while still open and the game
  // stayed paused until Settings was tapped. The dialog is re-shown on top after every fullscreen change, so it stays visible and
  // closing it resumes play. iPad Safari's prefixed fullscreen API is used when the standard one is missing.
  ['fullscreen keeps the menu','B(`fullscreen`).onclick=async()=>{try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen()}catch{B(`status`).textContent=`อุปกรณ์นี้ไม่รองรับเต็มจอ`}},',
    'B(`fullscreen`).onclick=async()=>{let d=document,h=d.documentElement;try{d.fullscreenElement||d.webkitFullscreenElement?await(d.exitFullscreen||d.webkitExitFullscreen).call(d):await(h.requestFullscreen||h.webkitRequestFullscreen).call(h)}catch{B(`status`).textContent=`อุปกรณ์นี้ไม่รองรับเต็มจอ`}},[`fullscreenchange`,`webkitfullscreenchange`].forEach(e=>document.addEventListener(e,()=>{ei.open&&(ei.show(!1),ei.show(!0))})),'],
  ['lab hides clock','if(Z.active){B(`boss-health`).hidden=!0,','if(Z.active){B(`boss-health`).hidden=!0,B(`clock`)&&(B(`clock`).hidden=!0),B(`stage-line`)&&(B(`stage-line`).textContent=`ห้องทดสอบสกิล`),'],
  ['empty skill slot','}else i.textContent=`ช่องสกิลว่าง`;t.append(i)','}else i.classList.add(`empty`),i.title=`ช่องสกิลว่าง`,i.setAttribute(`aria-label`,`ช่องสกิลว่าง`),i.textContent=`+`;t.append(i)'],
  // Skill details (owner request): tapping an equipped skill chip opens a paper panel with its level, branch levels, the
  // mods taken, its current stats and its DPS over the last 10 s (the game pauses while it is open). The choice screen shows
  // what each card changes (before -> after for every stat that moves; a mod lists each equipped skill, "no effect" when
  // nothing changes). Mouse: hovering a card shows it and a click picks it. Touch (iPad): the first tap shows it, a second
  // tap on the same card or the confirm button picks it. Stats are read with the game's own formulas (Ct, yt).
  ['skill info functions','function gn(e,t,n){let r=document.createElement(`section`);r.id=`skill-choice`,','function __hudStats(k,s,m){if(!s)return[];let f=(v,d=0)=>+(+v).toFixed(d),p=v=>Math.round(v*100)+"%",r;if(k==="fire"){let o=yt(s.level,s.b,m,s.evo);return[["ดาเมจระเบิด",o.damage],["รัศมีระเบิด",f(o.radius,2)],["สะเก็ดไฟ",o.embers],["ดาเมจสะเก็ด",o.emberDamage],["ไฟเผาต่อจังหวะ",o.burn],["เวลาไฟเผา",f(o.burnTime,1)+" วิ"],["พื้นไฟไหม้",f(o.groundTime,1)+" วิ"],["คูลดาวน์",f(o.cooldown,2)+" วิ"]]}let o=Ct(k,s,m),v=s.evo;r=[["ดาเมจ",o.damage]];if(k==="water")r.push(["จำนวนนัด",o.count],["ทะลุ",o.pierce],["ความเร็วกระสุน",f(o.speed,1)]);if(k==="tide")r.push(["วงสะท้อน",o.count],["ดาเมจวงสะท้อน",o.echo],["รัศมี",f(o.r,2)],["แรงผลัก",f(o.push,2)]);if(k==="toxin")r.push(["จังหวะพิษ",f(o.tick,2)+" วิ"],["ระยะพิษ",f(o.life,1)+" วิ"],["รัศมีบ่อพิษ",f(o.r,2)],["บ่อพิษเพิ่ม",o.extra],["ทำให้ช้า",p(o.slow)],["รับดาเมจเพิ่ม",p(o.vulnerable)]);if(k==="chain")r.push(["จำนวนเป้า",o.count],["ระยะโซ่",f(o.range,1)],["สตั๊น",f(o.stun,2)+" วิ"]);if(k==="frost")r.push(["คริสตัล",o.count],["โอกาสแช่แข็ง",p(o.chance)],["เวลาช้า",f(o.slowTime,2)+" วิ"],["ดาเมจแตกกระจาย",o.shatter],["รัศมีแตกกระจาย",f(o.shatterRadius,2)]);if(k==="orbit")r.push(["ลูกแก้ว",v==="power"?1:v?Math.max(3,o.count):Math.max(2,o.count)],...(v==="power"?[["ดวงจันทร์",Math.max(0,Math.min(4,o.count-1))]]:[]),["รัศมีวง",f(o.r*(v==="power"?1.2:v==="pulse"?1.08:v?1:1.35),2)],["ความเร็วหมุน",f(o.speed*(v==="power"?.72:v==="pulse"?.88:v?1:1.3),2)],["ดาเมจพัลส์",o.pulse]);else r.push(["คูลดาวน์",f(o.cooldown*(k==="water"&&v==="flow"?1.5:1),2)+" วิ"]);r.push(["ขนาดพื้นที่","×"+f(o.A,2)],["ระยะเวลา","×"+f(o.D,2)]);return r}function __hudName(k,s){return s&&s.evo?F[k].evolutions[s.evo].name:F[k].name}function __hudState(e,k){if(!e.equipped.includes(k))return null;let s=e.skill(k);return{level:s.level,b:{...s.b},evo:s.evo}}function __hudCard(c,e,w){let R=[],add=(k,a,b,mA,mB,note)=>{let x=__hudStats(k,a,mA),y=__hudStats(k,b,mB),d=[];y.forEach(q=>{let o=x.length?(x.find(z=>z[0]===q[0])||[0,"-"])[1]:null;(o===null||String(o)!==String(q[1]))&&d.push([q[0],o,q[1]])});R.push({icon:F[k].icon,name:__hudName(k,b),rows:d,note})};if(c==="heal"){let h=Math.round(w.hp);R.push({name:"สไลม์",rows:[["HP",h,Math.min(e.maxHP,h+20)]]});return R}let p=c.split(":");if(p[0]==="mod"){let m2={...e.mods,[p[1]]:e.mods[p[1]]+1};for(let k of e.equipped)add(k,__hudState(e,k),__hudState(e,k),e.mods,m2);if(p[1]==="vitality")R.push({name:"สไลม์",rows:[["HP สูงสุด",e.maxHP,e.maxHP+14]]});else if(!["power","area","duration","haste"].includes(p[1]))R.push({name:"สไลม์",rows:[],note:xt[p[1]].description});return R}if(p[0]==="evo"){let k=p[1],a=__hudState(e,k),b={...a,b:{...a.b},evo:p[2]};add(k,a,b,e.mods,e.mods,"สืบทอด: "+F[k].branches.map(n=>xt[k+"_"+n].name+" "+a.b[n]+"/4").join(" · "));return R}let[k,n]=p,a=__hudState(e,k),b=a?{level:a.level+1,b:{...a.b,[n]:a.b[n]+1},evo:a.evo}:{level:1,b:Object.fromEntries(F[k].branches.map(x=>[x,+(x===n)])),evo:""};add(k,a,b,e.mods,e.mods,a?"":"สกิลใหม่");return R}function __hudRows(box,groups){box.replaceChildren();for(let g of groups){let d=document.createElement("div");d.className="pv-skill";let h=document.createElement("b");if(g.icon){let i=document.createElement("img");i.src=g.icon,i.alt="",h.append(i)}h.append(g.name),d.append(h);if(g.note){let s=document.createElement("em");s.textContent=g.note,d.append(s)}if(!g.rows.length&&!g.note){let s=document.createElement("span");s.className="pv-none",s.textContent="ไม่มีผลกับสกิลนี้",d.append(s)}for(let[l,a,b]of g.rows){let s=document.createElement("span");s.className="pv-row";let t=document.createElement("i");t.textContent=l;let u=document.createElement("span");u.textContent=a===null?String(b):a+" → "+b,s.append(t,u),d.append(s)}box.append(d)}}function __hudPreview(pv,c,e,w,a){if(!pv)return;for(let x of document.querySelectorAll(".skill-card.picked"))x!==a&&x.classList.remove("picked");__hudRows(pv,__hudCard(c,e,w));pv.hidden=!1;if(a&&a.classList.contains("picked")){let b=document.createElement("button");b.className="pv-confirm",b.textContent="เลือกการ์ดนี้",b.onclick=()=>{a.__pt="",a.click()},pv.append(b)}}function __hudDps(e,k){let h=e.__dpsLog||[],n=h[h.length-1];if(!n)return 0;let o=h.find(x=>n[0]-x[0]<=10)||n,t=n[0]-o[0];return t>.5?Math.round((n[1][k]-o[1][k])/t):0}function __hudInfo(e,k){let d=document.getElementById("skill-info");if(!d||!k)return;let s=__hudState(e,k),body=d.querySelector(".si-body");body.replaceChildren();let h=document.createElement("h3"),i=document.createElement("img");i.src=F[k].icon,i.alt="",h.append(i,__hudName(k,s)+" · LV "+s.level+"/10"),body.append(h);let br=document.createElement("div");br.className="si-branches";for(let n of F[k].branches){let r=document.createElement("span"),t=document.createElement("i"),v=document.createElement("b");t.textContent=xt[k+"_"+n].name,v.textContent="●".repeat(s.b[n])+"○".repeat(4-s.b[n])+" "+s.b[n]+"/4",r.append(t,v),br.append(r)}body.append(br);let md=St.filter(x=>e.mods[x]),mp=document.createElement("p");mp.className="si-mods",mp.textContent=md.length?"ม็อด: "+md.map(x=>xt[x].name+" "+e.mods[x]+"/5").join(" · "):"ม็อด: ยังไม่มี",body.append(mp);let dp=document.createElement("p");dp.className="si-dps",dp.textContent="DPS 10 วิล่าสุด "+__hudDps(e,k)+" · ดาเมจรวม "+Math.round(e.damageTotals[k]||0),body.append(dp);let st=document.createElement("div");st.className="pv-skill";__hudRows(st,[{name:"ค่าสกิลตอนนี้",rows:__hudStats(k,s,e.mods).map(([l,v])=>[l,null,v])}]),body.append(st)}function gn(e,t,n){let r=document.createElement(`section`);r.id=`skill-choice`,'],
  ['skill info panel','let i=document.createElement(`section`);i.className=`run-summary paper`,i.hidden=!0,document.body.append(i);','let i=document.createElement(`section`);i.className=`run-summary paper`,i.hidden=!0,document.body.append(i);let __d=document.createElement("dialog");__d.id="skill-info",__d.className="paper",__d.setAttribute("aria-label","รายละเอียดสกิล");let __b=document.createElement("div");__b.className="si-body";let __x=document.createElement("button");__x.className="si-close",__x.textContent="ปิด",__x.onclick=()=>__d.close(),__d.append(__b,__x),__d.onclick=ev=>{ev.target===__d&&__d.close()},document.body.append(__d);document.getElementById("fire-slot").addEventListener("click",ev=>{let q=ev.target.closest(".equipped-skill");if(!q||q.classList.contains("empty")||e.choosing)return;__d.__k=e.equipped[[...q.parentNode.children].indexOf(q)];if(!__d.__k)return;__hudInfo(e,__d.__k);__d.open||__d.showModal()});setInterval(()=>{let h=e.__dpsLog||(e.__dpsLog=[]),l=h[h.length-1];if(!l||e.clock!==l[0]){l&&e.clock<l[0]&&(h.length=0);h.push([e.clock,{...e.damageTotals}]);h.length>40&&h.shift()}__d.open&&__hudInfo(e,__d.__k)},500);'],
  ['card preview box','p.className=`skill-cards`,u.append(p);','p.className=`skill-cards`,u.append(p);let pv=document.createElement("div");pv.id="card-preview",pv.className="card-preview";{let h=document.createElement("span");h.className="pv-hint",h.textContent=matchMedia("(hover: none)").matches?"แตะการ์ด 1 ครั้งเพื่อดูว่าค่าไหนเปลี่ยน แตะซ้ำหรือกดยืนยันเพื่อเลือก":"ชี้เมาส์ที่การ์ดเพื่อดูว่าค่าไหนเปลี่ยน",pv.append(h)}u.append(pv);'],
  ['card two-tap','a.onclick=()=>{e.choose(r,t)&&(n(),c())},p.append(a)}','a.dataset.card=r,a.onpointerdown=ev=>{a.__pt=ev.pointerType},a.onpointerenter=ev=>{ev.pointerType==="mouse"&&__hudPreview(pv,r,e,t,null)},a.onfocus=()=>{a.__pt!=="touch"&&a.__pt!=="pen"&&__hudPreview(pv,r,e,t,null)},a.onclick=()=>{if(a.__pt==="touch"||a.__pt==="pen"){a.__pt="";if(!a.classList.contains("picked")){a.classList.add("picked"),__hudPreview(pv,r,e,t,a);return}}a.__pt="",e.choose(r,t)&&(n(),c())},p.append(a)}'],
  ['skill info pauses','let n=ei.open?0:','let n=ei.open||document.getElementById("skill-info")?.open?0:'],
  // HELL flag: the normal-round button starts Hell when asked (then clears the request); a test round is never Hell; retry keeps it.
  // Joystick side: the stick starts where the chosen side allows (left 55% by default, as before).
  ['joystick side','e.clientX>innerWidth*.55||Un!==null||','(globalThis.__joyBlocked?globalThis.__joyBlocked(e.clientX):e.clientX>innerWidth*.55)||Un!==null||'],
  ['hell flag','B(`normal-run`).onclick=()=>{','B(`normal-run`).onclick=()=>{J.hell=!!globalThis.__slimeHellNext,globalThis.__slimeHellNext=!1,document.body.classList.toggle(`hell`,J.hell),'],
  ['test round is not hell','B(`restart`).onclick=()=>{ai(),ti(!1)}','B(`restart`).onclick=()=>{J.hell=!1,document.body.classList.remove(`hell`),ai(),ti(!1)}'],
];

const STYLE='<style id="hud-polish">'+
  '#experience{height:8px}#experience::-webkit-progress-bar{background:#cfc8a8}#experience::-webkit-progress-value{background:#3f9aa6}#experience::-moz-progress-bar{background:#3f9aa6}'+
  '#level-text{color:#2f6f78}.title small{letter-spacing:.04em}'+
  '#hint{transition:opacity .8s ease}#hint.hint-done{opacity:0}'+
  '.equipped-skill.empty{box-sizing:border-box;border:1.5px dashed #b3a988;border-radius:50%;display:inline-grid;place-items:center;color:#a39a78;font-size:16px;line-height:1}'+
  // Round clock in the header's top row, first in the button group, so nothing can overlap it and the boss banner keeps the centre (the time used to hide inside the status line), a stage line in the panel, clearer HP and EXP
  // bars, and larger skill chips with round icons.
  '#status{position:absolute!important;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}'+
  '#stage-line{font-size:12px;color:#4f6452;line-height:1.3}'+
  '#clock{padding:6px 16px 8px;display:grid;justify-items:center;gap:5px;min-width:112px;pointer-events:none}#clock[hidden]{display:none}'+
  // The FPS box hangs under the buttons, so the top row never grows into the boss banner.
  'header .right{position:relative}#stats{position:absolute;top:calc(100% + 8px);right:0}'+
  '#clock b{font:800 26px/1 ui-rounded,system-ui,sans-serif;letter-spacing:.05em;color:#233c36;font-variant-numeric:tabular-nums}'+
  '#clock i{display:block;width:100%;height:5px;border-radius:3px;background:#d8cfae;overflow:hidden}'+
  '#clock s{display:block;height:100%;width:calc(var(--p,0) * 100%);border-radius:3px;background:linear-gradient(90deg,#3f9aa6,#d98a2b 70%,#bd551c);text-decoration:none}'+
  '#health{height:12px;border-radius:6px;overflow:hidden;-webkit-appearance:none;appearance:none;border:0;background:#e2d8bd}'+
  '#health::-webkit-progress-bar{background:#e2d8bd;border-radius:6px}#health::-webkit-progress-value{background:linear-gradient(180deg,#ec6c5f,#c63d3a);border-radius:6px}#health::-moz-progress-bar{background:linear-gradient(180deg,#ec6c5f,#c63d3a);border-radius:6px}'+
  '#health-text{font-weight:700;color:#7a3a30}#health-text::before{content:"\\2764\\FE0E  ";color:#d24a45}'+
  '#experience{border-radius:4px;overflow:hidden;-webkit-appearance:none;appearance:none;border:0}#experience::-webkit-progress-bar{border-radius:4px}#experience::-webkit-progress-value{border-radius:4px;background:linear-gradient(180deg,#5cb8c2,#3f9aa6)}'+
  '#level-text{font-weight:700}'+
  '#fire-slot{gap:8px;padding:6px 8px}'+
  '.equipped-skill{display:inline-flex;align-items:center;gap:7px;padding:3px 12px 3px 3px;border-radius:999px;background:#fff8e6;border:1px solid #d6c9a3;font-size:12.5px;font-weight:700;color:#3b3a2a}'+
  '.equipped-skill img{width:32px;height:32px;border-radius:50%;background:#efe4c8;padding:2px;box-sizing:border-box;object-fit:contain}'+
  '.equipped-skill.empty{width:38px;height:38px;padding:0;justify-content:center;background:none}'+
  // Boss banner: compact everywhere; on wide screens it sits in the top row between the HUD and the buttons.
  '#boss-health{padding:6px 14px}#boss-health strong{font-size:11px}#boss-health progress{height:8px;margin:4px 0}#boss-health small{font-size:10px}'+
  '#fire-slot .equipped-skill:not(.empty){pointer-events:auto;cursor:pointer}'+
  '.card-preview{margin:0 0 12px;padding:10px 12px;border-radius:10px;background:#f7efd9;border:1px solid #d6c79f;display:flex;flex-wrap:wrap;gap:8px 20px;font-size:13px;color:#3d3a2c;max-height:34vh;overflow:auto}'+
  '.pv-hint{color:#7b6d4c;font-size:12px}.card-preview,#skill-info{text-align:left}.pv-skill{display:grid;gap:3px;min-width:180px;flex:1;font-size:13px;line-height:1.35}'+
  '.pv-skill b{display:flex;align-items:center;gap:6px;font-size:13px;color:#2f5b52}.pv-skill b img{width:20px;height:20px;object-fit:contain}'+
  '.pv-skill em{font-size:12px;color:#7b6d4c;font-style:normal}.pv-row{display:flex;justify-content:space-between;gap:14px}'+
  '.pv-row i{font-style:normal;color:#6b6450}.pv-row span{font-weight:700;color:#2d4a3c;font-variant-numeric:tabular-nums;white-space:nowrap}.pv-none{color:#9a8f73}'+
  '.pv-confirm{flex-basis:100%;padding:10px;border-radius:10px;border:0;background:#3f9aa6;color:#fff;font-weight:800;font-size:15px}'+
  '.skill-card.picked{border-color:#3f9aa6;box-shadow:0 0 0 3px #3f9aa666}'+
  '#skill-info{width:min(420px,92vw);max-height:84vh;overflow:auto;padding:18px 20px;border:0;border-radius:14px;background:#f4ead0;color:#2f3b30;box-sizing:border-box}#skill-info::backdrop{background:#233b3266}'+
  '#skill-info h3{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:17px}#skill-info h3 img{width:32px;height:32px;object-fit:contain}'+
  '.si-branches{display:grid;gap:4px;margin-bottom:8px;font-size:13px}.si-branches span{display:flex;justify-content:space-between;gap:10px}.si-branches i{font-style:normal}.si-branches b{color:#b9713d;letter-spacing:.04em;white-space:nowrap}'+
  '.si-mods,.si-dps{margin:6px 0;font-size:13px}.si-dps{font-weight:800;color:#2f6f78}.si-close{margin-top:12px;width:100%;padding:9px}'+
  'body.joy-right #joystick{left:auto;right:42px}body.joy-any #joystick{left:calc(50% - 52px);opacity:.45}body.joy-right #cast{right:auto;left:30px}'+
  '@media (min-width:960px){#boss-health{top:max(16px,env(safe-area-inset-top));width:clamp(220px,calc(100vw - 760px),420px)}}'+
  '@media (min-width:601px) and (max-width:959px){#boss-health{top:calc(max(16px,env(safe-area-inset-top)) + 174px);width:min(360px,50vw)}}'+
  // Start menu.
  '#start-menu{position:fixed;inset:0;z-index:20;display:grid;place-items:center;padding:16px;background:#1f3a2e73;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);transition:opacity .25s ease}'+
  '#start-menu.start-leaving{opacity:0;pointer-events:none}'+
  'body.start-open #hint,body.start-open #joystick,body.start-open #cast,body.start-open #fire-slot{visibility:hidden}'+
  '.start-card{width:min(420px,100%);max-height:calc(100dvh - 32px);overflow:auto;padding:26px 24px 20px;text-align:center;display:grid;gap:12px}'+
  '.start-kicker{margin:0;color:#58715f;font-size:13px;letter-spacing:.04em}'+
  '#start-title{margin:0;font-size:clamp(34px,8vw,46px);line-height:1.05;color:#233c36;letter-spacing:.01em}'+
  '#start-title span{color:#3f8fb0}'+
  '.start-tagline{margin:0 0 6px;color:#596953;font-size:14px}'+
  '#start-play{max-width:none;min-height:56px;font-size:20px;font-weight:700;color:#fff2d0;background:#bd551c;border:2px solid #efc579;border-radius:14px;box-shadow:0 4px #733d1e}'+
  '#start-play:active{transform:translateY(2px);box-shadow:0 2px #733d1e}'+
  '#start-hell,.hell-button{max-width:none;min-height:44px;font-size:15px;font-weight:800;color:#ffe7d6;background:#7a2318;border:2px solid #d9653f;border-radius:12px;box-shadow:0 3px #4a130d}#start-hell:disabled{opacity:.45}'+
  'body.hell #clock{background:#6b1f16;border-color:#d9653f}body.hell #clock b{color:#ffe1cf}body.hell #clock s{background:linear-gradient(90deg,#ff8a4c,#ff3b1f)}'+
  '.to-menu{width:100%;margin:10px 0 4px;min-height:44px;font-weight:700}.to-menu[data-armed]{background:#bd551c;color:#fff2d0;border-color:#efc579}'+
  '#start-play:disabled{background:#a7896a;color:#f6ead0;box-shadow:0 4px #6b5540;cursor:progress}'+
  '.start-load{margin:0;min-height:1.2em;font-size:13px;color:#5b6a52;text-align:center}.start-load.start-error{color:#8a2f22;font-weight:700}'+
  '.start-secondary{max-width:none;min-height:44px;font-size:15px;color:#233c36;background:#efe4c8;border:1px solid #b6b699;border-radius:12px}'+
  '#start-howto{text-align:left;background:#efe4c8;border:1px solid #b6b699;border-radius:12px;padding:10px 14px;font-size:14px;color:#233c36}'+
  '#start-howto summary{cursor:pointer;font-weight:700;text-align:center;list-style-position:inside}'+
  '#start-howto ul{margin:10px 0 2px;padding-left:18px;display:grid;gap:6px;line-height:1.45}'+
  '@media (max-width:600px){'+
  '.title{max-width:min(58vw,220px);padding:8px 11px;gap:2px}.title small{display:none}.title strong{font-size:15px}'+
  '#status{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#health-text,#level-text{font-size:10.5px}'+
  '#health{height:8px}#experience{height:6px}progress{margin:3px 0}'+
  '#fire-slot{flex-wrap:nowrap;align-items:center}'+
  '#boss-health{top:calc(max(10px,env(safe-area-inset-top)) + 134px);left:max(10px,env(safe-area-inset-left));transform:none;width:calc(100vw - 132px)}'+ // under the panel, clear of the button column (buttons, clock, FPS)
  '#clock{order:3;min-width:78px;padding:4px 10px 6px}#clock b{font-size:18px}'+
  'body.joy-right #joystick{left:auto;right:24px}body.joy-any #joystick{left:calc(50% - 47px)}body.joy-right #cast{right:auto;left:12px}'+
  '.equipped-skill{font-size:11px;padding-right:8px;white-space:nowrap}.equipped-skill img{width:26px;height:26px}.equipped-skill.empty{width:30px;height:30px}'+
  '}</style>';

// Start menu shown once per page load, above the opening skill choice (the game is already
// paused while that choice is open, so no game logic changes). Automated browsers skip it
// unless ?menu=1 is set, so existing regression suites keep their direct card clicks.
const MENU='<div id="start-menu" role="dialog" aria-modal="true" aria-labelledby="start-title"><div class="start-card paper">'+
  '<p class="start-kicker">ทุ่งหญ้า · รอบละ 10 นาที</p><h1 id="start-title">Slime <span>Evolution</span></h1>'+
  '<p class="start-tagline">สไลม์ตัวน้อยเติบโตด้วยสกิลที่คุณเลือก</p>'+
  '<button id="start-play" type="button">เริ่มเกม</button>'+
  '<button id="start-hell" type="button">โหมด HELL · มอนสูงสุด 100</button>'+
  '<details id="start-howto"><summary>วิธีเล่น</summary><ul>'+
  '<li id="howto-move">ลากนิ้วฝั่งซ้ายของจอเพื่อเดิน หรือใช้ WASD / ปุ่มลูกศร</li>'+
  '<li>สกิลร่ายเองอัตโนมัติ เลเวลขึ้นแล้วเลือกการ์ดอัปเกรด ใส่ได้ 3 สกิล</li>'+
  '<li>เก็บ EXP จากสัตว์ที่ล้ม ระวัง Elite ที่มีดาว ★ และ Bamboo Panda</li>'+
  '<li>อยู่รอดครบ 10 นาที แล้วล้ม Ancient Bloom Colossus เพื่อชนะ</li>'+
  '</ul></details>'+
  '<button id="start-settings" type="button" class="start-secondary">ตั้งค่า</button>'+
  '</div></div>';
const MENU_SCRIPT='<script>(()=>{const m=document.getElementById("start-menu");if(!m)return;'+
  'if(navigator.webdriver&&!new URLSearchParams(location.search).has("menu")){m.remove();return}'+
  'document.body.classList.add("start-open");'+
  'const close=()=>{m.classList.add("start-leaving");document.body.classList.remove("start-open");setTimeout(()=>m.remove(),260);'+
  'setTimeout(()=>document.querySelector(".skill-card")?.focus({preventScroll:true}),280)};'+
  // Loading state (owner report: on an Android phone the menu appeared but Start led to an empty screen). The menu shows
  // before the game has loaded, so Start waits, counting the scene textures, until the first cards exist; an init error is
  // shown in the menu (it used to sit behind it) with a reload button, and a slow load says it is still going.
  'const play=document.getElementById("start-play"),note=document.createElement("p");note.id="start-load";note.className="start-load";play.after(note);'+
  'const scene=/assets\\/scene\\/|grass-original/,t0=Date.now(),tick=()=>{if(!m.isConnected)return;'+
  'const err=document.getElementById("error");if(err&&!err.hidden&&err.textContent){play.disabled=false;play.textContent="โหลดใหม่";play.onclick=()=>location.reload();note.textContent=err.textContent+" (ลองโหลดใหม่ หรือเปิดด้วย Chrome หรือ Safari รุ่นล่าสุด)";note.classList.add("start-error");return}'+
  'if(document.querySelector(".skill-card")){play.disabled=false;play.textContent="เริ่มเกม";note.textContent="";return}'+
  'const done=performance.getEntriesByType("resource").filter(e=>scene.test(e.name)).length;play.disabled=true;play.textContent="กำลังโหลด "+Math.min(7,done)+"/7";'+
  'note.textContent=Date.now()-t0>20000?"เน็ตช้า กำลังโหลดต่อ… รอสักครู่":"";setTimeout(tick,250)};tick();'+
  'play.onclick=()=>play.disabled||close();'+
  // HELL (owner request): same readiness as Start; starts a fresh normal round with the Hell flag set.
  'const hell=document.getElementById("start-hell");new MutationObserver(()=>{hell.disabled=play.disabled||play.textContent!=="เริ่มเกม"}).observe(play,{attributes:true,childList:true,characterData:true,subtree:true});hell.disabled=true;'+
  'hell.onclick=()=>{if(hell.disabled)return;globalThis.__slimeHellNext=true;document.getElementById("normal-run").click();close()};'+
  'document.getElementById("start-settings").onclick=()=>document.getElementById("settings").click();'+
  'play.focus({preventScroll:true})})()</script>';

// Joystick side (owner request 2026-09-27): Settings > กราฟิก > ปุ่มเดิน picks left (default), right, or anywhere on the
// screen. Saved per device. The game's own pointerdown asks __joyBlocked(x) whether a touch may start the stick; in the skill
// lab (its panel covers one side) a drag anywhere walks.
const JOY_SCRIPT='<script>(()=>{const K="slime.joystick.v1",modes={left:["ฝั่งซ้าย","ลากฝั่งซ้ายเพื่อเดิน","ลากนิ้วฝั่งซ้ายของจอเพื่อเดิน"],right:["ฝั่งขวา","ลากฝั่งขวาเพื่อเดิน","ลากนิ้วฝั่งขวาของจอเพื่อเดิน"],any:["ตรงไหนก็ได้","ลากตรงไหนก็ได้เพื่อเดิน","ลากนิ้วตรงไหนก็ได้บนจอเพื่อเดิน"]};'+
  'let mode="left";try{mode=localStorage.getItem(K)||"left"}catch{}if(!modes[mode])mode="left";'+
  'globalThis.__joyBlocked=x=>document.body.classList.contains("lab-active")?false:mode==="right"?x<innerWidth*.45:mode==="any"?false:x>innerWidth*.55;'+
  'const apply=()=>{document.body.classList.remove("joy-left","joy-right","joy-any");document.body.classList.add("joy-"+mode);'+
  'const h=document.getElementById("hint");if(h&&h.firstChild)h.firstChild.textContent=modes[mode][1]+" · WASD / ปุ่มลูกศร";'+
  'const m=document.getElementById("howto-move");if(m)m.textContent=modes[mode][2]+" หรือใช้ WASD / ปุ่มลูกศร";const sel=document.getElementById("joy-mode");if(sel)sel.value=mode};'+
  'apply();document.getElementById("joy-mode")?.addEventListener("change",e=>{mode=modes[e.target.value]?e.target.value:"left";try{localStorage.setItem(K,mode)}catch{}apply()})})()</script>';

const HTML_EDITS=[
  ['page title','<title>Slime — ฉากทดลองเว็บ</title>','<title>Slime Evolution</title>'],
  ['header title','<small>SLIME · FIRE & SOULS</small><strong>ทุ่งหญ้า Slime</strong>','<small>ทุ่งหญ้า</small><strong>Slime Evolution</strong><span id="stage-line"></span>'],
  ['round clock','<div class="right">','<div class="right"><div id="clock" class="paper" hidden aria-label="เวลาในรอบ"><b>00:00</b><i><s></s></i></div>'],
  ['hud style','</head>',STYLE+'</head>'],
  ['start menu','<body>','<body>'+MENU],
  // HELL mode in Settings, next to the normal round (owner request): the pacing director reads world.hell.
  ['hell run button','<button id="normal-run">เริ่มรอบปกติ · 10 นาที</button>','<button id="normal-run">เริ่มรอบปกติ · 10 นาที</button><button id="hell-run" class="hell-button" onclick="globalThis.__slimeHellNext=true;document.getElementById(\'normal-run\').click()">โหมด HELL · มอนสูงสุด 100</button>'],
  ['joystick setting','<label class="check"><input id="show-fps" type="checkbox">แสดง FPS ขณะเล่น</label>','<label class="check"><input id="show-fps" type="checkbox">แสดง FPS ขณะเล่น</label><label for="joy-mode">ปุ่มเดิน (จอสัมผัส)<select id="joy-mode"><option value="left">ฝั่งซ้าย</option><option value="right">ฝั่งขวา</option><option value="any">แตะตรงไหนก็ได้</option></select></label>'],
  // Back to the start menu (owner request: the Android app has no browser reload). Two taps, since it ends the round; it
  // reloads the page, which shows the start menu again. No confirm() dialog: the app's WebView does not show one.
  ['menu button','<button id="graphics-reset">คืนค่ากราฟิก</button><button id="fullscreen">เต็มจอ</button></div>','<button id="graphics-reset">คืนค่ากราฟิก</button><button id="fullscreen">เต็มจอ</button></div><button id="to-menu" class="to-menu" type="button" onclick="if(this.dataset.armed){location.reload()}else{this.dataset.armed=1;this.textContent=\'แตะอีกครั้งเพื่อกลับเมนูหลัก (รอบนี้จะจบ)\';setTimeout(()=>{delete this.dataset.armed;this.textContent=\'กลับเมนูหลัก\'},4000)}">กลับเมนูหลัก</button>'],
  ['start menu script','<div id="error" class="paper" hidden></div></body>','<div id="error" class="paper" hidden></div>'+JOY_SCRIPT+MENU_SCRIPT+'</body>'],
];

function replaceOne(source,[label,from,to]){
  const count=source.split(from).length-1;
  if(count!==1)throw Error(`${label}: expected exactly one baseline, found ${count}`);
  return source.replace(from,()=>to);
}
export function applyHudPolish(bundle,html){
  return {bundle:BUNDLE_EDITS.reduce(replaceOne,bundle),html:HTML_EDITS.reduce(replaceOne,html)};
}
