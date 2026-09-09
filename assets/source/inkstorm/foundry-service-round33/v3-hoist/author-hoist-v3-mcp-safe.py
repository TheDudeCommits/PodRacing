"""V3 hoist-only source derivative. Root invokes this literal source through Blender MCP.

Imports the byte-preserved V2 service gantry into a NEW scene. Replaces only its
1632 hoist triangles, retaining every other V2 triangle and attribute relationship.
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

SOURCE = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/foundry-service-round33/v2/foundry-service-gantry-v2.glb'
SOURCE_SHA256 = '58fc12d837039eb73111886b1b91c294516c51fc47a4a0d00200717161fd39ba'
STAGE = 'PodRacing — Foundry service gantry round33 hoist V3'
FAMILY = 'foundry-service-gantry-v3'
OUTPUT = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/foundry-service-round33/v3-hoist/foundry-service-gantry-v3-native.glb'
EXPORT_CANDIDATE = False
TRIANGLE_CAP = 20000
RETAINED_TRIANGLES = 18324
PRACTICAL_CLEARANCE = 39.66998  # Original39.669998 float32 clearance retained.
PAINT = {
    'ink': (.040, .045, .085), 'shadow': (.105, .095, .165),
    'cobalt': (.075, .18, .29), 'steel': (.19, .25, .29),
    'coral': (.80, .225, .10), 'rust': (.42, .095, .055),
    'cream': (.86, .68, .40), 'pale': (.96, .83, .59),
}


HOIST_TRIANGLE_INDICES = range(18204,19836)
HOIST_ORIENTED_FNV32 = 2540492234

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


# Pure arithmetic V3 geometry fragment. Embedded into the isolated MCP author;
# this fragment does not import Blender or run a scene mutation.
def build_service_geometry():
    data = new_geometry()
    x, y = -16, 5.6
    # A forward service monorail sits outside the near truss, carried by the
    # original -31/-15/+1 joint stations. These are real supported outriggers.
    box(data,(-15,y,48.45),(35,2.6,.25),'steel','hoist_track')
    box(data,(-15,y,47.75),(35,.35,1.30),'cobalt','hoist_track')
    box(data,(-15,y,47.0),(35,2.6,.25),'steel','hoist_track')
    for station in [-31,-15,1]:
        box(data,(station,4.39,47.6),(1.8,.27,2.6),'steel','hoist_mounts')
        wedge(data,[(station,4.28,46.30),(station,4.28,48.32),(station,6.65,48.32)],
              (1,0,0),.44,'cobalt','hoist_mounts')
        for z in [46.65,48.30]:
            tube(data,(station,4.2,z),(station,4.67,z),.27,'cream','hoist_mounts',6)
    # Wheels and exposed axles remain distinct from open triangular bearing
    # brackets; the V2 full orange near-side masking rectangle is eliminated.
    wheel_z = 47.125+.5
    for dx in [-2.45,2.45]:
        for sign in [-1,1]:
            tube(data,(x+dx,y+sign*.85-.16,wheel_z),(x+dx,y+sign*.85+.16,wheel_z),.50,'ink','hoist_wheels',8)
            tube(data,(x+dx,y+sign*.52,wheel_z),(x+dx,y+sign*1.27,wheel_z),.23,'cream','hoist_axles',6)
        wedge(data,[(x+dx,4.55,47.7),(x+dx,6.85,47.7),(x+dx,6.75,44.32)],
              (1,0,0),.34,'steel','hoist_bearings')
        for z in [44.70,47.35]:
            tube(data,(x+dx-.24,6.32,z),(x+dx+.24,6.32,z),.29,'cream','hoist_bearings',6)
    # The horizontal drum faces the road through its curved barrel, not a plate.
    # Its barrel bottom44.78 and flange bottom44.68 clears the preserved original near conduit top44.59.
    drum_y, drum_z = 5.85, 45.8
    tube(data,(x-2.1,drum_y,drum_z),(x+2.1,drum_y,drum_z),1.02,'steel','hoist_drum',12)
    for dx in [-2.04,2.04]:
        tube(data,(x+dx-.1,drum_y,drum_z),(x+dx+.1,drum_y,drum_z),1.12,'rust','hoist_drum',12)
    for dx in [-1.50,-.50,.50,1.50]:
        ring(data,(x+dx,drum_y,drum_z),(1,0,0),1.14,1.021,.18,'ink','drum_cable_wrap',8)
    tube(data,(x+2.38,drum_y,drum_z),(x+3.75,drum_y,drum_z),.86,'coral','hoist_motor',12)
    for dx in [2.63,3.29]:
        ring(data,(x+dx,drum_y,drum_z),(1,0,0),.95,.861,.16,'steel','motor_fins',12)
    # Two separated cable legs are attached at the visible lower drum quadrant
    # and meet the lower sheave. Their Y6.2 plane clears the Y5.9 conduit.
    for dx in [-.76,.76]:
        tube(data,(x+dx,6.2,44.84),(x+dx,6.2,42.85),.105,'ink','service_cable',6)
    # Circular guard rims expose the sheave and its axle. There is no solid
    # orange pulley block obscuring the cable route or the hook's throat.
    for yy in [5.80,6.45]:
        ring(data,(x,yy,42.2),(0,1,0),.88,.65,.18,'coral','lower_pulley',12)
    tube(data,(x,5.76,42.2),(x,6.5,42.2),.65,'steel','lower_pulley',12)
    tube(data,(x,5.60,42.2),(x,6.68,42.2),.22,'cream','lower_pulley',6)
    # A broad true open J-hook uses the available height above the invariant
    #39.67 corridor. Its loop is not filled by any backing plate.
    hook=[(x,6.2,41.57),(x,6.2,41.05),(x-.55,6.2,40.73),
          (x-.85,6.2,40.35),(x-.63,6.2,40.0),(x-.05,6.2,39.96),
          (x+.55,6.2,40.22),(x+.62,6.2,40.74)]
    sweep(data,hook,.22,'steel','service_hook',8)
    return data


def geometry_summary(data):
    counts = collections.Counter()
    for face, group in zip(data['faces'],data['groups']): counts[group] += len(face)-2
    points = data['vertices']
    bounds = [[min(p[i] for p in points),max(p[i] for p in points)] for i in range(3)]
    return {'vertices':len(points),'triangles':sum(counts.values()),'trianglesByGroup':dict(sorted(counts.items())),
            'boundsBlender':bounds,'retainedTriangles':RETAINED_TRIANGLES,'candidateTriangles':RETAINED_TRIANGLES+sum(counts.values())}


def choose_hoist(mesh):
    # glTF import must preserve these exact oriented triangles at these indices.
    # A moved/reordered source fails closed rather than deleting nearby truss.
    selected = set(HOIST_TRIANGLE_INDICES)
    keys = []
    for index in selected:
        polygon = mesh.polygons[index]
        points = [tuple(round(c*100000) for c in mesh.vertices[i].co) for i in polygon.vertices]
        assert len(points)==3
        rotations = [tuple(c for p in points[k:]+points[:k] for c in p) for k in range(3)]
        keys.append(min(rotations))
    checksum = 2166136261
    for triangle in sorted(keys):
        for value in triangle:
            for shift in [0,8,16,24]: checksum = ((checksum^((value>>shift)&255))*16777619)&0xffffffff
    assert len(selected)==1632 and checksum==HOIST_ORIENTED_FNV32, ('V2 hoist selector drift',len(selected),checksum)
    return selected, [{'kind':'V2 hoist only','triangles':1632,'orientedFnv32':checksum}]


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
        assert len(mesh.loop_triangles)==19956 and all(len(p.vertices)==3 for p in mesh.polygons)
        bounds = [[min(v.co[k] for v in mesh.vertices),max(v.co[k] for v in mesh.vertices)] for k in range(3)]
        expected_bounds = [[-52,52],[-7,7],[-25,61.400001525878906]]
        assert all(abs(bounds[k][j]-expected_bounds[k][j])<2e-4 for k in range(3) for j in range(2)), bounds
        removed, bank_receipts = choose_hoist(mesh)
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
        source['replacedV2HoistTriangles'] = 1632
        source['preservedV2UnrelatedTriangles'] = 18324
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
                       'replacedV2Hoist':bank_receipts,'retainedTriangles':len(retained),
                       'retainedPositionColorAndWindingExact':True,'retainedNormalMaximumDelta':normal_error,
                       'normalStorage':'FLOAT_VECTOR/CORNER custom_normal; actual computed vectors for all new corners',
                       'originalBoundsBlender':bounds,'newGeometry':summary,'finalClearanceBlenderZ':final_clearance,
                       'footprints':'Exact original geometry at X[-52,-40]/[40,52], Y[-7,7]; no new ground support.',
                       'meshes':1,'materials':1,'textures':0,'animations':0,'frontAxis':'-Y',
                       'tradeoffs':['Only V2 hoist geometry is replaced; all unrelated V2 geometry is retained.',
                                    'A forward supported rail exposes the drum above the retained near conduit; actual camera review is pending.',
                                    'No broad near-side masking cheek; separated drum/cables/sheave and a larger open hook retain original corridor clearance.']})
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
