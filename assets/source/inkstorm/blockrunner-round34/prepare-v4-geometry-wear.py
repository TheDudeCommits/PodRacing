"""External V4 mask preparation from the actual read-only V2 topology receipt.

Only JSON/Python preparation artifacts are written. No Blender, GLB edit,
mesh authoring, browser, render or public/runtime output occurs here.
"""
import collections
import hashlib
import itertools
import json
import math
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
SAFE = HERE / 'mcp-safe'
TOPOLOGY = SAFE / 'paint-v2-wear-topology-receipt.json'
AUTHOR = SAFE / 'paint-author-v2-receipt.json'
PILOT = HERE / 'pilot-paint-face-lineage-v1.json'
SOURCE = HERE.parent / 'vehicles/a6f14ae799ab40d7ac425f043f824ff8/source-imported.glb'
SOURCE_SHA = '1ecf135bc63df02102f168b79ea869d98aba6d07bdc94b2e0c6f10478a13f96e'


def fnv(value):
    h = 14695981039346656037
    for c in json.dumps(value, sort_keys=True, separators=(',', ':'), allow_nan=False, ensure_ascii=True):
        h = ((h ^ ord(c)) * 1099511628211) & 18446744073709551615
    return format(h, '016x')


def bounds(points):
    return [np.min(points, axis=0).tolist(), np.max(points, axis=0).tolist()]


def group_name(name):
    if 'LegoTri36' in name:
        return 'pilot'
    if 'added-control-mount' in name or 'brick230' in name:
        return 'controls'
    if 'L2x2Circle' in name:
        return 'disk'
    if 'polySurface97' in name:
        return 'sidewall'
    if 'L1x1Stud4' in name:
        return 'intake'
    if 'L1x1Stud5' in name or 'L1x20' in name:
        return 'cowl'
    if 'pCylinder4' in name:
        return 'engine_top_fitting'
    if 'L1x4F' in name or 'L2F_' in name:
        return 'rail'
    if 'L2x6_' in name:
        return 'crossbeam'
    if 'Slope' in name or 'slope' in name or 'LegoTri8_' in name:
        return 'ivory_slope'
    if 'L4x8F' in name or 'brick231' in name:
        return 'cockpit_deck'
    return 'ivory_body'


def analysis_weld(vertex_ids, vertices, epsilon=1e-5):
    # Analysis only. Neither V2 vertices nor the derivative vertices are welded.
    grid = collections.defaultdict(list)
    mapping = {}
    for vi in sorted(vertex_ids):
        point = vertices[vi]
        cell = tuple(math.floor(c / epsilon) for c in point)
        found = None
        for delta in itertools.product((-1, 0, 1), repeat=3):
            if found is not None:
                break
            for candidate in grid[tuple(cell[k] + delta[k] for k in range(3))]:
                if np.dot(vertices[candidate] - point, vertices[candidate] - point) <= epsilon * epsilon:
                    found = candidate
                    break
        if found is None:
            found = vi
            grid[cell].append(vi)
        mapping[vi] = found
    return mapping


def components(face_ids, faces):
    # The intake pieces are exactly connected in the actual V2 point topology.
    parent = {}
    def find(v):
        parent.setdefault(v, v)
        while parent[v] != v:
            parent[v] = parent[parent[v]]
            v = parent[v]
        return v
    for fi in face_ids:
        a, b, c = map(int, faces[fi])
        ra, rb, rc = find(a), find(b), find(c)
        parent[rb] = ra
        parent[rc] = ra
    result = collections.defaultdict(list)
    for fi in face_ids:
        result[find(int(faces[fi, 0]))].append(fi)
    return sorted(result.values(), key=lambda f: (-len(f), min(f)))


def bell(value, center, width):
    return math.exp(-((value - center) / width) ** 2)


def angle_bell(angle, center, width):
    delta = math.atan2(math.sin(angle-center), math.cos(angle-center))
    return math.exp(-(delta / width) ** 2)


