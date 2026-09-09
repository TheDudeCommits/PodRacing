"""PREPARED ONLY. Copy accepted V2 and bind four already-baked atlas images.

Prefix safe00+01+pilot-paint-reference-v1. Inject actual BLOCKRUNNER_AUDIT,
BLOCKRUNNER_FIT, BLOCKRUNNER_PAINT_AUTHOR (accepted V2 author receipt), fresh
BLOCKRUNNER_PAINT_STATE (last bake receipt), and BLOCKRUNNER_ATLAS_RECEIPTS
(all four successful stage-10 receipts in execution order). No image writes,
bake, UV operator, normal re-encoding, transform, export or shared blend save.
"""
ATLAS_SCENE = 'PodRacing — Blockrunner Inkstorm finalized atlas round34 V3'
BODY_NAME = 'blockrunner-body-paint-v3'
PILOT_NAME = 'blockrunner-pilot-paint-v3'
assert ATLAS_SCENE not in bpy.data.scenes
assert BODY_NAME not in bpy.data.objects and PILOT_NAME not in bpy.data.objects
assert BLOCKRUNNER_PAINT_AUTHOR['targetScene'] == 'PodRacing — Blockrunner Inkstorm atlas paint round34 V2'
assert BLOCKRUNNER_PAINT_AUTHOR['paintSignature']['objectsFnv1a64'] == 'c8da6bd752d2485a'
assert BLOCKRUNNER_PAINT_AUTHOR['bodyMeshName'] == 'blockrunner-body-paint-v2'
assert BLOCKRUNNER_PAINT_AUTHOR['pilotMeshName'] == 'blockrunner-pilot-paint-v2'
assert BLOCKRUNNER_PAINT_STATE['targetScene'] == BLOCKRUNNER_PAINT_AUTHOR['targetScene']
assert BLOCKRUNNER_PAINT_STATE['sourceUid'] == REFERENCE['uid']
assert BLOCKRUNNER_PAINT_STATE['meshObjects'] == 2 and BLOCKRUNNER_PAINT_STATE['triangles'] == 44028
assert BLOCKRUNNER_PILOT_PAINT['roleOrder'] == ['suit', 'helmet', 'visor', 'gloves']
assert len(BLOCKRUNNER_ATLAS_RECEIPTS) == 4
assert BLOCKRUNNER_PAINT_STATE['paintSignature'] == BLOCKRUNNER_ATLAS_RECEIPTS[-1]['paintSignature']
assert BLOCKRUNNER_PAINT_STATE['linkedPaintImages'] == BLOCKRUNNER_ATLAS_RECEIPTS[-1]['linkedPaintImages']

# Actual completed bake receipts, pinned externally with the same numeric JSON FNV.
# The companion 11-atlas-execution-reference.json records exact files and SHA-256.
assert fnv1a64_signature(BLOCKRUNNER_PAINT_STATE['paintSignature']) == '9e45fb9bc1a499ab'
assert fnv1a64_signature(BLOCKRUNNER_PAINT_STATE['linkedPaintImages']) == 'c255745cce8c26bb'
assert [fnv1a64_signature(receipt) for receipt in BLOCKRUNNER_ATLAS_RECEIPTS] == ['50215ec1a66752e0', '94619d1924f81486', '6342d00416aae43f', 'd16671acbb97f8d5']


def final_normal_signature(scene):
    return {ob.name: fnv1a64_signature([list(n.vector) for n in ob.data.corner_normals])
            for ob in scene.objects if ob.type == 'MESH'}


def image_identity(image):
    return {'name': image.name, 'size': list(image.size),
            'colorSpace': image.colorspace_settings.name, 'filepath': image.filepath}


def linked_image_identities(scene):
    result = {}
    for ob in scene.objects:
        if ob.type != 'MESH':
            continue
        for slot in ob.material_slots:
            if slot.material is None or not slot.material.use_nodes:
                continue
            for node in slot.material.node_tree.nodes:
                if node.type == 'TEX_IMAGE' and node.image is not None:
                    result[node.image.name] = image_identity(node.image)
    return result


def geometry_uv_signature(mesh):
    # Deliberately excludes material identity/indices; those changes receive
    # separate explicit checks. No vertex/edge/triangle/UV edits are allowed.
    return fnv1a64_signature({
        'vertices': [list(v.co) for v in mesh.vertices],
        'edges': [list(edge.vertices) for edge in mesh.edges],
        'polygons': [(list(poly.vertices), poly.use_smooth) for poly in mesh.polygons],
        'uv': [(layer.name, [list(item.uv) for item in layer.data]) for layer in mesh.uv_layers],
        'attributes': [(a.name, a.data_type, a.domain, len(a.data)) for a in mesh.attributes
                       if a.name not in {'material_index', '.material_index'}],
        'shapeKeys': mesh.shape_keys.name if mesh.shape_keys else None})


