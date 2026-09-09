def maps_from_rows(source, scene, object_rows, material_rows):
    objects = {}
    meshes = {}
    materials = {}
    for row in object_rows:
        original = source.objects.get(row['sourceObject'])
        copied = scene.objects.get(row['copiedObject'])
        assert original is not None and copied is not None, 'Missing own comparison object.'
        objects[original] = copied
        if original.type == 'MESH':
            assert copied.data.name == row['copiedMesh'], 'Comparison mesh name changed.'
            meshes[original.data] = copied.data
    for row in material_rows:
        original = bpy.data.materials.get(row['sourceMaterial'])
        copied = bpy.data.materials.get(row['copiedMaterial'])
        assert original is not None and copied is not None
        materials[original] = copied
    return objects, meshes, materials


def require_three_scenes(source, source_copy, derivative):
    require_source(source)
    source_maps = existing_copy_maps(source, source_copy)
    copy_parity(source, source_copy, source_maps[0], source_maps[1], source_maps[2])
    derived_maps = maps_from_rows(source, derivative, RENDER['cleanupObjects'], RENDER['cleanupMaterials'])
    cleanup_parity(source, derivative, derived_maps[0], derived_maps[1], derived_maps[2])


snapshot = fresh_snapshot()
source = None
source_copy = None
derivative = None
preserved_before = None
stage = None
owned_objects = []
owned_lights = []
owned_cameras = []
owned_world = None
report = {'stage': 'IVORY_NEUTRAL_SOURCE_CLEANUP_COMPARISON_V1', 'status': 'STARTED', 'renderPassed': False,
          'sourceUid': REFERENCE['sourceUid'], 'sourceGlbSha256': REFERENCE['sourceGlbSha256'],
          'cleanupReceiptSha256': RENDER['cleanupReceiptSha256'],
          'variant': RENDER['variant'], 'view': RENDER['view'], 'path': RENDER['outputPath'],
          'originalContext': snapshot['context'],
          'actualPreexistingDatablockCounts': {name: len(value) for name, value in snapshot['sets'].items()},
          'scope': 'Matched neutral inspection only. Original source materials/mesh data are borrowed read-only by temporary render objects; no material substitution, role paint, mask, control movement, fitting, export, or blend save.',
          'runtimeReady': False, 'artAccepted': False}
