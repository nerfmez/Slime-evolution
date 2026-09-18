/** Ten-minute Cozy pressure curve: enemies never switch fully off.
 * Lull phases reduce spawn pressure instead of creating empty no-spawn rests.
 * Times are simulation seconds: pausing/cards/growth never consume pacing time.
 */
export const PACING_VERSION = 'cozy-10min-v2';
export const RUN_SECONDS = 600;
export const UNLOCKS = Object.freeze({thorn:0,spark:120,turtle:240,water:360});
export const ELITE_EVENTS = Object.freeze([
  Object.freeze({time:95,type:'thorn',window:22}),
  Object.freeze({time:150,type:'thorn',window:22}),
  Object.freeze({time:205,type:'spark',window:22}),
  Object.freeze({time:255,type:'spark',window:22}),
  Object.freeze({time:395,type:'turtle',window:24}),
  Object.freeze({time:445,type:'turtle',window:24}),
  Object.freeze({time:535,type:'water',window:24}),
  Object.freeze({time:570,type:'water',window:24}),
]);
const rows = [
  [0,30,'lull','ป่าเริ่มเคลื่อนไหว',4,7,3.2,'thorn'],
  [30,75,'wave','กบในพงหญ้า',10,24,1.5,'thorn'],
  [75,105,'lull','จังหวะเบา',6,10,2.8,'thorn'],
  [105,150,'wave','ฝูงกบและเม่น',14,32,1.15],
  [150,180,'lull','เสียงป่ากลับมา',8,12,2.5],
  [180,230,'wave','สิ่งมีชีวิตในป่า',18,42,.9],
  [230,260,'lull','แนวป่าบางลง',10,14,2.2],
  [260,300,'wave','ฝูงก่อนผู้พิทักษ์',22,50,.75],
  [300,330,'panda','แพนด้าป่า',12,18,1.6],
  [330,365,'lull','เก็บ EXP ระหว่างทาง',12,16,1.9],
  [365,420,'wave','ลูกช้างน้ำและฝูงป่า',26,58,.62,'water'],
  [420,450,'lull','ลมหายใจของป่า',14,18,1.7],
  [450,480,'wave','ฝูงหนาแน่น',30,65,.52],
  [480,510,'panda','แพนด้าผู้พิทักษ์',16,20,1.4],
  [510,545,'lull','ช่วงเบาก่อนท้ายรอบ',16,20,1.5],
  [545,580,'wave','ฝูงใหญ่ครั้งสุดท้าย',36,75,.42],
  [580,600,'lull','แรงกดดันก่อนบอส',18,18,1.1],
];
export const PHASES = Object.freeze(rows.map(([start,end,kind,label,cap=0,budget=0,interval=1,focus=null],index)=>
  Object.freeze({index,start,end,kind,label,cap,budget,interval,focus})));
