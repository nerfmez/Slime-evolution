import {SCENERY,waterBlocked,rockBlocked} from './terrain.js';

// Stage 1 animal roster. The stable internal keys are kept so existing save/test UI
// continues to work while the visible species and combat identity are replaced.
export const STAGE1_FAMILIES=['thorn','moss','petal','crystal','panda'];
export const ENEMY_TYPES={
 thorn:{name:'Moss Frog',eliteName:'Moss Frog Alpha',stride:.82,speed:1.05,radius:.30,hp:18,damage:4,eliteScale:1.48,skill:'poison_tongue'},
 moss:{name:'Spark Hedgehog',eliteName:'Spark Hedgehog Alpha',stride:.55,speed:.96,radius:.34,hp:26,damage:5,eliteScale:1.46,skill:'chain_spark'},
 petal:{name:'Pond Turtle',eliteName:'Pond Turtle Alpha',stride:.72,speed:.66,radius:.44,hp:46,damage:6,eliteScale:1.40,skill:'shell_guard'},
 crystal:{name:'Water Calf',eliteName:'Water Calf Alpha',stride:.78,speed:.82,radius:.38,hp:30,damage:5,eliteScale:1.44,skill:'water_shot'},
 panda:{name:'Forest Panda',eliteName:'Forest Panda Alpha',stride:.88,speed:.74,radius:.50,hp:58,damage:8,eliteScale:1.38,skill:'panda_roll'},
 // Boss remains the current Stage 1 review boss while the normal ecosystem is replaced.
 boss:{name:'Ancient Bloom Colossus',stride:2.35,speed:.92,radius:1.82,hp:1200,sourceHp:12000,damage:26,skill:'boss_cycle'}
};

const N=67,ORIGIN=33;
const SKILL_COLORS={
 poison_tongue:[.48,.82,.30],chain_spark:[1.00,.84,.24],shell_guard:[.48,.72,.42],water_shot:[.26,.68,1.00],panda_roll:[.76,.65,.48],
 vine_lunge:[.44,.83,.42],root_slam:[.84,.65,.34],seed_volley:[.72,.91,.36],bloom_burst:[1.00,.79,.36]
};
const SKILL_LABELS={
 poison_tongue:'POISON TONGUE',chain_spark:'CHAIN SPARK',shell_guard:'SHELL GUARD',water_shot:'WATER SHOT',panda_roll:'PANDA ROLL',
 vine_lunge:'VINE LUNGE',root_slam:'ROOT SLAM',seed_volley:'SEED VOLLEY',bloom_burst:'BLOOM BURST'
};
const ANIMAL_COOLDOWNS={poison_tongue:2.9,chain_spark:3.35,shell_guard:5.0,water_shot:2.65,panda_roll:4.15};

