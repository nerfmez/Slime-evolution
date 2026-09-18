"""Prepare the approved Pond Turtle WITHOUT generating or repainting any poses."""
from pathlib import Path
import hashlib,json,shutil
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFilter
from scipy import ndimage
import argparse
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--preview-dir',type=Path,default=Path('test-results/turtle-art'))
args=parser.parse_args()
R=Path(__file__).resolve().parents[1];W=args.preview_dir;W.mkdir(parents=True,exist_ok=True)
A=R/'art/turtle';O=R/'game/assets/enemies';O.mkdir(parents=True,exist_ok=True)
video=A/'approved-walk.mp4';source=A/'approved-poses.png'
cap=cv2.VideoCapture(str(video));frames=[]
while True:
    ok,frame=cap.read()
    if not ok: break
    frames.append(cv2.cvtColor(frame,cv2.COLOR_BGR2RGB))
cap.release()
if len(frames)!=156:raise RuntimeError('Approved walk video must contain 156 frames')
frames=np.array(frames);static=np.array(Image.open(source).convert('RGB'));CELL=384;PIVOT=(192,328)

def silhouette(rgb,all_parts=False):
 gray=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY);lo=rgb.min(2).astype('float32');hi=rgb.max(2).astype('float32')
 bits=((gray<150)|((hi-lo>42)&(lo<165)&(rgb[:,:,1].astype(float)>rgb[:,:,0]*.93))).astype('uint8')*255
 bits=cv2.morphologyEx(bits,cv2.MORPH_CLOSE,np.ones((3,3),'uint8'))
 cs,_=cv2.findContours(bits,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE);cs=sorted(cs,key=cv2.contourArea,reverse=True)
 mm=np.zeros(bits.shape,'uint8')
 for c in (cs if all_parts else cs[:1]):
  if cv2.contourArea(c)>12:cv2.drawContours(mm,[c],0,255,-1)
 # Remove exterior beige paper shadows, not the enclosed cream skin or flowers.
 sat=(hi-lo)/np.maximum(hi,1)
 candidates=(gray>152)&(sat<.36)&(rgb[:,:,0]>rgb[:,:,1].astype(float)*1.025)
 candidate=(mm==0)|candidates
 exterior=ndimage.binary_propagation(np.pad(np.ones((1,candidate.shape[1]),bool),((0,candidate.shape[0]-1),(0,0))),mask=candidate)
 # Boundary seeds on ALL sides, not just the top.
 seeds=np.zeros(mm.shape,bool);seeds[0]=candidate[0];seeds[-1]=candidate[-1];seeds[:,0]=candidate[:,0];seeds[:,-1]=candidate[:,-1]
 exterior=ndimage.binary_propagation(seeds,mask=candidate);mm[exterior]=0
 return mm

def alpha_edge(rgb,mask):
 # Unmatte a 1.5-pixel silhouette edge against the original off-white paper.
 core=cv2.erode(mask,np.ones((3,3),'uint8'))>0
 dist,idx=ndimage.distance_transform_edt(~core,return_indices=True)
 f=rgb[idx[0],idx[1]].astype('float32')/255;c=rgb.astype('float32')/255;b=np.ones_like(c)*.992
 v=b-f;alpha=np.clip(np.sum((b-c)*v,2)/np.maximum(np.sum(v*v,2),.001),0,1)
 alpha[core]=1;alpha[dist>2.2]=0
 alpha[(mask==0)&(alpha<.12)]=0
 un=np.clip((c-(1-alpha[:,:,None])*b)/np.maximum(alpha[:,:,None],.001),0,1)
 un[core]=c[core]
 rgba=np.dstack([(un*255+.5).astype('uint8'),(alpha*255+.5).astype('uint8')]);rgba[alpha==0,:3]=0
 return rgba

def box(mask):
 y,x=np.where(mask>127);return [int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1)]
def tile(rgba,scale,anchor):
 im=Image.fromarray(rgba);w,h=im.size;im=im.resize((round(w*scale),round(h*scale)),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(CELL,CELL));out.alpha_composite(im,(round(PIVOT[0]-anchor[0]*scale),round(PIVOT[1]-anchor[1]*scale)))
 return out
