import {BRANCHES,EVOS,MODS} from './fire-combat.js';
export function mountFireUI(combat,world,onChoose){
 const modal=document.createElement('section');modal.id='skill-choice';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','choice-title');document.body.append(modal);
 let revision=-1;
 function sync(){
  document.getElementById('experience').max=combat.needed;document.getElementById('experience').value=combat.level>=50?combat.needed:combat.xp;
  document.getElementById('level-text').textContent=`LV ${combat.level} · EXP ${Math.floor(combat.xp)} / ${combat.needed}`;
  document.getElementById('fire-slot').textContent=`${combat.evo?EVOS[combat.evo]+' · EVO':'INFERNO · LV '+combat.fireLevel} · ระเบิด ${combat.branches.blast}/4 · สะเก็ด ${combat.branches.scatter}/4 · เผา ${combat.branches.burn}/4`;
  document.getElementById('cast').textContent=combat.choosing?'เลือกการ์ด':combat.cooldown>0?`ร่ายใน ${combat.cooldown.toFixed(1)} วิ`:'พร้อมร่าย · อัตโนมัติ';
  if(revision===combat.revision)return;revision=combat.revision;modal.hidden=!combat.choosing;if(modal.hidden)return;
  modal.replaceChildren();const box=document.createElement('div');box.className='choice-paper paper';modal.append(box);
  const title=document.createElement('h2');title.id='choice-title';title.textContent=combat.opening?'เลือกแขนงเริ่มต้น · Inferno':combat.cards[0]?.startsWith('evo:')?'เลือกวิวัฒนาการสายไฟ':`เลเวล ${combat.level+1} · เลือกอัปเกรด`;box.append(title);
  const subtitle=document.createElement('p');subtitle.textContent=combat.opening?'ลูกไฟโจมตีอัตโนมัติ · เลือกแนวทางการเล่น':combat.cards[0]?.startsWith('evo:')?'เปลี่ยน Inferno เป็นสกิลวิวัฒนาการหนึ่งแบบ':'แต่ละแขนงสูงสุด LV4 · Inferno LV10 ปลดล็อกวิวัฒนาการ';box.append(subtitle);
  const cards=document.createElement('div');cards.className='skill-cards';box.append(cards);
  for(const id of combat.cards){const card=document.createElement('button');card.className='skill-card';let name,desc,level;
   if(id.startsWith('evo:')){const path=id.slice(4);name=EVOS[path];desc={blast:'ชาร์จดวงไฟแล้วระเบิดหนักเป็นวงกว้าง',scatter:'ฝนอุกกาบาตหลายลูก กระแทกหลายจุด',burn:'พายุไฟไล่เข้าหาฝูงมอน ดึงและเผาต่อเนื่อง'}[path];level='วิวัฒนาการ';}
   else if(id.startsWith('mod:')){const key=id.slice(4);[name,desc]=MODS[key];level=`ม็อด LV ${combat.mods[key]+1} / 5`;}
   else if(id==='heal'){name='ฟื้นพลัง';desc='ฟื้น HP 20';level='ฟื้นฟู';}
   else{[name,desc]=BRANCHES[id];level=`LV ${combat.branches[id]+1} / 4`;if(combat.branches[id]===3)desc+=' · ปลดล็อก Mastery';}
   const tag=document.createElement('small');tag.textContent=level;const img=document.createElement('img');img.src='./assets/cards/inferno.png';img.alt='';img.draggable=false;const heading=document.createElement('strong');heading.textContent=name;const detail=document.createElement('span');detail.textContent=desc;card.append(tag,img,heading,detail);card.onclick=()=>{if(combat.choose(id,world)){onChoose();sync();}};cards.append(card);
  }
  if(!combat.opening&&!combat.cards[0]?.startsWith('evo:')){const reroll=document.createElement('button');reroll.textContent=`สุ่มใหม่ · เหลือ ${combat.rerolls}`;reroll.disabled=combat.rerolls===0;reroll.onclick=()=>{combat.reroll();sync();};box.append(reroll);}
  if(combat.opening){const test=document.createElement('button');test.className='choice-test';test.textContent='ลองสกิลทั้งหมดก่อนเล่น';test.onclick=()=>document.getElementById('skill-test').click();box.append(test);}
  cards.firstElementChild?.focus({preventScroll:true});
 }
 return {sync};
}
