// Web counterpart of Godot Explosion Lab QUICK / SHAPE / MOTION / MASSES.
export const FIELDS={
 emberSize:['ขนาดสะเก็ด',.06,.32,.01,.16,'สะเก็ดไฟ'],emberArc:['ความสูงวิถีโค้ง',0,1,.02,.55,'สะเก็ดไฟ'],emberTail:['ความยาวหางสะเก็ด',0,2,.05,.65,'สะเก็ดไฟ'],
 groundWidth:['ความกว้างเปลว',.25,3,.05,1,'เพลิงคงค้าง'],groundSpread:['ระยะกระจายเปลว',.2,1.2,.05,1,'เพลิงคงค้าง'],groundCount:['จำนวนเปลว',1,10,1,5,'เพลิงคงค้าง'],groundOpacity:['ความเข้มวงพื้นส้มแดง',.03,.9,.01,.58,'เพลิงคงค้าง'],
 groundHeight:['ความสูงเปลวคงค้าง',.12,.9,.02,.22,'เพลิงคงค้าง'],groundSway:['ความเร็วสะบัดเปลว',.2,2,.05,.85,'เพลิงคงค้าง'],groundFade:['เวลาหดดับช่วงท้าย',.15,1,.05,.45,'เพลิงคงค้าง'],
 bodySize:['ลูกไฟ · ขนาด',.16,.50,.01,.28,'ลูกไฟ'],bodyStretch:['ยืดตามทิศบิน',.7,1.8,.02,1.12,'ลูกไฟ'],tail:['ความยาวหาง',.15,1,.02,.43,'ลูกไฟ'],wrap:['เปลวพันรอบ',.3,1.4,.02,.85,'ลูกไฟ'],pulse:['การเต้นของแกน',0,.18,.01,.055,'ลูกไฟ'],
 width:['โดม · กว้าง X',.5,1.7,.02,1,'รูปทรง'],height:['โดม · สูง Y',.35,1.3,.02,.82,'รูปทรง'],depth:['โดม · ลึก Z',.5,1.7,.02,1,'รูปทรง'],bulge:['ความโค้งขอบไฟ',0,.16,.01,.045,'รูปทรง'],asymmetry:['เบี้ยวเล็กน้อย',0,.2,.01,.035,'รูปทรง'],
 pop:['เวลากางโดม',.08,.4,.01,.18,'จังหวะ'],hold:['ค้างทรงโดม',.02,.4,.01,.16,'จังหวะ'],breakTime:['เวลาเปิดโดม',.12,.65,.01,.44,'จังหวะ'],duration:['เวลารวมหลังชน',1.1,3,.05,1.65,'จังหวะ'],curve:['แรงปะทุตอนต้น',1,5,.1,3.2,'จังหวะ'],
 smokeDelay:['ควันเริ่มหลังชน (วินาที)',0,1.5,.01,.32,'ควัน'],smokeDuration:['เวลาควันจนสลาย (วินาที)',.2,2,.05,.8,'ควัน'],smokeSpread:['แรงแผ่ด้านข้าง',.3,1.5,.02,.88,'ควัน'],smokeHeight:['ความสูงควัน',.15,.7,.01,.33,'ควัน'],smokeLift:['ลอยขึ้นช่วงท้าย',0,.6,.02,.13,'ควัน'],smokeRoll:['ความเร็วม้วนควัน',0,3,.05,1.25,'ควัน'],smokeSize:['ขนาดมวลควัน',.5,1.5,.02,1,'ควัน'],
 shock:['ความแรงวงกระแทก',0,1,.05,.6,'รายละเอียด'],sparks:['จำนวนสะเก็ดตกแต่ง',0,12,1,6,'รายละเอียด'],flow:['ความเร็วไหลของไฟ',.2,3,.05,1.1,'รายละเอียด'],
};
for(const [k,v] of Object.entries({bodySize:.19,bodyStretch:1.8,tail:.35,wrap:.44,pulse:.06,duration:1.6,curve:3.3,smokeHeight:.3,smokeSize:.86,flow:.9}))FIELDS[k][4]=v;
// Each ribbon keeps its own saved placement; old presets receive these defaults.
for(let i=0;i<2;i++){
 const group='แถบไฟ '+(i+1);
 for(const [name,label,min,max,step,value] of [
  ['X','เลื่อนซ้าย / ขวา',-1.5,1.5,.01,0],
  ['Z','เลื่อนหน้า / หลัง',-1.5,1.5,.01,0],
  ['Height','ความสูง',0,2.5,.01,i?1.60:1.10],
  ['Radius','รัศมีวงโค้ง',.1,1.8,.01,i?.65:.85],
  ['Angle','มุมรอบโดม (องศา)',-180,180,1,0],
  ['Thickness','ความหนา',.1,2,.05,1]
 ])FIELDS['band'+name+i]=[group+' · '+label,min,max,step,value,group];
}
export const effectDuration=s=>Math.max(s.duration,s.smokeDelay+s.smokeDuration);
export const DEFAULTS=Object.fromEntries(Object.entries(FIELDS).map(([k,v])=>[k,v[4]]));
for(let i=0;i<4;i++)Object.assign(DEFAULTS,{['massSize'+i]:1,['massDelay'+i]:i*.018,['massAngle'+i]:i*90+25,['massReach'+i]:1});
export const COLORS={rim:'#b82912',body:'#ff6515',hot:'#ffbf39',core:'#fff0ab',smokeDark:'#918b7b',smokeLight:'#e6deca'};
export const infernoSettings={...DEFAULTS,...COLORS};
export const infernoView={solo:'all',mass:-1};
export function normalizePreset(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('รูปแบบพรีเซ็ตไม่ถูกต้อง');
 const out={...DEFAULTS,...COLORS};
 for(const [k,v] of Object.entries(FIELDS)){if(raw[k]!==undefined){if(typeof raw[k]!=='number'||!Number.isFinite(raw[k]))throw Error('ค่าตัวเลขไม่ถูกต้อง: '+k);out[k]=Math.max(v[1],Math.min(v[2],raw[k]));if(k==='sparks'||k==='groundCount')out[k]=Math.round(out[k]);}}
 for(let i=0;i<4;i++)for(const [key,min,max] of [['massSize',.4,1.8],['massDelay',0,.3],['massAngle',0,360],['massReach',.4,1.6]]){const k=key+i;if(raw[k]!==undefined){if(!Number.isFinite(raw[k]))throw Error('ค่ามวลควันไม่ถูกต้อง');out[k]=Math.max(min,Math.min(max,raw[k]));}}
 for(const k of Object.keys(COLORS))if(raw[k]!==undefined){if(!/^#[0-9a-f]{6}$/i.test(raw[k]))throw Error('สีไม่ถูกต้อง');out[k]=raw[k];}
 // Keep editable stages ordered even after importing an older preset.
 out.duration=Math.max(out.duration,out.pop+out.hold+out.breakTime+.4);return out;
}
export const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
export function domeState(age,s=infernoSettings){
 const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>x*x*(3-2*x);
 const expansion=1-(1-clamp(age/s.pop))**s.curve,open=clamp((age-s.pop-s.hold)/s.breakTime);
 const smoke=clamp((age-s.smokeDelay)/Math.max(.1,s.duration-s.smokeDelay));
 return {expansion,open,fireFade:1-ease(open),smoke,reach:.68+s.smokeSpread*(1-(1-smoke)**2.8),lift:s.smokeLift*ease(clamp((smoke-.45)/.55)),smokeFade:ease(clamp(smoke/.13))*(1-ease(clamp((smoke-.58)/.42)))};
}
