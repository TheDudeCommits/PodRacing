"""PREPARED ONLY. V4B -> V7 copy inserts a bounded offline AO color term.
Prefix safe00/01/13-attributes/14-wrap/15-contact-guards; inject actual receipts.
No render, bake, file access, normalization, UV edit, normal encoding or save.
"""
TARGET_SCENE = 'PodRacing — Blockrunner short contact color round34 V7'
BODY_NAME = 'blockrunner-body-paint-v7'
PILOT_NAME = 'blockrunner-pilot-paint-v7'
AO_NAME = 'Inkstorm Short Contact AO V7'
PIGMENT_NAME = 'Inkstorm Preserved Pigment Wear Color V7'
COLOR_NAME = 'Inkstorm Paint Color'
assert TARGET_SCENE not in bpy.data.scenes
assert BODY_NAME not in bpy.data.objects and PILOT_NAME not in bpy.data.objects
assert BLOCKRUNNER_PAINT_STATE['targetScene'] == 'PodRacing — Blockrunner localized broken paint round34 V4B'
assert BLOCKRUNNER_PAINT_STATE['sourceUid'] == REFERENCE['uid']
assert BLOCKRUNNER_PAINT_STATE['bodyMeshName'] == 'blockrunner-body-paint-v4b'
assert BLOCKRUNNER_PAINT_STATE['pilotMeshName'] == 'blockrunner-pilot-paint-v4b'
assert BLOCKRUNNER_PAINT_STATE['meshObjects'] == 2 and BLOCKRUNNER_PAINT_STATE['triangles'] == 44028
assert BLOCKRUNNER_PAINT_STATE['paintSignature']['objectsFnv1a64'] == '890a4a28e5ecb2ce'
assert BLOCKRUNNER_PAINT_AUTHOR['targetScene'] == BLOCKRUNNER_PAINT_STATE['targetScene']
assert BLOCKRUNNER_PAINT_AUTHOR['paintCornerNormalSignature'] == BLOCKRUNNER_PAINT_STATE['paintCornerNormalSignature']
assert BLOCKRUNNER_PAINT_AUTHOR['paintAttributeSignatures'] == BLOCKRUNNER_PAINT_STATE['paintAttributeSignatures']
assert BLOCKRUNNER_PAINT_AUTHOR['materialSlots'] == {'body': 3, 'pilot': 4}
# AO node construction and exact socket/property assertions below are the
# fail-closed capability guard. Do not pass a bpy module namespace as a value.


