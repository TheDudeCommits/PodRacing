from pathlib import Path
import json,struct,hashlib,math
ROOT=Path(__file__).resolve().parents[4]
OUT=Path(__file__).resolve().parent

def arrays(path):
 b=path.read_bytes();size=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+size]);binary=28+size
 def accessor(i):
  a=d['accessors'][i];v=d['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];fmt,w,mx={5126:('f',4,1),5123:('H',2,65535),5121:('B',1,255),5125:('I',4,4294967295)}[a['componentType']];stride=v.get('byteStride',n*w);off=binary+v.get('byteOffset',0)+a.get('byteOffset',0);den=mx if a.get('normalized') else 1
  return [tuple(x/den for x in struct.unpack_from('<'+fmt*n,b,off+j*stride)) for j in range(a['count'])]
 primitive=d['meshes'][0]['primitives'][0];return d,b,{k:accessor(v) for k,v in primitive['attributes'].items()}
res=[]
for family in ['pipe-bank-detail-v1','foundry-service-gantry-v3']:
 p=ROOT/'public/assets/inkstorm'/f'{family}.glb';d,b,a=arrays(p);bright=[]
 for i,(r,g,blue,*_) in enumerate(a['COLOR_0']):
  if g>=.50 and blue>=.45 and g>=3*r and blue>=3*r:bright.append(i)
 points={tuple(round(v,4) for v in a['POSITION'][i]) for i in bright};groups=[]
 while points:
  group=[points.pop()];j=0
  while j<len(group):
   near={q for q in points if sum((x-y)**2 for x,y in zip(q,group[j]))<=4.01}
   group.extend(near);points-=near;j+=1
  groups.append(group)
 rows=[]
 for group in groups:
  lo=[min(q[k] for q in group) for k in range(3)];hi=[max(q[k] for q in group) for k in range(3)];center=[(x+y)/2 for x,y in zip(lo,hi)]
  normals=[a['NORMAL'][i] for i in bright if tuple(round(v,4) for v in a['POSITION'][i]) in group]
  rows.append({'bounds':[lo,hi],'center':center,'uniqueBrightPositions':len(group),'brightRecords':len(normals),'averageNormal':[sum(n[k] for n in normals)/len(normals) for k in range(3)]})
 res.append({'family':family,'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'nodeNames':[n.get('name') for n in d['nodes']],'brightCyanRecords':len(bright),'clusters':sorted(rows,key=lambda x:x['center']),'scope':'Exact source-local COLOR_0 threshold used by runtime; clusters connect points within2m only, not a visual acceptance/physical-light measurement.'})
(OUT/'lamps-evidence.json').write_text(json.dumps(res,indent=2)+'\n');print(json.dumps(res,indent=2))
