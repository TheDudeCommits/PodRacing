"""Read-only GLB/camera analysis; creates private JSON evidence only."""
from pathlib import Path
import hashlib, json, math, struct
import numpy as np

ROOT = Path('/Users/amir/Projects/PodRacing')
OUT = Path(__file__).parent
asset = ROOT / 'public/assets/inkstorm/vehicles/blockrunner-hero-v1.glb'
b = asset.read_bytes()
length, kind = struct.unpack_from('<II', b, 12)
assert kind == 0x4e4f534a
d = json.loads(b[20:20+length]); offset = 20+length
blen, kind = struct.unpack_from('<II', b, offset); assert kind == 0x004e4942
binary = b[offset+8:offset+8+blen]

def accessor(index):
    a = d['accessors'][index]; v = d['bufferViews'][a['bufferView']]
    dtype = {5126:'<f4', 5125:'<u4', 5123:'<u2', 5121:'u1'}[a['componentType']]
    size = {'SCALAR':1, 'VEC2':2, 'VEC3':3, 'VEC4':4}[a['type']]
    start = v.get('byteOffset',0)+a.get('byteOffset',0)
    stride = v.get('byteStride',np.dtype(dtype).itemsize*size)
    return np.ndarray((a['count'],size),dtype=dtype,buffer=binary,offset=start,strides=(stride,np.dtype(dtype).itemsize)).copy()