def contact_add_color(material, original_material, owner):
    nodes, links = material.node_tree.nodes, material.node_tree.links
    before = contact_material_record(material)
    roughness_before = contact_roughness_record(material)
    assert nodes.get(AO_NAME) is None and nodes.get(PIGMENT_NAME) is None
    old_color = nodes.get(COLOR_NAME)
    shader = nodes.get('Principled BSDF')
    assert old_color is not None and old_color.bl_idname == 'ShaderNodeMixRGB'
    assert shader is not None and shader.bl_idname == 'ShaderNodeBsdfPrincipled'
    assert len(old_color.outputs) == 1
    outgoing = list(old_color.outputs[0].links)
    assert len(outgoing) == 1 and outgoing[0].to_node == shader
    assert outgoing[0].to_socket == shader.inputs['Base Color']
    assert not shader.inputs['Normal'].is_linked
    original_link = (COLOR_NAME, outgoing[0].from_socket.identifier,
                     shader.name, outgoing[0].to_socket.identifier)
    color_bake_name = 'Bake ' + owner + ' color 20260908-paint-v4b'
    roughness_bake_name = 'Bake ' + owner + ' roughness 20260908-paint-v4b'
    image_nodes = [node for node in nodes if node.bl_idname == 'ShaderNodeTexImage']
    assert {node.name for node in image_nodes} == {color_bake_name, roughness_bake_name}
    old_color_target = nodes[color_bake_name]
    roughness_target = nodes[roughness_bake_name]
    assert nodes.active == roughness_target, 'Expected active last roughness bake target.'
    for node in image_nodes:
        assert node.image is not None and node.image.name in BLOCKRUNNER_V7_PARENT_IMAGES
        assert all(not socket.is_linked for socket in node.inputs)
        assert all(not socket.is_linked for socket in node.outputs)
    removed_color_record = contact_node_record(old_color_target)
    old_color_image = old_color_target.image.name
    nodes.remove(old_color_target)
    # Preserve the complete authored pigment/wear branch under a new name;
    # retain the existing bake contract name on the new final color output.
    old_color.name = PIGMENT_NAME
    ao = nodes.new('ShaderNodeAmbientOcclusion')
    ao.name = AO_NAME
    assert ao.bl_idname == 'ShaderNodeAmbientOcclusion'
    assert {s.name for s in ao.inputs} >= {'Color', 'Distance', 'Normal'}
    assert {s.name for s in ao.outputs} >= {'Color', 'AO'}
    for property_name in ('samples', 'inside', 'only_local'):
        assert hasattr(ao, property_name), ('AO API property unavailable', property_name)
    ao.samples = 16
    ao.inside = False
    ao.only_local = False
    ao.inputs['Color'].default_value = (1, 1, 1, 1)
    ao.inputs['Distance'].default_value = .16
    # Leave the actual source corner shading normal implicit, exactly as the
    # original material. Do not substitute Geometry Normal or recalculate it.
    assert not ao.inputs['Normal'].is_linked
    assert not ao.inputs['Color'].is_linked and not ao.inputs['Distance'].is_linked
    assert ao.samples == 16 and not ao.inside and not ao.only_local
    assert abs(ao.inputs['Distance'].default_value - .16) < .000001
    color = nodes.new('ShaderNodeMixRGB')
    color.name = COLOR_NAME
    color.blend_type = 'MULTIPLY'
    color.use_clamp = False
    color.use_alpha = False
    color.inputs[0].default_value = .38
    links.new(old_color.outputs[0], color.inputs[1])
    links.new(ao.outputs['AO'], color.inputs[2])
    links.new(color.outputs[0], shader.inputs['Base Color'])
    nodes.active = roughness_target
    assert len(shader.inputs['Base Color'].links) == 1
    assert shader.inputs['Base Color'].links[0].from_node == color
    assert contact_roughness_record(material) == roughness_before, 'Roughness graph changed.'
    # Undo only the declared edit in an external record, then require complete
    # old node properties, input/output defaults and links to match exactly.
    after = contact_material_record(material)
    normalized = dict(after)
    normalized_nodes = []
    for row in after['nodes']:
        if row['name'] in {AO_NAME, COLOR_NAME}:
            continue
        row = dict(row)
        if row['name'] == PIGMENT_NAME:
            row['name'] = COLOR_NAME
        normalized_nodes.append(row)
    normalized_nodes.append(removed_color_record)
    def record_name(row):
        return row['name']
    normalized['nodes'] = sorted(normalized_nodes, key=record_name)
    normalized_links = []
    for edge in after['links']:
        if edge[0] in {AO_NAME, COLOR_NAME} or edge[2] in {AO_NAME, COLOR_NAME}:
            continue
        normalized_links.append((COLOR_NAME if edge[0] == PIGMENT_NAME else edge[0], edge[1],
                                 COLOR_NAME if edge[2] == PIGMENT_NAME else edge[2], edge[3]))
    normalized_links.append(original_link)
    normalized['links'] = sorted(normalized_links)
    assert normalized == before, 'Unplanned material graph or property change.'
    return {'sourceMaterial': original_material.name, 'copiedMaterial': material.name,
        'owner': owner, 'renamedOriginalColor': [COLOR_NAME, PIGMENT_NAME],
        'addedNodes': [contact_node_record(ao), contact_node_record(color)],
        'removedDisconnectedOldColorTarget': {'node': color_bake_name, 'image': old_color_image},
        'retainedRoughnessTarget': {'node': roughness_bake_name, 'image': roughness_target.image.name},
        'unplannedShaderChanges': False, 'roughnessDependencyGraphExact': True,
        'roughnessGraphFnv1a64': fnv1a64_signature(roughness_before),
        'formula': 'paintColor * ((1 - 0.38) + 0.38 * ambientOcclusion(distance=0.16))',
        'normalInputUnlinked': True, 'geometryOcclusionIncludesOtherOwner': True,
        'contactColorMaximumDarkeningFraction': .38}


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
candidate_ready = False
report = {'stage': 'copy-short-contact-color-v7', 'status': 'executing',
    'sourceUid': REFERENCE['uid'], 'targetScene': TARGET_SCENE,
    'bodyMeshName': BODY_NAME, 'pilotMeshName': PILOT_NAME,
    'parentPaintScene': BLOCKRUNNER_PAINT_STATE['targetScene'],
    'parentPaintSignature': BLOCKRUNNER_PAINT_STATE['paintSignature'],
    'blenderVersion': bpy.app.version_string, 'blenderVersionTuple': list(bpy.app.version),
    'materialChanges': [], 'ownerCopies': [],
    'scope': 'New V4B copy adds only bounded short-range AO multiplication to seven color branches and removes seven disconnected old color bake targets on the copy. Existing pigment, wear, roughness, normals, masks, UVs, geometry and every history remain unchanged. No bake or render performed.',
    'contactSettings': {'distanceSourceWorldUnits': .16, 'strength': .38,
                        'samples': 16, 'inside': False, 'onlyLocal': False,
                        'normalInput': 'unlinked source shading normal'},
    'normalized': False, 'runtimeReady': False, 'sharedBlendSaved': False,
    'offlineBakeCandidateOnly': True, 'newImageCreated': False,
    'reusedRoughnessMasterAuthority': BLOCKRUNNER_V7_ROUGHNESS_MASTERS}
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
    paint_graphs_before = contact_graph_signatures(paint)
    paint_images_before = wrap_linked_image_records(paint)
    assert paint_before == BLOCKRUNNER_PAINT_STATE['paintSignature']
    assert paint_normals_before == BLOCKRUNNER_PAINT_STATE['paintCornerNormalSignature']
    assert paint_attributes_before == BLOCKRUNNER_PAINT_STATE['paintAttributeSignatures']
    assert paint_images_before == BLOCKRUNNER_V7_PARENT_IMAGES
    assert wrap_image_identities(paint_images_before) == BLOCKRUNNER_PAINT_STATE['linkedPaintImages']
    assert len(paint.objects) == 2 and all(ob.type == 'MESH' for ob in paint.objects)
    assert len(paint_graphs_before) == 7 and len(paint_images_before) == 4
    target = bpy.data.scenes.new(TARGET_SCENE)
    for owner, original_name, copied_name in [('body', BLOCKRUNNER_PAINT_STATE['bodyMeshName'], BODY_NAME),
                                              ('pilot', BLOCKRUNNER_PAINT_STATE['pilotMeshName'], PILOT_NAME)]:
        original = paint.objects[original_name]
        assert original.parent is None and not original.modifiers and not original.constraints
        assert original.animation_data is None and original.data.animation_data is None
        assert original.data.shape_keys is None and original.instance_type == 'NONE'
        assert all(slot.link == 'DATA' for slot in original.material_slots)
        assert len(original.material_slots) == (3 if owner == 'body' else 4)
        assert not original.hide_render and not original.hide_viewport
        assert copied_name + ' geometry' not in bpy.data.meshes
        copied_materials = []
        for slot in original.material_slots:
            original_material = slot.material
            assert original_material is not None and original_material.use_nodes
            new_name = original_material.name.replace(' V4B ', ' V7 ')
            assert new_name != original_material.name and new_name not in bpy.data.materials
            before_detail = contact_material_record(original_material)
            material = original_material.copy()
            owned_materials.append(material)
            material.name = new_name
            assert material.node_tree != original_material.node_tree
            copied_detail = contact_material_record(material)
            copied_detail['name'] = original_material.name
            assert copied_detail == before_detail, 'Material copy differs before contact insertion.'
            report['materialChanges'].append(contact_add_color(material, original_material, owner))
            copied_materials.append(material)
        mesh = original.data.copy()
        owned_meshes.append(mesh)
        mesh.name = copied_name + ' geometry'
        assert mesh_signature(mesh) == mesh_signature(original.data)
        # In-place replacement preserves the polygon material-index layer and
        # authoring attribute order; never clear or reappend existing slots.
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
    assert len(report['materialChanges']) == 7 and len(owned_materials) == 7
    report['meshObjects'] = len(target.objects)
    report['triangles'] = sum(len(ob.data.polygons) for ob in target.objects)
    assert report['meshObjects'] == 2 and report['triangles'] == 44028
    report['materialSlots'] = {'body': 3, 'pilot': 4}
    report['objectLineage'] = BLOCKRUNNER_PAINT_AUTHOR['objectLineage']
    report['parentOwnerCopies'] = BLOCKRUNNER_PAINT_AUTHOR['ownerCopies']
    report['objectLineageScope'] = 'Inherited source/fit-to-V2 ranges and V4-to-V4B owner maps; V4B-to-V7 polygon/corner identities remain exact.'
    report['normalEncodingBudget'] = BLOCKRUNNER_PAINT_AUTHOR['normalEncodingBudget']
    report['normalEncodingBudgetInherited'] = BLOCKRUNNER_PAINT_AUTHOR['normalEncodingBudgetInherited']
    report['paintSignature'] = source_signature(target)
    report['paintCornerNormalSignature'] = wrap_normal_signatures(target)
    report['paintAttributeSignatures'] = paint_attribute_signatures(target)
    report['contactGraphSignatures'] = contact_graph_signatures(target)
    report['contactGraphSignatureHelper'] = '15-ao-contact-guards.py: contact_graph_signatures; canonical JSON FNV-1a-64, includes node operation/RNA/input/output/link properties'
    report['packedImageRecords'] = wrap_linked_image_records(target)
    expected_roughness = {name: row for name, row in paint_images_before.items() if ' roughness ' in name}
    assert len(expected_roughness) == 2 and report['packedImageRecords'] == expected_roughness
    report['linkedPaintImages'] = wrap_image_identities(report['packedImageRecords'])
    report['paintBounds'] = bounds(ob.matrix_world @ v.co for ob in target.objects for v in ob.data.vertices)
    assert report['paintBounds'] == BLOCKRUNNER_PAINT_AUTHOR['paintBounds']
    report['status'] = 'V7 isolated short-contact color candidate created; actual color bakes and matched appearance review pending'
    candidate_ready = True