export function enemyCanStand(x,z,r=.46){return Math.abs(x)<33&&Math.abs(z)<33&&!waterBlocked(x,z,r)&&!rockBlocked(x,z,r)&&!SCENERY.some(t=>t[2]===0&&Math.hypot(x-t[0],z-t[1])<r+.31);}
export function lineOpen(x,z,tx,tz,r=.46){const steps=Math.ceil(Math.hypot(tx-x,tz-z)/.25);for(let i=1;i<=steps;i++)if(!enemyCanStand(x+(tx-x)*i/steps,z+(tz-z)*i/steps,r))return false;return true;}

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function lerp(a,b,t){return a+(b-a)*t;}
function eliteKillsPerSpawn(time){const p=clamp(time/300,0,1);return clamp(Math.round(lerp(24,9,Math.pow(p,.82))),9,24);}
function skillColor(kind){return SKILL_COLORS[kind]||[1,.78,.38];}

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
  this.spawnCounts={thorn:0,moss:0,petal:0,crystal:0,panda:0};this.eliteCycle=0;this.nextEliteKillTarget=18;this.bossSpawned=false;this.noticeText='';this.noticeTime=0;this.poisonTime=0;this.poisonTick=0;
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 unlocked(){
  if(this.mode==='boss')return ['boss'];
  if(this.mode==='all'||this.mode==='elites')return [...STAGE1_FAMILIES];
  if(this.mode!=='auto')return [this.mode];
  return STAGE1_FAMILIES.slice(0,Math.min(5,1+Math.floor(this.time/60)));
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
  if(t<180){const p=clamp((t-120)/60,0,1),turtle=lerp(.10,.28,p),hedge=lerp(.34,.31,p),x=r();return x<turtle?'petal':x<turtle+hedge?'moss':'thorn';}
  if(t<240){const p=clamp((t-180)/60,0,1),water=lerp(.08,.25,p),turtle=lerp(.27,.26,p),hedge=lerp(.29,.25,p),x=r();return x<water?'crystal':x<water+turtle?'petal':x<water+turtle+hedge?'moss':'thorn';}
  const p=clamp((t-240)/60,0,1),panda=lerp(.08,.20,p),water=lerp(.22,.24,p),turtle=.20,hedge=.20,x=r();return x<panda?'panda':x<panda+water?'crystal':x<panda+water+turtle?'petal':x<panda+water+turtle+hedge?'moss':'thorn';
 }
 stats(type,elite=false,boss=false){
  const base=ENEMY_TYPES[type];
  if(boss)return {...base,name:base.name,hp:base.hp,maxHp:base.hp,scale:1,isElite:true,isBoss:true,assetType:'boss'};
  if(!elite)return {...base,name:base.name,maxHp:base.hp,scale:1,isElite:false,isBoss:false,assetType:type};
  return {...base,name:base.eliteName,hp:Math.round(base.hp*2.7),maxHp:Math.round(base.hp*2.7),speed:base.speed*1.04,damage:base.damage+4,radius:base.radius*1.32,scale:base.eliteScale,isElite:true,isBoss:false,assetType:type};
 }
 makeEnemy(type,x,z,{elite=false,boss=false}={}){
  const s=this.stats(type,elite,boss),id=++this.serial;
  return {id,type,assetType:s.assetType,name:s.name,x,z,yaw:0,hp:s.hp,maxHp:s.maxHp??s.hp,radius:s.radius,scale:s.scale,speed:s.speed,damage:s.damage,stride:s.stride||0,isElite:s.isElite,isBoss:s.isBoss,walkBlend:0,walkPhase:id*.61803398875,anim:this.random(),attack:this.random()*1.3,windup:0,hit:0,burnTime:0,burnDamage:0,burnTick:.28,skillKind:'',skillLabel:'',skillWindup:0,skillCooldown:boss?.9:.55+this.random()*1.35,skillRadius:0,skillTargetX:x,skillTargetZ:z,skillDirX:0,skillDirZ:0,skillDash:0,skillColor:[1,.78,.38],grassRadius:s.radius,recovery:0,bossCycle:0,animState:'walk',castPose:0,guardTime:0};
 }
 spawnAt(x,z,type,opts={}){const spec=this.stats(type,!!opts.elite,!!opts.boss);if(!enemyCanStand(x,z,spec.radius))return null;const e=this.makeEnemy(type,x,z,opts);this.enemies.push(e);if(!opts.elite&&!opts.boss&&this.spawnCounts[type]!==undefined)this.spawnCounts[type]++;return e;}
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
 spawnElite(player){const unlocked=this.unlockedEliteFamilies();if(!unlocked.length)return null;const type=unlocked[this.eliteCycle++%unlocked.length],e=this.spawn(player,type,{elite:true});if(e){this.noticeText=e.name+' APPROACHES';this.noticeTime=2.1;}return e;}
 spawnBoss(player){if(this.bossSpawned)return this.enemies.find(e=>e.isBoss)||null;const e=this.spawn(player,'boss',{boss:true});if(e){this.bossSpawned=true;this.noticeText='⚠ BOSS HAS AWAKENED ⚠\nANCIENT BLOOM COLOSSUS';this.noticeTime=3.0;}return e;}
 startSkill(e,kind,windup,radius,player){
  const dx=player[0]-e.x,dz=player[2]-e.z,d=Math.hypot(dx,dz)||1;e.skillKind=kind;e.skillLabel=SKILL_LABELS[kind]||kind.toUpperCase();e.skillWindup=windup;e.skillRadius=radius;e.skillTargetX=player[0];e.skillTargetZ=player[2];e.skillDirX=dx/d;e.skillDirZ=dz/d;e.skillColor=skillColor(kind);e.animState=e.isBoss?(kind==='vine_lunge'?'charge':kind==='root_slam'?'push':'spell'):'cast';e.castPose=windup+.22;
  const bossCd={vine_lunge:4.10,root_slam:3.55,seed_volley:3.40,bloom_burst:4.00}[kind];e.skillCooldown=(bossCd||ANIMAL_COOLDOWNS[kind]||4.2)*(e.isElite&&!e.isBoss?.78:1);
 }
 blast(x,z,radius,damage,kind,color=skillColor(kind)){if(Math.hypot(x-this.player[0],z-this.player[2])<=radius)this.damage(Math.max(1,Math.round(damage)));this.effects.push({x,z,r:radius,kind,color,age:0,life:.42});}
 lineEffect(e,tx,tz,kind,count=7){for(let i=1;i<=count;i++){const t=i/count;this.effects.push({x:lerp(e.x,tx,t),z:lerp(e.z,tz,t),r:.13+.05*Math.sin(t*Math.PI),kind,color:e.skillColor,age:0,life:.24});}}
 fireFan(e,count,spread,speed,damage,kind){const dx=this.player[0]-e.x,dz=this.player[2]-e.z,d=Math.hypot(dx,dz)||1,base=Math.atan2(dx,dz),den=Math.max(1,count-1),radius=kind==='seed_volley'?.48:.18;for(let i=0;i<count;i++){const a=base+lerp(-spread*.5,spread*.5,i/den),vx=Math.sin(a)*speed,vz=Math.cos(a)*speed;this.bullets.push({x:e.x+Math.sin(a)*Math.max(.72,e.radius*.88),z:e.z+Math.cos(a)*Math.max(.72,e.radius*.88),vx,vz,life:3.2,damage,radius,kind,color:skillColor(kind)});}}
 executeSkill(e){
  const kind=e.skillKind;
  if(kind==='poison_tongue'){
   const tx=this.player[0],tz=this.player[2],d=Math.hypot(tx-e.x,tz-e.z);this.lineEffect(e,tx,tz,kind,8);if(d<=3.45&&lineOpen(e.x,e.z,tx,tz,.12)){this.damage(e.damage);this.poisonTime=Math.max(this.poisonTime,2.4);this.poisonTick=Math.min(this.poisonTick||.35,.35);}e.skillKind='';e.castPose=.18;return;
  }
  if(kind==='chain_spark'){
   const tx=this.player[0],tz=this.player[2],d=Math.hypot(tx-e.x,tz-e.z);this.lineEffect(e,tx,tz,kind,10);if(d<=6.15&&lineOpen(e.x,e.z,tx,tz,.10))this.damage(Math.round(e.damage*1.15));e.skillKind='';e.castPose=.22;return;
  }
  if(kind==='shell_guard'){e.guardTime=2.35;e.recovery=.30;this.effects.push({x:e.x,z:e.z,r:e.radius*2.35,kind,color:e.skillColor,age:0,life:.55});e.skillKind='';e.castPose=.34;return;}
  if(kind==='water_shot'){
   const dx=this.player[0]-e.x,dz=this.player[2]-e.z,d=Math.hypot(dx,dz)||1,speed=e.isElite?5.2:4.7;this.bullets.push({x:e.x+dx/d*(e.radius+.25),z:e.z+dz/d*(e.radius+.25),vx:dx/d*speed,vz:dz/d*speed,life:2.6,damage:e.damage,radius:.16,kind,color:e.skillColor});e.skillKind='';e.castPose=.20;return;
  }
  if(kind==='panda_roll'){const dx=this.player[0]-e.x,dz=this.player[2]-e.z,d=Math.hypot(dx,dz)||1;e.skillDirX=dx/d;e.skillDirZ=dz/d;e.skillDash=e.isElite?.72:.58;e.animState='cast';return;}
  if(kind==='vine_lunge'){const dx=e.skillTargetX-e.x,dz=e.skillTargetZ-e.z,d=Math.hypot(dx,dz)||1;e.skillDirX=dx/d;e.skillDirZ=dz/d;e.skillDash=clamp(d/8.8,.42,.92);this.effects.push({x:e.x,z:e.z,r:2.4,kind,color:e.skillColor,age:0,life:.35});e.animState='run';return;}
  if(kind==='root_slam'){this.blast(e.x,e.z,e.skillRadius,e.damage*1.68,kind,e.skillColor);e.recovery=.62;e.skillKind='';return;}
  if(kind==='seed_volley'){const count=e.hp<=e.maxHp*.45?17:11;this.fireFan(e,count,2.20,5.10,e.damage*.82,kind);this.effects.push({x:e.x,z:e.z,r:3.1,kind,color:e.skillColor,age:0,life:.40});e.recovery=.68;e.skillKind='';return;}
  if(kind==='bloom_burst'){this.blast(e.x,e.z,e.skillRadius,e.damage*1.56,kind,e.skillColor);e.recovery=.78;e.skillKind='';return;}
 }
 finishDash(e){if(e.skillKind==='vine_lunge')this.blast(e.x,e.z,e.skillRadius,e.damage*1.76,'vine_lunge',e.skillColor);e.skillKind='';e.skillDash=0;e.animState='walk';e.castPose=.12;}
 updateSpecial(e,dt,player,distance){
  e.castPose=Math.max(0,(e.castPose||0)-dt);e.guardTime=Math.max(0,(e.guardTime||0)-dt);
  if(e.recovery>0){e.recovery=Math.max(0,e.recovery-dt);return true;}
  if(e.skillWindup>0){e.skillWindup=Math.max(0,e.skillWindup-dt);e.walkBlend=0;if(e.skillWindup<=0)this.executeSkill(e);return true;}
  if(e.skillDash>0){
   const speed=e.skillKind==='vine_lunge'?8.8:e.skillKind==='panda_roll'?e.speed*(e.isElite?5.1:4.4):e.speed*2.35,step=speed*dt,dx=e.skillDirX*step,dz=e.skillDirZ*step;
   if(enemyCanStand(e.x+dx,e.z+dz,e.radius)){e.x+=dx;e.z+=dz;}else{if(enemyCanStand(e.x+dx,e.z,e.radius))e.x+=dx;if(enemyCanStand(e.x,e.z+dz,e.radius))e.z+=dz;}
   e.yaw=Math.atan2(e.skillDirX,e.skillDirZ);e.walkBlend=1;e.skillDash=Math.max(0,e.skillDash-dt);
   if(Math.hypot(e.x-player[0],e.z-player[2])<e.radius+.36&&e.attack<=0){this.damage(e.damage);e.attack=.72;}
   if(e.skillDash<=0)this.finishDash(e);return true;
  }
  e.skillCooldown=Math.max(0,e.skillCooldown-dt);if(e.skillCooldown>0)return false;
  if(e.isBoss){if(distance>6.2)this.startSkill(e,'vine_lunge',.94,4.80,player);else{const kind=['root_slam','seed_volley','bloom_burst'][e.bossCycle++%3],data={root_slam:[1.02,7.20],seed_volley:[.86,0],bloom_burst:[1.08,8.00]}[kind];this.startSkill(e,kind,data[0],data[1],player);}return true;}
  if(e.type==='thorn'&&distance>.8&&distance<3.5)this.startSkill(e,'poison_tongue',.36,0,player);
  else if(e.type==='moss'&&distance>1.1&&distance<6.1)this.startSkill(e,'chain_spark',.48,0,player);
  else if(e.type==='petal'&&distance<4.8)this.startSkill(e,'shell_guard',.50,e.radius*2.35,player);
  else if(e.type==='crystal'&&distance>2.0&&distance<7.0)this.startSkill(e,'water_shot',.44,0,player);
  else if(e.type==='panda'&&distance>1.4&&distance<6.0)this.startSkill(e,'panda_roll',.40,0,player);
  else e.skillCooldown=.45;
  return e.skillWindup>0;
 }
 update(dt,player,limit=40,storm=null){
  if(dt<=0||this.hp<=0||this.finished)return;dt=Math.min(dt,.05);this._lastDt=dt;this.player=player;this.time+=dt;this.hurt=Math.max(0,this.hurt-dt);this.noticeTime=Math.max(0,this.noticeTime-dt);this.navClock-=dt;
  if(this.poisonTime>0){this.poisonTime=Math.max(0,this.poisonTime-dt);this.poisonTick-=dt;if(this.poisonTick<=0){this.damage(1);this.poisonTick=.72;}}
  if(this.navClock<=0){this.rebuild(player);this.navClock=.4;}
  if(this.initial){if(this.mode==='boss')this.spawnBoss(player);else if(this.mode==='elites')for(const type of STAGE1_FAMILIES){this.spawnCounts[type]=1;this.spawn(player,type,{elite:true});}else if(this.mode==='auto')this.spawn(player,'thorn');else{const types=this.unlocked();for(let i=0;i<Math.min(8,limit);i++)this.spawn(player,types[i%types.length]);}this.initial=false;}
  if(limit>0&&!this.bossSpawned&&this.time>=300&&(this.mode==='auto'||this.mode==='all'))this.spawnBoss(player);
  this.spawnClock-=dt;
  if(!this.bossSpawned&&this.mode!=='boss'&&this.mode!=='elites'&&this.spawnClock<=0&&this.time<300){const type=this.mode==='auto'?this.rollStageOneType():this.unlocked()[Math.floor(this.random()*this.unlocked().length)];if(this.enemies.length<limit)this.spawn(player,type);const p=clamp(this.time/300,0,1);this.spawnClock=Math.max(.38,lerp(1.48,.38,Math.pow(p,.82)));}
  if(this.enemies.length>limit&&!this.bossSpawned)this.enemies.length=limit;
  for(const e of this.enemies){
   if(e.hp<=0)continue;const dx=player[0]-e.x,dz=player[2]-e.z,d=Math.hypot(dx,dz);e.attack-=dt;e.hit=Math.max(0,e.hit-dt);
   if(storm&&storm.age<4.8&&Math.hypot(e.x-storm.x,e.z-storm.z)<2.25){e.hp-=22*dt*(e.guardTime>0?.42:1);e.hit=.08;}
   if(this.updateSpecial(e,dt,player,d))continue;
   if(d<e.radius+.32&&e.attack<=0){this.damage(e.damage);e.attack=e.isElite?1.05:1.1;}
   let walked=0,tx=player[0],tz=player[2],moving=d>e.radius+.29,sight=d<7&&lineOpen(e.x,e.z,tx,tz,e.radius);
   if(moving){
    if(!sight){const cx=Math.round(e.x+ORIGIN),cz=Math.round(e.z+ORIGIN),id=cz*N+cx;let best=-1,score=Infinity;for(const next of [id,...(this.links[id]||[])])if(this.field[next]>=0){const x=next%N-ORIGIN,z=Math.floor(next/N)-ORIGIN,s=this.field[next]+Math.hypot(x-e.x,z-e.z)*.60;if(s<score&&lineOpen(e.x,e.z,x,z,e.radius)){score=s;best=next;}}if(best>=0){tx=best%N-ORIGIN;tz=Math.floor(best/N)-ORIGIN;}else moving=false;}
    let vx=tx-e.x,vz=tz-e.z,len=Math.hypot(vx,vz);vx/=Math.max(len,.001);vz/=Math.max(len,.001);
    for(const other of this.enemies){if(other===e||other.hp<=0)continue;const ox=e.x-other.x,oz=e.z-other.z,dd=Math.hypot(ox,oz),gap=e.radius+other.radius;if(dd<gap&&dd>.001){vx+=ox/dd*(gap-dd)*1.6;vz+=oz/dd*(gap-dd)*1.6;}}
    len=Math.hypot(vx,vz);const guardSlow=e.guardTime>0?.30:1,step=Math.min(e.speed*guardSlow*dt,Math.hypot(tx-e.x,tz-e.z));vx=vx/Math.max(1,len)*step;vz=vz/Math.max(1,len)*step;const beforeX=e.x,beforeZ=e.z;
    if(moving&&enemyCanStand(e.x+vx,e.z+vz,e.radius)){e.x+=vx;e.z+=vz;}else if(moving){if(enemyCanStand(e.x+vx,e.z,e.radius))e.x+=vx;if(enemyCanStand(e.x,e.z+vz,e.radius))e.z+=vz;}
    walked=Math.hypot(e.x-beforeX,e.z-beforeZ);if(walked>.0001){e.yaw=Math.atan2(e.x-beforeX,e.z-beforeZ);if(e.stride)e.walkPhase+=walked/e.stride;else e.anim+=walked;}
   }
   e.walkBlend+=(Math.min(1,walked/Math.max(e.speed*dt,.0001))-e.walkBlend)*(1-Math.exp(-dt*12));
  }
  const dead=this.enemies.filter(e=>e.hp<=0);for(const e of dead)this.defeated.push(e);this.enemies=this.enemies.filter(e=>e.hp>0);this.kills+=dead.length;
  if(dead.some(e=>e.isBoss)){this.finished=true;this.noticeText='ANCIENT BLOOM DEFEATED';this.noticeTime=3.0;}
  if(!this.bossSpawned&&this.mode==='auto'&&this.kills>=this.nextEliteKillTarget){this.nextEliteKillTarget=this.kills+eliteKillsPerSpawn(this.time);this.spawnElite(player);}
  for(const b of this.bullets){b.x+=b.vx*dt;b.z+=b.vz*dt;b.life-=dt;if(!enemyCanStand(b.x,b.z,b.radius||.08))b.life=0;if(Math.hypot(b.x-player[0],b.z-player[2])<.35+(b.radius||.08)){this.damage(b.damage??6);b.life=0;}}
  this.bullets=this.bullets.filter(b=>b.life>0);for(const fx of this.effects){fx.age+=dt;fx.life-=dt;}this.effects=this.effects.filter(fx=>fx.life>0);
 }
 damage(n){if(this.hurt<=0){this.hp=Math.max(0,this.hp-n);this.hurt=.65;}}
}
