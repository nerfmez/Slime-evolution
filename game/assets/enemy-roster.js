/** Active species only. Keep unlock times explicit: deleting a species must not
 * bring another one forward in time. `thorn` is the existing Moss Frog ID. */
export const normalEnemies = Object.freeze({
  thorn: Object.freeze({name:'Moss Frog',stride:.42,speed:1.18,radius:.3,hp:18,damage:5}),
  water: Object.freeze({name:'Water Calf',speed:.85,radius:.37,hp:28,damage:6})
});
export const eliteEnemies = Object.freeze({
  water: Object.freeze({name:'Water Calf Alpha',hp:314,speed:1.01,radius:.518,damage:23,xp:30,scale:1.55})
});
export const spawnSchedule = Object.freeze({thorn:0,water:180});
export const modelAssetNames = Object.freeze(['boss_walk','boss_run','boss_charge','boss_push','boss_spell']);
const own = (object,key) => Object.hasOwn(object,key);
export function normalizeEnemyMode(mode) {
  if (typeof mode !== 'string') return 'auto';
  if (['auto','all','boss','elites'].includes(mode) || own(normalEnemies,mode)) return mode;
  if (mode.startsWith('elite-') && own(eliteEnemies,mode.slice(6))) return mode;
  return 'auto';
}
export function unlockedEnemies(mode,time=0) {
  mode=normalizeEnemyMode(mode);
  if(mode==='boss') return ['boss'];
  if(mode==='elites') return Object.keys(eliteEnemies);
  if(mode.startsWith('elite-')) return [mode.slice(6)];
  if(mode==='all') return Object.keys(normalEnemies);
  if(mode!=='auto') return [mode];
  const seconds=Number.isFinite(time)?Math.max(0,time):0;
  return Object.keys(normalEnemies).filter(id=>seconds>=spawnSchedule[id]);
}
export function spriteCamera(mode) {
  return mode==='side'?[0,4,18]:mode==='top'?[0,21,.1]:[0,12,15];
}
