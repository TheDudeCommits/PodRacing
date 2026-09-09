"""PREPARATION ONLY. Prefix safe00+01+13+14; inject actual AUDIT/FIT/PAINT_STATE,
NORMALIZATION and a fresh EXPORT_TOKEN. Caller verifies output absent externally.
Copies current atlas scene only. No image work, pose change, geometry transform,
normal re-encoding, source overwrite or shared blend save. The two explicitly
named V4 authoring color-mask layers are removed only on exact new mesh copies. CPU packaging must
bake exported positive uniform object transforms into POSITION only afterward.
"""
from mathutils import Matrix
assert BLOCKRUNNER_PAINT_STATE['sourceUid'] == REFERENCE['uid']
assert BLOCKRUNNER_PAINT_STATE['meshObjects'] == 2 and BLOCKRUNNER_PAINT_STATE['triangles'] == 44028
assert BLOCKRUNNER_PAINT_STATE['materialSlots'] == {'body': 1, 'pilot': 4}
assert BLOCKRUNNER_PAINT_STATE['materialDrawsBeforeAdditionalRenderPasses'] == 5
assert BLOCKRUNNER_PAINT_STATE['normalized'] is False
assert len(BLOCKRUNNER_PAINT_STATE['atlasGraphSignatures']) == 5
assert len(BLOCKRUNNER_PAINT_STATE['atlasPackedImageRecords']) == 4
assert BLOCKRUNNER_NORMALIZATION['blenderWorldUniformScale'] == 1.6
assert BLOCKRUNNER_NORMALIZATION['targetPilotGameZ'] == -5.2
assert isinstance(BLOCKRUNNER_EXPORT_TOKEN, str) and 6 <= len(BLOCKRUNNER_EXPORT_TOKEN) <= 48
assert all(c in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-' for c in BLOCKRUNNER_EXPORT_TOKEN)
TARGET_NAME = 'PodRacing — Blockrunner normalized export ' + BLOCKRUNNER_EXPORT_TOKEN
OUTPUT_PATH = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/blockrunner-round34/exports/blockrunner-' + BLOCKRUNNER_EXPORT_TOKEN + '-normalized-master.glb'
assert TARGET_NAME not in bpy.data.scenes

def normal_signatures(scene):
    return {o.name: fnv1a64_signature([list(n.vector) for n in o.data.corner_normals])
            for o in scene.objects if o.type == 'MESH'}

def nonmask_mesh_signature(mesh):
    return fnv1a64_signature({
        'vertices': [list(v.co) for v in mesh.vertices],
        'edges': [list(e.vertices) for e in mesh.edges],
        'polygons': [(list(p.vertices), p.material_index, p.use_smooth) for p in mesh.polygons],
        'uv': [(layer.name, [list(item.uv) for item in layer.data]) for layer in mesh.uv_layers],
        'materials': [m.name if m else None for m in mesh.materials],
        'shapeKeys': mesh.shape_keys.name if mesh.shape_keys else None,
        'attributes': [(a.name, a.data_type, a.domain, len(a.data)) for a in mesh.attributes
                       if a.name not in BLOCKRUNNER_V4_ATTRIBUTE_NAMES]})

def mesh_mask_signatures(mesh):
    return {a.name: {'domain': a.domain, 'dataType': a.data_type, 'length': len(a.data),
                    'colorsFnv1a64': fnv1a64_signature([list(item.color) for item in a.data])}
            for a in mesh.color_attributes if a.name in BLOCKRUNNER_V4_ATTRIBUTE_NAMES}

def image_identities(scene):
    result = {}
    for ob in scene.objects:
        if ob.type != 'MESH': continue
        for slot in ob.material_slots:
            assert slot.material and slot.material.use_nodes
            for node in slot.material.node_tree.nodes:
                if node.type == 'TEX_IMAGE' and node.image:
                    im = node.image
                    result[im.name] = {'name': im.name, 'size': list(im.size),
                        'colorSpace': im.colorspace_settings.name, 'filepath': im.filepath}
    return result

def assert_clamped_atlas_nodes(scene):
    material_names = set()
    rows = []
    for ob in scene.objects:
        if ob.type != 'MESH': continue
        for slot in ob.material_slots:
            material = slot.material
            assert material is not None and material.use_nodes
            if material.name in material_names: continue
            material_names.add(material.name)
            for node in material.node_tree.nodes:
                if node.type == 'TEX_IMAGE':
                    assert node.image is not None and node.extension == 'EXTEND', (material.name, node.name, node.extension)
                    rows.append({'material': material.name, 'node': node.name, 'image': node.image.name, 'extension': node.extension})
    assert len(material_names) == 5 and len(rows) == 10
    return rows

snapshot = global_snapshot()
source = fit = paint = target = None
owned_objects, owned_meshes = [], []
source_before = fit_before = paint_before = None
source_normals = fit_normals = paint_normals = images_before = None
paint_attribute_values_before = None
paint_atlas_graphs_before = paint_packed_images_before = None
success = False
candidate_ready = False
history_states = []
report = {'stage': 'copy-normalize-export-master', 'status': 'executing',
    'sourceUid': REFERENCE['uid'], 'targetScene': TARGET_NAME,
    'parentPaintScene': BLOCKRUNNER_PAINT_STATE['targetScene'],
    'parentPaintSignature': BLOCKRUNNER_PAINT_STATE['paintSignature'],
    'path': OUTPUT_PATH, 'normalized': True, 'normalizationAppliedExactlyOnce': True,
    'normalization': BLOCKRUNNER_NORMALIZATION, 'runtimeReady': False,
    'sharedBlendSaved': False, 'ownerCopies': [], 'exportStarted': False,
    'scope': 'Private normalized atlas master, two owners/five material primitives. Object transforms carry uniform scale/translation; CPU packager must bake POSITION and emit identity mesh roots.'}
try:
    source = source_guard()
    activate_source(snapshot, source)
    source_before = source_signature(source); source_normals = normal_signatures(source)
    assert source_before == BLOCKRUNNER_AUDIT['sourceSignature']
    fit = bpy.data.scenes[BLOCKRUNNER_FIT['targetScene']]
    activate_source(snapshot, fit)
    fit_before = source_signature(fit); fit_normals = normal_signatures(fit)
    assert fit_before == BLOCKRUNNER_FIT['fitSignature']
    assert fit_normals == BLOCKRUNNER_FIT['fitCornerNormalSignature']
    paint = bpy.data.scenes[BLOCKRUNNER_PAINT_STATE['targetScene']]
    activate_source(snapshot, paint)
    paint_before = source_signature(paint); paint_normals = normal_signatures(paint)
    assert paint_before == BLOCKRUNNER_PAINT_STATE['paintSignature'], 'Stale actual paint state; no automatic fallback.'
    assert paint_normals == BLOCKRUNNER_PAINT_STATE['paintCornerNormalSignature']
    paint_attribute_values_before = paint_attribute_signatures(paint)
    expected_attributes = BLOCKRUNNER_PAINT_STATE.get('paintAttributeSignatures')
    if expected_attributes is None:
        assert all(not ob.data.color_attributes for ob in paint.objects if ob.type == 'MESH'), 'Color-mask state missing from supplied receipt.'
    else:
        assert paint_attribute_values_before == expected_attributes, 'Actual mask values differ from supplied receipt.'
    images_before = image_identities(paint)
    assert images_before == BLOCKRUNNER_PAINT_STATE['linkedPaintImages']
    assert len(images_before) == 4
    paint_atlas_graphs_before = wrap_atlas_graph_signatures(paint)
    paint_packed_images_before = wrap_linked_image_records(paint)
    assert paint_atlas_graphs_before == BLOCKRUNNER_PAINT_STATE['atlasGraphSignatures'], 'V8 atlas shader properties differ from actual receipt.'
    assert paint_packed_images_before == BLOCKRUNNER_PAINT_STATE['atlasPackedImageRecords'], 'V8 packed atlas bytes/state differ from actual receipt.'
    for reference in BLOCKRUNNER_V8_HISTORY_GUARDS:
        history = bpy.data.scenes.get(reference['targetScene'])
        assert history is not None
        assert source_signature(history) == reference['paintSignature']
        assert wrap_normal_signatures(history) == reference['paintCornerNormalSignature']
        assert paint_attribute_signatures(history) == reference['paintAttributeSignatures']
        assert wrap_linked_image_records(history) == reference['packedImages']
        graph = (wrap_atlas_graph_signatures(history) if reference['graphKind'] == 'atlas'
                 else contact_graph_signatures(history))
        if reference['graphs'] is not None:
            assert graph == reference['graphs']
        history_states.append({'scene': history, 'reference': reference, 'graphs': graph})
    report['atlasImageNodeExtensions'] = assert_clamped_atlas_nodes(paint)
    report['requiredGlbSamplerWrap'] = {'wrapS': 33071, 'wrapT': 33071, 'scope': 'Required contract; actual GLB samplers must be independently checked by CPU packaging.'}
    assert len(paint.objects) == 2 and all(o.type == 'MESH' for o in paint.objects)
    target = bpy.data.scenes.new(TARGET_NAME)
    scale = BLOCKRUNNER_NORMALIZATION['blenderWorldUniformScale']
    transform = Matrix.Diagonal((scale, scale, scale, 1))
    transform.translation = Vector(BLOCKRUNNER_NORMALIZATION['blenderWorldTranslation'])
    identity = matrix_rows(Matrix.Identity(4))
    for role, triangles, slots in [('body', 39900, 1), ('pilot', 4128, 4)]:
        original = paint.objects[BLOCKRUNNER_PAINT_STATE[role + 'MeshName']]
        assert original.parent is None and not original.modifiers and not original.constraints
        assert original.animation_data is None and original.data.shape_keys is None
        assert matrix_rows(original.matrix_world) == identity, 'Atlas owners must contain source-world baked coordinates.'
        assert len(original.material_slots) == slots and len(original.data.polygons) == triangles
        assert all(len(p.vertices) == 3 for p in original.data.polygons)
        assert all(slot.link == 'DATA' for slot in original.material_slots)
        name = 'Blockrunner normalized ' + BLOCKRUNNER_EXPORT_TOKEN + ' ' + role
        assert name not in bpy.data.objects and name + ' geometry' not in bpy.data.meshes
        mesh = original.data.copy(); owned_meshes.append(mesh); mesh.name = name + ' geometry'
        ob = original.copy(); owned_objects.append(ob); ob.data = mesh; ob.name = name
        target.collection.objects.link(ob)
        ob.matrix_world = transform
        assert mesh_signature(mesh) == mesh_signature(original.data)
        full_copy_signature = mesh_signature(mesh)
        assert mesh_mask_signatures(mesh) == mesh_mask_signatures(original.data)
        removed = []
        assert set(mesh.color_attributes.keys()) <= set(BLOCKRUNNER_V4_ATTRIBUTE_NAMES), 'Unexpected vertex colors; do not silently strip.'
        for attribute_name in BLOCKRUNNER_V4_ATTRIBUTE_NAMES:
            attribute = mesh.color_attributes.get(attribute_name)
            if attribute is not None:
                assert attribute.data_type == 'FLOAT_COLOR' and attribute.domain == 'CORNER'
                removed.append({'name': attribute_name, **mesh_mask_signatures(mesh)[attribute_name]})
                mesh.color_attributes.remove(attribute)
        assert not mesh.color_attributes
        assert nonmask_mesh_signature(mesh) == nonmask_mesh_signature(original.data)
        assert fnv1a64_signature([list(n.vector) for n in mesh.corner_normals]) == paint_normals[original.name]
        report[role + 'MeshName'] = name
        report['ownerCopies'].append({'role': role, 'sourceObject': original.name,
            'exportObject': name, 'triangles': triangles, 'materialSlots': slots,
            'materials': [slot.material.name for slot in ob.material_slots],
            'fullMeshCopySignatureBeforeMaskRemoval': full_copy_signature,
            'removedAuthoringMaskLayers': removed,
            'nonMaskGeometryUvMaterialIndicesExact': True, 'cornerNormalsExact': True,
            'copiedMatrixWorld': matrix_rows(ob.matrix_world)})
    activate_source(snapshot, target)
    for ob in target.objects: ob.select_set(True)
    bpy.context.view_layer.objects.active = owned_objects[0]
    report['meshObjects'] = 2; report['triangles'] = 44028
    report['materialDrawsBeforeAdditionalRenderPasses'] = 5
    report['normalizationCarriedByObjectTransforms'] = True
    report['normalizedBlenderBounds'] = bounds(o.matrix_world @ v.co for o in target.objects for v in o.data.vertices)
    report['normalizedGameBounds'] = bounds((p[0], p[2], -p[1]) for p in report['normalizedBlenderBounds'])
    report['linkedPaintImages'] = image_identities(target)
    assert report['linkedPaintImages'] == images_before
    report['objectLineage'] = BLOCKRUNNER_PAINT_STATE['objectLineage']
    report['reusedRoughnessMasterAuthority'] = BLOCKRUNNER_REUSED_ROUGHNESS
    report['contactSettingsBakedIntoColor'] = BLOCKRUNNER_CONTACT_SETTINGS
    assert wrap_atlas_graph_signatures(target) == paint_atlas_graphs_before
    assert wrap_linked_image_records(target) == paint_packed_images_before
    assert_clamped_atlas_nodes(target)
    report['exportStarted'] = True
    bpy.ops.export_scene.gltf(filepath=OUTPUT_PATH, export_format='GLB', use_selection=True,
        use_active_scene=True, export_animations=False, export_cameras=False,
        export_lights=False, export_yup=True, export_normals=True, export_tangents=False)
    assert all(nonmask_mesh_signature(o.data) == nonmask_mesh_signature(paint.objects[row['sourceObject']].data)
               for o, row in zip(owned_objects, report['ownerCopies']))
    assert all(fnv1a64_signature([list(n.vector) for n in o.data.corner_normals]) == paint_normals[row['sourceObject']]
               for o, row in zip(owned_objects, report['ownerCopies'])), 'Copied corner normals changed during export.'
    report['atlasGraphSignatures'] = wrap_atlas_graph_signatures(target)
    report['atlasPackedImageRecords'] = wrap_linked_image_records(target)
    assert report['atlasGraphSignatures'] == paint_atlas_graphs_before, 'Atlas graph changed during export.'
    assert report['atlasPackedImageRecords'] == paint_packed_images_before, 'Packed atlas bytes/state changed during export.'
    assert_clamped_atlas_nodes(target)
    report['exportAtlasGraphsExact'] = True
    report['exportPackedAtlasImagesExact'] = True
    report['normalizedSignature'] = source_signature(target)
    report['normalizedCornerNormalSignature'] = normal_signatures(target)
    report['status'] = 'private normalized master exported; external identity-root packaging and validation pending'
    candidate_ready = True
finally:
    try:
        restore_context(snapshot)
        for label, scene, signature, normals in [('source',source,source_before,source_normals),
                ('fit',fit,fit_before,fit_normals), ('paint',paint,paint_before,paint_normals)]:
            if signature is not None:
                report[label + 'Preservation'] = source_signature(scene) == signature
                report[label + 'CornerNormalsPreserved'] = normal_signatures(scene) == normals
        if paint_attribute_values_before is not None:
            report['paintAttributeValuesPreserved'] = paint_attribute_signatures(paint) == paint_attribute_values_before
            report['paintAttributeSignatures'] = paint_attribute_values_before
        if images_before is not None:
            report['paintImageIdentitiesPreserved'] = image_identities(paint) == images_before
        if paint_atlas_graphs_before is not None:
            report['paintAtlasGraphPropertiesPreserved'] = wrap_atlas_graph_signatures(paint) == paint_atlas_graphs_before
        if paint_packed_images_before is not None:
            report['paintPackedAtlasImageRecordsPreserved'] = wrap_linked_image_records(paint) == paint_packed_images_before
        report['preservedAtlasAndProceduralHistories'] = []
        for previous in history_states:
            history, reference = previous['scene'], previous['reference']
            assert source_signature(history) == reference['paintSignature']
            assert wrap_normal_signatures(history) == reference['paintCornerNormalSignature']
            assert paint_attribute_signatures(history) == reference['paintAttributeSignatures']
            assert wrap_linked_image_records(history) == reference['packedImages']
            graph = (wrap_atlas_graph_signatures(history) if reference['graphKind'] == 'atlas'
                     else contact_graph_signatures(history))
            assert graph == previous['graphs']
            report['preservedAtlasAndProceduralHistories'].append({'scene': history.name,
                'geometryMaterialSignatureExact': True, 'cornerNormalsExact': True,
                'maskValuesExact': True, 'extendedGraphsExact': True, 'packedImagesExact': True})
        report['globalPreservation'] = verify_global(snapshot)
        for key in ['sourcePreservation','sourceCornerNormalsPreserved','fitPreservation',
                    'fitCornerNormalsPreserved','paintPreservation','paintCornerNormalsPreserved','paintImageIdentitiesPreserved','paintAttributeValuesPreserved',
                    'paintAtlasGraphPropertiesPreserved','paintPackedAtlasImageRecordsPreserved']:
            if key in report: assert report[key], key

        success = candidate_ready
    finally:
        if not success:
            for ob in reversed(owned_objects):
                bpy.data.objects.remove(ob, do_unlink=True)
            if target is not None:
                bpy.data.scenes.remove(target)
            for mesh in owned_meshes:
                assert mesh.users == 0
                bpy.data.meshes.remove(mesh)
        report['newSceneRetained'] = success
        report['partialOutputMayExistOnFailure'] = report['exportStarted'] and not success
        if not success:
            report['status'] = 'Private V8 export failed validation; copied scene rolled back; any partial private GLB retained for external inspection'
        print_receipt(report)
