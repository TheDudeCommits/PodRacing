"""PREPARED ONLY. Exact V5 copy, ten atlas nodes REPEAT -> EXTEND only.
Prefix 00+01+13-v4-attribute-signatures+14-atlas-wrap-guards.
Inject actual AUDIT, FIT and V5 BLOCKRUNNER_PAINT_STATE, compact but pinned.
No bake, unwrap, normal encoding, image operation, export or blend save.
"""
TARGET_SCENE = 'PodRacing — Blockrunner clamped atlas round34 V6'
BODY_NAME = 'blockrunner-body-paint-v6'
PILOT_NAME = 'blockrunner-pilot-paint-v6'
assert len(bpy.data.scenes) == 150, 'Current scene inventory changed; re-review before this isolated trial.'
assert TARGET_SCENE not in bpy.data.scenes
assert BODY_NAME not in bpy.data.objects and PILOT_NAME not in bpy.data.objects
assert BLOCKRUNNER_PAINT_STATE['targetScene'] == 'PodRacing — Blockrunner Inkstorm finalized atlas round34 V5'
assert BLOCKRUNNER_PAINT_STATE['sourceUid'] == REFERENCE['uid']
assert BLOCKRUNNER_PAINT_STATE['bodyMeshName'] == 'blockrunner-body-paint-v5'
assert BLOCKRUNNER_PAINT_STATE['pilotMeshName'] == 'blockrunner-pilot-paint-v5'
assert BLOCKRUNNER_PAINT_STATE['meshObjects'] == 2 and BLOCKRUNNER_PAINT_STATE['triangles'] == 44028
assert BLOCKRUNNER_PAINT_STATE['paintSignature']['objectsFnv1a64'] == '28d5f9f9772fc1c9'
assert BLOCKRUNNER_PAINT_STATE['materialSlots'] == {'body': 1, 'pilot': 4}

snapshot = global_snapshot()
image_datablocks_before = set(bpy.data.images)
source = None
source_before = None
source_normals_before = None
fit = None
fit_before = None
fit_normals_before = None
paint = None
paint_before = None
paint_normals_before = None
paint_attributes_before = None
paint_graphs_before = None
paint_images_before = None
target = None
owned_objects, owned_meshes, owned_materials = [], [], []
success = False
report = {'stage': 'copy-clamp-atlas-v6', 'status': 'executing',
    'sourceUid': REFERENCE['uid'], 'targetScene': TARGET_SCENE,
    'bodyMeshName': BODY_NAME, 'pilotMeshName': PILOT_NAME,
    'parentPaintScene': BLOCKRUNNER_PAINT_STATE['targetScene'],
    'parentPaintSignature': BLOCKRUNNER_PAINT_STATE['paintSignature'],
    'materialChanges': [], 'ownerCopies': [],
    'scope': 'New copy changes only ten atlas image node extension modes from REPEAT to EXTEND. Source, fit and finalized V5 remain intact. No pixel, UV, geometry, normal, palette, response, bake, normalization or export change.',
    'normalized': False, 'runtimeReady': False, 'sharedBlendSaved': False,
    'imageGuardScope': 'Same four image datablock identities, exact metadata and FNV over actual packed encoded bytes before/after. Image pixels are never written; external file SHA256 pins remain recorded separately. Packed byte FNV is not the canonical-JSON FNV.',
    'imagePixelMutationPerformed': False}
