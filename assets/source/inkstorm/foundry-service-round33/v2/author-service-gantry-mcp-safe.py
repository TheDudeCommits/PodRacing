"""V2 substantial construction. Root invokes this literal source through Blender MCP.

Imports the byte-preserved round32 gantry into a NEW scene. Removes only complete
countdown assemblies, retaining the truss, columns, feet and two utility pendants.
Appends original service construction with the same vertex-color material.
No file/network access, dynamic code, render, bake or shared blend save is used.
The optional GLB export is source-only and defaults OFF. Review the created scene
before exporting. The failed packed-normal predecessor is preserved separately.
"""
import bpy
import math
import json
import collections
from mathutils import Vector, Matrix

SOURCE = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/foundry-service-round33/predecessors/foundry-gantry-round32.glb'
SOURCE_SHA256 = '3d0cd999daf52b82ac0232c7316a5e4072c80bd83982f83cbaf4a1dcde11e862'
STAGE = 'PodRacing — Foundry service gantry round33 V2'
FAMILY = 'foundry-service-gantry-v2'
OUTPUT = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/foundry-service-round33/v2/foundry-service-gantry-v2-native.glb'
EXPORT_CANDIDATE = False
TRIANGLE_CAP = 20000
RETAINED_TRIANGLES = 3940
PRACTICAL_CLEARANCE = 39.60
PAINT = {
    'ink': (.040, .045, .085), 'shadow': (.105, .095, .165),
    'cobalt': (.075, .18, .29), 'steel': (.19, .25, .29),
    'coral': (.80, .225, .10), 'rust': (.42, .095, .055),
    'cream': (.86, .68, .40), 'pale': (.96, .83, .59),
}


# The functions below are pure arithmetic. Preparation validates these without
# importing bpy, opening Blender, generating an artifact or running this script.
def add(a, b): return tuple(x+y for x, y in zip(a, b))
def sub(a, b): return tuple(x-y for x, y in zip(a, b))
def mul(a, k): return tuple(x*k for x in a)
def dot(a, b): return sum(x*y for x, y in zip(a, b))
def cross(a, b): return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])
def unit(a):
    length = math.sqrt(dot(a, a))
    assert length > 1e-9
    return mul(a, 1/length)


def frame(a, b):
    n = unit(sub(b, a))
    u = unit(cross(n, (0, 0, 1) if abs(n[2]) < .94 else (0, 1, 0)))
    return n, u, cross(n, u)


def new_geometry():
    return {'vertices': [], 'faces': [], 'colors': [], 'smooth': [], 'groups': []}


def part(data, vertices, faces, color, group, smooth=False):
    offset = len(data['vertices'])
    data['vertices'].extend(tuple(p) for p in vertices)
    base = PAINT[color] if isinstance(color, str) else color
    for face in faces:
        data['faces'].append(tuple(offset+i for i in face))
        data['colors'].append((*base, 1.0))
        data['smooth'].append(smooth)
        data['groups'].append(group)


def box(data, center, size, color, group):
    x, y, z = center
    w, d, h = [v*.5 for v in size]
    vertices = [(x-w,y-d,z-h),(x+w,y-d,z-h),(x+w,y+d,z-h),(x-w,y+d,z-h),
                (x-w,y-d,z+h),(x+w,y-d,z+h),(x+w,y+d,z+h),(x-w,y+d,z+h)]
    part(data, vertices, [(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)], color, group)


def tube(data, a, b, radius, color, group, sides=8, radius_end=None):
    _, u, v = frame(a, b)
    vertices = []
    for p, r in [(a, radius), (b, radius if radius_end is None else radius_end)]:
        for i in range(sides):
            t = math.tau*i/sides
            vertices.append(add(p, mul(add(mul(u, math.cos(t)), mul(v, math.sin(t))), r)))
    part(data, vertices, [tuple(reversed(range(sides))), tuple(range(sides, 2*sides))], color, group)
    part(data, vertices, [(i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides)], color, group, sides >= 8)


def beam(data, a, b, width, color, group):
    tube(data, a, b, width*.7071, color, group, 4)


def ring(data, center, axis, outer, inner, depth, color, group, sides=12):
    """Closed annulus: a pipe flange has a real bore, not a blocking disk."""
    n, u, v = frame(center, add(center, axis))
    vertices = []
    for longitudinal, radius in [(-depth/2,outer),(depth/2,outer),(-depth/2,inner),(depth/2,inner)]:
        for i in range(sides):
            t = math.tau*i/sides
            vertices.append(add(add(center, mul(n, longitudinal)),
                                mul(add(mul(u, math.cos(t)), mul(v, math.sin(t))), radius)))
    faces = []
    for k in range(sides):
        j = (k+1)%sides
        faces.extend([(k,j,sides+j,sides+k), (2*sides+j,2*sides+k,3*sides+k,3*sides+j),
                      (k,2*sides+k,2*sides+j,j), (sides+j,3*sides+j,3*sides+k,sides+k)])
    part(data, vertices, faces, color, group)


