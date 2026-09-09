from pathlib import Path
import json,struct,hashlib
import numpy as np
root=Path('/Users/amir/Projects/PodRacing');out=Path(__file__).resolve().parent
sources=[root/'public/assets/inkstorm/vehicles/teemto-hero-open-v2.glb',root/'assets/source/inkstorm/combat-round35/authored-damage-v16/packaged-b/teemto-damage-hero-v16.glb']
def read(path):
 data=path.read_bytes();length=struct.unpack_from('<I',data,12)[0];j=json.loads(data[20:20+length]);b=data[28+length:]
 def accessor(i):
  a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];c={'SCALAR':1,'VEC3':3,'VEC2':2,'VEC4':4}[a['type']];dt=np.dtype(dtype);offset=v.get('byteOffset',0)+a.get('byteOffset',0);return np.ndarray((a['count'],c),dtype=dt,buffer=b,offset=offset,strides=(v.get('byteStride',dt.itemsize*c),dt.itemsize)).copy()
 def matrix(n):
  if 'matrix'in n:return np.array(n['matrix']).reshape(4,4).T
  x,y,z,w=n.get('rotation',[0,0,0,1]);m=np.eye(4);m[:3,:3]=np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w],[2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w],[2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y]])@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);return m
 result=[]
 def visit(i,parent):
  n=j['nodes'][i];m=parent@matrix(n)
  if 'mesh'in n:
   for p in j['meshes'][n['mesh']]['primitives']:
    a=accessor(p['attributes']['POSITION']).astype(float);a=a@m[:3,:3].T+m[:3,3];idx=accessor(p['indices']).reshape(-1).astype(int) if 'indices'in p else np.arange(len(a));result.append((n.get('name',''),a,idx.reshape(-1,3)))
  for child in n.get('children',[]):visit(child,m)
 for i in j['scenes'][j.get('scene',0)]['nodes']:visit(i,np.eye(4))
 return result
results=[]
for source in sources:
 for name,v,f in read(source):
  if name not in ['teemto-engine-left-body','teemto-damage-right-front-v16','teemto-damage-right-rear-v16']:continue
  tri=v[f];area=np.linalg.norm(np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]),axis=1)*.5;cen=tri.mean(axis=1);rows=[]
  for degrees in range(0,360,15):
   angle=degrees*np.pi/180;q=np.array([[np.cos(angle),-np.sin(angle),0],[np.sin(angle),np.cos(angle),0],[0,0,1]]);vv=v@q.T;cc=cen@q.T;floor=vv[:,1].min();gaps=cc[:,1]-floor;order=np.argsort(gaps);cdf=np.cumsum(area[order])/area.sum();weighted=lambda p:float(gaps[order[np.searchsorted(cdf,p)]]);near=vv[vv[:,1]-floor<.3]
   rows.append({'rollDegrees':degrees,'height':float(np.ptp(vv[:,1])),'areaWeightedMeanHeight':float(np.average(gaps,weights=area)),'areaWeightedGapP10':weighted(.1),'surfaceAreaFractionBelowHalfMetre':float(area[gaps<.5].sum()/area.sum()),'supportBandXSpan':float(np.ptp(near[:,0])) if len(near)>0 else 0,'supportBandZSpan':float(np.ptp(near[:,2])) if len(near)>0 else 0})
  results.append({'source':str(source.relative_to(root)),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'name':name,'vertices':len(v),'triangles':len(f),'bounds':[v.min(axis=0).tolist(),v.max(axis=0).tolist()],'rows':rows})
(out/'shape-support.json').write_text(json.dumps({'scope':'External read-only exact source geometry; flat-plane roll comparison, triangle-area-weighted surface heights, not mass center or visual proof','parts':results},indent=2)+'\n')
for p in results:
 print(p['name'],p['bounds']);print('best mean',sorted(p['rows'],key=lambda x:x['areaWeightedMeanHeight'])[:3]);print('current',next(x for x in p['rows'] if x['rollDegrees']==(270 if 'left' in p['name'] else 75 if 'front' in p['name'] else 90)))
