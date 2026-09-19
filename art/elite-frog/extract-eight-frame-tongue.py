"""Rebuild the eight approved sweep/retraction frames without redrawing pixels.
Usage: python art/elite-frog/extract-eight-frame-tongue.py
Requires Pillow, numpy, scipy. Source cells are row-major, zero-based.
"""
from pathlib import Path
import hashlib,json
from PIL import Image
import numpy as np
from scipy.ndimage import label
root=Path(__file__).resolve().parents[2]
source=root/'art/elite-frog/approved-eight-frames.webp'
selection=json.loads((source.parent/'eight-frame-selection.json').read_text())
sheet=Image.open(source).convert('RGB');atlas=Image.new('RGBA',(1024,768));frames=[]
for i,selected in enumerate(selection['frames']):
 mx,my=selected['mouth']
 rgb=np.array(sheet.crop((i%2*768,i//2*256,i%2*768+768,i//2*256+256))).astype(float)
 yy,xx=np.indices(rgb.shape[:2]);delta=xx-mx
 # Isolate the continuous painted tongue at the lips; discard the frog body.
 # Past the body's right edge, retain the entire tongue and venom silhouette.
 center=my-delta*.10
 keep=(xx>=mx-2)&((xx>=225)|(np.abs(yy-center)<6))
 dark=255-rgb.min(axis=2);sat=rgb.max(axis=2)-rgb.min(axis=2)
 alpha=np.clip(np.maximum(dark/180,sat/95),0,1)*keep
 alpha[(dark<7)|(alpha<.055)]=0
 if selected['closed']:alpha[:]=0
 clean=np.clip((rgb-255*(1-alpha[:,:,None]))/np.maximum(alpha[:,:,None],.001),0,255)
 rgba=np.dstack([clean,alpha*255]).astype('uint8')
 raw=Image.fromarray(rgba).crop((mx-8,my-200,mx+760,my+88))
 atlas.paste(raw.resize((512,192),Image.Resampling.LANCZOS),((i%2)*512,(i//2)*192))
 core=(rgb[:,:,0]>rgb[:,:,1]*1.18)&(rgb[:,:,0]>rgb[:,:,2]*1.12)&(alpha>.8)&(xx>=mx)
 labels,count=label(core);samples=[];reach=0
 if count:
  sizes=np.bincount(labels.ravel());sizes[0]=0;solid=labels==sizes.argmax();cols=np.where(solid)[1];reach=int(cols.max()-mx)
  for x in range(mx,int(cols.max())+1,6):
   rows=np.where(solid[:,max(mx,x-3):x+4].any(axis=1))[0]
   if not len(rows):continue
   for band in np.split(rows,np.where(np.diff(rows)>3)[0]+1):
    samples.append([x-mx,round(my-float(band.mean()),2),round(max(4,(int(band[-1])-int(band[0]))/2),2)])
 frames.append({'sourceFrame':i,'sourceMouth':[mx,my],'closed':selected['closed'],'samples':samples,'reachPixels':reach,'rect':[i%2*.5,1-(i//2+1)/4,.5,.25]})
peak=max(f['reachPixels'] for f in frames)
for f in frames:f['reach']=round(f['reachPixels']/peak*4.5,6)
out=root/'species/enemies/elite-frog-tongue.webp';atlas.save(out,'WEBP',lossless=True,method=6)
meta={'source':source.name,'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'atlasSHA256':hashlib.sha256(out.read_bytes()).hexdigest(),'width':1024,'height':768,'cell':[512,192],'sourceCell':[768,288],'mouth':[8,200],'pixelWorld':4.5/peak,'ends':selection['ends'],'frames':frames}
(source.parent/'tongue-source.json').write_text(json.dumps(meta,indent=2)+'\n')
(root/'species/elite-frog-tongue-frames.js').write_text('// Approved eight image frames. Rebuild with art/elite-frog/extract-eight-frame-tongue.py.\nexport const TONGUE_ART='+json.dumps({k:meta[k] for k in ['width','height','sourceCell','mouth','pixelWorld','ends','frames']},separators=(',',':'))+';\n')
print(json.dumps({'bytes':out.stat().st_size,'reaches':[f['reach'] for f in frames],'samples':[len(f['samples']) for f in frames]}))
