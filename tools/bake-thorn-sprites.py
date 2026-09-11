"""Render the existing Thorn GPU poses and character shader into an 8-way sprite atlas."""
from pathlib import Path
import ctypes as c,json,subprocess,numpy as np
from PIL import Image,ImageDraw
exec(Path('tools/check-shaders.py').read_text().split('data=json.loads')[0])
U=c.c_uint;I=c.c_int;F=c.c_float;P=c.c_void_p
S=128
E.eglCreatePbufferSurface.argtypes=[P,P,c.POINTER(I)];E.eglCreatePbufferSurface.restype=P
surface=E.eglCreatePbufferSurface(d,config,(I*5)(0x3057,S,0x3056,S,0x3038));assert E.eglMakeCurrent(d,surface,surface,ctx)
sh=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {vs,fs} from './shaders.js';import{mul,look,ortho,model}from'./math.js';console.log(JSON.stringify({vs,fs,vp:[...mul(ortho(1.35,1.35),look([0,12,15],[0,0,0]))],models:Array.from({length:8},(_,i)=>[...model(0,0,0,1,1,1,i*Math.PI/4)])}))"],text=True))
# Environment shadows and fog are applied at runtime; character lighting and outline are baked unchanged.
sh['fs']=sh['fs'].split('// One small texture lookup; no extra shadow pass')[0]+'color=vec4(c,alpha);}'
p=fn('glCreateProgram',U)()
for key,kind in [('vs',0x8b31),('fs',0x8b30)]:
 sid=create(kind);src=c.c_char_p(('#version 300 es\nprecision highp float;\n'+sh[key]).encode());source(sid,1,c.byref(src),None);compile(sid);ok=I();get(sid,0x8b81,c.byref(ok));buf=c.create_string_buffer(8192);log(sid,8192,None,buf);assert ok.value,buf.value;fn('glAttachShader',None,U,U)(p,sid)
fn('glLinkProgram',None,U)(p);ok=I();fn('glGetProgramiv',None,U,U,c.POINTER(I))(p,0x8b82,c.byref(ok));assert ok.value
fn('glUseProgram',None,U)(p);loc=fn('glGetUniformLocation',I,U,c.c_char_p)
def uniform(k,v):
 l=loc(p,k.encode())
 if isinstance(v,(int,float)):fn('glUniform1f',None,I,F)(l,v)
 else:
  a=np.array(v,np.float32)
  if len(a)==16:fn('glUniformMatrix4fv',None,I,I,U,P)(l,1,0,a.ctypes.data)
  else:fn('glUniform%dfv'%len(a),None,I,I,P)(l,1,a.ctypes.data)
for k,v in dict(vp=sh['vp'],viewDirection=[0,12,15],enemyLift=.18,enemyPalette=0,enemyFrameMix=0,enemyHit=0,kind=0,fade=1,player=[0,0,0],time=0,enemyMotion=[0,1,0]).items():uniform(k,v)
meta=json.loads(Path('public/assets/enemies/thorn.json').read_text());n=meta['vertices'];raw=Path('public/assets/enemies/thorn.bin').read_bytes();uv=np.frombuffer(raw,'<f4',n*2);idx=np.frombuffer(raw,'<u4',meta['indices'],n*8);off=n*8+len(idx)*4
vao=U();fn('glGenVertexArrays',None,I,c.POINTER(U))(1,c.byref(vao));fn('glBindVertexArray',None,U)(vao)
def attr(slot,data,size):
 a=np.array(data,np.float32);b=U();fn('glGenBuffers',None,I,c.POINTER(U))(1,c.byref(b));fn('glBindBuffer',None,U,U)(0x8892,b);fn('glBufferData',None,U,c.c_ssize_t,P,U)(0x8892,a.nbytes,a.ctypes.data,0x88e4);fn('glEnableVertexAttribArray',None,U)(slot);fn('glVertexAttribPointer',None,U,I,U,U,I,P)(slot,size,0x1406,0,0,None)
