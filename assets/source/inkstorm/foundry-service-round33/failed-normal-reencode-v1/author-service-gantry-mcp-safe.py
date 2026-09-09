"""PREPARED ONLY. Send this literal script to Blender MCP after root releases timing.

Imports the byte-preserved round32 gantry into a NEW scene. Removes only complete
countdown assemblies, retaining the truss, columns, feet and two utility pendants.
Appends original service construction with the same vertex-color material.
No file/network access, dynamic code, render, bake or shared blend save is used.
The optional GLB export is source-only and defaults OFF. Review the created scene
before exporting. This file has not been executed in Blender during preparation.
"""
import bpy
import math
import json
import collections
from mathutils import Vector, Matrix

SOURCE = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/foundry-service-round33/predecessors/foundry-gantry-round32.glb'
SOURCE_SHA256 = '3d0cd999daf52b82ac0232c7316a5e4072c80bd83982f83cbaf4a1dcde11e862'
STAGE = 'PodRacing — Foundry service gantry round33 V1'
FAMILY = 'foundry-service-gantry-v1'
OUTPUT = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/foundry-service-round33/v1/foundry-service-gantry-v1-native.glb'
EXPORT_CANDIDATE = False
TRIANGLE_CAP = 6500
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


def build_service_geometry():
    data = new_geometry()
    # A readable orange pressure main. Two swept elbows end in intentional
    # bolted blind service caps above the existing shoulders, not open mouths.
    path = [(-44,0,49.9),(-44,0,51.5)]
    for i in range(1,7):
        a = math.pi-i*math.pi/12
        path.append((-37+7*math.cos(a),0,51.5+7*math.sin(a)))
    path.append((37,0,58.5))
    for i in range(1,7):
        a = math.pi/2-i*math.pi/12
        path.append((37+7*math.cos(a),0,51.5+7*math.sin(a)))
    path.append((44,0,49.9))
    sweep(data,path,2.50,'coral','pressure_main',16)
    # One large repair joint has paired lips, a dark gasket and six through bolts.
    for x in [7.65,8.35]:
        ring(data,(x,0,58.5),(1,0,0),2.95,2.51,.24,'steel','pressure_joint',12)
    ring(data,(8,0,58.5),(1,0,0),2.70,2.51,.40,'ink','pressure_joint',8)
    bolt_circle(data,(8,0,58.5),(1,0,0),2.77,1.02,'pressure_joint',6,.18)
    # Welded sleeve joints are lower in the hierarchy than the bolted repair.
    for x in [-22,27]:
        tube(data,(x-.12,0,58.5),(x+.12,0,58.5),2.54,'rust','weld_sleeves',12)
    for x in [-44,44]:
        tube(data,(x,0,49.65),(x,0,50.05),2.91,'steel','blind_service_caps',12)
        bolt_circle(data,(x,0,49.81),(0,0,1),2.70,.74,'blind_service_caps',6,.18)
    # Three load paths land at existing truss uprights/cross-members. A saddle
    # bears under the main; a narrow strap closes over it; paired webs brace it.
    for x in [-31,1,32]:
        box(data,(x,0,51.76),(3.4,7.4,.24),'steel','pipe_saddles')
        box(data,(x,0,53.86),(1.20,1.35,3.96),'cobalt','pipe_saddles')
        for y in [-1,1]:
            wedge(data,[(x,2.8*y,51.88),(x,.58*y,51.88),(x,.58*y,55.45)],
                  (1,0,0),.25,'steel','pipe_saddles')
            tube(data,(x,3.15*y,51.70),(x,3.15*y,52.08),.19,'cream','saddle_anchor_bolts',6)
        ring(data,(x,0,58.5),(1,0,0),2.78,2.51,.55,'cobalt','pipe_saddles',8)
    # Existing rear walkway/rail is retained. This new front service strip
    # rests on the upper chord, with a continuous toe-board and supported rail.
    box(data,(0,-2.75,51.84),(90,1.70,.16),'steel','maintenance_walk')
    box(data,(0,-3.66,52.07),(90,.12,.36),'rust','maintenance_walk')
    for x in [-31,-15,17,32]:
        wedge(data,[(x,-3.60,50.90),(x,-3.60,51.78),(x,-1.90,51.78)],
              (1,0,0),.24,'cobalt','walk_brackets')
    for z in [52.76,53.65]:
        beam(data,(-45,-3.68,z),(45,-3.68,z),.15,'cream','maintenance_rail')
    for x in [-45,-35,-25,-15,-5,5,15,25,35,45]:
        beam(data,(x,-3.68,51.91),(x,-3.68,53.65),.15,'steel','maintenance_rail')
    # Offset I-rail attaches under three existing cross-members. The wheels
    # actually straddle its lower flange; the hoist is not hung from thin air.
    box(data,(-15,0,44.38),(35,1.85,.18),'steel','hoist_track')
    box(data,(-15,0,44.00),(35,.22,.68),'cobalt','hoist_track')
    box(data,(-15,0,43.62),(35,1.85,.18),'steel','hoist_track')
    for x in [-31,-15,1]:
        box(data,(x,0,44.49),(1.10,2.30,.18),'rust','hoist_track')
    # Compact cable winch, deliberately offset from the road center. Four
    # wheels rest on the lower flange; cheek plates support the drum axle.
    x = -18
    wheel_z = 43.71+.22*math.sin(math.pi/3)
    for dx in [-1.20,1.20]:
        for y in [-.65,.65]:
            tube(data,(x+dx,y-.15,wheel_z),(x+dx,y+.15,wheel_z),.22,'ink','hoist_trolley',6)
    for y in [-1.10,1.10]:
        box(data,(x,y,43.17),(3.25,.22,1.70),'coral','hoist_trolley')
        for dx in [-1.20,1.20]:
            sign = 1 if y>0 else -1
            tube(data,(x+dx,sign*.50,wheel_z),(x+dx,sign*1.34,wheel_z),.15,'cream','trolley_axles',6)
    box(data,(x,0,43.37),(3.25,2.45,.18),'steel','hoist_trolley')
    tube(data,(x,-1.15,42.94),(x,1.15,42.94),.55,'steel','hoist_drum',8)
    tube(data,(x,1.20,42.94),(x,1.70,42.94),.63,'cobalt','hoist_motor',6)
    for y in [-.86,.86]:
        tube(data,(x,y-.06,42.94),(x,y+.06,42.94),.64,'rust','hoist_drum',6)
    for y in [-.32,.32]:
        ring(data,(x,y,42.94),(0,1,0),.579,.551,.08,'ink','drum_cable_layers',8)
    # Two tensioned cable legs meet the lower pulley block. The service hook
    # ends at Z39.85+, above the old heads'39.60 clearance and pendants39.67.
    for dx in [-.40,.40]:
        tube(data,(x+dx,.10,42.58),(x+dx,.10,41.13),.075,'ink','service_cable',4)
    box(data,(x,.10,41.12),(1.35,.70,.68),'coral','lower_pulley')
    tube(data,(x,-.29,41.12),(x,.49,41.12),.38,'steel','lower_pulley',6)
    hook = [(x,.10,40.86),(x,.10,40.57),(x-.32,.10,40.40),
            (x-.38,.10,40.10),(x-.10,.10,39.99),(x+.20,.10,40.20),(x+.15,.10,40.43)]
    sweep(data,hook,.12,'steel','service_hook',6)
    # Sparse chips occupy narrow lips near the repair joint. These are small
    # opaque paint flakes, not universal grunge or transparency masks.
    for i in range(8):
        angle = (i+.25)*math.tau/8
        x0 = 7.02 if i%2 else 8.77
        vertices = [surface_point(data,'pressure_main',(xx,0,58.5),(0,math.cos(a),math.sin(a)))
                    for xx,a in [(x0,angle),(x0+.35,angle+.025),(x0+.12,angle+.095)]]
        part(data,vertices,[(0,2,1)],'rust' if i%3 else 'cream','edge_wear')
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
        assert clipped_clearance(data['vertices'],data['faces'])>=PRACTICAL_CLEARANCE
        assert all(-52<=p[0]<=52 and -7<=p[1]<=7 for p in data['vertices'])
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
        replacement.normals_split_custom_set(normals)
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
        source['candidateTriangles'] = summary['candidateTriangles']
        final_clearance = clipped_clearance(vertices,faces)
        assert final_clearance>=PRACTICAL_CLEARANCE
        source['sourcePreflightPassed'] = True
        source['retainedTriangles'] = len(retained)
        source['localCorridorClearanceZ'] = final_clearance
        source['retainedNormalMaximumDelta'] = normal_error
        report.update({'status':'isolated source scene authored; rendered review pending',
                       'removedSignalBanks':bank_receipts,'retainedTriangles':len(retained),
                       'retainedPositionColorAndWindingExact':True,'retainedNormalMaximumDelta':normal_error,
                       'originalBoundsBlender':bounds,'newGeometry':summary,'finalClearanceBlenderZ':final_clearance,
                       'footprints':'Exact original geometry at X[-52,-40]/[40,52], Y[-7,7]; no new ground support.',
                       'meshes':1,'materials':1,'textures':0,'animations':0,'frontAxis':'-Y',
                       'tradeoffs':['Top envelope grows above the original beam; world crossings need later actual-view review.',
                                    'Closed blind service flanges are authored modular terminations, not claimed connected world pipe sockets.',
                                    'One asymmetrically placed hoist and a low-count construction hierarchy fit the existing6500 triangle cap.']})
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
