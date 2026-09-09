"""DEFINITIONS ONLY. Concatenate 00-source-reference.py before this fragment.

Prepared for Blender MCP, not executed. No import, transform, save, render or
filesystem operation occurs here. Each stage explicitly calls the guards.
"""
import bpy
import collections
import hashlib
import json
import math
from mathutils import Vector


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'),
                                    allow_nan=False).encode()).hexdigest()


def matrix_rows(matrix):
    return [list(row) for row in matrix]


def bounds(points):
    points = list(points)
    if not points:
        return None
    return [[min(p[k] for p in points) for k in range(3)],
            [max(p[k] for p in points) for k in range(3)]]


def mesh_signature(mesh):
    # Exact numeric signatures are used only for same-session preservation,
    # never presented as byte equality between a Blender mesh and a GLB.
    return digest({
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
        for node in sorted(material.node_tree.nodes, key=lambda n: n.name):
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
    for ob in sorted(source.objects, key=lambda o: o.name):
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
    return {'objects': digest(rows), 'meshes': meshes,
            'materials': {name: digest(row) for name, row in materials.items()}}


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


def source_guard():
    assert bpy.context.mode == 'OBJECT', 'Do not leave or modify another task\'s edit/pose mode.'
    assert not bpy.app.is_job_running('RENDER'), 'Another render is running.'
    source = bpy.data.scenes.get(REFERENCE['sourceScene'])
    assert source is not None, 'Exact saved source scene missing; stop, do not import a replacement.'
    assert len(bpy.data.scenes) >= 139, 'Unexpected shared Blender session; review scene inventory.'
    assert source.frame_current == 1 and source.frame_subframe == 0, 'Source frame changed.'
    hierarchy = sorted((ob.name, ob.parent.name if ob.parent else None, ob.type)
                       for ob in source.objects)
    assert len(hierarchy) == REFERENCE['objectCount'], 'Source object count differs.'
    assert digest(hierarchy) == REFERENCE['hierarchySha256'], 'Exact source names/parents/types differ.'
    for ob in source.objects:
        assert ob.type in {'MESH', 'EMPTY'}, ('Unexpected source type', ob.name, ob.type)
        assert not ob.modifiers and not ob.constraints, ('Unexpected evaluation dependency', ob.name)
        assert ob.animation_data is None, ('Unexpected object animation', ob.name)
        assert ob.instance_type == 'NONE', ('Unexpected collection/vertex instancing', ob.name)
        if ob.type == 'MESH':
            assert ob.data.shape_keys is None and ob.data.animation_data is None, ob.name
            assert not ob.hide_render, ('Unexpected hidden mesh', ob.name)
    return source


def measure_reference_match(source):
    rows = []
    for expected in REFERENCE['meshOccurrences']:
        ob = source.objects[expected['name']]
        assert ob.type == 'MESH'
        world_bounds = bounds(ob.matrix_world @ vertex.co for vertex in ob.data.vertices)
        error = max(abs(world_bounds[i][k] - expected['bounds'][i][k])
                    for i in range(2) for k in range(3))
        assert error <= .002, ('Source bounds differ from pinned GLB', ob.name, error)
        # No calc_loop_triangles() on original data: polygon n-2 is the exact
        # count for this guarded, ordinary polygon source; stage audit below
        # separately evaluates and counts actual loop triangles.
        triangles = sum(max(0, len(p.vertices) - 2) for p in ob.data.polygons)
        assert triangles == expected['triangles'], ('Triangle count differs', ob.name, triangles)
        material_names = sorted({slot.material.name for slot in ob.material_slots if slot.material})
        assert material_names == expected['materials'], ('Source material slots differ', ob.name, material_names)
        rows.append({'name': ob.name, 'bounds': world_bounds,
                     'triangles': triangles, 'referenceBoundsMaxError': error})
    assert len(rows) == sum(ob.type == 'MESH' for ob in source.objects)
    return rows


def activate_source(snapshot, source):
    snapshot['window'].scene = source
    snapshot['window'].view_layer = source.view_layers[0]
    # Refresh evaluation, without moving source frame or changing data.
    bpy.context.view_layer.update()


def print_receipt(report):
    print('BLOCKRUNNER_RECEIPT_BEGIN')
    print(json.dumps(report, sort_keys=True, allow_nan=False))
    print('BLOCKRUNNER_RECEIPT_END')
