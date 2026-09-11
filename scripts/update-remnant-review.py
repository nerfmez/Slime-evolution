from pathlib import Path
from PIL import Image
import json
p=Path('public/review/frames.json');sets=json.loads(p.read_text())
for key,label,poses in [('scatter','สะเก็ดกระจาย · วิถีโค้ง',[.02,.10,.20,.34,.65,1.0]),('ground','เพลิงคงค้าง · พื้นไหม้และไฟเตี้ย',[.02,.20,.60,1.4,2.4,2.92])]:
 im=Image.open('public/review/'+key+'-motion.gif');frames=[]
 for i in range(im.n_frames):
  im.seek(i);f=f'frames/{key}-{i:03}.png';im.convert('RGB').save('public/review/'+f);frames.extend([f]*max(1,round(im.info.get('duration',20)/20)))
 sets=[s for s in sets if s['id']!=key];sets.append(dict(id=key,label=label,fps=50,frames=frames,poses=poses))
p.write_text(json.dumps(sets,ensure_ascii=False))
