"""Bake Stage 1 elite support assets and Ancient Bloom clips from the v100 Godot GLBs.

Usage:
  python tools/bake-stage1-specials.py /path/to/Slime-v100/assets

Outputs into public/assets/enemies/:
- boss.bin / boss.png / boss.json
- boss-run.bin, boss-charge.bin, boss-push.bin, boss-spell.bin
- petal-flight.bin (procedural WING DIVE pose from the approved Godot rig)
- crystal-elite.png

Extra clip bins contain position/normal float32 pairs only and reuse the base asset UV/index buffers.
"""
from __future__ import annotations
import json, math, struct, sys, shutil
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation

ASSETS = Path(sys.argv[1])
MODELS = ASSETS / 'models'
TEXTURES = ASSETS / 'textures'
OUT = Path('public/assets/enemies')
OUT.mkdir(parents=True, exist_ok=True)

TYPE_SIZE = {5126: 4, 5125: 4, 5123: 2, 5121: 1}
TYPE_DTYPE = {5126: '<f4', 5125: '<u4', 5123: '<u2', 5121: 'u1'}
COMPONENTS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

class GLB:
    def __init__(self, path: Path):
        self.path = path
        self.b = path.read_bytes()
        length = struct.unpack_from('<I', self.b, 12)[0]
        self.j = json.loads(self.b[20:20+length])
        self.start = 28 + length
        self.nodes = self.j['nodes']
        self.parents = {c:i for i,n in enumerate(self.nodes) for c in n.get('children',[])}
        self.mesh_node = next(i for i,n in enumerate(self.nodes) if 'mesh' in n and 'skin' in n)
        self.primitive = self.j['meshes'][self.nodes[self.mesh_node]['mesh']]['primitives'][0]
        attrs = self.primitive['attributes']
        self.pos = self.acc(attrs['POSITION']).astype(float)
        self.norm = self.acc(attrs['NORMAL']).astype(float)
        self.uv = self.acc(attrs['TEXCOORD_0']).astype(float)
        self.indices = self.acc(self.primitive['indices']).ravel().astype('<u4')
        self.skin = self.j['skins'][self.nodes[self.mesh_node]['skin']]
        self.ibm = self.acc(self.skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
        self.weights = []
        for k in range(4):
            jk, wk = f'JOINTS_{k}', f'WEIGHTS_{k}'
            if jk in attrs and wk in attrs:
                self.weights.append((self.acc(attrs[jk]).astype(int), self.acc(attrs[wk]).astype(float)))
        self.base_trs = []
        for n in self.nodes:
            self.base_trs.append({
                'translation': np.array(n.get('translation',[0,0,0]), float),
                'rotation': np.array(n.get('rotation',[0,0,0,1]), float),
                'scale': np.array(n.get('scale',[1,1,1]), float),
            })
        self.name_to_node = {n.get('name',''):i for i,n in enumerate(self.nodes)}

    def acc(self, ident: int):
        a = self.j['accessors'][ident]
        v = self.j['bufferViews'][a['bufferView']]
        n = COMPONENTS[a['type']]
        dt = np.dtype(TYPE_DTYPE[a['componentType']])
        offset = self.start + v.get('byteOffset',0) + a.get('byteOffset',0)
        return np.ndarray((a['count'],n), dtype=dt, buffer=self.b, offset=offset,
                          strides=(v.get('byteStride', n*dt.itemsize), dt.itemsize)).copy()

    def animation(self, name: str):
        target = next((a for a in self.j.get('animations',[]) if a.get('name','').lower()==name.lower()), None)
        if target is None:
            raise KeyError(f'Animation {name!r} not found in {self.path.name}')
        channels=[]; duration=0.0
        for ch in target['channels']:
            t = ch['target']; node=t['node']; path=t['path']; sm=target['samplers'][ch['sampler']]
            times=self.acc(sm['input']).ravel().astype(float); values=self.acc(sm['output']).astype(float)
            duration=max(duration,float(times[-1])); channels.append((node,path,times,values,sm.get('interpolation','LINEAR')))
        return channels, duration

    def sample_animation(self, name: str, t: float, strip_hips_xz=False):
        channels, duration = self.animation(name)
        trs=[{k:v.copy() for k,v in p.items()} for p in self.base_trs]
        for node,path,times,values,interp in channels:
            if len(times)==1:
                val=values[0].copy()
            else:
                k=min(max(0,int(np.searchsorted(times,t)-1)),len(times)-2)
                f=np.clip((t-times[k])/max(1e-8,times[k+1]-times[k]),0,1)
                a=values[k].copy(); c=values[k+1].copy()
                if path=='rotation' and np.dot(a,c)<0:c=-c
                val=a if interp=='STEP' else a*(1-f)+c*f
            if path=='rotation': val=val/max(1e-9,np.linalg.norm(val))
            if strip_hips_xz and self.nodes[node].get('name')=='Hips' and path=='translation':
                val=val.copy(); val[0]=0.0; val[2]=0.0
            trs[node][path]=val
        return self.skin_pose(trs), duration

    def skin_pose(self, trs):
        cache={}
        def world(i):
            if i not in cache:
                if 'matrix' in self.nodes[i]:
                    m=np.array(self.nodes[i]['matrix'],float).reshape(4,4).T
                else:
                    p=trs[i];m=np.eye(4);m[:3,:3]=Rotation.from_quat(p['rotation']).as_matrix()@np.diag(p['scale']);m[:3,3]=p['translation']
                cache[i]=world(self.parents[i])@m if i in self.parents else m
            return cache[i]
        matrices=np.array([world(i)@self.ibm[k] for k,i in enumerate(self.skin['joints'])])
        blend=np.zeros((len(self.pos),4,4));total=np.zeros(len(self.pos))
        for joints,w in self.weights:
            blend += np.sum(matrices[joints]*w[:,:,None,None],axis=1); total += w.sum(axis=1)
        blend/=np.maximum(total[:,None,None],1e-8)
        points=np.einsum('nij,nj->ni',blend,np.c_[self.pos,np.ones(len(self.pos))])[:,:3]
        normals=np.einsum('nij,nj->ni',np.linalg.inv(blend[:,:3,:3]).transpose(0,2,1),self.norm)
        normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-8)
        return points,normals

    def extract_base_texture(self, target: Path):
        mat=self.j['materials'][self.primitive['material']]
        tex_index=mat['pbrMetallicRoughness']['baseColorTexture']['index']
        image_id=self.j['textures'][tex_index]['source']; im=self.j['images'][image_id]
        if 'bufferView' not in im: raise RuntimeError('Only embedded texture supported')
        v=self.j['bufferViews'][im['bufferView']]; mime=im['mimeType']
        ext='png' if 'png' in mime else 'jpg'
        data=self.b[self.start+v.get('byteOffset',0):self.start+v.get('byteOffset',0)+v['byteLength']]
        path=target.with_suffix('.'+ext); path.write_bytes(data); return path.name


