// Build-time HUD polish. Presentation only: no combat, pacing, art or save data changes.
export const HUD_POLISH_VERSION='hud-polish-v1';

const ELITE_OLD='for(let e of J.enemies){if(!e.elite||e.hp<=0)continue;let a=({thorn:1.95,spark:1.08,turtle:1.25,water:1.38}[e.type]||1.15)*(e.scale||1),[o,s]=proj(e.x,a,e.z),c=Math.max(66,Math.min(104,74*(e.scale||1))),l=7,u=s-16,d=Math.max(0,Math.min(1,e.hp/Math.max(1,e.maxHP||e.hp)));r.font=`700 12px system-ui`,r.lineWidth=3,r.strokeStyle=`rgba(54,37,26,.9)`,r.fillStyle=`#fff4d7`,r.strokeText(pt(e).name,o,u-5),r.fillText(pt(e).name,o,u-5),r.fillStyle=`rgba(45,31,25,.88)`,r.fillRect(o-c/2-2,u-2,c+4,l+4),r.fillStyle=`#f1dfbb`,r.fillRect(o-c/2,u,c,l),r.fillStyle=d>.35?`#e74e47`:`#d43d3d`,r.fillRect(o-c/2,u,c*d,l),r.strokeStyle=`rgba(86,50,32,.9)`,r.lineWidth=1,r.strokeRect(o-c/2,u,c,l)}';
// Compact paper tags sized from measured text (fonts differ per OS; left-aligned from m.width because WebKit reports ink left/right differently under center alignment): star + roster name, HP only once damaged, stacked instead of overlapping, faded over the player.
const ELITE_NEW='{const tags=[],placed=[],[px,py]=proj(W.player[0],.45,W.player[2]);for(let e of J.enemies){if(!e.elite||e.hp<=0)continue;let a=({thorn:1.95,spark:1.08,turtle:1.25,water:1.38}[e.type]||1.15)*(e.scale||1),[o,s]=proj(e.x,a,e.z);tags.push({e,x:o,y:s-22})}tags.sort((a,b)=>b.y-a.y);r.font=`700 11px system-ui,sans-serif`,r.textAlign=`left`,r.textBaseline=`alphabetic`,r.lineWidth=1;for(let g of tags){let e=g.e,label=`★ `+pt(e).name,d=Math.max(0,Math.min(1,e.hp/Math.max(1,e.maxHP||e.hp))),hurt=d<.999,m=r.measureText(label),asc=m.actualBoundingBoxAscent||9,desc=m.actualBoundingBoxDescent||3,tw=m.width,th=asc+desc,w=Math.max(tw+16,hurt?60:0),h=th+(hurt?14:9),x=g.x,y=g.y;for(let k=0;k<6;k++){let hit=placed.find(p=>Math.abs(p.x-x)<(p.w+w)/2&&Math.abs(p.y-y)<(p.h+h)/2);if(!hit)break;y=hit.y-(hit.h+h)/2-2}placed.push({x,y,w,h});let top=y-h/2;r.globalAlpha=Math.abs(px-x)<w/2+18&&Math.abs(py-y)<h/2+28?.38:1,r.beginPath(),r.roundRect?r.roundRect(x-w/2,top,w,h,9):r.rect(x-w/2,top,w,h),r.fillStyle=`rgba(247,240,220,.92)`,r.fill(),r.strokeStyle=`rgba(120,96,64,.55)`,r.stroke(),r.fillStyle=`#35483a`,r.fillText(label,x-tw/2,top+4.5+asc);if(hurt){let bw=w-14,bx=x-bw/2,by=top+th+7.5;r.fillStyle=`#ddd3b6`,r.fillRect(bx,by,bw,4),r.fillStyle=d>.35?`#bd6658`:`#a8402f`,r.fillRect(bx,by,bw*d,4)}}r.textAlign=`center`,r.globalAlpha=1}';

const BUNDLE_EDITS=[
  ['elite tags',ELITE_OLD,ELITE_NEW],
  // The movement hint retires once the player has actually moved.
  ['hint retire','B(`retry`).hidden=J.hp>0&&!J.finished,','W.moving&&B(`hint`)?.classList.add(`hint-done`),B(`retry`).hidden=J.hp>0&&!J.finished,'],
  ['empty skill slot','}else i.textContent=`ช่องสกิลว่าง`;t.append(i)','}else i.classList.add(`empty`),i.title=`ช่องสกิลว่าง`,i.setAttribute(`aria-label`,`ช่องสกิลว่าง`),i.textContent=`+`;t.append(i)'],
];

