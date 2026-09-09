"""DEFINITIONS ONLY. Concatenate 00-source-reference.py before this fragment.

Prepared for Blender MCP, not executed. No import, transform, save, render or
filesystem operation occurs here. Each stage explicitly calls the guards.
"""
import bpy
import collections
import json
import math
from mathutils import Vector


def fnv1a64_signature(value):
    # Non-cryptographic JSON signature. ASCII escaping and separators are
    # pinned identically to the externally prepared hierarchy reference.
    serialized = json.dumps(value, sort_keys=True, separators=(',', ':'),
                            allow_nan=False, ensure_ascii=True)
    signature = 14695981039346656037
    for character in serialized:
        signature = ((signature ^ ord(character)) * 1099511628211) & 18446744073709551615
    return format(signature, '016x')


def name_key(item):
    return item.name


def first_component_vertex_key(pair):
    return min(pair[1])

def matrix_rows(matrix):
    return [list(row) for row in matrix]


def bounds(points):
    points = list(points)
    if not points:
        return None
    return [[min(p[k] for p in points) for k in range(3)],
            [max(p[k] for p in points) for k in range(3)]]


def mesh_signature(mesh):
    # Non-cryptographic numeric signatures compare same-session structure,
    # never presented as byte equality between a Blender mesh and a GLB.
    return fnv1a64_signature({
        'vertices': [list(v.co) for v in mesh.vertices],
        'edges': [list(e.vertices) for e in mesh.edges],
        'polygons': [(list(p.vertices), p.material_index, p.use_smooth)
                     for p in mesh.polygons],
        'uv': [(layer.name, [list(item.uv) for item in layer.data])
               for layer in mesh.uv_layers],
        'materials': [m.name if m else None for m in mesh.materials],
        'shapeKeys': mesh.shape_keys.name if mesh.shape_keys else None,
        'attributes': [(a.name, a.data_type, a.domain, len(a.data))
                       for a in mesh.attributes],
    })


def socket_value(socket):
    if not hasattr(socket, 'default_value'):
        return None
    value = socket.default_value
    if isinstance(value, (str, bool, int, float)):
        return value
    try:
        return list(value)
    except TypeError:
        return str(value)


def material_record(material):
    record = {'name': material.name, 'diffuseColor': list(material.diffuse_color),
              'useNodes': material.use_nodes,
              'roughness': material.roughness, 'metallic': material.metallic,
              'useBackfaceCulling': material.use_backface_culling,
              'nodes': [], 'links': []}
    if material.use_nodes and material.node_tree:
        for node in sorted(material.node_tree.nodes, key=name_key):
            row = {'name': node.name, 'type': node.bl_idname,
                   'inputs': [(s.name, socket_value(s)) for s in node.inputs]}
            if hasattr(node, 'image'):
                row['image'] = node.image.name if node.image else None
            record['nodes'].append(row)
        record['links'] = sorted((l.from_node.name, l.from_socket.name,
                                  l.to_node.name, l.to_socket.name)
                                 for l in material.node_tree.links)
    return record


def source_signature(source):
    rows = []
    meshes = {}
    materials = {}
    for ob in sorted(source.objects, key=name_key):
        rows.append({'name': ob.name, 'type': ob.type,
                     'parent': ob.parent.name if ob.parent else None,
                     'matrixLocal': matrix_rows(ob.matrix_local),
                     'matrixWorld': matrix_rows(ob.matrix_world),
                     'data': ob.data.name if ob.data else None,
                     'hideRender': ob.hide_render,
                     'hideViewport': ob.hide_viewport,
                     'materials': [(s.link, s.material.name if s.material else None)
                                   for s in ob.material_slots]})
        if ob.type == 'MESH':
            meshes[ob.data.name] = mesh_signature(ob.data)
            for slot in ob.material_slots:
                if slot.material:
                    materials[slot.material.name] = material_record(slot.material)
    return {'algorithm': 'FNV-1a-64 over canonical ASCII JSON; non-cryptographic',
            'objectsFnv1a64': fnv1a64_signature(rows), 'meshesFnv1a64': meshes,
            'materialsFnv1a64': {name: fnv1a64_signature(row) for name, row in materials.items()}}


