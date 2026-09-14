// Reproducible derivative of the latest uploaded release, not a rebuild of older root code.
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const release='published/2026-09-14',assets=release+'/assets';
let bundle=readFileSync(assets+'/main-CT954LmH.js','utf8');
if(createHash('sha256').update(bundle).digest('hex')!=='e5803aca6d871d8484aa8d5ed056c85c00aa0785398b46b7800bfdb6f18eb208')throw Error('Uploaded baseline changed: review it before patching.');
function replaceOnce(text,old,next,label){if(text.split(old).length!==2)throw Error('Expected one '+label);return text.replace(old,next);}
const oldSouls='for(let t of this.souls){t.age+=e;let r=n[0]-t.x,i=n[2]-t.z,a=Math.hypot(r,i),o=3.4+this.mods.magnet*.42;if(t.age>.12&&a<.38)this.level<50&&(this.xp+=t.value*(1+this.mods.soul*.05)),t.value=0;else if(t.age>.12&&a<o){let n=Math.min(a,(2.2+6.3*(1-a/o))*e);t.x+=r/a*n,t.z+=i/a*n}}';
bundle=replaceOnce(bundle,oldSouls,'__critterSouls(this,e,n,P);','EXP collection loop');
bundle=replaceOnce(bundle,'for(let r of this.pickups)r.age+=e,r.age>.15&&Math.hypot(r.x-n[0],r.z-n[2])<.5*this.size&&this.collect(r,t);','__critterSpecial(this,e,t,n,P);','special pickup loop');
bundle=replaceOnce(bundle,'for(let e of this.souls)this.level<50&&(this.xp+=e.value*(1+.05*this.mods.soul));this.souls=[]','__critterMagnet(this)','global magnet');
const rendererStart=bundle.indexOf('function Rt(e){'),rendererEnd=bundle.indexOf('function zt(e){',rendererStart);
if(rendererStart<0||rendererEnd<rendererStart)throw Error('Renderer boundary not found');
bundle=bundle.slice(0,rendererStart)+'function Rt(e){return __critterRenderer(e)}'+bundle.slice(rendererEnd);
bundle=replaceOnce(bundle,'Hr.draw(Y.souls,X,W.time,W.player,dr)','Hr.draw(Y.souls,X,W.time,W.player,dr,Y.pickups)','combined pickup draw');
bundle=replaceOnce(bundle,'for(let t of e.pickups||[]){let e=t.kind===`heal`?[.96,.32,.38]:t.kind===`magnet`?[.27,.6,1]:[.93,.73,.24];c(t.x,.22+Math.sin(n*3)*.04,t.z,.15,.22,e,1,n),s(t.x,t.z,.24,.04,.025,e,.8)}','','old special pickup diamonds');
bundle='import {updateCritterSouls as __critterSouls,updateSpecialCritters as __critterSpecial,attractAllCritters as __critterMagnet} from "./critters-v2/logic.js";\nimport {createCritterRenderer as __critterRenderer} from "./critters-v2/renderer.js";\n'+bundle;
bundle=replaceOnce(bundle,'ระยะเก็บวิญญาณ +0.42','ดูดสัตว์ EXP · ระยะ +0.42 ต่อขั้น','magnet mod description');
writeFileSync(assets+'/main-critter-v2.js',bundle);
let html=readFileSync(release+'/index.html','utf8');
if(!html.includes('./assets/main-critter-v2.js')){const old=html.includes('./assets/main-critter-v1.js')?'./assets/main-critter-v1.js':'./assets/main-CT954LmH.js';html=replaceOnce(html,old,'./assets/main-critter-v2.js','release entry');}
writeFileSync(release+'/index.html',html);
mkdirSync(assets+'/critters-v2',{recursive:true});
for(const file of ['logic.js','renderer.js'])copyFileSync('critters/'+file,assets+'/critters-v2/'+file);
let source=readFileSync('fire-combat.js','utf8');
if(!source.includes('updateCritterSouls')){
 if(createHash('sha256').update(source).digest('hex')!=='a450289f1849f1403ec306850424289ef79702688c2be3340a41323114c1a69b')throw Error('Root FireCombat changed: review before patching');
 const start=source.indexOf('for(const o of this.souls){o.age+=dt;'),end=source.indexOf('\n  this.souls=this.souls.filter',start);
 if(start<0||end<start)throw Error('Root EXP loop not found');
 source="import {updateCritterSouls} from './critters/logic.js';\n"+source.slice(0,start)+'updateCritterSouls(this,dt,player,enemyCanStand);'+source.slice(end);
 writeFileSync('fire-combat.js',source);
}
writeFileSync('vfx/beads.js',"// Compatibility entry for the older editable baseline.\nexport {createCritterRenderer as createBeadRenderer,critterVertex as beadVertex,critterFragment as beadFragment} from '../critters/renderer.js';\n");
console.log('Applied critter feature to latest uploaded release and legacy EXP entry.');
