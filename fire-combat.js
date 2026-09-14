import {updateCritterSouls} from './critters/logic.js';
import {sunfallSettings,sunfallLife} from './vfx/sunfall-settings.js';
// Fire rules ported from Slime-v100/scripts/main.gd and inferno_seed.gd.
import {effectDuration,infernoSettings} from './vfx/inferno-settings.js';
import {enemyCanStand} from './enemies.js';
export const BRANCHES={blast:['แรงระเบิด','เพิ่มดาเมจระเบิด 17% และรัศมี'],scatter:['สะเก็ดกระจาย','ปลดล็อกสะเก็ดไฟ เพิ่มจำนวนเมื่ออัปเกรด'],burn:['เพลิงคงค้าง','เพิ่มไฟเผาและทิ้งพื้นที่ไหม้']};
export const EVOS={blast:'Sun Fall',scatter:'Meteor',burn:'พายุไฟ'};
export const MODS={power:['พลังโจมตี','ดาเมจ +8%'],haste:['เร่งร่าย','ลดคูลดาวน์ 4.5%'],area:['ขยายพื้นที่','พื้นที่สกิล +8%'],duration:['ยืดเวลา','ระยะเวลาสกิล +10%'],vitality:['พลังชีวิต','HP สูงสุด +14'],soul:['รับวิญญาณ','EXP +5%'],magnet:['แรงดึงดูด','ระยะเก็บวิญญาณ +0.42'],blood_feast:['งานเลี้ยงโลหิต','ฆ่ามอนใกล้ตัวฟื้น HP มีคูลดาวน์']};
export function fireStats(level,b,m,evo=''){
 const power=1+(m.power||0)*.08,duration=1+(m.duration||0)*.1,area=1+(m.area||0)*.08;
 let damage=Math.round((10+level*1.95)*(1+b.blast*.17)*power),burn=Math.max(2,Math.round((2+level*.34+b.burn*1.15)*power)),burnTime=(1.75+level*.08+b.burn*.34)*duration,radius=(.92+level*.045+b.blast*.115)*area;
 let embers=b.scatter?4+b.scatter:0,emberDamage=embers?Math.round(damage*(.20+b.scatter*.015)):0,pierce=0,groundTime=b.burn?(1.20+b.burn*.44)*duration:0,groundRadius=b.burn?radius*(.64+b.burn*.035):0;
 if(b.blast===4){damage=Math.round(damage*1.18);radius*=1.15;}
 if(b.scatter===4){embers+=2;emberDamage=Math.round(emberDamage*1.12);pierce=1;}
 if(b.burn===4){burn=Math.round(burn*1.18);burnTime*=1.15;groundTime=Math.max(groundTime,burnTime*.82);groundRadius=Math.max(groundRadius,radius*.80);}
 const cooldown=Math.max(1.25,(2.38-level*.035)*({blast:1.15,scatter:1.30,burn:1.22}[evo]||1)*(1-(m.haste||0)*.045));
 return {damage,burn,burnTime,radius,embers,emberDamage,pierce,groundTime,groundRadius,cooldown};
}
export class FireCombat{
 constructor(){this.reset();}
 reset(){this.level=1;this.xp=0;this.needed=6;this.fireLevel=0;this.branches={blast:0,scatter:0,burn:0};this.mods=Object.fromEntries(Object.keys(MODS).map(k=>[k,0]));this.evo='';this.cooldown=.38;this.healClock=0;this.projectiles=[];this.patches=[];this.cyclones=[];this.events=[];this.souls=[];this.fx=[];this.numbers=[];this.rerolls=1;this.opening=true;this.cards=['blast','scatter','burn'];this.revision=0;this.serial=0;this.seed=7421;}
 get choosing(){return this.cards.length>0;}
 get stats(){return fireStats(this.fireLevel,this.branches,this.mods,this.evo);}
 get maxHP(){return 100+14*this.mods.vitality;}
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 roll(){
  if(this.fireLevel>=10&&!this.evo)return ['evo:blast','evo:scatter','evo:burn'];
  const branches=this.fireLevel<10?Object.keys(BRANCHES).filter(k=>this.branches[k]<4):[];
  const mods=Object.keys(MODS).filter(k=>this.mods[k]<5&&(k!=='duration'||this.branches.burn>0));
  const pick=a=>a.splice(Math.floor(this.random()*a.length),1)[0],out=[];
  if(mods.length)out.push('mod:'+pick(mods));
  while(out.length<3&&branches.length)out.push(pick(branches));
  while(out.length<3&&mods.length)out.push('mod:'+pick(mods));
  if(!out.length)out.push('heal');
  for(let i=out.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;
 }
 checkLevel(){if(!this.choosing&&this.level<50&&this.xp>=this.needed){this.cards=this.roll();this.revision++;}}
 choose(id,world){
  if(!this.cards.includes(id))return false;
  if(id.startsWith('evo:'))this.evo=id.slice(4);
  else if(id.startsWith('mod:')){const key=id.slice(4);this.mods[key]++;if(key==='vitality')world.hp=Math.min(this.maxHP,world.hp+14);}
  else if(id==='heal')world.hp=Math.min(this.maxHP,world.hp+20);
  else {this.branches[id]++;this.fireLevel++;}
  if(!this.opening){this.xp-=this.needed;this.level++;this.needed=5+this.level*3;if(this.level===50)this.xp=0;}
  this.opening=false;this.cards=[];this.revision++;this.checkLevel();return true;
 }
 reroll(){if(!this.choosing||this.opening||this.fireLevel>=10&&!this.evo||this.rerolls<=0)return;this.rerolls--;this.cards=this.roll();this.revision++;}
 target(world,player){
  const near=world.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-player[0],e.z-player[2])<=10).sort((a,b)=>Math.hypot(a.x-player[0],a.z-player[2])-Math.hypot(b.x-player[0],b.z-player[2])).slice(0,6);
  let best=null,score=-1;for(const e of near){let count=0;for(const n of world.enemies)if(n.hp>0&&(n.x-e.x)**2+(n.z-e.z)**2<=8.4)count++;if(count>score){score=count;best=e;}}return best;
 }
 hit(e,damage,x,z,push=0){if(e.hp<=0)return;let applied=damage;if(e.isBoss)applied=Math.max(1,Math.round(applied*.72));if(e.type==='petal'&&e.isElite&&e.flying)applied=Math.max(1,Math.round(applied*1.5));e.hp-=applied;e.hit=.12;if(this.numbers.length<48)this.numbers.push({x:e.x,z:e.z,value:applied,age:0});
  if(push){const d=Math.hypot(e.x-x,e.z-z)||1,resist=e.isBoss?.06:e.type==='moss'?(e.isElite?.18:.25):e.type==='crystal'&&e.isElite?.43:e.type==='petal'&&e.isElite?.85:e.isElite?.55:1,scale=resist*push*.10,nx=e.x+(e.x-x)/d*scale,nz=e.z+(e.z-z)/d*scale;if(enemyCanStand(nx,nz,e.radius)){e.x=nx;e.z=nz;}}
 }
 burn(e,damage,duration){e.burnDamage=Math.max(e.burnDamage||0,damage);e.burnTime=Math.max(e.burnTime||0,duration);e.burnTick=Math.min(e.burnTick??.28,.28);}
 effect(type,x,z,r){if(this.fx.length>=40)this.fx.shift();this.fx.push({type,x,z,r,age:0});}
 ground(x,z,s){if(!s.groundTime)return;const existing=this.patches.find(p=>Math.hypot(p.x-x,p.z-z)<Math.max(.70,s.groundRadius*.72));if(existing){existing.life=Math.max(existing.life,s.groundTime);existing.damage=Math.max(existing.damage,Math.max(1,Math.round(s.burn*.62)));return;}this.patches.push({x,z,age:0,r:s.groundRadius,life:s.groundTime,damage:Math.max(1,Math.round(s.burn*.62)),tick:.08});}
 explode(world,x,z,s,scatter=true,visual='blast'){this.effect(visual,x,z,s.radius);for(const e of world.enemies)if(e.hp>0&&Math.hypot(e.x-x,e.z-z)<=s.radius+e.radius*.35){this.hit(e,s.damage,x,z,1.5);this.burn(e,s.burn,s.burnTime);}this.ground(x,z,s);
  if(scatter)for(let i=0;i<s.embers;i++){const a=i*Math.PI*2/s.embers;this.projectiles.push({x,z,y:.16,vx:Math.cos(a)*5.8,vz:Math.sin(a)*5.8,life:1.1,ember:true,s,hitIds:new Set(),left:1+s.pierce});}
 }
 cast(target,player){const s=this.stats,x=target.x,z=target.z;
  if(!this.evo){this.projectiles.push({x:player[0],z:player[2],y:.36,tx:x,tz:z,life:1.8,s});return;}
  if(this.evo==='blast'){this.events.push({type:'sun',x,z,age:0,delay:sunfallSettings.fall,s:{...s,damage:Math.round(s.damage*1.42*(1+this.branches.scatter*.035)),radius:s.radius*(1.25+this.branches.scatter*.015),burn:Math.round(s.burn*1.08)}});return;}
  if(this.evo==='scatter'){for(let i=0;i<7+this.branches.scatter;i++){const a=this.random()*Math.PI*2,r=Math.sqrt(this.random())*(.5+this.branches.scatter*.08)*2.5;this.events.push({type:'meteor',x:x+Math.cos(a)*r,z:z+Math.sin(a)*r,age:0,delay:.20+i*.14,s:{...s,damage:Math.max(3,Math.round(s.damage*.29)),radius:Math.max(.72,s.radius*.54),burn:Math.max(2,Math.round(s.burn*.66)),burnTime:s.burnTime*.76,groundTime:s.groundTime*.85,groundRadius:s.groundRadius*1.18}});}return;}
  this.cyclones.push({x,z,r:Math.max(1.20,s.radius*.82),life:2.55+this.mods.duration*.18,age:0,tick:0,s,speed:2+this.branches.scatter*.08});
 }
 update(dt,world,player){
  if(dt<=0||this.choosing||world.hp<=0||world.finished)return;
  this.healClock=Math.max(0,this.healClock-dt);
  for(const e of world.defeated.splice(0)){if(this.mods.blood_feast>0&&this.healClock<=0&&Math.hypot(e.x-player[0],e.z-player[2])<2.55+(this.mods.blood_feast-1)*.1){world.hp=Math.min(this.maxHP,world.hp+(this.mods.blood_feast<3?1:2));this.healClock=Math.max(.60,.95-(this.mods.blood_feast-1)*.08);}
   const baseValue={thorn:2,moss:5,petal:6,crystal:10,boss:24}[e.type]||2,value=baseValue*(e.isBoss?1:e.isElite?3:1);if(e.isElite)this.rerolls++;const near=this.souls.find(o=>Math.hypot(o.x-e.x,o.z-e.z)<.65);if(near)near.value+=value;else this.souls.push({x:e.x,z:e.z,value,age:0,id:++this.serial});this.effect('death',e.x,e.z,e.isBoss?1.25:e.isElite?.58:.38);}
  updateCritterSouls(this,dt,player,enemyCanStand);
  this.souls=this.souls.filter(o=>o.value>0);this.checkLevel();if(this.choosing)return;
  for(const e of world.enemies)if(e.burnTime>0&&e.hp>0){e.burnTime-=dt;e.burnTick-=dt;if(e.burnTick<=0){this.hit(e,e.burnDamage,e.x,e.z);e.burnTick=.60;}if(e.burnTime<=0)e.burnDamage=0;}
  this.cooldown=Math.max(0,this.cooldown-dt);if(this.cooldown<=0&&this.fireLevel){const target=this.target(world,player);if(target){this.cast(target,player);this.cooldown=this.stats.cooldown;}}
  for(const p of this.projectiles){p.life-=dt;const ox=p.x,oz=p.z;if(p.ember){p.x+=p.vx*dt;p.z+=p.vz*dt;for(const e of world.enemies)if(e.hp>0&&!p.hitIds.has(e.id)&&Math.hypot(e.x-p.x,e.z-p.z)<e.radius+.16){this.hit(e,p.s.emberDamage,p.x,p.z,.35);this.burn(e,Math.max(1,Math.round(p.s.burn*.55)),p.s.burnTime*.70);p.hitIds.add(e.id);if(--p.left<=0){p.life=0;break;}}}
   else{const dx=p.tx-p.x,dz=p.tz-p.z,d=Math.hypot(dx,dz),move=Math.min(d,7.2*dt);if(d){p.x+=dx/d*move;p.z+=dz/d*move;}if(d<=move+.08||world.enemies.some(e=>e.hp>0&&Math.hypot(e.x-p.x,e.z-p.z)<e.radius+.14)||p.life<=0){this.explode(world,p.x,p.z,p.s);p.life=0;}p.vx=p.x-ox;p.vz=p.z-oz;}}
  this.projectiles=this.projectiles.filter(p=>p.life>0);
  for(const e of this.events){e.age+=dt;if(e.age>=e.delay){this.explode(world,e.x,e.z,e.s,false,e.type);e.done=true;}}this.events=this.events.filter(e=>!e.done);
  for(const c of this.cyclones){c.age+=dt;c.life-=dt;c.tick-=dt;const target=this.target(world,[c.x,0,c.z]);if(target){const dx=target.x-c.x,dz=target.z-c.z,d=Math.hypot(dx,dz),step=Math.min(d,c.speed*dt);if(d){c.x+=dx/d*step;c.z+=dz/d*step;}}for(const e of world.enemies){const d=Math.hypot(e.x-c.x,e.z-c.z);if(e.hp<=0||d>c.r)continue;if(c.tick<=0){this.hit(e,Math.max(2,Math.round(c.s.damage*.10)),c.x,c.z);this.burn(e,c.s.burn,c.s.burnTime*.78);}if(d>.35){const pull=dt*(e.type==='moss'?.15:.5),x=e.x+(c.x-e.x)/d*pull,z=e.z+(c.z-e.z)/d*pull;if(enemyCanStand(x,z,e.radius)){e.x=x;e.z=z;}}}if(c.tick<=0)c.tick=.25;}this.cyclones=this.cyclones.filter(c=>c.life>0);
  for(const p of this.patches){p.age=(p.age??0)+dt;p.life-=dt;p.tick-=dt;if(p.tick<=0){p.tick=.56;for(const e of world.enemies)if(e.hp>0&&Math.hypot(e.x-p.x,e.z-p.z)<p.r)this.burn(e,p.damage,1.15);}}this.patches=this.patches.filter(p=>p.life>0);
  for(const f of this.fx)f.age+=dt;this.fx=this.fx.filter(f=>f.age<(f.type==='sun'?sunfallLife():f.type==='meteor'?2.4:f.type==='death'?1.05:f.type==='blast'?effectDuration(infernoSettings):1.5));for(const n of this.numbers)n.age+=dt;this.numbers=this.numbers.filter(n=>n.age<.75);
 }
}
