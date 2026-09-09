def json_value(value):
    return json.loads(json.dumps(value, allow_nan=False))


def maps_from_rows(source, scene, object_rows, material_rows):
    objects = {}
    meshes = {}
    materials = {}
    for row in object_rows:
        original = source.objects.get(row['sourceObject'])
        copied = scene.objects.get(row['copiedObject'])
        assert original is not None and copied is not None
        objects[original] = copied
        if original.type == 'MESH':
            assert copied.data.name == row['copiedMesh']
            meshes[original.data] = copied.data
    for row in material_rows:
        original = bpy.data.materials.get(row['sourceMaterial'])
        copied = bpy.data.materials.get(row['copiedMaterial'])
        assert original is not None and copied is not None
        materials[original] = copied
    return objects, meshes, materials


def require_three_scenes(source, source_copy, cleanup_scene):
    require_source(source)
    maps = existing_copy_maps(source, source_copy)
    copy_parity(source, source_copy, maps[0], maps[1], maps[2])
    maps = maps_from_rows(source, cleanup_scene, FIT['cleanupObjects'], FIT['cleanupMaterials'])
    result = cleanup_parity(source, cleanup_scene, maps[0], maps[1], maps[2])
    assert json_value(result['sourceNameNormalizedSignatures']) == FIT['cleanupSignatures']
    assert json_value(result['rawCornerNormalSignatures']) == FIT['cleanupNormals']
    return maps


def mesh_topology_uv_flags(mesh):
    return fnv1a64_signature({
        'vertices': len(mesh.vertices),
        'edges': [(list(e.vertices), e.use_seam, e.use_edge_sharp) for e in mesh.edges],
        'polygons': [(list(p.vertices), p.material_index, p.use_smooth) for p in mesh.polygons],
        'uv': [(layer.name, [list(value.uv) for value in layer.data]) for layer in mesh.uv_layers],
        'attributes': [(a.name, a.data_type, a.domain, len(a.data)) for a in mesh.attributes],
    })


