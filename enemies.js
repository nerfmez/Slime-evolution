import {SCENERY,waterBlocked,rockBlocked} from './terrain.js';

export const STAGE1_FAMILIES=['thorn','moss','petal','crystal'];
export const ENEMY_TYPES={
 thorn:{name:'Thorn Mite',eliteName:'Thorn Alpha',stride:.42,speed:1.18,radius:.30,hp:18,damage:5,eliteScale:1.62,eliteRadius:.58,skill:'charge'},
 moss:{name:'Mossback',eliteName:'Mossback Alpha',stride:1.03,speed:.72,radius:.46,hp:48,damage:9,eliteScale:1.38,skill:'moss_pillar_line'},
 petal:{name:'Petal Skitter',eliteName:'Petal Alpha',speed:1.65,radius:.24,hp:14,damage:4,eliteScale:1.58,skill:'petal_swoop'},
 crystal:{name:'Crystal Warden',eliteName:'Crystal Alpha',speed:.85,radius:.37,hp:28,damage:6,eliteScale:1.44,skill:'crystal_burst'},
 // The Godot authoring value is 12,000 HP. This web test currently restores only
 // Inferno, so the runtime test scale is 1,200 to keep the intended ~30–50 s boss
 // review window. sourceHp preserves the authoritative balance target for later.
 boss:{name:'Ancient Bloom Colossus',stride:2.35,speed:.92,radius:1.82,hp:1200,sourceHp:12000,damage:26,skill:'boss_cycle'}
};

const N=67,ORIGIN=33;
const SKILL_COLORS={
 charge:[1.00,.56,.25],moss_pillar_line:[.51,.72,.37],petal_swoop:[1.00,.83,.42],crystal_burst:[.45,.87,1.00],
 vine_lunge:[.44,.83,.42],root_slam:[.84,.65,.34],seed_volley:[.72,.91,.36],bloom_burst:[1.00,.79,.36]
};
const SKILL_LABELS={charge:'ALPHA CHARGE',moss_pillar_line:'EARTHSPIKE PATH',petal_swoop:'WING DIVE',crystal_burst:'CRYSTAL BURST',vine_lunge:'VINE LUNGE',root_slam:'ROOT SLAM',seed_volley:'SEED VOLLEY',bloom_burst:'BLOOM BURST'};

export function enemyCanStand(x,z,r=.46){return Math.abs(x)<33&&Math.abs(z)<33&&!waterBlocked(x,z,r)&&!rockBlocked(x,z,r)&&!SCENERY.some(t=>t[2]===0&&Math.hypot(x-t[0],z-t[1])<r+.31);}
export function lineOpen(x,z,tx,tz,r=.46){const steps=Math.ceil(Math.hypot(tx-x,tz-z)/.25);for(let i=1;i<=steps;i++)if(!enemyCanStand(x+(tx-x)*i/steps,z+(tz-z)*i/steps,r))return false;return true;}

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function lerp(a,b,t){return a+(b-a)*t;}
function eliteKillsPerSpawn(time){const p=clamp(time/300,0,1);return clamp(Math.round(lerp(24,9,Math.pow(p,.82))),9,24);}
function skillColor(kind){return SKILL_COLORS[kind]||[1,.78,.38];}
function petalSwoopGrassRadius(e){
 // Godot v100 main.gd: base monster radius -> 1.32 fast-motion widening -> 1.70 Wing Dive airflow, capped at 2.70.
 const sourceRadius=Math.min(2.70,clamp(.78+e.radius*.52,.90,1.85)*1.32*1.70);
 // grass-bend.js adds .36 to an actor's grassRadius, so store the core radius here.
 return Math.max(e.radius,sourceRadius-.36);
}

