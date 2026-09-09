"""PREPARED ONLY. Prefix safe 00 + 01 and the measured fit reference.

Inject actual BLOCKRUNNER_AUDIT and BLOCKRUNNER_CLEANUP receipts.
Creates one isolated fit trial from cleanup V1, retaining the complete pilot.
Only two controls change length/placement; two source-profile mounts are added.
No Blender save, source/cleanup mutation, material change or runtime export.
"""
from mathutils import Matrix

assert BLOCKRUNNER_AUDIT['status'] == 'measured' and BLOCKRUNNER_AUDIT['sourcePreservation']
assert BLOCKRUNNER_CLEANUP['sourceUid'] == REFERENCE['uid'] and BLOCKRUNNER_CLEANUP['sourcePreservation']
assert BLOCKRUNNER_CLEANUP['sourceCornerNormalsPreserved'] and BLOCKRUNNER_CLEANUP['newSceneRetained']
assert BLOCKRUNNER_CLEANUP['cleanupSignature']['objectsFnv1a64'] == '6c256a2de2a989c9'
assert BLOCKRUNNER_CONTROL_FIT['sourceSha256'] == REFERENCE['provenance']['sourceSha256']
assert BLOCKRUNNER_CONTROL_FIT['cleanupObjectsFnv1a64'] == '6c256a2de2a989c9'
assert BLOCKRUNNER_CONTROL_FIT['status'] == 'measured candidate; neutral fit review pending'
CONTROL_NAMES = {'pasted__brick230_phongE2_0', 'pasted__pasted__brick230_phongE2_0'}
assert {r['sourceControl'] for r in BLOCKRUNNER_CONTROL_FIT['controls']} == CONTROL_NAMES
TARGET_SCENE = 'PodRacing — Blockrunner shortened controls side mounts round34 V1'
assert TARGET_SCENE not in bpy.data.scenes, 'Never overwrite an earlier fit trial.'


def fit_normal_signature(scene):
    return {ob.name: fnv1a64_signature([list(n.vector) for n in ob.data.corner_normals])
            for ob in scene.objects if ob.type == 'MESH'}


def source_profile_copy(original, new_name, start_values, end_values, radial_scale, measured):
    # Reuse all source profile faces/caps and their source polygon order.
    # The four source axial rings describe lower bevel, shaft and upper bevel.
    start, end = Vector(start_values), Vector(end_values)
    axis = end - start
    new_length = axis.length
    assert new_length > .08 and 0 < radial_scale <= 1.001
    axis.normalize()
    rotation = Vector((0, 0, 1)).rotation_difference(axis)
    old_base = Vector(measured['originalBaseCenter'])
    old_length = measured['originalLength']
    lower_bevel = measured['originalLowerBevelLength']
    upper_bevel = measured['originalUpperBevelLength']
    assert new_length > (lower_bevel + upper_bevel) * radial_scale
    old_world = [original.matrix_world @ v.co for v in original.data.vertices]
    old_bounds = bounds(old_world)
    assert abs(old_bounds[0][2] - old_base.z) < .00001
    assert abs(old_bounds[1][2] - old_base.z - old_length) < .00001
    normal_matrix = original.matrix_world.to_3x3().inverted().transposed()
    normals = [(rotation @ (normal_matrix @ n.vector).normalized()).normalized()
               for n in original.data.corner_normals]
    mesh = original.data.copy()
    owned_meshes.append(mesh)
    mesh.name = new_name
    for copied_vertex, point in zip(mesh.vertices, old_world):
        relative = point - old_base
        distance = relative.z
        if distance <= lower_bevel + .00001:
            new_distance = distance * radial_scale
        elif distance >= old_length - upper_bevel - .00001:
            new_distance = new_length - (old_length - distance) * radial_scale
        else:
            fraction = (distance - lower_bevel) / (old_length - lower_bevel - upper_bevel)
            new_distance = lower_bevel * radial_scale + fraction * (new_length - (lower_bevel + upper_bevel) * radial_scale)
        copied_vertex.co = start + rotation @ Vector((relative.x * radial_scale,
                                                       relative.y * radial_scale, new_distance))
    mesh.update()
    mesh.normals_split_custom_set(normals)
    mesh.update()
    maximum_axis_distance = 0
    for vertex in mesh.vertices:
        offset = vertex.co - start
        parameter = max(0, min(new_length, offset.dot(axis)))
        distance_to_segment = (vertex.co - (start + axis * parameter)).length
        maximum_axis_distance = max(maximum_axis_distance, distance_to_segment)
    capsule_radius = measured['originalShaftRadius'] * radial_scale
    assert maximum_axis_distance <= capsule_radius + .000005, 'Actual complete profile left the tested capsule envelope.'
    error = max((normal.vector - wanted).length for normal, wanted in zip(mesh.corner_normals, normals))
    assert error < .001, 'Profile normals changed beyond encoding tolerance.'
    assert len(mesh.vertices) == len(original.data.vertices)
    assert [tuple(p.vertices) for p in mesh.polygons] == [tuple(p.vertices) for p in original.data.polygons]
    return mesh, {'originalProfileObject': original.name, 'originalProfileMesh': original.data.name,
                  'sourcePolygonIndexForCopiedPolygon': list(range(len(mesh.polygons))),
                  'verticesBefore': len(original.data.vertices), 'verticesAfter': len(mesh.vertices),
                  'triangleCount': len(mesh.polygons), 'start': list(start), 'end': list(end),
                  'axis': list(axis), 'length': new_length, 'radialScale': radial_scale,
                  'lowerBevelLength': lower_bevel * radial_scale,
                  'upperBevelLength': upper_bevel * radial_scale,
                  'normalMaximumEncodingDifference': error,
                  'completeMeshMaximumDistanceFromAxisSegment': maximum_axis_distance,
                  'testedCapsuleRadius': capsule_radius,
                  'fullTriangleEnvelopeProof': 'Every actual copied vertex including both endcaps is inside the tested convex capsule within 5 micrometres; each triangle is its vertices convex hull.',
                  'edit': 'Source axial profile remapped in world space; end bevel lengths preserved at radial scale; topology and per-corner source normal directions rotated without recalculation.'}


