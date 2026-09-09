"""External, read-only GLB anatomy analysis. NOT a Blender MCP fragment.

All positional welding is on in-memory analysis arrays. No source GLB, Blender
scene, runtime/public file or mesh is written. Outputs are diagnostic JSON only.
"""
import collections
import hashlib
import itertools
import json
import math
from pathlib import Path
import struct

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / 'vehicles/a6f14ae799ab40d7ac425f043f824ff8/source-imported.glb'
AUDIT = HERE / 'mcp-safe/audit-receipt.json'
OUTPUT = HERE / 'measured-anatomy-analysis.json'
EXPECTED_SHA = '1ecf135bc63df02102f168b79ea869d98aba6d07bdc94b2e0c6f10478a13f96e'
PILOT = 'pasted__LegoTri36_lambert1_0'


def bounds(points):
    return [[min(p[k] for p in points) for k in range(3)],
            [max(p[k] for p in points) for k in range(3)]]


def multiply(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def node_matrix(node):
    if 'matrix' in node:
        return [[node['matrix'][j * 4 + i] for j in range(4)] for i in range(4)]
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    scale = node.get('scale', [1, 1, 1])
    translation = node.get('translation', [0, 0, 0])
    rotation = [[1 - 2 * (y*y + z*z), 2 * (x*y - z*w), 2 * (x*z + y*w)],
                [2 * (x*y + z*w), 1 - 2 * (x*x + z*z), 2 * (y*z - x*w)],
                [2 * (x*z - y*w), 2 * (y*z + x*w), 1 - 2 * (x*x + y*y)]]
    return [[rotation[i][j] * scale[j] if j < 3 else translation[i]
             for j in range(4)] for i in range(3)] + [[0, 0, 0, 1]]


def read_glb(blob):
    magic, version, total, json_length, chunk_type = struct.unpack_from('<5I', blob, 0)
    assert magic == 0x46546C67 and version == 2 and total == len(blob) and chunk_type == 0x4E4F534A
    document = json.loads(blob[20:20 + json_length])
    binary_start = 20 + json_length + 8
    def accessor(index):
        a = document['accessors'][index]
        assert 'sparse' not in a
        view = document['bufferViews'][a['bufferView']]
        components = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        token = {5126: 'f', 5125: 'I', 5123: 'H', 5121: 'B'}[a['componentType']]
        form = '<' + token * components
        stride = view.get('byteStride', struct.calcsize(form))
        offset = binary_start + view.get('byteOffset', 0) + a.get('byteOffset', 0)
        return [struct.unpack_from(form, blob, offset + i * stride) for i in range(a['count'])]
    result = {}
    def visit(index, parent):
        node = document['nodes'][index]
        world = multiply(parent, node_matrix(node))
        if 'mesh' in node:
            positions, faces, materials = [], [], []
            for primitive in document['meshes'][node['mesh']]['primitives']:
                assert primitive.get('mode', 4) == 4
                start = len(positions)
                for p in accessor(primitive['attributes']['POSITION']):
                    v = (*p, 1)
                    q = [sum(world[k][j] * v[j] for j in range(4)) for k in range(3)]
                    positions.append((q[0], -q[2], q[1]))
                indices = [v[0] for v in accessor(primitive['indices'])]
                for i in range(0, len(indices), 3):
                    faces.append(tuple(start + v for v in indices[i:i + 3]))
                materials.append(document['materials'][primitive['material']]['name'])
            result[node['name']] = {'positions': positions, 'faces': faces, 'materials': materials}
        for child in node.get('children', []):
            visit(child, world)
    identity = [[int(i == j) for j in range(4)] for i in range(4)]
    for root in document['scenes'][document.get('scene', 0)]['nodes']:
        visit(root, identity)
    return result


def welded_analysis(mesh, epsilon):
    points, representatives, grid = [], [], collections.defaultdict(list)
    for p in mesh['positions']:
        cell = tuple(math.floor(v / epsilon) for v in p)
        match = None
        for delta in itertools.product((-1, 0, 1), repeat=3):
            for candidate in grid[tuple(cell[i] + delta[i] for i in range(3))]:
                if sum((p[k] - points[candidate][k]) ** 2 for k in range(3)) <= epsilon ** 2:
                    match = candidate
                    break
            if match is not None:
                break
        if match is None:
            match = len(points)
            points.append(p)
            grid[cell].append(match)
        representatives.append(match)
    parent = list(range(len(points)))
    def find(index):
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index
    def join(a, b):
        a, b = find(a), find(b)
        if a != b:
            parent[b] = a
    faces = [tuple(representatives[i] for i in face) for face in mesh['faces']]
    for face in faces:
        join(face[0], face[1]); join(face[1], face[2])
    grouped_faces = collections.defaultdict(list)
    for face in faces:
        grouped_faces[find(face[0])].append(face)
    component_rows = []
    for key, component_faces in grouped_faces.items():
        vertex_ids = sorted({i for face in component_faces for i in face})
        component_points = [points[i] for i in vertex_ids]
        edge_uses = collections.Counter(tuple(sorted((face[i], face[(i+1)%3])))
                                        for face in component_faces for i in range(3))
        box = bounds(component_points)
        component_rows.append({'firstRepresentativeVertex': min(vertex_ids),
                               'triangles': len(component_faces), 'vertices': len(vertex_ids),
                               'bounds': box, 'centerOfBounds': [(a+b)*.5 for a,b in zip(*box)],
                               'boundaryEdges': sum(n == 1 for n in edge_uses.values()),
                               'nonManifoldEdgesOverTwoFaces': sum(n > 2 for n in edge_uses.values()),
                               'degenerateTrianglesAfterAnalysisWeld': sum(len(set(f)) < 3 for f in component_faces)})
    component_rows.sort(key=lambda r: (-r['triangles'], r['firstRepresentativeVertex']))
    return {'epsilonSourceMeters': epsilon, 'originalVertices': len(mesh['positions']),
            'weldedAnalysisVertices': len(points), 'componentCount': len(component_rows),
            'components': component_rows}


def plane_samples(mesh):
    points = sorted(set(mesh['positions']))
    y_max = max(p[1] for p in points)
    rows = []
    for depth in (0, .005, .01, .02, .04, .08, .12):
        plane = y_max - depth
        selected = [p for p in points if abs(p[1] - plane) <= .001]
        if selected:
            box = bounds(selected)
            center = ((box[0][0]+box[1][0])*.5, (box[0][2]+box[1][2])*.5)
            radii = sorted(math.hypot(p[0]-center[0], p[2]-center[1]) for p in selected)
            rows.append({'sourceY': plane, 'tolerance': .001, 'vertices': len(selected),
                         'bounds': box, 'xzBoundsCenter': list(center),
                         'radialRangeAroundBoundsCenter': [radii[0], radii[-1]],
                         'points': selected})
    return rows


blob = SOURCE.read_bytes()
assert hashlib.sha256(blob).hexdigest() == EXPECTED_SHA
assert not OUTPUT.exists(), 'Preserve prior diagnostic output.'
audit = json.loads(AUDIT.read_text())
assert audit['status'] == 'measured' and audit['sourcePreservation']
assert audit['sourceSignature']['objectsFnv1a64'] == 'd85efeecc74d9485'
meshes = read_glb(blob)
audit_rows = {row['name']: row for row in audit['objects'] if row['type'] == 'MESH'}
comparison = []
for name, mesh in meshes.items():
    box = bounds(mesh['positions'])
    max_error = max(abs(box[i][k]-audit_rows[name]['bounds'][i][k]) for i in range(2) for k in range(3))
    assert max_error <= .002 and len(mesh['faces']) == audit_rows[name]['triangles']
    comparison.append({'name': name, 'triangles': len(mesh['faces']), 'bounds': box,
                       'maxAuditBoundError': max_error, 'materials': mesh['materials']})
pilot = [welded_analysis(meshes[PILOT], epsilon) for epsilon in (1e-6, 1e-5, 1e-4)]
rear_names = ['pasted__L1x1Stud5_Black_Jets_0', 'pasted__pasted__L1x1Stud5_Black_Jets_0']
rear = {name: {'weldedTopology': welded_analysis(meshes[name], 1e-5),
               'rearAxisSamples': plane_samples(meshes[name])} for name in rear_names}
result = {'source': str(SOURCE), 'sourceSha256': EXPECTED_SHA,
          'audit': str(AUDIT), 'auditObjectFnv1a64': 'd85efeecc74d9485',
          'scope': 'External analysis arrays only; coordinate weld is not saved into source or any derivative.',
          'coordinateBasis': 'Original source Blender meters, before gameplay normalization.',
          'referenceComparison': comparison, 'pilotCandidateObject': PILOT,
          'pilotWeldToleranceStudies': pilot, 'rearEngineCandidateStudies': rear}
OUTPUT.write_text(json.dumps(result, indent=2) + '\n')
assert SOURCE.read_bytes() == blob, 'Source modified during analysis.'
print(json.dumps({'output': str(OUTPUT), 'sourceUnchanged': True,
                  'actualSceneTriangles': sum(len(m['faces']) for m in meshes.values()),
                  'pilot': [{'epsilon': p['epsilonSourceMeters'], 'components': p['componentCount'],
                             'vertices': p['weldedAnalysisVertices'],
                             'largest': p['components'][:12]} for p in pilot]}, indent=2))
