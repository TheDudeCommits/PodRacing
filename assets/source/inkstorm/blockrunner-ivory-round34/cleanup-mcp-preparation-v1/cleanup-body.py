assert isinstance(PROOF, dict) and PROOF.get('preflightPassed') is True, 'Bind the actual successful Ivory disposable preflight receipt externally before cleanup.'
assert PROOF['sourceCopyReceiptSha256'] == CLEANUP['copyReceiptSha256'] and PROOF['cleanupInputsSha256'] == CLEANUP['inputsSha256'], 'Ivory preflight provenance differs.'
assert PROOF['sourceGlbSha256'] == REFERENCE['sourceGlbSha256'] and PROOF['liveExactPairVerification']['pairFnv1a64'] == CLEANUP['pairsFnv']
assert PROOF['normalReconstruction']['retainedCorners'] == 14484 and PROOF['normalReconstruction']['retainedGeometryUvSmoothAndEdgeFlagsVerified']
assert PROOF['globalPreservation']['noPersistentDatablocksCreatedOrRemoved'], 'Disposable preflight did not restore ID sets.'
snapshot = fresh_snapshot()
owned = {name: [] for name in snapshot['sets']}
source = None
source_copy = None
before = None
copy_before = None
report = {'stage': 'IVORY_EXACT_OPPOSING_CLEANUP_V1', 'status': 'STARTED', 'cleanupPassed': False,
          'sourceUid': REFERENCE['sourceUid'], 'sourceGlbSha256': REFERENCE['sourceGlbSha256'],
          'sourceCopyReceiptSha256': CLEANUP['copyReceiptSha256'], 'cleanupInputsSha256': CLEANUP['inputsSha256'],
          'normalPreflightReceiptSha256': PROOF_RECEIPT_SHA256,
          'targetScene': CLEANUP['futureScene'], 'originalContext': snapshot['context'],
          'freshAllSceneSnapshot': [row for scene, row in snapshot['scenes'].items()],
          'freshAllCollectionSnapshot': [row for collection, row in snapshot['collections'].items()],
          'actualPreexistingDatablockCounts': {name: len(values) for name, values in snapshot['sets'].items()},
          'scope': 'Further isolated deep copy; remove only own exact opposing faces. Original and audited source copy retained. No masks, control fit, beam movement, paint, import, render, export, save or runtime admission.',
          'semanticMasksAssigned': False, 'runtimeReady': False}
