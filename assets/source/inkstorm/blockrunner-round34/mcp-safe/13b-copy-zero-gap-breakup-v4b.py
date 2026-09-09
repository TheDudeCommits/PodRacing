"""PREPARED ONLY. Bounded V4 -> V4B paint-gap correction on a new copy.
Prefix safe00+01+13-v4-attribute-signatures.py. Inject actual AUDIT, FIT and
BLOCKRUNNER_PAINT_STATE = paint-author-v4-receipt.json. No bake or render.
"""
TARGET_SCENE = 'PodRacing — Blockrunner localized broken paint round34 V4B'
BODY_NAME = 'blockrunner-body-paint-v4b'
PILOT_NAME = 'blockrunner-pilot-paint-v4b'
assert TARGET_SCENE not in bpy.data.scenes
assert BODY_NAME not in bpy.data.objects and PILOT_NAME not in bpy.data.objects
assert BLOCKRUNNER_PAINT_STATE['targetScene'] == 'PodRacing — Blockrunner geometry-aware Inkstorm paint round34 V4'
assert BLOCKRUNNER_PAINT_STATE['sourceUid'] == REFERENCE['uid']
assert BLOCKRUNNER_PAINT_STATE['bodyMeshName'] == 'blockrunner-body-paint-v4'
assert BLOCKRUNNER_PAINT_STATE['pilotMeshName'] == 'blockrunner-pilot-paint-v4'
assert BLOCKRUNNER_PAINT_STATE['meshObjects'] == 2 and BLOCKRUNNER_PAINT_STATE['triangles'] == 44028


def v4b_normals(scene):
    return {ob.name: fnv1a64_signature([list(n.vector) for n in ob.data.corner_normals])
            for ob in scene.objects if ob.type == 'MESH'}


def v4b_next_math(socket, operation, input_index):
    outgoing = list(socket.links)
    assert len(outgoing) == 1, ('Unexpected breakup branching', socket.node.name)
    link = outgoing[0]
    node = link.to_node
    assert node.bl_idname == 'ShaderNodeMath' and node.operation == operation
    assert link.to_socket == node.inputs[input_index]
    return node


def v4b_breakup(material):
    nodes, links = material.node_tree.nodes, material.node_tree.links
    noise = nodes.get('Inkstorm Edge Only Medium Breakup')
    assert noise is not None and noise.bl_idname == 'ShaderNodeTexNoise'
    subtract = v4b_next_math(noise.outputs['Fac'], 'SUBTRACT', 0)
    scale = v4b_next_math(subtract.outputs[0], 'MULTIPLY', 0)
    clamp_low = v4b_next_math(scale.outputs[0], 'MAXIMUM', 0)
    clamp_high = v4b_next_math(clamp_low.outputs[0], 'MINIMUM', 0)
    floor_scale = v4b_next_math(clamp_high.outputs[0], 'MULTIPLY', 0)
    floor_add = v4b_next_math(floor_scale.outputs[0], 'ADD', 1)
    edge_product = v4b_next_math(floor_add.outputs[0], 'MULTIPLY', 1)
    expected = [(subtract, 1, .35), (scale, 1, 3.3),
                (clamp_low, 1, 0), (clamp_high, 1, 1),
                (floor_scale, 1, .45), (floor_add, 0, .55)]
    for node, socket_index, value in expected:
        assert not node.inputs[socket_index].is_linked
        assert abs(node.inputs[socket_index].default_value-value) < .000001, ('Original V4 breakup differs', node.name)
    removed = [floor_scale.name, floor_add.name]
    # Two coefficient changes plus bypass/removal of the old nonzero floor.
    # The geometry-selected edge field, widths, strength and final 1.6 factor
    # remain identical. Noise <= .47 now produces zero wear.
    subtract.inputs[1].default_value = .47
    scale.inputs[1].default_value = 7
    links.new(clamp_high.outputs[0], edge_product.inputs[1])
    nodes.remove(floor_add)
    nodes.remove(floor_scale)
    assert len(edge_product.inputs[1].links) == 1
    assert edge_product.inputs[1].links[0].from_node == clamp_high
    return {'material': material.name,
        'oldBreakup': '.55 + .45 * clamp((noise - .35) * 3.3)',
        'newBreakup': 'clamp((noise - .47) * 7)',
        'thresholdNode': subtract.name, 'scaleNode': scale.name,
        'removedFloorNodes': removed,
        'retained': 'Same continuous world-space noise, selected edges, widths, contact strengths, pigment/roughness branches and final wear multiplier.'}