try:
    source = source_guard()
    activate_source(snapshot, source)
    source_before = source_signature(source)
    source_normals_before = wrap_normal_signatures(source)
    assert source_before == BLOCKRUNNER_AUDIT['sourceSignature']
    fit = bpy.data.scenes.get(BLOCKRUNNER_FIT['targetScene'])
    assert fit is not None
    activate_source(snapshot, fit)
    fit_before = source_signature(fit)
    fit_normals_before = wrap_normal_signatures(fit)
    assert fit_before == BLOCKRUNNER_FIT['fitSignature']
    assert fit_normals_before == BLOCKRUNNER_FIT['fitCornerNormalSignature']
    paint = bpy.data.scenes.get(BLOCKRUNNER_PAINT_STATE['targetScene'])
    assert paint is not None
    activate_source(snapshot, paint)
    paint_before = source_signature(paint)
    paint_normals_before = wrap_normal_signatures(paint)
    paint_attributes_before = paint_attribute_signatures(paint)
    paint_graphs_before = wrap_atlas_graph_signatures(paint)
    paint_images_before = wrap_linked_image_records(paint)
    assert paint_before == BLOCKRUNNER_PAINT_STATE['paintSignature']
    assert paint_normals_before == BLOCKRUNNER_PAINT_STATE['paintCornerNormalSignature']
    assert paint_attributes_before == BLOCKRUNNER_PAINT_STATE['paintAttributeSignatures']
    assert wrap_image_identities(paint_images_before) == BLOCKRUNNER_PAINT_STATE['linkedPaintImages']
    assert len(paint_images_before) == 4 and len(paint_graphs_before) == 5
    assert len(paint.objects) == 2 and all(ob.type == 'MESH' for ob in paint.objects)
    target = bpy.data.scenes.new(TARGET_SCENE)
    for owner, original_name, copied_name in [('body', BLOCKRUNNER_PAINT_STATE['bodyMeshName'], BODY_NAME),
                                              ('pilot', BLOCKRUNNER_PAINT_STATE['pilotMeshName'], PILOT_NAME)]:
        original = paint.objects[original_name]
        assert original.parent is None and not original.modifiers and not original.constraints
        assert original.animation_data is None and original.data.animation_data is None
        assert original.data.shape_keys is None and original.instance_type == 'NONE'
        assert all(slot.link == 'DATA' for slot in original.material_slots)
        assert len(original.material_slots) == BLOCKRUNNER_PAINT_STATE['materialSlots'][owner]
        assert copied_name + ' geometry' not in bpy.data.meshes
        copied_materials = []
        for slot in original.material_slots:
            original_material = slot.material
            assert original_material is not None and original_material.use_nodes
            new_name = original_material.name.replace(' V5 ', ' V6 ')
            assert new_name != original_material.name and new_name not in bpy.data.materials
            before_detail = wrap_material_detail(original_material)
            material = original_material.copy()
            owned_materials.append(material)
            material.name = new_name
            assert material.node_tree != original_material.node_tree
            copied_detail = wrap_material_detail(material)
            copied_detail['name'] = original_material.name
            assert copied_detail == before_detail, 'Material copy differs before extension change.'
            texture_nodes = [node for node in material.node_tree.nodes if node.type == 'TEX_IMAGE']
            assert {node.name for node in texture_nodes} == {'Blockrunner Baked Base Color', 'Blockrunner Baked Roughness'}
            assert len(texture_nodes) == 2
            for node in texture_nodes:
                original_node = original_material.node_tree.nodes[node.name]
                assert node.image == original_node.image
                assert node.image.name in paint_images_before
                assert node.extension == original_node.extension == 'REPEAT'
                assert node.interpolation == 'Linear' and node.projection == 'FLAT'
                node.extension = 'EXTEND'
                report['materialChanges'].append({'sourceMaterial': original_material.name,
                    'copiedMaterial': material.name, 'node': node.name,
                    'image': node.image.name, 'beforeExtension': 'REPEAT', 'afterExtension': 'EXTEND'})
            after_detail = wrap_material_detail(material)
            after_detail['name'] = original_material.name
            for node_record in after_detail['shaderProperties']:
                if node_record['type'] == 'ShaderNodeTexImage':
                    assert node_record['extension'] == 'EXTEND'
                    node_record['extension'] = 'REPEAT'
            assert after_detail == before_detail, 'A shader property other than extension changed.'
            copied_materials.append(material)
        mesh = original.data.copy()
        owned_meshes.append(mesh)
        mesh.name = copied_name + ' geometry'
        assert mesh_signature(mesh) == mesh_signature(original.data)
        # Same-count in-place replacement preserves the existing material_index
        # layer and every polygon assignment. Do not clear or reappend slots.
        for slot_index, material in enumerate(copied_materials):
            mesh.materials[slot_index] = material
        ob = original.copy()
        owned_objects.append(ob)
        ob.name = copied_name
        ob.data = mesh
        target.collection.objects.link(ob)
        assert wrap_geometry_record(mesh) == wrap_geometry_record(original.data)
        assert matrix_rows(ob.matrix_world) == matrix_rows(original.matrix_world)
        assert matrix_rows(ob.matrix_local) == matrix_rows(original.matrix_local)
        assert fnv1a64_signature([list(n.vector) for n in mesh.corner_normals]) == paint_normals_before[original.name]
        assert paint_attribute_signatures(target)[ob.name] == paint_attributes_before[original.name]
        report['ownerCopies'].append({'sourceObject': original.name, 'copiedObject': ob.name,
            'triangles': len(mesh.polygons), 'sourcePolygonToCopiedPolygon': 'identity; same polygon and corner order',
            'geometryUvNormalsMaskValuesMaterialIndicesExact': True,
            'geometryUvSignatureFnv1a64': fnv1a64_signature(wrap_geometry_record(mesh)),
            'cornerNormalsFnv1a64': paint_normals_before[original.name],
            'normalReencodingPerformed': False})
    assert len(report['materialChanges']) == 10 and len(owned_materials) == 5
    report['meshObjects'] = len(target.objects)
    report['triangles'] = sum(len(ob.data.polygons) for ob in target.objects)
    assert report['meshObjects'] == 2 and report['triangles'] == 44028
    report['materialSlots'] = {'body': 1, 'pilot': 4}
    report['materialDrawsBeforeAdditionalRenderPasses'] = 5
    report['objectLineage'] = BLOCKRUNNER_PAINT_STATE['objectLineage']
    report['parentOwnerCopies'] = BLOCKRUNNER_PAINT_STATE['ownerCopies']
    report['objectLineageScope'] = 'Retained source/fit-to-V2 ranges; copied V5-to-V6 polygon and corner identities are exact.'
    report['normalEncodingBudgetInherited'] = BLOCKRUNNER_PAINT_STATE['normalEncodingBudgetInherited']
    report['paintSignature'] = source_signature(target)
    report['paintCornerNormalSignature'] = wrap_normal_signatures(target)
    report['paintAttributeSignatures'] = paint_attribute_signatures(target)
    report['atlasGraphSignatures'] = wrap_atlas_graph_signatures(target)
    report['atlasPackedImageRecords'] = wrap_linked_image_records(target)
    assert report['atlasPackedImageRecords'] == paint_images_before
    report['linkedPaintImages'] = wrap_image_identities(report['atlasPackedImageRecords'])
    report['paintBounds'] = bounds(ob.matrix_world @ v.co for ob in target.objects for v in ob.data.vertices)
    assert report['paintBounds'] == BLOCKRUNNER_PAINT_STATE['paintBounds']
    report['status'] = 'V6 atlas wrap-only copy created; matched driver comparison pending'
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
    report['newSceneRetained'] = success
    if source_before is not None:
        report['sourcePreservation'] = source_signature(source) == source_before
        report['sourceCornerNormalsPreserved'] = wrap_normal_signatures(source) == source_normals_before
    if fit_before is not None:
        report['fitPreservation'] = source_signature(fit) == fit_before
        report['fitCornerNormalsPreserved'] = wrap_normal_signatures(fit) == fit_normals_before
    if paint_before is not None:
        report['parentPaintPreserved'] = source_signature(paint) == paint_before
        report['parentPaintCornerNormalsPreserved'] = wrap_normal_signatures(paint) == paint_normals_before
        report['parentPaintAttributesPreserved'] = paint_attribute_signatures(paint) == paint_attributes_before
    if paint_graphs_before is not None:
        report['parentAtlasGraphsPreserved'] = wrap_atlas_graph_signatures(paint) == paint_graphs_before
    if paint_images_before is not None:
        report['parentAtlasImageRecordsPreserved'] = wrap_linked_image_records(paint) == paint_images_before
    report['imageDatablocksUnchanged'] = set(bpy.data.images) == image_datablocks_before
    report['globalPreservation'] = verify_global(snapshot)
    print_receipt(report)
    if source_before is not None:
        assert report['sourcePreservation'] and report['sourceCornerNormalsPreserved']
    if fit_before is not None:
        assert report['fitPreservation'] and report['fitCornerNormalsPreserved']
    if paint_before is not None:
        assert report['parentPaintPreserved'] and report['parentPaintCornerNormalsPreserved'] and report['parentPaintAttributesPreserved']
    if paint_graphs_before is not None:
        assert report['parentAtlasGraphsPreserved']
    if paint_images_before is not None:
        assert report['parentAtlasImageRecordsPreserved']
    assert report['imageDatablocksUnchanged']
