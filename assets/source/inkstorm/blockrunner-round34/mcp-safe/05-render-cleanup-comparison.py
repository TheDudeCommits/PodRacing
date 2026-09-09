"""STAGED, NOT EXECUTED. One independently cleaned-up PNG per MCP call.

Prefix 00-source-reference.py + 01-source-guard.py, then inject:
  BLOCKRUNNER_AUDIT = <successful stage-02 JSON receipt as a Python literal>
  BLOCKRUNNER_VIEW = 'fullcraft' | 'front' | 'rear' | 'driver'
  BLOCKRUNNER_RENDER_TOKEN = <new alphanumeric/hyphen suffix>

The caller must check that the resulting PNG path does not already exist.
Also inject BLOCKRUNNER_CLEANUP (successful04receipt) and BLOCKRUNNER_SOURCE_RENDER (matching actual original-view receipt). Repeats its exact camera. No source/cleanup edit or shared blend save.
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

assert BLOCKRUNNER_CLEANUP['sourceUid'] == REFERENCE['uid'] and BLOCKRUNNER_CLEANUP['sourcePreservation']
assert BLOCKRUNNER_CLEANUP['sourceCornerNormalsPreserved'] and BLOCKRUNNER_CLEANUP['newSceneRetained']
assert BLOCKRUNNER_CLEANUP['status'] == 'isolated cleanup scene created; neutral comparison pending'
assert not BLOCKRUNNER_CLEANUP['globalPreservation']['changedScenes']
assert not BLOCKRUNNER_CLEANUP['globalPreservation']['changedCollections']
assert BLOCKRUNNER_SOURCE_RENDER['view'] == BLOCKRUNNER_VIEW
assert BLOCKRUNNER_SOURCE_RENDER['sourceUid'] == REFERENCE['uid'] and BLOCKRUNNER_SOURCE_RENDER['sourcePreservation']
assert BLOCKRUNNER_SOURCE_RENDER['camera']['sensorFit'] == 'HORIZONTAL'
assert BLOCKRUNNER_SOURCE_RENDER['camera']['resolution'] == [1280, 960]
assert BLOCKRUNNER_SOURCE_RENDER['lighting']['viewTransform'] == 'Standard'
assert BLOCKRUNNER_SOURCE_RENDER['lighting']['look'] == 'None'
assert BLOCKRUNNER_SOURCE_RENDER['lighting']['exposure'] == 0
assert BLOCKRUNNER_SOURCE_RENDER['lighting']['gamma'] == 1
assert BLOCKRUNNER_SOURCE_RENDER['lighting']['samples'] == 16


def cleanup_normal_signature(scene):
    result = {}
    for ob in scene.objects:
        if ob.type == 'MESH':
            result[ob.name] = fnv1a64_signature([list(n.vector) for n in ob.data.corner_normals])
    return result


OUT = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-round34'
output_path = OUT + '/cleanup-v1-' + BLOCKRUNNER_VIEW + '-' + BLOCKRUNNER_RENDER_TOKEN + '.png'
stage_name = 'PodRacing temporary Blockrunner cleanup comparison ' + BLOCKRUNNER_VIEW + ' ' + BLOCKRUNNER_RENDER_TOKEN
assert stage_name not in bpy.data.scenes, 'Do not reuse a scene from an earlier attempt.'
snapshot = global_snapshot()
source = None
before = None
cleanup = None
cleanup_before = None
cleanup_normals_before = None
stage = None
owned_objects = []
owned_meshes = []
owned_materials = []
owned_lights = []
owned_cameras = []
owned_world = None
report = {'stage': 'cleanup-neutral-comparison', 'status': 'executing', 'sourceUid': REFERENCE['uid'],
          'view': BLOCKRUNNER_VIEW, 'path': output_path, 'runtimeReady': False,
          'signatureAlgorithm': 'FNV-1a-64 over canonical ASCII JSON; non-cryptographic',
          'sourceComparisonPath': BLOCKRUNNER_SOURCE_RENDER['path'],
          'scope': 'Cleanup copy under exact original neutral-view camera and lighting; no anchor, fit, style or gameplay acceptance.'}
try:
    source = source_guard()
    activate_source(snapshot, source)
    before = source_signature(source)
    assert before == BLOCKRUNNER_AUDIT['sourceSignature'], 'Source changed since the inspected audit; rerun stage 02.'
    measure_reference_match(source)
    cleanup = bpy.data.scenes.get(BLOCKRUNNER_CLEANUP['targetScene'])
    assert cleanup is not None, 'Exact reviewed cleanup scene missing.'
    activate_source(snapshot, cleanup)
    cleanup_before = source_signature(cleanup)
    cleanup_normals_before = cleanup_normal_signature(cleanup)
    assert cleanup_before == BLOCKRUNNER_CLEANUP['cleanupSignature'], 'Cleanup geometry/materials changed since receipt.'
    assert cleanup_normals_before == BLOCKRUNNER_CLEANUP['cleanupCornerNormalSignature'], 'Cleanup normals changed since receipt.'
    matched = []
    for lineage in BLOCKRUNNER_CLEANUP['objectLineage']:
        copied = cleanup.objects[lineage['copiedObject']]
        assert copied.type == 'MESH'
        matched.append({'name': lineage['sourceObject'],
                        'bounds': bounds(copied.matrix_world @ v.co for v in copied.data.vertices)})
    assert len(matched) == 59 and sum(len(o.data.polygons) for o in cleanup.objects if o.type == 'MESH') == 43556
    mesh_rows = {row['name']: row for row in matched}
    all_bounds = bounds(Vector(point) for row in matched for point in row['bounds'])
    original_bounds = BLOCKRUNNER_SOURCE_RENDER['sourceBounds']
    bounds_error = max(abs(all_bounds[i][k] - original_bounds[i][k]) for i in range(2) for k in range(3))
    assert bounds_error < .00001, 'Cleanup bounds changed beyond transform encoding tolerance.'
    # Match actual source light placement/size/power exactly from its receipt.
    # Measuring copied transforms again can differ by floating-point rounding.
    full_center = (Vector(original_bounds[0]) + Vector(original_bounds[1])) * .5
    full_extent = max(Vector(original_bounds[1]) - Vector(original_bounds[0]))
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
    report['originalSourceBoundsForLighting'] = original_bounds
    report['boundsMaximumEncodingDifference'] = bounds_error
    report['targetBounds'] = target_bounds
    stage = bpy.data.scenes.new(stage_name)
    copied_materials = {}
    for original in sorted(cleanup.objects, key=name_key):
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
    # Use the actual original image receipt rather than independently refit.
    original_camera = BLOCKRUNNER_SOURCE_RENDER['camera']
    camera.location = Vector(original_camera['location'])
    camera.rotation_euler = original_camera['rotationEuler']
    camera_data.type = 'ORTHO'
    camera_data.sensor_fit = 'HORIZONTAL'
    camera_data.ortho_scale = original_camera['orthoScale']
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
    report['camera'] = dict(BLOCKRUNNER_SOURCE_RENDER['camera'])
    report['exactOriginalCameraReused'] = True
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
    if cleanup_before is not None:
        report['cleanupPreservation'] = source_signature(cleanup) == cleanup_before
        report['cleanupCornerNormalsPreserved'] = cleanup_normal_signature(cleanup) == cleanup_normals_before
    report['globalPreservation'] = verify_global(snapshot)
    report['temporarySceneRemoved'] = stage_name not in bpy.data.scenes
    report['sharedBlendSaved'] = False
    print_receipt(report)
    if before is not None:
        assert report['sourcePreservation'], 'Source data changed during render.'
    if cleanup_before is not None:
        assert report['cleanupPreservation'] and report['cleanupCornerNormalsPreserved'], 'Cleanup source changed during comparison.'
