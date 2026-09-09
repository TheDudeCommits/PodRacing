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


RECEIPT={'objectLineage': [{'importedName': 'teemto-cockpit.010', 'object': 'Teemto V16 rival intact | teemto-cockpit.010', 'triangles': 0, 'type': 'EMPTY', 'worldBounds': None}, {'importedName': 'teemto-cockpit-body.010', 'object': 'Teemto V16 rival intact | teemto-cockpit-body.010', 'triangles': 12026, 'type': 'MESH', 'worldBounds': [[-1.3348463773727417, -1.1882781982421875, 1.001510739326477], [1.3557040691375732, 7.333491802215576, 4.498374938964844]]}, {'importedName': 'teemto-engine-left.010', 'object': 'Teemto V16 rival intact | teemto-engine-left.010', 'triangles': 0, 'type': 'EMPTY', 'worldBounds': None}, {'importedName': 'teemto-engine-left-body.013', 'object': 'Teemto V16 rival intact | teemto-engine-left-body.013', 'triangles': 5426, 'type': 'MESH', 'worldBounds': [[-6.54527473449707, -22.738540649414062, 0.07286620140075684], [-1.3187763690948486, -5.0940141677856445, 5.1863298416137695]]}, {'importedName': 'teemto-engine-right.010', 'object': 'Teemto V16 rival intact | teemto-engine-right.010', 'triangles': 0, 'type': 'EMPTY', 'worldBounds': None}, {'importedName': 'teemto-engine-right-body.013', 'object': 'Teemto V16 rival intact | teemto-engine-right-body.013', 'triangles': 5378, 'type': 'MESH', 'worldBounds': [[1.2777190208435059, -22.736522674560547, 0.12051224708557129], [6.496447563171387, -5.1262664794921875, 5.250973701477051]]}, {'importedName': 'teemto-pilot.002', 'object': 'Teemto V16 rival intact | teemto-pilot.002', 'triangles': 0, 'type': 'EMPTY', 'worldBounds': None}, {'importedName': 'teemto-pilot-helmet.002', 'object': 'Teemto V16 rival intact | teemto-pilot-helmet.002', 'triangles': 514, 'type': 'MESH', 'worldBounds': [[-0.3725000321865082, 4.624944686889648, 2.3902416229248047], [0.36919623613357544, 5.669759273529053, 3.275423288345337]]}, {'importedName': 'teemto-pilot-orange.002', 'object': 'Teemto V16 rival intact | teemto-pilot-orange.002', 'triangles': 1166, 'type': 'MESH', 'worldBounds': [[-0.30346211791038513, 4.555837154388428, 2.1005306243896484], [0.30346211791038513, 5.563058376312256, 3.2314445972442627]]}, {'importedName': 'teemto-pilot-suit.014', 'object': 'Teemto V16 rival intact | teemto-pilot-suit.014', 'triangles': 1410, 'type': 'MESH', 'worldBounds': [[-0.3674999177455902, 4.12967586517334, 2.054417371749878], [0.3675000071525574, 5.534947395324707, 3.009394645690918]]}, {'importedName': 'teemto-pilot-visor.002', 'object': 'Teemto V16 rival intact | teemto-pilot-visor.002', 'triangles': 260, 'type': 'MESH', 'worldBounds': [[-0.19249999523162842, 5.22206974029541, 2.9972448348999023], [0.19249998033046722, 5.355953216552734, 3.1874423027038574]]}], 'preservation': {'changedCollections': [], 'changedScenes': [], 'contextRestored': True, 'preexistingMaterialsRetained': True, 'preexistingMeshesRetained': True, 'preexistingObjectsRetained': True, 'preexistingScenes': 161}, 'scene': 'PodRacing — Teemto damage V16 pinned intact rival source', 'sceneCountAfter': 162, 'source': '/Users/amir/Projects/PodRacing/assets/source/inkstorm/combat-round35/authored-damage-v16/intact-teemto-rival.glb', 'sourceByteSha256External': '3d9d8d8d924258b84553de7f31f44dc4f69f069511cb6358ab2c174768e3385f', 'sourceCornerNormalSignature': {'Teemto V16 rival intact | teemto-cockpit-body.010': 'bd9c934bceef6995', 'Teemto V16 rival intact | teemto-engine-left-body.013': '4c8a33c5cc2b3013', 'Teemto V16 rival intact | teemto-engine-right-body.013': 'd21bc4a781a4398a', 'Teemto V16 rival intact | teemto-pilot-helmet.002': '18c33a9ae8439df7', 'Teemto V16 rival intact | teemto-pilot-orange.002': '7591d69d6a413dcf', 'Teemto V16 rival intact | teemto-pilot-suit.014': '3f30b7dac8d3f025', 'Teemto V16 rival intact | teemto-pilot-visor.002': '1e6c6bddc4e0642f'}, 'sourceSignature': {'algorithm': 'FNV-1a-64 over canonical ASCII JSON; non-cryptographic', 'materialsFnv1a64': {'Inkstorm Teemto Cabina.011': 'a93bedcebea3fcac', 'Inkstorm Teemto Propulsores.011': 'c975e02c63d5519a', 'Teemto original pilot helmet.002': 'e8699fe76db560cc', 'Teemto original pilot orange.002': '808b24240ee5c140', 'Teemto original pilot suit.002': '9ce869624a170788', 'Teemto original pilot visor.002': '68a4fcd55cfc3246'}, 'meshesFnv1a64': {'Inkstorm Teemto Gabina-exterior-timon_low_Cabina_0.002': 'c10d4e242fd0b9e8', 'Inkstorm Teemto Propulsores-alerones_low.002_Propulsores_0.002': 'c78021a93e4d9596', 'Inkstorm Teemto Propulsores-alerones_low_Propulsores_0.002': '59d984da259e8ff2', 'Sphere.136': '1e9c2c0cd1f76867', 'Sphere.137': 'f928a10ab3d10453', 'Sphere.138': '0cf2bad63140b658', 'Sphere.139': '59b6f2582aed375f'}, 'objectsFnv1a64': '24a955528f2a5c0b'}, 'stage': 'V16 pinned source import', 'success': True}
from mathutils.geometry import tessellate_polygon
SOURCE_SCENE=RECEIPT['scene']
STAGE='PodRacing — Teemto authored damage V16 rival B'
assert bpy.context.mode=='OBJECT' and not bpy.app.is_job_running('RENDER')
assert STAGE not in bpy.data.scenes
source=bpy.data.scenes[SOURCE_SCENE]
assert source_signature(source)==RECEIPT['sourceSignature']
assert {o.name:fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in source.objects if o.type=='MESH'}==RECEIPT['sourceCornerNormalSignature']
snapshot=global_snapshot()
stage=None
success=False
report={'stage':'V16 authored fracture B','sourceScene':SOURCE_SCENE,'sourceByteSha256External':RECEIPT['sourceByteSha256External'],'geometryOnlyRuntimeExport':True,'newTextures':0,'lineage':[]}
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
        depth=min(.28,rad*.45)*(1+.6*loop_index)
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
    ob['damagePrototype']='V16 B'
    ob['runtimeName']=name
    ob['pivotGame']=list(pivot)
    ob['sourceTriangleCount']=sum(1 for row in rows if row[1]>=0)
    ob['newCapTriangleCount']=sum(1 for row in rows if row[1]<0)
    new_parts.append(ob)
    report['lineage'].append({'object':ob.name,'runtimeName':name,'sourceObject':source_object,'material':material.name,'triangles':len(rows),'pivotGame':list(pivot),'boundsGame':[list(lo),list(hi)],'capInfo':cap_info,'sourceTriangleIndices':[row[1] for row in rows]})
    return ob

try:
    stage=bpy.data.scenes.new(STAGE)
    snapshot['window'].scene=stage
    snapshot['window'].view_layer=stage.view_layers[0]
    cockpit=source.objects['Teemto V16 rival intact | teemto-cockpit-body.010']
    right=source.objects['Teemto V16 rival intact | teemto-engine-right-body.013']
    # Source pilot, unchanged left engine and graphite cockpit retain their
    # exact shared geometry/material datablocks. Only object instances copied.
    retained=[]
    for ob in source.objects:
        if ob.type!='MESH' or ob is right:continue
        copy=ob.copy()
        copy.parent=None
        copy.matrix_world=ob.matrix_world.copy()
        copy.name='Teemto V16 retained | '+ob.name
        stage.collection.objects.link(copy)
        retained.append(copy)
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
    assert total<=30000, total
    assert len([o for o in stage.objects if o.type=='MESH'])==8
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
