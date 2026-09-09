"""PREPARED ONLY. Prefix safe 00 + 01; inject successful BLOCKRUNNER_AUDIT.

Creates one isolated source derivative. Removes only exact duplicate opposed
triangles in five measured meshes. No coordinate weld, normal recalculation,
hole fill, pose, paint, root normalization, export or shared blend save.
"""
assert BLOCKRUNNER_AUDIT['status'] == 'measured' and BLOCKRUNNER_AUDIT['sourcePreservation']
assert BLOCKRUNNER_AUDIT['sourceUid'] == REFERENCE['uid']
assert BLOCKRUNNER_AUDIT['sourceReference']['sourceSha256'] == REFERENCE['provenance']['sourceSha256']
assert not BLOCKRUNNER_AUDIT['globalPreservation']['changedScenes']
assert not BLOCKRUNNER_AUDIT['globalPreservation']['changedCollections']
TARGET_SCENE = 'PodRacing — Blockrunner exact opposing face cleanup round34 V1'
COPY_PREFIX = 'Blockrunner cleanup V1 '
assert TARGET_SCENE not in bpy.data.scenes, 'Never overwrite an earlier cleanup study.'
EXPECTED_DUPLICATES = {
    'pasted__LegoTri36_lambert1_0': (8256, 4128),
    'pasted__LegoTri8_lambert1_0': (548, 274),
    'pasted__pasted__LegoTri8_lambert1_0': (548, 274),
    'pasted__LegoTri9_lambert1_0': (152, 76),
    'pasted__pasted__LegoTri9_lambert1_0': (152, 76),
}


def cyclic_face_key(points):
    return min(points, points[1:] + points[:1], points[2:] + points[:2])


def corner_normal_signature(scene):
    result = {}
    for ob in scene.objects:
        if ob.type == 'MESH':
            result[ob.name] = fnv1a64_signature([list(n.vector) for n in ob.data.corner_normals])
    return result


snapshot = global_snapshot()
source = None
before = None
normal_before = None
target = None
owned_objects = []
owned_meshes = []
owned_materials = []
success = False
report = {'stage': 'exact-opposed-cleanup-copy', 'status': 'executing',
          'sourceUid': REFERENCE['uid'], 'targetScene': TARGET_SCENE,
          'sourceReference': REFERENCE['provenance'],
          'signatureAlgorithm': 'FNV-1a-64 over canonical ASCII JSON; non-cryptographic',
          'scope': 'Isolated duplicate-removal trial only; no fit/style/runtime acceptance.',
          'normalPolicy': 'Keep the lower source polygon index in each exact opposed pair and preserve its authored split normals. Absolute outward orientation and broader normal repair are deferred to neutral comparison.',
          'surfacePolicy': 'Exact unique triangle-coordinate sets and all source vertex coordinates retained; no welding, hole filling or coordinate changes.',
          'objectLineage': [], 'meshLineage': [], 'runtimeReady': False}
