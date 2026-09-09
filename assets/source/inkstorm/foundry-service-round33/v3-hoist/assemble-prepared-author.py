"""Assemble source-only hoist derivative payload; does not execute Blender/geometry."""
import json
from pathlib import Path
BASE=Path(__file__).resolve().parent
v2=(BASE.parent/'v2/author-service-gantry-mcp-safe.py').read_text()
contract=json.loads((BASE/'v2-hoist-triangle-contract.json').read_text())
keys=[]
for tr in contract['triangles']:
 p=[tuple(round(c*100000) for c in point) for point in tr['positionsBlender']]
 keys.append(min(tuple(c for q in p[k:]+p[:k] for c in q) for k in range(3)))
fingerprint=2166136261
for tr in sorted(keys):
 for v in tr:
  for shift in [0,8,16,24]:fingerprint=((fingerprint^((v>>shift)&255))*16777619)&0xffffffff
selector='''def choose_hoist(mesh):
    # glTF import must preserve these exact oriented triangles at these indices.
    # A moved/reordered source fails closed rather than deleting nearby truss.
    selected = set(HOIST_TRIANGLE_INDICES)
    keys = []
    for index in selected:
        polygon = mesh.polygons[index]
        points = [tuple(round(c*100000) for c in mesh.vertices[i].co) for i in polygon.vertices]
        assert len(points)==3
        rotations = [tuple(c for p in points[k:]+points[:k] for c in p) for k in range(3)]
        keys.append(min(rotations))
    checksum = 2166136261
    for triangle in sorted(keys):
        for value in triangle:
            for shift in [0,8,16,24]: checksum = ((checksum^((value>>shift)&255))*16777619)&0xffffffff
    assert len(selected)==1632 and checksum==HOIST_ORIENTED_FNV32, ('V2 hoist selector drift',len(selected),checksum)
    return selected, [{'kind':'V2 hoist only','triangles':1632,'orientedFnv32':checksum}]


'''
prefix=v2[:v2.index('def flange_pair(')]
body=v2[v2.index('def geometry_summary('):]
a=body.index('def positional_components(');z=body.index('def clipped_clearance(',a);body=body[:a]+selector+body[z:]
source=prefix+(BASE/'hoist-geometry-prepared.py').read_text()+'\n\n'+body
source=source.replace("SOURCE = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/foundry-service-round33/predecessors/foundry-gantry-round32.glb'","SOURCE = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/foundry-service-round33/v2/foundry-service-gantry-v2.glb'")
source=source.replace('3d0cd999daf52b82ac0232c7316a5e4072c80bd83982f83cbaf4a1dcde11e862',contract['sourceSha256'])
source=source.replace('round33 V2','round33 hoist V3').replace('foundry-service-gantry-v2','foundry-service-gantry-v3')
# Restore input family in the path: only outputs/stage are V3.
source=source.replace('/v2/foundry-service-gantry-v3.glb','/v2/foundry-service-gantry-v2.glb').replace('/v2/foundry-service-gantry-v3-native.glb','/v3-hoist/foundry-service-gantry-v3-native.glb')
source=source.replace('RETAINED_TRIANGLES = 3940','RETAINED_TRIANGLES = 18324').replace('PRACTICAL_CLEARANCE = 39.60','PRACTICAL_CLEARANCE = 39.66998  # Original39.669998 float32 clearance retained.')
source=source.replace('choose_signals(mesh)','choose_hoist(mesh)').replace('len(mesh.loop_triangles)==6300','len(mesh.loop_triangles)==19956')
source=source.replace('[-25,54.30417251586914]','[-25,61.400001525878906]')
source=source.replace("source['removedSignalTriangles'] = 2360","source['removedSignalTriangles'] = 2360\n        source['replacedV2HoistTriangles'] = 1632\n        source['preservedV2UnrelatedTriangles'] = 18324")
source=source.replace("'removedSignalBanks':bank_receipts","'replacedV2Hoist':bank_receipts")
source=source.replace("'Thicker connected main and full risers stay within V1 top and original horizontal bounds.'", "'Only V2 hoist geometry is replaced; all unrelated V2 geometry is retained.'")
source=source.replace("'Risers stand on original foot plates; world process-network sockets remain a separate integration decision.'", "'A forward supported rail exposes the drum above the retained near conduit; actual camera review is pending.'")
source=source.replace("'One larger readable hoist, four landings and two continuous ladders target actual construction within20000 triangles.'", "'No broad near-side masking cheek; separated drum/cables/sheave and a larger open hook retain original corridor clearance.'")
source=source.replace('V2 substantial construction. Root invokes','V3 hoist-only source derivative. Root invokes')
source=source.replace('Imports the byte-preserved round32 gantry into a NEW scene. Removes only complete\ncountdown assemblies, retaining the truss, columns, feet and two utility pendants.', 'Imports the byte-preserved V2 service gantry into a NEW scene. Replaces only its\n1632 hoist triangles, retaining every other V2 triangle and attribute relationship.')
indices=[r['index'] for r in contract['triangles']]
assert indices==list(range(18204,19836))
insert="HOIST_TRIANGLE_INDICES = range(18204,19836)\nHOIST_ORIENTED_FNV32 = "+str(fingerprint)+"\n\n"
source=source.replace('# The functions below are pure arithmetic.',insert+'# The functions below are pure arithmetic.')
(BASE/'author-hoist-v3-mcp-safe.py').write_text(source)
print('Prepared only:',len(source),'characters; selector fnv32',hex(fingerprint))
