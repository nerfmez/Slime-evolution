"""Bake source GLB skeletal walks into small shared GPU pose meshes (no runtime skeleton cost)."""
import json,struct,sys
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation
src=Path(sys.argv[1]);out=Path('public/assets/enemies');out.mkdir(exist_ok=True)
specs=[('thorn','spiky_berry_v1.glb',.92),('moss','mossback_walking_legs_source_v3.glb',1.40),('petal','petal_skitter_rig_v2.glb',.78),('crystal','crystal_walk_user_v9.glb',1.20)]
for key,file,width in specs:
 b=(src/file).read_bytes();length=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+length]);start=28+length
 def acc(id):
  a=j['accessors'][id];v=j['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];dt=np.dtype({5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]);offset=start+v.get('byteOffset',0)+a.get('byteOffset',0)
  return np.ndarray((a['count'],n),dtype=dt,buffer=b,offset=offset,strides=(v.get('byteStride',n*dt.itemsize),dt.itemsize)).copy()
 nodes=j['nodes'];ni=next(i for i,n in enumerate(nodes) if 'mesh' in n);pr=j['meshes'][nodes[ni]['mesh']]['primitives'][0];attrs=pr['attributes'];pos=acc(attrs['POSITION']);norm=acc(attrs['NORMAL']);uv=acc(attrs['TEXCOORD_0']);indices=acc(pr['indices']).ravel().astype('<u4');parents={c:i for i,n in enumerate(nodes) for c in n.get('children',[])}
 skin=j['skins'][nodes[ni]['skin']];ibm=acc(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1);weights=[]
 for k in range(3):
  if f'JOINTS_{k}' in attrs:weights.append((acc(attrs[f'JOINTS_{k}']).astype(int),acc(attrs[f'WEIGHTS_{k}'])))
 channels=[];duration=.85
 if j.get('animations'):
  animation=j['animations'][0]
  for ch in animation['channels']:
   target=ch['target'];node=target['node'];path=target['path'];name=nodes[node].get('name','').lower()
   if key=='moss' and not ('frontleg' in name or 'backleg' in name):continue
   if key=='crystal' and path!='rotation':continue
   if key=='petal' and path!='rotation':continue
   sm=animation['samplers'][ch['sampler']];times=acc(sm['input']).ravel();values=acc(sm['output']);duration=max(duration,float(times[-1]));channels.append((node,path,times,values,sm.get('interpolation','LINEAR')))
 def pose(t):
  trs=[{p:np.array(n.get(p,d),float) for p,d in [('translation',[0,0,0]),('rotation',[0,0,0,1]),('scale',[1,1,1])]} for n in nodes]
  for node,path,times,values,interp in channels:
   k=min(max(0,int(np.searchsorted(times,t)-1)),len(times)-2);f=np.clip((t-times[k])/max(1e-8,times[k+1]-times[k]),0,1);a=values[k];c=values[k+1]
   if path=='rotation' and np.dot(a,c)<0:c=-c
   val=a if interp=='STEP' else a*(1-f)+c*f
   if path=='rotation':val=val/max(1e-9,np.linalg.norm(val))
   trs[node][path]=val
  if key=='thorn':
   for idx,name in enumerate(['Bone_013','Bone_017','Bone_021','Bone_025']):
    node=next((i for i,n in enumerate(nodes) if n.get('name')==name),None)
    if node is None:continue
    phase=t/duration*np.pi*2+([0,np.pi,np.pi,0][idx]);rot=Rotation.from_euler('xz',[np.sin(phase)*.32,max(0,np.cos(phase))*.12]);trs[node]['rotation']=(Rotation.from_quat(trs[node]['rotation'])*rot).as_quat()
  cache={}
  def world(i):
   if i not in cache:
    if 'matrix' in nodes[i]:m=np.array(nodes[i]['matrix']).reshape(4,4).T
    else:
     p=trs[i];m=np.eye(4);m[:3,:3]=Rotation.from_quat(p['rotation']).as_matrix()@np.diag(p['scale']);m[:3,3]=p['translation']
    cache[i]=world(parents[i])@m if i in parents else m
   return cache[i]
  matrices=np.array([world(i)@ibm[k] for k,i in enumerate(skin['joints'])]);blend=np.zeros((len(pos),4,4));total=np.zeros(len(pos))
  for joints,w in weights:blend+=np.sum(matrices[joints]*w[:,:,None,None],axis=1);total+=w.sum(axis=1)
  blend/=np.maximum(total[:,None,None],1e-8)
  points=np.einsum('nij,nj->ni',blend,np.c_[pos,np.ones(len(pos))])[:,:3]
  normals=np.einsum('nij,nj->ni',np.linalg.inv(blend[:,:3,:3]).transpose(0,2,1),norm);normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-8)
  return points,normals
 frames=[pose(t) for t in np.linspace(0,duration,32,endpoint=False)];allpos=np.concatenate([p for p,n in frames]);low=allpos.min(axis=0);high=allpos.max(axis=0);scale=width/max(high[0]-low[0],high[2]-low[2]);offset=np.array([(low[0]+high[0])/2,low[1],(low[2]+high[2])/2]);frames=[((p-offset)*scale,n) for p,n in frames]
 pts,ns=frames[0];tri=indices.reshape(-1,3);face=np.cross(pts[tri[:,1]]-pts[tri[:,0]],pts[tri[:,2]]-pts[tri[:,0]]);agree=np.sum(face*ns[tri].mean(axis=1),axis=1)
 if np.sum(agree)<0:indices=tri[:,[0,2,1]].ravel().copy()
 tex=j['textures'][j['materials'][pr['material']]['pbrMetallicRoughness']['baseColorTexture']['index']]['source'];im=j['images'][tex];v=j['bufferViews'][im['bufferView']];ext='png' if 'png' in im['mimeType'] else 'jpg';(out/f'{key}.{ext}').write_bytes(b[start+v.get('byteOffset',0):start+v.get('byteOffset',0)+v['byteLength']])
 parts=[uv.astype('<f4').tobytes(),indices.astype('<u4').tobytes()]+[a.astype('<f4').tobytes() for frame in frames for a in frame];(out/f'{key}.bin').write_bytes(b''.join(parts))
 meta={'vertices':len(pos),'indices':len(indices),'frames':len(frames),'duration':duration,'texture':f'{key}.{ext}','source':file,'height':float((high[1]-low[1])*scale)};(out/f'{key}.json').write_text(json.dumps(meta));print(key,meta,'motion',float(np.max(np.abs(frames[0][0]-frames[8][0]))))
