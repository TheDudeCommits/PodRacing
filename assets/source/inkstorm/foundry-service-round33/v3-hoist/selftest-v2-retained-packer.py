"""Bounded in-memory checks of the V3 adapter; no Blender or artifact export."""
from pathlib import Path
import importlib.util,json,struct,time,hashlib
B=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('pack',B/'preserve-v2-retained-gltf.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
src=m.SOURCE.read_bytes();path=B/'foundry-service-gantry-v3-native.glb';native=path.read_bytes();start=time.monotonic();tests=[]
_,check=m.analyze(src,native);assert not check['nativeRetainedAttributesExact'];tests.append('actual native drift detected without output')
packed,proof=m.analyze(src,native,repair=True);_,after=m.analyze(src,packed);assert after['nativeRetainedAttributesExact'];assert proof['final']['additionAttributesAndWindingPreserved'];tests.append('in-memory repair restores18324V2triangles and keeps1548new triangles exact')
doc,binary=m.read_glb(native);prim=doc['meshes'][0]['primitives'][0];access=doc['accessors'][prim['indices']];view=doc['bufferViews'][access['bufferView']];offset=view.get('byteOffset',0)+access.get('byteOffset',0);assert access['componentType']==5123
for label,tri in [('reversed retained triangle',(0,2,1)),('duplicate retained triangle',(0,1,2))]:
 buff=bytearray(binary);v=struct.unpack_from('<3H',buff,offset);dest=offset if label.startswith('reversed') else offset+(access['count']-3)*2;struct.pack_into('<3H',buff,dest,*(v[i] for i in tri))
 try:m.analyze(src,m.make_glb(doc,bytes(buff)))
 except ValueError:tests.append('reject '+label)
 else:raise AssertionError(label)
# Lower an addition vertex below the invariant road clearance.
model=m.decode(native);additions,_=m.classify(m.decode(src),model);vid=model['triangles'][additions[0]][0];pa=doc['accessors'][prim['attributes']['POSITION']];pv=doc['bufferViews'][pa['bufferView']];pos=pv.get('byteOffset',0)+pa.get('byteOffset',0)+vid*pv.get('byteStride',12);buff=bytearray(binary);struct.pack_into('<f',buff,pos+4,39.0)
try:m.analyze(src,m.make_glb(doc,bytes(buff)))
except ValueError:tests.append('reject lower added hoist geometry')
else:raise AssertionError('lower added hoist geometry')
assert m.SOURCE.read_bytes()==src and path.read_bytes()==native;tests.append('both original inputs byte exact')
r={'status':'PASS','scope':'Actual native used only as read-only in-memory fixture; no GLB output or Blender calls','tests':tests,'durationSeconds':round(time.monotonic()-start,3),'packerSha256':hashlib.sha256((B/'preserve-v2-retained-gltf.py').read_bytes()).hexdigest()};(B/'selftest-v2-retained-packer-receipt.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r,indent=2))