def global_snapshot():
    # Capture every preexisting scene/collection, including the unrelated
    # Cruise work and all isolated historical studies. No fixed scene count.
    window = bpy.context.window
    assert window is not None, 'Requires the existing interactive Blender window.'
    layer = window.view_layer
    return {'window': window, 'scene': window.scene, 'layer': layer,
            'active': layer.objects.active,
            'selected': {o for o in layer.objects if o.select_get(view_layer=layer)},
            'scenes': {s: (set(s.objects), set(s.collection.children),
                           s.frame_current, s.frame_subframe, s.camera, s.world)
                       for s in bpy.data.scenes},
            'collections': {c: (set(c.objects), set(c.children))
                            for c in bpy.data.collections},
            'objects': set(bpy.data.objects), 'meshes': set(bpy.data.meshes),
            'materials': set(bpy.data.materials)}


def restore_context(snapshot):
    # The stages never use selection operators on preexisting objects.
    snapshot['window'].scene = snapshot['scene']
    snapshot['window'].view_layer = snapshot['layer']
    assert snapshot['layer'].objects.active == snapshot['active'], 'Active object changed.'
    assert {o for o in snapshot['layer'].objects
            if o.select_get(view_layer=snapshot['layer'])} == snapshot['selected'], 'Selection changed.'


def verify_global(snapshot):
    restore_context(snapshot)
    scenes = [s.name for s, old in snapshot['scenes'].items()
              if (set(s.objects), set(s.collection.children), s.frame_current,
                  s.frame_subframe, s.camera, s.world) != old]
    collections_changed = [c.name for c, old in snapshot['collections'].items()
                           if (set(c.objects), set(c.children)) != old]
    result = {'preexistingScenes': len(snapshot['scenes']),
              'changedScenes': scenes, 'changedCollections': collections_changed,
              'contextRestored': True,
              'preexistingObjectsRetained': snapshot['objects'] <= set(bpy.data.objects),
              'preexistingMeshesRetained': snapshot['meshes'] <= set(bpy.data.meshes),
              'preexistingMaterialsRetained': snapshot['materials'] <= set(bpy.data.materials)}
    assert not scenes and not collections_changed, result
    assert all(result[k] for k in ('preexistingObjectsRetained',
                                  'preexistingMeshesRetained', 'preexistingMaterialsRetained'))
    return result


