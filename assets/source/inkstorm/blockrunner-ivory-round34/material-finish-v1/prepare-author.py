import pathlib,json,ast,hashlib
b=pathlib.Path(__file__).resolve().parent;old=b.parent/'paint-copy-v1'
read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def defs(p,names):
 s=p.read_text();return '\n\n'.join(ast.get_source_segment(s,n) for n in ast.parse(s).body if isinstance(n,ast.FunctionDef) and n.name in names)
a=read(old/'02-author-executed-receipt.json');prior=read(old/'operation-inputs.json');components=read(old/'source-components.json')
objects=[];eligible={'engineShell':0,'rearSlope':0,'originalShoulderSuit':0};role_indices={v:i for i,v in enumerate(a['roleNames'])}
for row in a['objectLineage']:
 if 'copiedMesh' not in row:continue
 r={k:row[k] for k in ['sourceObject','fitObject','geometrySignature','sourcePolygonSignature','roleSignature','roleSlots','roleHistogram']};r['paletteObject']=row['copiedObject'];name=row['sourceObject']
 if name and name.endswith('White7_0'):
  c=next(x for x in components if x['name']==name);allowed=set(sum([x['polygonIndices'] for x in c['components'] if x['firstPolygon'] in (1136,2256,2816)],[]))
  orig=next(x for x in prior['objects'] if x['sourceObject']==name);nonivory=set(sum(list(orig['overrides'].values()),[]));r['shellPolygons']=sorted(allowed-nonivory);eligible['engineShell']+=len(r['shellPolygons'])
 if name in ['pasted__L2x3slope2_pasted__Lego_White22_0','pasted__L2x3slope2_pasted__Lego_White24_0']:
  r['rearSlope']=True;eligible['rearSlope']+=row['roleHistogram'].get('ivory',0)
 if name=='pasted__L2x3slope2_lambert1_0':r['pilotContainer']=True;eligible['originalShoulderSuit']+=row['roleHistogram']['slate']
 objects.append(r)
target=b.parents[4]/'docs/inkstorm-overhaul/concepts/21-ivory-worn-paint-target.png'
# Pin actual repository root explicitly; private stage parents vary by nesting depth.
target=pathlib.Path('/Users/amir/Projects/PodRacing/docs/inkstorm-overhaul/concepts/21-ivory-worn-paint-target.png')
i={'reference':prior['reference'],'paletteScene':a['targetScene'],'paletteSignature':a['paintSignature'],'paletteNormals':a['paintRawCornerNormalSignatures'],
   'paletteReceiptSha256':sha(old/'02-author-executed-receipt.json'),'palettePrefix':prior['prefix'],'prefix':'Blockrunner Ivory finish V1 ',
   'targetScene':'PodRacing — Blockrunner Ivory material finish V1 e42fb924b344481ea013c58cb0f52ad7','targetImageSha256':sha(target),
   'sourceUid':a['sourceUid'],'sourceGlbSha256':a['sourceGlbSha256'],'roleNames':a['roleNames'],'roleHistogram':a['roleHistogram'],
   'objects':objects,'expectedEligibleFaces':eligible}
(b/'operation-inputs.json').write_text(json.dumps(i,indent=2)+'\n')
helper=(old/'guard-helpers.py').read_text()+'\nfrom mathutils import Vector\n'+defs(old/'02-author-body.py',('attribute_values','geometry_record','require_histories','srgb_channel','preserved_global','rollback_new_ids'))
helper=helper.replace("'ivorySourcePolygon','ivoryPaintRole')","'ivorySourcePolygon','ivoryPaintRole','ivoryFinishEdgeDistance','ivoryFinishRegion')")
(b/'guard-helpers.py').write_text(helper+'\n')
code=helper+'\nINPUT=json.loads('+repr(json.dumps(i,separators=(',',':')))+')\n'+(b/'finish-functions.py').read_text()+'\n'+(b/'author-body.py').read_text()
tree=ast.parse(code)
for n in ast.walk(tree):
 assert not isinstance(n,ast.Lambda)
 if isinstance(n,ast.Call) and isinstance(n.func,ast.Name):
  assert n.func.id not in ('open','exec','eval','globals','compile','__import__')
  if n.func.id in ('hasattr','getattr'):assert isinstance(n.args[1],ast.Constant) and isinstance(n.args[1].value,str)
 if isinstance(n,ast.Attribute):assert not n.attr.startswith('__')
assert len(code.encode())<200000
(b/'01-author-composed.py').write_text(code)
print(json.dumps({'payloadBytes':len(code.encode()),'sha256':sha(b/'01-author-composed.py'),'eligible':eligible,'inputBytes':len(json.dumps(i,separators=(',',':')).encode())}))
