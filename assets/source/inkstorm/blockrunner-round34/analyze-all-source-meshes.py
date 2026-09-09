"""External analysis only. Source byte preservation is checked on exit.

No Blender calls or asset mutations. Exact coordinate duplicate removal and
position welding below describe diagnostic arrays, never a saved derivative.
"""
import collections
import hashlib
import itertools
import json
import math
from pathlib import Path
import struct
from source_geometry_analysis_helpers import SOURCE, AUDIT, HERE, PILOT, EXPECTED_SHA, read_glb, bounds

OUTPUT = HERE / 'all-mesh-topology-analysis.json'


def topology_after_exact_dedup(mesh, epsilon=1e-5):
    coordinate_groups = collections.defaultdict(list)
    source_near_zero_area = []
    for index, face in enumerate(mesh['faces']):
        coordinate_groups[tuple(sorted(mesh['positions'][i] for i in face))].append(index)
        a,b,c = [mesh['positions'][i] for i in face]
        ab,ac = [b[k]-a[k] for k in range(3)],[c[k]-a[k] for k in range(3)]
        cross = (ab[1]*ac[2]-ab[2]*ac[1], ab[2]*ac[0]-ab[0]*ac[2], ab[0]*ac[1]-ab[1]*ac[0])
        if sum(value*value for value in cross) <= 1e-24:
            source_near_zero_area.append(index)
    kept_ids = [indices[0] for indices in coordinate_groups.values()]
    duplicates = []
    for coordinates, indices in coordinate_groups.items():
        if len(indices) <= 1:
            continue
        order = {coordinate: i for i, coordinate in enumerate(coordinates)}
        parity = collections.Counter()
        for index in indices:
            face = [order[mesh['positions'][i]] for i in mesh['faces'][index]]
            parity[sum(face[i] > face[j] for i in range(3) for j in range(i+1, 3)) % 2] += 1
        duplicates.append({'sourceTriangleIndices': indices, 'windingParityCounts': dict(parity),
                           'opposed': len(parity) > 1})
    points, grid, remap = [], collections.defaultdict(list), []
    for p in mesh['positions']:
        cell = tuple(math.floor(v / epsilon) for v in p)
        found = None
        for delta in itertools.product((-1, 0, 1), repeat=3):
            for candidate in grid[tuple(cell[k]+delta[k] for k in range(3))]:
                if sum((p[k]-points[candidate][k])**2 for k in range(3)) <= epsilon**2:
                    found = candidate; break
            if found is not None:
                break
        if found is None:
            found = len(points); points.append(p); grid[cell].append(found)
        remap.append(found)
    faces = [tuple(remap[v] for v in mesh['faces'][index]) for index in kept_ids]
    edges = collections.defaultdict(list)
    degenerate = []
    for index, face in enumerate(faces):
        if len(set(face)) < 3:
            degenerate.append(index)
        for a, b in zip(face, face[1:]+face[:1]):
            edges[tuple(sorted((a, b)))].append((index, a, b))
    neighbors = collections.defaultdict(list)
    for uses in edges.values():
        for a in uses:
            for b in uses:
                if a[0] < b[0]:
                    same_direction = a[1:] == b[1:]
                    relation = -1 if same_direction else 1
                    neighbors[a[0]].append((b[0], relation))
                    neighbors[b[0]].append((a[0], relation))
    components = []
    seen = set()
    for root in range(len(faces)):
        if root in seen:
            continue
        orientation = {root: 1}; queue = [root]; conflicts = set()
        for current in queue:
            for nxt, relation in neighbors[current]:
                expected = orientation[current] * relation
                if nxt in orientation:
                    if orientation[nxt] != expected:
                        conflicts.add(tuple(sorted((current, nxt))))
                else:
                    orientation[nxt] = expected; queue.append(nxt)
        seen.update(queue)
        component_ids = set(queue)
        component_edges = [uses for uses in edges.values() if uses[0][0] in component_ids]
        vertex_ids = sorted({v for index in queue for v in faces[index]})
        box = bounds([points[v] for v in vertex_ids])
        center = [(a+b)*.5 for a,b in zip(*box)]
        volume = 0
        for index, sign in orientation.items():
            a, b, c = [[points[v][k]-center[k] for k in range(3)] for v in faces[index]]
            cross = (b[1]*c[2]-b[2]*c[1], b[2]*c[0]-b[0]*c[2], b[0]*c[1]-b[1]*c[0])
            volume += sign * sum(a[k]*cross[k] for k in range(3)) / 6
        boundary = sum(len(uses) == 1 for uses in component_edges)
        nonmanifold = sum(len(uses) > 2 for uses in component_edges)
        components.append({'firstSourceTriangle': kept_ids[root], 'triangles': len(queue),
                           'vertices': len(vertex_ids), 'bounds': box,
                           'boundaryEdges': boundary, 'nonManifoldEdgesOverTwoFaces': nonmanifold,
                           'orientationConflicts': len(conflicts),
                           'trianglesRequiringFlipForLocalConsistency': sum(sign < 0 for sign in orientation.values()),
                           'signedVolumeWithConsistentOrientation': volume,
                           'closedManifold': boundary == 0 and nonmanifold == 0 and not conflicts})
    closed = [c for c in components if c['closedManifold']]
    return {'triangles': len(mesh['faces']), 'uniqueExactCoordinateTriangles': len(kept_ids),
            'sourceNearZeroAreaTrianglesAt1eMinus12DoubleArea': len(source_near_zero_area),
            'sourceNearZeroAreaTriangleIndices': source_near_zero_area,
            'exactDuplicateGroups': len(duplicates),
            'exactOpposedGroups': sum(d['opposed'] for d in duplicates),
            'exactSameWindingOnlyGroups': sum(not d['opposed'] for d in duplicates),
            'redundantTriangles': len(mesh['faces'])-len(kept_ids),
            'weldAnalysisToleranceMeters': epsilon,
            'weldAnalysisVertices': len(points),
            'degenerateTrianglesAfterAnalysisWeld': len(degenerate),
            'componentCountAfterExactDedupAndAnalysisWeld': len(components),
            'closedManifoldComponents': len(closed),
            'closedComponentsWithNonzeroVolume': sum(abs(c['signedVolumeWithConsistentOrientation']) > 1e-12 for c in closed),
            'openBoundaryComponents': sum(c['boundaryEdges'] > 0 for c in components),
            'nonManifoldComponents': sum(c['nonManifoldEdgesOverTwoFaces'] > 0 for c in components),
            'orientationConflictComponents': sum(c['orientationConflicts'] > 0 for c in components),
            'components': sorted(components, key=lambda c: -c['triangles']),
            'duplicateGroups': duplicates}