RECEIPT={'objectLineage': [{'importedName': 'teemto-cockpit.010', 'object': 'Teemto V16 intact | teemto-cockpit.010', 'triangles': 0, 'type': 'EMPTY', 'worldBounds': None}, {'importedName': 'teemto-cockpit-body.010', 'object': 'Teemto V16 intact | teemto-cockpit-body.010', 'triangles': 17923, 'type': 'MESH', 'worldBounds': [[-4.178723335266113, -15.937384605407715, 1.001510739326477], [4.177325248718262, 7.389999866485596, 5.13743257522583]]}, {'importedName': 'teemto-cockpit-graphite-v2.004', 'object': 'Teemto V16 intact | teemto-cockpit-graphite-v2.004', 'triangles': 336, 'type': 'MESH', 'worldBounds': [[-0.5084967017173767, 3.436000108718872, 2.124769449234009], [0.5584967136383057, 7.064000129699707, 2.819999933242798]]}, {'importedName': 'teemto-engine-left.010', 'object': 'Teemto V16 intact | teemto-engine-left.010', 'triangles': 0, 'type': 'EMPTY', 'worldBounds': None}, {'importedName': 'teemto-engine-left-body.013', 'object': 'Teemto V16 intact | teemto-engine-left-body.013', 'triangles': 11790, 'type': 'MESH', 'worldBounds': [[-6.54527473449707, -22.738540649414062, 0.07286620140075684], [-1.3186402320861816, -5.0940141677856445, 5.191770553588867]]}, {'importedName': 'teemto-engine-right.010', 'object': 'Teemto V16 intact | teemto-engine-right.010', 'triangles': 0, 'type': 'EMPTY', 'worldBounds': None}, {'importedName': 'teemto-engine-right-body.013', 'object': 'Teemto V16 intact | teemto-engine-right-body.013', 'triangles': 11790, 'type': 'MESH', 'worldBounds': [[1.2777190208435059, -22.736522674560547, 0.11396288871765137], [6.496447563171387, -5.1262664794921875, 5.250973701477051]]}, {'importedName': 'teemto-pilot-construction-v4b.011', 'object': 'Teemto V16 intact | teemto-pilot-construction-v4b.011', 'triangles': 0, 'type': 'EMPTY', 'worldBounds': None}, {'importedName': 'teemto-pilot-accent.012', 'object': 'Teemto V16 intact | teemto-pilot-accent.012', 'triangles': 188, 'type': 'MESH', 'worldBounds': [[-0.3497789800167084, 5.051327228546143, 2.1751253604888916], [0.3465256690979004, 5.6404194831848145, 3.2211050987243652]]}, {'importedName': 'teemto-pilot-hardware.012', 'object': 'Teemto V16 intact | teemto-pilot-hardware.012', 'triangles': 1552, 'type': 'MESH', 'worldBounds': [[-0.17999997735023499, 5.061928749084473, 2.403860569000244], [0.18000000715255737, 5.627439498901367, 3.215754508972168]]}, {'importedName': 'teemto-pilot-rubber.011', 'object': 'Teemto V16 intact | teemto-pilot-rubber.011', 'triangles': 2228, 'type': 'MESH', 'worldBounds': [[-0.38293713331222534, 4.128168106079102, 2.29592227935791], [0.4204370379447937, 5.509989261627197, 2.9088850021362305]]}, {'importedName': 'teemto-pilot-shell.012', 'object': 'Teemto V16 intact | teemto-pilot-shell.012', 'triangles': 1444, 'type': 'MESH', 'worldBounds': [[-0.21125000715255737, 5.070261001586914, 2.2050418853759766], [0.21125000715255737, 5.660841464996338, 3.2183940410614014]]}, {'importedName': 'teemto-pilot-suit.014', 'object': 'Teemto V16 intact | teemto-pilot-suit.014', 'triangles': 9359, 'type': 'MESH', 'worldBounds': [[-0.37821540236473083, 4.231770992279053, 2.0615973472595215], [0.3790219724178314, 5.545644283294678, 2.8416998386383057]]}, {'importedName': 'teemto-pilot-webbing.011', 'object': 'Teemto V16 intact | teemto-pilot-webbing.011', 'triangles': 1008, 'type': 'MESH', 'worldBounds': [[-0.22436034679412842, 5.0683794021606445, 2.1737446784973145], [0.22436034679412842, 5.492895603179932, 2.8099563121795654]]}], 'preservation': {'changedCollections': [], 'changedScenes': [], 'contextRestored': True, 'preexistingMaterialsRetained': True, 'preexistingMeshesRetained': True, 'preexistingObjectsRetained': True, 'preexistingScenes': 158}, 'scene': 'PodRacing — Teemto damage V16 pinned intact source', 'sceneCountAfter': 159, 'source': '/Users/amir/Projects/PodRacing/assets/source/inkstorm/combat-round35/authored-damage-v16/intact-teemto-hero-open-v2.glb', 'sourceByteSha256External': 'af5d69514a51f7e9c089a1710e1587f46e053412b488268dc433f029576c0a7e', 'sourceCornerNormalSignature': {'Teemto V16 intact | teemto-cockpit-body.010': '9382f910099bc601', 'Teemto V16 intact | teemto-cockpit-graphite-v2.004': '132df80f7c33ca18', 'Teemto V16 intact | teemto-engine-left-body.013': '3b500e2c7a5825dd', 'Teemto V16 intact | teemto-engine-right-body.013': '7aef17b76c4e629a', 'Teemto V16 intact | teemto-pilot-accent.012': '7c08fe40eb2c04d1', 'Teemto V16 intact | teemto-pilot-hardware.012': '88181e21307fa0e5', 'Teemto V16 intact | teemto-pilot-rubber.011': 'e49cfe35f0906308', 'Teemto V16 intact | teemto-pilot-shell.012': 'f4ffdc2e4c748718', 'Teemto V16 intact | teemto-pilot-suit.014': 'e575604e8cb0aaef', 'Teemto V16 intact | teemto-pilot-webbing.011': '8262de21606329fe'}, 'sourceSignature': {'algorithm': 'FNV-1a-64 over canonical ASCII JSON; non-cryptographic', 'materialsFnv1a64': {'Inkstorm Teemto Cabina.010': '84a190a31752d503', 'Inkstorm Teemto Propulsores.010': '357ee598525ed769', 'Inkstorm Teemto open cockpit graphite structure v2.002': '3bb7c93e1e5773b7', 'Pilot atlas v4c runtime accent.010': '64b1bc57c8cd87d3', 'Pilot atlas v4c runtime hardware.010': '687498f7c34d4d21', 'Pilot atlas v4c runtime rubber.010': '01dd8b072d5a718b', 'Pilot atlas v4c runtime shell.010': '7dd33061bdb7833d', 'Pilot atlas v4c runtime suit.010': '68c35d6d93fb236c', 'Pilot atlas v4c runtime webbing.010': '4a58791ddae39d97'}, 'meshesFnv1a64': {'Original Inkstorm pilot v4b accent.020': '9a067cd28a08e408', 'Original Inkstorm pilot v4b hardware.020': 'a694a60f635a2188', 'Original Inkstorm pilot v4b rubber.020': 'd2ae9e9a36310ea7', 'Original Inkstorm pilot v4b shell.020': 'fc291625cd603f3b', 'Original Inkstorm pilot v4b suit.020': '7f0f525457296020', 'Original Inkstorm pilot v4b webbing.020': '4375ac6750711674', 'Pilot v4b unchanged body Inkstorm Teemto Propulsores-alerones_low.002_Propulsores_0.014': '5cd3bbc196fde3be', 'Pilot v4b unchanged body Inkstorm Teemto Propulsores-alerones_low_Propulsores_0.014': 'a3e922f57e854300', 'teemto-cockpit-graphite-v2.004': 'a890cdd6a57013c4', 'teemto-open-cockpit-hull-v2.004': 'f07a34b64d7003e1'}, 'objectsFnv1a64': '2b999a793171538b'}, 'stage': 'V16 pinned source import', 'success': True}
# Composed after00-shared-guards.py and actual import RECEIPT.
from mathutils.geometry import tessellate_polygon
SOURCE_SCENE=RECEIPT['scene']
STAGE='PodRacing — Teemto authored damage V16 A'
assert bpy.context.mode=='OBJECT' and not bpy.app.is_job_running('RENDER')
assert STAGE not in bpy.data.scenes
source=bpy.data.scenes[SOURCE_SCENE]
assert source_signature(source)==RECEIPT['sourceSignature']
assert {o.name:fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in source.objects if o.type=='MESH'}==RECEIPT['sourceCornerNormalSignature']
snapshot=global_snapshot()
stage=None
success=False
report={'stage':'V16 authored fracture A','sourceScene':SOURCE_SCENE,'sourceByteSha256External':RECEIPT['sourceByteSha256External'],'geometryOnlyRuntimeExport':True,'newTextures':0,'lineage':[]}
new_parts=[]

