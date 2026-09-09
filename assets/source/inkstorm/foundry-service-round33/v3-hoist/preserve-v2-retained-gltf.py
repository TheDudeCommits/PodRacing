#!/usr/bin/env python3
"""Check or restore frozen retained glTF attributes; source-only, no Blender use.

Default check invocation: --native PATH --check-only --receipt NEW_JSON
Repair invocation: --native PATH --output NEW_GLB --receipt NEW_JSON
Check exits 2 for geometrically valid retained attribute drift, 0 for exactness.
Every output is exclusive-create; CLI outputs must remain in this source folder.
"""
import argparse
import collections
import copy
import hashlib
import itertools
import json
import math
from pathlib import Path
import struct
import sys

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / 'v2/foundry-service-gantry-v2.glb'
SOURCE_SHA256 = '58fc12d837039eb73111886b1b91c294516c51fc47a4a0d00200717161fd39ba'
FAMILY = 'foundry-service-gantry-v3'
POSITION_TOLERANCE = 2e-5  # Representation tolerance only; never a nearest-face remap.
REMOVED = frozenset(range(18204, 19836))
RETAINED = tuple(i for i in range(19956) if i not in REMOVED)
COMPONENTS = {5121: ('B', 1), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
DIMS = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_glb(raw):
    require(len(raw) >= 28, 'Truncated GLB')
    magic, version, length = struct.unpack_from('<III', raw)
    require((magic, version, length) == (0x46546c67, 2, len(raw)), 'Invalid GLB header')
    chunks = []
    offset = 12
    while offset < len(raw):
        require(offset + 8 <= len(raw), 'Truncated GLB chunk header')
        size, kind = struct.unpack_from('<II', raw, offset)
        require(size % 4 == 0 and offset + 8 + size <= len(raw), 'Invalid GLB chunk extent')
        chunks.append((kind, raw[offset + 8:offset + 8 + size]))
        offset += 8 + size
    require([kind for kind, _ in chunks] == [0x4e4f534a, 0x004e4942], 'Expected JSON then BIN only')
    document = json.loads(chunks[0][1])
    binary = chunks[1][1]
    require(document.get('asset', {}).get('version') == '2.0', 'Expected glTF 2.0')
    require(not document.get('extensionsUsed') and not document.get('extensionsRequired'), 'Extensions need an explicit decoder')
    require(len(document.get('buffers', [])) == 1 and 'uri' not in document['buffers'][0], 'Expected one embedded buffer')
    size = document['buffers'][0]['byteLength']
    require(isinstance(size, int) and 0 <= len(binary) - size <= 3, 'Invalid embedded buffer length')
    return document, binary[:size]


def elements(document, binary, accessor_index):
    accessor = document['accessors'][accessor_index]
    require('sparse' not in accessor, 'Sparse accessors are outside this bounded packer')
    require(accessor.get('componentType') in COMPONENTS and accessor.get('type') in DIMS, 'Unsupported accessor format')
    component, unit = COMPONENTS[accessor['componentType']]
    count, dimensions = accessor['count'], DIMS[accessor['type']]
    require(isinstance(count, int) and count > 0, 'Empty/invalid accessor')
    view = document['bufferViews'][accessor['bufferView']]
    require(view.get('buffer') == 0, 'Unexpected buffer')
    start, view_length = view.get('byteOffset', 0), view['byteLength']
    offset = accessor.get('byteOffset', 0)
    width = dimensions * unit
    stride = view.get('byteStride', width)
    require(start >= 0 and view_length >= 0 and start + view_length <= len(binary), 'Buffer view outside BIN')
    require(offset >= 0 and stride >= width and stride % unit == 0 and (start + offset) % unit == 0, 'Invalid accessor alignment/stride')
    require(offset + (count - 1) * stride + width <= view_length, 'Accessor outside buffer view')
    raw_rows = [binary[start + offset + i * stride:start + offset + i * stride + width] for i in range(count)]
    rows = [struct.unpack('<' + component * dimensions, row) for row in raw_rows]
    require(all(math.isfinite(value) for row in rows for value in row), 'Nonfinite attribute')
    return accessor, rows, raw_rows


def decode(raw):
    document, binary = read_glb(raw)
    require(len(document.get('meshes', [])) == len(document.get('materials', [])) == 1, 'Expected one mesh/material')
    require(not document.get('images') and not document.get('textures') and not document.get('animations') and not document.get('skins'), 'Unexpected texture/animation/skin contract')
    require(len(document.get('nodes', [])) == 1 and document['nodes'][0].get('mesh') == 0, 'Expected one mesh node')
    node = document['nodes'][0]
    require(not node.get('children') and 'skin' not in node, 'Unexpected hierarchy')
    require(node.get('translation', [0, 0, 0]) == [0, 0, 0] and node.get('rotation', [0, 0, 0, 1]) == [0, 0, 0, 1]
            and node.get('scale', [1, 1, 1]) == [1, 1, 1]
            and node.get('matrix', [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]) == [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], 'Nonidentity node transform')
    require(len(document.get('scenes', [])) == 1 and document['scenes'][0].get('nodes') == [0] and document.get('scene', 0) == 0, 'Unexpected scene')
    primitives = document['meshes'][0]['primitives']
    require(len(primitives) == 1, 'Expected one primitive')
    primitive = primitives[0]
    require(primitive.get('mode', 4) == 4 and primitive.get('material') == 0 and not primitive.get('targets'), 'Expected rigid TRIANGLES primitive')
    require(set(primitive['attributes']) == {'POSITION', 'NORMAL', 'COLOR_0'}, 'Unexpected/missing vertex semantic')
    attributes, raw_attributes, formats = {}, {}, {}
    for semantic, index in primitive['attributes'].items():
        accessor, rows, raw_rows = elements(document, binary, index)
        formats[semantic] = {key: accessor.get(key) for key in ('type', 'componentType', 'normalized')}
        if semantic in {'POSITION', 'NORMAL'}:
            require(accessor['componentType'] == 5126 and accessor['type'] == 'VEC3' and not accessor.get('normalized'), 'POSITION/NORMAL must be FLOAT32 VEC3')
        else:
            require(accessor['type'] in {'VEC3', 'VEC4'}, 'COLOR_0 must be RGB/RGBA')
            kind = accessor['componentType']
            require((kind == 5126 and not accessor.get('normalized')) or (kind in {5121, 5123} and accessor.get('normalized') is True), 'Unsupported COLOR_0 encoding')
            maximum = {5121: 255, 5123: 65535}.get(kind, 1)
            rows = [tuple(value / maximum for value in row) for row in rows]
            require(all(0 <= value <= 1 for row in rows for value in row), 'COLOR_0 outside [0,1]')
            require(all(len(row) == 3 or row[3] == 1.0 for row in rows), 'Nonopaque vertex alpha cannot be dropped')
            # FLOAT32 RGB stays byte exact, including signed zero. RGBA drops only alpha=1.
            raw_rows = [row[:12] for row in raw_rows] if kind == 5126 else [struct.pack('<3f', *row[:3]) for row in rows]
            rows = [tuple(row[:3]) for row in rows]
        attributes[semantic], raw_attributes[semantic] = rows, raw_rows
    counts = {len(rows) for rows in attributes.values()}
    require(len(counts) == 1, 'Attribute counts differ')
    accessor, index_rows, _ = elements(document, binary, primitive['indices'])
    require(accessor['type'] == 'SCALAR' and accessor['componentType'] in {5121, 5123, 5125} and not accessor.get('normalized'), 'Invalid index format')
    indices = [row[0] for row in index_rows]
    require(len(indices) % 3 == 0 and max(indices) < len(attributes['POSITION']), 'Invalid triangle indices')
    material = document['materials'][0]
    require(material.get('alphaMode', 'OPAQUE') == 'OPAQUE' and not material.get('extensions'), 'Unexpected material/alpha contract')
    return {'document': document, 'attributes': attributes, 'rawAttributes': raw_attributes, 'formats': formats,
            'triangles': [tuple(indices[i:i + 3]) for i in range(0, len(indices), 3)]}


def classify(source, native):
    require(len(source['triangles']) == 19956 and len(native['triangles']) == 19872, 'Unexpected source/native triangle count')
    source_points, native_points = source['attributes']['POSITION'], native['attributes']['POSITION']
    bins = collections.defaultdict(list)
    def cell(point):
        return tuple(math.floor(value / POSITION_TOLERANCE) for value in point)
    for index, triangle in enumerate(source['triangles']):
        for rotation in range(3):
            bins[cell(source_points[triangle[rotation]])].append((index, rotation))
    matched, additions = {}, []
    max_position_delta = 0.0
    attribute_errors = {semantic: {'exact': True, 'differentCorners': 0, 'maximumComponentDelta': 0.0} for semantic in ('POSITION', 'NORMAL', 'COLOR_0')}
    for native_index, triangle in enumerate(native['triangles']):
        points = [native_points[index] for index in triangle]
        origin = cell(points[0])
        candidates = set()
        for shift in itertools.product((-1, 0, 1), repeat=3):
            candidates.update(bins.get(tuple(origin[i] + shift[i] for i in range(3)), ()))
        forward, reversed_matches = [], []
        for source_index, rotation in candidates:
            source_triangle = source['triangles'][source_index]
            for sign, result in ((1, forward), (-1, reversed_matches)):
                ids = tuple(source_triangle[(rotation + sign * corner) % 3] for corner in range(3))
                delta = max(abs(points[corner][axis] - source_points[ids[corner]][axis]) for corner in range(3) for axis in range(3))
                if delta <= POSITION_TOLERANCE:
                    result.append((source_index, ids, delta))
        require(not reversed_matches, f'Reversed/degenerate source triangle at native triangle {native_index}')
        require(len(forward) <= 1, f'Ambiguous source match at native triangle {native_index}')
        if not forward:
            additions.append(native_index)
            continue
        source_index, source_ids, delta = forward[0]
        require(source_index not in REMOVED, f'Replaced V2 hoist triangle reappeared: {source_index}')
        require(source_index not in matched, f'Duplicate retained source triangle: {source_index}')
        matched[source_index] = native_index
        max_position_delta = max(max_position_delta, delta)
        for semantic, metric in attribute_errors.items():
            for source_id, native_id in zip(source_ids, triangle):
                exact = source['rawAttributes'][semantic][source_id] == native['rawAttributes'][semantic][native_id]
                metric['exact'] = metric['exact'] and exact
                metric['differentCorners'] += not exact
                metric['maximumComponentDelta'] = max(metric['maximumComponentDelta'], max(abs(a - b) for a, b in zip(source['attributes'][semantic][source_id], native['attributes'][semantic][native_id])))
    missing = set(RETAINED) - matched.keys()
    require(not missing, f'Missing/moved retained source triangles: {len(missing)}; first={min(missing) if missing else None}')
    require(len(matched) == 18324 and len(additions) == 1548, 'Retained/addition classification count drift')
    return additions, {'matchedRetainedTriangles': len(matched), 'absentV2HoistTriangles': 1632, 'nativeAdditionTriangles': len(additions),
                       'positionMatchingTolerance': POSITION_TOLERANCE, 'maximumMatchedPositionDelta': max_position_delta,
                       'nativeRetainedAttributes': attribute_errors, 'nativeRetainedAttributesExact': all(m['exact'] for m in attribute_errors.values())}


def geometry_guard(model):
    points = model['attributes']['POSITION']
    used = {index for triangle in model['triangles'] for index in triangle}
    bounds = [[min(points[index][axis] for index in used), max(points[index][axis] for index in used)] for axis in range(3)]
    expected = [[-52, 52], [-25, 61.4], [-7, 7]]
    require(all(abs(bounds[a][b] - expected[a][b]) <= 2e-4 for a in range(3) for b in range(2)), f'Candidate bounds drift: {bounds}')
    minimum = math.inf
    for triangle in model['triangles']:
        polygon = [points[index] for index in triangle]
        a, b, c = polygon
        ab, ac = [b[i] - a[i] for i in range(3)], [c[i] - a[i] for i in range(3)]
        cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]]
        require(sum(value * value for value in cross) > 1e-16, 'Degenerate triangle')
        for boundary, sign in ((-39.999999, 1), (39.999999, -1)):
            clipped = []
            for start, end in zip(polygon, polygon[1:] + polygon[:1]):
                inside_start, inside_end = (start[0] - boundary) * sign >= 0, (end[0] - boundary) * sign >= 0
                if inside_start:
                    clipped.append(start)
                if inside_start != inside_end:
                    t = (boundary - start[0]) / (end[0] - start[0])
                    clipped.append(tuple(start[i] + t * (end[i] - start[i]) for i in range(3)))
            polygon = clipped
            if not polygon:
                break
        if polygon:
            minimum = min(minimum, min(point[1] for point in polygon))
    require(minimum >= 39.66998, f'Corridor clearance violation: {minimum}')
    return {'boundsGltf': bounds, 'clippedOpenCorridorMinimumY': minimum}