try:
    assert bpy.context.mode == 'OBJECT' and not bpy.app.is_job_running('RENDER'), 'Object mode and idle renderer required.'
    assert bpy.data.scenes.get(CLEANUP['futureScene']) is None, 'Cleanup scene already exists; never overwrite.'
    source = bpy.data.scenes.get(REFERENCE['sourceScene'])
    source_copy = bpy.data.scenes.get(CLEANUP['sourceCopyScene'])
    assert source is not None and source_copy is not None, 'Exact original and audited source-copy scenes required.'
    require_source(source)
    source_maps = existing_copy_maps(source, source_copy)
    copy_parity(source, source_copy, source_maps[0], source_maps[1], source_maps[2])
    before = source_signature(source)
    copy_before = source_signature(source_copy)
    assert before == PROOF['sourceSignature'] and copy_before == PROOF['sourceCopySignature'], 'Source changed since Ivory normal preflight.'
    original_mesh = source_copy.objects.get(CLEANUP['targetCopyObject']).data
    pairs = verify_live_pairs(original_mesh)
    for original in source.objects:
        assert bpy.data.objects.get(CLEANUP['futurePrefix'] + original.name) is None, ('Future object name exists', original.name)
        if original.type == 'MESH':
            assert bpy.data.meshes.get(CLEANUP['futurePrefix'] + original.data.name) is None, ('Future mesh name exists', original.data.name)
    for original in source_maps[2]:
        assert bpy.data.materials.get(CLEANUP['futurePrefix'] + original.name) is None, ('Future material name exists', original.name)
    target = bpy.data.scenes.new(CLEANUP['futureScene'])
    owned['scenes'].append(target)
    assert target.name == CLEANUP['futureScene'], 'Cleanup scene name differs.'
    object_map = {}
    mesh_map = {}
    material_map = {}
    copy_material_to_new = {}
    for original in sorted(source_maps[2], key=name_key):
        source_material = source_maps[2][original]
        copied = source_material.copy()
        owned['materials'].append(copied)
        copied.name = CLEANUP['futurePrefix'] + original.name
        material_map[original] = copied
        copy_material_to_new[source_material] = copied
    for original in sorted(source_maps[1], key=name_key):
        source_mesh = source_maps[1][original]
        copied = source_mesh.copy()
        owned['meshes'].append(copied)
        copied.name = CLEANUP['futurePrefix'] + original.name
        assert copied.name == CLEANUP['futurePrefix'] + original.name, ('Cleanup mesh name differs', original.name)
        for index, material in enumerate(source_mesh.materials):
            copied.materials[index] = copy_material_to_new[material]
        mesh_map[original] = copied
    for original in sorted(source.objects, key=name_key):
        copied = source_maps[0][original].copy()
        owned['objects'].append(copied)
        copied.name = CLEANUP['futurePrefix'] + original.name
        if original.type == 'MESH':
            copied.data = mesh_map[original.data]
        target.collection.objects.link(copied)
        object_map[original] = copied
    for original, copied in object_map.items():
        copied.parent = object_map[original.parent] if original.parent else None
    target.view_layers[0].update()
    report['unchangedDeepCopyPassedBeforeCleanup'] = copy_parity_new(source, target, object_map, mesh_map, material_map)['copyPassed']
    changed_object = object_map[source.objects.get(CLEANUP['targetSourceObject'])]
    reconstruction = rebuild_owned_mesh(changed_object.data, original_mesh, pairs['sourcePolygonsKept'])
    assert reconstruction == PROOF['normalReconstruction'], 'Ivory reconstruction differs from the exact own disposable preflight result.'
    target.view_layers[0].update()
    report['cleanupAudit'] = cleanup_parity(source, target, object_map, mesh_map, material_map)
    report['retainedNormalReconstruction'] = reconstruction
    report['ownNormalEncodingPolicy'] = 'Exact reproduction of reviewed own Ivory disposable reconstruction. Original/source-copy raw normals remain exact; derivative encoding differences are explicitly measured, never relabelled exact or compared to a Colour tolerance.'
    report['sourcePolygonsKeptInCleanedOrder'] = pairs['sourcePolygonsKept']
    report['opposedSourcePolygonPairsKeptRemoved'] = [[a, b] for a, b in zip(pairs['sourcePolygonsKept'], pairs['sourcePolygonsRemoved'])]
    report['semanticReferenceLineageOnly'] = {}
    for role, runs in CLEANUP['roleRuns'].items():
        source_indices = [index for start, count in runs for index in range(start, start + count)]
        kept = [index for index in source_indices if index % 2 == 0]
        report['semanticReferenceLineageOnly'][role] = {'sourceCount': len(source_indices), 'retainedCount': len(kept),
                                                       'retainedSourcePolygonIndices': kept,
                                                       'cleanedPolygonIndices': [index // 2 for index in kept],
                                                       'maskApplied': False}
    require_source(source)
    copy_parity(source, source_copy, source_maps[0], source_maps[1], source_maps[2])
    assert source_signature(source) == before and source_signature(source_copy) == copy_before, 'A preserved source scene changed.'
    report['sourcePreserved'] = True
    report['auditedSourceCopyPreserved'] = True
    report['globalPreservation'] = verify_owned_snapshot(snapshot, owned)
    report['cleanupPassed'] = True
    report['status'] = 'ISOLATED_EXACT_OPPOSING_CLEANUP_AUDITED'
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
        if source is not None and before is not None:
            report['sourcePreserved'] = source_signature(source) == before
            report['sourceRawNormalsPreserved'] = normal_signatures(source) == REFERENCE['cornerNormals']
        if source_copy is not None and copy_before is not None:
            report['auditedSourceCopyPreserved'] = source_signature(source_copy) == copy_before
            maps = existing_copy_maps(source, source_copy)
            copy_parity(source, source_copy, maps[0], maps[1], maps[2])
            report['auditedSourceCopyRawNormalsPreserved'] = True
        report['globalPreservation'] = verify_owned_snapshot(snapshot, owned)
        assert report.get('sourcePreserved') and report.get('sourceRawNormalsPreserved') and report.get('auditedSourceCopyPreserved') and report.get('auditedSourceCopyRawNormalsPreserved'), 'A preserved source guard failed.'
    except Exception as final_error:
        report['cleanupPassed'] = False
        report['status'] = 'FAILED'
        report['finalPreservationError'] = str(final_error)
    print('IVORY_CLEANUP_RECEIPT_BEGIN')
    print(json.dumps(report, sort_keys=True, separators=(',', ':'), allow_nan=False))
    print('IVORY_CLEANUP_RECEIPT_END')
assert report['cleanupPassed'], 'Ivory cleanup failed; no masks, fit or further authoring may proceed.'
