"""Remove the exterior white matte from eight WHOLE frog attack poses.
No separation, reconstruction, rotation, or independent scaling of the tongue.
Run: python art/elite-frog/extract-full-attack.py (Pillow, numpy, scipy).
"""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image,ImageFilter
from scipy.ndimage import binary_propagation,binary_dilation
root=Path(__file__).resolve().parents[2];art=root/'art/elite-frog'
source=art/'approved-eight-frames.webp';sheet=Image.open(source).convert('RGB')
selection=json.loads((art/'eight-frame-selection.json').read_text())
tongue=json.loads((art/'tongue-source.json').read_text())
masters=[];frames=[];preview=[]
cellw,cellh=768,288;px,py=128,244;bodyh=183
for i,f in enumerate(selection['frames']):
 rgb=np.array(sheet.crop((i%2*768,i//2*256,i%2*768+768,i//2*256+256))).astype(float)
 dark=255-rgb.min(2);sat=rgb.max(2)-rgb.min(2)
 white=(rgb.min(2)>218)&(sat<30)
 seed=np.zeros(white.shape,bool);seed[0]=white[0];seed[-1]=white[-1];seed[:,0]=white[:,0];seed[:,-1]=white[:,-1]
 exterior=binary_propagation(seed,mask=white)
 alpha=(~exterior).astype(float);edge=binary_dilation(exterior)&~exterior
 alpha[edge]=np.clip(dark[edge]/110,0,1)
 clean=np.clip((rgb-255*(1-alpha[:,:,None]))/np.maximum(alpha[:,:,None],.001),0,255)
 rgba=np.dstack([clean,alpha*255]).astype('uint8')
 # Register the body (not the moving tongue) to a fixed feet pivot and height.
 body=(dark[:,:225]>80)&~exterior[:,:225]
 ys,xs=np.where(body);top=int(ys.min());bottom=int(ys.max()+1)
 footx=np.where(body[max(top,bottom-18):bottom].any(0))[0]
 cx=(int(footx.min())+int(footx.max()))/2
 factor=bodyh/(bottom-top);dx=px-cx*factor;dy=py-bottom*factor
 raw=Image.fromarray(rgba)
 aligned=raw.transform((cellw,cellh),Image.Transform.AFFINE,(1/factor,0,-dx/factor,0,1/factor,-dy/factor),Image.Resampling.BICUBIC)
 masters.append(aligned)
 mx,my=f['mouth'];samples=[]
 for x,y,r in tongue['frames'][i]['samples']:
  samples.append([round((mx+x)*factor+dx-px,3),round(py-((my-y)*factor+dy),3),round(r*factor,3)])
 frames.append({'sourceFrame':i,'sourceBodyBounds':[top,bottom],'sourceFeet':[cx,bottom],'sourceTransform':[factor,dx,dy],'bodyHeight':bodyh,'closed':f['closed'],'rect':[i%2*.5,1-(i//2+1)/4,.5,.25],'mouth':[round(mx*factor+dx,3),round(my*factor+dy,3)],'samples':samples})
# Bake ALL poses at the same texel density as the existing 160x80 body atlas.
# Match its visible preparation/recovery body (54-59px), not the transparent cell.
normal=Image.open(root/'species/enemies/elite-frog-atlas.webp').convert('RGBA')
oldframes=frames;frames=[];atlas=Image.new('RGBA',(512,384));preview=[]
cellw,cellh=256,96;px,py=48,78;bodyh=56
order=[('normal',14),('normal',15),('full',0),('full',1),('full',4),('full',5),('full',6),('normal',20)]
ends=[.06,.15,.28,.40,.54,.66,.76,.84]
for i,(kind,n) in enumerate(order):
 cell=Image.new('RGBA',(cellw,cellh));samples=[]
 if kind=='normal':
  pose=normal.crop((n%2*160,n//2*80,n%2*160+160,n//2*80+80))
  # Existing body pivot is x=53.333, y=77.92 in its 160x80 cell.
  cell.paste(pose,(-5,0))
  mouth=[59,44];closed=n==20
  if n==15:
   rgb=np.array(cell).astype(float);yy,xx=np.indices(rgb.shape[:2])
   core=(rgb[:,:,0]>rgb[:,:,1]*1.18)&(rgb[:,:,0]>rgb[:,:,2]*1.12)&(rgb[:,:,3]>200)&(xx>=mouth[0])&(yy>=40)&(yy<61)
   for x in range(mouth[0],cellw,2):
    rows=np.where(core[:,max(0,x-1):x+2].any(1))[0]
    if len(rows):samples.append([x-px,round(py-float(rows.mean()),3),max(1,(int(rows[-1])-int(rows[0]))/2)])
 else:
  f=oldframes[n];factor=bodyh/183
  # Area-aware downsampling, not high-resolution artwork displayed at a small scale.
  small=masters[n].resize((round(768*factor),round(288*factor)),Image.Resampling.LANCZOS)
  # Match the old body atlas's already-softened edge profile at native texel size.
  small=small.filter(ImageFilter.GaussianBlur(.45))
  dx=round(px-128*factor);dy=round(py-244*factor);cell.paste(small,(dx,dy))
  sx=small.width/768;sy=small.height/288
  mouth=[round(f['mouth'][0]*sx+dx,3),round(f['mouth'][1]*sy+dy,3)];closed=False
  for x,y,r in f['samples']:samples.append([round((x+128)*sx+dx-px,3),round(py-((244-y)*sy+dy),3),round(r*sx,3)])
 atlas.paste(cell,(i%2*cellw,i//2*cellh));preview.append(cell)
 frames.append({'sourceFrame':i,'sourceKind':kind,'originalFrame':n,'bodyHeight':bodyh if kind=='full' else (54 if closed else 59),'closed':closed,'rect':[i%2*.5,1-(i//2+1)/4,.5,.25],'mouth':mouth,'samples':samples})
out=root/'species/enemies/elite-frog-attack.webp';atlas.save(out,'WEBP',lossless=True,method=6)
meta={'source':source.name,'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'bodyAtlasSHA256':hashlib.sha256((root/'species/enemies/elite-frog-atlas.webp').read_bytes()).hexdigest(),'atlasSHA256':hashlib.sha256(out.read_bytes()).hexdigest(),'width':512,'height':384,'cell':[cellw,cellh],'pivot':[px,py],'bodyHeight':bodyh,'pixelWorld':1.95/80,'duration':ends[-1],'ends':ends,'frames':frames}
(art/'full-attack-source.json').write_text(json.dumps(meta,indent=2)+'\n')
(root/'species/elite-frog-attack-frames.js').write_text('// Whole poses matched to the original body texel density. Rebuild: art/elite-frog/extract-full-attack.py.\nexport const ATTACK_ART='+json.dumps({k:meta[k] for k in ['width','height','cell','pivot','bodyHeight','pixelWorld','duration','ends','frames']},separators=(',',':'))+';\n')
bg=Image.new('RGBA',atlas.size,(90,105,79,255));bg.alpha_composite(atlas);bg.resize((1024,768)).convert('RGB').save('/tmp/frog-matched-atlas.jpg')
print(json.dumps({'bytes':out.stat().st_size,'bodyHeight':bodyh,'pixelWorld':meta['pixelWorld'],'order':order}))