cells=[];records=[];walk_ids=list(range(72,144,6))
# A full continuous gait cycle; same scale and same scene-space floor for all 12 frames.
# Translation registration uses upper-shell silhouette centre, not moving paws.
for n in walk_ids:
 rgb=frames[n];mask=silhouette(rgb);rgba=alpha_edge(rgb,mask)
 # Uniform, bounded saturation correction compensates for the video's softer encoding.
 col=rgba[:,:,:3].astype(float);luma=col@np.array([.2126,.7152,.0722]);corrected=np.clip(luma[:,:,None]+(col-luma[:,:,None])*1.045,0,255)
 rgba[:,:,:3]=np.round(corrected).astype('uint8')
 yy,xx=np.where((mask>127)&(np.indices(mask.shape)[0]<340))
 cx=(xx.min()+xx.max())/2
 im=tile(rgba,.445,(cx+7,488));cells.append(im)
 records.append({'cell':len(cells)-1,'state':'walk','videoFrame':n,'timestamp':n/30,'sourceFrameSHA256':hashlib.sha256(rgb.tobytes()).hexdigest(),'scale':.445,'anchor':[float(cx+7),488]})
# Crop only the approved original sheet, not the subsequently generated action sheet.
configs=[('hurt',(32,24,697,548),.47,(329,503)),('death',(710,148,1420,540),.47,(372,363))]
for name,bounds,scale,anchor in configs:
 x,y,xx,yy=bounds;rgb=static[y:yy,x:xx];mask=silhouette(rgb,True);rgba=alpha_edge(rgb,mask)
 cells.append(tile(rgba,scale,anchor));records.append({'cell':len(cells)-1,'state':name,'crop':bounds,'scale':scale,'anchor':anchor})
