// One-time, hash-guarded v2 -> v3 integration. Rerunning is a no-op after materialization.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
function migrate(path,marker,sha,edit){const text=readFileSync(path,'utf8');if(text.includes(marker))return;if(createHash('sha256').update(text).digest('hex')!==sha)throw Error('Unexpected baseline; review '+path);writeFileSync(path,edit(text));}
migrate('critters/logic.js','syncExpAppearance','788238c97e3ca189a234f37bdab0be28fbed903b5daf1fb6fc4dcd05fa554c8d',s=>"import {syncExpAppearance} from './catalog.js';\n"+s.replace('return o.critter;','return syncExpAppearance(o,o.critter);').replace('return o.critter={...o.critter,','o.critter={...o.critter,').replace('fleeArmed:true,fleeLeft:0};','fleeArmed:true,fleeLeft:0};\n  return syncExpAppearance(o,o.critter);'));
migrate('critters/renderer.js','expShapes','3c17d94c96b0614662dcebcca4e3f96b306f93abce79f21544de69f8cf3e354a',s=>{
 s=s.replace("import {ensureCritter} from './logic.js';","import {ensureCritter} from './logic.js';\nimport {expShapes} from './xp-shapes.js';");
 s=s.replace('void main(){\n bool special=info.x>2.5;','${expShapes}\nvoid main(){\n bool special=info.x>2.5&&info.x<5.5;');
 let a=s.indexOf(' if(type<.5){'),b=s.indexOf(' }else if(type<3.5){',a);if(a<0||b<a)throw Error('Missing animal shader boundary');
 s=s.slice(0,a)+' if(!special){\n  expAnimal(p,type-6.,gait,body,eye,base,accent,accentColor,detail);\n'+s.slice(b);
 a=s.indexOf(' if(type>1.5&&type<2.5');b=s.indexOf(' if(special){',a);if(a<0||b<a)throw Error('Missing animal pigment boundary');
 s=s.slice(0,a)+' if(!special){\n  pigment=mix(pigment,accentColor,1.-smoothstep(-.025,-.008,accent));\n  pigment=mix(pigment,ink,(1.-smoothstep(-.003,.014,detail))*.58);\n }\n'+s.slice(b);
 return s.replace('small=o.kind ? .44 :.24+Math.min(.05,Math.log2(1+o.value)*.008)','small=o.kind ? .44 : c.expSize');
});
migrate('scripts/apply-critter-patch.mjs','main-critter-v3','69ec64cbdfc12d05411472281cee581912cd8934a16113b8b1e3c1c253b198eb',s=>{
 s=s.replaceAll('critters-v2','critters-v3').replaceAll('main-critter-v2','main-critter-v3');
 s=s.replace("const old=html.includes('./assets/main-critter-v1.js')?'./assets/main-critter-v1.js':'./assets/main-CT954LmH.js';","const old=html.match(/\\.\\/assets\\/main-critter-v[0-9]+\\.js/)?.[0]||'./assets/main-CT954LmH.js';");
 s=s.replace("['logic.js','renderer.js']","['logic.js','renderer.js','catalog.js','xp-shapes.js']");
 return s.replace("writeFileSync(release+'/index.html',html);","if(!html.includes('/exp-animals.html'))html=replaceOnce(html,'<div id=\"skill-tools\" class=\"settings-actions\"></div>','<div id=\"skill-tools\" class=\"settings-actions\"></div><a class=\"settings-link\" href=\"/exp-animals.html\" target=\"_blank\" rel=\"noopener\">สัตว์ EXP · 9 เซ็ต / 27 แบบ ↗</a>','EXP catalog link');\nwriteFileSync(release+'/index.html',html);\ncopyFileSync('critters/review.html',release+'/exp-animals.html');");
});
console.log('EXP v3 readable sources materialized without rebuilding the older root source.');
