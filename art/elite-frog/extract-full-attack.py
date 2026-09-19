"""Remove the exterior white matte from eight WHOLE frog attack poses.
No separation, reconstruction, rotation, or independent scaling of the tongue.
Run: python art/elite-frog/extract-full-attack.py (Pillow, numpy, scipy).
"""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image
from scipy.ndimage import binary_propagation,binary_dilation
root=Path(__file__).resolve().parents[2];art=root/'art/elite-frog'
source=art/'approved-eight-frames.webp';sheet=Image.open(source).convert('RGB')
selection=json.loads((art/'eight-frame-selection.json').read_text())
tongue=json.loads((art/'tongue-source.json').read_text())
atlas=Image.new('RGBA',(1536,1152));frames=[];preview=[]
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
 atlas.paste(aligned,(i%2*cellw,i//2*cellh));preview.append(aligned)
 mx,my=f['mouth'];samples=[]
 for x,y,r in tongue['frames'][i]['samples']:
  samples.append([round((mx+x)*factor+dx-px,3),round(py-((my-y)*factor+dy),3),round(r*factor,3)])
 frames.append({'sourceFrame':i,'sourceBodyBounds':[top,bottom],'sourceFeet':[cx,bottom],'sourceTransform':[factor,dx,dy],'bodyHeight':bodyh,'closed':f['closed'],'rect':[i%2*.5,1-(i//2+1)/4,.5,.25],'mouth':[round(mx*factor+dx,3),round(my*factor+dy,3)],'samples':samples})
out=root/'species/enemies/elite-frog-attack.webp';atlas.save(out,'WEBP',lossless=True,method=6)
meta={'source':source.name,'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'atlasSHA256':hashlib.sha256(out.read_bytes()).hexdigest(),'width':1536,'height':1152,'cell':[cellw,cellh],'pivot':[px,py],'bodyHeight':bodyh,'pixelWorld':1.95*.9/bodyh,'ends':selection['ends'],'frames':frames}
(art/'full-attack-source.json').write_text(json.dumps(meta,indent=2)+'\n')
(root/'species/elite-frog-attack-frames.js').write_text('// Whole approved frog + tongue images; rebuild with art/elite-frog/extract-full-attack.py.\nexport const ATTACK_ART='+json.dumps({k:meta[k] for k in ['width','height','cell','pivot','bodyHeight','pixelWorld','ends','frames']},separators=(',',':'))+';\n')
bg=Image.new('RGBA',atlas.size,(90,105,79,255));bg.alpha_composite(atlas);bg.convert('RGB').save('/tmp/frog-whole-atlas.jpg')
print(json.dumps({'bytes':out.stat().st_size,'bodyBounds':[f['sourceBodyBounds'] for f in frames],'feet':[f['sourceFeet'] for f in frames]}))
