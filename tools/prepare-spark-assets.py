"""Build the approved Spark poses without generative redrawing.
Dependencies: Python 3, Pillow, numpy, scipy, OpenCV. Source files stay in art/;
only the 1536x1536 atlas + metadata enter the game's asset graph.
"""
from pathlib import Path
import json, hashlib
import cv2
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt, binary_fill_holes
ROOT = Path(__file__).resolve().parents[1]
ART = ROOT/'art/spark'
OUT = ROOT/'game/assets/enemies'
CELL, COLS = 384, 4
# One fixed world-space foot pivot for ALL cells. Art is never rotated/deformed.
PIVOT = (192, 330)

def image(name): return np.array(Image.open(ART/name).convert('RGBA'))
def rgba(a): return Image.fromarray(a.astype(np.uint8),'RGBA')
def split_sheet(a):
    n, labels, stats, centers = cv2.connectedComponentsWithStats((a[:,:,3]>60).astype(np.uint8))
    ids=sorted([i for i in range(1,n) if stats[i,4]>30000],key=lambda i:centers[i,0])
    assert len(ids)==6, (len(ids),stats.tolist())
    seeds=np.zeros(labels.shape,np.int32)
    for j,i in enumerate(ids):seeds[labels==i]=j+1
    dist,nearest=distance_transform_edt(seeds==0,return_indices=True)
    owners=seeds[tuple(nearest)]
    frames=[]
    for j in range(6):
        frame=a.copy()
        frame[:,:,3]=np.where((owners==j+1)&(dist<29)&(a[:,:,3]>=12),a[:,:,3],0)
        # Retain clean opaque cores; strip isolated low-alpha generation noise.
        frame[frame[:,:,3]==0,:3]=0
        frames.append(frame)
    return frames

def dark_bbox(a):
    r,g,b,alpha=[a[:,:,k] for k in range(4)]
    m=(alpha>150)&(r<177)&(g<150)&(b<145)
    n,l,s,c=cv2.connectedComponentsWithStats(m.astype('uint8'))
    good=[i for i in range(1,n) if s[i,4]>=8]
    y,x=np.where(np.isin(l,good))
    return (int(x.min()),int(y.min()),int(x.max()+1),int(y.max()+1))

def isolate_single(a):
    n,l,s,c=cv2.connectedComponentsWithStats((a[:,:,3]>40).astype('uint8'))
    keep=[i for i in range(1,n) if s[i,4]>70]
    core=np.isin(l,keep)
    near=distance_transform_edt(~core)
    a=a.copy();a[:,:,3]=np.where((near<4)&(a[:,:,3]>12),a[:,:,3],0)
    a[a[:,:,3]==0,:3]=0
    return a

def body_bbox(a):
    # Ignore stars/ghost for body size and pivot. Largest filled silhouette is body.
    n,l,s,c=cv2.connectedComponentsWithStats((a[:,:,3]>90).astype('uint8'))
    i=1+int(np.argmax(s[1:,4]));x,y,w,h,_=s[i]
    return (int(x),int(y),int(x+w),int(y+h))

def palette_match(a,reference):
    # Texture-preserving, bounded per-material correction, never flatten to one tint.
    out=a.copy(); f=a[:,:,:3].astype(float); ref=reference[:,:,:3].astype(float)
    def groups(rgb,alpha):
        r,g,b=[rgb[:,:,k] for k in range(3)]
        return [(alpha>220)&(r>205)&(g>175)&(b>135),
                (alpha>220)&(r>75)&(r<205)&(g>40)&(g<150)&(b<130)&(r>g+10)]
    ga=groups(f,a[:,:,3]);gr=groups(ref,reference[:,:,3]); masks=[]
    for m,t in zip(ga,gr):
        if m.sum()<20 or t.sum()<20:continue
        shift=np.clip(np.median(ref[t],axis=0)-np.median(f[m],axis=0),-12,12)*.65
        weight=cv2.GaussianBlur(m.astype(np.float32),(0,0),1.0)[:,:,None]
        f+=weight*shift
        masks.append(shift.tolist())
    out[:,:,:3]=np.clip(np.round(f),0,255).astype('uint8');out[out[:,:,3]==0,:3]=0
    return out,masks