const BOSS = Object.freeze({index:PHASES.length,start:600,end:Infinity,kind:'boss',label:'ผู้พิทักษ์ป่า',cap:0,budget:0,interval:1,focus:null});
const seconds = t => Number.isFinite(t) ? Math.max(0,t) : 0;
const alive = e => e.hp>0;
const eliteAlive = e => alive(e)&&e.elite;
const guardianAlive = e => alive(e)&&(e.miniBoss||e.boss);
export function encounterPhase(time) {
  const t=seconds(time);
  return PHASES.find(p=>t<p.end) || BOSS;
}
export function encounterRoster(time) {
  const t=seconds(time);
  return Object.keys(UNLOCKS).filter(id=>t>=UNLOCKS[id]);
}
export function resetEncounter(world) {
  world.encounter = {phase:-1,spawned:0,nextSpawn:seconds(world.time),eventSpawned:false,
    eliteIndex:0,blocked:false,history:[]};
}
/** Return spawn-time stats, never mutate shared roster/AI data. */
export function encounterStats(time,base,type,elite=false,boss=false) {
  if(!base) return base;
  const t=seconds(time),progress=Math.min(1,t/RUN_SECONDS);
  if(boss) return {...base,hp:6200,damage:22,xp:28};
  if(type==='panda') return {...base,hp:t>=480?640:420,damage:t>=480?12:10,xp:t>=480?55:40};
  if(elite) return {...base,hp:Math.round(base.hp*(.95+.35*progress)),
    damage:Math.max(1,Math.round(base.damage*(.9+.2*progress))),xp:base.xp};
  const xp={thorn:2,spark:3,turtle:4,water:5}[type] || 2;
  return {...base,hp:Math.round(base.hp*(.9+.9*progress)),
    damage:Math.max(1,Math.round(base.damage*(.8+.2*progress))),xp:Math.max(1,Math.round(xp*(1+.4*progress)))};
}
function record(world,state,phase,type) {
  state.history.push({time:world.time,phase:phase.index,type});
  if(state.history.length>420)state.history.shift();
}
function tickEliteEvents(world,state,phase,player,t,cap,living) {
  while(state.eliteIndex<ELITE_EVENTS.length && t>ELITE_EVENTS[state.eliteIndex].time+ELITE_EVENTS[state.eliteIndex].window)state.eliteIndex++;
  const event=ELITE_EVENTS[state.eliteIndex];
  if(!event || cap===0 || t+1e-7<event.time)return;
  if(living.some(guardianAlive)){state.blocked=true;return;}
  const elites=living.filter(eliteAlive).length;
  if(elites>=2){state.blocked=true;return;}
  if(world.spawn(player,event.type,true)){
    record(world,state,phase,'elite-'+event.type);
    state.eliteIndex++;
  }
}
/** One ordinary spawn attempt per update. Lulls stay populated but use lower cap/rate. */
export function tickEncounter(world,dt,player,requestedCap=100) {
  if(world.mode!=='auto' || !(dt>0) || !(world.hp>0) || world.finished)return;
  if(!world.encounter)resetEncounter(world);
  const state=world.encounter,t=seconds(world.time),phase=encounterPhase(t);
  const cap=Number.isFinite(requestedCap)?Math.max(0,Math.floor(requestedCap)):100;
  world.initial=false;
  world.spawnClock=0;
  const living=world.enemies.filter(alive);
  if(state.phase!==phase.index){
    state.phase=phase.index;state.spawned=0;state.nextSpawn=t;state.eventSpawned=false;state.blocked=false;
  }else state.blocked=false;

  if(phase.kind==='boss'){
    const panda=living.some(e=>e.miniBoss);
    const ordinary=living.filter(e=>!e.boss&&!e.miniBoss&&!e.elite).length;
    if(!world.bossSpawned && !panda && ordinary<=8 && cap>0){
      if(world.spawn(player,'boss')){world.bossSpawned=true;record(world,state,phase,'boss');}
    }else if(!world.bossSpawned)state.blocked=true;
    return;
  }

  tickEliteEvents(world,state,phase,player,t,cap,living);

  if(phase.kind==='panda'&&!state.eventSpawned&&cap>0){
    const existing=living.some(e=>e.miniBoss);
    if(existing)state.eventSpawned=true;
    else if(world.spawn(player,'panda')){state.eventSpawned=true;record(world,state,phase,'panda');}
  }

  const ordinary=world.enemies.filter(e=>alive(e)&&!e.elite&&!e.miniBoss&&!e.boss).length;
  const limit=Math.min(cap,phase.cap);
  if(ordinary>=limit || state.spawned>=phase.budget || t>=phase.end-.75){state.nextSpawn=Math.max(state.nextSpawn,t+phase.interval);return;}
  if(t+1e-7<state.nextSpawn)return;
  const pool=encounterRoster(t);
  if(!pool.length)return;
  const type=phase.focus&&state.spawned<3&&pool.includes(phase.focus)?phase.focus:pool[Math.min(pool.length-1,Math.floor(world.random()*pool.length))];
  if(world.spawn(player,type)){state.spawned++;record(world,state,phase,type);}
  state.nextSpawn=t+phase.interval;
}
export function encounterStatus(world) {
  const p=encounterPhase(world.time);
  if(world.encounter?.blocked)return world.enemies.some(guardianAlive)?'รับมือผู้พิทักษ์':'อีลิทกำลังเข้าพื้นที่';
  return p.label;
}
