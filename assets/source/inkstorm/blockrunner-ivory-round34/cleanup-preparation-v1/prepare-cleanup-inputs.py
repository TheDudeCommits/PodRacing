"""Bounded offline preparer. Reads own pinned Ivory GLB and saved correspondence; no Blender execution."""
import ast
import collections
import hashlib
import json
import math
import struct
import zipfile
from pathlib import Path

BASE = Path('/Users/amir/Projects/PodRacing/assets/source/inkstorm')
IVORY = BASE / 'blockrunner-ivory-round34'
OUT = IVORY / 'cleanup-preparation-v1'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def fnv(value):
    state = 14695981039346656037
    for c in json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False, ensure_ascii=True):
        state = ((state ^ ord(c)) * 1099511628211) & 18446744073709551615
    return format(state, '016x')


def cyclic(points):
    return min(points, points[1:] + points[:1], points[2:] + points[:2])


def read_npy(data):
    assert data[:6] == b'\x93NUMPY'
    version = data[6]
    assert version in (1, 2)
    start = 10 if version == 1 else 12
    size = struct.unpack_from('<H' if version == 1 else '<I', data, 8)[0]
    header = ast.literal_eval(data[start:start + size].decode())
    assert not header['fortran_order'] and header['descr'] in ('<i8', '<f8')
    count = math.prod(header['shape'])
    values = list(struct.unpack_from('<' + ('q' if header['descr'] == '<i8' else 'd') * count, data, start + size))
    assert start + size + count * 8 == len(data)
    if len(header['shape']) == 1:
        return values
    assert len(header['shape']) == 2
    width = header['shape'][1]
    return [values[i:i + width] for i in range(0, count, width)]


inputs_path = IVORY / 'preparation-v1/operation-inputs.json'
copy_path = IVORY / 'source-copy-executed-v1-receipt.json'
audit_path = IVORY / 'audit-executed-v2-receipt.json'
inputs = json.loads(inputs_path.read_text())
copy = json.loads(copy_path.read_text())
audit = json.loads(audit_path.read_text())
assert copy['copyPassed'] and copy['sourcePreserved'] and copy['sourceCornerNormalsPreserved']
assert copy['copyAudit']['objects'] == 55 and copy['copyAudit']['uniqueMeshes'] == 51 and copy['copyAudit']['materials'] == 51
assert copy['copyAudit']['actualTriangles'] == 48384
assert all(r['status'] == 'ORDERED_POSITION_UV_AND_TOPOLOGY_PASS' for r in copy['directSourcePolygonBridge'])
glb_path = Path(inputs['sourceGlb'])
raw = glb_path.read_bytes()
assert sha(raw) == inputs['sourceSha256'] == copy['sourceGlbSha256'] == '2ed231e15b8bbab3f7b7028b73e8b6f442d532c9bc4d1fc0a2f5c40aeda49576'
assert len(raw) == 2868492
json_size = struct.unpack_from('<I', raw, 12)[0]
doc = json.loads(raw[20:20 + json_size])
binary = raw[28 + json_size:]
assert len(doc['nodes']) == 55 and len(doc['meshes']) == 51 and len(doc['materials']) == 51


def accessor(index):
    a = doc['accessors'][index]
    view = doc['bufferViews'][a['bufferView']]
    assert not a.get('sparse')
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
    code = {5126: 'f', 5125: 'I', 5123: 'H', 5121: 'B'}[a['componentType']]
    fmt = '<' + code * width
    size = struct.calcsize(fmt)
    offset = view.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = view.get('byteStride', size)
    return [struct.unpack_from(fmt, binary, offset + i * stride) for i in range(a['count'])]


