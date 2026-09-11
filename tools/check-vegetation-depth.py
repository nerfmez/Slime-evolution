"""GPU regression: matching single-sample depth, foliage exclusion, solid occlusion."""
from pathlib import Path
import ctypes as c,re,numpy as np
exec(Path('tools/check-shaders.py').read_text().split('data=json.loads')[0])
U=c.c_uint;I=c.c_int;F=c.c_float;P=c.c_void_p
W=H=32
# Match the explicit RGBA8 / DEPTH_COMPONENT24 scene surface.
def obj(name):
 x=U();fn(name,None,I,c.POINTER(U))(1,c.byref(x));return x.value
fb=obj('glGenFramebuffers');fn('glBindFramebuffer',None,U,U)(0x8d40,fb)
for attachment,fmt in [(0x8ce0,0x8058),(0x8d00,0x81a6)]:
 r=obj('glGenRenderbuffers');fn('glBindRenderbuffer',None,U,U)(0x8d41,r);fn('glRenderbufferStorage',None,U,U,I,I)(0x8d41,fmt,W,H);fn('glFramebufferRenderbuffer',None,U,U,U,U)(0x8d40,attachment,0x8d41,r)
assert fn('glCheckFramebufferStatus',U,U)(0x8d40)==0x8cd5
saved=obj('glGenFramebuffers');fn('glBindFramebuffer',None,U,U)(0x8d40,saved);tex=obj('glGenTextures');fn('glActiveTexture',None,U)(0x84c9);fn('glBindTexture',None,U,U)(0xde1,tex);fn('glTexImage2D',None,U,I,I,I,I,I,U,U,P)(0xde1,0,0x81a6,W,H,0,0x1902,0x1405,None)
for k in [0x2801,0x2800]:fn('glTexParameteri',None,U,U,I)(0xde1,k,0x2600)
fn('glFramebufferTexture2D',None,U,U,U,U,I)(0x8d40,0x8d00,0xde1,tex,0);fn('glDrawBuffers',None,I,c.POINTER(U))(1,(U*1)(0));fn('glReadBuffer',None,U)(0)
assert fn('glCheckFramebufferStatus',U,U)(0x8d40)==0x8cd5
vs='void main(){vec2 q=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(q*2.-1.,0,1);}'
def program(v,f):
 p=fn('glCreateProgram',U)()
 for typ,txt in [(0x8b31,v),(0x8b30,f)]:
  sh=create(typ);src=c.c_char_p(('#version 300 es\nprecision highp float;\n'+txt).encode());source(sh,1,c.byref(src),None);compile(sh);ok=I();get(sh,0x8b81,c.byref(ok));assert ok.value;fn('glAttachShader',None,U,U)(p,sh)
 fn('glLinkProgram',None,U)(p);return p
effect=program(vs,'out vec4 color;void main(){gl_FragDepth=.5;color=vec4(1,.3,0,1);}')
vao=obj('glGenVertexArrays');fn('glBindVertexArray',None,U)(vao);fn('glViewport',None,I,I,I,I)(0,0,W,H)
fn('glBindFramebuffer',None,U,U)(0x8d40,fb);fn('glClearDepthf',None,F)(.9);fn('glClearColor',None,F,F,F,F)(0,1,0,1);fn('glClear',None,U)(0x4100)
fn('glEnable',None,U)(0xc11);fn('glScissor',None,I,I,I,I)(0,0,W//2,H);fn('glClearDepthf',None,F)(.1);fn('glClear',None,U)(0x100);fn('glDisable',None,U)(0xc11)
fn('glBindFramebuffer',None,U,U)(0x8ca8,fb);fn('glBindFramebuffer',None,U,U)(0x8ca9,saved);fn('glBlitFramebuffer',None,I,I,I,I,I,I,I,I,U,U)(0,0,W,H,0,0,W,H,0x100,0x2600);assert fn('glGetError',U)()==0,'Depth snapshot failed'
fn('glBindFramebuffer',None,U,U)(0x8d40,fb);fn('glClearDepthf',None,F)(.05);fn('glClear',None,U)(0x100)
fn('glBindFramebuffer',None,U,U)(0x8ca8,saved);fn('glBindFramebuffer',None,U,U)(0x8ca9,fb);fn('glBlitFramebuffer',None,I,I,I,I,I,I,I,I,U,U)(0,0,W,H,0,0,W,H,0x100,0x2600);fn('glBindFramebuffer',None,U,U)(0x8d40,fb);fn('glEnable',None,U)(0xb71)
fn('glColorMask',None,U,U,U,U)(1,1,1,1);fn('glDepthFunc',None,U)(0x203);fn('glUseProgram',None,U)(effect);fn('glDrawArrays',None,U,I,I)(4,0,3)
# Resolve color for two meaningful pixel assertions.
colorfb=obj('glGenFramebuffers');fn('glBindFramebuffer',None,U,U)(0x8ca9,colorfb);r=obj('glGenRenderbuffers');fn('glBindRenderbuffer',None,U,U)(0x8d41,r);fn('glRenderbufferStorage',None,U,U,I,I)(0x8d41,0x8058,W,H);fn('glFramebufferRenderbuffer',None,U,U,U,U)(0x8ca9,0x8ce0,0x8d41,r)
fn('glBindFramebuffer',None,U,U)(0x8ca8,fb);fn('glBlitFramebuffer',None,I,I,I,I,I,I,I,I,U,U)(0,0,W,H,0,0,W,H,0x4000,0x2600);fn('glBindFramebuffer',None,U,U)(0x8d40,colorfb)
a=np.zeros((H,W,4),np.uint8);fn('glReadPixels',None,I,I,I,I,U,U,P)(0,0,W,H,0x1908,0x1401,a.ctypes.data)
assert fn('glGetError',U)()==0
assert a[16,24,0]>250 and a[16,24,1]<100,'Vegetation still occludes VFX'
assert a[16,8,0]<5 and a[16,8,1]>250,'Solid occlusion was lost'
print('PASS: VFX over vegetation; solid occlusion preserved; matching single-sample depth restore; GL errors0')
