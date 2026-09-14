// Appearance tiers only. Never round, replace, multiply or split a drop's reward value.
// Thresholds match the uploaded release: four normal, four Alpha and one boss EXP value.
export const EXP_SETS = Object.freeze([
  {xp:2, size:.200, name:'ตัวจิ๋วในหญ้า', animals:['หนอนใบไม้','ด้วงเมล็ด','จิ้งหรีด']},
  {xp:5, size:.225, name:'เพื่อนริมบึง', animals:['กบใบไม้','กิ้งก่าหญ้า','ลูกเจี๊ยบ']},
  {xp:6, size:.245, name:'นักหาเมล็ด', animals:['หนูทุ่ง','นกกระจอก','ปูใบไม้']},
  {xp:10,size:.265, name:'นักกระโดดพงหญ้า', animals:['กระต่ายทุ่ง','กระรอก','เม่นจิ๋ว']},
  {xp:12,size:.285, name:'ชาวพื้นป่า', animals:['เต่ามอส','ตัวตุ่น','ชิปมังก์']},
  {xp:15,size:.305, name:'ขนฟูนุ่ม', animals:['ชินชิลลา','เฟอเร็ต','นกกระทา']},
  {xp:18,size:.330, name:'นักสำรวจป่า', animals:['จิ้งจอกเฟนเนก','แรคคูน','แพนด้าแดง']},
  {xp:30,size:.360, name:'ผู้พิทักษ์ตัวน้อย', animals:['ลูกกวางใบไม้','ลูกหมูป่า','ลูกนกฮูก']},
  {xp:56,size:.395, name:'สัตว์แฟนตาซีจิ๋ว', animals:['ลูกมังกรป่า','ลูกกริฟฟิน','ลูกคิริน']}
].map(s=>Object.freeze({...s,animals:Object.freeze(s.animals)})));
export const EXP_VARIANT_START = 6; // IDs 3/4/5 remain reserved for heal/magnet/nova.
export function expTier(value){
  const xp=Number.isFinite(value)?Math.max(0,value):0;
  let tier=0;for(let i=1;i<EXP_SETS.length&&xp>=EXP_SETS[i].xp;i++)tier=i;
  return tier;
}
export function syncExpAppearance(o,c){
  if(o.kind||c.expValue===o.value)return c;
  const tier=expTier(o.value),set=EXP_SETS[tier];
  const seed=Number.isFinite(c.seed)?c.seed:0;
  const form=Math.max(0,Math.min(2,Math.floor(seed*3)));
  c.variant=EXP_VARIANT_START+tier*3+form;c.expTier=tier;c.expForm=form;
  c.expSize=set.size;c.expValue=o.value;
  return c;
}