def contact_weight(group, midpoint, box, outward_z, outward_x, source_name):
    lo, hi = np.asarray(box[0]), np.asarray(box[1])
    center = (lo + hi) * .5
    x, y, z = midpoint
    if group == 'intake':
        cx = -2.204925 if center[0] < 0 else 2.253886
        radius = math.hypot(x-cx, z-.847100)
        angle = math.atan2(z-.847100, x-cx)
        arc = max(angle_bell(angle, .80 if cx < 0 else 2.05, .48),
                  .7 * angle_bell(angle, -2.00 if cx < 0 else -.65, .34))
        rim = bell(radius, .635, .09) * bell(y, -28.35, .13)
        return .95 * rim * arc
    if group == 'cowl':
        cx = -2.204925 if center[0] < 0 else 2.253886
        angle = math.atan2(z-.847100, x-cx)
        shoulders = max(angle_bell(angle, .90 if cx < 0 else 2.10, .42),
                        .50 * angle_bell(angle, -1.8 if cx < 0 else -.5, .32))
        ends = max(bell(y, lo[1], .16), .55 * bell(y, hi[1], .13))
        return .72 * shoulders * ends
    if group == 'engine_top_fitting':
        return .30 * max(outward_z, 0) * bell(y, lo[1], .3)
    if group == 'rail':
        zones = max(bell(y, -25.65, .52), .72 * bell(y, -22.65, .46))
        return .85 * zones * max(.2, outward_z) if z > lo[2] + .025 else 0
    if group == 'crossbeam':
        zones = max(bell(x, lo[0], .24), .7 * bell(x, hi[0], .18))
        return .62 * zones * max(.15, outward_z) if z > lo[2] + .06 else 0
    if group == 'sidewall':
        outer_x = lo[0] if center[0] < 0 else hi[0]
        outside = bell(x, outer_x, .045)
        corners = max(bell(y, lo[1], .40), .65 * bell(y, hi[1], .32),
                      .5 * bell(z, hi[2], .085))
        return .68 * outside * corners * max(.35, outward_x)
    if group == 'disk':
        angle = math.atan2(z-center[2], y-center[1])
        # Nearby disks receive different explicit physical arc directions.
        phase = .65 if center[1] < -21 else (2.0 if center[1] < -19.5 else -.55)
        radius = math.hypot(y-center[1], z-center[2])
        arc = max(angle_bell(angle, phase, .44), .48 * angle_bell(angle, phase+2.15, .27))
        return .78 * bell(radius, .344, .033) * arc
    if group == 'ivory_slope':
        # Leading corner and a shorter off-center handling zone; not every edge.
        return .54 * max(bell(y, lo[1], .20) * bell(x, lo[0], .35),
                         .55 * bell(y, hi[1], .15) * bell(x, center[0]+.22, .24)) * max(.3, outward_z)
    if group == 'cockpit_deck':
        # Exposed boarding/deck margins. Keep the seated center quiet.
        side = max(bell(x, -1.2, .20), .7 * bell(x, 1.30, .20))
        return .42 * side * bell(y, -21.90, .65) * max(0, outward_z)
    if group == 'ivory_body':
        return .36 * bell(y, lo[1], .16) * bell(x, hi[0], .27) * max(.15, outward_z)
    # Grips, supports and pilot anatomy receive no chipped-paint wear.
    return 0


assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == SOURCE_SHA
topology = json.loads(TOPOLOGY.read_text())
author = json.loads(AUTHOR.read_text())
pilot_lineage = json.loads(PILOT.read_text())
assert topology['paintPreserved'] and topology['paintCornerNormalsPreserved']
assert fnv(topology['paintSignature']) == '9e45fb9bc1a499ab'
assert author['paintSignature']['objectsFnv1a64'] == 'c8da6bd752d2485a'

data = {'sourceUid': topology['sourceUid'], 'sourceSha256': SOURCE_SHA,
        'parentScene': topology['targetScene'], 'parentPaintSignatureFnv1a64': fnv(topology['paintSignature']),
        'parentPaintCornerNormalSignature': topology['paintCornerNormalSignature'],
        'distanceAttribute': 'Inkstorm V4 Edge Distance',
        'strengthAttribute': 'Inkstorm V4 Edge Strength',
        'sparseRecordLayout': '8 hex characters: polygon(4), three opposite-edge strengths(1 each), flags(1); flags low2=concave opposite edge+1, high2=surface accent code',
        'owners': {}}
analysis = {'sourceTopologyReceiptSha256': hashlib.sha256(TOPOLOGY.read_bytes()).hexdigest(),
            'sourceAuthorReceiptSha256': hashlib.sha256(AUTHOR.read_bytes()).hexdigest(),
            'sourceUnchanged': True, 'status': 'Prepared mask authority, not an executed paint result',
            'analysisOnlyCoordinateWeldEpsilon': 1e-5,
            'hardEdgeMinimumDegrees': 30,
            'sourceModification': 'None. Color attributes are intended only on a later exact V2 copy.',
            'authority': 'Actual V2 coordinates, effective triangle winding and object lineage. Convex dihedral/boundary candidates are filtered by explicitly located contact zones. Wear placement is an artist interpretation, not simulated history.',
            'objects': [], 'owners': {}}