attr(2,uv,2);b=U();fn('glGenBuffers',None,I,c.POINTER(U))(1,c.byref(b));fn('glBindBuffer',None,U,U)(0x8893,b);fn('glBufferData',None,U,c.c_ssize_t,P,U)(0x8893,idx.nbytes,idx.ctypes.data,0x88e4)
tex=U();fn('glGenTextures',None,I,c.POINTER(U))(1,c.byref(tex));fn('glActiveTexture',None,U)(0x84c0);fn('glBindTexture',None,U,U)(0xde1,tex);im=np.array(Image.open('public/assets/enemies/thorn.jpg').convert('RGBA'));fn('glTexImage2D',None,U,I,I,I,I,I,U,U,P)(0xde1,0,0x1908,im.shape[1],im.shape[0],0,0x1908,0x1401,im.ctypes.data)
for k,v in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812f),(0x2803,0x812f)]:fn('glTexParameteri',None,U,U,I)(0xde1,k,v)
fn('glUniform1i',None,I,I)(loc(p,b'tex'),0)
fn('glViewport',None,I,I,I,I)(0,0,S,S);fn('glEnable',None,U)(0xb71);fn('glDepthFunc',None,U)(0x203);fn('glEnable',None,U)(0xb44);fn('glDisable',None,U)(0xbe2)
atlas=Image.new('RGBA',(S*16,S*16));frames={};bounds=[]
for f in range(32):
 pos=np.frombuffer(raw,'<f4',n*3,off+f*n*24);norm=np.frombuffer(raw,'<f4',n*3,off+f*n*24+n*12)
 for slot,a in [(0,pos),(1,norm),(3,pos),(4,norm)]:attr(slot,a,3)
 for direction in range(8):
  fn('glClearColor',None,F,F,F,F)(0,0,0,0);fn('glClear',None,U)(0x4100);uniform('model',sh['models'][direction]);uniform('outline',.009);fn('glCullFace',None,U)(0x404);fn('glDrawElements',None,U,I,U,P)(4,len(idx),0x1405,None);uniform('outline',0);fn('glCullFace',None,U)(0x405);fn('glDrawElements',None,U,I,U,P)(4,len(idx),0x1405,None)
  out=np.zeros((S,S,4),np.uint8);fn('glReadPixels',None,I,I,I,I,U,U,P)(0,0,S,S,0x1908,0x1401,out.ctypes.data);assert fn('glGetError',U)()==0
  image=Image.fromarray(out[::-1]);box=image.getbbox();assert box and box[0]>1 and box[1]>1 and box[2]<S-1 and box[3]<S-1,box
  cell=direction*32+f;atlas.paste(image,((cell%16)*S,(cell//16)*S));frames[direction,f]=image;bounds.append(box)
root=Path('public/assets/enemies');atlas.save(root/'thorn-sprite.png');(root/'thorn-sprite.json').write_text(json.dumps(dict(directions=8,frames=32,cell=S,columns=16,worldSize=1.35,anchor=[.5,.5],source='thorn.bin')))
review=Path('public/review');sheet=Image.new('RGB',(8*S,4*(S+22)),'#b8c78f');draw=ImageDraw.Draw(sheet)
for direction in range(8):
 for row,f in enumerate([0,8,16,24]):
  image=frames[direction,f];x=direction*S;y=row*(S+22);sheet.paste(image,(x,y),image);draw.text((x+4,y+S+2),f'{direction*45} deg / {f}',fill='#253629')
sheet.save(review/'thorn-directions.png');gif=[]
for f in range(32):
 frame=Image.new('RGB',(S*4,S*2),'#b8c78f')
 for direction in range(8):frame.paste(frames[direction,f],((direction%4)*S,(direction//4)*S),frames[direction,f])
 gif.append(frame)
gif[0].save(review/'thorn-walk.gif',save_all=True,append_images=gif[1:],duration=40,loop=0)
print('Baked 8 directions x 32 frames; original shader, pose and outline; no clipping; GL errors 0')
