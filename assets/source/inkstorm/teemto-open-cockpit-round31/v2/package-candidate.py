"""Splice Blender-authored cockpit geometry into V4C without re-exporting its driver.

The immutable V4C BIN chunk is copied verbatim. Engine/pilot mesh definitions,
material/image definitions, every original accessor, and anchor nodes remain
exact. The unused original cockpit mesh definition is omitted and mesh indices
remapped; its unchanged source payload remains in BIN. Blender exports geometry only.
"""
from pathlib import Path
import copy
import hashlib
import json
import struct

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
SOURCE = ROOT / 'assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v4c/teemto-pilot-v4c-runtime.glb'
GEOMETRY = HERE / 'teemto-open-cockpit-round31-v2-geometry.glb'
TARGET = HERE / 'teemto-open-cockpit-round31-v2-candidate.glb'

def read(file):
    data = file.read_bytes()
    magic, version, total = struct.unpack_from('<III', data)
    assert (magic, version, total) == (0x46546C67, 2, len(data))
    size, kind = struct.unpack_from('<II', data, 12)
    assert kind == 0x4E4F534A
    doc = json.loads(data[20:20 + size])
    length, kind = struct.unpack_from('<II', data, 20 + size)
    assert kind == 0x004E4942
    return doc, data[28 + size:28 + size + length]

def write(file, doc, binary):
    doc['buffers'] = [{'byteLength': len(binary)}]
    payload = json.dumps(doc, separators=(',', ':')).encode()
    payload += b' ' * (-len(payload) % 4)
    binary += b'\0' * (-len(binary) % 4)
    data = struct.pack('<III', 0x46546C67, 2, 28 + len(payload) + len(binary))
    data += struct.pack('<II', len(payload), 0x4E4F534A) + payload
    data += struct.pack('<II', len(binary), 0x004E4942) + binary
    file.write_bytes(data)

def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

if __name__ == '__main__':
    before = sha(SOURCE)
    assert before == 'f3eb56a54b7dbb8f4a26263fb26f1f88b188db6bcc409910a3561ae939f1eef1'
    source, binary = read(SOURCE)
    geometry, extra = read(GEOMETRY)
    assert not geometry.get('images') and not geometry.get('textures')
    assert not geometry.get('skins') and not geometry.get('animations')
    target = copy.deepcopy(source)
    offset = len(binary)
    assert offset % 4 == 0
    view_offset = len(target['bufferViews'])
    access_offset = len(target['accessors'])
    mesh_offset = len(target['meshes'])
    for view in geometry['bufferViews']:
        item = copy.deepcopy(view)
        item['buffer'] = 0
        item['byteOffset'] = item.get('byteOffset', 0) + offset
        target['bufferViews'].append(item)
    for accessor in geometry['accessors']:
        item = copy.deepcopy(accessor)
        assert 'sparse' not in item
        item['bufferView'] += view_offset
        target['accessors'].append(item)
    frame_index = len(target['materials'])
    target['materials'] += [
        {'name': 'Inkstorm Teemto open cockpit graphite structure v2',
         'pbrMetallicRoughness': {'baseColorFactor': [.028, .041, .052, 1], 'metallicFactor': .36, 'roughnessFactor': .65}},
    ]
    for mesh in geometry['meshes']:
        item = copy.deepcopy(mesh)
        for primitive in item['primitives']:
            primitive['attributes'] = {k:v + access_offset for k,v in primitive['attributes'].items()}
            if 'indices' in primitive:
                primitive['indices'] += access_offset
            name = mesh.get('name', '')
            primitive['material'] = 0 if name.startswith('teemto-open-cockpit-hull-v2') else frame_index
        target['meshes'].append(item)
    current_index = next(i for i,n in enumerate(target['nodes']) if n.get('name') == 'teemto-cockpit-body')
    parent = next(n for n in target['nodes'] if current_index in n.get('children', []))
    hull_found = False
    for node in geometry['nodes']:
        if 'mesh' not in node:
            continue
        assert not node.get('children')
        assert node.get('translation', [0,0,0]) == [0,0,0]
        assert node.get('rotation', [0,0,0,1]) == [0,0,0,1]
        assert node.get('scale', [1,1,1]) == [1,1,1]
        assert 'matrix' not in node
        name = node.get('name', '')
        if name.startswith('teemto-open-cockpit-hull-v2'):
            target['nodes'][current_index]['mesh'] = node['mesh'] + mesh_offset
            hull_found = True
        else:
            item = copy.deepcopy(node)
            if item.get('name','').startswith('teemto-cockpit-graphite-v2'):
                item['name']='teemto-cockpit-graphite-v2'
            item['mesh'] += mesh_offset
            parent['children'].append(len(target['nodes']))
            target['nodes'].append(item)
    assert hull_found
    # Header-count consumers must see the same meshes as runtime traversal.
    # The unused old cockpit bytes remain verbatim in BIN for provenance.
    used_meshes = sorted({n['mesh'] for n in target['nodes'] if 'mesh' in n})
    remap = {old:new for new,old in enumerate(used_meshes)}
    target['meshes'] = [target['meshes'][i] for i in used_meshes]
    for node in target['nodes']:
        if 'mesh' in node:
            node['mesh'] = remap[node['mesh']]
    target['asset']['generator'] = 'Blender MCP cockpit geometry; lossless V4C payload splice, round 31'
    write(TARGET, target, binary + extra)
    packed, packed_binary = read(TARGET)
    assert packed_binary[:len(binary)] == binary
    for key in ['images', 'textures', 'samplers']:
        assert packed.get(key) == source.get(key)
    for node in source['nodes']:
        if 'mesh' not in node or node.get('name')=='teemto-cockpit-body':
            continue
        final_node = next(n for n in packed['nodes'] if n.get('name')==node.get('name'))
        assert packed['meshes'][final_node['mesh']]==source['meshes'][node['mesh']]
        assert {k:v for k,v in final_node.items() if k!='mesh'}=={k:v for k,v in node.items() if k!='mesh'}
    assert packed['materials'][:frame_index] == source['materials']
    assert sha(SOURCE) == before
    evidence = {
        'source': str(SOURCE), 'sourceSha256': before,
        'geometry': str(GEOMETRY), 'geometrySha256': sha(GEOMETRY),
        'candidate': str(TARGET), 'candidateSha256': sha(TARGET), 'bytes': TARGET.stat().st_size,
        'originalBinChunkByteExact': True, 'preservedOriginalBinBytes': len(binary),
        'originalEnginePilotMeshDefinitionsMaterialsTexturesAndAccessorsExact': True,
        'unusedSourceCockpitMeshDefinitionOmitted': True,
        'changedOriginalNode': 'teemto-cockpit-body mesh reference; global mesh indices remapped after unused mesh omission',
        'newNodes': [n.get('name') for n in packed['nodes'][len(source['nodes']):]],
        'alphaMode': 'Every new material is OPAQUE; no transparency or runtime camera changes',
        'status': 'Source-only candidate; in-world visual and performance acceptance pending',
    }
    (HERE / 'candidate-package-receipt.json').write_text(json.dumps(evidence, indent=2) + '\n')
    print(json.dumps(evidence, indent=2))
