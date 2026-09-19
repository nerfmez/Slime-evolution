"""Extract supplied video pixels; no generated/redrawn tongue or poison.
Usage: python art/elite-frog/extract-tongue.py SOURCE.mp4
Requires ffmpeg, Pillow and numpy. Source fingerprint is recorded in metadata.
"""
from pathlib import Path
import subprocess, tempfile, sys, hashlib, json
from PIL import Image
import numpy as np
from scipy.ndimage import label
source=Path(sys.argv[1]); root=Path(__file__).resolve().parents[2]
selected=[(6,125,362),(7,120,359),(8,120,359),(9,155,391),(10,155,391),(12,155,391),(15,155,391),(18,155,391),(19,155,391),(20,155,391)]
atlas=Image.new('RGBA',(1024,960)); frames=[]
with tempfile.TemporaryDirectory() as tmp:
 subprocess.run(['ffmpeg','-loglevel','error','-y','-i',str(source),'-vf','fps=5',tmp+'/%02d.png'],check=True)
 for i,(n,mx,my) in enumerate(selected):
  rgb=np.array(Image.open(Path(tmp)/f'{n:02}.png').convert('RGB')).astype(float)
  yy,xx=np.indices(rgb.shape[:2]); delta=xx-mx
  center=my+delta*(.22 if n<9 else .035)
  keep=(xx>=mx-2)&((xx>=185)|(np.abs(yy-center)<9+np.maximum(delta,0)*.08))
  # Remove only the white matte; keep the supplied colored mist semi-transparent.
  dark=255-rgb.min(axis=2);sat=rgb.max(axis=2)-rgb.min(axis=2)
  alpha=np.clip(np.maximum(dark/180,sat/95),0,1)*keep
  alpha[(dark<7)|(alpha<.055)]=0
  clean=np.clip((rgb-255*(1-alpha[:,:,None]))/np.maximum(alpha[:,:,None],.001),0,255)
  rgba=np.dstack([clean,alpha*255]).astype('uint8')
  raw=Image.fromarray(rgba).crop((mx-8,my-200,mx+760,my+88))
  cell=raw.resize((512,192),Image.Resampling.LANCZOS)
  atlas.paste(cell,((i%2)*512,(i//2)*192))
  core=(rgb[:,:,0]>rgb[:,:,1]*1.18)&(rgb[:,:,0]>rgb[:,:,2]*1.12)&(alpha>.8)&(xx>=mx)
  labels,count=label(core)
  sizes=np.bincount(labels.ravel());sizes[0]=0
  solid=labels==sizes.argmax()
  cols=np.where(solid)[1]
  samples=[]
  for x in range(mx,int(cols.max())+1,6):
   rows=np.where(solid[:,max(mx,x-3):x+4].any(axis=1))[0]
   if not len(rows):continue
   cuts=np.split(rows,np.where(np.diff(rows)>3)[0]+1)
   for band in cuts:samples.append([x-mx,round(my-float(band.mean()),2),round(max(4,(int(band[-1])-int(band[0]))/2),2)])
  frames.append({'sourceFrame':n,'sourceMouth':[mx,my],'samples':samples,'reachPixels':int(cols.max()-mx),'rect':[i%2*.5,1-(i//2+1)/5,.5,.2]})
peak=max(f['reachPixels'] for f in frames)
for f in frames:f['reach']=round(f['reachPixels']/peak*4.5,6)
out=root/'species/enemies/elite-frog-tongue.webp';atlas.save(out,'WEBP',lossless=True,method=6)
meta={'source':source.name,'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'atlasSHA256':hashlib.sha256(out.read_bytes()).hexdigest(),'width':1024,'height':960,'cell':[512,192],'sourceCell':[768,288],'mouth':[8,200],'pixelWorld':4.5/peak,'frames':frames}
(root/'art/elite-frog/tongue-source.json').write_text(json.dumps(meta,indent=2)+'\n')
(root/'species/elite-frog-tongue-frames.js').write_text('// Measured from supplied video pixels. Rebuild with art/elite-frog/extract-tongue.py.\nexport const TONGUE_ART='+json.dumps({k:meta[k] for k in ['width','height','sourceCell','mouth','pixelWorld','frames']},separators=(',',':'))+';\n')
print(json.dumps({'bytes':out.stat().st_size,'reaches':[f['reach'] for f in frames]}))