def sweep(data, path, radius, color, group, sides=16):
    """Connected sweep with finished caps; no intersecting straight elbow pieces."""
    vertices = []
    for i, p in enumerate(path):
        n = unit(sub(path[min(i+1,len(path)-1)], path[max(0,i-1)]))
        # These paths lie in X/Z, so a fixed lateral axis avoids frame twisting.
        u = (0, 1, 0)
        assert abs(dot(u,n)) < 1e-7
        v = cross(n, u)
        for k in range(sides):
            t = math.tau*k/sides
            vertices.append(add(p, mul(add(mul(u,math.cos(t)),mul(v,math.sin(t))),radius)))
    faces = []
    for j in range(len(path)-1):
        for k in range(sides):
            faces.append((j*sides+k,j*sides+(k+1)%sides,(j+1)*sides+(k+1)%sides,(j+1)*sides+k))
    part(data, vertices, faces, color, group, True)
    part(data, vertices, [tuple(reversed(range(sides))),tuple(range((len(path)-1)*sides,len(path)*sides))], color, group)


def wedge(data, triangle, axis, depth, color, group):
    if dot(cross(sub(triangle[1],triangle[0]),sub(triangle[2],triangle[0])),axis)<0:
        triangle = list(reversed(triangle))
    shift = mul(unit(axis), depth*.5)
    vertices = [sub(p,shift) for p in triangle]+[add(p,shift) for p in triangle]
    part(data, vertices, [(2,1,0),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)], color, group)


def bolt_circle(data, center, axis, radius, length, group, count=6, bolt_radius=.17):
    n, u, v = frame(center, add(center, axis))
    for i in range(count):
        angle = math.tau*(i+.5)/count
        p = add(center, mul(add(mul(u, math.cos(angle)),mul(v, math.sin(angle))), radius))
        tube(data, sub(p,mul(n,length*.5)), add(p,mul(n,length*.5)), bolt_radius, 'cream', group, 6)


def surface_point(data, group, origin, direction):
    """Ray against actual generated faces: paint chips cannot float off a facet."""
    distance = None
    for face, name in zip(data['faces'],data['groups']):
        if name != group: continue
        for i in range(1,len(face)-1):
            a,b,c = [data['vertices'][j] for j in (face[0],face[i],face[i+1])]
            e1,e2 = sub(b,a),sub(c,a)
            p = cross(direction,e2); determinant = dot(e1,p)
            if abs(determinant)<1e-9: continue
            inverse = 1/determinant; delta = sub(origin,a)
            u = dot(delta,p)*inverse
            if u < -1e-7 or u > 1+1e-7: continue
            q = cross(delta,e1); v = dot(direction,q)*inverse
            if v < -1e-7 or u+v > 1+1e-7: continue
            t = dot(e2,q)*inverse
            if t>1e-7: distance = t if distance is None else min(t,distance)
    assert distance is not None, 'No supporting pressure skin for the paint chip.'
    return add(origin,mul(direction,distance+.003))


def flange_pair(data, center, axis, group, outer=5.3, inner=4.16, bolts=8):
    # Thick lips and a visibly separated seal. The shanks connect full hex heads
    # and nuts, so the rhythm reads as fastening rather than painted dots.
    n, u, v = frame(center, add(center,axis))
    for d in [-.62,.62]:
        ring(data,add(center,mul(n,d)),axis,outer,inner,.76,'steel',group,12)
    ring(data,center,axis,outer-.20,inner,.42,'ink',group,12)
    for i in range(bolts):
        a = math.tau*(i+.5)/bolts
        p = add(center,mul(add(mul(u,math.cos(a)),mul(v,math.sin(a))),outer-.47))
        tube(data,sub(p,mul(n,1.21)),add(p,mul(n,1.21)),.16,'ink',group,6)
        for sign in [-1,1]:
            tube(data,add(p,mul(n,sign*.97)),add(p,mul(n,sign*1.32)),.31,'cream',group,6)


