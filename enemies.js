import {SCENERY,waterBlocked,rockBlocked} from './terrain.js';
export const ENEMY_TYPES={
 thorn:{name:'Thorn Mite',stride:.42,speed:1.18,radius:.30,hp:18,damage:5},
 moss:{name:'Mossback',stride:1.03,speed:.72,radius:.46,hp:48,damage:9},
 petal:{name:'Petal Skitter',speed:1.65,radius:.24,hp:14,damage:4},
 crystal:{name:'Crystal Warden',speed:.85,radius:.37,hp:28,damage:6}
};
const keys=Object.keys(ENEMY_TYPES),N=67,ORIGIN=33;
export function enemyCanStand(x,z,r=.46){return Math.abs(x)<33&&Math.abs(z)<33&&!waterBlocked(x,z,r)&&!rockBlocked(x,z,r)&&!SCENERY.some(t=>t[2]===0&&Math.hypot(x-t[0],z-t[1])<r+.31);}
export function lineOpen(x,z,tx,tz,r=.46){const steps=Math.ceil(Math.hypot(tx-x,tz-z)/.25);for(let i=1;i<=steps;i++)if(!enemyCanStand(x+(tx-x)*i/steps,z+(tz-z)*i/steps,r))return false;return true;}
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
 reset(mode='auto',time=0){this.mode=mode;this.time=time;this.enemies=[];this.defeated=[];this.bullets=[];this.hp=100;this.hurt=0;this.kills=0;this.serial=0;this.seed=314159;this.spawnClock=0;this.navClock=0;this.initial=true;this.finished=false;}
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 unlocked(){return this.mode==='all'?keys:this.mode==='auto'?keys.slice(0,Math.min(4,1+Math.floor(this.time/60))):[this.mode];}
 rebuild(player){
  this.field.fill(-1);let best=-1,dist=Infinity;
  for(let id=0;id<this.walkable.length;id++)if(this.walkable[id]){const d=(id%N-ORIGIN-player[0])**2+(Math.floor(id/N)-ORIGIN-player[2])**2;if(d<dist){best=id;dist=d;}}
  let head=0,tail=0;this.queue[tail++]=best;this.field[best]=0;
  while(head<tail){const id=this.queue[head++];for(const next of this.links[id])if(this.field[next]<0){this.field[next]=this.field[id]+1;this.queue[tail++]=next;}}
 }
 spawn(player,type){
  for(let attempt=0;attempt<100;attempt++){
   const a=this.random()*Math.PI*2,r=7+this.random()*3,x=player[0]+Math.sin(a)*r,z=player[2]+Math.cos(a)*r,id=Math.round(z+ORIGIN)*N+Math.round(x+ORIGIN);
   if(!enemyCanStand(x,z)||id<0||id>=N*N||this.field[id]<0)continue;
   if(this.enemies.some(e=>Math.hypot(e.x-x,e.z-z)<.9))continue;
   const spec=ENEMY_TYPES[type];this.enemies.push({id:++this.serial,type,x,z,yaw:Math.atan2(player[0]-x,player[2]-z),hp:spec.hp,radius:spec.radius,walkBlend:0,walkPhase:this.serial*.61803398875,anim:this.random(),attack:this.random()*1.5,windup:0,hit:0});return true;
  }return false;
 }
 update(dt,player,limit=40,storm=null){
  if(dt<=0||this.hp<=0||this.finished)return;
  dt=Math.min(dt,.05);this.time+=dt;this.hurt=Math.max(0,this.hurt-dt);this.navClock-=dt;
  if(this.navClock<=0){this.rebuild(player);this.navClock=.4;}
  const unlocked=this.unlocked();
  if(this.initial){for(let i=0;i<Math.min(8,limit);i++)this.spawn(player,unlocked[i%unlocked.length]);this.initial=false;}
  this.spawnClock-=dt;
  if(this.spawnClock<=0&&this.time<300){
   const type=unlocked[Math.floor(this.random()*unlocked.length)];
   if(this.enemies.length<limit)this.spawn(player,type);
   this.spawnClock=Math.max(.55,2.5-this.time*.005);
  }
  if(this.enemies.length>limit)this.enemies.length=limit;
  for(const e of this.enemies){
   if(e.hp<=0)continue;
   const spec=ENEMY_TYPES[e.type],dx=player[0]-e.x,dz=player[2]-e.z,d=Math.hypot(dx,dz);e.attack-=dt;e.hit=Math.max(0,e.hit-dt);
   if(storm&&storm.age<4.8&&Math.hypot(e.x-storm.x,e.z-storm.z)<2.25){e.hp-=22*dt;e.hit=.08;}
   if(d<spec.radius+.32&&e.attack<=0){this.damage(spec.damage);e.attack=1.1;}
   let walked=0;
   let tx=player[0],tz=player[2],moving=d>spec.radius+.29;
   const sight=d<7&&lineOpen(e.x,e.z,tx,tz,spec.radius);
   if(e.type==='crystal'&&d<6.5&&sight){
    moving=d>4.5;
    if(e.attack<=0&&e.windup===0){e.windup=.6;e.attack=2.7;}
    if(e.windup>0){e.windup-=dt;moving=false;if(e.windup<=0){e.windup=0;this.bullets.push({x:e.x,z:e.z,vx:dx/Math.max(d,.001)*3.8,vz:dz/Math.max(d,.001)*3.8,life:3});}}
   }else e.windup=0;
   if(moving){
    if(!sight){
     const cx=Math.round(e.x+ORIGIN),cz=Math.round(e.z+ORIGIN),id=cz*N+cx;let best=-1,score=Infinity;
     for(const next of [id,...(this.links[id]||[])])if(this.field[next]>=0){
      const x=next%N-ORIGIN,z=Math.floor(next/N)-ORIGIN;
      const s=this.field[next]+Math.hypot(x-e.x,z-e.z)*.60;
      if(s<score&&lineOpen(e.x,e.z,x,z,spec.radius)){score=s;best=next;}
     }
     if(best>=0){tx=best%N-ORIGIN;tz=Math.floor(best/N)-ORIGIN;}else moving=false;
    }
    let vx=tx-e.x,vz=tz-e.z,len=Math.hypot(vx,vz);vx/=Math.max(len,.001);vz/=Math.max(len,.001);
    for(const other of this.enemies){if(other===e)continue;const ox=e.x-other.x,oz=e.z-other.z,dd=Math.hypot(ox,oz),gap=spec.radius+ENEMY_TYPES[other.type].radius;if(dd<gap&&dd>.001){vx+=ox/dd*(gap-dd)*1.6;vz+=oz/dd*(gap-dd)*1.6;}}
    len=Math.hypot(vx,vz);const step=Math.min(spec.speed*dt,Math.hypot(tx-e.x,tz-e.z));vx=vx/Math.max(1,len)*step;vz=vz/Math.max(1,len)*step;
    const beforeX=e.x,beforeZ=e.z;
    if(moving&&enemyCanStand(e.x+vx,e.z+vz,spec.radius)){e.x+=vx;e.z+=vz;}
    else if(moving){if(enemyCanStand(e.x+vx,e.z,spec.radius))e.x+=vx;if(enemyCanStand(e.x,e.z+vz,spec.radius))e.z+=vz;}
    walked=Math.hypot(e.x-beforeX,e.z-beforeZ);if(walked>.0001){e.yaw=Math.atan2(e.x-beforeX,e.z-beforeZ);if(spec.stride)e.walkPhase+=walked/spec.stride;else e.anim+=walked/(e.type==='petal'?.75:1.0);}
   }
   e.walkBlend+=(Math.min(1,walked/Math.max(spec.speed*dt,.0001))-e.walkBlend)*(1-Math.exp(-dt*12));
   if(e.type==='crystal'&&sight)e.yaw=Math.atan2(dx,dz);
  }
  const before=this.enemies.length;for(const e of this.enemies)if(e.hp<=0)this.defeated.push(e);this.enemies=this.enemies.filter(e=>e.hp>0);this.kills+=before-this.enemies.length;
  for(const b of this.bullets){b.x+=b.vx*dt;b.z+=b.vz*dt;b.life-=dt;if(!enemyCanStand(b.x,b.z,.08))b.life=0;if(Math.hypot(b.x-player[0],b.z-player[2])<.35){this.damage(6);b.life=0;}}
  this.bullets=this.bullets.filter(b=>b.life>0);
  if(this.time>=300)this.finished=true;
 }
 damage(n){if(this.hurt<=0){this.hp=Math.max(0,this.hp-n);this.hurt=.65;}}
}
