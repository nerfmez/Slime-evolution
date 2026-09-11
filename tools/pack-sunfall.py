"""High resolution source preparation. Flight and smoke animate in the game shader, not in an atlas."""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import zoom,map_coordinates,gaussian_filter,uniform_filter
ROOT=Path('public/assets/vfx');S=512

def keyed(path):
 raw=np.asarray(Image.open(path).convert('RGB'),dtype=np.float32)/255
 green=np.maximum(0,raw[:,:,1]-np.maximum(raw[:,:,0],raw[:,:,2]));a=1-np.clip((green-.015)/.10,0,1)
 raw[:,:,1]=np.minimum(raw[:,:,1],np.maximum(raw[:,:,0],raw[:,:,2]))
 return np.dstack([raw*a[:,:,None],a])

def save(rgba,path):
 a=np.clip(rgba[:,:,3:4],0,1);rgb=np.clip(rgba[:,:,:3]/np.maximum(a,.001),0,1)
 Image.fromarray(np.uint8(np.dstack([rgb,a])*255)).save(path)

def fit_canvas(im,w,h,scale,cx,cy,anchor):
 out=np.zeros((h,w,4),np.float32);im=zoom(im,(scale,scale,1),order=1)
 ox=int(w*anchor[0]-cx*scale);oy=int(h*anchor[1]-cy*scale)
 x0=max(0,ox);x1=min(w,ox+im.shape[1]);y0=max(0,oy);y1=min(h,oy+im.shape[0])
 out[y0:y1,x0:x1]=im[y0-oy:y1-oy,x0-ox:x1-ox];return out

source=keyed(ROOT/'sunfall-impact-source.png');ch,cw=source.shape[0]//2,source.shape[1]//2
poses=[]
for i,width in enumerate([.42,.82,.94,.87]):
 im=source[i//2*ch:(i//2+1)*ch,i%2*cw:(i%2+1)*cw];ys,xs=np.where(im[:,:,3]>.1)
 # Center the impact and hold the ground anchor while its outline changes.
 left,right,top,bottom=xs.min(),xs.max(),ys.min(),ys.max();scale=width*S/(right-left+1)
 poses.append(fit_canvas(im,S,S,scale,(left+right)/2,bottom,(.5,.83)))
def warp(im,u,v):
 y,x=np.mgrid[:im.shape[0],:im.shape[1]];return np.stack([map_coordinates(im[:,:,c],[y+v,x+u],order=1,mode='constant') for c in range(im.shape[2])],axis=2)
def flow(a,b):
 ag=a[:,:,3]*.45+a[:,:,:3].mean(axis=2)*.55;bg=b[:,:,3]*.45+b[:,:,:3].mean(axis=2)*.55;u=v=None
 for scale in [.125,.25,.5,1.]:
  aa=zoom(ag,scale,order=1);bb=zoom(bg,scale,order=1);h,w=aa.shape
  if u is None:u=np.zeros((h,w));v=u.copy()
  else:u=zoom(u,2,order=1)*2;v=zoom(v,2,order=1)*2
  y,x=np.mgrid[:h,:w]
  for k in range(8):
   bw=map_coordinates(bb,[y+v,x+u],order=1,mode='constant');gy,gx=np.gradient((aa+bw)*.5);err=bw-aa
   xx=uniform_filter(gx*gx,7)+.00008;yy=uniform_filter(gy*gy,7)+.00008;xy=uniform_filter(gx*gy,7);xt=uniform_filter(gx*err,7);yt=uniform_filter(gy*err,7);det=xx*yy-xy*xy
   u+=gaussian_filter(np.clip((xy*yt-yy*xt)/det,-2,2),1);v+=gaussian_filter(np.clip((xy*xt-xx*yt)/det,-2,2),1)
 return u,v
flows=[(flow(a,b),flow(b,a)) for a,b in zip(poses,poses[1:])]
times=[0,.18,.52,.68];atlas=Image.new('RGBA',(S*6,S*4))
for i in range(24):
 t=i*.72/23;j=min(2,max(0,next((k-1 for k,x in enumerate(times) if x>t),2)));f=np.clip((t-times[j])/(times[j+1]-times[j]),0,1)
 (u,v),(ub,vb)=flows[j];a=warp(poses[j],-u*f*.28,-v*f*.28);b=warp(poses[j+1],-ub*(1-f)*.28,-vb*(1-f)*.28);out=a*(1-f)+b*f
 # Preserve dense flame volume through transitions; avoid transparent double-exposure.
 alpha=out[:,:,3:4].copy();dense=np.minimum(1,alpha*1.65);out[:,:,:3]*=dense/np.maximum(alpha,.001);out[:,:,3:4]=dense
 if t>.64:out*=max(0,(.74-t)/.10)
 a=np.clip(out[:,:,3:4],0,1);rgb=np.clip(out[:,:,:3]/np.maximum(a,.001),0,1);atlas.paste(Image.fromarray(np.uint8(np.dstack([rgb,a])*255)),(i%6*S,i//6*S))
atlas.save(ROOT/'sunfall-impact-hd.png')
flight=keyed(ROOT/'sunfall-flight-source.png');hot=(flight[:,:,0]>.85)&(flight[:,:,1]>.72)&(flight[:,:,2]>.35)
row=int(np.argmax(hot.sum(axis=1)));ys,xs=np.where(hot & (np.abs(np.arange(hot.shape[0])[:,None]-row)<125));cx=float(xs.mean());cy=float(ys.mean())
# Keep the large bright core fixed at the renderer's anchor, allowing a long tail above.
cx,cy=512.,1030.;scale=.65
flight=fit_canvas(flight,768,1024,scale,cx,cy,(.5,.72));save(flight,ROOT/'sunfall-flight-hd.png')
sm=keyed(ROOT/'sunfall-smoke-bank.png');ys,xs=np.where(sm[:,:,3]>.1);sm=sm[ys.min():ys.max()+1,xs.min():xs.max()+1]
# Source ellipse nearly fills 1024x512, preserving painted detail.
sm=zoom(sm,(.84*512/sm.shape[0],.96*1024/sm.shape[1],1),order=1);out=np.zeros((512,1024,4),np.float32);oy=(512-sm.shape[0])//2;ox=(1024-sm.shape[1])//2;out[oy:oy+sm.shape[0],ox:ox+sm.shape[1]]=sm
save(out,ROOT/'sunfall-smoke-hd.png')
print('Prepared 24 x 512px impact frames, continuous 768x1024 flight and 1024x512 smoke. GPU textures total 29 MiB.')
