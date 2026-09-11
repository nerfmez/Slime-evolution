import ctypes as c, subprocess,json
E=c.CDLL('libEGL.so.1')
E.eglGetProcAddress.argtypes=[c.c_char_p];E.eglGetProcAddress.restype=c.c_void_p
getdisplay=c.CFUNCTYPE(c.c_void_p,c.c_uint,c.c_void_p,c.POINTER(c.c_int))(E.eglGetProcAddress(b'eglGetPlatformDisplayEXT'))
d=getdisplay(0x31dd,None,None)
E.eglInitialize.argtypes=[c.c_void_p,c.POINTER(c.c_int),c.POINTER(c.c_int)];E.eglInitialize.restype=c.c_uint
major=c.c_int();minor=c.c_int()
if not E.eglInitialize(d,c.byref(major),c.byref(minor)):raise RuntimeError('EGL initialization failed')
E.eglBindAPI(0x30a0)
attrs=(c.c_int*15)(0x3025,24,0x3033,1,0x3040,0x40,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3038)
config=c.c_void_p();num=c.c_int()
E.eglChooseConfig.argtypes=[c.c_void_p,c.POINTER(c.c_int),c.POINTER(c.c_void_p),c.c_int,c.POINTER(c.c_int)]
E.eglChooseConfig(d,attrs,c.byref(config),1,c.byref(num))
if not num.value:raise RuntimeError('No GLES3 config')
E.eglCreateContext.argtypes=[c.c_void_p,c.c_void_p,c.c_void_p,c.POINTER(c.c_int)];E.eglCreateContext.restype=c.c_void_p
ctx=E.eglCreateContext(d,config,None,(c.c_int*3)(0x3098,3,0x3038))
E.eglMakeCurrent.argtypes=[c.c_void_p,c.c_void_p,c.c_void_p,c.c_void_p]
if not E.eglMakeCurrent(d,None,None,ctx):raise RuntimeError('Cannot make GLES context current')
def fn(name,restype,*args):return c.CFUNCTYPE(restype,*args)(E.eglGetProcAddress(name.encode()))
create=fn('glCreateShader',c.c_uint,c.c_uint);source=fn('glShaderSource',None,c.c_uint,c.c_int,c.POINTER(c.c_char_p),c.c_void_p);compile=fn('glCompileShader',None,c.c_uint);get=fn('glGetShaderiv',None,c.c_uint,c.c_uint,c.POINTER(c.c_int));log=fn('glGetShaderInfoLog',None,c.c_uint,c.c_int,c.c_void_p,c.c_char_p)
data=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {vs,fs} from './shaders.js';console.log(JSON.stringify({vs,fs}))"],text=True))
ids=[]
for key,kind in [('vs',0x8b31),('fs',0x8b30)]:
 s=create(kind);ids.append(s);src=c.c_char_p(('#version 300 es\nprecision highp float;\n'+data[key]).encode());source(s,1,c.byref(src),None);compile(s);ok=c.c_int();get(s,0x8b81,c.byref(ok));buf=c.create_string_buffer(8192);log(s,8192,None,buf)
 print(key, 'PASS' if ok.value else 'FAIL',buf.value.decode())
 if not ok.value:raise SystemExit(1)
p=fn('glCreateProgram',c.c_uint)();attach=fn('glAttachShader',None,c.c_uint,c.c_uint)
for s in ids:attach(p,s)
fn('glLinkProgram',None,c.c_uint)(p);ok=c.c_int();fn('glGetProgramiv',None,c.c_uint,c.c_uint,c.POINTER(c.c_int))(p,0x8b82,c.byref(ok));print('LINK','PASS' if ok.value else 'FAIL')
raise SystemExit(0 if ok.value else 1)
