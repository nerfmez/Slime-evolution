import {mountSunfallTuner} from './sunfall-tuner.js';
import {infernoSettings,effectDuration} from './vfx/inferno-settings.js';
import {mountInfernoTuner} from './inferno-tuner.js';
import {FireCombat} from './fire-combat.js';
import {ENEMY_TYPES} from './enemies.js';

export const PRESETS={
 inferno:{name:'Inferno · ลูกไฟ',branches:[1,0,0],hint:'ลูกไฟพุ่ง → ระเบิด → ควันจาง'},
 blast:{name:'แรงระเบิด · LV4',branches:[4,0,0],hint:'ระเบิดแรงและกว้างขึ้น · ดูน้ำหนักจังหวะกระแทก'},
 scatter:{name:'สะเก็ดกระจาย · LV4',branches:[0,4,0],hint:'ลูกไฟระเบิดแล้วปล่อยสะเก็ดรอบทิศ'},
 burn:{name:'เพลิงคงค้าง · LV4',branches:[0,0,4],hint:'ระเบิดแล้วเหลือเปลวไฟเผาบนพื้น'},
 sun:{name:'Sun Fall · EVO',branches:[4,3,3],evo:'blast',hint:'ดวงอาทิตย์ตก → ระเบิดเป็นโดม → ควันม้วนแผ่ออกและสลาย'},
 meteor:{name:'Meteor · EVO',branches:[3,4,3],evo:'scatter',hint:'อุกกาบาตตกเฉียงต่อเนื่องพร้อมรอยกระแทก'},
 cyclone:{name:'พายุไฟ · EVO',branches:[3,3,4],evo:'burn',hint:'พายุหมุนดึงและเผาเป้าหมายต่อเนื่อง'}
};
export class SkillLab{
 constructor(){
  this.combat=new FireCombat();this.player=[-2.5,0,1.8];this.target={x:-2.5,z:-1.65};
  this.world={enemies:[],defeated:[],bullets:[],hp:100,hurt:0,kills:0,time:0,finished:false,unlocked:()=>Object.keys(ENEMY_TYPES).filter(type=>type!=='boss')};
  this.paused=false;this.speed=1;this.repeat=true;this.showTargets=true;this.soulCount=0;this.select('inferno');
 }
 select(id){if(!PRESETS[id])return;this.preset=id;this.restart();}
 restart(){
  const p=PRESETS[this.preset],c=this.combat;c.reset();c.cards=[];c.opening=false;c.level=50;c.fireLevel=p.branches.reduce((a,b)=>a+b,0);c.branches=Object.fromEntries(['blast','scatter','burn'].map((k,i)=>[k,p.branches[i]]));c.evo=p.evo||'';c.cooldown=1e6;
  this.elapsed=0;this.damage=0;this.nextCast=4.8;this.world.time=0;
  this.world.enemies=Object.keys(ENEMY_TYPES).filter(type=>type!=='boss').map((type,i)=>({id:i+1,type,x:this.target.x+(i%2-.5)*1.05,z:this.target.z+Math.floor(i/2)*1.05-.5,hp:99999,radius:ENEMY_TYPES[type].radius,yaw:0,walkBlend:0,walkPhase:.2,anim:0,attack:0,windup:0,hit:0}));
  for(const e of this.world.enemies){e.homeX=e.x;e.homeZ=e.z;}
  this.setSouls(this.soulCount);c.cast(this.target,this.player);
 }
 setSouls(count){this.soulCount=count;this.combat.souls=Array.from({length:count},(_,i)=>({id:i+1,x:this.target.x+Math.cos(i*2.39996)*(2+Math.sqrt(i/count)*4),z:this.target.z+Math.sin(i*2.39996)*(2+Math.sqrt(i/count)*4),value:2,age:0}));}
 seek(age){
  this.elapsed=age;this.world.time=age;const c=this.combat;c.projectiles=[];c.fx=[];c.patches=[];c.events=[];c.cyclones=[];c.numbers=[];
  const t=Math.min(1,age/.42),s=c.stats;
  if(t<1)c.projectiles=[{x:this.player[0],z:this.player[2]+(this.target.z-this.player[2])*t,y:.36,tx:this.target.x,tz:this.target.z,vx:0,vz:-1,life:1.8-age,s}];
  else{
   const a=age-.42,x=this.target.x,z=this.target.z;
   if(a<effectDuration(infernoSettings))c.fx=[{type:'blast',x,z,r:s.radius,age:a}];
   if(a<1.1)for(let i=0;i<s.embers;i++){const angle=i*Math.PI*2/s.embers,vx=Math.cos(angle)*5.8,vz=Math.sin(angle)*5.8;c.projectiles.push({x:x+vx*a,z:z+vz*a,y:.16,vx,vz,life:1.1-a,ember:true,s});}
   if(a<s.groundTime)c.patches=[{x,z,r:s.groundRadius,age:a,life:s.groundTime-a}];
  }
 }

