"""Read-only Ivory audit definitions/body. Prepared, not executed.
Only transient evaluated meshes are triangulated; original meshes are never changed.
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



def context_record(window):
    layer = window.view_layer
    return {'scene': window.scene.name, 'viewLayer': layer.name,
            'activeObject': layer.objects.active.name if layer.objects.active else None,
            'selectedObjects': sorted(ob.name for ob in layer.objects if ob.select_get(view_layer=layer)),
            'mode': bpy.context.mode}


def render_record(scene):
    render = scene.render
    record = {'engine': render.engine, 'resolution': [render.resolution_x, render.resolution_y, render.resolution_percentage],
              'pixelAspect': [render.pixel_aspect_x, render.pixel_aspect_y],
              'filmTransparent': render.film_transparent, 'filepath': render.filepath,
              'border': [render.use_border, render.use_crop_to_border, render.border_min_x, render.border_min_y, render.border_max_x, render.border_max_y],
              'image': [render.image_settings.file_format, render.image_settings.color_mode, render.image_settings.color_depth],
              'color': [scene.view_settings.view_transform, scene.view_settings.look, scene.view_settings.exposure, scene.view_settings.gamma],
              'fps': [render.fps, render.fps_base]}
    if hasattr(scene, 'cycles'):
        record['cycles'] = [scene.cycles.device, scene.cycles.samples, scene.cycles.use_denoising]
    return record


def scene_record(scene):
    return {'name': scene.name, 'objects': sorted(ob.name for ob in scene.objects),
            'masterObjects': sorted(ob.name for ob in scene.collection.objects),
            'masterChildren': sorted(c.name for c in scene.collection.children),
            'frame': [scene.frame_current, scene.frame_subframe, scene.frame_start, scene.frame_end],
            'camera': scene.camera.name if scene.camera else None,
            'world': scene.world.name if scene.world else None,
            'cursorMatrix': matrix_rows(scene.cursor.matrix), 'render': render_record(scene),
            'layers': [{'name': layer.name, 'active': layer.objects.active.name if layer.objects.active else None,
                        'selected': sorted(ob.name for ob in layer.objects if ob.select_get(view_layer=layer))}
                       for layer in scene.view_layers]}


def collection_record(collection):
    return {'name': collection.name, 'objects': sorted(ob.name for ob in collection.objects),
            'children': sorted(c.name for c in collection.children),
            'hideRender': collection.hide_render, 'hideViewport': collection.hide_viewport}


def fresh_snapshot():
    window = bpy.context.window
    assert window is not None, 'Existing interactive Blender window required.'
    layer = window.view_layer
    sets = {}
    for name in ('scenes', 'collections', 'objects', 'meshes', 'materials', 'images', 'worlds', 'cameras', 'lights', 'curves', 'actions', 'node_groups'):
        sets[name] = set(getattr(bpy.data, name))
    return {'window': window, 'scene': window.scene, 'layer': layer, 'active': layer.objects.active,
            'selected': set(ob for ob in layer.objects if ob.select_get(view_layer=layer)),
            'context': context_record(window), 'sets': sets,
            'scenes': {scene: scene_record(scene) for scene in bpy.data.scenes},
            'collections': {collection: collection_record(collection) for collection in bpy.data.collections}}


def restore_original_context(snapshot):
    window = snapshot['window']
    if window.scene != snapshot['scene']:
        window.scene = snapshot['scene']
    if window.view_layer != snapshot['layer']:
        window.view_layer = snapshot['layer']
    layer = snapshot['layer']
    selected = set(ob for ob in layer.objects if ob.select_get(view_layer=layer))
    if selected != snapshot['selected']:
        for ob in layer.objects:
            desired = ob in snapshot['selected']
            if ob.select_get(view_layer=layer) != desired:
                ob.select_set(desired, view_layer=layer)
    if layer.objects.active != snapshot['active']:
        layer.objects.active = snapshot['active']
    assert context_record(window) == snapshot['context'], 'Original scene/layer/active/selection/mode not restored.'


def verify_snapshot(snapshot):
    restore_original_context(snapshot)
    changed_scenes = [scene.name for scene, previous in snapshot['scenes'].items() if scene_record(scene) != previous]
    changed_collections = [collection.name for collection, previous in snapshot['collections'].items() if collection_record(collection) != previous]
    changed_ids = [name for name, previous in snapshot['sets'].items() if set(getattr(bpy.data, name)) != previous]
    result = {'contextRestored': context_record(snapshot['window']) == snapshot['context'],
              'changedScenes': changed_scenes, 'changedCollections': changed_collections,
              'changedDatablockSets': changed_ids,
              'allSceneSettingsAndMembershipsPreserved': not changed_scenes,
              'allCollectionMembershipsPreserved': not changed_collections,
              'noPersistentDatablocksCreatedOrRemoved': not changed_ids}
    return result


def normal_signatures(source):
    return {ob.name: {'cornerCount': len(ob.data.corner_normals),
                      'cornerNormalsFnv1a64': fnv1a64_signature([list(n.vector) for n in ob.data.corner_normals]),
                      'hasCustomNormals': ob.data.has_custom_normals}
            for ob in sorted(source.objects, key=name_key) if ob.type == 'MESH'}


def canonical_corner(values):
    return [float(round(float(value), 6)) if round(float(value), 6) != 0 else 0.0 for value in values]


def bridge_runs(mesh):
    # Own live polygon IDs only. No Colour or NPZ face index is read or used.
    runs = []
    for index, tri in enumerate(mesh.loop_triangles):
        polygon = mesh.polygons[tri.polygon_index]
        offsets = [loop - polygon.loop_start for loop in tri.loops]
        if runs and runs[-1]['cornerLoopOffsets'] == offsets and polygon.index == runs[-1]['firstSourcePolygon'] + runs[-1]['triangleCount']:
            runs[-1]['triangleCount'] += 1
        else:
            if len(runs) >= 1024:
                return None
            runs.append({'firstGlbLocalTriangle': index, 'triangleCount': 1,
                         'firstSourcePolygon': polygon.index, 'sourcePolygonStep': 1,
                         'cornerLoopOffsets': offsets})
    return runs


def own_topology_signature(mesh):
    return fnv1a64_signature({'positions': [list(v.co) for v in mesh.vertices],
                             'polygons': [[list(p.vertices), p.loop_start, p.loop_total, p.material_index] for p in mesh.polygons],
                             'loops': [loop.vertex_index for loop in mesh.loops]})


def audit_mesh(ob, expected, depsgraph):
    evaluated = ob.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
    try:
        assert mesh is not None, ('Temporary evaluated mesh unavailable', ob.name)
        mesh.calc_loop_triangles()
        assert len(mesh.loop_triangles) == expected['triangles'], ('Actual triangulation mismatch', ob.name)
        assert len(mesh.loop_triangles) <= 10000, ('Unexpected mesh size exceeds bounded audit', ob.name)
        topology_same = own_topology_signature(mesh) == own_topology_signature(ob.data)
        assert topology_same, ('Evaluated topology differs from original; no live polygon bridge', ob.name)
        normal_values = [list(n.vector) for n in mesh.corner_normals]
        assert len(normal_values) == len(mesh.loops), ('Missing corner normals', ob.name)
        world_points = [evaluated.matrix_world @ v.co for v in mesh.vertices]
        box = bounds(world_points)
        error = max(abs(box[i][k] - expected['bounds'][i][k]) for i in range(2) for k in range(3))
        assert error <= .002, ('Named Ivory source bounds differ from pinned GLB', ob.name, error)
        material_names = sorted(set(s.material.name for s in ob.material_slots if s.material))
        assert material_names == expected['materials'], ('Named Ivory material slots differ', ob.name)
        assert evaluated.matrix_world.to_3x3().determinant() > 0, ('Unexpected mirrored Ivory object', ob.name)
        position_corners = []
        normal_corners = []
        uv_corners = []
        uv_layer = mesh.uv_layers.active
        triangle_loop_rows = []
        edge_uses = collections.Counter()
        for polygon in mesh.polygons:
            for edge in polygon.edge_keys:
                edge_uses[tuple(sorted(edge))] += 1
        for tri in mesh.loop_triangles:
            triangle_loop_rows.append([tri.polygon_index, list(tri.loops), list(tri.vertices)])
            for loop in tri.loops:
                position_corners.append(canonical_corner(mesh.vertices[mesh.loops[loop].vertex_index].co))
                normal_corners.append(canonical_corner(normal_values[loop]))
                if uv_layer:
                    uv_corners.append(canonical_corner(uv_layer.data[loop].uv))
        actual_bridge = {'orderedPositionCornersFnv1a64': fnv1a64_signature(position_corners),
                         'orderedNormalCornersFnv1a64': fnv1a64_signature(normal_corners),
                         'orderedUvCornersFnv1a64': fnv1a64_signature(uv_corners) if uv_layer else None}
        matches = {key: value == expected['bridge'][key] for key, value in actual_bridge.items()}
        runs = bridge_runs(mesh) if all(matches.values()) else None
        bridge = {'status': 'MATCH_AT_DECLARED_PRECISION' if all(matches.values()) and runs is not None else 'UNRESOLVED',
                  'sourceGlbFirstGlobalTriangle': expected['firstGlobalTriangle'],
                  'triangleCount': len(mesh.loop_triangles), 'matches': matches,
                  'expected': expected['bridge'], 'actual': actual_bridge,
                  'evaluatedTopologyExactlyMatchesLiveSourceFnv': topology_same,
                  'liveTrianglePolygonLoopVertexFnv1a64': fnv1a64_signature(triangle_loop_rows),
                  'sourcePolygonBridgeRuns': runs,
                  'runLimit': 1024, 'semanticMasksAssigned': False,
                  'scope': 'Direct ordered GLB corner stream versus own live-evaluated triangles, rounded to 6 decimals in source local units; non-cryptographic. No nearest-surface search. A mismatch is unresolved, never assumed identity. Mask assignment requires review of actual audit and duplicate/corner ambiguity.'}
        return {'name': ob.name, 'parent': ob.parent.name if ob.parent else None, 'meshData': ob.data.name,
                'matrixLocal': matrix_rows(ob.matrix_local), 'matrixWorld': matrix_rows(ob.matrix_world),
                'usersCollections': sorted(c.name for c in ob.users_collection),
                'vertices': len(mesh.vertices), 'edges': len(mesh.edges), 'polygons': len(mesh.polygons),
                'loops': len(mesh.loops), 'actualTriangles': len(mesh.loop_triangles),
                'bounds': box, 'glbBoundsMaximumError': error,
                'boundaryEdges': sum(value == 1 for value in edge_uses.values()),
                'nonManifoldEdgesOverTwoFaces': sum(value > 2 for value in edge_uses.values()),
                'uvLayers': [layer.name for layer in mesh.uv_layers],
                'materialSlots': [{'slot': i, 'link': slot.link, 'name': slot.material.name if slot.material else None} for i, slot in enumerate(ob.material_slots)],
                'polygonMaterialCounts': dict(collections.Counter(p.material_index for p in mesh.polygons)),
                'ownMeshFnv1a64': mesh_signature(ob.data),
                'ownTriangulationFnv1a64': fnv1a64_signature(triangle_loop_rows),
                'ownEvaluatedCornerNormalsFnv1a64': fnv1a64_signature(normal_values),
                'bridge': bridge, 'semanticRole': 'unassigned'}
    finally:
        evaluated.to_mesh_clear()


snapshot = fresh_snapshot()
source = None
before = None
normals_before = None
failed = False
report = {'stage': 'ivory-read-only-reference-audit-v1', 'status': 'executing',
          'sourceUid': REFERENCE['uid'], 'sourceScene': REFERENCE['sourceScene'],
          'sourceReference': REFERENCE['provenance'], 'runtimeReady': False,
          'scope': 'Fifth-family preparation only. Read-only existing-source audit; no import, copy, authoring, cleanup, masks, render, save or admission.',
          'originalContext': snapshot['context'],
          'freshAllSceneSnapshot': [previous for scene, previous in snapshot['scenes'].items()],
          'freshAllCollectionSnapshot': [previous for collection, previous in snapshot['collections'].items()],
          'actualPreexistingDatablockCounts': {name: len(values) for name, values in snapshot['sets'].items()},
          'signatureAlgorithm': 'FNV-1a-64 over canonical ASCII JSON; non-cryptographic'}
try:
    assert bpy.context.mode == 'OBJECT', 'Preserve current edit/pose mode; audit requires Object mode.'
    assert not bpy.app.is_job_running('RENDER'), 'Existing render is active; do not interfere.'
    source = bpy.data.scenes.get(REFERENCE['sourceScene'])
    assert source is not None, 'Exact Ivory source scene missing; stop, do not import.'
    assert source.frame_current == 1 and source.frame_subframe == 0, 'Expected saved Ivory source frame differs.'
    hierarchy = sorted((ob.name, ob.parent.name if ob.parent else None, ob.type) for ob in source.objects)
    assert len(hierarchy) == REFERENCE['objectCount'], 'Ivory source object count differs.'
    assert hierarchy == [tuple(row) for row in REFERENCE['hierarchy']], 'Ivory source names, parents or types differ from its own GLB.'
    assert fnv1a64_signature(hierarchy) == REFERENCE['hierarchyFnv1a64'], 'Ivory hierarchy FNV differs.'
    for ob in source.objects:
        assert ob.type in {'MESH', 'EMPTY'}, ('Unexpected Ivory object type', ob.name)
        assert not ob.modifiers and not ob.constraints, ('Evaluation dependency needs separate review', ob.name)
        assert ob.animation_data is None and ob.instance_type == 'NONE', ('Animation or instancing needs separate review', ob.name)
        if ob.type == 'MESH':
            assert ob.data.shape_keys is None and ob.data.animation_data is None, ob.name
            assert not ob.hide_render, ('Unexpected hidden source mesh', ob.name)
    assert sum(ob.type == 'MESH' for ob in source.objects) == REFERENCE['meshCount'], 'Ivory mesh count differs.'
    assert len(set(ob.data for ob in source.objects if ob.type == 'MESH')) == 51, 'Ivory unique mesh data count differs.'
    before = source_signature(source)
    normals_before = normal_signatures(source)
    snapshot['window'].scene = source
    snapshot['window'].view_layer = source.view_layers[0]
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    rows = []
    for expected in REFERENCE['meshOccurrences']:
        rows.append(audit_mesh(source.objects[expected['name']], expected, depsgraph))
    by_name = {row['name']: row for row in rows}
    occurrences = []
    for instance in depsgraph.object_instances:
        if instance.object.type != 'MESH':
            continue
        name = instance.object.original.name
        assert name in by_name and not instance.is_instance, ('Unexpected evaluated Ivory occurrence', name)
        occurrences.append({'sourceObject': name, 'triangles': by_name[name]['actualTriangles'],
                            'matrixWorld': matrix_rows(instance.matrix_world)})
    assert len(occurrences) == 51 and len(set(row['sourceObject'] for row in occurrences)) == 51, 'Ivory occurrence inventory differs.'
    assert sum(row['triangles'] for row in occurrences) == REFERENCE['triangleCount'], 'Ivory actual occurrence triangle total differs.'
    materials = {slot.material.name: material_record(slot.material) for ob in source.objects if ob.type == 'MESH' for slot in ob.material_slots if slot.material}
    assert len(materials) == 51, 'Ivory source material count differs.'
    matched = [row['name'] for row in rows if row['bridge']['status'] == 'MATCH_AT_DECLARED_PRECISION']
    report.update({'status': 'AUDITED_SOURCE_ONLY', 'sourceHierarchy': hierarchy,
                   'sourceSignature': before, 'sourceCornerNormalSignature': normals_before,
                   'namedMeshReferences': rows, 'sourceMaterialRecords': materials,
                   'sourceMaterialFnv1a64': {name: fnv1a64_signature(value) for name, value in materials.items()},
                   'evaluatedOccurrences': occurrences,
                   'metrics': {'objects': 55, 'meshObjects': 51, 'uniqueMeshes': 51, 'materials': 51,
                               'actualTriangles': sum(row['triangles'] for row in occurrences),
                               'bounds': bounds(point for row in rows for point in row['bounds'])},
                   'triangleBridge': {'matchedMeshCountAtDeclaredPrecision': len(matched), 'matchedMeshNames': matched,
                                      'unresolvedMeshNames': [row['name'] for row in rows if row['name'] not in matched],
                                      'pilotContainerStatus': by_name[REFERENCE['pilotContainer']]['bridge']['status'],
                                      'semanticMasksAssigned': False},
                   'pilotContainer': {'name': REFERENCE['pilotContainer'], 'actualTriangles': by_name[REFERENCE['pilotContainer']]['actualTriangles'],
                                      'wholeContainerMustNotBeAssignedPilot': True, 'rolesAssigned': False},
                   'remainingGates': ['Review actual source audit and unresolved bridge rows before any copied mask assignment.',
                                      'Source copy, independent cleanup, pilot partition, fit, paint, normalization and LOD remain unexecuted.',
                                      'Runtime fleet/admission counts unchanged.']})
except Exception as error:
    failed = True
    report['status'] = 'AUDIT_FAILED_NO_AUTHORING'
    report['error'] = str(error)
finally:
    try:
        if before is not None:
            report['sourcePreserved'] = source_signature(source) == before
            report['sourceCornerNormalsPreserved'] = normal_signatures(source) == normals_before
            if not report['sourcePreserved'] or not report['sourceCornerNormalsPreserved']:
                failed = True
        else:
            report['sourcePreserved'] = None
            report['sourceCornerNormalsPreserved'] = None
    except Exception as preservation_error:
        failed = True
        report['sourcePreservationError'] = str(preservation_error)
    finally:
        try:
            report['globalPreservation'] = verify_snapshot(snapshot)
            checks = report['globalPreservation']
            if not checks['contextRestored'] or checks['changedScenes'] or checks['changedCollections'] or checks['changedDatablockSets']:
                failed = True
        except Exception as context_error:
            failed = True
            report['contextRestorationError'] = str(context_error)
        report['auditPassed'] = not failed
        print('IVORY_AUDIT_RECEIPT_BEGIN')
        print(json.dumps(report, sort_keys=True, allow_nan=False))
        print('IVORY_AUDIT_RECEIPT_END')
assert not failed, 'Ivory read-only audit or preservation guard failed; no authoring permitted.'