def accessor(document, blob, start, index):
    data = document['accessors'][index]; view = document['bufferViews'][data['bufferView']]
    token = {5126: 'f', 5125: 'I', 5123: 'H', 5121: 'B'}[data['componentType']]
    count = {'SCALAR': 1, 'VEC3': 3}[data['type']]
    form = '<'+token*count; stride = view.get('byteStride', struct.calcsize(form))
    offset = start + view.get('byteOffset', 0) + data.get('byteOffset', 0)
    return [struct.unpack_from(form, blob, offset+i*stride) for i in range(data['count'])]


def dot(a, b):
    return sum(x*y for x,y in zip(a,b))


def normalized(value):
    length = math.sqrt(dot(value, value))
    return tuple(v/length for v in value) if length else (0,0,0)


def source_normal_evidence(document, blob, binary_start, row, mesh):
    gltf_mesh = next(m for m in document['meshes'] if m['name'] == row['name'])
    assert len(gltf_mesh['primitives']) == 1
    primitive = gltf_mesh['primitives'][0]
    positions = accessor(document, blob, binary_start, primitive['attributes']['POSITION'])
    normals = accessor(document, blob, binary_start, primitive['attributes']['NORMAL'])
    indices = [i[0] for i in accessor(document, blob, binary_start, primitive['indices'])]
    faces = [tuple(indices[i:i+3]) for i in range(0,len(indices),3)]
    alignment = []; paired = []
    for face in faces:
        a,b,c = [positions[i] for i in face]
        ab,ac = [b[k]-a[k] for k in range(3)],[c[k]-a[k] for k in range(3)]
        cross = normalized((ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]))
        n = normalized(tuple(sum(normals[i][k] for i in face) for k in range(3)))
        alignment.append(dot(cross,n))
    for group in row['duplicateGroups']:
        if len(group['sourceTriangleIndices']) != 2:
            continue
        a,b = [faces[i] for i in group['sourceTriangleIndices']]
        lookup = {positions[i]: normals[i] for i in b}
        if all(positions[i] in lookup for i in a):
            paired.extend(dot(normalized(normals[i]),normalized(lookup[positions[i]])) for i in a)
    material_index = primitive['material']
    return {'material': document['materials'][material_index]['name'],
            'doubleSided': document['materials'][material_index].get('doubleSided',False),
            'faceNormalVsMeanAuthoredNormal': {'alignedOver0p9':sum(v>.9 for v in alignment),
                                             'opposedBelowMinus0p9':sum(v<-.9 for v in alignment),
                                             'other':sum(-.9<=v<=.9 for v in alignment),
                                             'minimum':min(alignment),'maximum':max(alignment)},
            'pairedCoincidentCornerNormalDots': {'samples':len(paired),
                                                'opposedBelowMinus0p99':sum(v<-.99 for v in paired),
                                                'alignedOver0p99':sum(v>.99 for v in paired),
                                                'minimum':min(paired) if paired else None,
                                                'maximum':max(paired) if paired else None},
            'zeroNormalVertices':sum(dot(n,n)<1e-12 for n in normals)}