def response_record(material):
    shader = material.node_tree.nodes.get('Principled BSDF')
    assert shader is not None
    result = {}
    for socket in shader.inputs:
        if socket.name in {'Base Color', 'Roughness'}:
            continue
        assert not socket.is_linked, ('Unexpected unbaked shader input', material.name, socket.name)
        result[socket.name] = socket_value(socket)
    return result


def new_atlas_material(name, original, color_image, roughness_image, role):
    assert name not in bpy.data.materials
    material = bpy.data.materials.new(name)
    owned_materials.append(material)
    material.use_nodes = True
    material.diffuse_color = (1, 1, 1, 1)
    material.metallic = 0
    material.use_backface_culling = original.use_backface_culling
    nodes, links = material.node_tree.nodes, material.node_tree.links
    shader = nodes.get('Principled BSDF')
    original_shader = original.node_tree.nodes['Principled BSDF']
    responses = response_record(original)
    # Retain the measured procedural trial's non-color shader response.
    # Runtime CelMaterial specular coefficients are a separate named contract;
    # they are not interchangeable with Blender's Specular IOR Level socket.
    for input_name, value in responses.items():
        if value is not None:
            destination = next(socket for socket in shader.inputs if socket.identifier == input_name)
            destination.default_value = value
    shader.inputs['Base Color'].default_value = (1, 1, 1, 1)
    shader.inputs['Roughness'].default_value = original_shader.inputs['Roughness'].default_value
    material.roughness = shader.inputs['Roughness'].default_value
    color = nodes.new('ShaderNodeTexImage')
    color.name = 'Blockrunner Baked Base Color'
    color.label = 'Source-surface color atlas; white factor'
    color.image = color_image
    color.interpolation = 'Linear'
    roughness = nodes.new('ShaderNodeTexImage')
    roughness.name = 'Blockrunner Baked Roughness'
    roughness.label = 'Linear roughness atlas; use green channel'
    roughness.image = roughness_image
    roughness.interpolation = 'Linear'
    separate = nodes.new('ShaderNodeSeparateColor')
    separate.name = 'Blockrunner Roughness Green'
    separate.mode = 'RGB'
    links.new(color.outputs['Color'], shader.inputs['Base Color'])
    links.new(roughness.outputs['Color'], separate.inputs['Color'])
    links.new(separate.outputs['Green'], shader.inputs['Roughness'])
    nodes.active = color
    assert response_record(material) == responses
    assert not shader.inputs['Normal'].is_linked
    report['materials'].append({'name': material.name, 'role': role,
        'baseColorImage': color_image.name, 'roughnessImage': roughness_image.name,
        'baseColorFactor': [1, 1, 1, 1], 'roughnessChannel': 'G',
        'responseInheritedFrom': original.name, 'responseInputs': responses,
        'normalMap': False, 'useBackfaceCulling': material.use_backface_culling})
    return material


