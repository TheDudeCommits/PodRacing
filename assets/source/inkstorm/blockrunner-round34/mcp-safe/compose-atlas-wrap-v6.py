"""External composition only. Creates the immutable V6 author payload; never calls Blender."""
import ast
import hashlib
import json
from pathlib import Path

B=Path(__file__).resolve().parent
OUT=B/'14-author-clamp-v6-composed-payload.py'
assert not OUT.exists(), 'Immutable payload already exists.'
def load(name): return json.loads((B/name).read_text())
def take(d,keys): return {k:d[k] for k in keys.split()}
audit=load('audit-receipt.json'); fit=load('control-fit-v1-receipt.json'); state=load('atlas-finalize-v5-receipt.json')
values={
 'BLOCKRUNNER_AUDIT':take(audit,'sourceSignature'),
 'BLOCKRUNNER_FIT':take(fit,'targetScene fitSignature fitCornerNormalSignature'),
 'BLOCKRUNNER_PAINT_STATE':take(state,'targetScene sourceUid meshObjects triangles bodyMeshName pilotMeshName paintSignature paintCornerNormalSignature paintAttributeSignatures linkedPaintImages materialSlots objectLineage ownerCopies normalEncodingBudgetInherited paintBounds')}
prefix_names=['00-source-reference.py','01-source-guard.py','13-v4-attribute-signatures.py','14-atlas-wrap-guards.py']
parts=[(B/name).read_text() for name in prefix_names]
parts += [name+' = json.loads('+repr(json.dumps(v,separators=(',',':'),allow_nan=False))+')' for name,v in values.items()]
parts += [(B/'14-copy-clamp-atlas-v6.py').read_text()]
payload='\n'.join(parts)+'\n'
tree=ast.parse(payload)
for node in ast.walk(tree):
 assert not isinstance(node,ast.Lambda)
 if isinstance(node,(ast.Import,ast.ImportFrom)):
  names=([a.name for a in node.names] if isinstance(node,ast.Import) else [node.module])
  assert all(n in ['bpy','collections','json','math','mathutils'] for n in names),names
 if isinstance(node,ast.Call) and isinstance(node.func,ast.Name):
  assert node.func.id not in {'open','exec','eval','compile','globals','locals','vars','getattr','setattr','delattr','input','breakpoint'}
 if isinstance(node,ast.Attribute): assert not node.attr.startswith('__')
assert len(payload.encode())<200000
with OUT.open('x') as handle: handle.write(payload)
refs=prefix_names+['14-copy-clamp-atlas-v6.py','audit-receipt.json','control-fit-v1-receipt.json','atlas-finalize-v5-receipt.json']
records=[]
for name in refs:
 raw=(B/name).read_bytes();records.append({'path':str(B/name),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
for identity in state['linkedPaintImages'].values():
 path=Path(identity['filepath']);raw=path.read_bytes();records.append({'path':str(path),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
record={'scope':'Prepared external composition, not Blender execution. Ten extension changes only. All original versions retained.','payload':str(OUT),'payloadBytes':len(payload.encode()),'payloadSha256':hashlib.sha256(payload.encode()).hexdigest(),'astPolicyCheck':'passed: no lambda, blocked builtins, dunder, filesystem/runtime imports','inputs':records,'expectedPreexistingScenes':150,'expectedNewSceneCount':151}
(B/'14-clamp-v6-preparation-inventory.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({k:v for k,v in record.items() if k!='inputs'},indent=2))
