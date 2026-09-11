from pathlib import Path
from PIL import Image
import json
p=Path('public/review/frames.json');sets=json.loads(p.read_text());im=Image.open('public/review/inferno-motion.gif');frames=[]
for i in range(im.n_frames):
 im.seek(i);f=f'frames/atlas-{i:03}.png';im.convert('RGB').save('public/review/'+f);frames.extend([f]*max(1,round(im.info.get('duration',20)/20)))
for s in sets:
 if s['id']=='atlas':s['frames']=frames;s['label']='ไฟ 48 เฟรม · ชั้นไฟแนวขวาง';s['fps']=50
 if s['id']=='live':s['label']='ก่อนปรับ · ผิวโดม'
p.write_text(json.dumps(sets,ensure_ascii=False))