def fix_winding(indices, points, normals):
    tri=indices.reshape(-1,3);face=np.cross(points[tri[:,1]]-points[tri[:,0]],points[tri[:,2]]-points[tri[:,0]])
    agree=np.sum(face*normals[tri].mean(axis=1),axis=1)
    return tri[:,[0,2,1]].ravel().copy() if np.sum(agree)<0 else indices.copy()


def normalize_frames(frames, width, reference_frames=None):
    ref=reference_frames or frames
    allpos=np.concatenate([p for p,n in ref]);low=allpos.min(axis=0);high=allpos.max(axis=0)
    scale=width/max(high[0]-low[0],high[2]-low[2]); offset=np.array([(low[0]+high[0])/2,low[1],(low[2]+high[2])/2])
    normalized=[((p-offset)*scale,n) for p,n in frames]
    height=float((high[1]-low[1])*scale)
    return normalized, scale, offset, height


def write_extra_clip(path: Path, frames):
    path.write_bytes(b''.join(a.astype('<f4').tobytes() for frame in frames for a in frame))


def bake_boss():
    glb=GLB(MODELS/'bloomstone_guardian_animated_v1.glb')
    clip_names=['walk','run','charge','push','spell']; raw={}; durations={}
    for name in clip_names:
        _, duration=glb.animation(name); durations[name]=duration
        raw[name]=[glb.sample_animation(name,t,strip_hips_xz=True)[0] for t in np.linspace(0,duration,32,endpoint=False)]
    # Keep one world scale across all clips; walk controls the grounded footprint.
    walk_norm,scale,offset,height=normalize_frames(raw['walk'],5.50)
    def same_transform(frames): return [((p-offset)*scale,n) for p,n in frames]
    clips={'walk':walk_norm, **{n:same_transform(raw[n]) for n in clip_names if n!='walk'}}
    indices=fix_winding(glb.indices,clips['walk'][0][0],clips['walk'][0][1])
    tex=glb.extract_base_texture(OUT/'boss')
    parts=[glb.uv.astype('<f4').tobytes(),indices.astype('<u4').tobytes()]+[a.astype('<f4').tobytes() for f in clips['walk'] for a in f]
    (OUT/'boss.bin').write_bytes(b''.join(parts))
    extra={}
    for name in ['run','charge','push','spell']:
        fn=f'boss-{name}.bin';write_extra_clip(OUT/fn,clips[name]);extra[name]={'bin':fn,'frames':32,'duration':durations[name]}
    meta={'vertices':len(glb.pos),'indices':len(indices),'frames':32,'duration':durations['walk'],'texture':tex,'source':'bloomstone_guardian_animated_v1.glb','height':height,'extra_clips':extra,'baked_width':5.50}
    (OUT/'boss.json').write_text(json.dumps(meta,separators=(',',':')))
    print('boss',meta)


