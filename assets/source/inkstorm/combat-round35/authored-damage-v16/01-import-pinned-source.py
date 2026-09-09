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


STAGE='PodRacing — Teemto damage V16 pinned intact source'
SOURCE='/Users/amir/Projects/PodRacing/assets/source/inkstorm/combat-round35/authored-damage-v16/intact-teemto-hero-open-v2.glb'
assert bpy.context.mode == 'OBJECT'
assert not bpy.app.is_job_running('RENDER')
assert STAGE not in bpy.data.scenes
snapshot=global_snapshot()
stage=None
success=False
report={'stage':'V16 pinned source import','source':SOURCE,'sourceByteSha256External':'af5d69514a51f7e9c089a1710e1587f46e053412b488268dc433f029576c0a7e'}
try:
    stage=bpy.data.scenes.new(STAGE)
    snapshot['window'].scene=stage
    snapshot['window'].view_layer=stage.view_layers[0]
    bpy.context.view_layer.active_layer_collection=bpy.context.view_layer.layer_collection
    result=bpy.ops.import_scene.gltf(filepath=SOURCE)
    assert result == {'FINISHED'}
    assert len(stage.objects)==14
    meshes=[o for o in stage.objects if o.type=='MESH']
    assert len(meshes)==10
    assert sum(len(o.data.polygons) for o in meshes)==57618
    lineage=[]
    for ob in list(stage.objects):
        original=ob.name
        ob.name='Teemto V16 intact | '+original
        lineage.append({'importedName':original,'object':ob.name,'type':ob.type,'triangles':len(ob.data.polygons) if ob.type=='MESH' else 0,'worldBounds':bounds(ob.matrix_world@v.co for v in ob.data.vertices) if ob.type=='MESH' else None})
    report.update({'scene':stage.name,'objectLineage':lineage,'sourceSignature':source_signature(stage),'sourceCornerNormalSignature':{o.name:fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in meshes}})
    success=True
finally:
    if not success:
        for ob in list(bpy.data.objects):
            if ob not in snapshot['objects']:bpy.data.objects.remove(ob,do_unlink=True)
        if stage: bpy.data.scenes.remove(stage)
        for mesh in list(bpy.data.meshes):
            if mesh not in snapshot['meshes'] and mesh.users==0:bpy.data.meshes.remove(mesh)
        for material in list(bpy.data.materials):
            if material not in snapshot['materials'] and material.users==0:bpy.data.materials.remove(material)
    report['preservation']=verify_global(snapshot)
    report['sceneCountAfter']=len(bpy.data.scenes)
    report['success']=success
    print('TEEMTO_DAMAGE_RECEIPT_BEGIN')
    print(json.dumps(report,sort_keys=True,allow_nan=False))
    print('TEEMTO_DAMAGE_RECEIPT_END')
