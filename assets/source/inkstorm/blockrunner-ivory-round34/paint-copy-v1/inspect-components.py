import json,struct,pathlib,collections
BASE=pathlib.Path(__file__).resolve().parent;REPO=BASE.parents[4]
p=REPO/'assets/source/inkstorm/vehicles/e42fb924b344481ea013c58cb0f52ad7/source-imported.glb';b=p.read_bytes();jslen=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+jslen]);binary=b[28+jslen:];audit=json.loads((BASE.parent/'audit-executed-v2-receipt.json').read_text());refs={r['name']:r for r in audit['namedMeshReferences']}
def acc(index):
 a=j['accessors'][index];v=j['bufferViews'][a['bufferView']];n={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']];fmt={5126:'f',5125:'I',5123:'H'}[a['componentType']];size=struct.calcsize(fmt)*n;stride=v.get('byteStride',size);off=v.get('byteOffset',0)+a.get('byteOffset',0)
 return [struct.unpack_from('<'+fmt*n,binary,off+i*stride) for i in range(a['count'])]
allrows=[];faces={}
for mesh in j['meshes']:
 name=mesh['name'];p=mesh['primitives'][0];positions=acc(p['attributes']['POSITION']);indices=[i[0] for i in acc(p['indices'])];m=refs[name]['matrixWorld'];pos=[]
 for x,y,z in positions:
  v=[x,-z,y,1];pos.append(tuple(sum(m[i][k]*v[k] for k in range(4)) for i in range(3)))
 tris=[indices[i:i+3] for i in range(0,len(indices),3)];faces[name]={'positions':pos,'triangles':tris}
 parent=list(range(len(pos)));weld={}
 def find(a):
  while parent[a]!=a:parent[a]=parent[parent[a]];a=parent[a]
  return a
 def union(a,b):
  a=find(a);b=find(b)
  if a!=b:parent[b]=a
 for i,v in enumerate(pos):
  key=tuple(round(x,6) for x in v)
  if key in weld:union(i,weld[key])
  else:weld[key]=i
 for a,b,c in tris:union(a,b);union(a,c)
 groups=collections.defaultdict(list)
 for i,t in enumerate(tris):groups[find(t[0])].append(i)
 components=[]
 for ids in groups.values():
  coords=[pos[v] for id in ids for v in tris[id]];bounds=[[min(p[k] for p in coords) for k in range(3)],[max(p[k] for p in coords) for k in range(3)]]
  components.append({'triangles':len(ids),'firstPolygon':min(ids),'lastPolygon':max(ids),'polygonIndices':ids,'bounds':bounds,'center':[(bounds[0][k]+bounds[1][k])/2 for k in range(3)]})
 components.sort(key=lambda c:c['firstPolygon']);allrows.append({'name':name,'triangles':len(tris),'components':components,'bounds':refs[name]['bounds']})
(BASE/'source-components.json').write_text(json.dumps(allrows,indent=2)+'\n');(BASE/'source-positions.json').write_text(json.dumps(faces,separators=(',',':')))
for r in allrows:
 if 'White7_0' in r['name']:
  print(r['name']);print(json.dumps([{k:v for k,v in c.items() if k!='polygonIndices'} for c in r['components']],indent=1))
 else:print(r['name'].replace('pasted__L2x3slope2_',''),r['triangles'],'components',len(r['components']),'bounds',[[round(v,3) for v in p] for p in r['bounds']])