finally:
    # Preserve transactional cleanup even if restoring context or any source
    # guard raises. Do not declare/print success before these checks complete.
    try:
        restore_context(snapshot)
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
            report['parentContactGraphsPreserved'] = contact_graph_signatures(paint) == paint_graphs_before
        if paint_images_before is not None:
            report['parentPackedImagesPreserved'] = wrap_linked_image_records(paint) == paint_images_before
        report['imageDatablocksUnchanged'] = set(bpy.data.images) == image_datablocks_before
        report['globalPreservation'] = verify_global(snapshot)
        if source_before is not None:
            assert report['sourcePreservation'] and report['sourceCornerNormalsPreserved']
        if fit_before is not None:
            assert report['fitPreservation'] and report['fitCornerNormalsPreserved']
        if paint_before is not None:
            assert report['parentPaintPreserved'] and report['parentPaintCornerNormalsPreserved'] and report['parentPaintAttributesPreserved']
        if paint_graphs_before is not None:
            assert report['parentContactGraphsPreserved']
        if paint_images_before is not None:
            assert report['parentPackedImagesPreserved']
        assert report['imageDatablocksUnchanged']

        success = candidate_ready
    finally:
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
        report['status'] = ('V7 isolated short-contact color candidate created; actual color bakes and matched appearance review pending'
                            if success else 'V7 candidate rolled back; execution or preservation guard failed')
        print_receipt(report)
