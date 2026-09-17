"""Pack only the owner's three supplied PNGs. No generated replacement artwork."""
from pathlib import Path
from PIL import Image
import json, hashlib
ROOT=Path(__file__).resolve().parents[1]; S=384
sources={name:Image.open(ROOT/'art/elephant'/f'{name}.png').convert('RGBA') for name in ('walk','actions','hit')}
atlas=Image.new('RGBA',(S*4,S*5)); frames={}; regions=[]
def put(name, source, box, factor, ground=348, exclude=()):
    im=sources[source].crop(box)
    for ex in exclude:
        # Neighbour sprites intrude into non-uniform cells on the supplied actions sheet.
        # Mask only those neighbour fragments, without changing any elephant pixels.
        x0,y0,x1,y1=ex
        im.paste((0,0,0,0),(max(0,x0-box[0]),max(0,y0-box[1]),min(im.width,x1-box[0]),min(im.height,y1-box[1])))
    b=im.getchannel('A').point(lambda a:255 if a>24 else 0).getbbox(); c=im.crop(b)
    c=c.resize((round(c.width*factor),round(c.height*factor)),Image.Resampling.LANCZOS)
    idx=len(frames); x=idx%4*S; y=idx//4*S; dx=round((S-c.width)/2);dy=round(ground-c.height)
    assert min(dx,dy)>=2 and dx+c.width<S-2,(name,dx,dy,c.size)
    atlas.alpha_composite(c,(x+dx,y+dy))
    frames[name]={'cell':idx,'uv':[x/atlas.width,1-(y+S)/atlas.height,S/atlas.width,S/atlas.height],'pixels':[x+dx,y+dy,c.width,c.height]}
    regions.append({'name':name,'source':source+'.png','box':list(box),'bounds':list(b),'scale':factor,'excludedNeighbourRegions':list(exclude)})
for i in range(8):put('walk'+str(i),'walk',((i%4)*543,(i//4)*362,(i%4+1)*543,(i//4+1)*362),.70)
for i in range(4):put('death'+str(i),'actions',(i*384,0,(i+1)*384,512),.80)
put('charge','actions',(0,512,378,920),.80,exclude=((345,700,378,920),))
put('shoot','actions',(350,512,726,930),.80,exclude=((350,512,400,700),))
put('hit','hit',(0,0,1254,1254),.267)
put('shot0','actions',(728,650,996,890),1.02,ground=300)
put('shot1','actions',(1014,650,1288,890),1.02,ground=300)
put('splash','actions',(1290,540,1536,910),.87)
put('idle','actions',(0,0,384,512),.80)
out=ROOT/'game/assets/enemies/water-calf-atlas.webp';atlas.save(out,lossless=True,method=6)
(ROOT/'game/assets/enemies/water-calf-atlas.json').write_text(json.dumps({'width':atlas.width,'height':atlas.height,'cellSize':S,'groundY':348,'frames':frames},indent=2)+'\n')
source={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in (ROOT/'art/elephant').glob('*.png')}
(ROOT/'art/elephant/provenance.json').write_text(json.dumps({'userAttachments':source,'regions':regions,'atlas':{'path':str(out.relative_to(ROOT)),'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'lossless':True}},indent=2)+'\n')
bg=Image.new('RGBA',atlas.size,(100,122,96,255));bg.alpha_composite(atlas);bg.resize((768,960)).convert('RGB').save(ROOT.parent/'elephant-atlas-review.jpg',quality=92)
print('Packed supplied art:',out.stat().st_size,'bytes')