# Guard body and aura share the exact same transform. The aura is independently faded,
# avoiding cross-faded double bodies or re-drawn limb poses.
bounds=(280,547,1128,1038);x,y,xx,yy=bounds;rgb=static[y:yy,x:xx];col=rgb.astype('float32')/255
poly=np.array([(409,29),(451,40),(478,86),(510,60),(554,56),(552,100),(608,99),(633,129),(649,154),(679,202),(684,240),(686,267),(674,300),(699,332),(696,371),(664,402),(634,426),(591,439),(547,449),(481,450),(433,439),(412,418),(362,414),(326,401),(295,389),(265,381),(223,375),(191,363),(164,347),(166,322),(161,300),(151,277),(174,257),(179,228),(204,209),(207,189),(201,181),(231,156),(257,145),(270,119),(302,123),(286,96),(329,83),(350,91),(367,75),(412,77)],np.int32)
rough=np.zeros(rgb.shape[:2],'uint8');cv2.fillPoly(rough,[poly],255)
# Constrained silhouette follows original dark contours within a narrow hand-reviewed envelope.
ink=silhouette(rgb);ink=cv2.bitwise_and(ink,cv2.dilate(rough,np.ones((9,9),'uint8')))
ink=cv2.morphologyEx(ink,cv2.MORPH_CLOSE,np.ones((13,13),'uint8'))
cs,_=cv2.findContours(ink,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE);body=np.zeros_like(ink);cv2.drawContours(body,[max(cs,key=cv2.contourArea)],0,255,-1)
# White energy ribbon cuts through the outside contour. Fill the reviewed opaque shell envelope.
body=np.maximum(body,cv2.erode(rough,np.ones((7,7),'uint8')))
body=cv2.morphologyEx(body,cv2.MORPH_CLOSE,np.ones((7,7),'uint8'))
cs,_=cv2.findContours(body,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE);body[:]=0;cv2.drawContours(body,[max(cs,key=cv2.contourArea)],0,255,-1)
body_rgba=alpha_edge(rgb,body)
# Soft, green key outside the shell preserves translucent spell glow rather than white paper.
green=np.maximum(0,col[:,:,1]-(col[:,:,0]+col[:,:,2])*.5)
a=np.clip((green-.011)*4.8,0,1)
leaves=silhouette(rgb,True);a=np.maximum(a,leaves/255)
# Explicit matte over the four existing white energy streaks; this restores white cores,
# not new artwork. Only the original source RGB is used.
ribbons=[[(88,191),(85,217),(91,242),(108,263),(140,281),(177,297),(217,313),(254,333),(285,345),(249,337),(213,326),(177,317),(139,304),(108,289),(89,269),(80,246),(79,218)],
[(603,320),(644,300),(678,275),(699,250),(711,220),(711,192),(701,163),(685,135),(666,111),(635,78),(659,96),(688,127),(713,162),(730,199),(733,232),(720,264),(697,289),(660,306),(624,318)],
[(135,350),(110,358),(103,371),(112,389),(135,402),(174,418),(222,431),(267,439),(321,446),(263,446),(212,439),(164,426),(129,412),(108,397),(98,382),(99,367),(111,357)],
[(512,467),(563,463),(613,453),(653,437),(691,416),(727,395),(755,374),(769,356),(776,341),(781,354),(773,374),(753,393),(720,415),(680,438),(635,455),(580,469),(535,474)]]
rr=np.zeros(a.shape,'uint8')
for points in ribbons:cv2.fillPoly(rr,[np.array(points,np.int32)],255)
# Avoid expanding white into paper along any rough path: require a nearby green edge.
near=cv2.dilate((green>.035).astype('uint8'),np.ones((17,17),'uint8'))>0
white=np.clip((col.min(2)-.79)/.15,0,1)
a=np.maximum(a,(rr/255)*near*white*.95)
a[body>0]=0
# Clear detached paper flecks; keep colored leaves and the coherent aura.
a[a<.035]=0
outcol=np.clip((col-(1-a[:,:,None]))/np.maximum(a[:,:,None],.001),0,1)
aura_rgba=np.dstack([(outcol*255+.5).astype('uint8'),(a*255+.5).astype('uint8')]);aura_rgba[a==0,:3]=0
scale=.422;anchor=(463,451)
cells.append(tile(body_rgba,scale,anchor));records.append({'cell':14,'state':'guard','crop':bounds,'scale':scale,'anchor':anchor})
cells.append(tile(aura_rgba,scale,anchor));records.append({'cell':15,'state':'shield-effect','crop':bounds,'scale':scale,'anchor':anchor})
atlas=Image.new('RGBA',(1536,1536))
for i,im in enumerate(cells):atlas.alpha_composite(im,((i%4)*CELL,(i//4)*CELL))
atlas.save(O/'pond-turtle-atlas.webp',lossless=True,method=6)
meta={'version':1,'species':'turtle','image':'pond-turtle-atlas.webp','size':[1536,1536],'cellSize':[384,384],'pivot':list(PIVOT),'nativeFacing':'right','walkFrames':walk_ids,'walkPeriodSourceFrames':72,'walkSaturationFactor':1.045,'sourceSHA256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [video,source,A/'approved-poses-upload.jpg']},'cells':records}
(O/'pond-turtle-atlas.json').write_text(json.dumps(meta,indent=2)+'\n')
# Dark/green backgrounds and a matching-size full-state board for inspection.
preview=Image.new('RGB',(4*320,4*285),(49,64,57));d=ImageDraw.Draw(preview)
for i in range(15):
 im=cells[i].copy()
 if i==14:im.alpha_composite(cells[15])
 im=im.resize((280,280),Image.Resampling.LANCZOS);xx=(i%4)*320;yy=(i//4)*285
 preview.paste(im,(xx+20,yy),im);d.text((xx+16,yy+10),f'{i+1:02d} '+records[i]['state'],fill='white')
preview.save(W/'turtle-prepared-review.png')
for i,im in enumerate(cells):im.save(W/f'cell-{i:02d}.png')
print('ATLAS', (O/'pond-turtle-atlas.webp').stat().st_size)
print('WALK FRAMES',walk_ids)