def attach_copied_materials(mesh, original):
    mesh.materials.clear()
    for slot in original.material_slots:
        assert slot.material is not None
        material = material_copies.get(slot.material)
        if material is None:
            material = slot.material.copy()
            material_copies[slot.material] = material
            owned_materials.append(material)
            old_record, new_record = material_record(slot.material), material_record(material)
            new_record['name'] = old_record['name']
            assert new_record == old_record, 'Copied material inputs changed.'
        mesh.materials.append(material)


snapshot = global_snapshot()
source = None
source_before = None
source_normals_before = None
cleanup = None
cleanup_before = None
cleanup_normals_before = None
target = None
owned_objects = []
owned_meshes = []
owned_materials = []
material_copies = {}
success = False
report = {'stage': 'isolated-control-fit-copy', 'status': 'executing',
          'sourceUid': REFERENCE['uid'], 'targetScene': TARGET_SCENE,
          'inputCleanupScene': BLOCKRUNNER_CLEANUP['targetScene'],
          'inputCleanupSignature': BLOCKRUNNER_CLEANUP['cleanupSignature'],
          'fitReference': BLOCKRUNNER_CONTROL_FIT,
          'pilotPolicy': 'All pilot vertices, surfaces, split normals, materials and world transform retained from accepted cleanup.',
          'scope': 'Two shortened source-profile grips and two small source-profile side mounts. No pose/style/runtime acceptance.',
          'objectLineage': [], 'controlEdits': [], 'runtimeReady': False}