runs=split_sheet(image('run-alpha-source.png'))
attacks=split_sheet(image('attack-alpha-source.png'))
hurt=isolate_single(image('approved-hurt.png'))
death=isolate_single(image('approved-death.png'))
# Match the same camera-facing side; stored approved source files remain untouched.
hurt=np.fliplr(hurt).copy()
hurt,hurt_shift=palette_match(hurt,runs[0]);death,death_shift=palette_match(death,runs[0])
frames=runs+attacks+[hurt,death]
# Body scale, not glow/ghost extent. Attack's base pose is slightly smaller in source.
bodies=[dark_bbox(a) if i<12 else body_bbox(a) for i,a in enumerate(frames)]
for i,b in enumerate(bodies):print(i,b,'size',(b[2]-b[0],b[3]-b[1]))
# Normalization uses a fixed scale per sequence, preserving squash/airborne poses.
# Target quill/body mass width is 185px inside 256px cells, leaving room for VFX.
run_scale=185/(bodies[0][2]-bodies[0][0])
attack_scale=185/(bodies[6][2]-bodies[6][0])
# Hurt recoils more upright; width 183. Death spreads a little wider but not bigger.
scales=[run_scale]*6+[attack_scale]*6+[183/(bodies[12][2]-bodies[12][0]),200/(bodies[13][2]-bodies[13][0])]
# Keep authored foot lift through the run, but remove uneven sheet registration.
# Foot placements are the fixed ground point; no per-frame tight-crop recentering.
lifts=[4,0,5,11,2,5]+[0,3,12,0,5,0]+[0,0]
meta=[];tiles=[]
for i,(a,b,scale,lift) in enumerate(zip(frames,bodies,scales,lifts)):
    cx=(b[0]+b[2])/2; ground=b[3]
    # Pivot is under the torso rather than under the projecting nose. Same convention
    # across states; impact flash remains at front-right, matching hit position.
    if i<12:cx-=.02*(b[2]-b[0])
    transform=np.array([[scale,0,PIVOT[0]-cx*scale],[0,scale,PIVOT[1]-ground*scale-lift]],dtype=np.float32)
    # Warp premultiplied pixels to avoid white or black fringes at alpha boundaries.
    f=a.astype(np.float32)/255;f[:,:,:3]*=f[:,:,3:4]
    f=cv2.warpAffine(f,transform,(CELL,CELL),flags=cv2.INTER_AREA,borderMode=cv2.BORDER_CONSTANT)
    alpha=f[:,:,3:4];f[:,:,:3]=np.divide(f[:,:,:3],alpha,out=np.zeros_like(f[:,:,:3]),where=alpha>1e-6)
    out=np.clip(np.round(f*255),0,255).astype(np.uint8)
    # Remove RGB in fully transparent texels; no matte is baked into the texture.
    out[out[:,:,3]==0,:3]=0
    tiles.append(rgba(out))
    name=('run' if i<6 else 'attack' if i<12 else 'hurt' if i==12 else 'death')
    meta.append({'cell':i,'state':name,'frame':i if i<6 else i-6 if i<12 else 0,'sourceBody':list(b),'scale':scale,'lift':lift,'nativeFacing':'right','pivot':list(PIVOT)})
# Separate visual spirit from physical body is intentionally NOT a new animation.
# All 14 accepted poses remain exact geometry with only crop, mirror and mild color matching.
atlas=Image.new('RGBA',(CELL*COLS,CELL*4))
for i,t in enumerate(tiles):atlas.alpha_composite(t,((i%COLS)*CELL,(i//COLS)*CELL))
OUT.mkdir(parents=True,exist_ok=True)
atlas.save(OUT/'spark-hedgehog-atlas.webp',lossless=True,method=6)
info={'version':1,'cell':CELL,'columns':COLS,'rows':4,'pivot':list(PIVOT),'sizeWorld':2.10,'cells':meta,'attackDurations':[.14,.11,.14,.10,.11,.16], 'runFrameCount':6,'hurtColorShift':hurt_shift,'deathColorShift':death_shift,'sourceSHA256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(ART.iterdir()) if p.suffix.lower() in ('.jpg','.png')}}
(OUT/'spark-hedgehog-atlas.json').write_text(json.dumps(info,indent=2)+'\n')
proof=ROOT/'test-results';proof.mkdir(exist_ok=True)
# Light and dark previews are validation files, not game assets.
preview=Image.new('RGB',(CELL*7,CELL*4),(244,242,234));d=ImageDraw.Draw(preview)
for row,bg in [(0,(244,242,234)),(2,(39,60,51))]:
    for i,t in enumerate(tiles):
        x=(i%7)*CELL;y=(i//7+row)*CELL
        d.rectangle((x,y,x+CELL,y+CELL),fill=bg)
        preview.paste(t,(x,y),t)
        d.line((x+170,y+330,x+214,y+330),fill=(150,150,150));d.text((x+12,y+10),f'{meta[i]["state"]} {meta[i]["frame"]+1}',fill=(130,130,130))
preview.save(proof/'spark-atlas-review.png')
print('Atlas', (OUT/'spark-hedgehog-atlas.webp').stat().st_size,'bytes')
