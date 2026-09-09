"""Inspect a GLB without executing content or writing runtime assets."""
from pathlib import Path
import hashlib
import json
import struct

BASE=Path('/Users/amir/Projects/PodRacing/assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v4')

def inspect(path):
    data=path.read_bytes()
    header=struct.unpack_from('<III',data,0)
    assert header==(0x46546c67,2,len(data))
    size,kind=struct.unpack_from('<II',data,12)
    assert kind==0x4e4f534a
    doc=json.loads(data[20:20+size])
    extras=[]
    def visit(value,trail='root'):
        if isinstance(value,dict):
            if 'extras' in value:extras.append(trail)
            for key,child in value.items():visit(child,trail+'.'+key)
        elif isinstance(value,list):
            for i,child in enumerate(value):visit(child,trail+'.'+str(i))
    visit(doc)
    meshes=[]
    for mesh in doc['meshes']:
        tris=0
        for prim in mesh['primitives']:
            assert prim.get('mode',4)==4
            count=doc['accessors'][prim['indices']]['count'] if 'indices' in prim else doc['accessors'][prim['attributes']['POSITION']]['count']
            assert count%3==0
            tris+=count//3
        meshes.append({'name':mesh.get('name'),'triangles':tris,'primitives':len(mesh['primitives'])})
    pilot=[m for m in meshes if m['name'].lower().startswith('original inkstorm pilot v4')]
    assert len(pilot)==6,meshes
    assert sum(m['triangles'] for m in pilot)<=16000
    assert not extras and not doc.get('skins') and not doc.get('animations') and not doc.get('cameras')
    assert 'KHR_lights_punctual' not in doc.get('extensionsUsed',[])
    assert all(m.get('alphaMode','OPAQUE')=='OPAQUE' for m in doc['materials'])
    assert all(n.get('translation',[0,0,0])==[0,0,0] and n.get('rotation',[0,0,0,1])==[0,0,0,1] and n.get('scale',[1,1,1])==[1,1,1] for n in doc['nodes'])
    return {'path':str(path),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),
        'triangles':sum(m['triangles'] for m in meshes),'meshes':meshes,'pilotTriangles':sum(m['triangles'] for m in pilot),
        'pilotMaterialMaps':[{'name':m['name'],'normal':m.get('normalTexture'),'roughness':m['pbrMetallicRoughness'].get('metallicRoughnessTexture'),'roughnessFactor':m['pbrMetallicRoughness'].get('roughnessFactor',1)} for m in doc['materials'] if m['name'].startswith('Pilot atlas v4')],
        'tangentAttributes':[{'name':m['name'],'tangent':all('TANGENT' in p['attributes'] for p in m['primitives'])} for m in doc['meshes'] if m['name'].startswith('Original Inkstorm pilot v4')],
        'materials':len(doc['materials']),'textures':len(doc.get('textures',[])),
        'images':[{'mimeType':im.get('mimeType'),'embedded':'bufferView' in im} for im in doc.get('images',[])],
        'skins':len(doc.get('skins',[])),'animations':len(doc.get('animations',[])),
        'extras':extras,'extensionsUsed':doc.get('extensionsUsed',[]),'transformsNormalized':True,
        'nodes':[{'name':n.get('name'),'mesh':n.get('mesh')} for n in doc['nodes']]}

if __name__=='__main__':
    reports=[inspect(path) for path in sorted(BASE.glob('teemto-pilot-*.glb'))]
    for path in [BASE/'pilot-color-atlas-v3.png',*sorted((BASE/'review').glob('*.png')),
            Path('/Users/amir/Projects/PodRacing/scripts/blender/inkstorm-pilot-v4.py'),
            Path('/Users/amir/Projects/PodRacing/scripts/blender/inkstorm-pilot-v4-material.py')]:
        if path.exists():
            data=path.read_bytes()
            reports.append({'path':str(path),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
    (BASE/'artifact-receipts.json').write_text(json.dumps(reports,indent=2)+'\n')
    print(json.dumps(reports,indent=2))
