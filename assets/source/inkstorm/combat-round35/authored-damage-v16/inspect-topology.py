from pathlib import Path
import struct,json,hashlib,collections
ROOT=Path('/Users/amir/Projects/PodRacing')
SOURCE=ROOT/'public/assets/inkstorm/vehicles/teemto-hero-open-v2.glb'
b=SOURCE.read_bytes();jlen=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+jlen]);binb=b[28+jlen:]
def acc(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];fmt={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];size=struct.calcsize('<'+fmt*n);stride=v.get('byteStride',size);off=v.get('byteOffset',0)+a.get('byteOffset',0);return [struct.unpack_from('<'+fmt*n,binb,off+k*stride) for k in range(a['count'])]
report={'source':{'path':str(SOURCE),'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)},'scope':'External read-only GLB coordinate-welded component analysis; no source data changed. Game +Yup/+Zforward, all authored nodes identity. Welding rounded positions to five decimals only for topology diagnosis.','meshes':[]}
for node in g['nodes']:
 if node.get('name') not in ['teemto-cockpit-body','teemto-engine-left-body','teemto-engine-right-body']:continue
 p=g['meshes'][node['mesh']]['primitives'][0];v=acc(p['attributes']['POSITION']);ix=[x[0] for x in acc(p['indices'])];f=[ix[k:k+3] for k in range(0,len(ix),3)];parent=list(range(len(v)))
 def find(i):
  while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
  return i
 def union(a,b):
  a=find(a);b=find(b)
  if a!=b:parent[max(a,b)]=min(a,b)
 coincident={}
 for i,pos in enumerate(v):
  key=tuple(round(x,5) for x in pos)
  if key in coincident:union(i,coincident[key])
  else:coincident[key]=i
 for a,b,c in f:union(a,b);union(b,c)
 components=collections.defaultdict(list)
 for i,face in enumerate(f):components[find(face[0])].append(i)
 rows=[]
 for identity,polys in components.items():
  coords=[v[i] for pi in polys for i in f[pi]];low=[min(c[k] for c in coords) for k in range(3)];hi=[max(c[k] for c in coords) for k in range(3)]
  rows.append({'id':identity,'triangles':len(polys),'firstTriangle':min(polys),'lastTriangle':max(polys),'min':low,'max':hi,'polygonIndices':polys})
 rows.sort(key=lambda x:-x['triangles'])
 sections=[]
 for z in [0,1,2,4,5,6,7,8,9,10,11,12,13,14,15,16,18,20,22]:
  pts=[pos for pos in v if abs(pos[2]-z)<=.4]
  sections.append({'z':z,'verticesInSlab':len(pts),'min':[min(c[k] for c in pts) for k in range(3)] if pts else None,'max':[max(c[k] for c in pts) for k in range(3)] if pts else None})
 report['meshes'].append({'node':node['name'],'meshIndex':node['mesh'],'material':g['materials'][p['material']]['name'],'vertices':len(v),'triangles':len(f),'componentCount':len(rows),'components':rows,'zSections':sections})
OUTPUT=Path(__file__).parent/'source-topology.json';OUTPUT.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'source':report['source'],'meshes':[{**{k:m[k] for k in ['node','vertices','triangles','componentCount']},'largestComponents':[{k:v for k,v in c.items() if k!='polygonIndices'} for c in m['components'][:14]],'zSections':m['zSections']} for m in report['meshes']]},indent=2))
