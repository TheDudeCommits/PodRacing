"""Decode final runtime triangles and validate exact geometry preservation."""
from pathlib import Path
import hashlib
import json
import math
import struct

ROOT = Path('/Users/amir/Projects/PodRacing')
BASE = ROOT / 'assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v4c'
IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    data = path.read_bytes()
    assert struct.unpack_from('<III', data) == (0x46546C67, 2, len(data))
    length, kind = struct.unpack_from('<II', data, 12)
    assert kind == 0x4E4F534A
    doc = json.loads(data[20:20 + length])
    binary_length, binary_kind = struct.unpack_from('<II', data, 20 + length)
    assert binary_kind == 0x004E4942
    # Every hierarchy node is identity, so decoded local POSITION and NORMAL
    # are also their exact world-space vectors; no rounding or bound proxies.
    for node in doc['nodes']:
        assert node.get('matrix', IDENTITY) == IDENTITY
        assert node.get('translation', [0, 0, 0]) == [0, 0, 0]
        assert node.get('rotation', [0, 0, 0, 1]) == [0, 0, 0, 1]
        assert node.get('scale', [1, 1, 1]) == [1, 1, 1]
    return doc, data[28 + length:28 + length + binary_length]


def accessor(model, index):
    doc, binary = model
    item = doc['accessors'][index]
    assert 'sparse' not in item and not item.get('normalized')
    view = doc['bufferViews'][item['bufferView']]
    component = {5126: 'f', 5125: 'I', 5123: 'H', 5121: 'B'}[item['componentType']]
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[item['type']]
    size = struct.calcsize(component) * width
    stride = view.get('byteStride', size)
    offset = view.get('byteOffset', 0) + item.get('byteOffset', 0)
    result = [struct.unpack_from('<' + component * width, binary, offset + i * stride) for i in range(item['count'])]
    assert all(math.isfinite(value) for row in result for value in row)
    return result


def primitive(model, node_name):
    doc = model[0]
    node = next(node for node in doc['nodes'] if node.get('name') == node_name)
    primitives = doc['meshes'][node['mesh']]['primitives']
    assert len(primitives) == 1 and primitives[0].get('mode', 4) == 4
    return primitives[0]


def compare(model_a, model_b, name_a, name_b):
    a, b = primitive(model_a, name_a), primitive(model_b, name_b)
    indices_a = [row[0] for row in accessor(model_a, a['indices'])]
    indices_b = [row[0] for row in accessor(model_b, b['indices'])]
    assert len(indices_a) == len(indices_b)
    errors = {}
    for key in ['POSITION', 'NORMAL', 'TEXCOORD_0']:
        values_a = accessor(model_a, a['attributes'][key])
        values_b = accessor(model_b, b['attributes'][key])
        error = max(abs(x - y) for i, j in zip(indices_a, indices_b) for x, y in zip(values_a[i], values_b[j]))
        assert error == 0, (name_a, key, error)
        errors[key] = error
    return {'name': name_b, 'orderedTriangles': len(indices_a) // 3,
            'maxAbsoluteComponentErrors': errors, 'worldTransformsExactlyIdentity': True}


if __name__ == '__main__':
    path=BASE/'teemto-pilot-v4c-runtime.glb'
    final=read(path)
    source=read(BASE.parent/'pilot-v4b/teemto-pilot-v4b-runtime.glb')
    public=read(ROOT/'public/assets/inkstorm/vehicles/teemto-hero.glb')
    assert final[0]['nodes']==source[0]['nodes']
    meshes=[node for node in final[0]['nodes'] if 'mesh' in node]
    comparisons=[compare(source,final,node['name'],node['name']) for node in meshes]
    for node in meshes:
        a=primitive(source,node['name']);b=primitive(final,node['name'])
        assert a['attributes'].keys()==b['attributes'].keys()
        assert accessor(source,a['indices'])==accessor(final,b['indices'])
        for key in a['attributes']:
            assert accessor(source,a['attributes'][key])==accessor(final,b['attributes'][key]),(node['name'],key)
    body_names=['teemto-cockpit-body','teemto-engine-left-body','teemto-engine-right-body']
    body=[compare(public,final,name,name) for name in body_names]
    old_materials=source[0]['materials'];new_materials=final[0]['materials']
    assert len(old_materials)==len(new_materials)==8
    names=[]
    for a,b in zip(old_materials,new_materials):
        assert {k:v for k,v in a.items() if k!='name'}=={k:v for k,v in b.items() if k!='name'}
        expected=a['name'].replace('Pilot atlas v4b runtime ','Pilot atlas v4c runtime ')
        assert b['name']==expected
        if b['name'].startswith('Pilot atlas v4c runtime '):names.append(b['name'])
    assert len(names)==6
    def image_data(model,name):
        doc,binary=model
        img=next(i for i in doc['images'] if i['name']==name)
        view=doc['bufferViews'][img['bufferView']]
        start=view.get('byteOffset',0)
        return binary[start:start+view['byteLength']]
    preserved_maps=[]
    for image in source[0]['images']:
        if image['name']=='pilot-color-atlas-v4b':continue
        assert image_data(source,image['name'])==image_data(final,image['name'])
        preserved_maps.append(image['name'])
    assert len(final[0]['images'])==len(source[0]['images'])==5
    for item in json.loads((BASE/'v4b-public-before-receipt.json').read_text()):
        assert sha(ROOT/item['path'])==item['sha256'],item['path']
    pilot=[x for x in comparisons if x['name'].startswith('teemto-pilot-')]
    total=sum(x['orderedTriangles'] for x in comparisons)
    assert total==59324 and sum(x['orderedTriangles'] for x in pilot)==15779
    report={'runtime':str(path),'sha256':sha(path),'bytes':path.stat().st_size,
        'V4BComparison':comparisons,'allIndicesAndAllAttributeArraysExactlyEqual':True,
        'includes':['POSITION','NORMAL','TEXCOORD_0','TANGENT'],'nodesAndTransformsExactlyEqual':True,
        'originalPublicBodyWorldComparison':body,'triangles':total,'pilotTriangles':15779,
        'totalPrimitives':9,'pilotPrimitives':6,'materialNames':names,'materialParametersUnchanged':True,
        'mapsPreservedByteForByte':preserved_maps,'replacedMap':'pilot-color-atlas-v4c',
        'textures':5,'allV4BAndPublicSnapshotFilesPreserved':29,
        'extensionsUsed':final[0].get('extensionsUsed',[]),'visualAcceptance':'pending fresh in-world review',
        'performanceAcceptance':'not measured'}
    (BASE/'runtime-validation.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