parts = []
for node in d['nodes']:
    assert node.get('translation',[0,0,0]) == [0,0,0]
    assert node.get('rotation',[0,0,0,1]) == [0,0,0,1]
    assert node.get('scale',[1,1,1]) == [1,1,1]
    assert node.get('matrix',[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]) == [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
    if 'mesh' not in node: continue
    for p in d['meshes'][node['mesh']]['primitives']:
        assert p.get('mode',4)==4
        points=accessor(p['attributes']['POSITION']).astype(float)
        indices=accessor(p['indices']).reshape(-1).astype(int)
        used=np.unique(indices); vertices=points[used]
        parts.append({'name':d['materials'][p['material']]['name'],'vertices':vertices,'triangles':points[indices].reshape(-1,3,3)})
all_points=np.concatenate([p['vertices'] for p in parts]); body=parts[0]['triangles']
assert len(body)==39900
helmet=next(p for p in parts if 'helmet' in p['name'])['vertices']
suit=next(p for p in parts if 'suit' in p['name'])['vertices']
head=(helmet.min(0)+helmet.max(0))/2
shoulder=(suit.min(0)+suit.max(0))/2
shoulder[1]=suit.max(0)[1]-.15
targets={'helmetCenter':head,'helmetTop':np.array([head[0],helmet.max(0)[1]-.03,head[2]]),
         'upperSuitCenter':shoulder}

def smoothstep(v,lo,hi):
    t=max(0,min(1,(v-lo)/(hi-lo))); return t*t*(3-2*t)

def body_hits(eye,target):
    direction=target-eye; distance=float(np.linalg.norm(direction)); direction/=distance
    v0=body[:,0]; e1=body[:,1]-v0; e2=body[:,2]-v0
    h=np.cross(direction,e2); a=np.einsum('ij,ij->i',e1,h)
    safe=np.abs(a)>1e-10; inv=np.zeros_like(a); inv[safe]=1/a[safe]
    s=eye-v0; u=inv*np.einsum('ij,ij->i',s,h); q=np.cross(s,e1)
    v=inv*np.einsum('j,ij->i',direction,q); t=inv*np.einsum('ij,ij->i',e2,q)
    hit=safe&(u>=0)&(v>=0)&(u+v<=1)&(t>.001)&(t<distance-.001)
    return {'bodyTriangleHits':int(hit.sum()),'nearestDistance':float(t[hit].min()) if hit.any() else None}

def project(points,eye,aim,fov,aspect):
    forward=aim-eye; forward/=np.linalg.norm(forward)
    right=np.cross(forward,[0,1,0]); right/=np.linalg.norm(right); up=np.cross(right,forward)
    local=points-eye; depth=local@forward; vertical=(local@up)/(depth*math.tan(math.radians(fov)/2))
    horizontal=(local@right)/(depth*math.tan(math.radians(fov)/2)*aspect)
    return {'ndcMin':[float(horizontal.min()),float(vertical.min())], 'ndcMax':[float(horizontal.max()),float(vertical.max())],
            'visibleVertexFraction':float(((depth>.35)&(np.abs(horizontal)<=1)&(np.abs(vertical)<=1)).mean()),
            'heightFraction':float((vertical.max()-vertical.min())/2), 'nearestCameraDepth':float(depth.min())}

rows=[]
for speed in [0,113.8888888889,135.2777777778,230]:
    speed_t=smoothstep(speed,0,230); fov=62+smoothstep(speed,70,220)*6
    for label,boom,height,aim_height in [('current',18.66,11.9,5.8),('candidate',11.3,7.9,1.4)]:
        eye=np.array([.35,height+speed_t*.5,-boom-speed_t*.8])
        aim=np.array([0,aim_height,34+speed_t*18])
        rows.append({'rig':label,'speedMetresPerSecond':speed,'speedT':speed_t,'fov':fov,'eyeRelativeToSubject':eye.tolist(),'aimRelativeToSubject':aim.tolist(),
                     'cameraAboveStaticHighestVertex':float(eye[1]-all_points[:,1].max()),
                     'pilotHelmetProjection':project(helmet,eye,aim,fov,1.6),
                     'pilotSuitProjection':project(suit,eye,aim,fov,1.6),
                     'bodyProjection':project(all_points,eye,aim,fov,1.6),
                     'bodyOcclusionProbes':{name:body_hits(eye,point) for name,point in targets.items()}})

# Any rigid pitch/roll/yaw stays inside this source-origin sphere. The bound
# allows the current maximum landing compression, shake and junction orbit.
radius=float(np.linalg.norm(all_points,axis=1).max())
min_planar=11.3-.35 # triangle inequality includes side offset under junction yaw
min_vertical=7.9-.7
min_eye_radius=math.hypot(min_planar,min_vertical)-math.hypot(2.8*.12,2.8*.08)
near_corner=.35*math.sqrt(1+math.tan(math.radians(68)/2)**2*(1+1.6**2))
receipt={'scope':'Static CPU geometry/projection check only. No render, scene changes, browser or shader execution. Identity normalized V8 hero vertices actually read. Projection uses level rigid pose, no route/junction/landing/shake; independent conservative sphere bound covers any rigid orientation at bounded desired camera pose, not spring transients or external scenery.',
 'asset':{'path':str(asset.relative_to(ROOT)),'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)},
 'actualBounds':[all_points.min(0).tolist(),all_points.max(0).tolist()],
 'materials':[{'name':p['name'],'triangles':len(p['triangles']),'usedPositionBounds':[p['vertices'].min(0).tolist(),p['vertices'].max(0).tolist()]} for p in parts],
 'targets':{k:v.tolist() for k,v in targets.items()},'rows':rows,
 'conservativeRigidClearance':{'sourceOriginRadius':radius,'desiredEyeMinimumRadiusAfterSideLandingAndShake':min_eye_radius,'maximumNearPlaneCornerRadiusAt68DegreesAspect1_6':near_corner,'residualToSourceBoundingSphere':min_eye_radius-near_corner-radius,'assumptions':'Source and camera subject origins coincide; full rigid rotation; no unbounded replay positional offset; current junction boom rotation is planar. Descent only raises eye. This does not bound spring lag/overshoot or occlusion by other objects.'}}
(OUT/'camera-measurements-v1.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({'bounds':receipt['actualBounds'],'clearance':receipt['conservativeRigidClearance'],'rows':[{'rig':r['rig'],'speed':r['speedMetresPerSecond'],'helmet':r['pilotHelmetProjection'],'suit':r['pilotSuitProjection'],'occlusion':r['bodyOcclusionProbes']} for r in rows]},indent=2))
