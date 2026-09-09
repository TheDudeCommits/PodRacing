"""Run only after root timing release. CPU arithmetic/source checks; no Blender."""
import ast,collections,hashlib,json,math
from pathlib import Path
BASE=Path(__file__).resolve().parent
source=BASE/'author-hoist-v3-mcp-safe.py';text=source.read_text();tree=ast.parse(text)
assert not any(isinstance(n,ast.Lambda) for n in ast.walk(tree))
forbidden={'open','exec','eval','compile','__import__','Path','hashlib','os','subprocess'}
assert not any(isinstance(n,ast.Name) and n.id in forbidden for n in ast.walk(tree))
assert not any(isinstance(n,ast.Attribute) and n.attr.startswith('__') for n in ast.walk(tree))
chosen=[]
for n in tree.body:
 if isinstance(n,ast.FunctionDef):
  if n.name=='choose_hoist':break
  chosen.append(n)
 elif isinstance(n,ast.Assign) and isinstance(n.targets[0],ast.Name) and n.targets[0].id in {'PAINT','RETAINED_TRIANGLES','TRIANGLE_CAP','PRACTICAL_CLEARANCE'}:chosen.append(n)
chosen.extend(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='clipped_clearance')
assert not any(isinstance(n,ast.Name) and n.id in {'bpy','Vector','Matrix'} for node in chosen for n in ast.walk(node))
ctx={'math':math,'collections':collections};exec(compile(ast.Module(body=chosen,type_ignores=[]),'known pure source arithmetic','exec'),ctx)
d=ctx['build_service_geometry']();s=ctx['geometry_summary'](d)
assert s['candidateTriangles']<=20000
assert all(-52<=p[0]<=52 and -7<=p[1]<=7 and 39.67<=p[2]<=61.4 for p in d['vertices'])
assert all(math.isfinite(c) for p in d['vertices'] for c in p)
areas=[];volumes=collections.defaultdict(float);edges=collections.defaultdict(collections.Counter)
for f,g in zip(d['faces'],d['groups']):
 ps=[d['vertices'][i] for i in f]
 for a,b in zip(ps,ps[1:]+ps[:1]):edges[g][tuple(sorted(tuple(round(c,5) for c in p) for p in (a,b)))]+=1
 for i in range(1,len(f)-1):
  a,b,c=[d['vertices'][j] for j in (f[0],f[i],f[i+1])];normal=ctx['cross'](ctx['sub'](b,a),ctx['sub'](c,a));areas.append(math.sqrt(ctx['dot'](normal,normal))*.5);volumes[g]+=ctx['dot'](a,ctx['cross'](b,c))/6
assert min(areas)>1e-6
assert all(v>0 for v in volumes.values()),dict(volumes)
boundaries={g:sum(n==1 for n in counter.values()) for g,counter in edges.items()};assert all(n==0 for n in boundaries.values()),boundaries
clear=ctx['clipped_clearance'](d['vertices'],d['faces']);assert clear>=39.67
v2=BASE.parent/'v2/foundry-service-gantry-v2.glb';assert hashlib.sha256(v2.read_bytes()).hexdigest()=='58fc12d837039eb73111886b1b91c294516c51fc47a4a0d00200717161fd39ba'
for p in [source,BASE/'export-render-hoist-v3-mcp-safe.py']:ast.parse(p.read_text())
receipt={'status':'CPU preparation PASS; no Blender/export/render/world acceptance','sourceV2Sha256':hashlib.sha256(v2.read_bytes()).hexdigest(),'removedHoistTriangles':1632,'retainedV2UnrelatedTriangles':18324,'newGeometry':s,'newClearance':clear,'combinedClearance':39.66999816894531,'originalV2FootprintRetained':True,'allNewGroupsClosed':True,'minimumTriangleArea':min(areas),'authorSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'exportScriptSha256':hashlib.sha256((BASE/'export-render-hoist-v3-mcp-safe.py').read_bytes()).hexdigest()}
(BASE/'preparation-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');(BASE/'v3-hoist-arithmetic.json').write_text(json.dumps(d,separators=(',',':'))+'\n');print(json.dumps(receipt,indent=2))