def resize_own_profile(source_ob, target_mesh, design, role, material_names):
    assert target_mesh not in snapshot['sets']['meshes'] and target_mesh in owned['meshes']
    original = source_ob.data
    before_structure = mesh_topology_uv_flags(original)
    matrix = source_ob.matrix_world.copy()
    inverse = matrix.inverted()
    normal_to_world = matrix.to_3x3().inverted().transposed()
    normal_to_local = matrix.to_3x3().transposed()
    points = [tuple(matrix @ vertex.co) for vertex in original.vertices]
    lo, hi = bounds(points)
    base = ((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2])
    old_length = hi[2] - lo[2]
    levels = sorted(set(round(point[2] - base[2], 6) for point in points))
    radius = max(math.hypot(point[0] - base[0], point[1] - base[1]) for point in points)
    assert len(levels) == 4 and len(original.polygons) == 236
    assert length(sub(base, design['originalBaseCenter'])) < FIT['offlineLiveWorldAgreementMetres']
    assert abs(old_length - design['originalLength']) < FIT['offlineLiveWorldAgreementMetres']
    assert abs(radius - design['originalShaftRadius']) < FIT['offlineLiveWorldAgreementMetres']
    start = design['gripBase'] if role == 'grip' else design['mountStart']
    end = design['gripTip'] if role == 'grip' else design['mountEnd']
    axis = unit(sub(end, start))
    new_length = length(sub(end, start))
    scale = 1 if role == 'grip' else design['mountRadius'] / radius
    lower, upper = levels[1], old_length - levels[2]
    assert new_length > (lower + upper) * scale and 1 + axis[2] > 0.1
    normals = []
    for normal in original.corner_normals:
        world = (normal_to_world @ normal.vector).normalized()
        local = (normal_to_local @ Vector(rotate_z(tuple(world), axis))).normalized()
        normals.append(tuple(local))
    desired_points = []
    for index, point in enumerate(points):
        value = sub(point, base)
        distance = value[2]
        if distance <= lower + 0.00001:
            axial = distance * scale
        elif distance >= old_length - upper - 0.00001:
            axial = new_length - (old_length - distance) * scale
        else:
            fraction = (distance - lower) / (old_length - lower - upper)
            axial = lower * scale + fraction * (new_length - (lower + upper) * scale)
        desired = add(start, rotate_z((value[0] * scale, value[1] * scale, axial), axis))
        desired_points.append(desired)
        target_mesh.vertices[index].co = inverse @ Vector(desired)
    target_mesh.update()
    target_mesh.normals_split_custom_set(normals)
    actual_points = [tuple(matrix @ vertex.co) for vertex in target_mesh.vertices]
    maximum_position_error = max(length(sub(a, b)) for a, b in zip(actual_points, desired_points))
    assert maximum_position_error < FIT['offlineLiveWorldAgreementMetres']
    assert mesh_topology_uv_flags(target_mesh) == before_structure, 'Profile topology, UV, polygon flags or edge flags changed.'
    radius_bound = max(length(sub(point, add(start, mul(axis, clamp(dot(sub(point, start), axis), 0, new_length))))) for point in actual_points)
    assert radius_bound <= radius * scale + FIT['offlineLiveWorldAgreementMetres']
    actual_normals = [tuple(normal.vector) for normal in target_mesh.corner_normals]
    assert len(actual_normals) == len(normals) and target_mesh.has_custom_normals
    maximum_angle = 0
    maximum_chord = 0
    changed = 0
    for requested, actual in zip(normals, actual_normals):
        assert all(math.isfinite(value) for value in actual) and length(actual) > 0.99
        requested_world = unit(tuple(normal_to_world @ Vector(requested)))
        actual_world = unit(tuple(normal_to_world @ Vector(actual)))
        cosine = clamp(dot(requested_world, actual_world), -1, 1)
        assert cosine > 0, 'Encoded profile corner normal reversed hemisphere.'
        maximum_angle = max(maximum_angle, math.degrees(math.acos(cosine)))
        maximum_chord = max(maximum_chord, length(sub(requested_world, actual_world)))
        changed += requested != actual
    normal_signature = {'cornerCount': len(actual_normals), 'cornerNormalsFnv1a64': fnv1a64_signature(actual_normals), 'hasCustomNormals': target_mesh.has_custom_normals}
    return {'role': role, 'sourceControl': design['sourceControl'], 'triangles': len(target_mesh.polygons),
            'vertices': len(target_mesh.vertices), 'start': start, 'end': end, 'radius': radius * scale,
            'sourceAxialLevels': levels, 'sourceRadius': radius, 'sourceLength': old_length,
            'maximumStoredWorldPositionError': maximum_position_error,
            'allProfileVerticesWithinCapsule': True, 'maximumSegmentDistance': radius_bound,
            'topologyUvEdgeFlagsPreserved': True, 'topologyUvEdgeFlagsFnv1a64': before_structure,
            'meshFnv1a64': mesh_signature_remapped(target_mesh, material_names),
            'worldPositionsFnv1a64': fnv1a64_signature(actual_points), 'worldBounds': bounds(actual_points),
            'normalSignature': normal_signature, 'requestedNormalsFnv1a64': fnv1a64_signature(normals),
            'normalEncoding': {'corners': len(normals), 'changedComponentsOrVectors': changed,
                               'maxWorldAngleDegrees': maximum_angle, 'maxWorldUnitChord': maximum_chord,
                               'sameHemisphere': True, 'exactVectorsClaimed': False,
                               'policy': 'Own transformed source vectors measured against actual Blender encoding. No imported tolerance; normal and visual review remain explicit.'}}


