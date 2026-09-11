"""Replay captured game shaders; saved-frame viewer remains ordinary HTML/images."""
from pathlib import Path
import ctypes as c,json,numpy as np,sys
from PIL import Image,ImageDraw
exec(Path('tools/check-shaders.py').read_text().split('data=json.loads')[0])
U=c.c_uint;I=c.c_int;F=c.c_float;P=c.c_void_p
W=H=768
kind=sys.argv[1] if len(sys.argv)>1 else 'sunfall'
E.eglCreatePbufferSurface.argtypes=[P,P,c.POINTER(I)];E.eglCreatePbufferSurface.restype=P
surface=E.eglCreatePbufferSurface(d,config,(I*5)(0x3057,W,0x3056,H,0x3038));assert E.eglMakeCurrent(d,surface,surface,ctx)
data=json.loads(Path(f'.dream-loop/{kind}-draws.json').read_text());programs=[]
for p in data['programs']:
 pid=fn('glCreateProgram',U)()
 for sh in p['shaders']:
  sid=create(0x8b31 if sh['type']=='VERTEX_SHADER' else 0x8b30);src=c.c_char_p(sh['src'].encode());source(sid,1,c.byref(src),None);compile(sid);ok=I();get(sid,0x8b81,c.byref(ok));buf=c.create_string_buffer(8192);log(sid,8192,None,buf);assert ok.value,buf.value
  fn('glAttachShader',None,U,U)(pid,sid)
 fn('glLinkProgram',None,U)(pid);ok=I();fn('glGetProgramiv',None,U,U,c.POINTER(I))(pid,0x8b82,c.byref(ok));assert ok.value;programs.append(pid)
vaos=[]
for g in data['geometries']:
 vao=U();fn('glGenVertexArrays',None,I,c.POINTER(U))(1,c.byref(vao));fn('glBindVertexArray',None,U)(vao)
 for slot,a in g['attrs'].items():
  b=U();fn('glGenBuffers',None,I,c.POINTER(U))(1,c.byref(b));fn('glBindBuffer',None,U,U)(0x8892,b);arr=np.array(a['buffer']['data'],np.float32);fn('glBufferData',None,U,c.c_ssize_t,P,U)(0x8892,arr.nbytes,arr.ctypes.data,0x88e4);fn('glEnableVertexAttribArray',None,U)(int(slot));fn('glVertexAttribPointer',None,U,I,U,U,I,P)(int(slot),a['size'],0x1406,0,0,None)
 if g.get('indices'):
  b=U();fn('glGenBuffers',None,I,c.POINTER(U))(1,c.byref(b));fn('glBindBuffer',None,U,U)(0x8893,b);arr=np.array(g['indices']['data'],np.uint32);fn('glBufferData',None,U,c.c_ssize_t,P,U)(0x8893,arr.nbytes,arr.ctypes.data,0x88e4)
 vaos.append(vao.value)
for unit,name in [(5,'inferno-flame-paint.png'),(6,'inferno-atlas.png'),(7,'inferno-inbetweens.png'),(8,'inferno-inbetweens48.png'),(13,'sunfall-impact-hd.png'),(14,'sunfall-flight-hd.png'),(15,'sunfall-smoke-hd.png')]:
 path=Path('public/assets/vfx')/name
 if not path.exists():continue
 arr=np.array(Image.open(path).convert('RGBA'));tex=U();fn('glGenTextures',None,I,c.POINTER(U))(1,c.byref(tex));fn('glActiveTexture',None,U)(0x84c0+unit);fn('glBindTexture',None,U,U)(0xde1,tex);fn('glTexImage2D',None,U,I,I,I,I,I,U,U,P)(0xde1,0,0x1908,arr.shape[1],arr.shape[0],0,0x1908,0x1401,arr.ctypes.data)
 for k,v in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812f),(0x2803,0x812f)]:fn('glTexParameteri',None,U,U,I)(0xde1,k,v)
images=[];loc=fn('glGetUniformLocation',I,U,c.c_char_p)
for frame in data['frames']:
 fn('glViewport',None,I,I,I,I)(0,0,W,H);fn('glClearColor',None,F,F,F,F)(.72,.78,.56,1);fn('glDepthMask',None,U)(1);fn('glClear',None,U)(0x4100);fn('glEnable',None,U)(0xb71);fn('glDepthFunc',None,U)(0x203)
 for call in frame['draws']:
  pid=programs[call['p']];fn('glUseProgram',None,U)(pid)
  for key,value in call['u'].items():
   l=loc(pid,key.encode())
   if l<0:continue
   if isinstance(value,dict):fn('glUniform1i',None,I,I)(l,value['int'])
   elif isinstance(value,(float,int)):fn('glUniform1f',None,I,F)(l,value)
   else:
    a=np.array(value,np.float32)
    if len(a)==16:fn('glUniformMatrix4fv',None,I,I,U,P)(l,1,0,a.ctypes.data)
    else:fn('glUniform%dfv'%len(a),None,I,I,P)(l,1,a.ctypes.data)
  for k,flag in [('blend',0xbe2),('cull',0xb44)]:fn('glEnable' if call['state'][k] else 'glDisable',None,U)(flag)
  fn('glBlendFunc',None,U,U)(0x302,0x303);fn('glDepthMask',None,U)(int(call['state']['depth']));fn('glBindVertexArray',None,U)(vaos[call['g']])
  if call['indexed']:fn('glDrawElements',None,U,I,U,P)(4,call['count'],0x1405,None)
  else:fn('glDrawArrays',None,U,I,I)(4,0,call['count'])
 out=np.zeros((H,W,4),np.uint8);fn('glReadPixels',None,I,I,I,I,U,U,P)(0,0,W,H,0x1908,0x1401,out.ctypes.data);assert fn('glGetError',U)()==0;images.append(Image.fromarray(out[::-1,:,:3]))
root=Path('public/review')
for i,im in enumerate(images):im.save(root/'frames'/f'{kind}-{i:03d}.png')
images[0].save(root/f'{kind}-motion.gif',save_all=True,append_images=images[1:],duration=50,loop=0)
sheet=Image.new('RGB',(W*4,(H+24)*2),'#eeeade')
for j,i in enumerate([3,10,12,16,21,27,35,45]):
 sheet.paste(images[i],(j%4*W,j//4*(H+24)));ImageDraw.Draw(sheet).text((j%4*W+8,j//4*(H+24)+H+4),f'{i*.05:.2f}s',fill='#263d3b')
sheet.save(root/f'{kind}-keyframes.png')
print(f'Actual game {kind} renderer:48 frames at768px; GL errors0')