def game_vector(p):
    return Vector((p[0],p[2],-p[1]))

def blender_vector(p):
    return Vector((p[0],-p[2],p[1]))

def coordinate_key(p):
    return tuple(round(v,5) for v in p)

def source_triangles(ob):
    rows=[]
    uv=ob.data.uv_layers.active
    assert uv is not None
    transform=ob.matrix_world.to_3x3().inverted().transposed()
    for face in ob.data.polygons:
        assert len(face.vertices)==3
        corners=[]
        for li in face.loop_indices:
            pos=game_vector(ob.matrix_world@ob.data.vertices[ob.data.loops[li].vertex_index].co)
            normal=game_vector(transform@ob.data.corner_normals[li].vector).normalized()
            corners.append((pos,normal,Vector(uv.data[li].uv)))
        rows.append((corners,face.index))
    return rows

def interpolate(a,b,t):
    return (a[0].lerp(b[0],t),a[1].lerp(b[1],t).normalized(),a[2].lerp(b[2],t))

def cut_triangles(rows,cut,positive):
    out=[]
    segments=[]
    canonical={}
    for corners,lineage in rows:
        poly=[]
        crossings=[]
        for a,b in zip(corners,corners[1:]+corners[:1]):
            da=a[0].z-cut
            db=b[0].z-cut
            inside_a=da>=0 if positive else da<=0
            inside_b=db>=0 if positive else db<=0
            if inside_a:poly.append(a)
            if inside_a!=inside_b:
                v=interpolate(a,b,da/(da-db))
                key=coordinate_key(v[0])
                if key not in canonical:canonical[key]=v[0].copy()
                v=(canonical[key].copy(),v[1],v[2])
                poly.append(v)
                crossings.append(v[0])
        if len(crossings)==2:segments.append((coordinate_key(crossings[0]),coordinate_key(crossings[1])))
        for i in range(1,len(poly)-1):out.append(([poly[0],poly[i],poly[i+1]],lineage))
    adjacency={}
    for a,b in segments:
        adjacency.setdefault(a,[]).append(b)
        adjacency.setdefault(b,[]).append(a)
    assert all(len(v)==2 for v in adjacency.values()), ('Cut boundary not closed degree2',cut,collections.Counter(len(v) for v in adjacency.values()))
    loops=[]
    remaining=set(adjacency)
    while remaining:
        first=min(remaining)
        loop=[first]
        previous=None
        current=first
        while True:
            choices=adjacency[current]
            following=choices[0] if choices[0]!=previous else choices[1]
            if following==first:break
            assert following not in loop
            loop.append(following)
            previous=current
            current=following
        for key in loop:remaining.remove(key)
        loops.append([canonical[key].copy() for key in loop])
    return out,loops

