"""Small, fail-closed GLB helpers for the source-only Polwo round32 tools."""
from __future__ import annotations

import hashlib
import io
import json
import math
import struct
from pathlib import Path


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_glb(path):
    raw = Path(path).read_bytes()
    if len(raw) < 28 or struct.unpack_from('<4sII', raw) != (b'glTF', 2, len(raw)):
        raise ValueError('Expected a complete GLB version 2')
    chunks = []
    offset = 12
    while offset < len(raw):
        size, kind = struct.unpack_from('<II', raw, offset)
        offset += 8
        if size % 4 or offset + size > len(raw):
            raise ValueError('Invalid GLB chunk bounds/alignment')
        chunks.append((kind, raw[offset:offset + size]))
        offset += size
    if len(chunks) != 2 or [c[0] for c in chunks] != [0x4e4f534a, 0x004e4942]:
        raise ValueError('Only one JSON and one embedded BIN chunk are supported')
    doc = json.loads(chunks[0][1])
    binary = chunks[1][1]
    if len(doc.get('buffers', [])) != 1 or 'uri' in doc['buffers'][0]:
        raise ValueError('External/multiple buffers are unsupported')
    if doc['buffers'][0]['byteLength'] > len(binary):
        raise ValueError('BIN shorter than declared buffer')
    for view in doc.get('bufferViews', []):
        if view.get('buffer', 0) != 0 or view.get('byteOffset', 0) < 0 or view['byteLength'] < 0:
            raise ValueError('Invalid buffer view')
        if view.get('byteOffset', 0) + view['byteLength'] > doc['buffers'][0]['byteLength']:
            raise ValueError('Buffer view outside declared buffer')
    return raw, doc, binary


def view_bytes(doc, binary, index):
    view = doc['bufferViews'][index]
    start = view.get('byteOffset', 0)
    return binary[start:start + view['byteLength']]


def write_glb_bytes(doc, binary):
    doc['buffers'][0]['byteLength'] = len(binary)
    js = json.dumps(doc, separators=(',', ':'), ensure_ascii=False).encode()
    js += b' ' * (-len(js) % 4)
    binary += b'\0' * (-len(binary) % 4)
    total = 12 + 8 + len(js) + 8 + len(binary)
    return (struct.pack('<4sII', b'glTF', 2, total) + struct.pack('<II', len(js), 0x4e4f534a)
            + js + struct.pack('<II', len(binary), 0x004e4942) + binary)


def accessor_bytes(doc, binary, index):
    a = doc['accessors'][index]
    if 'sparse' in a or 'bufferView' not in a:
        raise ValueError('Sparse/implicit accessors are unsupported')
    scalar = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}[a['componentType']]
    components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    width = scalar * components
    view = doc['bufferViews'][a['bufferView']]
    stride = view.get('byteStride', width)
    start = a.get('byteOffset', 0)
    data = view_bytes(doc, binary, a['bufferView'])
    if stride < width or (a['count'] and start + (a['count'] - 1) * stride + width > len(data)):
        raise ValueError('Accessor bounds/stride invalid')
    return b''.join(data[start + i * stride:start + i * stride + width] for i in range(a['count']))


def accessor_values(doc, binary, index):
    a = doc['accessors'][index]
    scalar = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}[a['componentType']]
    count = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    return struct.iter_unpack('<' + scalar * count, accessor_bytes(doc, binary, index))


def mesh_fingerprints(doc, binary):
    """Includes all mesh JSON and accessor metadata/values, not buffer offsets."""
    result = []
    for mesh in doc.get('meshes', []):
        refs = set()
        for primitive in mesh['primitives']:
            refs.update(primitive['attributes'].values())
            if 'indices' in primitive:
                refs.add(primitive['indices'])
            for target in primitive.get('targets', []):
                refs.update(target.values())
        accessors = []
        for index in sorted(refs):
            meta = {k: v for k, v in doc['accessors'][index].items() if k not in ('bufferView', 'byteOffset')}
            accessors.append([index, meta, sha(accessor_bytes(doc, binary, index))])
        result.append(sha(json.dumps([mesh, accessors], sort_keys=True).encode()))
    return result


def texture_infos(value):
    if isinstance(value, dict):
        for key, child in value.items():
            if key.endswith('Texture') and isinstance(child, dict) and 'index' in child:
                yield key, child
            else:
                yield from texture_infos(child)
    elif isinstance(value, list):
        for child in value:
            yield from texture_infos(child)


def image_source(texture):
    extension = texture.get('extensions', {}).get('EXT_texture_webp', {})
    if 'source' in extension:
        return extension['source']
    if 'source' not in texture:
        raise ValueError('Unsupported texture source/codec')
    return texture['source']


def image_roles(doc):
    roles = {i: set() for i in range(len(doc.get('images', [])))}
    owners = {i: set() for i in roles}
    for material in doc.get('materials', []):
        owner = 'pilot' if 'Pilot atlas' in material.get('name', '') else 'body'
        for slot, info in texture_infos(material):
            image = image_source(doc['textures'][info['index']])
            if slot == 'normalTexture':
                role = 'normal'
            elif slot in ('baseColorTexture', 'emissiveTexture'):
                role = 'color'
            elif slot in ('metallicRoughnessTexture', 'occlusionTexture'):
                role = 'data'
            else:
                raise ValueError('Unreviewed texture slot: ' + slot)
            roles[image].add(role)
            owners[image].add(owner)
    for i in roles:
        if len(roles[i]) != 1 or len(owners[i]) != 1:
            raise ValueError('Unused or incompatible shared image roles: ' + str(i))
    return {i: (next(iter(owners[i])), next(iter(roles[i]))) for i in roles}


