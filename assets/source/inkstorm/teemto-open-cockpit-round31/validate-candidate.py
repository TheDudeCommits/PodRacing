"""Verify the unchanged runtime budget and byte-level source preservation."""
from pathlib import Path
import hashlib
import importlib.util
import json

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('pack',HERE/'package-candidate.py')
pack=importlib.util.module_from_spec(spec)
spec.loader.exec_module(pack)
source,binary=pack.read(pack.SOURCE)
candidate,packed_binary=pack.read(pack.TARGET)
seen=set()
def walk(index):
    assert index not in seen, 'Duplicate/cyclic node reachability'
    seen.add(index)
    for child in candidate['nodes'][index].get('children',[]):walk(child)
for index in candidate['scenes'][candidate.get('scene',0)]['nodes']:walk(index)
used_meshes={candidate['nodes'][i]['mesh'] for i in seen if 'mesh' in candidate['nodes'][i]}
assert used_meshes==set(range(len(candidate['meshes'])))
counts=[]
for index in sorted(seen):
    node=candidate['nodes'][index]
    if 'mesh' not in node:continue
    primitives=candidate['meshes'][node['mesh']]['primitives']
    triangles=0
    for primitive in primitives:
        assert primitive.get('mode',4)==4
        count=candidate['accessors'][primitive['indices']]['count']
        assert count%3==0
        triangles+=count//3
        assert candidate['materials'][primitive['material']].get('alphaMode','OPAQUE')=='OPAQUE'
    counts.append({'node':node['name'],'category':'pilot' if node['name'].startswith('teemto-pilot-') else 'body',
                   'triangles':triangles,'opaqueDraws':len(primitives)})
total=sum(item['triangles'] for item in counts)
draws=sum(item['opaqueDraws'] for item in counts)
body=sum(item['opaqueDraws'] for item in counts if item['category']=='body')
pilot=sum(item['opaqueDraws'] for item in counts if item['category']=='pilot')
assert total<=60000 and body<=6 and pilot<=6 and draws<=12
assert packed_binary[:len(binary)]==binary
assert candidate['accessors'][:len(source['accessors'])]==source['accessors']
assert candidate['bufferViews'][:len(source['bufferViews'])]==source['bufferViews']
assert candidate['materials'][:len(source['materials'])]==source['materials']
assert candidate['images']==source['images']
assert candidate['textures']==source['textures']
for node in source['nodes']:
    other=next(n for n in candidate['nodes'] if n.get('name')==node.get('name'))
    for key in ['translation','rotation','scale','matrix']:
        assert node.get(key)==other.get(key)
    if 'mesh' in node and node['name']!='teemto-cockpit-body':
        assert source['meshes'][node['mesh']]==candidate['meshes'][other['mesh']]
    if node.get('children'):
        assert other['children'][:len(node['children'])]==node['children']
assert pack.sha(pack.SOURCE)=='f3eb56a54b7dbb8f4a26263fb26f1f88b188db6bcc409910a3561ae939f1eef1'
files=[]
for file in sorted(HERE.glob('teemto-open-cockpit-round31-*.png')):
    files.append({'path':file.name,'bytes':file.stat().st_size,'sha256':pack.sha(file)})
report={'candidate':str(pack.TARGET),'sha256':pack.sha(pack.TARGET),'bytes':pack.TARGET.stat().st_size,
        'triangles':total,'allMeshDefinitionTriangles':total,'opaqueDraws':draws,'bodyDraws':body,'pilotDraws':pilot,
        'limitsUnchanged':{'triangles':60000,'bodyDraws':6,'pilotDraws':6,'totalDraws':12},
        'budgetPassed':True,'allMeshesReferenced':True,'allMaterialsOpaque':True,
        'originalEngineAndPilotGeometryUVNormalsTangentsTexturesExact':True,
        'allOriginalNodeNamesAndTransformsPreserved':True,'existingHierarchyEdgesPreserved':True,
        'originalV4CBinPrefixByteExact':True,'meshes':counts,'inspectionImages':files,
        'pending':['actual runtime loader admission','in-world race screenshots and independent visual critic','runtime frame-time verification']}
(HERE/'validation-receipt.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k not in ['meshes','inspectionImages']},indent=2))