def copy_owner(original, name, materials, pilot):
    assert original.parent is None and not original.modifiers and not original.constraints
    assert original.animation_data is None and original.data.shape_keys is None
    assert original.instance_type == 'NONE'
    assert all(slot.link == 'DATA' for slot in original.material_slots)
    assert name + ' geometry' not in bpy.data.meshes
    original_indices = [poly.material_index for poly in original.data.polygons]
    original_normals = fnv1a64_signature([list(n.vector) for n in original.data.corner_normals])
    original_geometry = geometry_uv_signature(original.data)
    if pilot:
        expected_indices = [-1] * 4128
        for index, role in enumerate(BLOCKRUNNER_PILOT_PAINT['roleOrder']):
            for polygon_index in BLOCKRUNNER_PILOT_PAINT['roles'][role]['fitPolygonIndices']:
                assert expected_indices[polygon_index] == -1
                expected_indices[polygon_index] = index
        assert original_indices == expected_indices, 'Actual pilot role indices differ from the source-face masks.'
    else:
        expected_indices = [0] * len(original_indices)
        assert len(original_indices) == 39900 and set(original_indices) == {0, 1, 2}
    mesh = original.data.copy()
    owned_meshes.append(mesh)
    mesh.name = name + ' geometry'
    assert mesh_signature(mesh) == mesh_signature(original.data)
    # Clearing slots resets polygon material indices. Restore every expected
    # index only after all destination slots are appended. Pilot indices stay
    # exact; body role colors are now stored in the atlas and all use slot 0.
    mesh.materials.clear()
    for material in materials:
        mesh.materials.append(material)
    for polygon, index in zip(mesh.polygons, expected_indices):
        polygon.material_index = index
    ob = original.copy()
    owned_objects.append(ob)
    ob.data = mesh
    ob.name = name
    target.collection.objects.link(ob)
    assert matrix_rows(ob.matrix_world) == matrix_rows(original.matrix_world)
    assert geometry_uv_signature(mesh) == original_geometry
    assert fnv1a64_signature([list(n.vector) for n in mesh.corner_normals]) == original_normals
    assert [poly.material_index for poly in mesh.polygons] == expected_indices
    histogram = dict(collections.Counter(original_indices))
    report['ownerCopies'].append({'sourceObject': original.name, 'copiedObject': ob.name,
        'triangles': len(mesh.polygons), 'geometryUvSignatureFnv1a64': original_geometry,
        'cornerNormalsFnv1a64': original_normals,
        'sourceMaterialIndexCounts': histogram,
        'sourceMaterialIndicesFnv1a64': fnv1a64_signature(original_indices),
        'copiedMaterialIndicesFnv1a64': fnv1a64_signature(expected_indices),
        'sourcePolygonToCopiedPolygon': 'identity; same polygon and loop order',
        'bodyPaletteRolesBakedIntoAtlas': not pilot,
        'pilotSemanticMaterialIndicesExact': pilot,
        'normalReencodingPerformed': False, 'geometryUvAndNormalsExact': True})
    return ob


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
images_before = None
target = None
owned_objects, owned_meshes, owned_materials = [], [], []
success = False
report = {'stage': 'copy-finalize-atlas-materials', 'status': 'executing',
    'sourceUid': REFERENCE['uid'], 'targetScene': ATLAS_SCENE,
    'bodyMeshName': BODY_NAME, 'pilotMeshName': PILOT_NAME,
    'parentPaintScene': BLOCKRUNNER_PAINT_STATE['targetScene'],
    'parentPaintSignature': BLOCKRUNNER_PAINT_STATE['paintSignature'],
    'materials': [], 'ownerCopies': [], 'atlasImages': [],
    'scope': 'Copy-only atlas binding. Procedural V2 preserved. No image edits, UV edits, normal re-encoding, normalization, export or runtime acceptance.',
    'normalized': False, 'runtimeReady': False, 'sharedBlendSaved': False}
