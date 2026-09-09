snapshot = fresh_snapshot()
source = None
stage = None
scratch = None
before = None
copy_before = None
report = {'stage': 'IVORY_DISPOSABLE_RETAINED_NORMAL_PREFLIGHT_V1', 'status': 'STARTED', 'preflightPassed': False,
          'sourceUid': REFERENCE['sourceUid'], 'sourceGlbSha256': REFERENCE['sourceGlbSha256'],
          'sourceCopyReceiptSha256': CLEANUP['copyReceiptSha256'],
          'cleanupInputsSha256': CLEANUP['inputsSha256'],
          'originalContext': snapshot['context'],
          'actualPreexistingDatablockCounts': {name: len(values) for name, values in snapshot['sets'].items()},
          'scope': 'One disposable mesh rebuild to measure own Ivory retained-normal encoding. No persistent derivative, masks, fit, render, export or save.',
          'persistentCleanupCreated': False, 'semanticMasksAssigned': False}
try:
    assert bpy.context.mode == 'OBJECT' and not bpy.app.is_job_running('RENDER'), 'Object mode and idle renderer required.'
    source = bpy.data.scenes.get(REFERENCE['sourceScene'])
    stage = bpy.data.scenes.get(CLEANUP['sourceCopyScene'])
    assert source is not None and stage is not None, 'Exact original and audited source-copy scenes required.'
    require_source(source)
    maps = existing_copy_maps(source, stage)
    copy_parity(source, stage, maps[0], maps[1], maps[2])
    before = source_signature(source)
    copy_before = source_signature(stage)
    original = stage.objects.get(CLEANUP['targetCopyObject']).data
    pairs = verify_live_pairs(original)
    report['liveExactPairVerification'] = {key: value for key, value in pairs.items() if key not in {'sourcePolygonsKept', 'sourcePolygonsRemoved'}}
    scratch = original.copy()
    assert scratch not in snapshot['sets']['meshes'], 'Scratch must be newly owned.'
    report['normalReconstruction'] = rebuild_owned_mesh(scratch, original, pairs['sourcePolygonsKept'])
    report['sourceSignature'] = before
    report['sourceCopySignature'] = copy_before
    report['status'] = 'MEASURED_DISPOSABLE_RECONSTRUCTION'
except Exception as error:
    report['status'] = 'FAILED'
    report['error'] = str(error)
finally:
    try:
        if scratch is not None:
            assert scratch not in snapshot['sets']['meshes'] and scratch.users == 0, 'Refuse to remove anything except unused scratch mesh.'
            bpy.data.meshes.remove(scratch)
        report['globalPreservation'] = verify_snapshot(snapshot)
        report['sourcePreserved'] = source is not None and before is not None and source_signature(source) == before
        report['auditedSourceCopyPreserved'] = stage is not None and copy_before is not None and source_signature(stage) == copy_before
        report['sourceNormalsPreserved'] = source is not None and normal_signatures(source) == REFERENCE['cornerNormals']
        if source is not None and stage is not None and before is not None and copy_before is not None:
            maps = existing_copy_maps(source, stage)
            copy_parity(source, stage, maps[0], maps[1], maps[2])
            report['auditedCopyRawNormalsAndParityPreserved'] = True
        preservation = report['globalPreservation']
        report['preflightPassed'] = report['status'] == 'MEASURED_DISPOSABLE_RECONSTRUCTION' and report['sourcePreserved'] and report['auditedSourceCopyPreserved'] and report['sourceNormalsPreserved'] and report.get('auditedCopyRawNormalsAndParityPreserved', False) and preservation['contextRestored'] and preservation['allSceneSettingsAndMembershipsPreserved'] and preservation['allCollectionMembershipsPreserved'] and preservation['noPersistentDatablocksCreatedOrRemoved']
    except Exception as final_error:
        report['status'] = 'FAILED'
        report['finalPreservationError'] = str(final_error)
    print('IVORY_RETAINED_NORMAL_PREFLIGHT_RECEIPT_BEGIN')
    print(json.dumps(report, sort_keys=True, separators=(',', ':'), allow_nan=False))
    print('IVORY_RETAINED_NORMAL_PREFLIGHT_RECEIPT_END')
assert report['preflightPassed'], 'Ivory disposable normal reconstruction or preservation failed.'
