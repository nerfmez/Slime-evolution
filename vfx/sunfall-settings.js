export const sunfallDefaults={fall:.5,burst:.72,smoke:1.18,size:1,height:1,opacity:1,flightHeight:2.2,smokeSpin:1,smokeStretch:1,bandSpeed:7,bandWidth:1,bandStrength:.9,bandRadius:1,bandHeight:0,bandTilt:1,bandSpacing:1,bandPhase:0,smokeSize3D:1,smokeHeight3D:1,smokeSpread3D:1,smokeLift3D:.15,smokeRoll3D:1,smokeWarmth3D:1,smokeOpacity3D:.85,smokeSteps3D:40};
export const sunfallSettings={...sunfallDefaults};
export const sunfallSpecs=[['fall','เวลาตกจากฟ้า',.25,1.2,.05],['burst','เวลาระเบิดและไฟแตก',.35,1.2,.05],['smoke','เวลาควันสลาย',.35,2.5,.05],['size','ขนาดภาพเอฟเฟกต์',.6,1.5,.05],['height','ความสูงภาพเอฟเฟกต์',.7,1.3,.05],['opacity','ความเข้ม',.5,1,.05],['flightHeight','ระยะตกจากฟ้า',1,3.5,.1],['smokeSpin','การวนควันตามเข็ม',.3,2,.05],['smokeStretch','การยืดหางควัน',.3,2,.05],['bandSpeed','ความเร็วแถบไฟ 3D',1,12,.25],['bandWidth','ความกว้างแถบไฟ 3D',.3,2,.05],['bandStrength','ความชัดแถบไฟ 3D',0,1,.05]];
sunfallSpecs.push(['smokeOpacity3D','ความหนาทึบของควัน',.2,1,.05],['bandRadius','รัศมีวงไฟ 3D',.5,1.5,.05],['bandHeight','ยกตำแหน่งไฟ 3D',-.5,1,.025],['bandTilt','ความเอียงวงไฟ 3D',0,2,.05],['bandSpacing','ระยะห่างสองวงไฟ',.3,1.8,.05],['bandPhase','ตำแหน่งเริ่มหมุนไฟ',0,6.28,.05],['smokeSize3D','ความกว้างฐานควัน 3D',.4,1.6,.05],['smokeHeight3D','ความสูงริ้วควัน 3D',.3,1.8,.05],['smokeSpread3D','ระยะควันแผ่ออก',.2,2,.05],['smokeLift3D','ควันลอยขึ้น',0,.8,.025],['smokeRoll3D','การสะบัดริ้วควัน',0,2,.05],['smokeWarmth3D','แสงไฟบนควัน',0,1,.05]);
export function setSunfall(values){for(const [k,,lo,hi] of sunfallSpecs)if(Number.isFinite(values?.[k]))sunfallSettings[k]=Math.max(lo,Math.min(hi,values[k]));}
try{setSunfall(JSON.parse(localStorage.getItem('slime.sunfall.v1')||'null'));}catch{}
export const sunfallLife=()=>sunfallSettings.burst+sunfallSettings.smoke;
export function sunfallClock(age){const s=sunfallSettings;return .5+(age<s.burst?age/s.burst*.72:.72+(age-s.burst)/s.smoke*1.18);}

export const sunfallView={solo:'all'};
