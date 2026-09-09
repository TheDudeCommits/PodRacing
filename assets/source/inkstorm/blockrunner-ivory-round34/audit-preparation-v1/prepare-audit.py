"""External CPU preparer only. Never import or execute the generated bpy payload."""
import ast
import hashlib
import json
import math
import struct
from pathlib import Path

BASE = Path('/Users/amir/Projects/PodRacing/assets/source/inkstorm')
OUT = BASE / 'blockrunner-ivory-round34/audit-preparation-v1'
INPUT = BASE / 'blockrunner-ivory-round34/preparation-v1/operation-inputs.json'
EXPECTED_SHA = '2ed231e15b8bbab3f7b7028b73e8b6f442d532c9bc4d1fc0a2f5c40aeda49576'

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def fnv(value):
    state = 14695981039346656037
    for c in json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False, ensure_ascii=True):
        state = ((state ^ ord(c)) * 1099511628211) & 18446744073709551615
    return format(state, '016x')

def canonical(values):
    return [float(round(float(x), 6)) if round(float(x), 6) != 0 else 0.0 for x in values]

def mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]

def node_matrix(node):
    if 'matrix' in node:
        return [[node['matrix'][c * 4 + r] for c in range(4)] for r in range(4)]
    x,y,z,w=node.get('rotation',[0,0,0,1]); length=math.sqrt(x*x+y*y+z*z+w*w)
    x,y,z,w=x/length,y/length,z/length,w/length
    scale=node.get('scale',[1,1,1]); t=node.get('translation',[0,0,0])
    r=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],
       [2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],
       [2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]
    return [[r[i][j]*scale[j] for j in range(3)]+[t[i]] for i in range(3)]+[[0,0,0,1]]

def bounds(points):
    return [[min(p[k] for p in points) for k in range(3)], [max(p[k] for p in points) for k in range(3)]]

inputs = json.loads(INPUT.read_text())
raw = Path(inputs['sourceGlb']).read_bytes()
assert sha(raw) == EXPECTED_SHA == inputs['sourceSha256']
assert len(raw) == 2868492 == inputs['sourceBytes']
assert struct.unpack_from('<4sII', raw) == (b'glTF', 2, len(raw))
jn, kind = struct.unpack_from('<II', raw, 12)
assert kind == 0x4e4f534a
bn, kind = struct.unpack_from('<II', raw, 20 + jn)
assert kind == 0x004e4942 and 28 + jn + bn == len(raw)
doc = json.loads(raw[20:20+jn]); binary = raw[28+jn:]
assert not doc.get('images') and not doc.get('textures') and not doc.get('skins') and not doc.get('animations')
assert len(doc['nodes']) == 55 and len(doc['meshes']) == 51 and len(doc['materials']) == 51

