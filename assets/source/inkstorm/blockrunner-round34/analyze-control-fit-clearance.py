"""PREPARED ONLY. Run after root releases its performance quiet window.

External source-only diagnostic: test the two measured, unaccepted coaxial
control candidates against original craft surfaces using a conservative
capsule around each unchanged bar. No Blender or geometry output.
"""
import hashlib
import json
import math
from source_geometry_analysis_helpers import SOURCE, HERE, EXPECTED_SHA, read_glb, bounds


def add(a, b):
    return tuple(x + y for x, y in zip(a, b))


def sub(a, b):
    return tuple(x - y for x, y in zip(a, b))


def mul(a, t):
    return tuple(x * t for x in a)


def dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])


def point_triangle(p, a, b, c):
    # Closest point using Voronoi regions; pinned source has no zero-area faces.
    ab, ac, ap = sub(b, a), sub(c, a), sub(p, a)
    d1, d2 = dot(ab, ap), dot(ac, ap)
    if d1 <= 0 and d2 <= 0:
        return a
    bp = sub(p, b)
    d3, d4 = dot(ab, bp), dot(ac, bp)
    if d3 >= 0 and d4 <= d3:
        return b
    vc = d1*d4 - d3*d2
    if vc <= 0 and d1 >= 0 and d3 <= 0:
        return add(a, mul(ab, d1/(d1-d3)))
    cp = sub(p, c)
    d5, d6 = dot(ab, cp), dot(ac, cp)
    if d6 >= 0 and d5 <= d6:
        return c
    vb = d5*d2 - d1*d6
    if vb <= 0 and d2 >= 0 and d6 <= 0:
        return add(a, mul(ac, d2/(d2-d6)))
    va = d3*d6 - d5*d4
    if va <= 0 and d4-d3 >= 0 and d5-d6 >= 0:
        return add(b, mul(sub(c, b), (d4-d3)/((d4-d3)+(d5-d6))))
    inverse = 1/(va+vb+vc)
    return add(a, add(mul(ab, vb*inverse), mul(ac, vc*inverse)))


def segment_pair(p1, q1, p2, q2):
    d1, d2, r = sub(q1, p1), sub(q2, p2), sub(p1, p2)
    a, e = dot(d1, d1), dot(d2, d2)
    assert a > 1e-20 and e > 1e-20
    b, c, f = dot(d1, d2), dot(d1, r), dot(d2, r)
    denominator = a*e-b*b
    s = max(0, min(1, (b*f-c*e)/denominator)) if denominator > 1e-20 else 0
    t = (b*s+f)/e
    if t < 0:
        t = 0
        s = max(0, min(1, -c/a))
    elif t > 1:
        t = 1
        s = max(0, min(1, (b-c)/a))
    return add(p1, mul(d1, s)), add(p2, mul(d2, t))


def segment_triangle(p, q, a, b, c):
    direction, e1, e2 = sub(q, p), sub(b, a), sub(c, a)
    h = cross(direction, e2)
    determinant = dot(e1, h)
    if abs(determinant) > 1e-15:
        inv = 1/determinant
        s = sub(p, a)
        u = inv*dot(s, h)
        v = inv*dot(direction, cross(s, e1))
        t = inv*dot(e2, cross(s, e1))
        if 0 <= u <= 1 and 0 <= v and u+v <= 1 and 0 <= t <= 1:
            hit = add(p, mul(direction, t))
            return 0, hit, hit
    candidates = [(p, point_triangle(p, a, b, c)), (q, point_triangle(q, a, b, c))]
    candidates += [segment_pair(p, q, x, y) for x, y in [(a,b), (b,c), (c,a)]]
    return min((dot(sub(x,y), sub(x,y)), x, y) for x,y in candidates)


def overlaps(a, b):
    return all(a[0][k] <= b[1][k] and b[0][k] <= a[1][k] for k in range(3))


output = HERE / 'control-fit-clearance-analysis.json'
assert not output.exists(), 'Keep previous candidate evidence.'
blob = SOURCE.read_bytes()
assert hashlib.sha256(blob).hexdigest() == EXPECTED_SHA
hands = json.loads((HERE/'hand-grip-cylinder-analysis-v2.json').read_text())
assert hands['sourceSha256'] == EXPECTED_SHA
meshes = read_glb(blob)
control_names = {row['controlObject'] for row in hands['hands'].values()}
results = []
for side, hand in hands['hands'].items():
    grip = hand['selectedInnerCylinderCandidate']
    p = tuple(hand['sameBaseZCoaxialRelocationCandidate']['newBaseCenter'])
    axis = tuple(grip['axisUnitUp'])
    q = add(p, mul(axis, hand['originalControlLength']))
    radius = hand['originalControlShaftRadius']
    capsule_box = [[min(p[k],q[k])-radius for k in range(3)], [max(p[k],q[k])+radius for k in range(3)]]
    contacts = []
    for name, mesh in meshes.items():
        if name in control_names or not overlaps(capsule_box, bounds(mesh['positions'])):
            continue
        seen = set()
        hits = []
        for index, face in enumerate(mesh['faces']):
            triangle = tuple(mesh['positions'][v] for v in face)
            key = tuple(sorted(triangle))
            if key in seen:
                continue
            seen.add(key)
            if not overlaps(capsule_box, bounds(triangle)):
                continue
            distance2, axis_point, surface_point = segment_triangle(p, q, *triangle)
            if distance2 <= radius*radius:
                hits.append({'sourceTriangleIndex': index, 'axisDistance': math.sqrt(distance2),
                             'capsulePenetrationBound': radius-math.sqrt(distance2),
                             'axisPoint': axis_point, 'surfacePoint': surface_point})
        if hits:
            contacts.append({'object': name, 'trianglesWithinConservativeCapsule': len(hits), 'hits': hits})
    results.append({'side': side, 'controlObject': hand['controlObject'], 'baseCandidate': p,
                    'tipCandidate': q, 'axis': axis, 'capsuleRadius': radius, 'contacts': contacts})
assert SOURCE.read_bytes() == blob
result = {'sourceSha256': EXPECTED_SHA, 'sourceUnchanged': True,
          'scope': 'Conservative finite capsule versus original source triangles, with exact within-mesh duplicate coordinates counted once. Rounded capsule endcaps overestimate the real tapered flat ends. Contacts require physical/visual review; this is not a final exact mesh-intersection or mount acceptance test.',
          'candidateAccepted': False, 'results': results}
output.write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps({'output': str(output), 'sourceUnchanged': True,
                  'contacts': [{ 'side': r['side'], 'objects': [
                      {'object': c['object'], 'triangles': c['trianglesWithinConservativeCapsule']}
                      for c in r['contacts']]} for r in results]}, indent=2))
