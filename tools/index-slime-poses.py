"""Read sprite alpha to index complete poses and ground anchors; never alters artwork."""
from pathlib import Path
import json,sys
import numpy as np
from PIL import Image
from scipy.ndimage import label,find_objects
for name in sys.argv[1:]:
 path=Path(name);image=Image.open(path)
 if image.mode!='RGBA':raise RuntimeError(f'{name}: actual transparent RGBA required')
 pixels=np.array(image);height,width=pixels.shape[:2]
 if (pixels[:,:,3]<16).mean()<.2:raise RuntimeError(f'{name}: missing transparent exterior')
 labels,_=label(pixels[:,:,3]>128);poses=[]
 for number,box in enumerate(find_objects(labels),1):
  if box is None:continue
  area=int((labels[box]==number).sum())
  if area<height*width/16*.08:continue
  y,x=box
  if min(x.start,y.start)<1 or x.stop>=width-1 or y.stop>=height-1:raise RuntimeError(f'{name}: sprite touches outer edge')
  left=max(0,x.start-2);top=max(0,y.start-2);right=min(width,x.stop+2);bottom=min(height,y.stop+2)
  contact=[]
  for col in np.linspace(x.start+(x.stop-x.start)*.15,x.start+(x.stop-x.start)*.85,9).astype(int):
   rows=np.flatnonzero(labels[y.start:y.stop,col]==number)
   if len(rows):contact.append([int(col-left),int(y.start+rows[-1]-top)])
  poses.append(dict(x=left,y=top,w=right-left,h=bottom-top,anchorX=(x.start+x.stop-1)/2-left,anchorY=y.stop-1-top,area=area,contact=contact))
 if len(poses)!=16:raise RuntimeError(f'{name}: expected16 separate poses, found{len(poses)}')
 # Sort by row using centers, then by x; do not assume regular cells enclose stretched poses.
 poses.sort(key=lambda p:p['y']+p['h']/2)
 poses=[p for row in range(4) for p in sorted(poses[row*4:row*4+4],key=lambda p:p['x'])]
 path.with_suffix('.json').write_text(json.dumps(poses))
 print(f'{path.name}:16 complete poses, alpha present, contact anchors indexed')
