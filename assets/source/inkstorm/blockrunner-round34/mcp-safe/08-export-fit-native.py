"""Export the actual accepted fit to a new private GLB, without normalization.
Prefix00+01; inject actual BLOCKRUNNER_AUDIT and BLOCKRUNNER_FIT receipts.
Caller checks the output does not exist. No source edit or shared blend save.
"""
FIT_NATIVE_PATH = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-round34/blockrunner-fit-v1-native.glb'
snapshot = global_snapshot()
source = None
fit = None
report = {'stage': 'preserve-fit-native-glb', 'status': 'executing', 'path': FIT_NATIVE_PATH,
          'sourceUid': REFERENCE['uid'], 'normalized': False, 'runtimeReady': False,
          'scope': 'Private persistence of accepted static fit; original-world Blender coordinates exported with glTF Y-up conversion only.'}
try:
    source = source_guard()
    activate_source(snapshot, source)
    assert source_signature(source) == BLOCKRUNNER_AUDIT['sourceSignature']
    fit = bpy.data.scenes[BLOCKRUNNER_FIT['targetScene']]
    activate_source(snapshot, fit)
    assert source_signature(fit) == BLOCKRUNNER_FIT['fitSignature']
    normal_before = {o.name: fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in fit.objects if o.type == 'MESH'}
    assert normal_before == BLOCKRUNNER_FIT['fitCornerNormalSignature']
    bpy.ops.object.select_all(action='DESELECT')
    meshes = [o for o in fit.objects if o.type == 'MESH']
    assert len(meshes) == 61 and sum(len(o.data.polygons) for o in meshes) == 44028
    for ob in meshes:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.export_scene.gltf(filepath=FIT_NATIVE_PATH, export_format='GLB',
        use_selection=True, use_active_scene=True, export_animations=False,
        export_cameras=False, export_lights=False, export_yup=True,
        export_normals=True, export_tangents=False)
    report['status'] = 'exported; external validation pending'
    report['meshObjects'] = len(meshes)
    report['triangles'] = 44028
finally:
    restore_context(snapshot)
    if source is not None:
        report['sourcePreservation'] = source_signature(source) == BLOCKRUNNER_AUDIT['sourceSignature']
    if fit is not None:
        report['fitPreservation'] = source_signature(fit) == BLOCKRUNNER_FIT['fitSignature']
        report['fitCornerNormalsPreserved'] = {o.name: fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) for o in fit.objects if o.type == 'MESH'} == BLOCKRUNNER_FIT['fitCornerNormalSignature']
    report['globalPreservation'] = verify_global(snapshot)
    report['sharedBlendSaved'] = False
    print_receipt(report)
    assert report.get('sourcePreservation') and report.get('fitPreservation') and report.get('fitCornerNormalsPreserved')