def torn_offset(p,amount):
    return amount*(.65*math.sin(p.x*5.3+p.y*3.7)+.35*math.sin(p.x*11.1-p.y*6.1))

def add_triangle(rows,a,b,c,uvs,lineage,normal_sign=0):
    normal=(b-a).cross(c-a)
    if normal.length_squared<1e-16:return
    normal.normalize()
    if normal_sign and normal.z*normal_sign<0:b,c=c,b;uvs=[uvs[0],uvs[2],uvs[1]];normal.negate()
    rows.append(([(a.copy(),normal.copy(),Vector(uvs[0])),(b.copy(),normal.copy(),Vector(uvs[1])),(c.copy(),normal.copy(),Vector(uvs[2]))],lineage))

def cap_cut(rows,loops,cut,positive,jagged,uv_patch):
    sign=-1 if positive else 1
    # Only newly cut vertices acquire a bounded torn edge. Original vertices,
    # UVs and requested normals away from the seam are retained.
    for corners,lineage in rows:
        for pos,normal,uv in corners:
            if abs(pos.z-cut)<.00001:pos.z+=torn_offset(pos,jagged)
    added_before=len(rows)
    loop_records=[]
    for loop_index,loop in enumerate(loops):
        area=sum(loop[i].x*loop[(i+1)%len(loop)].y-loop[(i+1)%len(loop)].x*loop[i].y for i in range(len(loop)))
        if (area>0)!=(sign>0):loop=list(reversed(loop))
        center=sum(loop,Vector())/len(loop)
        rad=max((p-center).length for p in loop)
        depth=min(.28,rad*.45)
        outer=[];inner=[]
        for p in loop:
            q=p.copy();q.z+=torn_offset(q,jagged);outer.append(q)
            q=center+(p-center)*.89;q.z=cut-sign*depth;inner.append(q)
        # Ring thickness and closed inset mechanical end cap. New normals are
        # geometrically authored; no recalc on retained source surface normals.
        for i in range(len(loop)):
            j=(i+1)%len(loop)
            add_triangle(rows,outer[i],outer[j],inner[j],[(uv_patch[0],uv_patch[1])]*3,-1)
            add_triangle(rows,outer[i],inner[j],inner[i],[(uv_patch[0]+.015,uv_patch[1])]*3,-1)
        tris=tessellate_polygon([inner])
        for triangle_indices in tris:
            tri=[inner[i] for i in triangle_indices]
            uv=[]
            for p in tri:uv.append((uv_patch[0]+(p.x-center.x)/max(rad,.01)*.025,uv_patch[1]+(p.y-center.y)/max(rad,.01)*.025))
            add_triangle(rows,tri[0],tri[1],tri[2],uv,-2,sign)
        loop_records.append({'loop':loop_index,'vertices':len(loop),'centerGame':list(center),'radius':rad,'depth':depth})
    return {'loops':loop_records,'newCapTriangles':len(rows)-added_before,'jaggedAmplitudeBound':jagged}

