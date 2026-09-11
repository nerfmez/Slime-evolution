// Meadow art direction layered over the preserved Godot shader algorithms.
// Keep highlights within display range; the source emission assumed HDR rendering.
export const FIRE_COLORS={col_white:[1,.93,.72],col_hot:[1,.73,.29],col_body:[.94,.43,.14],col_rim:[.64,.22,.105],col_ink:[.29,.32,.24],col_smoke_dark:[.45,.49,.40],col_smoke_mid:[.66,.69,.57],col_smoke_lit:[.86,.85,.71],intensity:1,ink:.26,bulge:.32,bands:4};
export function meadowMaterials(original){
 const result=Object.fromEntries(Object.entries(original).map(([k,v])=>[k,{...v,defaults:{...v.defaults},types:{...v.types}}]));
 for(const material of Object.values(result))material.fs=material.fs.replace('ALBEDO+EMISSION','clamp(ALBEDO+EMISSION*.08,0.,1.)');
 const volume=result.fire_volume;Object.assign(volume.defaults,FIRE_COLORS);
 volume.fs=volume.fs.replace('step(0.22, qf)','smoothstep(.23,.29,fs)').replace('step(0.52, qf)','smoothstep(.49,.55,fs)').replace('step(0.80, qf)','smoothstep(.78,.84,fs)');
 volume.fs=volume.fs.replace('ALBEDO = c * mix(intensity, 0.95, soot);','ALBEDO = c * mix(intensity, 0.98, soot) * (0.98 + v_disp * 0.035);');
 Object.assign(result.ground_flare.defaults,{col_hot:FIRE_COLORS.col_hot,col_body:FIRE_COLORS.col_body,col_rim:FIRE_COLORS.col_rim,intensity:1});
 Object.assign(result.procedural_flame.defaults,{base_color:[.94,.43,.14,.82],hot_color:[1,.91,.63,.94],flow_speed:.82});
 result.procedural_flame.fs=result.procedural_flame.fs.replace('1.20) * 1.02','1.02) * 1.0');
 const sun=result.celestial_fire;
 sun.defaults.noise_scale=.48;
 sun.fs=sun.fs.replace('vec3(0.14, 0.065, 0.045)','vec3(.24,.22,.16)').replace('vec3(0.34, 0.17, 0.10)','vec3(.43,.36,.24)').replace('vec3(1.0, 0.26, 0.035)','vec3(.94,.43,.14)').replace('vec3(1.0, 0.76, 0.18)','vec3(1.,.82,.43)').replace('vec3(1.0, 0.64, 0.055)','vec3(.97,.62,.20)').replace('vec3(1.0, 0.88, 0.30)','vec3(1.,.88,.54)').replace('vec3(1.0, 0.30, 0.025)','vec3(.77,.31,.12)').replace('ALBEDO = color;','float edge=1.-smoothstep(.08,.35,max(dot(normalize(NORMAL),normalize(VIEW)),0.));\n color=mix(color,vec3(.43,.26,.14),edge*(rock?.55:.18));\n ALBEDO = color;');
 for(const name of ['fire_ground','fire_impact_crown']){
  result[name].fs=result[name].fs.replaceAll('vec3(1.0, 0.30, 0.025)','vec3(.93,.42,.14)').replaceAll('vec3(1.0, 0.28, 0.035)','vec3(.87,.37,.14)').replaceAll('vec3(1.0, 0.82, 0.36)','vec3(1.,.84,.48)').replaceAll('vec3(1.0, 0.80, 0.26)','vec3(1.,.81,.42)').replaceAll('vec3(0.12, 0.075, 0.055)','vec3(.31,.30,.20)').replaceAll('vec3(0.23, 0.17, 0.12)','vec3(.42,.37,.23)').replaceAll('vec3(1.0, 0.32, 0.025)','vec3(.97,.51,.18)').replaceAll('vec3(0.92, 0.20, 0.025)','vec3(.80,.38,.14)');
 }
 return result;
}