def platform(data, x, z):
    # A real annular walking surface with a continuous supporting edge, gussets,
    # an outward ladder landing and an intentional gap in its front guardrail.
    ring(data,(x,0,z),(0,0,1),5.82,4.34,.28,'steel','column_platforms',12)
    ring(data,(x,0,z-.20),(0,0,1),5.84,5.55,.34,'rust','platform_edge',12)
    box(data,(x,-6.03,z),(2.5,1.25,.28),'steel','ladder_landings')
    for i in range(12):
        a,b = math.tau*i/12,math.tau*(i+1)/12
        # Gap centered on front -Y is the ladder entrance.
        if i not in [8,9]:
            for h in [.95,1.85]:
                beam(data,(x+5.68*math.cos(a),5.68*math.sin(a),z+h),
                     (x+5.68*math.cos(b),5.68*math.sin(b),z+h),.18,'cream','platform_rails')
        if i not in [9]:
            beam(data,(x+5.68*math.cos(a),5.68*math.sin(a),z+.14),
                 (x+5.68*math.cos(a),5.68*math.sin(a),z+1.85),.18,'steel','platform_rails')
        if i%3==0:
            p = (x+4.05*math.cos(a),4.05*math.sin(a),z-2.5)
            q = (x+5.62*math.cos(a),5.62*math.sin(a),z-.18)
            beam(data,p,q,.37,'cobalt','platform_brackets')
    # Reduce the rail opening to the2.36-wide ladder route: short return wings
    # close the unused portions of the two omitted30degree ring segments.
    for sign in [-1,1]:
        a,b = math.radians(270+sign*30),math.radians(270+sign*12)
        for h in [.95,1.85]:
            beam(data,(x+5.68*math.cos(a),5.68*math.sin(a),z+h),
                 (x+5.68*math.cos(b),5.68*math.sin(b),z+h),.18,'cream','platform_rails')
        beam(data,(x+5.68*math.cos(b),5.68*math.sin(b),z+.14),
             (x+5.68*math.cos(b),5.68*math.sin(b),z+1.85),.18,'steel','platform_rails')
    for dx in [-1.2,1.2]:
        beam(data,(x+dx,-6.57,z+.14),(x+dx,-6.57,z+1.85),.18,'cream','ladder_landings')


def lamp(data, p):
    x,y,z = p
    tube(data,(x,y,z),(x,y,z+1.8),.18,'steel','lamp_mounts',6)
    tube(data,(x,y,z+1.76),(x,y,z+1.92),.69,'ink','lamp_cages',8)
    tube(data,(x,y,z+1.92),(x,y,z+3.25),.43,(1.0,.55,.095),'warm_lenses',8)
    tube(data,(x,y,z+3.25),(x,y,z+3.5),.69,'steel','lamp_cages',8,.48)
    for i in range(6):
        a = math.tau*i/6
        tube(data,(x+.52*math.cos(a),y+.52*math.sin(a),z+1.85),
             (x+.52*math.cos(a),y+.52*math.sin(a),z+3.32),.075,'ink','lamp_cages',4)
    ring(data,(x,y,z+2.6),(0,0,1),.58,.47,.12,'ink','lamp_cages',8)


def hoist(data, x):
    # Strong trolley silhouette, mounted to a real track under the crossmembers.
    box(data,(x+1,0,44.28),(35,2.50,.25),'steel','hoist_track')
    box(data,(x+1,0,43.88),(35,.32,.70),'cobalt','hoist_track')
    box(data,(x+1,0,43.50),(35,2.50,.25),'steel','hoist_track')
    for dx in [-15,1,17]:
        box(data,(x+dx,0,44.48),(2.1,3.25,.25),'rust','hoist_mounts')
        for y in [-1.35,1.35]:
            tube(data,(x+dx,y,44.37),(x+dx,y,44.72),.25,'cream','hoist_mounts',6)
    wheel_z = 43.625+.42
    for dx in [-1.9,1.9]:
        for sign in [-1,1]:
            tube(data,(x+dx,sign*.78-.22,wheel_z),(x+dx,sign*.78+.22,wheel_z),.42,'ink','hoist_wheels',12)
            tube(data,(x+dx,sign*.54,wheel_z),(x+dx,sign*1.72,wheel_z),.22,'cream','hoist_axles',6)
    for sign in [-1,1]:
        box(data,(x,sign*1.58,43.15),(5.6,.36,2.7),'coral','hoist_cheeks')
        for dx in [-2.15,2.15]:
            tube(data,(x+dx,sign*1.75,43.22),(x+dx,sign*1.97,43.22),.28,'cream','hoist_cheeks',6)
    box(data,(x,0,42.0),(5.6,3.5,.24),'steel','hoist_cradle')
    # Drum axis X: long cable bed, orange motor casing and distinct cooling ribs.
    tube(data,(x-1.75,0,42.95),(x+1.75,0,42.95),.77,'steel','hoist_drum',16)
    for dx in [-1.70,1.70]:
        tube(data,(x+dx-.12,0,42.95),(x+dx+.12,0,42.95),.93,'rust','hoist_drum',16)
    for dx in [-1.30,-.65,0,.65,1.30]:
        ring(data,(x+dx,0,42.95),(1,0,0),.81,.772,.15,'ink','drum_cable_wrap',8)
    tube(data,(x+1.92,0,42.95),(x+3.05,0,42.95),.88,'cobalt','hoist_motor',12)
    for dx in [2.05,2.40,2.75]:
        ring(data,(x+dx,0,42.95),(1,0,0),.98,.875,.10,'steel','motor_fins',12)
    for dx in [-.58,.58]:
        tube(data,(x+dx,-.10,42.18),(x+dx,-.10,41.40),.11,'ink','service_cable',6)
    # Broad lower pulley sits just below the drum. Compact throat keeps the
    # complete hook above39.6 without hiding its form behind a clearance plate.
    for y in [-.52,.32]:
        box(data,(x,y,41.16),(1.65,.19,1.06),'coral','lower_pulley')
    tube(data,(x,-.65,41.18),(x,.43,41.18),.61,'steel','lower_pulley',12)
    tube(data,(x,-.72,41.18),(x,.50,41.18),.21,'cream','lower_pulley',6)
    hook = [(x,-.1,40.68),(x,-.1,40.35),(x-.37,-.1,40.25),
            (x-.55,-.1,40.0),(x-.25,-.1,39.88),(x+.22,-.1,40.03),(x+.26,-.1,40.29)]
    sweep(data,hook,.19,'steel','service_hook',8)