export class EnemyWorld{
 constructor(){
  this.walkable=new Uint8Array(N*N);this.links=Array.from({length:N*N},()=>[]);this.field=new Int16Array(N*N);this.queue=new Int32Array(N*N);
  for(let z=0;z<N;z++)for(let x=0;x<N;x++)this.walkable[z*N+x]=enemyCanStand(x-ORIGIN,z-ORIGIN,.48)?1:0;
  for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){
   const id=z*N+x;if(!this.walkable[id])continue;
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
    const next=(z+dz)*N+x+dx;
    if(this.walkable[next]&&this.walkable[z*N+x+dx]&&this.walkable[(z+dz)*N+x]&&lineOpen(x-ORIGIN,z-ORIGIN,x+dx-ORIGIN,z+dz-ORIGIN,.48))this.links[id].push(next);
   }
  }
  this.reset();
 }
 reset(mode='auto',time=0){
  this.mode=mode;this.time=time;this.enemies=[];this.defeated=[];this.bullets=[];this.effects=[];this.hp=100;this.hurt=0;this.kills=0;this.serial=0;this.seed=314159;this.spawnClock=0;this.navClock=0;this.initial=true;this.finished=false;
  this.spawnCounts={thorn:0,moss:0,petal:0,crystal:0};this.eliteCycle=0;this.nextEliteKillTarget=18;this.bossSpawned=false;this.noticeText='';this.noticeTime=0;
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 unlocked(){
  if(this.mode==='boss')return ['boss'];
  if(this.mode==='all'||this.mode==='elites')return [...STAGE1_FAMILIES];
  if(this.mode!=='auto')return [this.mode];
  return STAGE1_FAMILIES.slice(0,Math.min(4,1+Math.floor(this.time/60)));
 }
 rebuild(player){
  this.field.fill(-1);let best=-1,dist=Infinity;
  for(let id=0;id<this.walkable.length;id++)if(this.walkable[id]){const d=(id%N-ORIGIN-player[0])**2+(Math.floor(id/N)-ORIGIN-player[2])**2;if(d<dist){best=id;dist=d;}}
  let head=0,tail=0;if(best<0)return;this.queue[tail++]=best;this.field[best]=0;
  while(head<tail){const id=this.queue[head++];for(const next of this.links[id])if(this.field[next]<0){this.field[next]=this.field[id]+1;this.queue[tail++]=next;}}
 }
 rollStageOneType(){
  const t=this.time,r=()=>this.random();
  if(t<60)return 'thorn';
  if(t<120){const p=clamp((t-60)/60,0,1),w=lerp(.12,.38,p);return r()<w?'moss':'thorn';}
  if(t<180){const p=clamp((t-120)/60,0,1),petal=lerp(.10,.30,p),moss=lerp(.34,.30,p),x=r();return x<petal?'petal':x<petal+moss?'moss':'thorn';}
  if(t<240){const p=clamp((t-180)/60,0,1),crystal=lerp(.08,.27,p),petal=lerp(.27,.29,p),moss=lerp(.29,.25,p),x=r();return x<crystal?'crystal':x<crystal+petal?'petal':x<crystal+petal+moss?'moss':'thorn';}
  const p=clamp((t-240)/60,0,1),crystal=lerp(.28,.34,p),petal=lerp(.29,.30,p),moss=lerp(.24,.22,p),x=r();return x<crystal?'crystal':x<crystal+petal?'petal':x<crystal+petal+moss?'moss':'thorn';
 }
 stats(type,elite=false,boss=false){
  const base=ENEMY_TYPES[type];
  if(boss)return {...base,name:base.name,hp:base.hp,maxHp:base.hp,scale:1,isElite:true,isBoss:true,assetType:'boss'};
  if(!elite)return {...base,name:base.name,maxHp:base.hp,scale:1,isElite:false,isBoss:false,assetType:type};
  return {...base,name:base.eliteName,hp:Math.round(base.hp*2.85),maxHp:Math.round(base.hp*2.85),speed:base.speed*1.03,damage:base.damage+6,radius:type==='thorn'?base.eliteRadius:base.radius*1.40,scale:base.eliteScale,isElite:true,isBoss:false,assetType:type};
 }
 makeEnemy(type,x,z,{elite=false,boss=false}={}){
  const s=this.stats(type,elite,boss),id=++this.serial;
  return {id,type,assetType:s.assetType,name:s.name,x,z,yaw:0,hp:s.hp,maxHp:s.maxHp??s.hp,radius:s.radius,scale:s.scale,speed:s.speed,damage:s.damage,stride:s.stride||0,isElite:s.isElite,isBoss:s.isBoss,walkBlend:0,walkPhase:id*.61803398875,anim:this.random(),attack:this.random()*1.5,windup:0,hit:0,burnTime:0,burnDamage:0,burnTick:.28,skillKind:'',skillLabel:'',skillWindup:0,skillCooldown:elite?1.4:boss?.9:0,skillRadius:0,skillTargetX:x,skillTargetZ:z,skillDirX:0,skillDirZ:0,skillDash:0,skillColor:[1,.78,.38],flying:false,grassRadius:s.radius,recovery:0,bossCycle:0,animState:'walk',swoopTrailClock:0,swoopLastX:x,swoopLastZ:z};
 }
 spawnAt(x,z,type,opts={}){
  const spec=this.stats(type,!!opts.elite,!!opts.boss);if(!enemyCanStand(x,z,spec.radius))return null;
  const e=this.makeEnemy(type,x,z,opts);this.enemies.push(e);if(!opts.elite&&!opts.boss&&this.spawnCounts[type]!==undefined)this.spawnCounts[type]++;return e;
 }
 spawn(player,type,opts={}){
  const spec=this.stats(type,!!opts.elite,!!opts.boss),min=opts.boss?8.5:7,max=opts.boss?10.5:10;
  for(let attempt=0;attempt<120;attempt++){
   const a=this.random()*Math.PI*2,r=min+this.random()*(max-min),x=player[0]+Math.sin(a)*r,z=player[2]+Math.cos(a)*r,id=Math.round(z+ORIGIN)*N+Math.round(x+ORIGIN);
   if(!enemyCanStand(x,z,spec.radius)||id<0||id>=N*N||this.field[id]<0)continue;
   if(this.enemies.some(e=>Math.hypot(e.x-x,e.z-z)<e.radius+spec.radius+.2))continue;
   const e=this.spawnAt(x,z,type,opts);if(e){e.yaw=Math.atan2(player[0]-x,player[2]-z);return e;}
  }return null;
 }
 unlockedEliteFamilies(){return STAGE1_FAMILIES.filter(k=>this.spawnCounts[k]>0);}
 spawnElite(player){
  const unlocked=this.unlockedEliteFamilies();if(!unlocked.length)return null;const type=unlocked[this.eliteCycle++%unlocked.length],e=this.spawn(player,type,{elite:true});
  if(e){this.noticeText=e.name+' APPROACHES';this.noticeTime=2.1;}return e;
 }
 spawnBoss(player){
  if(this.bossSpawned)return this.enemies.find(e=>e.isBoss)||null;const e=this.spawn(player,'boss',{boss:true});
  if(e){this.bossSpawned=true;this.noticeText='⚠ BOSS HAS AWAKENED ⚠\nANCIENT BLOOM COLOSSUS';this.noticeTime=3.0;}return e;
 }
 skillTargeted(kind){return ['moss_pillar_line','crystal_burst','vine_lunge'].includes(kind);}
 startSkill(e,kind,windup,radius,player){
  const dx=player[0]-e.x,dz=player[2]-e.z,d=Math.hypot(dx,dz)||1;e.skillKind=kind;e.skillLabel=SKILL_LABELS[kind]||kind.toUpperCase();e.skillWindup=windup;e.skillRadius=radius;e.skillTargetX=player[0];e.skillTargetZ=player[2];e.skillDirX=dx/d;e.skillDirZ=dz/d;e.skillColor=skillColor(kind);e.animState=e.isBoss?(kind==='vine_lunge'?'charge':kind==='root_slam'?'push':'spell'):'walk';
  if(kind==='petal_swoop'){e.flying=true;e.anim=0;e.animState='flight';e.swoopTrailClock=0;e.swoopLastX=e.x;e.swoopLastZ=e.z;}
  const cooldown={charge:4.6,moss_pillar_line:4.25,petal_swoop:2.20,crystal_burst:3.8,vine_lunge:4.10,root_slam:3.55,seed_volley:3.40,bloom_burst:4.00}[kind]||4.2;e.skillCooldown=cooldown;
 }
 blast(x,z,radius,damage,kind,color=skillColor(kind)){
  if(Math.hypot(x-this.player[0],z-this.player[2])<=radius)this.damage(Math.max(1,Math.round(damage)));
  this.effects.push({x,z,r:radius,kind,color,age:0,life:.42});
 }
 fireFan(e,count,spread,speed,damage,kind){
  const dx=this.player[0]-e.x,dz=this.player[2]-e.z,d=Math.hypot(dx,dz)||1,base=Math.atan2(dx,dz),den=Math.max(1,count-1),radius=kind==='seed_volley'?.48:.18;
  for(let i=0;i<count;i++){
   const a=base+lerp(-spread*.5,spread*.5,i/den),vx=Math.sin(a)*speed,vz=Math.cos(a)*speed;
   this.bullets.push({x:e.x+Math.sin(a)*Math.max(.72,e.radius*.88),z:e.z+Math.cos(a)*Math.max(.72,e.radius*.88),vx,vz,life:3.2,damage,radius,kind,color:skillColor(kind)});
  }
 }
 executeSkill(e){
  const kind=e.skillKind;
  if(kind==='charge'){e.skillDash=.36;e.animState='run';return;}
  if(kind==='moss_pillar_line'){
   for(let i=1;i<=7;i++){const t=i/7;this.effects.push({x:lerp(e.x,e.skillTargetX,t),z:lerp(e.z,e.skillTargetZ,t),r:.34+.12*t,kind,color:e.skillColor,age:0,life:.48});}
   this.blast(e.skillTargetX,e.skillTargetZ,e.skillRadius,e.damage*1.48,kind,e.skillColor);e.skillKind='';return;
  }
  if(kind==='petal_swoop'){e.skillDash=5.0;e.flying=true;e.grassRadius=petalSwoopGrassRadius(e);e.animState='flight';e.swoopTrailClock=0;e.swoopLastX=e.x;e.swoopLastZ=e.z;return;}
  if(kind==='crystal_burst'){this.blast(e.skillTargetX,e.skillTargetZ,e.skillRadius,e.damage*1.34,kind,e.skillColor);e.skillKind='';return;}
  if(kind==='vine_lunge'){
   const dx=e.skillTargetX-e.x,dz=e.skillTargetZ-e.z,d=Math.hypot(dx,dz)||1;e.skillDirX=dx/d;e.skillDirZ=dz/d;e.skillDash=clamp(d/8.8,.42,.92);this.effects.push({x:e.x,z:e.z,r:2.4,kind,color:e.skillColor,age:0,life:.35});e.animState='run';return;
  }
  if(kind==='root_slam'){this.blast(e.x,e.z,e.skillRadius,e.damage*1.68,kind,e.skillColor);e.recovery=.62;e.skillKind='';return;}
  if(kind==='seed_volley'){const count=e.hp<=e.maxHp*.45?17:11;this.fireFan(e,count,2.20,5.10,e.damage*.82,kind);this.effects.push({x:e.x,z:e.z,r:3.1,kind,color:e.skillColor,age:0,life:.40});e.recovery=.68;e.skillKind='';return;}
  if(kind==='bloom_burst'){this.blast(e.x,e.z,e.skillRadius,e.damage*1.56,kind,e.skillColor);e.recovery=.78;e.skillKind='';return;}
 }
 emitPetalSwoopTrail(e){
  const moved=Math.hypot(e.x-e.swoopLastX,e.z-e.swoopLastZ);e.swoopTrailClock-=this._lastDt||0;
  if(e.swoopTrailClock>0&&moved<.10)return;
  if(moved>.015)this.effects.push({kind:'petal_swoop_trail',x:(e.swoopLastX+e.x)*.5,z:(e.swoopLastZ+e.z)*.5,x0:e.swoopLastX,z0:e.swoopLastZ,x1:e.x,z1:e.z,r:Math.max(.36,moved),color:e.skillColor,age:0,life:.34});
  e.swoopLastX=e.x;e.swoopLastZ=e.z;e.swoopTrailClock=.085;
 }
 finishDash(e){
  if(e.skillKind==='vine_lunge')this.blast(e.x,e.z,e.skillRadius,e.damage*1.76,'vine_lunge',e.skillColor);
  if(e.skillKind==='petal_swoop'){e.flying=false;e.grassRadius=e.radius;e.swoopTrailClock=0;}
  e.skillKind='';e.skillDash=0;e.animState='walk';
 }
 updateSpecial(e,dt,player,distance){
  if(!e.isElite)return false;
  if(e.recovery>0){e.recovery=Math.max(0,e.recovery-dt);return true;}
  if(e.skillWindup>0){if(e.skillKind==='petal_swoop'){e.flying=true;e.animState='flight';e.anim+=dt;e.walkBlend=1;}e.skillWindup=Math.max(0,e.skillWindup-dt);if(e.skillWindup<=0)this.executeSkill(e);return true;}
  if(e.skillDash>0){
   if(e.skillKind==='petal_swoop'){
    // Godot v100 retargets WING DIVE every physics tick instead of locking the launch direction.
    const sx=player[0]-e.x,sz=player[2]-e.z,sd=Math.hypot(sx,sz);if(sd>.000001){e.skillDirX=sx/sd;e.skillDirZ=sz/sd;}
    e.anim+=dt;e.walkBlend=1;e.animState='flight';e.grassRadius=petalSwoopGrassRadius(e);
   }
   const speed=e.skillKind==='vine_lunge'?8.8:e.skillKind==='petal_swoop'?e.speed*2:e.speed*2.35,step=speed*dt,dx=e.skillDirX*step,dz=e.skillDirZ*step;
   if(enemyCanStand(e.x+dx,e.z+dz,e.radius)){e.x+=dx;e.z+=dz;}else if(e.skillKind==='petal_swoop'){
    // Godot move_and_slide keeps the five-second flight alive and slides along blockers.
    let moved=false;if(enemyCanStand(e.x+dx,e.z,e.radius)){e.x+=dx;moved=true;}if(enemyCanStand(e.x,e.z+dz,e.radius)){e.z+=dz;moved=true;}
   }else{e.skillDash=0;}
   if(e.skillKind==='petal_swoop')this.emitPetalSwoopTrail(e);
   e.yaw=Math.atan2(e.skillDirX,e.skillDirZ);e.skillDash=Math.max(0,e.skillDash-dt);
   if(Math.hypot(e.x-player[0],e.z-player[2])<e.radius+.35&&e.attack<=0){this.damage(e.damage);e.attack=.65;}
   if(e.skillDash<=0)this.finishDash(e);return true;
  }
  e.skillCooldown=Math.max(0,e.skillCooldown-dt);if(e.skillCooldown>0)return false;
  if(e.isBoss){
   if(distance>6.2)this.startSkill(e,'vine_lunge',.94,4.80,player);
   else{const kind=['root_slam','seed_volley','bloom_burst'][e.bossCycle++%3],data={root_slam:[1.02,7.20],seed_volley:[.86,0],bloom_burst:[1.08,8.00]}[kind];this.startSkill(e,kind,data[0],data[1],player);}
   return true;
  }
  if(e.type==='thorn'&&distance>2&&distance<7)this.startSkill(e,'charge',.62,0,player);
  else if(e.type==='moss'&&distance<3.6)this.startSkill(e,'moss_pillar_line',.92,1.18,player);
  else if(e.type==='petal'&&distance>1.5&&distance<7.2)this.startSkill(e,'petal_swoop',.48,0,player);
  else if(e.type==='crystal'&&distance>2.2&&distance<7.4)this.startSkill(e,'crystal_burst',.90,1.62,player);
  return e.skillWindup>0;
 }
 update(dt,player,limit=40,storm=null){
  if(dt<=0||this.hp<=0||this.finished)return;dt=Math.min(dt,.05);this._lastDt=dt;this.player=player;this.time+=dt;this.hurt=Math.max(0,this.hurt-dt);this.noticeTime=Math.max(0,this.noticeTime-dt);this.navClock-=dt;
  if(this.navClock<=0){this.rebuild(player);this.navClock=.4;}
  if(this.initial){
   if(this.mode==='boss')this.spawnBoss(player);
   else if(this.mode==='elites')for(const type of STAGE1_FAMILIES){this.spawnCounts[type]=1;this.spawn(player,type,{elite:true});}
   else if(this.mode==='auto'){this.spawn(player,'thorn');}
   else{const types=this.unlocked();for(let i=0;i<Math.min(8,limit);i++)this.spawn(player,types[i%types.length]);}
   this.initial=false;
  }
  if(limit>0&&!this.bossSpawned&&this.time>=300&&(this.mode==='auto'||this.mode==='all'))this.spawnBoss(player);
  this.spawnClock-=dt;
  if(!this.bossSpawned&&this.mode!=='boss'&&this.mode!=='elites'&&this.spawnClock<=0&&this.time<300){
   let type=this.mode==='auto'?this.rollStageOneType():this.unlocked()[Math.floor(this.random()*this.unlocked().length)];
   if(this.enemies.length<limit)this.spawn(player,type);
   const p=clamp(this.time/300,0,1);this.spawnClock=Math.max(.38,lerp(1.48,.38,Math.pow(p,.82)));
  }
  if(this.enemies.length>limit&&!this.bossSpawned)this.enemies.length=limit;
  for(const e of this.enemies){
   if(e.hp<=0)continue;const dx=player[0]-e.x,dz=player[2]-e.z,d=Math.hypot(dx,dz);e.attack-=dt;e.hit=Math.max(0,e.hit-dt);
   if(storm&&storm.age<4.8&&Math.hypot(e.x-storm.x,e.z-storm.z)<2.25){e.hp-=22*dt;e.hit=.08;}
   const specialLocked=this.updateSpecial(e,dt,player,d);if(specialLocked)continue;
   if(d<e.radius+.32&&e.attack<=0){this.damage(e.damage);e.attack=e.isElite?1.05:1.1;}
   let walked=0,tx=player[0],tz=player[2],moving=d>e.radius+.29,sight=d<7&&lineOpen(e.x,e.z,tx,tz,e.radius);
   if(e.type==='crystal'&&!e.isBoss&&d<6.5&&sight){
    moving=d>4.5;if(e.attack<=0&&e.windup===0){e.windup=.6;e.attack=e.isElite?2.2:2.7;}
    if(e.windup>0){e.windup-=dt;moving=false;if(e.windup<=0){e.windup=0;this.bullets.push({x:e.x,z:e.z,vx:dx/Math.max(d,.001)*3.8,vz:dz/Math.max(d,.001)*3.8,life:3,damage:e.damage,radius:.08,kind:'crystal',color:[.45,.78,.95]});}}
   }else e.windup=0;
   if(moving){
    if(!sight){const cx=Math.round(e.x+ORIGIN),cz=Math.round(e.z+ORIGIN),id=cz*N+cx;let best=-1,score=Infinity;for(const next of [id,...(this.links[id]||[])])if(this.field[next]>=0){const x=next%N-ORIGIN,z=Math.floor(next/N)-ORIGIN,s=this.field[next]+Math.hypot(x-e.x,z-e.z)*.60;if(s<score&&lineOpen(e.x,e.z,x,z,e.radius)){score=s;best=next;}}if(best>=0){tx=best%N-ORIGIN;tz=Math.floor(best/N)-ORIGIN;}else moving=false;}
    let vx=tx-e.x,vz=tz-e.z,len=Math.hypot(vx,vz);vx/=Math.max(len,.001);vz/=Math.max(len,.001);
    for(const other of this.enemies){if(other===e)continue;const ox=e.x-other.x,oz=e.z-other.z,dd=Math.hypot(ox,oz),gap=e.radius+other.radius;if(dd<gap&&dd>.001){vx+=ox/dd*(gap-dd)*1.6;vz+=oz/dd*(gap-dd)*1.6;}}
    len=Math.hypot(vx,vz);const step=Math.min(e.speed*dt,Math.hypot(tx-e.x,tz-e.z));vx=vx/Math.max(1,len)*step;vz=vz/Math.max(1,len)*step;const beforeX=e.x,beforeZ=e.z;
    if(moving&&enemyCanStand(e.x+vx,e.z+vz,e.radius)){e.x+=vx;e.z+=vz;}else if(moving){if(enemyCanStand(e.x+vx,e.z,e.radius))e.x+=vx;if(enemyCanStand(e.x,e.z+vz,e.radius))e.z+=vz;}
    walked=Math.hypot(e.x-beforeX,e.z-beforeZ);if(walked>.0001){e.yaw=Math.atan2(e.x-beforeX,e.z-beforeZ);if(e.stride)e.walkPhase+=walked/e.stride;else e.anim+=walked/(e.type==='petal'?.75:1.0);}
   }
   e.walkBlend+=(Math.min(1,walked/Math.max(e.speed*dt,.0001))-e.walkBlend)*(1-Math.exp(-dt*12));if(e.type==='crystal'&&sight)e.yaw=Math.atan2(dx,dz);
  }
  const dead=this.enemies.filter(e=>e.hp<=0);for(const e of dead)this.defeated.push(e);this.enemies=this.enemies.filter(e=>e.hp>0);this.kills+=dead.length;
  if(dead.some(e=>e.isBoss)){this.finished=true;this.noticeText='ANCIENT BLOOM DEFEATED';this.noticeTime=3.0;}
  if(!this.bossSpawned&&this.mode==='auto'&&this.kills>=this.nextEliteKillTarget){this.nextEliteKillTarget=this.kills+eliteKillsPerSpawn(this.time);this.spawnElite(player);}
  for(const b of this.bullets){b.x+=b.vx*dt;b.z+=b.vz*dt;b.life-=dt;if(!enemyCanStand(b.x,b.z,b.radius||.08))b.life=0;if(Math.hypot(b.x-player[0],b.z-player[2])<.35+(b.radius||.08)){this.damage(b.damage??6);b.life=0;}}
  this.bullets=this.bullets.filter(b=>b.life>0);for(const fx of this.effects){fx.age+=dt;fx.life-=dt;}this.effects=this.effects.filter(fx=>fx.life>0);
 }
 damage(n){if(this.hurt<=0){this.hp=Math.max(0,this.hp-n);this.hurt=.65;}}
}
