exec(open('tools/check-shaders.py').read().rsplit('raise SystemExit',1)[0])
import numpy as np,struct,io
from PIL import Image
from pathlib import Path
import os,time
W,H=(2048,2048) if os.environ.get("SCENE_BAKE") else (round(1200*float(os.environ.get("SCENE_RENDER_SCALE",1))),round(750*float(os.environ.get("SCENE_RENDER_SCALE",1))))
E.eglCreatePbufferSurface.argtypes=[c.c_void_p,c.c_void_p,c.POINTER(c.c_int)];E.eglCreatePbufferSurface.restype=c.c_void_p
surface=E.eglCreatePbufferSurface(d,config,(c.c_int*5)(0x3057,W,0x3056,H,0x3038))
assert E.eglMakeCurrent(d,surface,surface,ctx)
void=c.c_void_p;U=c.c_uint;I=c.c_int;F=c.c_float
bindvao=fn('glBindVertexArray',None,U);bindbuf=fn('glBindBuffer',None,U,U);upload=fn('glBufferData',None,U,c.c_ssize_t,void,U)
genvao=fn('glGenVertexArrays',None,I,c.POINTER(U));genbuf=fn('glGenBuffers',None,I,c.POINTER(U))
data=json.load(open('/tmp/scene-draws.json'));meshes=[]
for g in data['geometries']:
 vao=U();genvao(1,c.byref(vao));bindvao(vao)
 for slot,key,size in [(0,'pos',3),(1,'normals',3),(2,'uv',2)]:
  arr=np.array(g[key],np.float32);buf=U();genbuf(1,c.byref(buf));bindbuf(0x8892,buf);upload(0x8892,arr.nbytes,arr.ctypes.data,0x88e4)
  fn('glEnableVertexAttribArray',None,U)(slot);fn('glVertexAttribPointer',None,U,I,U,U,I,void)(slot,size,0x1406,0,0,None)
 if g.get('indices'):
  arr=np.array(g['indices'],np.uint32);buf=U();genbuf(1,c.byref(buf));bindbuf(0x8893,buf);upload(0x8893,arr.nbytes,arr.ctypes.data,0x88e4)
 meshes.append(vao.value)
root=Path('public/assets');textures={}
bindtex=fn('glBindTexture',None,U,U)
for name in ['slime_meshy_exact_v3.glb','spiky_berry_v1.glb','grass-original.png','tree-reference-b.png','pond-painted.png','grass-painted.png','pond-northern.png','clearing-painted.png','slime-watercolor.png','enemies/thorn.jpg','enemies/moss.png','enemies/petal.jpg','enemies/crystal.png']+([] if os.environ.get('SCENE_BAKE') else ['meadow-pigment-cache.png']):
 b=(root/name).read_bytes()
 if name.endswith('.glb'):
  size=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+size]);pr=j['meshes'][0]['primitives'][0];mat=j['materials'][pr['material']];im=j['images'][j['textures'][mat['pbrMetallicRoughness']['baseColorTexture']['index']]['source']];bv=j['bufferViews'][im['bufferView']];start=28+size+bv.get('byteOffset',0);b=b[start:start+bv['byteLength']]
 im=Image.open(io.BytesIO(b)).convert('RGBA');arr=np.array(im);tex=U();fn('glGenTextures',None,I,c.POINTER(U))(1,c.byref(tex));bindtex(0x0de1,tex)
 fn('glTexImage2D',None,U,I,I,I,I,I,U,U,void)(0x0de1,0,0x1908,im.width,im.height,0,0x1908,0x1401,arr.ctypes.data)
 fn('glGenerateMipmap',None,U)(0x0de1)
 for a,v in [(0x2801,0x2703),(0x2800,0x2601),(0x2802,0x812f),(0x2803,0x812f)]:fn('glTexParameteri',None,U,U,I)(0x0de1,a,v)
 textures[name]=tex.value