const STYLE='<style id="hud-polish">'+
  '#experience{height:8px}#experience::-webkit-progress-bar{background:#cfc8a8}#experience::-webkit-progress-value{background:#3f9aa6}#experience::-moz-progress-bar{background:#3f9aa6}'+
  '#level-text{color:#2f6f78}.title small{letter-spacing:.04em}'+
  '#hint{transition:opacity .8s ease}#hint.hint-done{opacity:0}'+
  '.equipped-skill.empty{width:22px;height:22px;box-sizing:border-box;border:1.5px dashed #b3a988;border-radius:50%;display:inline-grid;place-items:center;color:#a39a78;font-size:14px;line-height:1}'+
  // Boss banner: compact everywhere; on wide screens it sits in the top row between the HUD and the buttons.
  '#boss-health{padding:6px 14px}#boss-health strong{font-size:11px}#boss-health progress{height:8px;margin:4px 0}#boss-health small{font-size:10px}'+
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
  '.start-secondary{max-width:none;min-height:44px;font-size:15px;color:#233c36;background:#efe4c8;border:1px solid #b6b699;border-radius:12px}'+
  '#start-howto{text-align:left;background:#efe4c8;border:1px solid #b6b699;border-radius:12px;padding:10px 14px;font-size:14px;color:#233c36}'+
  '#start-howto summary{cursor:pointer;font-weight:700;text-align:center;list-style-position:inside}'+
  '#start-howto ul{margin:10px 0 2px;padding-left:18px;display:grid;gap:6px;line-height:1.45}'+
  '@media (max-width:600px){'+
  '.title{max-width:min(58vw,220px);padding:8px 11px;gap:2px}.title small{display:none}.title strong{font-size:15px}'+
  '#status{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#health-text,#level-text{font-size:10.5px}'+
  '#health{height:8px}#experience{height:6px}progress{margin:3px 0}'+
  '#fire-slot{flex-wrap:nowrap;align-items:center}'+
  '#boss-health{top:calc(max(10px,env(safe-area-inset-top)) + 134px)}'+
  '}</style>';

// Start menu shown once per page load, above the opening skill choice (the game is already
// paused while that choice is open, so no game logic changes). Automated browsers skip it
// unless ?menu=1 is set, so existing regression suites keep their direct card clicks.
const MENU='<div id="start-menu" role="dialog" aria-modal="true" aria-labelledby="start-title"><div class="start-card paper">'+
  '<p class="start-kicker">ทุ่งหญ้า · รอบละ 10 นาที</p><h1 id="start-title">Slime <span>Evolution</span></h1>'+
  '<p class="start-tagline">สไลม์ตัวน้อยเติบโตด้วยสกิลที่คุณเลือก</p>'+
  '<button id="start-play" type="button">เริ่มเกม</button>'+
  '<details id="start-howto"><summary>วิธีเล่น</summary><ul>'+
  '<li>ลากนิ้วฝั่งซ้ายของจอเพื่อเดิน หรือใช้ WASD / ปุ่มลูกศร</li>'+
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
  'document.getElementById("start-play").onclick=close;'+
  'document.getElementById("start-settings").onclick=()=>document.getElementById("settings").click();'+
  'document.getElementById("start-play").focus({preventScroll:true})})()</script>';

const HTML_EDITS=[
  ['page title','<title>Slime — ฉากทดลองเว็บ</title>','<title>Slime Evolution</title>'],
  ['header title','<small>SLIME · FIRE & SOULS</small><strong>ทุ่งหญ้า Slime</strong>','<small>ทุ่งหญ้า</small><strong>Slime Evolution</strong>'],
  ['hud style','</head>',STYLE+'</head>'],
  ['start menu','<body>','<body>'+MENU],
  ['start menu script','<div id="error" class="paper" hidden></div></body>','<div id="error" class="paper" hidden></div>'+MENU_SCRIPT+'</body>'],
];

function replaceOne(source,[label,from,to]){
  const count=source.split(from).length-1;
  if(count!==1)throw Error(`${label}: expected exactly one baseline, found ${count}`);
  return source.replace(from,()=>to);
}
export function applyHudPolish(bundle,html){
  return {bundle:BUNDLE_EDITS.reduce(replaceOne,bundle),html:HTML_EDITS.reduce(replaceOne,html)};
}
