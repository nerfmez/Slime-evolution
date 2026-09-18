// Unknown/boss drops keep the legacy visual bands. Normal and elite enemies carry sourceType.
export const EXP_SETS = Object.freeze([
  Object.freeze({min:1,max:9,size:.18,name:'LOW EXP',animals:Object.freeze(['กบเล็ก','แมลงใบไม้เล็ก','กระต่ายเล็ก'])}),
  Object.freeze({min:10,max:19,size:.22,name:'MID EXP',animals:Object.freeze(['นกกลม','กระรอก','เม่นน้อย'])}),
  Object.freeze({min:20,max:Infinity,size:.26,name:'HIGH EXP',animals:Object.freeze(['กวางน้อย','เต่าน้อย','แพนด้าจิ๋ว'])})
]);
export const SPECIES_EXP_SIZE=Object.freeze({thorn:.20,spark:.22,turtle:.245,water:.235,panda:.26});
export function expTier(value){const xp=Number.isFinite(value)?Math.max(0,value):0;return xp>=20?2:xp>=10?1:0;}
export function syncExpAppearance(o,c){
  if(o.kind)return c;
  if(o.sourceType&&SPECIES_EXP_SIZE[o.sourceType]){c.sourceType=o.sourceType;c.expTier=-1;c.expForm=0;c.expValue=o.value;c.expSize=SPECIES_EXP_SIZE[o.sourceType]*(o.sourceElite?1.08:1);return c;}
  const tier=expTier(o.value),set=EXP_SETS[tier],seed=Number.isFinite(c.seed)?c.seed:0,form=Math.max(0,Math.min(2,Math.floor(seed*3)));
  c.sourceType=null;c.expTier=tier;c.expForm=form;c.expSize=set.size;c.expValue=o.value;return c;
}