try:
    source = source_guard()
    activate_source(snapshot, source)
    before = source_signature(source)
    normal_before = corner_normal_signature(source)
    assert before == BLOCKRUNNER_AUDIT['sourceSignature'], 'Source changed since audited receipt.'
    measure_reference_match(source)
    target = bpy.data.scenes.new(TARGET_SCENE)
    material_copies = {}
    for original in sorted(source.objects, key=name_key):
        if original.type != 'MESH':
            continue
        source_mesh = original.data
        assert all(len(p.vertices) == 3 for p in source_mesh.polygons), original.name
        if original.name in EXPECTED_DUPLICATES:
            expected_source, expected_removed = EXPECTED_DUPLICATES[original.name]
            assert len(source_mesh.polygons) == expected_source
            assert len(source_mesh.uv_layers) == 0 and len(source_mesh.color_attributes) == 0, 'Unexpected authored attributes; stop rather than discard them.'
            assert len(original.material_slots) == 1 and original.material_slots[0].material.name == 'lambert1.001'
            coordinates = [tuple(v.co) for v in source_mesh.vertices]
            normal_values = [tuple(n.vector) for n in source_mesh.corner_normals]
            groups = {}
            for polygon in source_mesh.polygons:
                points = tuple(coordinates[i] for i in polygon.vertices)
                assert len(set(points)) == 3, 'Unexpected degenerate source face.'
                key = tuple(sorted(points))
                if key not in groups:
                    groups[key] = []
                groups[key].append(polygon.index)
            pairs = []
            kept = []
            for key, indices in groups.items():
                assert len(indices) == 2, ('Expected every target surface to have one opposed duplicate', original.name, indices)
                a, b = sorted(indices)
                pa = tuple(coordinates[i] for i in source_mesh.polygons[a].vertices)
                pb = tuple(coordinates[i] for i in source_mesh.polygons[b].vertices)
                assert cyclic_face_key(pa) == cyclic_face_key(tuple(reversed(pb))), 'Duplicate is not an exact reversed triangle.'
                pairs.append([a, b])
                kept.append(a)
            kept.sort()
            assert len(pairs) == expected_removed and len(kept) == expected_source - expected_removed
            mesh = bpy.data.meshes.new(COPY_PREFIX + source_mesh.name)
            owned_meshes.append(mesh)
            faces = [tuple(source_mesh.polygons[index].vertices) for index in kept]
            mesh.from_pydata(coordinates, [], faces)
            for copied_polygon, source_index in zip(mesh.polygons, kept):
                old = source_mesh.polygons[source_index]
                assert tuple(copied_polygon.vertices) == tuple(old.vertices)
                copied_polygon.use_smooth = old.use_smooth
                copied_polygon.material_index = old.material_index
            retained_normals = [normal_values[loop_index] for source_index in kept
                                for loop_index in source_mesh.polygons[source_index].loop_indices]
            mesh.normals_split_custom_set(retained_normals)
            mesh.update()
            assert [tuple(v.co) for v in mesh.vertices] == coordinates, 'Copied coordinates differ.'
            copied_keys = {tuple(sorted(tuple(mesh.vertices[i].co) for i in p.vertices))
                           for p in mesh.polygons}
            assert copied_keys == set(groups), 'Unique source surfaces changed.'
            copied_normals = [tuple(n.vector) for n in mesh.corner_normals]
            normal_error = max((Vector(a) - Vector(b)).length for a,b in zip(copied_normals, retained_normals))
            assert len(copied_normals) == len(retained_normals) and normal_error < .001, 'Authored normals changed beyond Blender encoding tolerance.'
            report['meshLineage'].append({'sourceObject': original.name,
                                          'sourceMesh': source_mesh.name, 'copiedMesh': mesh.name,
                                          'sourceTriangles': expected_source, 'copiedTriangles': len(kept),
                                          'sourcePolygonsKeptInCopiedOrder': kept,
                                          'opposedSourcePolygonPairsKeptRemoved': pairs,
                                          'uniqueTriangleCoordinatesPreservedExactly': True,
                                          'fullSourceVertexListPreservedExactly': True,
                                          'originalSmoothFlagsRetained': True,
                                          'retainedCornerNormalMaximumDifference': normal_error})
        else:
            mesh = source_mesh.copy()
            owned_meshes.append(mesh)
            report['meshLineage'].append({'sourceObject': original.name, 'sourceMesh': source_mesh.name,
                                          'copiedMesh': mesh.name,
                                          'sourceTriangles': len(source_mesh.polygons),
                                          'copiedTriangles': len(mesh.polygons),
                                          'geometryUnchangedCopy': True})
        mesh.materials.clear()
        for slot in original.material_slots:
            assert slot.material is not None
            copied_material = material_copies.get(slot.material)
            if copied_material is None:
                copied_material = slot.material.copy()
                material_copies[slot.material] = copied_material
                owned_materials.append(copied_material)
                old_material_record = material_record(slot.material)
                copy_material_record = material_record(copied_material)
                copy_material_record['name'] = old_material_record['name']
                assert copy_material_record == old_material_record, 'Copied material inputs differ.'
            mesh.materials.append(copied_material)
        copied_object = bpy.data.objects.new(COPY_PREFIX + original.name, mesh)
        owned_objects.append(copied_object)
        target.collection.objects.link(copied_object)
        copied_object.matrix_world = original.matrix_world.copy()
        copied_object.hide_render = original.hide_render
        report['objectLineage'].append({'sourceObject': original.name,
                                        'copiedObject': copied_object.name,
                                        'sourceParent': original.parent.name if original.parent else None,
                                        'matrixWorld': matrix_rows(original.matrix_world)})
    assert len(owned_objects) == 59
    assert sum(len(o.data.polygons) for o in owned_objects) == 43556
    snapshot['window'].scene = target
    snapshot['window'].view_layer = target.view_layers[0]
    target.frame_set(1)
    bpy.context.view_layer.update()
    report['cleanupSignature'] = source_signature(target)
    report['cleanupCornerNormalSignature'] = corner_normal_signature(target)
    report['status'] = 'isolated cleanup scene created; neutral comparison pending'
    report['trianglesBefore'] = 48384
    report['trianglesAfter'] = 43556
    report['removedExactOpposedDuplicates'] = 4828
    report['meshObjects'] = 59
    report['copiedMaterials'] = len(owned_materials)
    report['copiedMaterialInputsMatchSource'] = True
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
    if before is not None:
        report['sourcePreservation'] = source_signature(source) == before
        report['sourceCornerNormalsPreserved'] = corner_normal_signature(source) == normal_before
    report['globalPreservation'] = verify_global(snapshot)
    report['newSceneRetained'] = success
    report['sharedBlendSaved'] = False
    print_receipt(report)
    if before is not None:
        assert report['sourcePreservation'] and report['sourceCornerNormalsPreserved'], 'Original source changed.'