bridge = {r['sourceObject']: r for r in copy['directSourcePolygonBridge']}
lineage = {r['sourceObject']: r for r in copy['copyAudit']['objectLineage']}
audit_rows = {r['name']: r for r in audit['namedMeshReferences']}
meshes = []
first = 0
for node in doc['nodes']:
    if 'mesh' not in node:
        continue
    name = node['name']
    primitives = doc['meshes'][node['mesh']]['primitives']
    assert len(primitives) == 1
    primitive = primitives[0]
    assert primitive.get('mode', 4) == 4
    pos = accessor(primitive['attributes']['POSITION'])
    uv = accessor(primitive['attributes']['TEXCOORD_0'])
    indices = [v[0] for v in accessor(primitive['indices'])]
    assert len(indices) % 3 == 0
    coords = [(v[0], -v[2], v[1]) for v in pos]
    faces = [tuple(indices[i:i + 3]) for i in range(0, len(indices), 3)]
    groups = collections.defaultdict(list)
    degenerate = []
    for index, face in enumerate(faces):
        points = tuple(coords[i] for i in face)
        a = tuple(points[1][k] - points[0][k] for k in range(3))
        b = tuple(points[2][k] - points[0][k] for k in range(3))
        cross = (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
        if len(set(points)) != 3 or not any(v != 0 for v in cross):
            degenerate.append(index)
            continue
        groups[tuple(sorted(points))].append(index)
    pairs = []
    ambiguous = []
    same_winding = []
    uv_different = []
    for key, group in groups.items():
        if len(group) == 1:
            continue
        if len(group) != 2:
            ambiguous.append(group)
            continue
        a, b = sorted(group)
        pa = tuple(coords[i] for i in faces[a])
        pb = tuple(coords[i] for i in faces[b])
        if cyclic(pa) != cyclic(tuple(reversed(pb))):
            same_winding.append([a, b])
            continue
        uva = {coords[i]: uv[i] for i in faces[a]}
        uvb = {coords[i]: uv[i] for i in faces[b]}
        if uva != uvb:
            uv_different.append([a, b])
            continue
        pairs.append([a, b])
    pairs.sort()
    removed = {b for a, b in pairs}
    retained = [i for i in range(len(faces)) if i not in removed]
    assert bridge[name]['sourceGlbFirstGlobalTriangle'] == first and bridge[name]['triangleCount'] == len(faces)
    row = {'sourceObject': name, 'auditedSourceCopyObject': lineage[name]['copiedObject'],
           'sourceMesh': lineage[name]['sourceMesh'], 'auditedSourceCopyMesh': lineage[name]['copiedMesh'],
           'firstGlobalTriangle': first, 'sourceTriangles': len(faces), 'candidateRemovedCount': len(pairs),
           'proposedRetainedTriangles': len(retained), 'exactOpposedPairsKeepRemove': pairs,
           'pairsFnv1a64': fnv(pairs), 'sourcePolygonsKeptInProposedCopiedOrder': retained if pairs else None,
           'retainedOrderFnv1a64': fnv(retained),
           'sourceMaterial': doc['materials'][primitive['material']]['name'],
           'ambiguousCoincidentGroups': ambiguous, 'sameWindingPairsNotRemoved': same_winding,
           'uvDifferentOpposedPairsNotRemoved': uv_different, 'degeneratePolygonsNotRemoved': degenerate,
           'sourceGeometryFnv1a64': audit_rows[name]['ownMeshFnv1a64'],
           'sourceRawCornerNormals': audit['sourceCornerNormalSignature'][name],
           'directPolygonBridge': bridge[name], 'sourceMatrixWorld': audit_rows[name]['matrixWorld'],
           'sourceMatrixLocal': audit_rows[name]['matrixLocal'],
           'liveExactPairVerificationRequiredBeforeMutation': True}
    meshes.append(row)
    first += len(faces)
assert first == 48384

map_path = Path(inputs['comparison']['mapping'])
with zipfile.ZipFile(map_path) as archive:
    mapping = read_npy(archive.read('colorToIvoryTriangle.npy'))
    permutations = read_npy(archive.read('colorToIvoryCornerPermutationIndex.npy'))
    position_errors = read_npy(archive.read('maxCornerPositionDifference.npy'))
    normal_errors = read_npy(archive.read('maxWorldNormalChord.npy'))
role_path = Path(inputs['pilot']['roleReference'])
roles_source = json.loads(role_path.read_text())
assert roles_source['sourceUid'] == 'a6f14ae799ab40d7ac425f043f824ff8'
assert roles_source['exactSourcePairListMatchesActualCleanup']
pilot_name = inputs['pilot']['sourceContainer']
pilot = next(r for r in meshes if r['sourceObject'] == pilot_name)
assert pilot['firstGlobalTriangle'] == 0 and pilot['sourceTriangles'] == 9656
role_by_polygon = {}
roles = {}
for role, data in roles_source['roles'].items():
    original = data['originalSourcePolygonIndicesIncludingRemovedOpposites']
    color_global = [inputs['pilot']['colourOriginalPilotFirstGlobalTriangle'] + i for i in original]
    ivory_global = [mapping[i] for i in color_global]
    assert all(0 <= i < 9656 for i in ivory_global)
    assert len(set(ivory_global)) == len(ivory_global) == inputs['pilot']['roles'][role]['originalPilotFaces']
    assert all(permutations[i] in (0, 1, 2) and position_errors[i] <= 0.00003 for i in color_global)
    for i in ivory_global:
        assert i not in role_by_polygon
        role_by_polygon[i] = role
    roles[role] = {'sourcePolygonIndices': sorted(ivory_global), 'sourceFaces': len(ivory_global),
                   'basis': 'Saved reviewed Colour semantic membership mapped one-to-one through the pinned correspondence into own Ivory GLB IDs, then executed own Ivory GLB-to-live polygon bridge. No Colour face IDs are used directly as Ivory IDs.',
                   'maximumSavedCornerPositionErrorMeters': max(position_errors[i] for i in color_global),
                   'maximumSavedWorldNormalChord': max(normal_errors[i] for i in color_global)}
assert len(role_by_polygon) == 8256
body = sorted(set(range(9656)) - set(role_by_polygon))
assert len(body) == 1400
body_correspondence = []
for row in inputs['pilot']['containerCorrespondence']:
    if row['colorObject'] == roles_source['sourceObject']:
        continue
    mapped = [mapping[i] for i in range(row['colorFirstTriangle'], row['colorFirstTriangle'] + row['colorTriangleCount'])]
    assert len(set(mapped)) == row['colorTriangleCount'] and set(mapped).issubset(set(body))
    body_correspondence.extend(mapped)
assert len(set(body_correspondence)) == len(body_correspondence) == 1400 and sorted(body_correspondence) == body
for i in body:
    role_by_polygon[i] = 'body-remainder'
assert all(role_by_polygon[a] == role_by_polygon[b] for a, b in pilot['exactOpposedPairsKeepRemove']), 'A pair crosses semantic roles; do not clean it.'
retained = pilot['sourcePolygonsKeptInProposedCopiedOrder']
source_to_proposed = {source: target for target, source in enumerate(retained)}
for role, data in roles.items():
    kept = [i for i in data['sourcePolygonIndices'] if i in source_to_proposed]
    data['proposedRetainedSourcePolygonIndices'] = kept
    data['proposedCleanedPolygonIndices'] = [source_to_proposed[i] for i in kept]
    data['proposedRetainedFaces'] = len(kept)
body_kept = [i for i in body if i in source_to_proposed]
pilot_roles = {'sourceContainer': pilot_name, 'sourceContainerTriangles': 9656,
               'pilotSourceTriangles': 8256, 'bodyRemainderSourceTriangles': 1400,
               'sourceRoles': roles, 'bodyRemainderSourcePolygonIndices': body,
               'proposedBodyRemainderRetainedSourcePolygonIndices': body_kept,
               'proposedBodyRemainderCleanedPolygonIndices': [source_to_proposed[i] for i in body_kept],
               'proposedPilotTriangles': sum(r['proposedRetainedFaces'] for r in roles.values()),
               'proposedBodyRemainderTriangles': len(body_kept),
               'semanticPairsDoNotCrossRoles': True, 'wholeContainerMustNeverBecomePilot': True,
               'masksApplied': False, 'cleanupExecuted': False}
counts = {'sourceObjects': 55, 'sourceMeshObjects': 51, 'sourceMaterials': 51,
          'sourceTriangles': 48384, 'meshesWithExactOpposedCandidates': sum(bool(r['candidateRemovedCount']) for r in meshes),
          'exactOpposedPairs': sum(r['candidateRemovedCount'] for r in meshes),
          'proposedRetainedTriangles': sum(r['proposedRetainedTriangles'] for r in meshes),
          'ambiguousGroupsNotRemoved': sum(len(r['ambiguousCoincidentGroups']) for r in meshes),
          'sameWindingPairsNotRemoved': sum(len(r['sameWindingPairsNotRemoved']) for r in meshes),
          'uvDifferentOpposedPairsNotRemoved': sum(len(r['uvDifferentOpposedPairsNotRemoved']) for r in meshes),
          'degeneratePolygonsNotRemoved': sum(len(r['degeneratePolygonsNotRemoved']) for r in meshes)}
provenance_paths = [glb_path, inputs_path, copy_path, audit_path, map_path, role_path,
                    BASE / 'blockrunner-round34/compare-blockrunner-original-variants.py']
result = {'status': 'OFFLINE PREPARATION ONLY; NO CLEANUP OR MASKS EXECUTED',
          'sourceUid': inputs['sourceUid'], 'sourceGlbSha256': sha(raw),
          'sourceScene': inputs['sourceScene'], 'preservedAuditedCopyScene': copy['targetScene'],
          'requiredFutureCleanupScene': 'PodRacing — Blockrunner Ivory exact opposing cleanup V1 e42fb924b344481ea013c58cb0f52ad7',
          'futureObjectPrefix': 'Blockrunner Ivory cleanup V1 ',
          'detector': {'space': 'Own pinned GLB local float32 positions transformed only by exact axis/sign basis (x,-z,y).',
                       'coordinateTolerance': 0, 'grouping': 'Within each own mesh only; exact sorted coordinate triples.',
                       'eligibility': 'Exactly two nondegenerate triangles; reversed cyclic winding; same material; identical UV at each matched coordinate. No coordinate weld, near search, cross-object merge, alternate triangulation rewrite or beam move.',
                       'keepRule': 'Keep lower own Ivory source polygon index; retain its own corner ordering, UVs, smoothing, materials and authored normals. This does not certify globally outward normals.',
                       'liveGuard': 'Before any later mutation, recompute identical exact coordinate/winding/UV pair set from the audited live source copy and compare all pairs and source signatures. Six-decimal GLB bridge does not substitute for exact live duplicate equality.'},
          'counts': counts, 'meshes': meshes, 'pilotSemanticLineage': pilot_roles,
          'preserveDifferentBeamPositions': inputs['preserveDifferentBeamPositions'],
          'normalPolicy': 'Own live original/source-copy exact raw corner-normal FnV authority, never Colour normals or Colour encoding tolerance. Preserve originals and source copy exactly. If topology reconstruction re-encodes retained normals, measure an Ivory-only bound on a disposable derivative and report it explicitly; no invented exact parity or inherited tolerance.',
          'executionBoundary': 'Prepare a separate deep copy of all55 objects/51meshes/51materials first, retain parent tree and every original local/world transform, then cleanup only independently reverified exact pairs. Source and audited source-copy scenes remain untouched. No masks, fit, paint, export, save, public/runtime change or admission in this preparation.',
          'preservationRequirements': ['Fresh actual all-scene/all-collection/12ID/context snapshot; never pin a stale156scene count.', 'Compare original and audited source-copy geometry/material/transform/hierarchy/rawnormal signatures before and after.', 'Rollback only newly owned derivative IDs on failure; restore exact starting Cruise scene/layer/active/selection.', 'Retain every vertex coordinate, unique geometric surface, UV corner value, material slot, smooth flag and surviving polygon/corner lineage; no normal recalculation.'],
          'provenance': [{'path': str(p), 'bytes': p.stat().st_size, 'sha256': sha(p.read_bytes())} for p in provenance_paths]}
OUT.mkdir(exist_ok=True)
output = OUT / 'operation-inputs.json'
assert not output.exists(), 'Immutable preparation already exists; do not overwrite.'
output.write_text(json.dumps(result, indent=2) + '\n')
summary = {'status': result['status'], 'counts': counts,
           'pilot': {'source': 8256, 'bodyRemainderSource': 1400, 'proposedRetained': pilot_roles['proposedPilotTriangles'],
                     'bodyRemainderProposedRetained': len(body_kept),
                     'roles': {name: {'source': row['sourceFaces'], 'proposedRetained': row['proposedRetainedFaces']} for name, row in roles.items()}},
           'changedMeshCandidates': [{'name': r['sourceObject'], 'before': r['sourceTriangles'], 'remove': r['candidateRemovedCount'], 'after': r['proposedRetainedTriangles'], 'pairsFnv1a64': r['pairsFnv1a64']} for r in meshes if r['candidateRemovedCount']],
           'operationInputs': {'path': str(output), 'bytes': output.stat().st_size, 'sha256': sha(output.read_bytes())},
           'noMcpExecuted': True, 'noMasksApplied': True, 'noRuntimeOrPublicChanges': True}
(OUT / 'prepared-validation.json').write_text(json.dumps(summary, indent=2) + '\n')
print(json.dumps(summary, indent=2))
