"""Repair only degenerate UV tangent frames; preserve valid authored frames and all topology."""
import json,struct,math,hashlib,sys
from pathlib import Path
root=Path(__file__).resolve().parents[2]
for receipt in (root/'assets/source/inkstorm/roster-round46').glob('*.json'):
 if sys.argv[1:] and receipt.stem not in sys.argv[1:]:continue
 r=json.loads(receipt.read_text())
 for variant in r['variants'].values():
  path=root/variant['path'];data=bytearray(path.read_bytes());size=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+size]);base=28+size;repaired=0
  for mesh in doc['meshes']:
   for prim in mesh['primitives']:
    attrs=prim['attributes']
    if 'TANGENT' not in attrs:continue
    tangent=doc['accessors'][attrs['TANGENT']];normal=doc['accessors'][attrs['NORMAL']]
    def address(acc,i,width):
     view=doc['bufferViews'][acc['bufferView']];assert acc['componentType']==5126
     return base+view.get('byteOffset',0)+acc.get('byteOffset',0)+i*view.get('byteStride',width*4)
    for i in range(tangent['count']):
     offset=address(tangent,i,4);t=struct.unpack_from('<4f',data,offset);length=math.sqrt(sum(v*v for v in t[:3]))
     if length>1e-8 and math.isfinite(length) and t[3] in [-1,1]:continue
     n=struct.unpack_from('<3f',data,address(normal,i,3));axis=min(range(3),key=lambda k:abs(n[k]));a=[0,0,0];a[axis]=1
     v=[n[1]*a[2]-n[2]*a[1],n[2]*a[0]-n[0]*a[2],n[0]*a[1]-n[1]*a[0]];length=math.sqrt(sum(x*x for x in v));assert length>1e-8
     struct.pack_into('<4f',data,offset,*[x/length for x in v],1);repaired+=1
  path.write_bytes(data);variant.update(sha256=hashlib.sha256(data).hexdigest(),degenerateTangentFramesRepaired=repaired)
 receipt.write_text(json.dumps(r,indent=2)+'\n');print(r['id'],{k:v['degenerateTangentFramesRepaired'] for k,v in r['variants'].items()})