def vertical_hits(mesh, x, y):
    hits=[]
    for face in mesh['faces']:
        a,b,c=[mesh['positions'][i] for i in face]
        denominator=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(denominator)<1e-15:continue
        u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/denominator
        v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/denominator
        w=1-u-v
        if min(u,v,w)>=-1e-7:
            hits.append(u*a[2]+v*b[2]+w*c[2])
    return hits


blob=SOURCE.read_bytes();assert hashlib.sha256(blob).hexdigest()==EXPECTED_SHA
assert not OUTPUT.exists()
meshes=read_glb(blob)
length=struct.unpack_from('<I',blob,12)[0];document=json.loads(blob[20:20+length]);binary_start=20+length+8
rows=[]
for name,mesh in meshes.items():
    row=topology_after_exact_dedup(mesh);row['name']=name;row['materials']=mesh['materials']
    row['sourceNormals']=source_normal_evidence(document,blob,binary_start,row,mesh)
    rows.append(row)
seat_samples=[]
floor_names=['pasted__L4x8F_pasted__Lego_White8_0','pasted__pasted__L4x8F_pasted__pasted__Lego_White8_0']
for label,x,y in [('left-foot-center',-.109646,-20.28046),('right-foot-center',.264058,-20.28047),
                   ('center-under-pelvis',.077204,-20.10342)]:
    floor=[(name,z) for name in floor_names for z in vertical_hits(meshes[name],x,y)]
    pilot=[z for z in vertical_hits(meshes[PILOT],x,y) if z<2.12]
    seat_samples.append({'label':label,'x':x,'y':y,'floorTop':max(z for _,z in floor) if floor else None,
                         'pilotLowestHitBelow2p12':min(pilot) if pilot else None,
                         'gap':min(pilot)-max(z for _,z in floor) if floor and pilot else None})
controls=[]
for name in ['pasted__brick230_phongE2_0','pasted__pasted__brick230_phongE2_0']:
    pilot_points=sorted(set(p for p in meshes[PILOT]['positions'] if 2.3<=p[2]<=2.65 and p[1]<-20.35))
    control_points=sorted(set(meshes[name]['positions']))
    best=min((sum((a[k]-b[k])**2 for k in range(3)),a,b)for a in pilot_points for b in control_points)
    controls.append({'controlObject':name,'longitudinalGapLowerBound':min(p[1]for p in meshes[PILOT]['positions'])-max(p[1]for p in control_points),
                     'handRegionToControlNearestVertexDistance':math.sqrt(best[0]),'pilotVertex':best[1],'controlVertex':best[2],
                     'scope':'Vertex-sample distance, not exact surface-to-surface or accepted grip anchor.'})
summary={'meshOccurrences':len(rows),'sourceTriangles':sum(r['triangles']for r in rows),
         'uniqueExactCoordinateTrianglesWithinEachOccurrence':sum(r['uniqueExactCoordinateTriangles']for r in rows),
         'exactDuplicateGroups':sum(r['exactDuplicateGroups']for r in rows),
         'exactOpposedGroups':sum(r['exactOpposedGroups']for r in rows),
         'exactSameWindingOnlyGroups':sum(r['exactSameWindingOnlyGroups']for r in rows),
         'redundantTriangles':sum(r['redundantTriangles']for r in rows),
         'sourceNearZeroAreaTrianglesAt1eMinus12DoubleArea':sum(r['sourceNearZeroAreaTrianglesAt1eMinus12DoubleArea']for r in rows),
         'affectedMeshOccurrences':sum(r['exactDuplicateGroups']>0 for r in rows),
         'allMaterialsDoubleSided':all(r['sourceNormals']['doubleSided'] for r in rows),
         'closedManifoldComponents':sum(r['closedManifoldComponents']for r in rows),
         'openBoundaryComponents':sum(r['openBoundaryComponents']for r in rows),
         'nonManifoldComponents':sum(r['nonManifoldComponents']for r in rows),
         'orientationConflictComponents':sum(r['orientationConflictComponents']for r in rows)}
result={'source':str(SOURCE),'sourceSha256':EXPECTED_SHA,'audit':str(AUDIT),
        'scope':'All 59 occurrences, exact within-mesh coordinate duplicates and external-copy topology only. No source mutation or accepted cleanup.',
        'summary':summary,'meshes':rows,'seatSamples':seat_samples,'controlGaps':controls}
OUTPUT.write_text(json.dumps(result,indent=2)+'\n');assert SOURCE.read_bytes()==blob
print(json.dumps({'output':str(OUTPUT),'sourceUnchanged':True,'summary':summary,'seatSamples':seat_samples,'controlGaps':controls},indent=2))