def build_service_geometry():
    data = new_geometry()
    # The pipe rises continuously from both original foot plates. Radius4.15
    # gives8.3 diameter; lowering the center leaves room for thick flange rims.
    center_z = 56.1
    path = [(-46,0,4.35),(-46,0,18),(-46,0,36),(-46,0,49.1)]
    for i in range(1,9):
        a = math.pi-i*math.pi/16
        path.append((-39+7*math.cos(a),0,49.1+7*math.sin(a)))
    path.extend([(-22,0,center_z),(8,0,center_z),(26,0,center_z),(39,0,center_z)])
    for i in range(1,9):
        a = math.pi/2-i*math.pi/16
        path.append((39+7*math.cos(a),0,49.1+7*math.sin(a)))
    path.extend([(46,0,36),(46,0,18),(46,0,4.35)])
    sweep(data,path,4.15,'coral','pressure_main',24)
    for x in [-34,8,34]:
        flange_pair(data,(x,0,center_z),(1,0,0),'horizontal_flanges')
    for x in [-46,46]:
        for z in [13,45.2]:
            flange_pair(data,(x,0,z),(0,0,1),'riser_flanges')
        # Pipe shoe stands on the existing base. Splayed plates and anchors
        # add construction above it without replacing or moving the foundation.
        ring(data,(x,0,4.28),(0,0,1),5.35,4.12,.58,'steel','riser_shoes',16)
        for sign in [-1,1]:
            for y in [-3.7,3.7]:
                wedge(data,[(x+sign*1.8,y,10.6),(x+sign*1.8,y,4.15),(x+sign*5.6,y,4.15)],
                      (0,1,0),.60,'cobalt','base_gussets')
                box(data,(x+sign*4.87,y,4.08),(1.85,1.70,.30),'steel','anchor_pads')
                tube(data,(x+sign*4.9,y,4.20),(x+sign*4.9,y,4.80),.34,'cream','anchor_bolts',6)
        for z in [20,38.5]: platform(data,x,z)
        # A ladder clear of the pipe gives both intermediate landings a route
        # to the upper deck; rungs and stand-off ties are real closed members.
        for dx in [-1.08,1.08]:
            beam(data,(x+dx,-6.70,4.25),(x+dx,-6.70,53.9),.22,'cream','access_ladders')
        for i in range(43):
            z = 4.75+i*1.12
            beam(data,(x-1.08,-6.70,z),(x+1.08,-6.70,z),.19,'steel','ladder_rungs')
        for z in [7,17,28,38,49]:
            for dx in [-1.08,1.08]:
                beam(data,(x+dx,-4.05,z),(x+dx,-6.70,z),.28,'cobalt','ladder_ties')
        lamp(data,(x+3.35,4.05,20.12))
        lamp(data,(x-3.35,4.05,38.62))
        # End knees stay near the original columns; their lowest point is40.1.
        for y in [-4.45,4.45]:
            side = -1 if x<0 else 1
            wedge(data,[(x,y,40.1),(x,y,44.2),(x-side*8.0,y,44.2)],
                  (0,1,0),.58,'steel','truss_knees')
            for dx,z in [(0,41.2),(0,43.2),(-side*5.5,43.5)]:
                tube(data,(x+dx,y-.39,z),(x+dx,y+.39,z),.29,'cream','knee_bolts',6)
    # Narrow bearing saddles now visibly occupy the gap between original chord
    # and lowered main; paired webs carry their loads to real crossmembers.
    for x in [-24,1,24]:
        box(data,(x,0,51.72),(3.65,8.6,.38),'steel','pipe_saddles')
        ring(data,(x,0,center_z),(1,0,0),4.53,4.17,1.10,'cobalt','pipe_saddles',16)
        for y in [-3.1,3.1]:
            wedge(data,[(x,y,51.88),(x,y*.64,51.88),(x,y*.64,53.0)],(1,0,0),.80,'steel','saddle_webs')
            tube(data,(x,y,51.78),(x,y,52.35),.29,'cream','saddle_bolts',6)
    # Catwalk and brackets face the race approach (+Y); both front/rear routes
    # meet the two ladder landings, while the original rear catwalk is retained.
    for y in [-5.43,5.43]:
        box(data,(0,y,51.81),(94,2.02,.24),'steel','upper_catwalk')
        box(data,(0,y+(-1.07 if y<0 else 1.07),52.07),(94,.15,.42),'rust','catwalk_toeboard')
        for x in [-46,-31,-15,1,17,32,46]:
            end = y+(-.95 if y<0 else .95)
            wedge(data,[(x,end,51.67),(x,3.55 if y>0 else -3.55,50.05),(x,3.55 if y>0 else -3.55,51.67)],
                  (1,0,0),.43,'cobalt','catwalk_brackets')
        for z in [52.85,53.85]:
            extent = 44 if y<0 else 47
            beam(data,(-extent,y+(-1.08 if y<0 else 1.08),z),(extent,y+(-1.08 if y<0 else 1.08),z),.22,'cream','upper_rails')
        for x in [-47,-39,-31,-23,-15,-7,1,9,17,25,33,41,47]:
            beam(data,(x,y+(-1.08 if y<0 else 1.08),51.93),(x,y+(-1.08 if y<0 else 1.08),53.85),.22,'steel','upper_rails')
    for x in [-24,24]: lamp(data,(x,5.45,51.91))
    hoist(data,-16)
    # Distributed chips are projected to actual faces, using deterministic
    # size/spacing variation; they cannot float or hide geometry with alpha.
    for i in range(72):
        x = -31+(i*17%64)
        a = math.tau*((i*29%101)+.25)/101
        length = .28+(i%5)*.20
        points = [surface_point(data,'pressure_main',(xx,0,center_z),(0,math.cos(aa),math.sin(aa)))
                  for xx,aa in [(x,a),(x+length,a+.025),(x+length*.30,a+.095)]]
        part(data,points,[(0,2,1)],'rust' if i%5 else 'steel','edge_wear')
    for side in [-1,1]:
        for i in range(24):
            z = 6+(i*7%36); a = math.tau*((i*17%47)+.2)/47
            points = [surface_point(data,'pressure_main',(46*side,0,zz),(math.cos(aa),math.sin(aa),0))
                      for zz,aa in [(z,a),(z+.60,a+.035),(z+.14,a+.11)]]
            part(data,points,[(0,1,2)],'rust' if i%4 else 'steel','edge_wear')
    return data

