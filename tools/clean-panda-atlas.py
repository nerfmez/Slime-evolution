"""Clean the existing real-video Panda atlas; never regenerate or repaint its poses."""
from pathlib import Path
import hashlib,json
import cv2,numpy as np
from scipy import ndimage as ndi
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[1];W=R/'test-results/panda-art';W.mkdir(parents=True,exist_ok=True)
src=R/'art/panda/prepared-atlas-before-edge-cleanup.webp'
a=np.array(Image.open(src).convert('RGBA'));out=a.copy();cells=[]
def digest(x):return hashlib.sha256(x).hexdigest()
for c in range(20):
 y,x=c//4*384,c%4*384;t=a[y:y+384,x:x+384].copy();rgb=t[:,:,:3].astype(float);alpha=t[:,:,3].astype(float)/255
 old=alpha.copy()
 if c<19:
  # Only exterior-connected near-neutral paper remnants; cream fur stays enclosed by its ink contour.
  hi=rgb.max(2);lo=rgb.min(2);sat=(hi-lo)/np.maximum(hi,1)
  paper=(hi>170)&(sat<.22)
  permitted=(alpha<.05)|paper
  seeds=alpha<.05
  paper_out=ndi.binary_propagation(seeds,mask=permitted)
  if c<17:
   distance_to_clear=ndi.distance_transform_edt(alpha>.05)
   alpha[paper_out & (distance_to_clear<2)]=0
  binary=alpha>.35
  labels,n=ndi.label(binary);sizes=np.bincount(labels.ravel());sizes[0]=0
  if c<17:
   # Walk/roll/charge keep the connected character, not flecks from the white video set.
   keep=labels==sizes.argmax()
  else:
   # Original hit burst, loose bamboo, ghost and fallen leaves remain intentionally separate.
   keep=sizes[labels]>=22
  keep=cv2.morphologyEx(keep.astype('uint8'),cv2.MORPH_CLOSE,np.ones((2,2),'uint8'),anchor=(0,0)).astype(bool)
  # Do not expand artwork: the original alpha remains the upper bound.
  inside=ndi.distance_transform_edt(keep)
  outside=ndi.distance_transform_edt(~keep)
  smooth=np.clip((inside-outside+.1)/1.8,0,1)
  alpha=np.minimum(alpha,smooth)
  # Fringe colors are borrowed only from the nearest retained interior pixel, never across the body.
  core=(alpha>.95)&(inside>=2)
  _,idx=ndi.distance_transform_edt(~core,return_indices=True)
  edge=(alpha>0)&(alpha<.95)
  rgb[edge]=rgb[idx[0][edge],idx[1][edge]]
 else:
  # Fade the original detached dust plume on every crop edge; never show a rectangular video crop.
  ys,xs=np.where(alpha>.03);left,right,top,bottom=xs.min(),xs.max(),ys.min(),ys.max()
  yy,xx=np.indices(alpha.shape)
  edge=np.minimum.reduce([xx-left,right-xx,yy-top,bottom-yy])
  fade=np.clip(edge/14,0,1);fade=fade*fade*(3-2*fade)
  alpha*=fade
 t[:,:,:3]=np.rint(rgb).clip(0,255).astype('uint8');t[:,:,3]=np.rint(alpha*255).astype('uint8');t[t[:,:,3]==0,:3]=0
 out[y:y+384,x:x+384]=t
 state='walk' if c<8 else 'roll' if c<16 else ['charge','hurt','death','dust'][c-16]
 cells.append({'cell':c,'state':state,'sourceRGBA':digest(a[y:y+384,x:x+384].tobytes()),'rgbaSHA256':digest(t.tobytes()),'alphaSHA256':digest(t[:,:,3].tobytes()),'pixelsAlphaChanged':int(np.count_nonzero(t[:,:,3]!=a[y:y+384,x:x+384,3]))})
 Image.fromarray(t).save(W/f'cell-{c:02}.png')
O=R/'game/assets/enemies';Image.fromarray(out).save(O/'bamboo-panda-atlas.webp',lossless=True,method=6)
meta={'species':'panda','version':1,'size':[1536,1920],'cellSize':[384,384],'pivot':[192,330], 'walkCells':list(range(8)),'rollCells':list(range(8,16)), 'source':'Existing registered video-frame atlas, alpha-edge cleanup only; source media preserved separately.', 'nativeFacing':'right','cells':cells,'sourceSHA256':{p.name:digest(p.read_bytes()) for p in (R/'art/panda').iterdir()},'atlasSHA256':digest((O/'bamboo-panda-atlas.webp').read_bytes()),'rgbaSHA256':digest(out.tobytes()),'alphaSHA256':digest(out[:,:,3].tobytes()),'opaqueRGBSHA256':digest(out[:,:,:3][out[:,:,3]==255].tobytes())}
(O/'bamboo-panda-atlas.json').write_text(json.dumps(meta,indent=2)+'\n')
# Comparable reviews, identical pose/scale on dark and pale backgrounds.
for tag,color in [('dark',(38,51,59)),('light',(224,227,219))]:
 im=Image.new('RGBA',(1536,1920),color+(255,));im.alpha_composite(Image.fromarray(out));im.convert('RGB').resize((768,960)).save(W/f'atlas-{tag}.png')
print(json.dumps({'atlasBytes':(O/'bamboo-panda-atlas.webp').stat().st_size,'changedAlphaPixels':sum(c['pixelsAlphaChanged'] for c in cells)},indent=2))