# Upload the exact runtime-generated canopy map to the same second texture unit.
canopy_bytes=subprocess.check_output(['node','--input-type=module','-e',"import {createCanopyPixels} from './canopy.js';process.stdout.write(createCanopyPixels())"])
canopy=np.frombuffer(canopy_bytes,dtype=np.uint8);shade_tex=U();fn('glGenTextures',None,I,c.POINTER(U))(1,c.byref(shade_tex))
fn('glActiveTexture',None,U)(0x84c1);bindtex(0x0de1,shade_tex)
fn('glTexImage2D',None,U,I,I,I,I,I,U,U,void)(0x0de1,0,0x1908,512,512,0,0x1908,0x1401,canopy.ctypes.data)
for a,v in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812f),(0x2803,0x812f)]:fn('glTexParameteri',None,U,U,I)(0x0de1,a,v)
fn('glUseProgram',None,U)(p)
fn('glUniform1i',None,I,I)(fn('glGetUniformLocation',I,U,c.c_char_p)(p,b'canopyTex'),1)
fn('glActiveTexture',None,U)(0x84c2);bindtex(0x0de1,textures['clearing-painted.png'])
fn('glUniform1i',None,I,I)(fn('glGetUniformLocation',I,U,c.c_char_p)(p,b'clearingTex'),2)
if not os.environ.get('SCENE_BAKE'):
 fn('glActiveTexture',None,U)(0x84c3);bindtex(0x0de1,textures['meadow-pigment-cache.png'])
 fn('glUniform1i',None,I,I)(fn('glGetUniformLocation',I,U,c.c_char_p)(p,b'meadowTex'),3)
bend=np.array(data['bendMap'],dtype=np.uint8);bend_tex=U();fn('glGenTextures',None,I,c.POINTER(U))(1,c.byref(bend_tex))
fn('glActiveTexture',None,U)(0x84c4);bindtex(0x0de1,bend_tex)
fn('glTexImage2D',None,U,I,I,I,I,I,U,U,void)(0x0de1,0,0x1908,192,192,0,0x1908,0x1401,bend.ctypes.data)
for a,v in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812f),(0x2803,0x812f)]:fn('glTexParameteri',None,U,U,I)(0x0de1,a,v)
fn('glUniform1i',None,I,I)(fn('glGetUniformLocation',I,U,c.c_char_p)(p,b'grassBendTex'),4)
fn('glActiveTexture',None,U)(0x84c0)
fn('glUseProgram',None,U)(p);fn('glViewport',None,I,I,I,I)(0,0,W,H);fn('glClearColor',None,F,F,F,F)(.44,.57,.41,1);fn('glClear',None,U)(0x4000|0x0100)
enable=fn('glEnable',None,U);disable=fn('glDisable',None,U);enable(0x0b71);fn('glDepthFunc',None,U)(0x0203)
fn('glBlendFunc',None,U,U)(0x0302,0x0303)
getloc=fn('glGetUniformLocation',I,U,c.c_char_p)
durations=[]
for frame in range(8 if os.environ.get('SCENE_BENCH') else 1):
 frame_start=time.perf_counter()
 fn('glDepthMask',None,U)(1);fn('glClear',None,U)(0x4000|0x0100)
 for call in data['commands']:
  st=call['state'];(enable if st['blend'] else disable)(0x0be2);(enable if st.get('culling') else disable)(0x0b44)
  if st.get('culling'):fn('glCullFace',None,U)(0x0404 if st['cull']==3 else 0x0405)
  fn('glDepthMask',None,U)(int(st['depth']))
  for k,v in call['uniforms'].items():
   if k=='tex':bindtex(0x0de1,textures[v]);continue
   loc=getloc(p,k.encode())
   if loc<0:continue
   if isinstance(v,(int,float)):fn('glUniform1f',None,I,F)(loc,v)
   else:
    a=np.array(v,np.float32)
    if k=='treeHits[0]':fn('glUniform4fv',None,I,I,void)(loc,len(v)//4,a.ctypes.data)
    elif len(v)==16:fn('glUniformMatrix4fv',None,I,I,U,void)(loc,1,0,a.ctypes.data)
    else:fn('glUniform%dfv'%len(v),None,I,I,void)(loc,1,a.ctypes.data)
  g=data['geometries'][call['geometry']];bindvao(meshes[call['geometry']])
  if g.get('indices'):fn('glDrawElements',None,U,I,U,void)(4,call['count'],0x1405,None)
  else:fn('glDrawArrays',None,U,I,I)(4,0,call['count'])
 fn('glFinish',None)()
 durations.append((time.perf_counter()-frame_start)*1000)
if os.environ.get('SCENE_BENCH'):
 print('BENCH_MS',json.dumps(durations[3:]),'MEDIAN_MS',round(float(np.median(durations[3:])),3))
fn('glFinish',None)();out=np.zeros((H,W,4),np.uint8);fn('glReadPixels',None,I,I,I,I,U,U,void)(0,0,W,H,0x1908,0x1401,out.ctypes.data)
error=fn('glGetError',U)();print('GL error',hex(error));assert error==0
Image.fromarray(out[::-1]).save('/tmp/meadow-native.png');print('/tmp/meadow-native.png')
