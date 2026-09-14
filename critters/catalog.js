// Approved EXP appearance bands: exactly three visual sets, three animals per set.
// Reward values are never rounded or changed; only the sprite/scale follows the stored EXP amount.
export const EXP_SETS = Object.freeze([
  Object.freeze({min:1,max:9,size:.18,name:'LOW EXP',animals:Object.freeze(['กบเล็ก','แมลงใบไม้เล็ก','กระต่ายเล็ก'])}),
  Object.freeze({min:10,max:19,size:.22,name:'MID EXP',animals:Object.freeze(['นกกลม','กระรอก','เม่นน้อย'])}),
  Object.freeze({min:20,max:Infinity,size:.26,name:'HIGH EXP',animals:Object.freeze(['กวางน้อย','เต่าน้อย','แพนด้าจิ๋ว'])})
]);
export function expTier(value){
  const xp=Number.isFinite(value)?Math.max(0,value):0;
  return xp>=20?2:xp>=10?1:0;
}
export function syncExpAppearance(o,c){
  if(o.kind)return c;
  const tier=expTier(o.value),set=EXP_SETS[tier],seed=Number.isFinite(c.seed)?c.seed:0;
  const form=Math.max(0,Math.min(2,Math.floor(seed*3)));
  c.expTier=tier;c.expForm=form;c.expSize=set.size;c.expValue=o.value;
  return c;
}