def accessor(index):
    a = doc['accessors'][index]; v = doc['bufferViews'][a['bufferView']]
    assert not a.get('sparse') and v.get('buffer',0) == 0
    width = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
    code = {5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']]
    fmt = '<'+code*width; size = struct.calcsize(fmt)
    start=v.get('byteOffset',0)+a.get('byteOffset',0); stride=v.get('byteStride',size)
    assert start+(a['count']-1)*stride+size <= len(binary)
    return [struct.unpack_from(fmt,binary,start+i*stride) for i in range(a['count'])]

parent = {}
for i,n in enumerate(doc['nodes']):
    for c in n.get('children',[]):
        assert c not in parent
        parent[c]=i
hierarchy=sorted((n['name'],doc['nodes'][parent[i]]['name'] if i in parent else None,'MESH' if 'mesh' in n else 'EMPTY') for i,n in enumerate(doc['nodes']))
assert sorted(n['name'] for n in doc['nodes']) == sorted(inputs['exactCreatedObjectNames'])
original_rows={row['name']:row for row in inputs['sourceMeshReferences']}
worlds={}
def world(i):
    if i not in worlds:
        local=node_matrix(doc['nodes'][i])
        worlds[i]=mul(world(parent[i]),local) if i in parent else local
    return worlds[i]
references=[]
first_global=0
for node_index,node in enumerate(doc['nodes']):
    if 'mesh' not in node: continue
    mesh=doc['meshes'][node['mesh']]
    assert len(mesh['primitives']) == 1
    primitive=mesh['primitives'][0]
    assert primitive.get('mode',4)==4
    p=accessor(primitive['attributes']['POSITION']); n=accessor(primitive['attributes']['NORMAL'])
    uv=accessor(primitive['attributes']['TEXCOORD_0']) if 'TEXCOORD_0' in primitive['attributes'] else None
    ix=[x[0] for x in accessor(primitive['indices'])]
    assert len(ix)%3==0
    # Export/import coordinate basis only, never Colour's translation or data.
    local_positions=[canonical((v[0],-v[2],v[1])) for v in p]
    local_normals=[canonical((v[0],-v[2],v[1])) for v in n]
    local_uvs=[canonical((v[0],1-v[1])) for v in uv] if uv is not None else None
    wp=[]; m=world(node_index)
    for point in p:
        value=[sum(m[k][j]*point[j] for j in range(3))+m[k][3] for k in range(3)]
        wp.append([value[0],-value[2],value[1]])
    material=doc['materials'][primitive['material']]['name']
    triangles=len(ix)//3
    prev=original_rows[node['name']]
    assert triangles==prev['triangles'] and first_global==prev['firstGlobalTriangle']
    assert prev['primitives'][0]['material']==material
    references.append({'name':node['name'],'nodeIndex':node_index,'firstGlobalTriangle':first_global,
      'triangles':triangles,'glbAccessorVertices':len(p),'bounds':bounds(wp),'materials':[material],
      'bridge':{'decimalPlaces':6,'basis':'GLB local (x,y,z) to Blender local (x,-z,y); UV (u,1-v)',
        'orderedPositionCornersFnv1a64':fnv([local_positions[i] for i in ix]),
        'orderedNormalCornersFnv1a64':fnv([local_normals[i] for i in ix]),
        'orderedUvCornersFnv1a64':fnv([local_uvs[i] for i in ix]) if local_uvs else None,
        'proofScope':'Rounded ordered corner streams; not raw GLB/Blender byte equality or an automatic semantic-mask assignment.'},
      'glbMaterialJsonFnv1a64':fnv(doc['materials'][primitive['material']])})
    first_global+=triangles
assert first_global==48384
reference={'uid':inputs['sourceUid'],'sourceScene':inputs['sourceScene'],'objectCount':55,'meshCount':51,'triangleCount':48384,
 'hierarchy':hierarchy,'hierarchyFnv1a64':fnv(hierarchy),'meshOccurrences':references,
 'pilotContainer':inputs['pilot']['sourceContainer'],'pilotContainerTriangles':9656,'pilotRolesAssigned':False,
 'provenance':{'path':inputs['sourceGlb'],'sha256':EXPECTED_SHA,'bytes':len(raw),'externallyVerified':True,
  'inputJsonSha256':sha(INPUT.read_bytes()),'scope':'SHA checked by external preparer; MCP payload does not read files or independently recompute SHA.'}}
ref_text='"""Ivory-only pinned GLB reference; prepared externally, not a live audit result."""\nREFERENCE = '+repr(reference)+'\n'
(OUT/'00-ivory-reference.py').write_text(ref_text)
(OUT/'ivory-glb-reference.json').write_text(json.dumps(reference,indent=2)+'\n')
body=(OUT/'01-read-only-audit-body.py').read_text()
payload=ref_text+'\n'+body
assert len(payload.encode('utf8'))<200000
parsed=ast.parse(payload)
allowed={'bpy','math','json','collections','mathutils'}
for node in ast.walk(parsed):
    if isinstance(node,ast.Import): assert all(a.name in allowed for a in node.names)
    if isinstance(node,ast.ImportFrom): assert node.module in allowed
    assert not isinstance(node,ast.Lambda)
    if isinstance(node,ast.Name): assert node.id not in {'open','exec','eval','globals','hashlib','Path','os','traceback'}
    if isinstance(node,ast.Attribute): assert not (node.attr.startswith('__') or node.attr.endswith('__'))
    if isinstance(node,ast.Call) and isinstance(node.func,ast.Attribute):
        assert node.func.attr not in {'new','remove','copy','save','save_as_mainfile','render','import_scene','export_scene','from_pydata','clear_geometry','update_from_editmode'}
(OUT/'ivory-read-only-audit-prepared-v1.py').write_text(payload)
validation={'status':'PREPARED NOT EXECUTED','mcpExecuted':False,'liveBlenderStateVerified':False,
 'sourceSha256':EXPECTED_SHA,'sourceBytes':len(raw),'sourceCounts':inputs['sourceCounts'],
 'payload':'ivory-read-only-audit-prepared-v1.py','payloadBytes':len(payload.encode('utf8')),'payloadSha256':sha(payload.encode('utf8')),
 'astParsed':True,'restrictedImportsAndBuiltinsChecked':True,'noForbiddenMutationCalls':True,
 'colourReferenceValuesUsed':False,'sourceReferenceAlgorithm':'FNV-1a-64 over canonical ASCII JSON; non-cryptographic',
 'bridgeScope':'One linear ordered-corner check per own Ivory mesh at six decimal places; mismatches or excessive map runs leave bridge unresolved. No nearest-neighbour scan or semantic-mask assignment.',
 'temporaryEvaluation':'Only evaluated_get / to_mesh / calc_loop_triangles on temporary evaluated data / to_mesh_clear; original datablocks untouched. Exact datablock set equality checked at exit.',
 'files':{p.name:sha(p.read_bytes()) for p in [OUT/'00-ivory-reference.py',OUT/'ivory-glb-reference.json',OUT/'01-read-only-audit-body.py',OUT/'prepare-audit.py']}}
(OUT/'prepared-validation.json').write_text(json.dumps(validation,indent=2)+'\n')
print(json.dumps(validation,indent=2))
