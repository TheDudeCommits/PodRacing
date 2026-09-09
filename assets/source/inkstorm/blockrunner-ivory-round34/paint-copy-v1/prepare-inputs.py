import json,pathlib,hashlib,ast,collections
b=pathlib.Path(__file__).resolve().parent;src=b.parent
read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
fit=read(src/'control-fit-preparation-v1/01-control-fit-executed-receipt.json');reconcile=read(src/'control-fit-review-v1/01-reconcile-executed-receipt.json');cleanup=read(src/'cleanup-preparation-v1/operation-inputs.json');comps=read(b/'source-components.json');positions=read(b/'source-positions.json');audit=read(src/'audit-executed-v2-receipt.json');refs={r['name']:r for r in audit['namedMeshReferences']};cl={r['sourceObject']:r for r in cleanup['meshes']}
roles={'ivory':{'hex':'DED5BC','roughness':.59,'metallic':.08},'navy':{'hex':'203442','roughness':.66,'metallic':.12},'petrol':{'hex':'34545A','roughness':.57,'metallic':.28},'orange':{'hex':'B96634','roughness':.56,'metallic':.08},'titanium':{'hex':'7F8990','roughness':.34,'metallic':.6},'slate':{'hex':'697780','roughness':.73,'metallic':0},'amber':{'hex':'62472F','roughness':.20,'metallic':.28},'tan':{'hex':'B79A6E','roughness':.65,'metallic':0},'intake':{'hex':'253037','roughness':.46,'metallic':.48}}
fitnames={r['sourceObject']:r['copiedObject'] for r in fit['coreAudit']['objectLineage']};out=[];authority=[]
for c in comps:
 name=c['name'];n=refs[name]['polygons'];default='navy';overrides={};basis='Whole existing source part; source bounds/connected components and individually viewed neutral fullcraft.';lo,hi=c['bounds']
 if name.endswith('White7_0'):
  default='ivory';basis='Own 34 coordinate-welded analysis components; no weld applied to source or copy. Exact original polygon streams are guarded through executed fit references.'
  masks=collections.defaultdict(list)
  for component in c['components']:
   first=component['firstPolygon'];ntri=component['triangles']
   if first in (0,80,1456):masks['titanium']+=component['polygonIndices']
   elif ntri==8:masks['intake']+=component['polygonIndices']
  masks['intake']+=list(range(1336,1416))+list(range(2416,2456))+list(range(2496,2536))+list(range(2576,2616))+list(range(2696,2776))+list(range(2816,2856))
  masks['orange']+=list(range(1256,1296))
  masks['petrol']+=list(range(2456,2496))+list(range(2536,2576))+list(range(2656,2696))
  overrides={k:sorted(set(v)) for k,v in masks.items()}
  authority.append({'object':name,'engineComponents':len(c['components']),'hubNoseAndShaftFaces':len(overrides['titanium']),'fanBlades':80,'innerIntakeAndThroatFaces':len(overrides['intake'])-80,'orangeFrontChamferFaces':40,'rearRimMetalFaces':120,'basis':'Existing contiguous 40-face rings plus 10 existing 8-triangle fan components. No generated surface, texture or per-face random assignment.'})
 elif name.endswith(('White25_0','White26_0','White8_0','LegoWhite1_0')):default='ivory'
 elif name=='pasted__L2x3slope2_lambert1_0':
  default='ivory';n=4828;basis='Own executed cleanup retained order. 700 body faces stay ivory; four exact own pilot semantic masks remain in this common container.'
  p=cleanup['pilotSemanticLineage'];overrides={role:p['sourceRoles'][key]['proposedCleanedPolygonIndices'] for key,role in [('suit','slate'),('helmet','titanium'),('visor','amber'),('gloves','tan')]}
 elif name in ('pasted__L2x3slope2_pasted__Lego_White15_0','pasted__L2x3slope2_pasted__Lego_White22_0','pasted__L2x3slope2_pasted__Lego_White24_0'):default='ivory'
 elif name.endswith('LegoWhite4_0') or name.endswith('White18_0') or name in ('pasted__L2x3slope2_pasted__Lego_White16_0','pasted__L2x3slope2_pasted__Lego_White20_0','pasted__L2x3slope2_pasted__Lego_White23_0','pasted__L2x3slope2_pasted__Lego_White19_0','pasted__L2x3slope2_pasted__pasted__Lego_White20_0'):default='petrol'
 ids=[default]*n
 for role,indices in overrides.items():
  for i in indices:assert ids[i]==default,(name,i);ids[i]=role
 keep=cl[name]['sourcePolygonsKeptInProposedCopiedOrder'];assert keep is None or len(keep)==n
 out.append({'sourceObject':name,'fitObject':fitnames[name],'polygons':n,'defaultRole':default,'overrides':overrides,'histogram':dict(collections.Counter(ids)),'sourcePolygonIndices':keep if n==4828 else None,'basis':basis})
for mount in ('negativeX','positiveX'):
 name='Blockrunner Ivory fitted V1 '+mount+' source profile mount';out.append({'sourceObject':None,'fitObject':name,'polygons':236,'defaultRole':'petrol','overrides':{},'histogram':{'petrol':236},'sourcePolygonIndices':None,'basis':'Actual fitted-v1 authored mount from own source rod profile; fit polygon index is lineage, no fabricated original GLB polygon.'})
assert len(out)==53 and sum(r['polygons'] for r in out)==44028
inputs={'stage':'Ivory source-only palette copy V1','sourceUid':'e42fb924b344481ea013c58cb0f52ad7','sourceGlbSha256':'2ed231e15b8bbab3f7b7028b73e8b6b442d532c9bc4d1fc0a2f5c40aeda49576','fitReceiptSha256':sha(src/'control-fit-preparation-v1/01-control-fit-executed-receipt.json'),'reference':reconcile['allFourSceneSignatures'],'fitScene':fit['targetScene'],'targetScene':'PodRacing — Blockrunner Ivory palette copy V1 e42fb924b344481ea013c58cb0f52ad7','prefix':'Blockrunner Ivory paint V1 ','roles':roles,'objects':out,'engineMaskAuthority':authority}
# Correct pinned original SHA from the approved role plan, not a typed approximation.
inputs['sourceGlbSha256']=read(src/'paint-role-plan-v1/ROLE_REFERENCES.json')['sourceSha256']
(b/'operation-inputs.json').write_text(json.dumps(inputs,indent=2)+'\n')
payload=(src/'control-fit-review-v1/01-reconcile-executed-payload.py').read_text();tree=ast.parse(payload);helpers='\n\n'.join(ast.get_source_segment(payload,n) for n in tree.body if isinstance(n,ast.FunctionDef) and n.end_lineno<=209)
(b/'guard-helpers.py').write_text('import bpy, json, math\n\n'+helpers+'\n')
print('53 assignments, 44028 polygons;',dict(sum((collections.Counter(r['histogram']) for r in out),collections.Counter())));print('input compact bytes',len(json.dumps(inputs,separators=(',',':')).encode()))
