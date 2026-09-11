from pathlib import Path
import ctypes as c,json,re,subprocess,numpy as np
from PIL import Image
exec(Path('tools/check-shaders.py').read_text().split('data=json.loads')[0])
U=c.c_uint;I=c.c_int;F=c.c_float;P=c.c_void_p
S=256
E.eglCreatePbufferSurface.argtypes=[P,P,c.POINTER(I)];E.eglCreatePbufferSurface.restype=P
surface=E.eglCreatePbufferSurface(d,config,(I*5)(0x3057,S,0x3056,S,0x3038));assert E.eglMakeCurrent(d,surface,surface,ctx)
def obj(name):
 x=U();fn(name,None,I,c.POINTER(U))(1,c.byref(x));return x.value
def prog(v,f):
 p=fn('glCreateProgram',U)()
 for typ,txt in [(0x8b31,v),(0x8b30,f)]:
  sh=create(typ);src=c.c_char_p(('#version 300 es\nprecision highp float;\n'+txt).encode());source(sh,1,c.byref(src),None);compile(sh);ok=I();get(sh,0x8b81,c.byref(ok));assert ok.value;fn('glAttachShader',None,U,U)(p,sh)
 fn('glLinkProgram',None,U)(p);ok=I();fn('glGetProgramiv',None,U,U,c.POINTER(I))(p,0x8b82,c.byref(ok));assert ok.value;return p
def uni(p,k,v):
 l=fn('glGetUniformLocation',I,U,c.c_char_p)(p,k.encode())
 if isinstance(v,(int,float)):fn('glUniform1f',None,I,F)(l,v)
 else:
  a=np.array(v,np.float32)
  if len(a)==16:fn('glUniformMatrix4fv',None,I,I,U,P)(l,1,0,a.ctypes.data)
  else:fn('glUniform%dfv'%len(a),None,I,I,P)(l,1,a.ctypes.data)
def attr(slot,data,size):
 a=np.array(data,np.float32);b=obj('glGenBuffers');fn('glBindBuffer',None,U,U)(0x8892,b);fn('glBufferData',None,U,c.c_ssize_t,P,U)(0x8892,a.nbytes,a.ctypes.data,0x88e4);fn('glEnableVertexAttribArray',None,U)(slot);fn('glVertexAttribPointer',None,U,I,U,U,I,P)(slot,size,0x1406,0,0,None)
def tex(slot,im):
 t=obj('glGenTextures');fn('glActiveTexture',None,U)(0x84c0+slot);fn('glBindTexture',None,U,U)(0xde1,t);a=np.array(im.convert('RGBA'));fn('glTexImage2D',None,U,I,I,I,I,I,U,U,P)(0xde1,0,0x1908,im.width,im.height,0,0x1908,0x1401,a.ctypes.data)
 for k,v in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812f),(0x2803,0x812f)]:fn('glTexParameteri',None,U,U,I)(0xde1,k,v)
vp=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{mul,look,ortho}from'./math.js';console.log(JSON.stringify([...mul(ortho(1.35,1.35),look([0,12,15],[0,0,0]))]))"],text=True))
v,f=re.search(r'program\(gl,`(.*?)`,`(.*?)`\)',Path('thorn-sprite.js').read_text(),re.S).groups();sprite=prog(v,f)
ground=prog('layout(location=0)in vec3 position;uniform mat4 vp;void main(){gl_Position=vp*vec4(position,1.);}','out vec4 color;void main(){color=vec4(.45,.62,.27,1.);}')
sg=obj('glGenVertexArrays');fn('glBindVertexArray',None,U)(sg);attr(0,[-.675,.675,0,.675,-.675,0,.675,.675,0,-.675,.675,0,-.675,-.675,0,.675,-.675,0],3);attr(2,[0,0,1,1,1,0,0,0,0,1,1,1],2)
gg=obj('glGenVertexArrays');fn('glBindVertexArray',None,U)(gg);attr(0,[-3,0,-3,3,0,3,3,0,-3,-3,0,-3,-3,0,3,3,0,3],3)
tex(10,Image.open('public/assets/enemies/thorn-sprite.png'));tex(1,Image.new('RGBA',(1,1),(0,0,0,255)))
fn('glViewport',None,I,I,I,I)(0,0,S,S);fn('glEnable',None,U)(0xb71);fn('glDepthFunc',None,U)(0x203)
frames=[]
for useground in [False,True]:
 fn('glClearColor',None,F,F,F,F)(.45,.62,.27,1);fn('glClear',None,U)(0x4100)
 if useground:
  fn('glUseProgram',None,U)(ground);uni(ground,'vp',vp);fn('glBindVertexArray',None,U)(gg);fn('glDrawArrays',None,U,I,I)(4,0,6)
 fn('glUseProgram',None,U)(sprite)
 for name,slot in [('atlas',10),('canopy',1)]:fn('glUniform1i',None,I,I)(fn('glGetUniformLocation',I,U,c.c_char_p)(sprite,name.encode()),slot)
 for k,val in dict(vp=vp,origin=[0,.015,0],player=[0,0,0],cell=0,hit=0).items():uni(sprite,k,val)
 fn('glBindVertexArray',None,U)(sg);fn('glDrawArrays',None,U,I,I)(4,0,6)
 a=np.zeros((S,S,4),np.uint8);fn('glReadPixels',None,I,I,I,I,U,U,P)(0,0,S,S,0x1908,0x1401,a.ctypes.data);frames.append(a.copy())
assert np.array_equal(frames[0],frames[1]),'Ground clips the sprite silhouette'
assert fn('glGetError',U)()==0
Image.fromarray(frames[1][::-1]).save('/tmp/thorn-ground-check.png')
print('PASS actual Thorn shader: ground clips zero pixels; silhouette preserved; GL errors 0')