snapshot = global_snapshot()
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
target = None
owned_objects, owned_meshes, owned_materials = [], [], []
success = False
report = {'stage': 'copy-zero-gap-breakup-v4b', 'status': 'executing',
    'sourceUid': REFERENCE['uid'], 'targetScene': TARGET_SCENE,
    'bodyMeshName': BODY_NAME, 'pilotMeshName': PILOT_NAME,
    'parentPaintScene': BLOCKRUNNER_PAINT_STATE['targetScene'],
    'parentPaintSignature': BLOCKRUNNER_PAINT_STATE['paintSignature'],
    'materialChanges': [], 'ownerCopies': [],
    'scope': 'New V4B copy changes only the three body breakup branches. Original V4 remains intact. No mask, geometry, UV, normal, palette, bake, normalization or export change.',
    'normalized': False, 'runtimeReady': False, 'sharedBlendSaved': False}
try:
    source = source_guard()
    activate_source(snapshot, source)
    source_before = source_signature(source)
    source_normals_before = v4b_normals(source)
    assert source_before == BLOCKRUNNER_AUDIT['sourceSignature']
    fit = bpy.data.scenes.get(BLOCKRUNNER_FIT['targetScene'])
    assert fit is not None
    activate_source(snapshot, fit)
    fit_before = source_signature(fit)
    fit_normals_before = v4b_normals(fit)
    assert fit_before == BLOCKRUNNER_FIT['fitSignature']
    assert fit_normals_before == BLOCKRUNNER_FIT['fitCornerNormalSignature']
    paint = bpy.data.scenes.get(BLOCKRUNNER_PAINT_STATE['targetScene'])
    assert paint is not None
    activate_source(snapshot, paint)
    paint_before = source_signature(paint)
    paint_normals_before = v4b_normals(paint)
    paint_attributes_before = paint_attribute_signatures(paint)
    assert paint_before == BLOCKRUNNER_PAINT_STATE['paintSignature']
    assert paint_normals_before == BLOCKRUNNER_PAINT_STATE['paintCornerNormalSignature']
    assert paint_attributes_before == BLOCKRUNNER_PAINT_STATE['paintAttributeSignatures']
    assert BLOCKRUNNER_PAINT_STATE['linkedPaintImages'] == {}
    assert len(paint.objects) == 2 and all(ob.type == 'MESH' for ob in paint.objects)
    target = bpy.data.scenes.new(TARGET_SCENE)
    for owner, original_name, copied_name in [('body', BLOCKRUNNER_PAINT_STATE['bodyMeshName'], BODY_NAME),
                                              ('pilot', BLOCKRUNNER_PAINT_STATE['pilotMeshName'], PILOT_NAME)]:
        original = paint.objects[original_name]
        assert original.parent is None and not original.modifiers and not original.constraints
        assert all(slot.link == 'DATA' for slot in original.material_slots)
        assert copied_name + ' geometry' not in bpy.data.meshes
        indices = [p.material_index for p in original.data.polygons]
        copied_materials = []
        for slot in original.material_slots:
            original_material = slot.material
            assert original_material is not None and original_material.use_nodes
            new_name = original_material.name.replace(' V4 ', ' V4B ')
            assert new_name != original_material.name and new_name not in bpy.data.materials
            material = original_material.copy()
            owned_materials.append(material)
            material.name = new_name
            check = material_record(material)
            check['name'] = original_material.name
            assert check == material_record(original_material)
            assert not any(node.type == 'TEX_IMAGE' for node in material.node_tree.nodes)
            if owner == 'body':
                report['materialChanges'].append(v4b_breakup(material))
            copied_materials.append(material)
        mesh = original.data.copy()
        owned_meshes.append(mesh)
        mesh.name = copied_name + ' geometry'
        before_mesh_signature = mesh_signature(original.data)
        assert mesh_signature(mesh) == before_mesh_signature
        mesh.materials.clear()
        for material in copied_materials:
            mesh.materials.append(material)
        for polygon, index in zip(mesh.polygons, indices):
            polygon.material_index = index
        ob = original.copy()
        owned_objects.append(ob)
        ob.name = copied_name
        ob.data = mesh
        target.collection.objects.link(ob)
        # Compare exact mesh structure without material names; the slot index
        # array remains exact while the new copy uses distinct material names.
        def geometry_record(data):
            return {'vertices': [list(v.co) for v in data.vertices],
                'edges': [list(e.vertices) for e in data.edges],
                'polygons': [(list(p.vertices), p.material_index, p.use_smooth) for p in data.polygons],
                'uv': [(layer.name, [list(item.uv) for item in layer.data]) for layer in data.uv_layers],
                'attributes': [(a.name, a.domain, a.data_type, len(a.data)) for a in data.attributes]}
        assert geometry_record(mesh) == geometry_record(original.data)
        assert matrix_rows(ob.matrix_world) == matrix_rows(original.matrix_world)
        assert fnv1a64_signature([list(n.vector) for n in mesh.corner_normals]) == paint_normals_before[original.name]
        assert paint_attribute_signatures(target)[ob.name] == paint_attributes_before[original.name]
        report['ownerCopies'].append({'sourceObject': original.name, 'copiedObject': ob.name,
            'triangles': len(mesh.polygons), 'sourcePolygonToCopiedPolygon': 'identity; same corner order',
            'geometryUvNormalsMaskValuesMaterialIndicesExact': True,
            'geometryUvSignatureFnv1a64': fnv1a64_signature(geometry_record(mesh)),
            'normalReencodingPerformed': False})
    assert len(report['materialChanges']) == 3
    report['meshObjects'] = 2
    report['triangles'] = sum(len(ob.data.polygons) for ob in target.objects)
    assert report['triangles'] == 44028
    report['materialSlots'] = {'body': 3, 'pilot': 4}
    report['objectLineage'] = BLOCKRUNNER_PAINT_STATE['objectLineage']
    report['parentOwnerCopies'] = BLOCKRUNNER_PAINT_STATE['ownerCopies']
    report['objectLineageScope'] = 'Source/fit to V2 ranges; parentOwnerCopies maps V2 to V4; ownerCopies maps V4 to V4B. Polygon and corner identities remain unchanged.'
    report['normalEncodingBudget'] = BLOCKRUNNER_PAINT_STATE['normalEncodingBudget']
    report['normalEncodingBudgetInherited'] = BLOCKRUNNER_PAINT_STATE['normalEncodingBudgetInherited']
    report['paintSignature'] = source_signature(target)
    report['paintCornerNormalSignature'] = v4b_normals(target)
    report['paintAttributeSignatures'] = paint_attribute_signatures(target)
    report['linkedPaintImages'] = {}
    report['paintBounds'] = bounds(ob.matrix_world @ v.co for ob in target.objects for v in ob.data.vertices)
    assert report['paintBounds'] == BLOCKRUNNER_PAINT_STATE['paintBounds']
    report['status'] = 'V4B copy with zero-including breakup created; actual matched appearance review pending'
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
        report['sourceCornerNormalsPreserved'] = v4b_normals(source) == source_normals_before
    if fit_before is not None:
        report['fitPreservation'] = source_signature(fit) == fit_before
        report['fitCornerNormalsPreserved'] = v4b_normals(fit) == fit_normals_before
    if paint_before is not None:
        report['parentPaintPreserved'] = source_signature(paint) == paint_before
        report['parentPaintCornerNormalsPreserved'] = v4b_normals(paint) == paint_normals_before
        report['parentPaintAttributesPreserved'] = paint_attribute_signatures(paint) == paint_attributes_before
    report['globalPreservation'] = verify_global(snapshot)
    print_receipt(report)
    if source_before is not None:
        assert report['sourcePreservation'] and report['sourceCornerNormalsPreserved']
    if fit_before is not None:
        assert report['fitPreservation'] and report['fitCornerNormalsPreserved']
    if paint_before is not None:
        assert report['parentPaintPreserved'] and report['parentPaintCornerNormalsPreserved'] and report['parentPaintAttributesPreserved']
