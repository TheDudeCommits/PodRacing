"""Decode final runtime triangles and validate exact geometry preservation."""
from pathlib import Path
import hashlib
import json
import math
import struct

ROOT = Path('/Users/amir/Projects/PodRacing')
BASE = ROOT / 'assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v4b'
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
    final_path = BASE / 'teemto-pilot-v4b-runtime.glb'
    final = read(final_path)
    native = read(BASE / 'teemto-pilot-material-v4b-normalized.glb')
    public = read(ROOT / 'public/assets/inkstorm/vehicles/teemto-hero.glb')
    body_names = ['teemto-cockpit-body', 'teemto-engine-left-body', 'teemto-engine-right-body']
    body = [compare(public, final, name, name) for name in body_names]
    doc = final[0]
    pilot_nodes = [node for node in doc['nodes'] if 'mesh' in node and node['name'].startswith('teemto-pilot-')]
    assert len(pilot_nodes) == 6 and len(doc['materials']) == 8
    pilot = [compare(native, final, node['name'], node['name']) for node in pilot_nodes]
    pilot_triangles = sum(item['orderedTriangles'] for item in pilot)
    total = pilot_triangles + sum(item['orderedTriangles'] for item in body)
    assert pilot_triangles <= 16000 and total <= 60000
    pilot_materials = set()
    for node in pilot_nodes:
        p = primitive(final, node['name'])
        assert 'TANGENT' in p['attributes']
        for row in accessor(final, p['attributes']['TANGENT']):
            assert abs(math.sqrt(sum(value * value for value in row[:3])) - 1) < 1e-5
            assert row[3] in [-1, 1]
        pilot_materials.add(p['material'])
        material = doc['materials'][p['material']]
        for info in [material['normalTexture'], material['pbrMetallicRoughness']['baseColorTexture'],
                     material['pbrMetallicRoughness']['metallicRoughnessTexture']]:
            assert info.get('texCoord', 0) == 0 and not info.get('extensions')
        assert material['normalTexture'].get('scale', 1) == 1
        assert material['pbrMetallicRoughness'].get('roughnessFactor', 1) == 1
    assert len(pilot_materials) == 6
    assert len(doc['meshes']) == 9 and sum(len(mesh['primitives']) for mesh in doc['meshes']) == 9
    assert len(doc['textures']) == 5 and len(doc['images']) == 5
    assert not any(doc.get(key) for key in ['animations', 'skins', 'cameras'])
    def no_extras(value):
        if isinstance(value, dict):
            assert 'extras' not in value
            for item in value.values(): no_extras(item)
        elif isinstance(value, list):
            for item in value: no_extras(item)
    no_extras(doc)
    public_receipt = json.loads((BASE.parent / 'pilot-v4/public-before-receipt.json').read_text())
    for item in public_receipt:
        assert sha(ROOT / item['path']) == item['sha256'], item['path']
    before_v4 = json.loads((BASE / 'v4-before-receipt.json').read_text())
    for item in before_v4:
        path = Path(item['path'])
        if not path.is_absolute(): path = ROOT / path
        assert sha(path) == item['sha256'], str(path)
    report = {'runtimePath': str(final_path), 'sha256': sha(final_path), 'bytes': final_path.stat().st_size,
              'bodyComparedAgainst': 'public/assets/inkstorm/vehicles/teemto-hero.glb',
              'bodyWorldTriangleComparison': body, 'pilotNativeTriangleComparison': pilot,
              'pilotTriangles': pilot_triangles, 'totalTriangles': total, 'pilotPrimitives': 6, 'totalPrimitives': 9,
              'pilotMaterials': 6, 'totalMaterials': 8, 'textures': 5,
              'maps': {'color': '2048 WebP', 'normal': '1024 PNG tangent space', 'roughness': '1024 PNG green channel',
                       'texCoord': 0, 'textureTransforms': False, 'normalScale': 1, 'roughnessFactor': 1,
                       'pilotTangents': True},
              'oldPublicHashesUnchanged': public_receipt, 'preservedV4Artifacts': len(before_v4),
              'nodes': doc['nodes'], 'extensionsUsed': doc.get('extensionsUsed', [])}
    (BASE / 'runtime-validation.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