def authored_mesh(name,rows,material,source_object,cap_info):
    coords=[c[0] for corners,lineage in rows for c in corners]
    lo=Vector([min(p[k] for p in coords) for k in range(3)])
    hi=Vector([max(p[k] for p in coords) for k in range(3)])
    pivot=(lo+hi)*.5
    verts=[];faces=[];normals=[];uvs=[]
    for corners,lineage in rows:
        offset=len(verts)
        for pos,n,uv in corners:verts.append(tuple(blender_vector(pos-pivot)));normals.append(tuple(blender_vector(n)));uvs.append(tuple(uv))
        faces.append((offset,offset+1,offset+2))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    uv=mesh.uv_layers.new(name='UVMap')
    for i,value in enumerate(uvs):uv.data[i].uv=value
    for poly in mesh.polygons:poly.use_smooth=True
    mesh.normals_split_custom_set(normals)
    mesh.materials.append(material)
    lineage_attr=mesh.attributes.new('damage_source_triangle','INT','FACE')
    for i,row in enumerate(rows):lineage_attr.data[i].value=row[1]
    ob=bpy.data.objects.new(name,mesh)
    ob.location=blender_vector(pivot)
    stage.collection.objects.link(ob)
    ob['sourceObject']=source_object
    ob['sourceByteSha256']=RECEIPT['sourceByteSha256External']
    ob['damagePrototype']='V16 A'
    ob['pivotGame']=list(pivot)
    ob['sourceTriangleCount']=sum(1 for row in rows if row[1]>=0)
    ob['newCapTriangleCount']=sum(1 for row in rows if row[1]<0)
    new_parts.append(ob)
    report['lineage'].append({'object':name,'sourceObject':source_object,'material':material.name,'triangles':len(rows),'pivotGame':list(pivot),'boundsGame':[list(lo),list(hi)],'capInfo':cap_info,'sourceTriangleIndices':[row[1] for row in rows]})
    return ob