snapshot = fresh_snapshot()
owned = {name: [] for name in snapshot['sets']}
source = None
source_copy = None
cleanup_scene = None
preserved_before = None
report = {'stage': 'IVORY_ISOLATED_CONTROL_FIT_V1', 'status': 'STARTED', 'fitConstructedAndAudited': False,
          'sourceUid': REFERENCE['sourceUid'], 'sourceGlbSha256': REFERENCE['sourceGlbSha256'],
          'cleanupReceiptSha256': FIT['cleanupReceiptSha256'], 'offlineClearanceReceiptSha256': FIT['offlineReceiptSha256'],
          'targetScene': FIT['scene'], 'originalContext': snapshot['context'],
          'actualPreexistingDatablockCounts': {name: len(value) for name, value in snapshot['sets'].items()},
          'scope': 'Separate cleanup deep copy: reshape two existing source control profiles in their original object frames and add two copied-profile wall mounts. No original-node transform, pilot pose, seat, beam, role mask, paint, import, render, export or save change.',
          'artAccepted': False, 'runtimeReady': False, 'normalEncodingAndVisualReviewPending': True}
try:
    assert bpy.context.mode == 'OBJECT' and not bpy.app.is_job_running('RENDER'), 'Object mode and root renderer release required.'
    assert bpy.data.scenes.get(FIT['scene']) is None, 'Never overwrite a fit scene.'
    source = bpy.data.scenes.get(REFERENCE['sourceScene'])
    source_copy = bpy.data.scenes.get(CLEANUP['sourceCopyScene'])
    cleanup_scene = bpy.data.scenes.get(CLEANUP['futureScene'])
    assert source is not None and source_copy is not None and cleanup_scene is not None
    cleanup_maps = require_three_scenes(source, source_copy, cleanup_scene)
    preserved_before = {scene.name: {'structure': source_signature(scene), 'normals': normal_signatures(scene)} for scene in (source, source_copy, cleanup_scene)}
    triangles = []
    excluded = {design['sourceControl'] for design in FIT['controls']}
    glove_ids = {index for start, count in FIT['gloveCleanedRuns'] for index in range(start, start + count)}
    for original, ob in cleanup_maps[0].items():
        if ob.type != 'MESH':
            continue
        points = [tuple(ob.matrix_world @ vertex.co) for vertex in ob.data.vertices]
        for polygon in ob.data.polygons:
            assert len(polygon.vertices) == 3
            corners = tuple(points[index] for index in polygon.vertices)
            role = 'body'
            if original.name == CLEANUP['targetSourceObject'] and polygon.index in glove_ids:
                role = 'glove-negativeX' if sum(point[0] for point in corners) < 0 else 'glove-positiveX'
            original_index = polygon.index * 2 if original.name == CLEANUP['targetSourceObject'] else polygon.index
            triangles.append({'name': original.name, 'sourcePolygon': original_index, 'p': corners, 'bounds': bounds(corners), 'role': role})
    assert len(triangles) == 43556
    live_clearances = []
    for design in FIT['controls']:
        side = -1 if design['side'] == 'negativeX' else 1
        hits = wall_hits(design['mountStart'], side, design['wallSourceObject'])
        assert length(sub(hits[0][2], design['wallContact'])) < FIT['offlineLiveWorldAgreementMetres']
        assert abs((design['mountEnd'][0] - hits[0][2][0]) * side - 0.002) < FIT['offlineLiveWorldAgreementMetres']
        assert hits[1][0] - hits[0][0] > 0.004
        grip = capsule_clearances(design['gripBase'], design['gripTip'], design['originalShaftRadius'], excluded, 'glove-' + design['side'])
        mount = capsule_clearances(design['mountStart'], design['mountEnd'], design['mountRadius'], excluded, excluded_wall=design['wallSourceObject'])
        intended = grip['minimaWithinSearch']['intendedHand']['capsuleClearance']
        assert 0 < intended < 0.005, 'Own hand capsule proximity must be positive and within 5 mm; physical contact is not claimed.'
        assert grip['minimaWithinSearch']['unintendedSurface']['capsuleClearance'] > 0
        assert mount['minimaWithinSearch']['unintendedSurface']['capsuleClearance'] > 0
        for measured, prior in [(grip, design['gripCapsuleClearances']), (mount, design['mountCapsuleClearancesExcludingIntentionalWall'])]:
            for group, minimum in measured['minimaWithinSearch'].items():
                assert abs(minimum['capsuleClearance'] - prior['minimaWithinSearch'][group]['capsuleClearance']) < FIT['offlineLiveWorldAgreementMetres']
        live_clearances.append({'side': design['side'], 'grip': grip, 'mount': mount, 'wallContact': hits[0][2], 'wallSourcePolygon': hits[0][1], 'wallEmbedMetres': 0.002})
    report['liveClearancesBeforeMutation'] = live_clearances
    cleanup_material_names = {copied: original.name for original, copied in cleanup_maps[2].items()}
    profile_proofs = {}
    for design in FIT['controls']:
        original = source.objects.get(design['sourceControl'])
        control = cleanup_maps[0][original]
        for role in ('grip', 'mount'):
            temporary = control.data.copy()
            owned['meshes'].append(temporary)
            proof = resize_own_profile(control, temporary, design, role, cleanup_material_names)
            profile_proofs[design['sourceControl'] + ':' + role] = proof
            owned['meshes'].remove(temporary)
            bpy.data.meshes.remove(temporary)
    report['ownDisposableProfileEncodingProofs'] = profile_proofs
    for original in source.objects:
        assert bpy.data.objects.get(FIT['prefix'] + original.name) is None
        if original.type == 'MESH':
            assert bpy.data.meshes.get(FIT['prefix'] + original.data.name) is None
    for original in cleanup_maps[2]:
        assert bpy.data.materials.get(FIT['prefix'] + original.name) is None
    for design in FIT['controls']:
        assert bpy.data.objects.get(FIT['prefix'] + design['side'] + ' source profile mount') is None
        assert bpy.data.meshes.get(FIT['prefix'] + design['side'] + ' source profile mount mesh') is None
    target = bpy.data.scenes.new(FIT['scene'])
    owned['scenes'].append(target)
    object_map = {}
    mesh_map = {}
    material_map = {}
    cleanup_material_to_new = {}
    for original, clean_material in cleanup_maps[2].items():
        copied = clean_material.copy()
        owned['materials'].append(copied)
        copied.name = FIT['prefix'] + original.name
        assert copied.name == FIT['prefix'] + original.name
        material_map[original] = copied
        cleanup_material_to_new[clean_material] = copied
    for original, clean_mesh in cleanup_maps[1].items():
        copied = clean_mesh.copy()
        owned['meshes'].append(copied)
        copied.name = FIT['prefix'] + original.name
        assert copied.name == FIT['prefix'] + original.name
        for index, material in enumerate(clean_mesh.materials):
            copied.materials[index] = cleanup_material_to_new[material]
        mesh_map[original] = copied
    for original, clean_object in cleanup_maps[0].items():
        copied = clean_object.copy()
        owned['objects'].append(copied)
        copied.name = FIT['prefix'] + original.name
        assert copied.name == FIT['prefix'] + original.name
        if original.type == 'MESH':
            copied.data = mesh_map[original.data]
        target.collection.objects.link(copied)
        object_map[original] = copied
    for original, copied in object_map.items():
        copied.parent = object_map[original.parent] if original.parent else None
    target.view_layers[0].update()
    expected_core = {'signatures': FIT['cleanupSignatures'], 'normals': FIT['cleanupNormals']}
    report['unchangedCleanupDeepCopyPassed'] = clone_core_audit(source, target, object_map, mesh_map, material_map, [], expected_core)['copyPassed']
    expected_core = json_value(expected_core)
    material_names = {copied: original.name for original, copied in material_map.items()}
    mount_objects = []
    profile_results = []
    for design in FIT['controls']:
        original = source.objects.get(design['sourceControl'])
        clean_control = cleanup_maps[0][original]
        copied_control = object_map[original]
        for role in ('grip', 'mount'):
            if role == 'grip':
                changed = copied_control
            else:
                mesh = clean_control.data.copy()
                owned['meshes'].append(mesh)
                mesh.name = FIT['prefix'] + design['side'] + ' source profile mount mesh'
                assert mesh.name == FIT['prefix'] + design['side'] + ' source profile mount mesh'
                for index, material in enumerate(clean_control.data.materials):
                    mesh.materials[index] = cleanup_material_to_new[material]
                changed = clean_control.copy()
                owned['objects'].append(changed)
                changed.name = FIT['prefix'] + design['side'] + ' source profile mount'
                assert changed.name == FIT['prefix'] + design['side'] + ' source profile mount'
                changed.data = mesh
                target.collection.objects.link(changed)
                changed.parent = object_map[original.parent] if original.parent else None
                mount_objects.append(changed)
            result = resize_own_profile(clean_control, changed.data, design, role, material_names)
            assert json_value(result) == json_value(profile_proofs[design['sourceControl'] + ':' + role]), 'Own fit does not reproduce its actual disposable profile result.'
            if role == 'grip':
                expected_core['signatures']['meshesFnv1a64'][original.data.name] = result['meshFnv1a64']
                expected_core['normals'][original.name] = result['normalSignature']
            profile_results.append({'object': changed.name, 'mesh': changed.data.name, 'parent': changed.parent.name if changed.parent else None, 'originalSourceObject': original.name, 'profile': result})
    target.view_layers[0].update()
    for mount in mount_objects:
        row = next(row for row in profile_results if row['object'] == mount.name)
        original = source.objects.get(row['originalSourceObject'])
        control = object_map[original]
        assert matrix_rows(mount.matrix_world) == matrix_rows(control.matrix_world)
        assert matrix_rows(mount.matrix_basis) == matrix_rows(control.matrix_basis)
        assert matrix_rows(mount.matrix_parent_inverse) == matrix_rows(control.matrix_parent_inverse)
        assert mount.parent == control.parent and mount.parent_type == control.parent_type and mount.parent_bone == control.parent_bone
        assert set(mount.users_collection) == {target.collection}
        assert mount.data is not control.data and len(mount.data.polygons) == 236
        assert [slot.material for slot in mount.material_slots] == [slot.material for slot in control.material_slots]
    report['coreAudit'] = clone_core_audit(source, target, object_map, mesh_map, material_map, mount_objects, expected_core)
    assert len(target.objects) == 57 and len({ob.data for ob in target.objects if ob.type == 'MESH'}) == 53
    assert sum(len(ob.data.polygons) for ob in target.objects if ob.type == 'MESH') == 44028
    report['actualCounts'] = {'objects': 57, 'meshes': 53, 'materials': 51, 'triangles': 44028}
    report['profileResults'] = profile_results
    report['fittedSceneSignature'] = source_signature(target)
    report['fittedSceneRawNormalSignatures'] = normal_signatures(target)
    require_three_scenes(source, source_copy, cleanup_scene)
    report['preservedThreeScenes'] = {scene.name: {'structure': source_signature(scene), 'normals': normal_signatures(scene)} for scene in (source, source_copy, cleanup_scene)} == preserved_before
    assert report['preservedThreeScenes']
    report['globalPreservation'] = verify_owned_snapshot(snapshot, owned)
    report['fitConstructedAndAudited'] = True
    report['status'] = 'ISOLATED_FIT_CONSTRUCTED_NORMAL_AND_VISUAL_REVIEW_PENDING'
except Exception as error:
    report['status'] = 'FAILED'
    report['error'] = str(error)
    try:
        rollback_owned(snapshot, owned)
        report['ownedRollbackCompleted'] = True
    except Exception as rollback_error:
        report['ownedRollbackCompleted'] = False
        report['rollbackError'] = str(rollback_error)
finally:
    try:
        if preserved_before is not None:
            require_three_scenes(source, source_copy, cleanup_scene)
            report['preservedThreeScenes'] = {scene.name: {'structure': source_signature(scene), 'normals': normal_signatures(scene)} for scene in (source, source_copy, cleanup_scene)} == preserved_before
            assert report['preservedThreeScenes']
        report['globalPreservation'] = verify_owned_snapshot(snapshot, owned)
    except Exception as final_error:
        report['fitConstructedAndAudited'] = False
        report['status'] = 'FAILED'
        report['finalPreservationError'] = str(final_error)
    print('IVORY_CONTROL_FIT_RECEIPT_BEGIN')
    print(json.dumps(report, sort_keys=True, separators=(',', ':'), allow_nan=False))
    print('IVORY_CONTROL_FIT_RECEIPT_END')