def mip_bytes(width, height):
    total = 0
    while True:
        total += width * height * 4
        if width == height == 1:
            return total
        width, height = max(1, width // 2), max(1, height // 2)


def statistics(doc, binary):
    from PIL import Image
    if doc.get('skins') or doc.get('animations'):
        raise ValueError('This tool only accepts the reviewed static source')
    roles = image_roles(doc)
    images = []
    for i, img in enumerate(doc.get('images', [])):
        if 'uri' in img or 'bufferView' not in img:
            raise ValueError('All images must be embedded')
        payload = view_bytes(doc, binary, img['bufferView'])
        with Image.open(io.BytesIO(payload)) as decoded:
            width, height = decoded.size
        images.append({'index': i, 'name': img.get('name'), 'role': roles[i], 'width': width,
                       'height': height, 'encodedBytes': len(payload), 'sha256': sha(payload),
                       'rgba8Bytes': width * height * 4, 'rgba8FullMipBytes': mip_bytes(width, height)})
    visited = set()
    draws = []
    def visit(index, pilot=False):
        if index in visited:
            raise ValueError('Repeated/cyclic scene node is unsupported')
        visited.add(index)
        node = doc['nodes'][index]
        pilot = pilot or node.get('name', '').startswith('polwo-pilot-')
        if 'mesh' in node:
            for p in doc['meshes'][node['mesh']]['primitives']:
                if p.get('mode', 4) != 4 or 'indices' not in p:
                    raise ValueError('Expected indexed triangle primitives')
                count = doc['accessors'][p['indices']]['count']
                if count % 3:
                    raise ValueError('Triangle index count not divisible by three')
                mat = doc['materials'][p['material']]
                if mat.get('alphaMode', 'OPAQUE') != 'OPAQUE' or mat.get('pbrMetallicRoughness', {}).get('baseColorFactor', [1, 1, 1, 1])[3] != 1:
                    raise ValueError('Transparent/cutout material rejected')
                attrs = p['attributes']
                if not {'POSITION', 'NORMAL'}.issubset(attrs):
                    raise ValueError('Position/normal missing')
                vertices = doc['accessors'][attrs['POSITION']]['count']
                for semantic, a_index in attrs.items():
                    a = doc['accessors'][a_index]
                    if a['count'] != vertices:
                        raise ValueError('Incomplete vertex attribute: ' + semantic)
                    for value in accessor_values(doc, binary, a_index):
                        if not all(math.isfinite(c) for c in value):
                            raise ValueError('Non-finite vertex attribute')
                        if semantic == 'TANGENT' and (len(value) != 4 or abs(abs(value[3]) - 1) > 1e-5 or sum(c*c for c in value[:3]) < 1e-12):
                            raise ValueError('Invalid tangent handedness/vector')
                if any(v[0] < 0 or v[0] >= vertices for v in accessor_values(doc, binary, p['indices'])):
                    raise ValueError('Index outside position accessor')
                for _, info in texture_infos(mat):
                    channel = info.get('extensions', {}).get('KHR_texture_transform', {}).get('texCoord', info.get('texCoord', 0))
                    if 'TEXCOORD_' + str(channel) not in attrs:
                        raise ValueError('Mapped material has no matching UV attribute')
                draws.append({'node': node.get('name'), 'mesh': node['mesh'], 'pilot': pilot,
                              'triangles': count // 3, 'vertices': vertices, 'tangents': 'TANGENT' in attrs})
        for child in node.get('children', []):
            visit(child, pilot)
    for root in doc['scenes'][doc.get('scene', 0)]['nodes']:
        visit(root)
    return {'triangles': sum(d['triangles'] for d in draws), 'bodyDraws': sum(not d['pilot'] for d in draws),
            'pilotDraws': sum(d['pilot'] for d in draws), 'opaqueDraws': len(draws), 'draws': draws,
            'images': images, 'imageBytes': sum(i['encodedBytes'] for i in images),
            'rgba8Bytes': sum(i['rgba8Bytes'] for i in images),
            'rgba8FullMipBytes': sum(i['rgba8FullMipBytes'] for i in images),
            'textureDefinitions': len(doc.get('textures', [])), 'uniqueImages': len(images),
            'allMeshDefinitionsReferenced': set(d['mesh'] for d in draws) == set(range(len(doc['meshes'])))}


def budget_check(stats, triangles=60000, decoded_mib=24):
    if stats['triangles'] > triangles or stats['bodyDraws'] > 6 or stats['pilotDraws'] > 6 or stats['opaqueDraws'] > 12:
        raise ValueError('Geometry/draw import budget exceeded')
    if stats['rgba8FullMipBytes'] > decoded_mib * 1024 * 1024:
        raise ValueError('Unique RGBA8 full-mip texture estimate exceeds budget')
    if not stats['allMeshDefinitionsReferenced']:
        raise ValueError('Unreferenced mesh definitions are not admitted')
