"""PREPARED ONLY. One owner/channel per guarded MCP call; no source export.

Prefix safe00+01; inject actual BLOCKRUNNER_AUDIT, BLOCKRUNNER_FIT and fresh
BLOCKRUNNER_PAINT_STATE. Set BLOCKRUNNER_ATLAS_OWNER to body/pilot,
BLOCKRUNNER_ATLAS_CHANNEL to color/roughness, BLOCKRUNNER_BAKE_TOKEN fresh.
Caller checks output PNG absent externally before MCP. No filesystem reads.
Fresh state must explicitly identify bodyMeshName and pilotMeshName; no V1
fallback is permitted because that paint trial did not pass visual review.
"""
assert BLOCKRUNNER_ATLAS_OWNER in {'body', 'pilot'}
assert BLOCKRUNNER_ATLAS_CHANNEL in {'color', 'roughness'}
assert isinstance(BLOCKRUNNER_BAKE_TOKEN, str) and 6 <= len(BLOCKRUNNER_BAKE_TOKEN) <= 32
assert all(c in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-' for c in BLOCKRUNNER_BAKE_TOKEN)
assert BLOCKRUNNER_PAINT_STATE['sourceUid'] == REFERENCE['uid']
assert BLOCKRUNNER_PAINT_STATE['meshObjects'] == 2 and BLOCKRUNNER_PAINT_STATE['triangles'] == 44028
assert BLOCKRUNNER_FIT['fitSignature']['objectsFnv1a64'] == '51ebd6d84ed2aa8a'
RESOLUTION = 2048 if BLOCKRUNNER_ATLAS_OWNER == 'body' else 1024
assert isinstance(BLOCKRUNNER_PAINT_STATE['bodyMeshName'], str)
assert isinstance(BLOCKRUNNER_PAINT_STATE['pilotMeshName'], str)
OWNER_NAME = BLOCKRUNNER_PAINT_STATE[BLOCKRUNNER_ATLAS_OWNER + 'MeshName']
CHANNEL_NODE = 'Inkstorm Paint Color' if BLOCKRUNNER_ATLAS_CHANNEL == 'color' else 'Inkstorm Paint Roughness'
COLOR_SPACE = 'sRGB' if BLOCKRUNNER_ATLAS_CHANNEL == 'color' else 'Non-Color'
IMAGE_NAME = 'Blockrunner ' + BLOCKRUNNER_ATLAS_OWNER + ' ' + BLOCKRUNNER_ATLAS_CHANNEL + ' ' + BLOCKRUNNER_BAKE_TOKEN
OUT = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-round34/'
OUTPUT_PATH = OUT + 'blockrunner-' + BLOCKRUNNER_ATLAS_OWNER + '-' + BLOCKRUNNER_ATLAS_CHANNEL + '-v1-' + BLOCKRUNNER_BAKE_TOKEN + '.png'
assert IMAGE_NAME not in bpy.data.images, 'Never reuse a previous atlas image.'


def atlas_normal_signature(scene):
    return {ob.name: fnv1a64_signature([list(n.vector) for n in ob.data.corner_normals])
            for ob in scene.objects if ob.type == 'MESH'}


def atlas_mesh_signatures(scene):
    return {ob.name: mesh_signature(ob.data) for ob in scene.objects if ob.type == 'MESH'}


def atlas_linked_images(scene):
    images = {}
    for ob in scene.objects:
        if ob.type != 'MESH':
            continue
        for slot in ob.material_slots:
            if slot.material is None or not slot.material.use_nodes:
                continue
            for node in slot.material.node_tree.nodes:
                if node.type == 'TEX_IMAGE' and node.image is not None:
                    linked = node.image
                    images[linked.name] = {'name': linked.name, 'size': list(linked.size),
                                           'colorSpace': linked.colorspace_settings.name,
                                           'filepath': linked.filepath}
    return images


def bake_settings(scene):
    return {'engine': scene.render.engine, 'device': scene.cycles.device,
            'samples': scene.cycles.samples, 'margin': scene.render.bake.margin,
            'clear': scene.render.bake.use_clear,
            'selectedToActive': scene.render.bake.use_selected_to_active,
            'target': scene.render.bake.target, 'useCage': scene.render.bake.use_cage}


def restore_bake_settings(scene, previous):
    scene.render.engine = previous['engine']
    scene.cycles.device = previous['device']
    scene.cycles.samples = previous['samples']
    scene.render.bake.margin = previous['margin']
    scene.render.bake.use_clear = previous['clear']
    scene.render.bake.use_selected_to_active = previous['selectedToActive']
    scene.render.bake.target = previous['target']
    scene.render.bake.use_cage = previous['useCage']


snapshot = global_snapshot()
source = None
source_before = None
source_normals_before = None
fit = None
fit_before = None
fit_normals_before = None
paint = None
paint_before = None
paint_meshes_before = None
paint_normals_before = None
paint_settings_before = None
paint_layer = None
paint_active = None
paint_selected = None
owner = None
owner_material_indices = None
image = None
material_states = []
output_file_write_started = False
success = False
restoration_errors = []
report = {'stage': 'atlas-channel-emission-bake', 'status': 'executing',
          'sourceUid': REFERENCE['uid'], 'targetScene': BLOCKRUNNER_PAINT_STATE['targetScene'],
          'owner': BLOCKRUNNER_ATLAS_OWNER, 'channel': BLOCKRUNNER_ATLAS_CHANNEL,
          'ownerObject': OWNER_NAME, 'imageName': IMAGE_NAME, 'path': OUTPUT_PATH,
          'bodyMeshName': BLOCKRUNNER_PAINT_STATE['bodyMeshName'],
          'pilotMeshName': BLOCKRUNNER_PAINT_STATE['pilotMeshName'],
          'resolution': [RESOLUTION, RESOLUTION], 'colorSpace': COLOR_SPACE,
          'roughnessChannelContract': 'Roughness emitted as grayscale linear data; G is the glTF/runtime roughness channel.',
          'scope': 'One newly baked private atlas channel. No final material replacement, normalized export, runtime or visual acceptance.',
          'runtimeReady': False, 'sharedBlendSaved': False}
try:
    source = source_guard()
    activate_source(snapshot, source)
    source_before = source_signature(source)
    source_normals_before = atlas_normal_signature(source)
    assert source_before == BLOCKRUNNER_AUDIT['sourceSignature']
    fit = bpy.data.scenes.get(BLOCKRUNNER_FIT['targetScene'])
    assert fit is not None
    activate_source(snapshot, fit)
    fit_before = source_signature(fit)
    fit_normals_before = atlas_normal_signature(fit)
    assert fit_before == BLOCKRUNNER_FIT['fitSignature']
    assert fit_normals_before == BLOCKRUNNER_FIT['fitCornerNormalSignature']
    paint = bpy.data.scenes.get(BLOCKRUNNER_PAINT_STATE['targetScene'])
    assert paint is not None
    activate_source(snapshot, paint)
    paint_before = source_signature(paint)
    paint_meshes_before = atlas_mesh_signatures(paint)
    paint_normals_before = atlas_normal_signature(paint)
    assert paint_before == BLOCKRUNNER_PAINT_STATE['paintSignature'], 'Requires actual fresh paint state after the previous channel.'
    assert paint_normals_before == BLOCKRUNNER_PAINT_STATE['paintCornerNormalSignature']
    assert sum(ob.type == 'MESH' for ob in paint.objects) == 2
    assert {ob.name for ob in paint.objects if ob.type == 'MESH'} == {
        BLOCKRUNNER_PAINT_STATE['bodyMeshName'], BLOCKRUNNER_PAINT_STATE['pilotMeshName']}
    assert sum(len(ob.data.polygons) for ob in paint.objects if ob.type == 'MESH') == 44028
    owner = paint.objects[OWNER_NAME]
    assert owner.type == 'MESH'
    assert len(owner.material_slots) == (3 if BLOCKRUNNER_ATLAS_OWNER == 'body' else 4), 'Bake before atlas material finalization.'
    assert owner.data.uv_layers.active is not None
    assert len(owner.data.uv_layers.active.data) == len(owner.data.loops)
    owner_material_indices = [polygon.material_index for polygon in owner.data.polygons]
    materials = [slot.material for slot in owner.material_slots]
    assert None not in materials and len(set(materials)) == len(materials)
    # Temporary graph routing may only affect this exact owner mesh. Shared
    # materials would let a nominal paint-only bake mutate another history.
    for other in bpy.data.objects:
        if other.type == 'MESH' and other != owner:
            assert not any(slot.material in materials for slot in other.material_slots), ('Owner material shared with another object', other.name)
    for material in materials:
        assert material.use_nodes and material.node_tree is not None
        nodes = material.node_tree.nodes
        assert nodes.get(CHANNEL_NODE) is not None
        output = nodes.get('Material Output')
        assert output is not None and len(output.inputs['Surface'].links) == 1
        material_states.append({'material': material, 'before': material_record(material),
                                'activeNode': nodes.active, 'output': output,
                                'surfaceLinks': [(link.from_socket, link.to_socket) for link in output.inputs['Surface'].links],
                                'imageNode': None, 'emissionNode': None})
    paint_settings_before = bake_settings(paint)
    paint_layer = snapshot['window'].view_layer
    paint_active = paint_layer.objects.active
    paint_selected = {ob for ob in paint_layer.objects if ob.select_get(view_layer=paint_layer)}
    image = bpy.data.images.new(IMAGE_NAME, width=RESOLUTION, height=RESOLUTION, alpha=False)
    image.colorspace_settings.name = COLOR_SPACE
    image.file_format = 'PNG'
    image.filepath_raw = OUTPUT_PATH
    for state in material_states:
        material = state['material']
        nodes, links = material.node_tree.nodes, material.node_tree.links
        target = nodes.new('ShaderNodeTexImage')
        state['imageNode'] = target
        target.name = 'Bake ' + BLOCKRUNNER_ATLAS_OWNER + ' ' + BLOCKRUNNER_ATLAS_CHANNEL + ' ' + BLOCKRUNNER_BAKE_TOKEN
        target.image = image
        nodes.active = target
        emission = nodes.new('ShaderNodeEmission')
        state['emissionNode'] = emission
        emission.inputs['Strength'].default_value = 1
        links.new(nodes[CHANNEL_NODE].outputs[0], emission.inputs['Color'])
        links.new(emission.outputs[0], state['output'].inputs['Surface'])
    for ob in paint_layer.objects:
        ob.select_set(False, view_layer=paint_layer)
    owner.select_set(True, view_layer=paint_layer)
    paint_layer.objects.active = owner
    paint.render.engine = 'CYCLES'
    paint.cycles.device = 'CPU'
    paint.cycles.samples = 1
    paint.render.bake.margin = 8
    paint.render.bake.use_clear = True
    paint.render.bake.use_selected_to_active = False
    paint.render.bake.target = 'IMAGE_TEXTURES'
    paint.render.bake.use_cage = False
    bpy.ops.object.bake(type='EMIT')
    assert list(image.size) == [RESOLUTION, RESOLUTION]
    output_file_write_started = True
    image.save()
    image.pack()
    assert image.packed_file is not None
    report['bakedImagePacked'] = True
    report['retainedBakeImageNodes'] = [{'material': state['material'].name,
                                        'node': state['imageNode'].name} for state in material_states]
    report['status'] = 'one atlas channel baked; final atlas materials and image review pending'
    success = True
finally:
    # Restore the procedural surface graphs on success and failure. Image
    # targets are retained only on success; no material slots are ever cleared.
    for state in material_states:
        material = state['material']
        nodes, links = material.node_tree.nodes, material.node_tree.links
        if state['emissionNode'] is not None:
            for link in list(state['output'].inputs['Surface'].links):
                links.remove(link)
            for old_source, old_target in state['surfaceLinks']:
                links.new(old_source, old_target)
            nodes.remove(state['emissionNode'])
        if not success and state['imageNode'] is not None:
            nodes.remove(state['imageNode'])
            nodes.active = state['activeNode']
        if success:
            nodes.active = state['imageNode']
        after = material_record(material)
        if success:
            after['nodes'] = [row for row in after['nodes'] if row['name'] != state['imageNode'].name]
        if after != state['before']:
            restoration_errors.append('Procedural graph changed: ' + material.name)
    if not success and image is not None:
        if image.users == 0:
            bpy.data.images.remove(image)
        else:
            restoration_errors.append('Failed bake image still has users; retained to avoid deleting linked data.')
    if paint_settings_before is not None:
        restore_bake_settings(paint, paint_settings_before)
        report['paintBakeSettingsRestored'] = bake_settings(paint) == paint_settings_before
    if paint_selected is not None:
        for ob in paint_layer.objects:
            ob.select_set(ob in paint_selected, view_layer=paint_layer)
        paint_layer.objects.active = paint_active
        report['paintLayerSelectionRestored'] = {ob for ob in paint_layer.objects if ob.select_get(view_layer=paint_layer)} == paint_selected and paint_layer.objects.active == paint_active
    if paint is not None and paint_meshes_before is not None:
        report['paintMeshUvAndMaterialSlotsPreserved'] = atlas_mesh_signatures(paint) == paint_meshes_before
        report['paintCornerNormalsPreserved'] = atlas_normal_signature(paint) == paint_normals_before
        if owner_material_indices is not None:
            report['ownerPolygonMaterialIndicesPreserved'] = [polygon.material_index for polygon in owner.data.polygons] == owner_material_indices
        report['paintSignature'] = source_signature(paint)
        report['paintCornerNormalSignature'] = atlas_normal_signature(paint)
        report['linkedPaintImages'] = atlas_linked_images(paint)
        report['meshObjects'] = 2
        report['triangles'] = 44028
    if source_before is not None:
        report['sourcePreservation'] = source_signature(source) == source_before
        report['sourceCornerNormalsPreserved'] = atlas_normal_signature(source) == source_normals_before
    if fit_before is not None:
        report['fitPreservation'] = source_signature(fit) == fit_before
        report['fitCornerNormalsPreserved'] = atlas_normal_signature(fit) == fit_normals_before
    report['globalPreservation'] = verify_global(snapshot)
    report['outputFileWriteStarted'] = output_file_write_started
    report['partialOutputMayExistOnFailure'] = output_file_write_started and not success
    report['newImageRetained'] = success
    report['proceduralGraphsRestored'] = not restoration_errors
    report['restorationErrors'] = restoration_errors
    print_receipt(report)
    assert not restoration_errors, restoration_errors
    if paint_meshes_before is not None:
        assert report['paintMeshUvAndMaterialSlotsPreserved'] and report['paintCornerNormalsPreserved']
        if owner_material_indices is not None:
            assert report['ownerPolygonMaterialIndicesPreserved']
    if source_before is not None:
        assert report['sourcePreservation'] and report['sourceCornerNormalsPreserved']
    if fit_before is not None:
        assert report['fitPreservation'] and report['fitCornerNormalsPreserved']
