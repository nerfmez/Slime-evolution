/** Ten-minute normal-play pacing. Creature AI, art, skills and saves are untouched.
 * Tests/manual enemy modes keep their original isolated training behavior.
 * Times are simulation seconds: pausing/cards/growth never consume a rest.
 */
export const PACING_VERSION = 'cozy-10min-v1';
export const RUN_SECONDS = 600;
export const UNLOCKS = Object.freeze({thorn:0,spark:120,turtle:240,water:360});
const rows = [
  [0,15,'calm','สำรวจป่า'],
  [15,45,'wave','กบในพงหญ้า',6,12,2.0,'thorn'],
  [45,70,'calm','พักเก็บ EXP'],
  [70,105,'wave','ฝูงกบ',8,18,1.5,'thorn'],
  [105,120,'calm','เสียงป่าสงบลง'],
  [120,155,'wave','เม่นสายฟ้า',10,26,1.0,'spark'],
  [155,180,'calm','พักเก็บ EXP'],
  [180,215,'wave','สิ่งมีชีวิตในป่า',12,30,.95],
  [215,240,'calm','พักเก็บ EXP'],
  [240,275,'wave','เต่าริมบึง',14,34,.85,'turtle'],
  [275,300,'calm','เตรียมพบแพนด้า'],
  [300,340,'panda','แพนด้าป่า'],
  [340,365,'calm','พักเก็บ EXP'],
  [365,400,'wave','ลูกช้างน้ำ',16,40,.70,'water'],
  [400,420,'calm','เตรียมพบอีลิท'],
  [420,455,'elite','ลูกช้างน้ำอัลฟ่า'],
  [455,480,'calm','พักเก็บ EXP'],
  [480,520,'panda','แพนด้าผู้พิทักษ์'],
  [520,540,'calm','พักเก็บ EXP'],
  [540,575,'wave','ฝูงใหญ่ครั้งสุดท้าย',28,60,.45],
  [575,600,'calm','เตรียมพบบอส'],
];
export const PHASES = Object.freeze(rows.map(([start,end,kind,label,cap=0,budget=0,interval=1,focus=null],index)=>
  Object.freeze({index,start,end,kind,label,cap,budget,interval,focus})));
const BOSS = Object.freeze({index:PHASES.length,start:600,end:Infinity,kind:'boss',label:'ผู้พิทักษ์ป่า',cap:0,budget:0,interval:1,focus:null});
const seconds = t => Number.isFinite(t) ? Math.max(0,t) : 0;
const alive = e => e.hp>0;
const special = e => e.elite || e.miniBoss || e.boss;
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
    hadSpecial:false,clearSince:null,blocked:false,history:[]};
}
/** Return spawn-time stats, never mutate the shared roster or the creature's AI. */
export function encounterStats(time,base,type,elite=false,boss=false) {
  if(!base) return base;
  const t=seconds(time),progress=Math.min(1,t/RUN_SECONDS);
  if(boss) return {...base,hp:6200,damage:22};
  if(type==='panda') return {...base,hp:t>=480?640:420,damage:t>=480?12:10,xp:t>=480?140:90};
  if(elite) return {...base,hp:420,damage:14,xp:100};
  const xp={thorn:4,spark:6,turtle:8,water:10}[type] || 4;
  return {...base,hp:Math.round(base.hp*(.9+.9*progress)),
    damage:Math.max(1,Math.round(base.damage*(.8+.2*progress))),xp:Math.round(xp*(1+progress))};
}
function record(world,state,phase,type) {
  // Bounded diagnostics, not frame-by-frame allocations. No gameplay dependency.
  state.history.push({time:world.time,phase:phase.index,type});
  if(state.history.length>320)state.history.shift();
}
/** At most one spawn attempt per update. Failed/capped/quiet time never queues a burst. */
export function tickEncounter(world,dt,player,requestedCap=100) {
  if(world.mode!=='auto' || !(dt>0) || !(world.hp>0) || world.finished)return;
  if(!world.encounter)resetEncounter(world);
  const state=world.encounter,t=seconds(world.time),phase=encounterPhase(t);
  const cap=Number.isFinite(requestedCap)?Math.max(0,Math.floor(requestedCap)):100;
  world.initial=false;
  // Disable legacy spawn clocks in normal play, even when a test moves time forward.
  world.spawnClock=0;
  const living=world.enemies.filter(alive),hasSpecial=living.some(special);
  if(state.phase!==phase.index){
    state.phase=phase.index;state.spawned=0;state.nextSpawn=t;
    state.eventSpawned=false;state.blocked=false;
  }
  // A surviving guardian carries into the next rest; no second special or wave joins it.
  if(hasSpecial){state.hadSpecial=true;state.clearSince=null;state.blocked=true;return;}
  if(state.hadSpecial){state.hadSpecial=false;state.clearSince=t;}
  const afterSpecial=state.clearSince!=null && t-state.clearSince<8;
  state.blocked=afterSpecial;
  if(cap===0 || afterSpecial)return;
  const ordinary=living.filter(e=>!special(e)).length;
  if(phase.kind==='calm'){state.nextSpawn=t;return;}
  if(phase.kind==='boss'){
    // Never stack the final boss on an unfinished mini-boss/elite.
    if(!world.bossSpawned && ordinary<=4){
      if(world.spawn(player,'boss')){world.bossSpawned=true;record(world,state,phase,'boss');}
    }else if(ordinary>4)state.blocked=true;
    return;
  }
  if(phase.kind==='panda'||phase.kind==='elite'){
    if(state.eventSpawned)return;
    if(ordinary>4){state.blocked=true;return;}
    // Retry terrain failures with a bounded interval; expire with this phase, never backlog.
    if(t+1e-7<state.nextSpawn)return;
    const type=phase.kind==='panda'?'panda':'water';
    if(world.spawn(player,type,phase.kind==='elite')){
      state.eventSpawned=true;record(world,state,phase,type);
    }
    state.nextSpawn=t+1;
    return;
  }
  const limit=Math.min(cap,phase.cap);
  if(ordinary>=limit || state.spawned>=phase.budget || t>=phase.end-6){state.nextSpawn=t+phase.interval;return;}
  if(t+1e-7<state.nextSpawn)return;
  // First three introductions show the new species deliberately, never by a lucky draw.
  const pool=encounterRoster(t);
  const type=phase.focus&&state.spawned<3&&pool.includes(phase.focus)?phase.focus:pool[Math.min(pool.length-1,Math.floor(world.random()*pool.length))];
  if(world.spawn(player,type)) {state.spawned++;record(world,state,phase,type);}
  state.nextSpawn=t+phase.interval;
}
export function encounterStatus(world) {
  const p=encounterPhase(world.time);
  if(world.encounter?.blocked)return world.enemies.some(e=>alive(e)&&special(e))?'รับมือผู้พิทักษ์':'พักจังหวะ';
  return p.label;
}