try:
    stage=bpy.data.scenes.new(STAGE)
    snapshot['window'].scene=stage
    snapshot['window'].view_layer=stage.view_layers[0]
    cockpit=source.objects['Teemto V16 intact | teemto-cockpit-body.010']
    right=source.objects['Teemto V16 intact | teemto-engine-right-body.013']
    # Source pilot, unchanged left engine and graphite cockpit retain their
    # exact shared geometry/material datablocks. Only object instances copied.
    retained=[]
    for ob in source.objects:
        if ob.type!='MESH' or ob in {cockpit,right}:continue
        copy=ob.copy()
        copy.parent=None
        copy.matrix_world=ob.matrix_world.copy()
        copy.name='Teemto V16 retained | '+ob.name
        stage.collection.objects.link(copy)
        retained.append(copy)
    cockpit_rows=source_triangles(cockpit)
    stub_rows,stub_loops=cut_triangles(cockpit_rows,3.5,False)
    tether_rows,tether_loops=cut_triangles(cockpit_rows,3.5,True)
    assert len(tether_loops)==len(stub_loops)
    stub_caps=cap_cut(stub_rows,stub_loops,3.5,False,.035,(.46,.64))
    tether_caps=cap_cut(tether_rows,tether_loops,3.5,True,.035,(.46,.64))
    authored_mesh('teemto-damage-cockpit-stubs-v16',stub_rows,cockpit.data.materials[0],cockpit.name,stub_caps)
    authored_mesh('teemto-damage-severed-tethers-v16',tether_rows,cockpit.data.materials[0],cockpit.name,tether_caps)
    right_rows=source_triangles(right)
    front_rows,front_loops=cut_triangles(right_rows,15.2,True)
    rear_rows,rear_loops=cut_triangles(right_rows,15.2,False)
    assert len(front_loops)==len(rear_loops)
    front_caps=cap_cut(front_rows,front_loops,15.2,True,.24,(.45,.67))
    rear_caps=cap_cut(rear_rows,rear_loops,15.2,False,.24,(.45,.67))
    authored_mesh('teemto-damage-right-front-v16',front_rows,right.data.materials[0],right.name,front_caps)
    authored_mesh('teemto-damage-right-rear-v16',rear_rows,right.data.materials[0],right.name,rear_caps)
    bpy.context.view_layer.update()
    total=sum(len(o.data.polygons) for o in stage.objects if o.type=='MESH')
    assert total<=60000, total
    assert len([o for o in stage.objects if o.type=='MESH'])==12
    report.update({'scene':stage.name,'triangles':total,'newGeometryTriangles':sum(len(o.data.polygons) for o in new_parts),'retainedMeshes':len(retained),'newGeometryMeshes':len(new_parts),'sourceSignaturePreserved':source_signature(source)==RECEIPT['sourceSignature'],'sourceCornerNormalSignaturePreserved':{o.name:fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in source.objects if o.type=='MESH'}==RECEIPT['sourceCornerNormalSignature'],'damageSignature':source_signature(stage),'damageCornerNormalSignature':{o.name:fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in stage.objects if o.type=='MESH'}})
    assert report['sourceSignaturePreserved'] and report['sourceCornerNormalSignaturePreserved']
    success=True
finally:
    if not success:
        for ob in list(bpy.data.objects):
            if ob not in snapshot['objects']:bpy.data.objects.remove(ob,do_unlink=True)
        if stage:bpy.data.scenes.remove(stage)
        for mesh in list(bpy.data.meshes):
            if mesh not in snapshot['meshes'] and mesh.users==0:bpy.data.meshes.remove(mesh)
    report['preservation']=verify_global(snapshot)
    report['sceneCountAfter']=len(bpy.data.scenes)
    report['success']=success
    print('TEEMTO_DAMAGE_RECEIPT_BEGIN')
    print(json.dumps(report,sort_keys=True,allow_nan=False))
    print('TEEMTO_DAMAGE_RECEIPT_END')
