from pathlib import Path
import numpy as np,json
from PIL import Image
def measure(path):
 im=np.asarray(Image.open(path)).astype(float)/255;anchors=[];sizes=[]
 for i in range(16):
  x0=round((i%4)*im.shape[1]/4);x1=round((i%4+1)*im.shape[1]/4);y0=round((i//4)*im.shape[0]/4);y1=round((i//4+1)*im.shape[0]/4);a=im[y0:y1,x0:x1];mask=a[:,:,0]>a[:,:,1]*.85;ys,xs=np.where(mask)
  anchor=(float(np.quantile(ys,.98))+.5)/a.shape[0]
  if i<11:
   white=(a[:,:,0]>.98)&(a[:,:,1]>.86)&(a[:,:,2]>.40)&(a[:,:,2]<.86);yw,xw=np.where(white)
   if len(yw)>8:anchor=float(np.mean(yw)/a.shape[0]+.10)
  anchors.append(round(anchor,5));sizes.append([round((np.quantile(xs,.98)-np.quantile(xs,.02))/a.shape[1],5),round((np.quantile(ys,.98)-np.quantile(ys,.02))/a.shape[0],5)])
 return anchors,sizes
a,sa=measure('public/assets/vfx/inferno-atlas.png')
b,sb=measure('public/assets/vfx/inferno-inbetweens.png')
cc,sc=measure('public/assets/vfx/inferno-inbetweens48.png')
anchors=[];sizes=[];display=[]
for i in range(16):
 anchors.extend([a[i],b[i],cc[i]]);sizes.extend([sa[i],sb[i],sc[i]])
 target=[(x+y)/2 for x,y in zip(sa[i],sa[min(15,i+1)])] if i<15 else [x*.55 for x in sa[i]]
 later=[x*.25+y*.75 for x,y in zip(sa[i],sa[min(15,i+1)])] if i<15 else [x*.3 for x in sa[i]]
 display.extend([sa[i],target,later])
Path('vfx/inferno-atlas-data.js').write_text('export const atlasAnchors='+json.dumps(anchors)+';\nexport const atlasSizes='+json.dumps(sizes)+';\nexport const atlasDisplaySizes='+json.dumps(display)+';\n')
