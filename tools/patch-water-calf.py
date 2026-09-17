"""One-time, checked semantic edits to the EXACT finished-frog bundle.
Never accepts an old root prototype or attempts compatibility with another release.
"""
from pathlib import Path
import hashlib,json,subprocess
root=Path(__file__).resolve().parents[1]
# Requires the known baseline commit in Git history, never a root prototype.
source=subprocess.check_output(['git','show','6e098d66f2d29e739ce8cfeae4e61ad562c824c4:game/assets/main-critter-v4.js'],cwd=root).decode()
assert hashlib.sha256(source.encode()).hexdigest()==next(x['sha256'] for x in json.loads((root/'baseline-manifest.json').read_text()) if x['path']=='assets/main-critter-v4.js')
s=source; edits=[]; reverse=[]
def rep(old,new,label,count=1):
 global s
 assert s.count(old)==count,(label,s.count(old))
 positions=[];start=0
 for _ in range(count):
  pos=s.index(old,start);positions.append(pos);start=pos+len(old)
 for pos in reversed(positions):
  s=s[:pos]+new+s[pos+len(old):];reverse.append({'label':label,'start':pos,'old':old,'new':new})
 edits.append({'label':label,'old':old,'new':new,'count':count})
rep('crystal:{name:`Crystal Warden Alpha`','water:{name:`Water Calf Alpha`','elite slot')
rep('crystal:{name:`Crystal Warden`','water:{name:`Water Calf`','normal slot')
rep('moss_pillar_line`?1:a.kind===`crystal_burst`?7:12','moss_pillar_line`?1:12','remove Crystal ground burst count')
rep('t(r,a.kind===`crystal_burst`?27:36,','t(r,36,','remove Crystal hazard mesh branch')
rep('crystal_burst:3.8,','','remove Crystal special cooldown')
rep(':t.type===`crystal`&&c>2.2&&c<7.4&&Ee(t,`crystal_burst`,.9,r[0],r[2],1.62,Math.round(i.damage*1.34))',':void 0','remove Crystal elite AI')
rep('(n.elite||n.boss)&&ke(this,n,','((n.elite&&n.type!==`water`)||n.boss)&&ke(this,n,','new enemy has own ranged AI; all other elite AI unchanged')
rep('this.flightTrails=[],this.frogDead=[]','this.flightTrails=[],this.frogDead=[],this.waterDead=[],this.waterSplashes=[]','reset new enemy visual state')
rep('e=Math.min(e,.05),this.frogDead','e=Math.min(e,.05),tickWaterWorld(this,e),this.frogDead','age only Water Calf visual state')
old='if(n.type===`crystal`&&!n.elite&&s<6.5&&f?(d=s>4.5,n.attack<=0&&n.windup===0&&(n.windup=.6,n.attack=2.7),n.windup>0&&(n.windup-=e,d=!1,n.windup<=0&&(n.windup=0,this.bullets.push({x:n.x,z:n.z,vx:a/Math.max(s,.001)*3.8,vz:o/Math.max(s,.001)*3.8,life:3})))):n.windup=0,d)'
rep(old,'if(n.type===`water`?d=waterRanged(this,n,e,t,s,f,i.damage):n.windup=0,d)','replace Crystal firing at existing movement interface')
rep('n.type===`crystal`&&f&&(n.yaw=Math.atan2(a,o))','n.type===`water`&&f&&(n.yaw=Math.atan2(a,o))','ranged facing')
rep('this.frogDead.push({...e,frogDeath:0}),this.defeated.push(e)','this.frogDead.push({...e,frogDeath:0}),e.type===`water`&&this.waterDead.push({...e,waterDeath:0}),this.defeated.push(e)','death once; shared EXP/defeated path unchanged')
rep('this.bullets=this.bullets.filter(e=>e.life>0)','finishWaterBullets(this),this.bullets=this.bullets.filter(e=>e.life>0)','splash after shared bullet collision')
rep('{thorn:2,moss:5,petal:6,crystal:10}','{thorn:2,moss:5,petal:6,water:10}','preserve old slot EXP')
rep('zr={},Br,Vr,','zr={},Br,waterRenderer,Vr,','one sprite renderer instance')
rep('[...Object.keys(ft),`petal-fly`','[...Object.keys(ft).filter(e=>e!==`water`),`petal-fly`','no Crystal/Water 3D model load')
rep('Promise.all(Object.keys(ft).map(async e=>{zr[e].eliteTex','Promise.all(Object.keys(ft).filter(e=>e!==`water`).map(async e=>{zr[e].eliteTex','no Crystal/Water elite model texture load')
rep('try{Br=await Fe(H)}','waterRenderer=await createWaterCalfRenderer(H,{program:T,geometry:E,uniform:D,render:je});try{Br=await Fe(H)}','required actual elephant atlas at boot')
rep('if(e.type===`thorn`&&!e.elite&&W.camera===`game`&&Br)continue;','if(e.type===`water`||e.type===`thorn`&&!e.elite&&W.camera===`game`&&Br)continue;','do not draw obsolete Crystal model')
rep('e.type===`moss`?.22:e.type===`crystal`?.25:.18','e.type===`moss`?.22:.18','remove unused Crystal lighting selector')
rep('e.type===`moss`?1:e.type===`crystal`?2:0','e.type===`moss`?1:0','remove unused Crystal palette selector')
rep('H.disable(H.BLEND),H.depthMask(!0);for(let e of J.bullets)Q(or,e.kind===`seed`?35:27,w(e.x,.4,e.z,1,1,1,Math.atan2(e.vx,e.vz)),1);',
'''H.disable(H.BLEND),H.depthMask(!0);if(waterRenderer){const camera=W.camera===`side`?[0,4,18]:W.camera===`top`?[0,21,.1]:[0,12,15];for(const enemy of [...t,...J.waterDead||[]])if(enemy.type===`water`&&dr(enemy.x,enemy.z,2)){const drawn=waterRenderer.draw(enemy,X,W.player,camera);Yn+=drawn.calls;Xn+=drawn.triangles}for(const bullet of J.bullets)if(bullet.kind===`water-shot`){const drawn=waterRenderer.drawProjectile(bullet,X,W.player,camera);Yn+=drawn.calls;Xn+=drawn.triangles}for(const splash of J.waterSplashes||[]){const drawn=waterRenderer.drawSplash(splash,X,W.player,camera);Yn+=drawn.calls;Xn+=drawn.triangles}H.useProgram(U)}for(let e of J.bullets)if(e.kind!==`water-shot`)Q(or,e.kind===`seed`?35:27,w(e.x,.4,e.z,1,1,1,Math.atan2(e.vx,e.vz)),1);''','draw actual elephant/shot/splash images using shared scene depth')
rep('for(let e of t)e.windup>0&&Q(or,27,','for(let e of t)e.type!==`water`&&e.windup>0&&Q(or,27,','no crystal charge mesh on water enemy')
# Leave the player's Frost/Crystal skill untouched; only enemy Crystal references were removed.
assert 'crystal:{' not in s and 'crystal_burst' not in s and 'type===`crystal`' not in s
s="import {createWaterCalfRenderer,waterRanged,tickWaterWorld,finishWaterBullets} from './water-calf.js';\n"+s
s+='\nif(new URLSearchParams(location.search).has("qa"))globalThis.__slimeGameQA={get world(){return J},get combat(){return Y},get state(){return W},get waterRenderer(){return waterRenderer},canStand:P,draw:Qr};\n'
(root/'game/assets/main-critter-v4.js').write_text(s)
html=(root/'game/index.html').read_text()
html=html.replace('value="crystal">Crystal Warden','value="water">Water Calf').replace('value="elite-crystal">Crystal Warden Alpha','value="elite-water">Water Calf Alpha')
(root/'game/index.html').write_text(html)
for f in ('crystal.bin','crystal.json','crystal.png','crystal-elite.png'):(root/'game/assets/enemies'/f).unlink(missing_ok=True)
(root/'docs/water-calf-edits.json').write_text(json.dumps({'baselineBundleSHA256':hashlib.sha256(source.encode()).hexdigest(),'edits':edits},ensure_ascii=False,indent=2)+'\n')
(root/'docs/water-calf-reverse.json').write_text(json.dumps(list(reversed(reverse)),ensure_ascii=False,indent=2)+'\n')
print('Applied',len(edits),'checked enemy-only edits')