try:
    source = source_guard()
    activate_source(snapshot, source)
    source_before = source_signature(source)
    source_normals_before = fit_normal_signature(source)
    assert source_before == BLOCKRUNNER_AUDIT['sourceSignature']
    measure_reference_match(source)
    cleanup = bpy.data.scenes.get(BLOCKRUNNER_CLEANUP['targetScene'])
    assert cleanup is not None
    activate_source(snapshot, cleanup)
    cleanup_before = source_signature(cleanup)
    cleanup_normals_before = fit_normal_signature(cleanup)
    assert cleanup_before == BLOCKRUNNER_CLEANUP['cleanupSignature']
    assert cleanup_normals_before == BLOCKRUNNER_CLEANUP['cleanupCornerNormalSignature']
    original_by_name = {r['sourceObject']: cleanup.objects[r['copiedObject']]
                        for r in BLOCKRUNNER_CLEANUP['objectLineage']}
    assert len(original_by_name) == 59
    plans = {r['sourceControl']: r for r in BLOCKRUNNER_CONTROL_FIT['controls']}
    target = bpy.data.scenes.new(TARGET_SCENE)
    for source_name in sorted(original_by_name):
        original = original_by_name[source_name]
        if source_name in CONTROL_NAMES:
            plan = plans[source_name]
            mesh, edit = source_profile_copy(original, 'Fitted grip ' + source_name,
                                             plan['gripBase'], plan['gripTip'], 1, plan)
            matrix = Matrix.Identity(4)
            edit['sourceControl'] = source_name
            edit['role'] = 'shortened grip'
            report['controlEdits'].append(edit)
        else:
            mesh = original.data.copy()
            owned_meshes.append(mesh)
            matrix = original.matrix_world.copy()
            assert [list(n.vector) for n in mesh.corner_normals] == [list(n.vector) for n in original.data.corner_normals]
        attach_copied_materials(mesh, original)
        ob = bpy.data.objects.new('Blockrunner fit V1 ' + source_name, mesh)
        owned_objects.append(ob)
        target.collection.objects.link(ob)
        ob.matrix_world = matrix
        ob.hide_render = original.hide_render
        report['objectLineage'].append({'sourceObject': source_name, 'copiedObject': ob.name,
                                        'cleanupObject': original.name, 'mesh': mesh.name,
                                        'sourceMatrixWorld': matrix_rows(original.matrix_world),
                                        'matrixWorld': matrix_rows(ob.matrix_world),
                                        'geometryUnchangedCopy': source_name not in CONTROL_NAMES})
    for plan in BLOCKRUNNER_CONTROL_FIT['controls']:
        original = original_by_name[plan['sourceControl']]
        # The support profile is derived from that side's original control rod.
        mesh, edit = source_profile_copy(original, 'Control side mount ' + plan['side'],
                                         plan['mountStart'], plan['mountEnd'],
                                         plan['mountRadius'] / plan['originalShaftRadius'], plan)
        attach_copied_materials(mesh, original)
        ob = bpy.data.objects.new('Blockrunner fit V1 side mount ' + plan['side'], mesh)
        owned_objects.append(ob)
        target.collection.objects.link(ob)
        ob.matrix_world = Matrix.Identity(4)
        edit['sourceControl'] = plan['sourceControl']
        edit['role'] = 'added source-profile side mount'
        edit['wallSourceObject'] = plan['wallSourceObject']
        edit['wallTriangleIndex'] = plan['wallTriangleIndex']
        edit['wallContact'] = plan['wallContact']
        report['controlEdits'].append(edit)
        report['objectLineage'].append({'sourceObject': 'added-control-mount-' + plan['side'],
                                        'copiedObject': ob.name, 'mesh': mesh.name,
                                        'profileSourceObject': plan['sourceControl'],
                                        'matrixWorld': matrix_rows(ob.matrix_world),
                                        'geometryUnchangedCopy': False})
    assert len(owned_objects) == 61
    assert sum(len(ob.data.polygons) for ob in owned_objects) == 44028
    snapshot['window'].scene = target
    snapshot['window'].view_layer = target.view_layers[0]
    target.frame_set(1)
    bpy.context.view_layer.update()
    target_bounds = bounds(ob.matrix_world @ vertex.co for ob in owned_objects for vertex in ob.data.vertices)
    old_bounds = BLOCKRUNNER_CONTROL_FIT['originalCraftBounds']
    assert max(abs(target_bounds[i][k] - old_bounds[i][k]) for i in range(2) for k in range(3)) < .00001
    report['fitBounds'] = target_bounds
    report['fitSignature'] = source_signature(target)
    report['fitCornerNormalSignature'] = fit_normal_signature(target)
    report['trianglesBefore'] = 43556
    report['trianglesAfter'] = 44028
    report['meshObjects'] = 61
    report['copiedMaterialInputsMatchCleanup'] = True
    report['pilotAndOther56ObjectsUnchangedCopies'] = True
    report['status'] = 'isolated control fit created; neutral comparison pending'
    success = True
finally:
    restore_context(snapshot)
    if not success:
        for ob in reversed(owned_objects):
            bpy.data.objects.remove(ob, do_unlink=True)
        if target is not None:
            bpy.data.scenes.remove(target)
        for mesh in owned_meshes:
            assert mesh.users == 0
            bpy.data.meshes.remove(mesh)
        for material in owned_materials:
            assert material.users == 0
            bpy.data.materials.remove(material)
    if source_before is not None:
        report['sourcePreservation'] = source_signature(source) == source_before
        report['sourceCornerNormalsPreserved'] = fit_normal_signature(source) == source_normals_before
    if cleanup_before is not None:
        report['cleanupPreservation'] = source_signature(cleanup) == cleanup_before
        report['cleanupCornerNormalsPreserved'] = fit_normal_signature(cleanup) == cleanup_normals_before
    report['globalPreservation'] = verify_global(snapshot)
    report['newSceneRetained'] = success
    report['sharedBlendSaved'] = False
    print_receipt(report)
    if source_before is not None:
        assert report['sourcePreservation'] and report['sourceCornerNormalsPreserved']
    if cleanup_before is not None:
        assert report['cleanupPreservation'] and report['cleanupCornerNormalsPreserved']
