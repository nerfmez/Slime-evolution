from pathlib import Path
import json,math,subprocess
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
subprocess.run(['node','tools/bake-slime-motion.mjs'],check=True)
frames=json.loads(Path('/tmp/slime-motion-geometry.json').read_text())
root=Path('public/assets/slime');S=256;SS=2;tilt=math.radians(39)
headings={'E':math.pi/2,'NE':math.pi*3/4,'N':math.pi,'NW':math.pi*5/4,'W':math.pi*3/2,'SW':math.pi*7/4,'S':0,'SE':math.pi/4}
previews={}
for name,yaw in headings.items():
 atlas=Image.new('RGBA',(S*4,S*4));poses=[];previews[name]=[]
 for f,g in enumerate(frames):
  p=np.array(g['pos']).reshape(-1,3);n=np.array(g['normals']).reshape(-1,3);idx=np.array(g['indices']).reshape(-1,3)
  def project(p):
   a=p[:,0]*math.cos(yaw)+p[:,2]*math.sin(yaw);b=-p[:,0]*math.sin(yaw)+p[:,2]*math.cos(yaw)
   return np.stack([128+a*100,180+(b*math.sin(tilt)-p[:,1]*math.cos(tilt))*100,b*math.cos(tilt)+p[:,1]*math.sin(tilt)],axis=1)
  v=project(p);tri=v[idx];cross=(tri[:,1,0]-tri[:,0,0])*(tri[:,2,1]-tri[:,0,1])-(tri[:,1,1]-tri[:,0,1])*(tri[:,2,0]-tri[:,0,0]);ids=idx[cross<0];ids=ids[np.argsort(v[ids,2].mean(axis=1))]
  body=Image.new('RGBA',(S*SS,S*SS));draw=ImageDraw.Draw(body)
  for inds in ids:
   light=np.clip(n[inds].mean(axis=0)@np.array([.45,.8,.4]),0,1);band=1 if light>.65 else .85 if light>.2 else .68;h=p[inds,1].mean();color=tuple(int(round(x*band)) for x in [65+h*62,153+h*65,190+h*37])+(255,)
   points=[tuple(q) for q in v[inds,:2]*SS];draw.polygon(points,fill=color);draw.line(points+[points[0]],fill=color,width=1)
  mask=body.getchannel('A');outline=mask.filter(ImageFilter.MaxFilter(5));image=Image.new('RGBA',body.size,(23,62,72,0));image.putalpha(outline);image.alpha_composite(body);image=image.resize((S,S),Image.Resampling.LANCZOS)
  ground=p.copy();ground[:,1]=0;gv=project(ground);shadow=Image.new('RGBA',(S,S));sd=ImageDraw.Draw(shadow)
  for inds in idx:sd.polygon([tuple(q) for q in gv[inds,:2]],fill=(43,64,36,43))
  shadow.alpha_composite(image);image=shadow
  box=image.getbbox();assert box and min(box)>1 and box[2]<S-2 and box[3]<S-2,(name,f,box)
  atlas.alpha_composite(image,((f%4)*S,(f//4)*S));previews[name].append(image);poses.append(dict(x=f%4*S,y=f//4*S,w=S,h=S,anchorX=128,anchorY=180))
 atlas.save(root/f'slime-approved-{name}.png');(root/f'slime-approved-{name}.json').write_text(json.dumps(poses))
contact=Image.new('RGB',(S*8,S*4),'#b8c78f')
for col,name in enumerate(headings):
 for row,f in enumerate([0,4,8,12]):
  contact.paste(previews[name][f],(col*S,row*S),previews[name][f]);ImageDraw.Draw(contact).text((col*S+8,row*S+8),f'{name} / {f+1}',fill='#263d3b')
contact.save('public/review/slime-approved-contact.png')
gif=[]
for f in range(16):
 im=Image.new('RGB',(S*4,S*2),'#b8c78f')
 for i,name in enumerate(headings):im.paste(previews[name][f],(i%4*S,i//4*S),previews[name][f]);ImageDraw.Draw(im).text((i%4*S+8,i//4*S+8),name,fill='#263d3b')
 gif.append(im)
gif[0].save('public/review/slime-approved.gif',save_all=True,append_images=gif[1:],duration=[80,80,90,80]*4,loop=0)
print('128 frames rendered from approved JSON; 8 independent views; fixed scale/anchor; no clipping')