try:
    assert bpy.context.mode == 'OBJECT' and not bpy.app.is_job_running('RENDER'), 'Object mode and root GPU release required.'
    assert bpy.data.scenes.get(RENDER['temporaryScene']) is None, 'Temporary render scene already exists.'
    source = bpy.data.scenes.get(REFERENCE['sourceScene'])
    source_copy = bpy.data.scenes.get(CLEANUP['sourceCopyScene'])
    derivative = bpy.data.scenes.get(CLEANUP['futureScene'])
    assert source is not None and source_copy is not None and derivative is not None, 'Exact three Ivory scenes required.'
    require_three_scenes(source, source_copy, derivative)
    preserved_before = {scene.name: {'structure': source_signature(scene), 'rawNormals': normal_signatures(scene)} for scene in (source, source_copy, derivative)}
    inspected = source if RENDER['variant'] == 'source' else derivative
    expected_triangles = 48384 if RENDER['variant'] == 'source' else 43556
    assert len(inspected.objects) == 55 and sum(len(ob.data.polygons) for ob in inspected.objects if ob.type == 'MESH') == expected_triangles
    stage = bpy.data.scenes.new(RENDER['temporaryScene'])
    assert stage.name == RENDER['temporaryScene']
    for original in sorted(inspected.objects, key=name_key):
        if original.type != 'MESH':
            continue
        copied = bpy.data.objects.new('Ivory neutral read-only ' + original.name, original.data)
        owned_objects.append(copied)
        stage.collection.objects.link(copied)
        copied.matrix_world = original.matrix_world.copy()
        copied.hide_render = original.hide_render
        assert copied.data is original.data and all(slot.link == 'DATA' for slot in copied.material_slots)
    snapshot['window'].scene = stage
    snapshot['window'].view_layer = stage.view_layers[0]
    stage.view_layers[0].update()
    full_low = Vector(RENDER['sourceBounds'][0])
    full_high = Vector(RENDER['sourceBounds'][1])
    full_center = (full_low + full_high) * 0.5
    full_extent = max(full_high - full_low)
    target_low = Vector(RENDER['focusBounds'][0])
    target_high = Vector(RENDER['focusBounds'][1])
    target_center = (target_low + target_high) * 0.5
    owned_world = bpy.data.worlds.new(RENDER['temporaryScene'] + ' world')
    owned_world.use_nodes = True
    owned_world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.16, 0.16, 0.16, 1)
    owned_world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.55
    stage.world = owned_world
    for label, direction, energy in [('key', (1, -1.3, 2), 1100), ('fill', (-1.4, 0.7, 1.2), 750)]:
        light = bpy.data.lights.new(RENDER['temporaryScene'] + ' ' + label, 'AREA')
        owned_lights.append(light)
        light.energy = energy * (full_extent / 12) ** 2
        light.size = full_extent * 0.75
        light.color = (1, 1, 1)
        ob = bpy.data.objects.new(light.name, light)
        owned_objects.append(ob)
        stage.collection.objects.link(ob)
        ob.location = full_center + Vector(direction) * full_extent * 0.65
        ob.rotation_euler = (full_center - ob.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data = bpy.data.cameras.new(RENDER['temporaryScene'] + ' camera')
    owned_cameras.append(camera_data)
    camera = bpy.data.objects.new(camera_data.name, camera_data)
    owned_objects.append(camera)
    stage.collection.objects.link(camera)
    stage.camera = camera
    camera.location = target_center + Vector((1.3, -1.7, 1.1)).normalized() * full_extent * 2.5
    orientation = (target_center - camera.location).to_track_quat('-Z', 'Y')
    camera.rotation_euler = orientation.to_euler()
    projected = []
    for x in (target_low.x, target_high.x):
        for y in (target_low.y, target_high.y):
            for z in (target_low.z, target_high.z):
                projected.append(orientation.inverted() @ (Vector((x, y, z)) - target_center))
    width = max(p.x for p in projected) - min(p.x for p in projected)
    height = max(p.y for p in projected) - min(p.y for p in projected)
    camera_data.type = 'ORTHO'
    camera_data.sensor_fit = 'HORIZONTAL'
    camera_data.ortho_scale = max(width, height * (4 / 3)) * 1.22
    camera_data.clip_start = 0.01
    camera_data.clip_end = full_extent * 10
    stage.render.engine = 'CYCLES'
    stage.cycles.device = 'CPU'
    stage.cycles.samples = 16
    stage.cycles.use_denoising = True
    stage.cycles.max_bounces = 4
    stage.cycles.seed = 3401
    stage.cycles.use_animated_seed = False
    stage.render.resolution_x = 768
    stage.render.resolution_y = 576
    stage.render.resolution_percentage = 100
    stage.render.image_settings.file_format = 'PNG'
    stage.render.image_settings.color_mode = 'RGB'
    stage.render.image_settings.color_depth = '8'
    stage.render.film_transparent = False
    stage.render.use_compositing = False
    stage.render.use_sequencer = False
    stage.view_settings.view_transform = 'Standard'
    stage.view_settings.look = 'None'
    stage.view_settings.exposure = 0
    stage.view_settings.gamma = 1
    stage.view_settings.use_curve_mapping = False
    stage.render.filepath = RENDER['outputPath']
    report['camera'] = {'location': list(camera.location), 'target': list(target_center),
                        'rotationEuler': list(camera.rotation_euler), 'orthoScale': camera_data.ortho_scale,
                        'sensorFit': camera_data.sensor_fit, 'resolution': [768, 576], 'focusBounds': RENDER['focusBounds'],
                        'focusOriginalSourceNames': RENDER['focusNames'], 'basis': 'Own unchanged source world coordinates; front engine group at negativeY.'}
    report['lighting'] = {'engine': 'CYCLES', 'device': 'CPU', 'samples': 16, 'seed': 3401,
                          'worldColor': [0.16, 0.16, 0.16], 'worldStrength': 0.55,
                          'keyAndFillColors': [[1, 1, 1], [1, 1, 1]], 'viewTransform': 'Standard', 'look': 'None',
                          'exposure': 0, 'gamma': 1, 'sourceMaterialsUnchanged': True, 'rolePaintAdded': False}
    report['actualTriangles'] = expected_triangles
    report['bodyPilotContainerMaterialCount'] = 1
    bpy.ops.render.render(write_still=True, scene=stage.name)
    report['status'] = 'RENDERED_INSPECTION_PENDING'
except Exception as error:
    report['status'] = 'FAILED'
    report['error'] = str(error)
finally:
    try:
        restore_original_context(snapshot)
        for ob in reversed(owned_objects):
            assert ob not in snapshot['sets']['objects']
            bpy.data.objects.remove(ob, do_unlink=True)
        if stage is not None:
            assert stage not in snapshot['sets']['scenes']
            bpy.data.scenes.remove(stage, do_unlink=True)
        for light in owned_lights:
            assert light not in snapshot['sets']['lights'] and light.users == 0
            bpy.data.lights.remove(light)
        for camera in owned_cameras:
            assert camera not in snapshot['sets']['cameras'] and camera.users == 0
            bpy.data.cameras.remove(camera)
        if owned_world is not None:
            assert owned_world not in snapshot['sets']['worlds'] and owned_world.users == 0
            bpy.data.worlds.remove(owned_world)
        newly_created_images = set(bpy.data.images) - snapshot['sets']['images']
        for image in newly_created_images:
            assert image.name == 'Render Result', ('Unexpected new image; do not remove it', image.name)
            bpy.data.images.remove(image, do_unlink=True)
        report['globalPreservation'] = verify_snapshot(snapshot)
        if preserved_before is not None:
            require_three_scenes(source, source_copy, derivative)
            after = {scene.name: {'structure': source_signature(scene), 'rawNormals': normal_signatures(scene)} for scene in (source, source_copy, derivative)}
            report['allThreeSourceAndDerivativeSignaturesPreserved'] = after == preserved_before
        preservation = report['globalPreservation']
        report['renderPassed'] = report['status'] == 'RENDERED_INSPECTION_PENDING' and report.get('allThreeSourceAndDerivativeSignaturesPreserved', False) and preservation['contextRestored'] and preservation['allSceneSettingsAndMembershipsPreserved'] and preservation['allCollectionMembershipsPreserved'] and preservation['noPersistentDatablocksCreatedOrRemoved']
    except Exception as final_error:
        report['renderPassed'] = False
        report['status'] = 'FAILED'
        report['preservationError'] = str(final_error)
    print('IVORY_NEUTRAL_COMPARISON_RECEIPT_BEGIN')
    print(json.dumps(report, sort_keys=True, separators=(',', ':'), allow_nan=False))
    print('IVORY_NEUTRAL_COMPARISON_RECEIPT_END')
# The connector suppresses printed JSON after a raised terminal assertion.
# Keep every guarded failure explicit in renderPassed/status and return its receipt.
