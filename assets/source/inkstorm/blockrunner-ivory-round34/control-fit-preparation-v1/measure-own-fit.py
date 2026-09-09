"""Bounded own-Ivory CPU geometry measurement; no Blender, browser or new surface correspondence."""
import hashlib
import json
import math
import struct
from pathlib import Path

BASE = Path('/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-ivory-round34')
OUT = BASE / 'control-fit-preparation-v1'


def add(a, b): return tuple(a[k] + b[k] for k in range(3))
def sub(a, b): return tuple(a[k] - b[k] for k in range(3))
def mul(a, s): return tuple(v * s for v in a)
def dot(a, b): return sum(a[k] * b[k] for k in range(3))
def cross(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def length(a): return math.sqrt(dot(a, a))
def unit(a): return mul(a, 1 / length(a))
def clamp(v, low, high): return max(low, min(high, v))
def bounds(points): return [[min(p[k] for p in points) for k in range(3)], [max(p[k] for p in points) for k in range(3)]]


def point_triangle(p, a, b, c):
    ab, ac, ap = sub(b, a), sub(c, a), sub(p, a)
    d1, d2 = dot(ab, ap), dot(ac, ap)
    if d1 <= 0 and d2 <= 0: return length(ap)
    bp = sub(p, b); d3, d4 = dot(ab, bp), dot(ac, bp)
    if d3 >= 0 and d4 <= d3: return length(bp)
    vc = d1 * d4 - d3 * d2
    if vc <= 0 and d1 >= 0 and d3 <= 0: return length(sub(p, add(a, mul(ab, d1 / (d1 - d3)))))
    cp = sub(p, c); d5, d6 = dot(ab, cp), dot(ac, cp)
    if d6 >= 0 and d5 <= d6: return length(cp)
    vb = d5 * d2 - d1 * d6
    if vb <= 0 and d2 >= 0 and d6 <= 0: return length(sub(p, add(a, mul(ac, d2 / (d2 - d6)))))
    va = d3 * d6 - d5 * d4
    if va <= 0 and d4 - d3 >= 0 and d5 - d6 >= 0: return length(sub(p, add(b, mul(sub(c, b), (d4 - d3) / ((d4 - d3) + (d5 - d6))))))
    denom = 1 / (va + vb + vc)
    return length(sub(p, add(a, add(mul(ab, vb * denom), mul(ac, vc * denom)))))


def segment_segment(p, q, a, b):
    d1, d2, r = sub(q, p), sub(b, a), sub(p, a)
    aa, ee, ff = dot(d1, d1), dot(d2, d2), dot(d2, r)
    cc, bb = dot(d1, r), dot(d1, d2)
    denominator = aa * ee - bb * bb
    s = clamp((bb * ff - cc * ee) / denominator, 0, 1) if denominator != 0 else 0
    t = (bb * s + ff) / ee
    if t < 0: t, s = 0, clamp(-cc / aa, 0, 1)
    elif t > 1: t, s = 1, clamp((bb - cc) / aa, 0, 1)
    return length(sub(add(p, mul(d1, s)), add(a, mul(d2, t))))


def segment_triangle(p, q, a, b, c):
    normal = cross(sub(b, a), sub(c, a))
    direction = sub(q, p); denom = dot(normal, direction)
    if abs(denom) > 1e-20:
        t = dot(normal, sub(a, p)) / denom
        if 0 <= t <= 1:
            hit = add(p, mul(direction, t))
            if point_triangle(hit, a, b, c) < 1e-10: return 0.0
    return min(point_triangle(p, a, b, c), point_triangle(q, a, b, c),
               segment_segment(p, q, a, b), segment_segment(p, q, b, c), segment_segment(p, q, c, a))


def rotate_z(value, axis):
    v = (-axis[1], axis[0], 0)
    return add(value, add(cross(v, value), mul(cross(v, cross(v, value)), 1 / (1 + axis[2]))))


inputs = json.loads((BASE / 'preparation-v1/operation-inputs.json').read_text())
cleanup_inputs = json.loads((BASE / 'cleanup-preparation-v1/operation-inputs.json').read_text())
audit = json.loads((BASE / 'audit-executed-v2-receipt.json').read_text())
cleanup_receipt_path = BASE / 'cleanup-mcp-preparation-v1/02b-cleanup-json-value-guard-executed-v2-receipt.json'
cleanup_receipt = json.loads(cleanup_receipt_path.read_text())
assert cleanup_receipt['cleanupPassed']
raw = Path(inputs['sourceGlb']).read_bytes()
assert hashlib.sha256(raw).hexdigest() == inputs['sourceSha256']
jn = struct.unpack_from('<I', raw, 12)[0]
doc = json.loads(raw[20:20 + jn]); binary = raw[28 + jn:]


def accessor(index):
    a = doc['accessors'][index]; view = doc['bufferViews'][a['bufferView']]
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
    fmt = '<' + {5126: 'f', 5125: 'I', 5123: 'H', 5121: 'B'}[a['componentType']] * width
    size = struct.calcsize(fmt); stride = view.get('byteStride', size)
    start = view.get('byteOffset', 0) + a.get('byteOffset', 0)
    return [struct.unpack_from(fmt, binary, start + i * stride) for i in range(a['count'])]


audit_rows = {r['name']: r for r in audit['namedMeshReferences']}
pilot_name = inputs['pilot']['sourceContainer']
glove_ids = set(cleanup_inputs['pilotSemanticLineage']['sourceRoles']['gloves']['proposedRetainedSourcePolygonIndices'])
mesh_data = {}
triangles = []
for node in doc['nodes']:
    if 'mesh' not in node: continue
    name = node['name']; primitive = doc['meshes'][node['mesh']]['primitives'][0]
    p = accessor(primitive['attributes']['POSITION']); ix = [v[0] for v in accessor(primitive['indices'])]
    matrix = audit_rows[name]['matrixWorld']
    local = [(v[0], -v[2], v[1]) for v in p]
    world = [tuple(sum(matrix[k][j] * v[j] for j in range(3)) + matrix[k][3] for k in range(3)) for v in local]
    faces = [tuple(ix[i:i + 3]) for i in range(0, len(ix), 3)]
    mesh_data[name] = {'world': world, 'faces': faces, 'bounds': bounds(world)}
    for index, face in enumerate(faces):
        if name == pilot_name and index % 2: continue
        tri = tuple(world[v] for v in face)
        role = 'body'
        if name == pilot_name and index in glove_ids:
            role = 'glove-negativeX' if sum(v[0] for v in tri) < 0 else 'glove-positiveX'
        triangles.append({'name': name, 'sourcePolygon': index, 'p': tri, 'bounds': bounds(tri), 'role': role})
assert len(triangles) == 43556


def capsule_clearances(start, end, radius, excluded, intended_role=None, excluded_wall=None):
    expanded = [[min(start[k], end[k]) - radius - 0.1 for k in range(3)], [max(start[k], end[k]) + radius + 0.1 for k in range(3)]]
    minima = {}; tested = 0
    for tri in triangles:
        if tri['name'] in excluded or tri['name'] == excluded_wall: continue
        bb = tri['bounds']
        if any(bb[1][k] < expanded[0][k] or bb[0][k] > expanded[1][k] for k in range(3)): continue
        tested += 1
        distance = segment_triangle(start, end, *tri['p']) - radius
        group = 'intendedHand' if tri['role'] == intended_role else 'unintendedSurface'
        if group not in minima or distance < minima[group]['capsuleClearance']:
            minima[group] = {'capsuleClearance': distance, 'sourceObject': tri['name'], 'sourcePolygon': tri['sourcePolygon'], 'role': tri['role']}
    return {'testedTrianglesAfterAabbFilter': tested, 'searchScope': 'All43556 retained triangles considered by expanded capsule AABB; detailed distances within radius+0.1m only. Unreported surfaces are outside that AABB, not claimed exact global minima.', 'minimaWithinSearch': minima}


def wall_hits(start, side, wall_name):
    hits = []
    for tri in triangles:
        if tri['name'] != wall_name: continue
        if not all(tri['bounds'][0][k] - 1e-9 <= start[k] <= tri['bounds'][1][k] + 1e-9 for k in (1, 2)): continue
        a, b, c = tri['p']; n = cross(sub(b, a), sub(c, a))
        if abs(n[0]) < 1e-16: continue
        x = a[0] - (n[1] * (start[1] - a[1]) + n[2] * (start[2] - a[2])) / n[0]
        t = (x - start[0]) * side
        point = (x, start[1], start[2])
        if t > 0 and point_triangle(point, a, b, c) < 1e-8: hits.append((t, tri['sourcePolygon'], point))
    hits.sort()
    unique = []
    for hit in hits:
        if not unique or abs(hit[0] - unique[-1][0]) > 1e-6: unique.append(hit)
    assert len(unique) >= 2, ('Need own inner and outer wall hits', wall_name)
    return unique


controls = []
excluded = {seed['ivorySourceControl'] for seed in inputs['controlFitDesignSeeds']}
for seed in inputs['controlFitDesignSeeds']:
    name = seed['ivorySourceControl']; data = mesh_data[name]
    lo, hi = data['bounds']; base = ((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2]); old_length = hi[2] - lo[2]
    levels = sorted(set(round(v[2] - base[2], 6) for v in data['world']))
    assert len(levels) == 4, (name, levels)
    radius = max(math.hypot(v[0] - base[0], v[1] - base[1]) for v in data['world'])
    grip_base, grip_tip = tuple(seed['gripBase']), tuple(seed['gripTip'])
    axis = unit(sub(grip_tip, grip_base))
    mount_start = add(grip_base, mul(axis, 0.015))
    side = -1 if seed['side'] == 'negativeX' else 1
    hits = wall_hits(mount_start, side, seed['ivoryWallObject'])
    contact = hits[0][2]; mount_end = (contact[0] + side * 0.002, contact[1], contact[2])
    own_role = 'glove-' + seed['side']
    grip = capsule_clearances(grip_base, grip_tip, radius, excluded, own_role)
    support = capsule_clearances(mount_start, mount_end, 0.035, excluded, excluded_wall=seed['ivoryWallObject'])
    original_gap = capsule_clearances(base, (base[0], base[1], hi[2]), radius, excluded, own_role)
    transformed = []
    for label, start, end, radial_scale in [('grip', grip_base, grip_tip, 1), ('mount', mount_start, mount_end, 0.035 / radius)]:
        direction = unit(sub(end, start)); new_length = length(sub(end, start)); lower, upper = levels[1], old_length - levels[2]
        points = []
        for point in data['world']:
            v = sub(point, base); distance = v[2]
            if distance <= lower + 0.00001: nd = distance * radial_scale
            elif distance >= old_length - upper - 0.00001: nd = new_length - (old_length - distance) * radial_scale
            else:
                fraction = (distance - lower) / (old_length - lower - upper)
                nd = lower * radial_scale + fraction * (new_length - (lower + upper) * radial_scale)
            points.append(add(start, rotate_z((v[0] * radial_scale, v[1] * radial_scale, nd), direction)))
        max_radial = max(length(sub(p, add(start, mul(direction, clamp(dot(sub(p, start), direction), 0, new_length))))) for p in points)
        assert max_radial <= radius * radial_scale + 0.000005
        transformed.append({'role': label, 'bounds': bounds(points), 'allProfileVerticesInsideCapsule': True, 'completeProfileMaximumSegmentDistance': max_radial,
                            'worldPositionsSha256': hashlib.sha256(json.dumps(points, separators=(',', ':')).encode()).hexdigest()})
    controls.append({'side': seed['side'], 'sourceControl': name, 'wallSourceObject': seed['ivoryWallObject'],
                     'sourceControlTriangles': len(data['faces']), 'originalBaseCenter': base, 'originalLength': old_length,
                     'originalAxialLevels': levels, 'originalLowerBevelLength': levels[1], 'originalUpperBevelLength': old_length - levels[2],
                     'originalShaftRadius': radius, 'gripBase': grip_base, 'gripTip': grip_tip, 'gripAxis': axis,
                     'gripLength': length(sub(grip_tip, grip_base)), 'mountStart': mount_start, 'mountEnd': mount_end,
                     'mountRadius': 0.035, 'wallContact': contact, 'wallSourcePolygon': hits[0][1],
                     'wallThicknessAtAxis': hits[1][0] - hits[0][0], 'wallEmbedDepth': 0.002,
                     'gripCapsuleClearances': grip, 'mountCapsuleClearancesExcludingIntentionalWall': support,
                     'originalControlCapsuleContext': original_gap, 'profileEnvelopeChecks': transformed,
                     'candidateOrigin': 'Prepared seed endpoints, now checked against own pinned GLB retained triangles; mount contact derived fresh from own sidewall. No original pose/beam transform changes.'})
result = {'status': 'OFFLINE OWN GEOMETRY MEASURED; LIVE FIT NOT EXECUTED', 'sourceUid': inputs['sourceUid'], 'sourceGlbSha256': hashlib.sha256(raw).hexdigest(),
          'cleanupReceiptSha256': hashlib.sha256(cleanup_receipt_path.read_bytes()).hexdigest(), 'retainedTrianglesUsed': 43556,
          'coordinateBasis': 'Own GLB local(x,-z,y), own audited Blender world matrices. Source geometry approximated by exported float32 positions; live recheck required.',
          'controls': controls, 'plannedTargetCounts': {'objects': 57, 'meshes': 53, 'materials': 51, 'triangles': 44028},
          'sourceTransformsPolicy': 'All55 existing node transforms/parents remain exact. Reshape only two control meshes in their existing local coordinate frames; add two own source-profile mounts under copied parents. Pilot/seat and all beams unchanged.',
          'sourceNormalsPolicy': 'No Colour normals/tolerance. Existing49 untargeted cleanup mesh corner normals exact; changed source-profile normals need their own measured encoding evidence before bound fit execution.',
          'mcpExecuted': False, 'artAccepted': False}
OUT.mkdir(exist_ok=True)
path = OUT / 'own-clearance-measurements-v1.json'; assert not path.exists(); path.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'output': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'controls': controls}, indent=2))