def petal_reference_transform(glb: GLB):
    channels,duration=glb.animation('PetalWalkGlobalRetarget')
    frames=[glb.sample_animation('PetalWalkGlobalRetarget',t)[0] for t in np.linspace(0,duration,32,endpoint=False)]
    _,scale,offset,height=normalize_frames(frames,.78)
    return scale,offset,height


def qmul(a,b):
    return (Rotation.from_quat(a)*Rotation.from_quat(b)).as_quat()

def qeuler(axis,angle):
    v=np.asarray(axis,float);v=v/np.linalg.norm(v);return Rotation.from_rotvec(v*angle).as_quat()

def bake_petal_flight():
    glb=GLB(MODELS/'petal_skitter_rig_v2.glb');scale,offset,_=petal_reference_transform(glb)
    names=glb.name_to_node
    wing_names=['Bone_023','Bone_025']
    upper=['Bone_018','Bone_021','Bone_013','Bone_010'];mid=['Bone_017','Bone_020','Bone_012','Bone_009'];lower=['Bone_016','Bone_019','Bone_011','Bone_008']
    duration=2*math.pi/46.0; count=16; frames=[]
    for fi,t in enumerate(np.linspace(0,duration,count,endpoint=False)):
        trs=[{k:v.copy() for k,v in p.items()} for p in glb.base_trs]
        flap_phase=.5+.5*math.sin(t*46.0)
        open_quats=[np.array([-0.103877,0.0,0.213066,0.971500]),np.array([-0.101523,0.0,-0.212036,0.971974])]
        for wi,nm in enumerate(wing_names):
            if nm not in names:continue
            node=names[nm]; flap=-.50+(0.58+.50)*flap_phase; delta=qmul(open_quats[wi],qeuler([1,0,0],flap));trs[node]['rotation']=qmul(glb.base_trs[node]['rotation'],delta)
        for i,nm in enumerate(upper):
            if nm not in names:continue
            front=i<2;side=-1.0 if i%2==0 else 1.0;root_pitch=-1.70 if front else 1.52;root_roll=side*(.42 if front else .28);root_yaw=side*(.18 if front else -.12)
            delta=qmul(qmul(qeuler([1,0,0],root_pitch),qeuler([0,0,1],root_roll)),qeuler([0,1,0],root_yaw));node=names[nm];trs[node]['rotation']=qmul(glb.base_trs[node]['rotation'],delta)
        for i,nm in enumerate(mid):
            if nm not in names:continue
            front=i<2;side=-1.0 if i%2==0 else 1.0;pitch=1.90 if front else -1.72;roll=side*(.22 if front else .14);delta=qmul(qeuler([1,0,0],pitch),qeuler([0,0,1],roll));node=names[nm];trs[node]['rotation']=qmul(glb.base_trs[node]['rotation'],delta)
        for i,nm in enumerate(lower):
            if nm not in names:continue
            front=i<2;side=-1.0 if i%2==0 else 1.0;pitch=1.42 if front else -1.18;roll=side*.10;delta=qmul(qeuler([1,0,0],pitch),qeuler([0,0,1],roll));node=names[nm];trs[node]['rotation']=qmul(glb.base_trs[node]['rotation'],delta)
        for nm,delta in [('Bone_015',qmul(qeuler([1,0,0],-.22),qeuler([0,1,0],math.sin(t*6)*.03))),('Bone_014',qeuler([1,0,0],-.34)),('Bone_004',qeuler([1,0,0],-.16))]:
            if nm in names:
                node=names[nm];trs[node]['rotation']=qmul(glb.base_trs[node]['rotation'],delta)
        p,n=glb.skin_pose(trs);frames.append(((p-offset)*scale,n))
    write_extra_clip(OUT/'petal-flight.bin',frames)
    meta_path=OUT/'petal.json';meta=json.loads(meta_path.read_text());meta['flight_clip']={'bin':'petal-flight.bin','frames':count,'duration':duration};meta_path.write_text(json.dumps(meta,separators=(',',':')))
    print('petal flight',meta['flight_clip'])


def add_crystal_elite():
    target=OUT/'crystal-elite.png';shutil.copyfile(TEXTURES/'crystal_elite_palette_v14.png',target)
    meta_path=OUT/'crystal.json';meta=json.loads(meta_path.read_text());meta['elite_texture']='crystal-elite.png';meta_path.write_text(json.dumps(meta,separators=(',',':')))
    print('crystal elite texture',target)

bake_boss();bake_petal_flight();add_crystal_elite()
