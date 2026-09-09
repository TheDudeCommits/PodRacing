"""Source-only CPU classification against preserved V2 author faces. No Blender."""
import ast,collections,hashlib,importlib.util,itertools,json,math
from pathlib import Path
BASE=Path(__file__).resolve().parent
V2=BASE.parent/'v2'
spec=importlib.util.spec_from_file_location('glb',V2/'preserve-retained-gltf.py');glb=importlib.util.module_from_spec(spec);spec.loader.exec_module(glb)
raw=(V2/'foundry-service-gantry-v2.glb').read_bytes();assert glb.sha(raw)=='58fc12d837039eb73111886b1b91c294516c51fc47a4a0d00200717161fd39ba'
model=glb.decode(raw);tree=ast.parse((V2/'author-service-gantry-mcp-safe.py').read_text());nodes=[]
for n in tree.body:
 if isinstance(n,ast.FunctionDef):
  if n.name=='positional_components':break
  nodes.append(n)
 elif isinstance(n,ast.Assign) and isinstance(n.targets[0],ast.Name) and n.targets[0].id in {'PAINT','RETAINED_TRIANGLES','TRIANGLE_CAP','PRACTICAL_CLEARANCE'}:nodes.append(n)
ctx={'math':math,'collections':collections};exec(compile(ast.Module(body=nodes,type_ignores=[]),'known V2 pure arithmetic','exec'),ctx);data=ctx['build_service_geometry']()
GROUPS={'hoist_track','hoist_mounts','hoist_wheels','hoist_axles','hoist_cheeks','hoist_cradle','hoist_drum','hoist_motor','drum_cable_wrap','motor_fins','service_cable','lower_pulley','service_hook'}
faces={i:[data['vertices'][j] for j in f] for i,(f,g) in enumerate(zip(data['faces'],data['groups'])) if g in GROUPS}
bins=collections.defaultdict(set)
def key(p):return tuple(round(v*10000) for v in p)
for i,ps in faces.items():
 for p in ps:bins[key(p)].add(i)
def possible(p):
 k=key(p);out=set()
 for shift in itertools.product((-1,0,1),repeat=3):out.update(bins.get(tuple(a+b for a,b in zip(k,shift)),()))
 return {i for i in out if any(max(abs(a-b) for a,b in zip(p,q))<2e-5 for q in faces[i])}
labels=[];records=[];counts=collections.Counter()
for index,tr in enumerate(model['triangles']):
 ps=[model['attributes']['POSITION'][i] for i in tr];bl=[(x,-z,y) for x,y,z in ps]
 possible_faces=None
 for p in bl:
  pfaces=possible(p);possible_faces=pfaces if possible_faces is None else possible_faces&pfaces
  if not possible_faces:break
 groups={data['groups'][i] for i in possible_faces};assert len(groups)<=1,(index,groups)
 group=next(iter(groups)) if groups else ('original_retained' if index<3940 else 'v2_unrelated')
 labels.append(group)
 if groups:
  records.append({'index':index,'group':group,'positionsBlender':bl});counts[group]+=1
expected=collections.Counter()
for f,g in zip(data['faces'],data['groups']):
 if g in GROUPS:expected[g]+=len(f)-2
assert counts==expected,(counts,expected)
receipt={'sourceSha256':glb.sha(raw),'sourceTriangles':19956,'hoistTriangles':len(records),'unrelatedRetainedTriangles':19956-len(records),'groups':dict(counts),'classification':'All triangle vertices match corners of one original V2 authored face within2e-5, with expected group counts. No face/position welding.','triangles':records,'triangleLabels':labels}
(BASE/'v2-hoist-triangle-contract.json').write_text(json.dumps(receipt,separators=(',',':'))+'\n')
print(json.dumps({k:receipt[k] for k in ['sourceSha256','sourceTriangles','hoistTriangles','unrelatedRetainedTriangles','groups']},indent=2))
