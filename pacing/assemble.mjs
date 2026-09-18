/** Static, fail-closed integration into the current Panda baseline only.
 * Never fetches/rebuilds an older release; never mutates game/ while building.
 * The source and complete generated runtime are independently hash-locked.
 */
import {createHash} from 'node:crypto';
export const sha256 = s => createHash('sha256').update(s).digest('hex');
export function replacements(source,edits,reverse=false) {
  const list=reverse?[...edits].reverse():edits;
  for(const [label,oldText,newText] of list){
    const from=reverse?newText:oldText,to=reverse?oldText:newText;
    const count=source.split(from).length-1;
    if(count!==1)throw Error(`${label}: expected exactly one ${reverse?'new':'original'} hook, found ${count}`);
    source=source.replace(from,to);
  }
  return source;
}
export function bundleEdits(source) {
  const start=source.indexOf('let i=this.unlocked(),a=this.mode===`panda`');
  const end=source.indexOf('for(let n of this.enemies){if(n.hp<=0)',start);
  if(start<0||end<start)throw Error('Current Panda spawn block missing; do not substitute another baseline');
  const spawn=source.slice(start,end);
  return [
    ['import','import {miniBossEnemies',"import {resetEncounter,tickEncounter,encounterStats,encounterRoster,encounterStatus} from './encounter-director.js';\nimport {miniBossEnemies"],
    ['stat lookup','function pt(e){return e.boss?we:e.elite?Te[e.type]:ft[e.type]}','function pt(e){return e.cozyStats||(e.boss?we:e.elite?Te[e.type]:ft[e.type])}'],
    ['reset','resetPandaWorld(this)}random()','resetPandaWorld(this);resetEncounter(this)}random()'],
    ['unlocks','unlocked(){return unlockedEnemies(this.mode,this.time)}','unlocked(){return this.mode===`auto`?encounterRoster(this.time):unlockedEnemies(this.mode,this.time)}'],
    ['spawn stats','spawn(e,t,n=!1){let r=t===`boss`,i=r?we:n?Te[t]:ft[t];if(!i)return!1;','spawn(e,t,n=!1){let r=t===`boss`,i=r?we:n?Te[t]:ft[t];if(!i)return!1;if(this.mode===`auto`)i=encounterStats(this.time,i,t,n,r);'],
    ['instance stats','miniBoss:t===`panda`,scale:i.scale||1,maxHP:i.hp,','miniBoss:t===`panda`,cozyStats:this.mode===`auto`?i:null,scale:i.scale||1,maxHP:i.hp,'],
    ['director',spawn,'if(this.mode===`auto`){tickEncounter(this,e,t,n)}else{'+spawn+'}'],
    ['HUD','`ด่าน 1 · ${t} / 05:00`','(J.mode===`auto`?`ด่าน 1 · ${t} / 10:00 · ${encounterStatus(J)}`:`ทดสอบ · ${t} / 05:00`)'],
  ];
}
export function htmlEdits() {
  const old='<select id="start-minute"><option value="0">นาที 1</option><option value="60">นาที 2</option><option value="120">นาที 3</option><option value="180">นาที 4</option><option value="240">นาที 5</option><option value="300">เข้าบอสทันที</option></select>';
  const times=Array.from({length:10},(_,i)=>`<option value="${i*60}">${i}:00</option>`).join('');
  return [
    ['clock menu',old,`<select id="start-minute">${times}<option value="600">10:00 · เข้าบอส</option></select>`],
    ['mode label','<option value="auto">ทยอยตามเวลา</option>','<option value="auto">ป่ามีชีวิต · รอบ 10 นาที</option>'],
    ['normal button','<button id="normal-run">เริ่มรอบปกติ</button>','<button id="normal-run">เริ่มรอบปกติ · 10 นาที</button>'],
    ['cap help','ใช้ค่าที่เลือกเมื่อเริ่มรอบใหม่เท่านั้น','รอบปกติสลับต่อสู้–พัก มอนสูงสุด 6–28 ตัวตามช่วง · จำนวนด้านบนเป็นเพดานทดสอบ · ใช้ค่าเมื่อเริ่มรอบใหม่'],
  ];
}
export function assemble(bundle,html) {
  const edits=bundleEdits(bundle);
  const js=replacements(bundle,edits),index=replacements(html,htmlEdits());
  if(replacements(js,edits,true)!==bundle||replacements(index,htmlEdits(),true)!==html)throw Error('Pacing integration failed exact reversal');
  return {bundle:js,html:index,edits};
}