def geometry_summary(data):
    counts = collections.Counter()
    for face, group in zip(data['faces'],data['groups']): counts[group] += len(face)-2
    points = data['vertices']
    bounds = [[min(p[i] for p in points),max(p[i] for p in points)] for i in range(3)]
    return {'vertices':len(points),'triangles':sum(counts.values()),'trianglesByGroup':dict(sorted(counts.items())),
            'boundsBlender':bounds,'retainedTriangles':RETAINED_TRIANGLES,'candidateTriangles':RETAINED_TRIANGLES+sum(counts.values())}


def positional_components(mesh):
    """Classification only. Never weld the source's split normals or colors."""
    faces_at = collections.defaultdict(list)
    polygon_keys = []
    for polygon in mesh.polygons:
        keys = [tuple(round(c,5) for c in mesh.vertices[i].co) for i in polygon.vertices]
        polygon_keys.append(keys)
        for key in set(keys): faces_at[key].append(polygon.index)
    unseen = set(range(len(mesh.polygons)))
    components = []
    while unseen:
        todo = [unseen.pop()]
        component = []
        while todo:
            current = todo.pop(); component.append(current)
            for key in polygon_keys[current]:
                for neighbor in faces_at[key]:
                    if neighbor in unseen: unseen.remove(neighbor); todo.append(neighbor)
        components.append(component)
    return components


