/** Runtime elite expansion. Ordinary roster remains byte-identical in game/. */
export const normalEnemies = Object.freeze({
  thorn: Object.freeze({name:'Moss Frog',stride:.42,speed:1.18,radius:.3,hp:18,damage:5}),
  spark: Object.freeze({name:'Spark Hedgehog',stride:.74,speed:1.42,radius:.30,hp:22,damage:6}),
  turtle: Object.freeze({name:'Pond Turtle',stride:.92,speed:.64,radius:.42,hp:44,damage:5}),
  water: Object.freeze({name:'Water Calf',speed:.85,radius:.37,hp:28,damage:6})
});
export const miniBossEnemies = Object.freeze({panda:Object.freeze({name:'Bamboo Panda',stride:1.1,speed:.78,radius:.62,hp:480,damage:12,xp:45})});
export const eliteEnemies = Object.freeze({
  thorn: Object.freeze({name:'Moss Frog Elite',stride:.42,hp:190,speed:1.08,radius:.40,damage:9,xp:42,scale:1.34}),
  spark: Object.freeze({name:'Spark Hedgehog Elite',stride:.74,hp:230,speed:1.34,radius:.40,damage:10,xp:50,scale:1.34}),
  turtle: Object.freeze({name:'Pond Turtle Elite',stride:.92,hp:360,speed:.60,radius:.55,damage:8,xp:62,scale:1.32}),
  water: Object.freeze({name:'Water Calf Alpha',hp:314,speed:1.01,radius:.518,damage:23,xp:60,scale:1.55})
});
export const spawnSchedule = Object.freeze({thorn:0,spark:60,turtle:120,water:180});
export const modelAssetNames = Object.freeze(['boss_walk','boss_run','boss_charge','boss_push','boss_spell']);
const own=(object,key)=>Object.hasOwn(object,key);
export function normalizeEnemyMode(mode){
  if(typeof mode!=='string')return'auto';
  if(['auto','all','boss','elites'].includes(mode)||own(normalEnemies,mode)||own(miniBossEnemies,mode))return mode;
  if(mode.startsWith('elite-')&&own(eliteEnemies,mode.slice(6)))return mode;
  return'auto';
}
export function unlockedEnemies(mode,time=0){
  mode=normalizeEnemyMode(mode);
  if(mode==='boss')return['boss'];
  if(mode==='elites')return Object.keys(eliteEnemies);
  if(mode.startsWith('elite-'))return[mode.slice(6)];
  if(mode==='all')return Object.keys(normalEnemies);
  if(mode!=='auto')return[mode];
  const seconds=Number.isFinite(time)?Math.max(0,time):0;
  return Object.keys(normalEnemies).filter(id=>seconds>=spawnSchedule[id]);
}
export function spriteCamera(mode){return mode==='side'?[0,4,18]:mode==='top'?[0,21,.1]:[0,12,15];}