def make_glb(document, binary):
    document = copy.deepcopy(document)
    document['buffers'] = [{'byteLength': len(binary)}]
    js = json.dumps(document, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    js += b' ' * (-len(js) % 4)
    binary += b'\0' * (-len(binary) % 4)
    return struct.pack('<III', 0x46546c67, 2, 28 + len(js) + len(binary)) + struct.pack('<II', len(js), 0x4e4f534a) + js + struct.pack('<II', len(binary), 0x004e4942) + binary


def reconstruct(source, native, addition_ids):
    source_used = sorted({index for number in RETAINED for index in source['triangles'][number]})
    native_used = sorted({index for number in addition_ids for index in native['triangles'][number]})
    require(len(source_used) == 31264, 'Retained source vertex-count drift')
    records = []
    for model, used in ((source, source_used), (native, native_used)):
        records.extend(b''.join(model['rawAttributes'][semantic][index] for semantic in ('POSITION', 'NORMAL', 'COLOR_0')) for index in used)
    source_map = {old: new for new, old in enumerate(source_used)}
    native_map = {old: len(source_used) + new for new, old in enumerate(native_used)}
    triangles = [tuple(source_map[index] for index in source['triangles'][number]) for number in RETAINED]
    triangles.extend(tuple(native_map[index] for index in native['triangles'][number]) for number in addition_ids)
    require(len(triangles) == 19872 and len(records) < 65536, 'Final index/count contract drift')
    vertex_data = b''.join(records)
    index_data = struct.pack('<' + 'H' * 59616, *(index for triangle in triangles for index in triangle))
    positions = [struct.unpack_from('<3f', record) for record in records]
    node = copy.deepcopy(native['document']['nodes'][0])
    node['mesh'] = 0
    node.setdefault('extras', {})['retainedAttributeRestoration'] = {'sourceSha256': SOURCE_SHA256, 'retainedTriangles': 18324, 'positionNormalColorBytesExact': True}
    document = {'asset': {'version': '2.0', 'generator': 'PodRacing preserve-retained-gltf.py'}, 'scene': 0,
                'scenes': [{'name': FAMILY + ' preserved source', 'nodes': [0]}], 'nodes': [node],
                'meshes': [{'name': FAMILY, 'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'COLOR_0': 2}, 'indices': 3, 'material': 0, 'mode': 4}]}],
                'materials': copy.deepcopy(source['document']['materials']),
                'bufferViews': [{'buffer': 0, 'byteOffset': 0, 'byteLength': len(vertex_data), 'byteStride': 36, 'target': 34962},
                                {'buffer': 0, 'byteOffset': len(vertex_data), 'byteLength': len(index_data), 'target': 34963}],
                'accessors': [{'bufferView': 0, 'byteOffset': offset, 'componentType': 5126, 'count': len(records), 'type': 'VEC3'} for offset in (0, 12, 24)]}
    document['accessors'][0].update(min=[min(p[a] for p in positions) for a in range(3)], max=[max(p[a] for p in positions) for a in range(3)])
    document['accessors'].append({'bufferView': 1, 'byteOffset': 0, 'componentType': 5123, 'count': 59616, 'type': 'SCALAR'})
    packed = make_glb(document, vertex_data + index_data)
    verify = decode(packed)
    # Direct record and index proof, independent of tolerance matching.
    require(verify['triangles'][:18324] == [tuple(source_map[index] for index in source['triangles'][number]) for number in RETAINED], 'Retained oriented indices drift')
    for semantic in ('POSITION', 'NORMAL', 'COLOR_0'):
        require(verify['rawAttributes'][semantic][:31264] == [source['rawAttributes'][semantic][index] for index in source_used], 'Retained bytes drift: ' + semantic)
        require(verify['rawAttributes'][semantic][31264:] == [native['rawAttributes'][semantic][index] for index in native_used], 'Addition attribute drift: ' + semantic)
    require(verify['triangles'][18324:] == [tuple(native_map[index] for index in native['triangles'][number]) for number in addition_ids], 'Addition winding/index drift')
    receipt = geometry_guard(verify)
    receipt.update({'triangles': 19872, 'vertices': len(records), 'retainedVertices': 31264, 'addedVertices': len(native_used),
                    'meshes': 1, 'primitives': 1, 'materials': 1, 'textures': 0, 'retainedPositionNormalColorBytesExact': True,
                    'retainedInterleavedRecordsSha256': sha(vertex_data[:31264 * 36]),
                    'retainedAttributeSha256': {semantic: sha(b''.join(source['rawAttributes'][semantic][index] for index in source_used)) for semantic in ('POSITION', 'NORMAL', 'COLOR_0')},
                    'additionAttributesAndWindingPreserved': True})
    return packed, receipt


def analyze(source_raw, native_raw, repair=False):
    require(sha(source_raw) == SOURCE_SHA256, 'Frozen predecessor SHA256 mismatch')
    source, native = decode(source_raw), decode(native_raw)
    require(native['document']['nodes'][0].get('name') == FAMILY, 'Unexpected authored source object')
    additions, report = classify(source, native)
    report.update(geometry_guard(native))
    added_points = [native['attributes']['POSITION'][index] for index in {index for number in additions for index in native['triangles'][number]}]
    added_bounds = [[min(point[axis] for point in added_points), max(point[axis] for point in added_points)] for axis in range(3)]
    require(all(-32.50002 <= point[0] <= 2.50002 and -6.99002 <= point[2] <= -4.19998 and 39.67 <= point[1] <= 48.90002 for point in added_points), 'New construction exceeds the V3 hoist envelope')
    expected_added = [[-32.5,2.5],[39.74372673423227,48.9],[-6.99,-4.2]]
    require(all(abs(added_bounds[a][b]-expected_added[a][b])<=2e-4 for a in range(3) for b in range(2)), 'V3 hoist bounds drift')
    report.update(addedBoundsGltf=added_bounds, newHoistStaysAboveOriginalClearance=True)
    report.update({'sourceSha256': sha(source_raw), 'nativeSha256': sha(native_raw), 'nativeFormats': native['formats'],
                   'scope': 'Source-only exact retained attribute check/repair; no Blender, runtime install, render or art acceptance.',
                   'status': 'native-retained-exact' if report['nativeRetainedAttributesExact'] else 'native-retained-attribute-drift'})
    output = None
    if repair:
        output, proof = reconstruct(source, native, additions)
        report.update(status='retained-attributes-restored', outputSha256=sha(output), outputBytes=len(output), final=proof)
    return output, report


def write_new(path, data):
    with path.open('xb') as stream:
        stream.write(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--native', type=Path, required=True)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--receipt', type=Path, required=True)
    parser.add_argument('--check-only', action='store_true')
    args = parser.parse_args()
    require(args.check_only == (args.output is None), 'Use --check-only without --output, or --output for repair')
    for path in [args.receipt] + ([args.output] if args.output else []):
        require(path.resolve().is_relative_to(HERE) and path.resolve() not in {SOURCE.resolve(), args.native.resolve()}, 'Outputs must be new source-folder files, separate from both inputs')
        require(not path.exists() and path.parent.is_dir(), 'Output exists or parent missing: ' + str(path))
    require(args.output is None or args.output.resolve() != args.receipt.resolve(), 'Output/receipt paths collide')
    source_raw, native_raw = SOURCE.read_bytes(), args.native.read_bytes()
    output, report = analyze(source_raw, native_raw, repair=not args.check_only)
    require(SOURCE.read_bytes() == source_raw and args.native.read_bytes() == native_raw, 'Input changed during processing')
    report.update(nativePath=str(args.native.resolve()), nativeInputPreserved=True, packerSha256=sha(Path(__file__).read_bytes()), outputPath=str(args.output.resolve()) if args.output else None)
    if output is not None:
        write_new(args.output, output)
    write_new(args.receipt, (json.dumps(report, indent=2, sort_keys=True) + '\n').encode())
    print(json.dumps({'status': report['status'], 'receipt': str(args.receipt), 'output': str(args.output) if args.output else None}))
    return 2 if args.check_only and not report['nativeRetainedAttributesExact'] else 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, KeyError, IndexError, struct.error, OSError) as error:
        print('STOP: ' + str(error), file=sys.stderr)
        sys.exit(1)