def choose_signals(mesh):
    components = positional_components(mesh)
    selected = set(); bank_receipts = []
    expected = [12,12,20,20,20,20,20,20,44,52,60,60,112]
    for center in [-11,-5.5,0,5.5,11]:
        bank = []
        for component in components:
            points = [mesh.vertices[i].co for p in component for i in mesh.polygons[p].vertices]
            lower = [min(v[k] for v in points) for k in range(3)]
            upper = [max(v[k] for v in points) for k in range(3)]
            a = [center-1.401,-2.451,39.599]; b = [center+1.401,1.678,44.501]
            if all(lower[k]>=a[k] and upper[k]<=b[k] for k in range(3)): bank.append(component)
        counts = sorted(sum(len(mesh.polygons[p].vertices)-2 for p in c) for c in bank)
        assert len(bank)==13 and counts==expected, ('Source signal topology drift',center,counts)
        indices = {p for c in bank for p in c}
        assert not (selected & indices)
        selected.update(indices)
        bank_receipts.append({'centerX':center,'components':len(bank),'triangles':sum(counts)})
    assert sum(len(mesh.polygons[p].vertices)-2 for p in selected)==2360
    return selected, bank_receipts


def clipped_clearance(vertices, faces):
    """Clip each face to the open central corridor, not just its vertices."""
    low = None
    for face in faces:
        polygon = [vertices[i] for i in face]
        for limit, sense in [(-39.999999,1),(39.999999,-1)]:
            clipped = []
            for a, b in zip(polygon,polygon[1:]+polygon[:1]):
                ia = (a[0]-limit)*sense>=0; ib = (b[0]-limit)*sense>=0
                if ia: clipped.append(a)
                if ia!=ib:
                    t = (limit-a[0])/(b[0]-a[0])
                    clipped.append(tuple(a[k]+t*(b[k]-a[k]) for k in range(3)))
            polygon = clipped
            if not polygon: break
        if polygon:
            z = min(p[2] for p in polygon)
            low = z if low is None else min(low,z)
    assert low is not None
    return low


def source_evidence(mesh, polygons):
    colors = mesh.color_attributes.active_color
    assert colors is not None and colors.domain in {'CORNER','POINT'}
    result = []
    for index in polygons:
        p = mesh.polygons[index]
        loops = list(p.loop_indices)
        result.append((tuple(tuple(mesh.vertices[mesh.loops[i].vertex_index].co) for i in loops),
                       tuple(tuple(mesh.corner_normals[i].vector) for i in loops),
                       tuple(tuple(colors.data[i if colors.domain=='CORNER' else mesh.loops[i].vertex_index].color) for i in loops),
                       p.use_smooth))
    return result


