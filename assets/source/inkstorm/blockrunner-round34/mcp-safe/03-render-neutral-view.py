"""STAGED, NOT EXECUTED. One independently cleaned-up PNG per MCP call.

Prefix 00-source-reference.py + 01-source-guard.py, then inject:
  BLOCKRUNNER_AUDIT = <successful stage-02 JSON receipt as a Python literal>
  BLOCKRUNNER_VIEW = 'fullcraft' | 'front' | 'rear' | 'driver'
  BLOCKRUNNER_RENDER_TOKEN = <new alphanumeric/hyphen suffix>

The caller must check that the resulting PNG path does not already exist.
No import, export, source edit, palette change or shared .blend save occurs.
"""
# Required injected variables are referenced directly; a missing one stops
# before any scene mutation. No namespace-introspection builtin is used.
assert BLOCKRUNNER_VIEW in {'fullcraft', 'front', 'rear', 'driver'}
assert isinstance(BLOCKRUNNER_RENDER_TOKEN, str) and 6 <= len(BLOCKRUNNER_RENDER_TOKEN) <= 64
assert all(c in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-' for c in BLOCKRUNNER_RENDER_TOKEN)
assert BLOCKRUNNER_AUDIT['status'] == 'measured' and BLOCKRUNNER_AUDIT['sourcePreservation']
assert BLOCKRUNNER_AUDIT['sourceUid'] == REFERENCE['uid']
assert BLOCKRUNNER_AUDIT['sourceReference']['sourceSha256'] == REFERENCE['provenance']['sourceSha256']
assert not BLOCKRUNNER_AUDIT['globalPreservation']['changedScenes']
assert not BLOCKRUNNER_AUDIT['globalPreservation']['changedCollections']

OUT = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-round34'
output_path = OUT + '/source-' + BLOCKRUNNER_VIEW + '-' + BLOCKRUNNER_RENDER_TOKEN + '.png'
stage_name = 'PodRacing temporary Blockrunner neutral ' + BLOCKRUNNER_VIEW + ' ' + BLOCKRUNNER_RENDER_TOKEN
assert stage_name not in bpy.data.scenes, 'Do not reuse a scene from an earlier attempt.'
snapshot = global_snapshot()
source = None
before = None
stage = None
owned_objects = []
owned_meshes = []
owned_materials = []
owned_lights = []
owned_cameras = []
owned_world = None
report = {'stage': 'neutral-render', 'status': 'executing', 'sourceUid': REFERENCE['uid'],
          'view': BLOCKRUNNER_VIEW, 'path': output_path, 'runtimeReady': False,
          'signatureAlgorithm': 'FNV-1a-64 over canonical ASCII JSON; non-cryptographic',
          'scope': 'Original source surfaces and geometry under neutral inspection lighting; no anchor, fit, style or gameplay acceptance.'}
try:
    source = source_guard()
    activate_source(snapshot, source)
    before = source_signature(source)
    assert before == BLOCKRUNNER_AUDIT['sourceSignature'], 'Source changed since the inspected audit; rerun stage 02.'
    matched = measure_reference_match(source)
    mesh_rows = {row['name']: row for row in matched}
    all_bounds = bounds(Vector(point) for row in matched for point in row['bounds'])
    full_center = (Vector(all_bounds[0]) + Vector(all_bounds[1])) * .5
    full_extent = max(Vector(all_bounds[1]) - Vector(all_bounds[0]))
    assert 0 < full_extent < 100, 'Unexpected source scale.'
    target_names = sorted(mesh_rows)
    if BLOCKRUNNER_VIEW == 'driver':
        # Geometry-backed focus candidates remain explicitly unconfirmed roles.
        target_names = (REFERENCE['roleCandidates']['driverCandidate']['names']
                        + REFERENCE['roleCandidates']['controlsCandidates']['names'])
    target_bounds = bounds(Vector(point) for name in target_names for point in mesh_rows[name]['bounds'])
    target_center = (Vector(target_bounds[0]) + Vector(target_bounds[1])) * .5
    direction = {'fullcraft': (1.3, -1.7, 1.1), 'front': (0, -1, .36),
                 'rear': (.24, 1, .50), 'driver': (1.3, -1.7, 1.1)}[BLOCKRUNNER_VIEW]
    report['cameraBasis'] = 'Source Blender coordinates; front/rear follow the actual front engine group at negative Y. No gameplay normalization.'
    report['focusObjects'] = target_names
    report['focusRoleAcceptance'] = 'unconfirmed driver/control candidates' if BLOCKRUNNER_VIEW == 'driver' else 'full craft geometry'
    report['sourceBounds'] = all_bounds
    report['targetBounds'] = target_bounds
    stage = bpy.data.scenes.new(stage_name)
    copied_materials = {}
    for original in sorted(source.objects, key=name_key):
        if original.type != 'MESH':
            continue
        mesh = original.data.copy()
        owned_meshes.append(mesh)
        # Copy each material as well, preserving all nodes/inputs. Modifying a
        # copied material later cannot silently repaint a shared source slot.
        mesh.materials.clear()
        for slot in original.material_slots:
            assert slot.material is not None, ('Empty material slot', original.name)
            material = copied_materials.get(slot.material)
            if material is None:
                material = slot.material.copy()
                copied_materials[slot.material] = material
                owned_materials.append(material)
            mesh.materials.append(material)
        ob = bpy.data.objects.new('Blockrunner neutral copy ' + original.name, mesh)
        owned_objects.append(ob)
        stage.collection.objects.link(ob)
        # No source-object linking, parent edits, transform applications or
        # material substitutions. Matrix already includes source ancestry.
        ob.matrix_world = original.matrix_world.copy()
        ob.hide_render = original.hide_render
        report.setdefault('objectCopies', []).append({'sourceObject': original.name,
                                                      'temporaryObject': ob.name,
                                                      'sourceMesh': original.data.name,
                                                      'temporaryMesh': mesh.name})
    snapshot['window'].scene = stage
    snapshot['window'].view_layer = stage.view_layers[0]
    stage.frame_set(1)
    bpy.context.view_layer.update()
    owned_world = bpy.data.worlds.new(stage_name + ' world')
    owned_world.use_nodes = True
    background = owned_world.node_tree.nodes['Background']
    background.inputs['Color'].default_value = (.16, .16, .16, 1)
    background.inputs['Strength'].default_value = .55
    stage.world = owned_world
    for label, direction_offset, power in [('key', (1, -1.3, 2), 1100),
                                            ('fill', (-1.4, .7, 1.2), 750)]:
        light = bpy.data.lights.new(stage_name + ' ' + label, 'AREA')
        owned_lights.append(light)
        light.energy = power * (full_extent / 12) ** 2
        light.size = full_extent * .75
        light.color = (1, 1, 1)
        ob = bpy.data.objects.new(light.name, light)
        owned_objects.append(ob)
        stage.collection.objects.link(ob)
        ob.location = full_center + Vector(direction_offset) * full_extent * .65
        ob.rotation_euler = (full_center - ob.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data = bpy.data.cameras.new(stage_name + ' camera')
    owned_cameras.append(camera_data)
    camera = bpy.data.objects.new(camera_data.name, camera_data)
    owned_objects.append(camera)
    stage.collection.objects.link(camera)
    stage.camera = camera
    camera.location = target_center + Vector(direction).normalized() * full_extent * 2.5
    orientation = (target_center - camera.location).to_track_quat('-Z', 'Y')
    camera.rotation_euler = orientation.to_euler()
    # Fit every target AABB corner in the actual camera plane; no guessed
    # driver/seat anchor or manually invented source-coordinate crop.
    projected = []
    for name in target_names:
        low, high = mesh_rows[name]['bounds']
        for x in (low[0], high[0]):
            for y in (low[1], high[1]):
                for z in (low[2], high[2]):
                    projected.append(orientation.inverted() @ (Vector((x, y, z)) - target_center))
    projected_bounds = bounds(projected)
    width = projected_bounds[1][0] - projected_bounds[0][0]
    height = projected_bounds[1][1] - projected_bounds[0][1]
    aspect = 4 / 3
    camera_data.type = 'ORTHO'
    # Pin horizontal sensor fit: landscape ortho_scale is the horizontal
    # span. The vertical span is ortho_scale / aspect, so height must be
    # multiplied by aspect before comparing to the required width.
    camera_data.sensor_fit = 'HORIZONTAL'
    camera_data.ortho_scale = max(width, height * aspect) * 1.22
    camera_data.clip_start = .01
    camera_data.clip_end = full_extent * 10
    stage.render.engine = 'CYCLES'
    stage.cycles.device = 'CPU'
    stage.cycles.samples = 16
    stage.cycles.use_denoising = True
    stage.cycles.max_bounces = 4
    stage.render.resolution_x = 1280
    stage.render.resolution_y = 960
    stage.render.resolution_percentage = 100
    stage.render.image_settings.file_format = 'PNG'
    stage.render.image_settings.color_mode = 'RGB'
    stage.render.film_transparent = False
    stage.render.use_compositing = False
    stage.render.use_sequencer = False
    stage.view_settings.view_transform = 'Standard'
    stage.view_settings.look = 'None'
    stage.view_settings.exposure = 0
    stage.view_settings.gamma = 1
    stage.view_settings.use_curve_mapping = False
    stage.render.filepath = output_path
    report['lighting'] = {'worldColor': [.16, .16, .16], 'worldStrength': .55,
                          'lightColors': [[1, 1, 1], [1, 1, 1]],
                          'viewTransform': 'Standard', 'look': 'None', 'exposure': 0, 'gamma': 1,
                          'sourceMaterialInputsUnchanged': True, 'repainted': False,
                          'engine': 'CYCLES', 'device': 'CPU', 'samples': 16}
    report['camera'] = {'location': list(camera.location), 'target': list(target_center),
                        'rotationEuler': list(camera.rotation_euler),
                        'orthoScale': camera_data.ortho_scale, 'sensorFit': camera_data.sensor_fit,
                        'orthoScaleMeaning': 'horizontal span; vertical span = orthoScale / aspect',
                        'fitWidth': width, 'fitHeight': height, 'aspect': aspect,
                        'resolution': [1280, 960]}
    bpy.ops.render.render(write_still=True, scene=stage.name)
    report['status'] = 'rendered; human inspection pending'
finally:
    restore_context(snapshot)
    for ob in reversed(owned_objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    if stage is not None:
        bpy.data.scenes.remove(stage)
    for mesh in owned_meshes:
        assert mesh.users == 0, ('Temporary mesh still used', mesh.name)
        bpy.data.meshes.remove(mesh)
    for material in owned_materials:
        assert material.users == 0, ('Temporary material still used', material.name)
        bpy.data.materials.remove(material)
    for light in owned_lights:
        assert light.users == 0
        bpy.data.lights.remove(light)
    for camera in owned_cameras:
        assert camera.users == 0
        bpy.data.cameras.remove(camera)
    if owned_world is not None:
        assert owned_world.users == 0
        bpy.data.worlds.remove(owned_world)
    if before is not None:
        report['sourcePreservation'] = source_signature(source) == before
        report['sourcePreservationScope'] = 'Matching FNV-1a-64 structural signatures; not byte equality or a cryptographic proof.'
    report['globalPreservation'] = verify_global(snapshot)
    report['temporarySceneRemoved'] = stage_name not in bpy.data.scenes
    report['sharedBlendSaved'] = False
    print_receipt(report)
    if before is not None:
        assert report['sourcePreservation'], 'Source data changed during render.'