try:
    source = source_guard()
    activate_source(snapshot, source)
    source_before = source_signature(source)
    source_normals_before = final_normal_signature(source)
    assert source_before == BLOCKRUNNER_AUDIT['sourceSignature']
    fit = bpy.data.scenes.get(BLOCKRUNNER_FIT['targetScene'])
    assert fit is not None
    activate_source(snapshot, fit)
    fit_before = source_signature(fit)
    fit_normals_before = final_normal_signature(fit)
    assert fit_before == BLOCKRUNNER_FIT['fitSignature']
    assert fit_normals_before == BLOCKRUNNER_FIT['fitCornerNormalSignature']
    paint = bpy.data.scenes.get(BLOCKRUNNER_PAINT_STATE['targetScene'])
    assert paint is not None
    activate_source(snapshot, paint)
    paint_before = source_signature(paint)
    paint_normals_before = final_normal_signature(paint)
    assert paint_before == BLOCKRUNNER_PAINT_STATE['paintSignature']
    assert paint_normals_before == BLOCKRUNNER_PAINT_STATE['paintCornerNormalSignature']
    assert paint_normals_before == BLOCKRUNNER_PAINT_AUTHOR['paintCornerNormalSignature']
    assert paint_before['objectsFnv1a64'] == BLOCKRUNNER_PAINT_AUTHOR['paintSignature']['objectsFnv1a64']
    assert paint_before['meshesFnv1a64'] == BLOCKRUNNER_PAINT_AUTHOR['paintSignature']['meshesFnv1a64']
    assert len(paint.objects) == 2 and all(ob.type == 'MESH' for ob in paint.objects)
    original_body = paint.objects[BLOCKRUNNER_PAINT_STATE['bodyMeshName']]
    original_pilot = paint.objects[BLOCKRUNNER_PAINT_STATE['pilotMeshName']]
    assert original_body.name == BLOCKRUNNER_PAINT_AUTHOR['bodyMeshName']
    assert original_pilot.name == BLOCKRUNNER_PAINT_AUTHOR['pilotMeshName']
    assert len(original_body.material_slots) == 3 and len(original_pilot.material_slots) == 4
    images_before = linked_image_identities(paint)
    assert images_before == BLOCKRUNNER_PAINT_STATE['linkedPaintImages']
    assert len(images_before) == 4
    channels = {}
    for receipt in BLOCKRUNNER_ATLAS_RECEIPTS:
        key = (receipt['owner'], receipt['channel'])
        assert key not in channels
        assert key[0] in {'body', 'pilot'} and key[1] in {'color', 'roughness'}
        assert receipt['sourceUid'] == REFERENCE['uid'] and receipt['targetScene'] == paint.name
        assert receipt['bakedImagePacked'] and receipt['newImageRetained']
        assert receipt['paintMeshUvAndMaterialSlotsPreserved'] and receipt['paintCornerNormalsPreserved']
        assert receipt['ownerPolygonMaterialIndicesPreserved'] and receipt['proceduralGraphsRestored']
        assert receipt['sourcePreservation'] and receipt['sourceCornerNormalsPreserved']
        assert receipt['fitPreservation'] and receipt['fitCornerNormalsPreserved']
        assert not receipt['partialOutputMayExistOnFailure']
        image = bpy.data.images.get(receipt['imageName'])
        assert image is not None and image.packed_file is not None
        assert image_identity(image) == images_before[image.name]
        assert image.filepath == receipt['path']
        assert list(image.size) == receipt['resolution']
        assert list(image.size) == ([2048, 2048] if key[0] == 'body' else [1024, 1024])
        assert image.colorspace_settings.name == ('sRGB' if key[1] == 'color' else 'Non-Color')
        channels[key] = image
        report['atlasImages'].append({'owner': key[0], 'channel': key[1],
            'identity': image_identity(image), 'packed': True,
            'sourceBakePaintSignature': receipt['paintSignature']})
    assert set(channels) == {('body', 'color'), ('body', 'roughness'), ('pilot', 'color'), ('pilot', 'roughness')}
    assert len({image.name for image in channels.values()}) == 4
    body_response = response_record(original_body.material_slots[0].material)
    assert all(response_record(slot.material) == body_response for slot in original_body.material_slots), 'Body response differs across palette materials; one atlas material would change shading.'
    target = bpy.data.scenes.new(ATLAS_SCENE)
    body_material = new_atlas_material('Blockrunner V3 body atlas', original_body.material_slots[0].material,
        channels[('body', 'color')], channels[('body', 'roughness')], 'body')
    pilot_materials = []
    for index, role in enumerate(BLOCKRUNNER_PILOT_PAINT['roleOrder']):
        pilot_materials.append(new_atlas_material('Blockrunner V3 pilot ' + role + ' atlas',
            original_pilot.material_slots[index].material, channels[('pilot', 'color')],
            channels[('pilot', 'roughness')], role))
    body = copy_owner(original_body, BODY_NAME, [body_material], False)
    pilot = copy_owner(original_pilot, PILOT_NAME, pilot_materials, True)
    report['objectLineage'] = BLOCKRUNNER_PAINT_AUTHOR['objectLineage']
    report['objectLineageScope'] = 'Original source/fit to V2 consolidation ranges; ownerCopies maps V2 polygon/loop indices identically to V3.'
    report['normalEncodingBudgetInherited'] = BLOCKRUNNER_PAINT_AUTHOR['normalEncodingBudget']
    report['meshObjects'] = 2
    report['triangles'] = sum(len(ob.data.polygons) for ob in (body, pilot))
    assert report['triangles'] == 44028
    report['materialSlots'] = {'body': len(body.material_slots), 'pilot': len(pilot.material_slots)}
    report['materialDrawsBeforeAdditionalRenderPasses'] = 5
    report['paintSignature'] = source_signature(target)
    report['paintCornerNormalSignature'] = final_normal_signature(target)
    report['linkedPaintImages'] = linked_image_identities(target)
    assert report['linkedPaintImages'] == images_before
    report['paintBounds'] = bounds(ob.matrix_world @ vertex.co for ob in (body, pilot) for vertex in ob.data.vertices)
    assert report['paintBounds'] == BLOCKRUNNER_PAINT_AUTHOR['paintBounds']
    report['status'] = 'new atlas-material copy created; matched visual and export validation pending'
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
        report['sourceCornerNormalsPreserved'] = final_normal_signature(source) == source_normals_before
    if fit_before is not None:
        report['fitPreservation'] = source_signature(fit) == fit_before
        report['fitCornerNormalsPreserved'] = final_normal_signature(fit) == fit_normals_before
    if paint_before is not None:
        report['proceduralPaintPreserved'] = source_signature(paint) == paint_before
        report['proceduralPaintCornerNormalsPreserved'] = final_normal_signature(paint) == paint_normals_before
    if images_before is not None:
        report['originalAtlasImageIdentitiesPreserved'] = linked_image_identities(paint) == images_before
        report['imagePixelMutationPerformed'] = False
    report['globalPreservation'] = verify_global(snapshot)
    print_receipt(report)
    if source_before is not None:
        assert report['sourcePreservation'] and report['sourceCornerNormalsPreserved']
    if fit_before is not None:
        assert report['fitPreservation'] and report['fitCornerNormalsPreserved']
    if paint_before is not None:
        assert report['proceduralPaintPreserved'] and report['proceduralPaintCornerNormalsPreserved']
    if images_before is not None:
        assert report['originalAtlasImageIdentitiesPreserved']