def execute_source_authoring():
    assert STAGE not in bpy.data.scenes, 'Version already exists; choose a new version, never overwrite it.'
    assert bpy.context.mode=='OBJECT', 'Leave the shared mode untouched; rerun from Object mode.'
    window = bpy.context.window
    old_scene, old_layer = window.scene, window.view_layer
    old_active, old_selected = old_layer.objects.active, list(bpy.context.selected_objects)
    old_layer_collection = old_layer.active_layer_collection
    scene_members = {s:(set(s.objects),set(s.collection.children)) for s in bpy.data.scenes}
    collection_members = {c:(set(c.objects),set(c.children)) for c in bpy.data.collections}
    old_objects = set(bpy.data.objects); old_meshes = set(bpy.data.meshes)
    old_materials = set(bpy.data.materials); old_images = set(bpy.data.images)
    stage = None; success = False
    owned_meshes = set(); owned_materials = set(); owned_images = set(); owned_collections = set()
    report = {'status':'executing source authoring','source':SOURCE,'expectedSourceSha256':SOURCE_SHA256,
              'sourceHashVerification':'External receipt required; no hashing/filesystem access in MCP.',
              'newScene':STAGE,'family':FAMILY,'renderedAcceptance':False,'runtimeInstalled':False,'exportEnabled':EXPORT_CANDIDATE}
    try:
        stage = bpy.data.scenes.new(STAGE)
        window.scene = stage; window.view_layer = stage.view_layers[0]
        window.view_layer.active_layer_collection = window.view_layer.layer_collection
        try:
            result = bpy.ops.import_scene.gltf(filepath=SOURCE)
        finally:
            # Capture partially allocated importer data even on CANCELLED/error.
            owned_meshes.update(set(bpy.data.meshes)-old_meshes)
            owned_materials.update(set(bpy.data.materials)-old_materials)
            owned_images.update(set(bpy.data.images)-old_images)
            owned_collections.update(set(bpy.data.collections)-set(collection_members))
        assert 'FINISHED' in result
        objects = [o for o in stage.objects if o.type=='MESH']
        assert len(objects)==1, 'Expected the one-draw frozen gantry.'
        source = objects[0]
        assert source not in old_objects and source.data not in old_meshes
        assert len(source.data.materials)==1 and source.data.materials[0] not in old_materials
        source.data.transform(source.matrix_world)
        source.parent = None; source.matrix_world = Matrix.Identity(4)
        mesh = source.data; mesh.update(); mesh.calc_loop_triangles()
        assert len(mesh.loop_triangles)==6300 and all(len(p.vertices)==3 for p in mesh.polygons)
        bounds = [[min(v.co[k] for v in mesh.vertices),max(v.co[k] for v in mesh.vertices)] for k in range(3)]
        expected_bounds = [[-52,52],[-7,7],[-25,54.30417251586914]]
        assert all(abs(bounds[k][j]-expected_bounds[k][j])<2e-4 for k in range(3) for j in range(2)), bounds
        removed, bank_receipts = choose_signals(mesh)
        retained = [p.index for p in mesh.polygons if p.index not in removed]
        before = source_evidence(mesh,retained)
        assert len(retained)==RETAINED_TRIANGLES
        data = build_service_geometry(); summary = geometry_summary(data)
        assert summary['candidateTriangles']<=TRIANGLE_CAP, summary
        for color, group in zip(data['colors'],data['groups']):
            reserved = color[0]>=.98 and .50<=color[1]<=.59 and color[2]<.12
            assert reserved==(group=='warm_lenses'), 'Reserved lamp palette leaked into another surface.'
        assert clipped_clearance(data['vertices'],data['faces'])>=PRACTICAL_CLEARANCE
        assert all(-52<=p[0]<=52 and -7<=p[1]<=7 and -25<=p[2]<=61.45 for p in data['vertices'])
        vertices = [tuple(v.co) for v in mesh.vertices]
        faces = [tuple(mesh.polygons[i].vertices) for i in retained]
        source_vertex_count = len(vertices)
        vertices.extend(data['vertices'])
        faces.extend(tuple(source_vertex_count+i for i in f) for f in data['faces'])
        replacement = bpy.data.meshes.new(FAMILY+'-source')
        owned_meshes.add(replacement)
        replacement.from_pydata(vertices,[],faces); replacement.update()
        replacement.materials.append(mesh.materials[0])
        colors = replacement.color_attributes.new(name=mesh.color_attributes.active_color.name,type='FLOAT_COLOR',domain='CORNER')
        normals = []
        for polygon, evidence in zip(replacement.polygons,before):
            _, source_normals, source_colors, smooth = evidence
            polygon.use_smooth = smooth
            for loop, normal, color in zip(polygon.loop_indices,source_normals,source_colors):
                normals.append(normal); colors.data[loop].color = color
        for i, polygon in enumerate(list(replacement.polygons)[len(retained):]):
            polygon.use_smooth = data['smooth'][i]
            for loop in polygon.loop_indices:
                colors.data[loop].color = data['colors'][i]; normals.append((0,0,0))
        replacement.color_attributes.active_color = colors
        replacement.update()
        # Blender5.2's packed setter re-encodes corner-space factors to short2;
        # the actual disposable probe reproduced the0.0001157373 drift. Its
        # FLOAT_VECTOR/CORNER custom_normal path returned exact input values.
        # Float normals have no zero-as-auto convention. Resolve every new
        # corner's computed normal before installing the explicit attribute.
        retained_loop_count = sum(len(mesh.polygons[i].vertices) for i in retained)
        calculated = [tuple(n.vector) for n in replacement.corner_normals]
        assert len(calculated)==len(normals)
        for i in range(retained_loop_count,len(normals)):
            normals[i] = calculated[i]
        assert all(sum(c*c for c in n)>.99 for n in normals), 'A corner has no valid normal.'
        explicit_normals = replacement.attributes.new(name='custom_normal',type='FLOAT_VECTOR',domain='CORNER')
        assert explicit_normals.name=='custom_normal' and explicit_normals.data_type=='FLOAT_VECTOR'
        explicit_normals.data.foreach_set('vector',[c for normal in normals for c in normal])
        replacement.update(); replacement.calc_loop_triangles()
        after = source_evidence(replacement,range(len(retained)))
        assert all(a[0]==b[0] and a[2]==b[2] and a[3]==b[3] for a,b in zip(before,after)), 'Retained position/color/smoothing drift.'
        normal_error = max(abs(x-y) for a,b in zip(before,after) for n,m in zip(a[1],b[1]) for x,y in zip(n,m))
        assert normal_error<3e-5, ('Retained normal drift',normal_error)
        assert len(replacement.loop_triangles)==summary['candidateTriangles']
        # The imported predecessor exists only in this isolated scene. Replace
        # its mesh, never any pre-existing Blender object or data block.
        source.data = replacement; source.name = FAMILY
        if mesh.users==0:
            owned_meshes.discard(mesh); bpy.data.meshes.remove(mesh)
        source['sourceSha256'] = SOURCE_SHA256
        source['provenance'] = 'Original Inkstorm industrial revision + preserved round29 construction; source-only service derivative round33.'
        source['removedSignalTriangles'] = 2360
        source['supportsAndFootprintsUnchanged'] = True
        source['runtimeInstalled'] = False
        source['front_axis'] = '-Y'
        source['warmLensLinearRgb'] = [1.0,.55,.095]
        source['warmLensScope'] = 'Opaque glass only; selective runtime self-light is owned externally, no emitted scene lights.'
        source['candidateTriangles'] = summary['candidateTriangles']
        final_clearance = clipped_clearance(vertices,faces)
        assert final_clearance>=PRACTICAL_CLEARANCE
        source['sourcePreflightPassed'] = True
        source['retainedTriangles'] = len(retained)
        source['localCorridorClearanceZ'] = final_clearance
        source['retainedNormalMaximumDelta'] = normal_error
        source['retainedNormalStorage'] = 'FLOAT_VECTOR/CORNER custom_normal'
        report.update({'status':'isolated source scene authored; rendered review pending',
                       'removedSignalBanks':bank_receipts,'retainedTriangles':len(retained),
                       'retainedPositionColorAndWindingExact':True,'retainedNormalMaximumDelta':normal_error,
                       'normalStorage':'FLOAT_VECTOR/CORNER custom_normal; actual computed vectors for all new corners',
                       'originalBoundsBlender':bounds,'newGeometry':summary,'finalClearanceBlenderZ':final_clearance,
                       'footprints':'Exact original geometry at X[-52,-40]/[40,52], Y[-7,7]; no new ground support.',
                       'meshes':1,'materials':1,'textures':0,'animations':0,'frontAxis':'-Y',
                       'tradeoffs':['Thicker connected main and full risers stay within V1 top and original horizontal bounds.',
                                    'Risers stand on original foot plates; world process-network sockets remain a separate integration decision.',
                                    'One larger readable hoist, four landings and two continuous ladders target actual construction within20000 triangles.']})
        if EXPORT_CANDIDATE:
            for obj in stage.objects: obj.select_set(False)
            source.select_set(True); window.view_layer.objects.active = source
            result = bpy.ops.export_scene.gltf(filepath=OUTPUT,export_format='GLB',use_selection=True,
                use_active_scene=True,export_animations=False,export_materials='EXPORT',
                export_cameras=False,export_lights=False,export_extras=True,export_yup=True)
            assert 'FINISHED' in result
            report['sourceExport'] = OUTPUT
        success = True
    finally:
        window.scene = old_scene; window.view_layer = old_layer
        old_layer.active_layer_collection = old_layer_collection
        if not success and stage is not None:
            # Only objects linked to this uniquely owned stage are removed.
            for obj in list(stage.objects):
                assert obj not in old_objects
                bpy.data.objects.remove(obj,do_unlink=True)
            bpy.data.scenes.remove(stage)
            for mesh in owned_meshes:
                if mesh.users==0: bpy.data.meshes.remove(mesh)
            for material in owned_materials:
                if material.users==0: bpy.data.materials.remove(material)
            for image in owned_images:
                if image.users==0: bpy.data.images.remove(image)
            for collection in owned_collections:
                if collection.users==0: bpy.data.collections.remove(collection)
        for obj in old_layer.objects: obj.select_set(obj in old_selected,view_layer=old_layer)
        old_layer.objects.active = old_active
        scenes_exact = all((set(s.objects),set(s.collection.children))==members for s,members in scene_members.items())
        collections_exact = all((set(c.objects),set(c.children))==members for c,members in collection_members.items())
        restored = window.scene==old_scene and window.view_layer==old_layer and old_layer.objects.active==old_active and set(bpy.context.selected_objects)==set(old_selected)
        assert scenes_exact and collections_exact and restored
        report['preservation'] = {'existingSceneCount':len(scene_members),'allExistingSceneMembershipsExact':scenes_exact,
                                  'allExistingCollectionMembershipsExact':collections_exact,'contextRestored':restored,
                                  'scene':old_scene.name,'viewLayer':old_layer.name,'active':old_active.name if old_active else None,
                                  'selectedCount':len(old_selected),'noExistingObjectsOrMaterialsEdited':True}
        print(json.dumps(report,sort_keys=True))


execute_source_authoring()