 tick(dt){
  if(this.previewMode){const end=Math.max(effectDuration(infernoSettings),this.combat.stats.groundTime)+.65;this.seek(this.repeat?(this.elapsed+dt)%end:Math.min(end,this.elapsed+dt));return;}
  this.elapsed+=dt;this.world.time+=dt;this.nextCast-=dt;
  if(this.repeat&&this.nextCast<=0){this.combat.cast(this.target,this.player);this.nextCast=4.8;}
  this.combat.cooldown=1e6;this.combat.update(dt,this.world,this.player);
  for(const e of this.world.enemies){this.damage+=99999-e.hp;e.hp=99999;e.x=e.homeX;e.z=e.homeZ;e.hit=Math.max(0,e.hit-dt);}
 }
 update(raw){const dt=this.paused?0:Math.min(raw,.05)*this.speed;if(dt>0)this.tick(dt);return dt;}
 step(){this.paused=true;this.tick(1/60);return 1/60;}
}

export function mountSkillLab({enter,exit,onStep,onCamera,capture}){
 const lab=new SkillLab(),button=document.createElement('button');button.id='skill-test';button.textContent='ทดสอบสกิล';button.setAttribute('aria-expanded','false');document.querySelector('header .right').append(button);
 const panel=document.createElement('section');panel.id='skill-lab';panel.className='paper';panel.hidden=true;panel.setAttribute('aria-label','ห้องทดสอบสกิลไฟ');
 panel.innerHTML=`<div class="panelhead"><div><small>FIRE STUDY</small><strong>ห้องทดสอบสกิลไฟ</strong></div><button id="lab-close">กลับเล่น</button></div>
 <label>สกิล<select id="lab-preset">${Object.entries(PRESETS).map(([id,p])=>`<option value="${id}">${p.name}</option>`).join('')}</select></label>
 <p id="lab-description"></p><div class="row"><button id="lab-cast" class="primary">ร่ายใหม่</button><button id="lab-pause">หยุดภาพ</button><button id="lab-step">1 เฟรม</button></div>
 <div class="lab-options"><label>ความเร็ว<select id="lab-speed"><option value="1">1×</option><option value="0.25">¼×</option></select></label><label>กล้อง<select id="lab-camera"><option value="game">มุมเล่น</option><option value="side">ด้านข้าง</option><option value="top">ด้านบน</option></select></label></div>
 <div class="lab-options"><label class="check"><input id="lab-repeat" type="checkbox" checked>ร่ายซ้ำ</label><label class="check"><input id="lab-targets" type="checkbox" checked>แสดงมอน</label></div>
 <label>ทดสอบเม็ด EXP<select id="lab-souls"><option value="0">ไม่เพิ่ม</option><option value="100">100 เม็ด</option><option value="500">500 เม็ด</option></select></label>
 <output id="lab-readout" aria-live="off"></output><p class="lab-note">มอนยืนนิ่งและฟื้น HP · รอบเล่นเดิมพักไว้</p>`;
 document.body.append(panel);const $=id=>panel.querySelector('#'+id);let active=false,lastReadout=-1;
 const tuner=mountInfernoTuner(panel,lab,{capture,onSeek:t=>onStep(t,null,true),onMode:()=>{$('lab-preset').value=lab.preset;$('lab-targets').checked=false;lab.showTargets=false;}});
 const sunTuner=mountSunfallTuner(panel,lab);
 function sync(){sunTuner.sync();panel.querySelector('#inferno-tuner').hidden=lab.preset==='sun';
  tuner.sync();
  const hint=PRESETS[lab.preset].hint,pause=lab.paused?'เล่นต่อ':'หยุดภาพ';if($('lab-description').textContent!==hint)$('lab-description').textContent=hint;if($('lab-pause').textContent!==pause)$('lab-pause').textContent=pause;
  const stamp=Math.floor(lab.elapsed*10);if(stamp!==lastReadout){lastReadout=stamp;$('lab-readout').textContent=`${lab.elapsed.toFixed(1)} วิ · ดาเมจรวม ${Math.round(lab.damage)} · EXP ${lab.combat.souls.length} เม็ด`;}
 }
 function close(){if(!active)return;active=false;panel.hidden=true;document.body.classList.remove('lab-active');button.setAttribute('aria-expanded','false');tuner.close();sunTuner.close();exit();button.focus({preventScroll:true});}
 button.onclick=()=>{if(active){close();return;}active=true;lab.paused=false;lab.restart();panel.hidden=false;document.body.classList.add('lab-active');button.setAttribute('aria-expanded','true');enter(lab);$('lab-camera').value='game';sync();$('lab-preset').focus({preventScroll:true});};
 $('lab-close').onclick=close;$('lab-preset').onchange=e=>{tuner.close();lab.select(e.target.value);sync();};$('lab-cast').onclick=()=>{lab.restart();if(lab.previewMode)lab.seek(0);sync();};$('lab-pause').onclick=()=>{lab.paused=!lab.paused;sync();};$('lab-step').onclick=()=>{onStep(lab.step());sync();};
 $('lab-speed').onchange=e=>lab.speed=Number(e.target.value);$('lab-camera').onchange=e=>onCamera(e.target.value);$('lab-repeat').onchange=e=>{lab.repeat=e.target.checked;lab.nextCast=Math.max(.1,lab.nextCast);};$('lab-targets').onchange=e=>lab.showTargets=e.target.checked;$('lab-souls').onchange=e=>{lab.setSouls(Number(e.target.value));lastReadout=-1;sync();};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){e.preventDefault();close();}});
 return {lab,get active(){return active;},sync};
}