for mesh in topology['meshes']:
    owner = 'body' if 'body' in mesh['name'] else 'pilot'
    vertices = np.asarray(mesh['vertices'], dtype=float)
    polygons = np.asarray(mesh['polygons'], dtype=int)
    faces = polygons[:, :3]
    points = vertices[faces]
    cross = np.cross(points[:, 1]-points[:, 0], points[:, 2]-points[:, 0])
    double_area = np.linalg.norm(cross, axis=1)
    assert np.all(double_area > 1e-12)
    normals = cross / double_area[:, None]
    centers = points.mean(axis=1)
    weights = np.zeros((len(faces), 3), dtype=np.uint8)
    concave = np.zeros(len(faces), dtype=np.uint8)
    accent = np.zeros(len(faces), dtype=np.uint8)
    edge_stats = collections.Counter()
    width = .055 if owner == 'body' else .022
    dirt_width = .065 if owner == 'body' else .018
    for row in [r for r in author['objectLineage'] if r['copiedObject'] == mesh['name']]:
        ids = list(range(row['firstCopiedPolygon'], row['firstCopiedPolygon'] + row['polygonCount']))
        vertex_ids = set(map(int, faces[ids].ravel()))
        box = bounds(vertices[sorted(vertex_ids)])
        group = group_name(row['sourceObject'])
        component_records = []
        if group == 'intake':
            cx = -2.204925 if box[0][0] < 0 else 2.253886
            for comp in components(ids, faces):
                comp_vertices = vertices[np.unique(faces[comp])]
                radial = np.hypot(comp_vertices[:, 0]-cx, comp_vertices[:, 2]-.847100)
                kind = 'casing_or_stud'
                if len(comp) == 8 and radial.min() < .12 and .64 < radial.max() < .70:
                    kind = 'blade'
                    accent[comp] = 1
                elif radial.max() < .20 and len(comp) in {280, 160, 120}:
                    kind = 'hub'
                    accent[comp] = 2
                component_records.append({'firstV2Polygon': min(comp), 'v2PolygonIndices': comp,
                    'triangles': len(comp), 'bounds': bounds(comp_vertices),
                    'radialFromMeasuredEngineAxis': [float(radial.min()), float(radial.max())], 'classification': kind})
            assert np.count_nonzero(accent[ids] == 1) == 80
            assert np.count_nonzero(accent[ids] == 2) == 560
        if group == 'pilot':
            # Exact existing suit role plus world-facing geometry. A soft value
            # panel follows the large front torso faces and raised shoulders;
            # no new eye/visor/helmet faces or anatomy are invented.
            suit_ids = np.nonzero(polygons[:, 3] == 0)[0]
            for fi in suit_ids:
                c, n = centers[fi], normals[fi]
                if 2.27 < c[2] < 2.62 and n[1] < -.45:
                    accent[fi] = 1
                if c[2] > 2.47 and n[2] > .55:
                    accent[fi] = 2
        weld = analysis_weld(vertex_ids, vertices)
        edges = collections.defaultdict(list)
        for fi in ids:
            for opposite in range(3):
                va = int(faces[fi, (opposite+1)%3]); vb = int(faces[fi, (opposite+2)%3])
                wa, wb = weld[va], weld[vb]
                if wa != wb:
                    edges[tuple(sorted((wa, wb)))].append((fi, opposite, va, vb))
        selected, boundary_selected, concave_selected = 0, 0, 0
        for occurrences in edges.values():
            if len(occurrences) > 2:
                edge_stats['excludedNonmanifold'] += 1
                continue
            fi, opposite, va, vb = occurrences[0]
            midpoint = (vertices[va] + vertices[vb]) * .5
            length = float(np.linalg.norm(vertices[vb]-vertices[va]))
            if length < .035:
                edge_stats['excludedSubScaleEdges'] += 1
                continue
            is_boundary = len(occurrences) == 1
            is_convex = False
            is_concave = False
            if not is_boundary:
                fj = occurrences[1][0]
                cosine = float(np.dot(normals[fi], normals[fj]))
                if cosine > math.cos(math.radians(30)):
                    edge_stats['excludedCoplanarOrGentleFacets'] += 1
                    continue
                signed = float(np.dot(normals[fi], centers[fj]-centers[fi]))
                is_convex = signed < -1e-6
                is_concave = signed > 1e-6
            outward_z = max(float(normals[o[0], 2]) for o in occurrences)
            outward_x = max(abs(float(normals[o[0], 0])) for o in occurrences)
            score = contact_weight(group, midpoint, box, outward_z, outward_x, row['sourceObject'])
            # Open-sheet blades are material-separated, not chipped along every
            # open boundary. An intended hole is never filled or altered.
            boundary_allowed = group in {'intake', 'disk', 'sidewall', 'ivory_slope', 'rail'}
            if is_boundary and any(accent[o[0]] in {1, 2} for o in occurrences) and group == 'intake':
                boundary_allowed = False
            if (is_convex or (is_boundary and boundary_allowed)) and score >= .18:
                quantized = max(1, min(15, round(score * 15)))
                for fj, opposite_j, unused_a, unused_b in occurrences:
                    weights[fj, opposite_j] = max(weights[fj, opposite_j], quantized)
                selected += 1
                boundary_selected += int(is_boundary)
            # One protected geometric join per triangle, light and local.
            if is_concave and group in {'rail', 'sidewall', 'cockpit_deck', 'ivory_body', 'ivory_slope', 'intake', 'cowl'}:
                if midpoint[2] < box[1][2]-.025 and length > .09:
                    for fj, opposite_j, unused_a, unused_b in occurrences:
                        if concave[fj] == 0:
                            concave[fj] = opposite_j + 1
                            concave_selected += 1
        analysis['objects'].append({'sourceObject': row['sourceObject'], 'fitObject': row['fitObject'],
            'owner': owner, 'sourcePolygonRange': [row['firstCopiedPolygon'], row['firstCopiedPolygon'] + row['polygonCount']],
            'sourceCornerOrder': row['copiedCornerOrderFromSource'], 'group': group, 'bounds': box,
            'selectedWearEdges': selected, 'selectedBoundaryEdges': boundary_selected,
            'protectedJoinFaces': concave_selected, 'intakeComponents': component_records})
    sparse = []
    for fi in range(len(faces)):
        if np.any(weights[fi]) or concave[fi] or accent[fi]:
            flags = int(concave[fi]) + 4*int(accent[fi])
            sparse.append(format(fi, '04x') + ''.join(format(int(w), 'x') for w in weights[fi]) + format(flags, 'x'))
    encoded = ''.join(sparse)
    assert len(encoded) % 8 == 0
    # Conservative overlap-capped area bound for the selected physical bands;
    # the eventual shader's breakup and weights reduce it further.
    edge_lengths = np.stack([np.linalg.norm(points[:, (i+1)%3]-points[:, (i+2)%3], axis=1) for i in range(3)], axis=1)
    altitudes = double_area[:, None] / edge_lengths
    frac = 1 - (1-np.minimum(width / altitudes, 1)) ** 2
    area_bound = float(np.sum(np.minimum(np.sum(frac*(weights > 0), axis=1), 1)*double_area*.5))
    total_area = float(np.sum(double_area*.5))
    slot_histogram = dict(sorted(collections.Counter(map(int, polygons[:, 3])).items()))
    own = {'sourceObject': mesh['name'], 'vertexCount': len(vertices), 'polygons': len(faces),
        'vertexFnv1a64': mesh['vertexFnv1a64'], 'polygonFnv1a64': mesh['polygonFnv1a64'],
        'meshSignature': mesh['meshSignature'], 'cornerNormalsFnv1a64': mesh['cornerNormalsFnv1a64'],
        'wearWidthSourceUnits': width, 'joinWidthSourceUnits': dirt_width,
        'sparseEdgeRecords': encoded, 'recordCount': len(sparse),
        'materialIndexCounts': slot_histogram}
    if owner == 'pilot':
        visor_points = vertices[np.unique(faces[polygons[:, 3] == 2])]
        visor_bounds = bounds(visor_points)
        own['visorBounds'] = visor_bounds
        own['visorBandCenterZ'] = visor_bounds[0][2] + .66*(visor_bounds[1][2]-visor_bounds[0][2])
        own['visorBandHalfWidth'] = .026
    data['owners'][owner] = own
    analysis['owners'][owner] = {'vertices': len(vertices), 'triangles': len(faces),
        'maskRecords': len(sparse), 'encodedCharacters': len(encoded),
        'facesWithWear': int(np.count_nonzero(np.any(weights > 0, axis=1))),
        'facesWithProtectedJoin': int(np.count_nonzero(concave)),
        'accentFaceCounts': dict(sorted(collections.Counter(map(int, accent)).items())),
        'surfaceArea': total_area, 'wearBandAreaUpperBound': area_bound,
        'wearBandSurfaceFractionUpperBound': area_bound / total_area,
        'wearWidthSourceUnits': width, 'joinWidthSourceUnits': dirt_width,
        'edgeExclusions': dict(edge_stats)}

assert sum(o['polygons'] for o in data['owners'].values()) == 44028
assert sum(r['polygonCount'] for r in author['objectLineage']) == 44028
data['maskDataFnv1a64'] = fnv(data)
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == SOURCE_SHA
(HERE/'v4-geometry-wear-analysis.json').write_text(json.dumps(analysis, indent=2)+'\n')
(HERE/'v4-geometry-wear-reference.json').write_text(json.dumps(data, indent=2)+'\n')
(SAFE/'13-v4-geometry-wear-reference.py').write_text('"""Prepared data only; externally measured from actual V2 topology. No Blender execution."""\nBLOCKRUNNER_V4_MASKS = ' + repr(data) + '\n')
print(json.dumps({'owners': analysis['owners'], 'referenceBytes': (SAFE/'13-v4-geometry-wear-reference.py').stat().st_size,
                  'dataFnv1a64': data['maskDataFnv1a64']}, indent=2))
