"""Copy-only definitions/body, composed externally with Ivory's own audited references."""

def direct_polygon_bridge(source):
    result = []
    for reference in REFERENCE['meshes']:
        ob = source.objects.get(reference['name'])
        mesh = ob.data
        assert len(mesh.polygons) == reference['triangles'], ('Triangle count differs', ob.name)
        assert len(mesh.polygons) <= 10000, ('Bounded polygon limit exceeded', ob.name)
        uv = mesh.uv_layers.active
        assert uv is not None, ('Missing UV layer', ob.name)
        positions = []
        uvs = []
        topology = []
        for ordinal, polygon in enumerate(mesh.polygons):
            loops = list(polygon.loop_indices)
            assert polygon.index == ordinal and len(loops) == 3, ('Non-triangular ordered source', ob.name, ordinal)
            assert loops == [3 * ordinal, 3 * ordinal + 1, 3 * ordinal + 2], ('Unexpected polygon corner order', ob.name, ordinal)
            vertices = [mesh.loops[loop].vertex_index for loop in loops]
            topology.append([polygon.index, loops, vertices])
            for loop, vertex in zip(loops, vertices):
                positions.append(canonical_corner(mesh.vertices[vertex].co))
                uvs.append(canonical_corner(uv.data[loop].uv))
        signatures = {'positions': fnv1a64_signature(positions), 'uvs': fnv1a64_signature(uvs),
                      'polygonLoopVertex': fnv1a64_signature(topology)}
        assert signatures['positions'] == reference['positionFnv'], ('Direct polygon/GLB position order differs', ob.name)
        assert signatures['uvs'] == reference['uvFnv'], ('Direct polygon/GLB UV order differs', ob.name)
        assert signatures['polygonLoopVertex'] == reference['triangulationFnv'], ('Direct polygon order differs from executed triangulation', ob.name)
        result.append({'sourceObject': ob.name, 'sourceGlbFirstGlobalTriangle': reference['firstGlobalTriangle'],
                       'triangleCount': len(mesh.polygons), 'status': 'ORDERED_POSITION_UV_AND_TOPOLOGY_PASS',
                       'signatures': signatures,
                       'mapping': {'globalGlbTriangle': 'firstGlobalTriangle + sourcePolygonIndex',
                                   'sourcePolygonIndex': 'mesh-local GLB triangle ordinal',
                                   'sourceLoopIndex': '3 * sourcePolygonIndex + GLB corner ordinal'},
                       'sourceLiveNormalFnv1a64': REFERENCE['cornerNormals'][ob.name]['cornerNormalsFnv1a64'],
                       'normalEncodingScope': 'Own live source normal FNV is authoritative; GLB/live normal streams are not asserted equal.',
                       'semanticMasksAssigned': False})
    assert len(result) == 51 and sum(row['triangleCount'] for row in result) == 48384
    return result


def require_source(source):
    assert len(source.objects) == 55, 'Ivory source object count differs.'
    assert sum(ob.type == 'MESH' for ob in source.objects) == 51, 'Ivory source mesh count differs.'
    assert len(set(ob.data for ob in source.objects if ob.type == 'MESH')) == 51, 'Ivory source mesh sharing differs.'
    assert source_signature(source) == REFERENCE['sourceSignature'], 'Ivory source differs from its own executed audit.'
    assert normal_signatures(source) == REFERENCE['cornerNormals'], 'Ivory raw corner normals differ from its own executed audit.'
    for ob in source.objects:
        assert ob.type in {'MESH', 'EMPTY'}, ('Unexpected source object type', ob.name)
        assert ob.parent is None or ob.parent in set(source.objects), ('External parent', ob.name)
        assert ob.animation_data is None and len(ob.constraints) == 0 and len(ob.modifiers) == 0, ('Unexpected source animation/constraint/modifier', ob.name)
        assert ob.instance_type == 'NONE', ('Unexpected source instance', ob.name)
        if ob.type == 'EMPTY':
            assert ob.data is None, ('Unexpected empty data', ob.name)
        else:
            assert ob.data.shape_keys is None and ob.data.animation_data is None, ('Unexpected mesh animation/shape keys', ob.name)
            for slot in ob.material_slots:
                assert slot.link == 'DATA' and slot.material is not None, ('Unsupported source material slot', ob.name)
                assert slot.material.animation_data is None, ('Unexpected material animation', slot.material.name)
                if slot.material.node_tree:
                    assert slot.material.node_tree.animation_data is None, ('Unexpected material node animation', slot.material.name)
                    for node in slot.material.node_tree.nodes:
                        assert node.bl_idname != 'ShaderNodeGroup', ('External shader group requires a separate copy plan', slot.material.name)
                        if hasattr(node, 'image'):
                            assert node.image is None, ('Unexpected source image requires a separate copy plan', slot.material.name)


def copy_parity(source, stage, object_map, mesh_map, material_map):
    reverse_objects = {copied: original for original, copied in object_map.items()}
    reverse_meshes = {copied: original for original, copied in mesh_map.items()}
    material_names = {copied: original.name for original, copied in material_map.items()}
    assert set(stage.objects) == set(object_map.values()), 'Copied scene has unexpected object members.'
    assert set(stage.collection.objects) == set(object_map.values()) and len(stage.collection.children) == 0, 'Copied scene root membership differs.'
    assert not set(object_map.values()).intersection(set(source.objects)), 'Copied objects alias original objects.'
    assert not set(mesh_map.values()).intersection(set(mesh_map.keys())), 'Copied meshes alias originals.'
    assert not set(material_map.values()).intersection(set(material_map.keys())), 'Copied materials alias originals.'
    object_rows = []
    mesh_signatures = {}
    material_signatures = {}
    corner_signatures = {}
    lineage = []
    for original in sorted(source.objects, key=name_key):
        copied = object_map[original]
        assert copied.name == REFERENCE['objectPrefix'] + original.name, ('Copied object name differs', original.name)
        assert set(copied.users_collection) == {stage.collection}, ('Copy escaped isolated scene collection', copied.name)
        assert copied.parent == (object_map[original.parent] if original.parent else None), ('Copied parent differs', original.name)
        assert copied.parent_type == original.parent_type and copied.parent_bone == original.parent_bone, ('Parent binding differs', original.name)
        assert matrix_rows(copied.matrix_parent_inverse) == matrix_rows(original.matrix_parent_inverse), ('Parent inverse differs', original.name)
        assert matrix_rows(copied.matrix_basis) == matrix_rows(original.matrix_basis), ('Transform basis differs', original.name)
        assert copied.rotation_mode == original.rotation_mode, ('Rotation mode differs', original.name)
        assert list(copied.location) == list(original.location) and list(copied.scale) == list(original.scale), ('Local position/scale differs', original.name)
        assert list(copied.rotation_euler) == list(original.rotation_euler) and list(copied.rotation_quaternion) == list(original.rotation_quaternion) and list(copied.rotation_axis_angle) == list(original.rotation_axis_angle), ('Stored rotation differs', original.name)
        assert list(copied.delta_location) == list(original.delta_location) and list(copied.delta_scale) == list(original.delta_scale) and list(copied.delta_rotation_euler) == list(original.delta_rotation_euler) and list(copied.delta_rotation_quaternion) == list(original.delta_rotation_quaternion), ('Delta transform differs', original.name)
        object_rows.append({'name': original.name, 'type': copied.type,
                            'parent': reverse_objects[copied.parent].name if copied.parent else None,
                            'matrixLocal': matrix_rows(copied.matrix_local), 'matrixWorld': matrix_rows(copied.matrix_world),
                            'data': reverse_meshes[copied.data].name if copied.data else None,
                            'hideRender': copied.hide_render, 'hideViewport': copied.hide_viewport,
                            'materials': [(slot.link, material_names[slot.material] if slot.material else None) for slot in copied.material_slots]})
        row = {'sourceObject': original.name, 'copiedObject': copied.name,
               'sourceParent': original.parent.name if original.parent else None,
               'copiedParent': copied.parent.name if copied.parent else None}
        if original.type == 'MESH':
            assert copied.data is mesh_map[original.data], ('Copied mesh binding differs', original.name)
            mesh_signatures[original.data.name] = mesh_signature_remapped(copied.data, material_names)
            corner_signatures[original.name] = {'cornerCount': len(copied.data.corner_normals),
                                                'cornerNormalsFnv1a64': fnv1a64_signature([list(n.vector) for n in copied.data.corner_normals]),
                                                'hasCustomNormals': copied.data.has_custom_normals}
            assert len(copied.data.polygons) == len(original.data.polygons), ('Copied polygon count differs', original.name)
            row['sourceMesh'] = original.data.name
            row['copiedMesh'] = copied.data.name
            row['actualTriangles'] = len(copied.data.polygons)
        lineage.append(row)
    for original, copied in material_map.items():
        assert copied.name == REFERENCE['objectPrefix'] + original.name, ('Copied material name differs', original.name)
        if original.node_tree:
            assert copied.node_tree is not original.node_tree, ('Copied material shares embedded node tree', original.name)
        record = material_record(copied)
        record['name'] = original.name
        material_signatures[original.name] = fnv1a64_signature(record)
    signatures = {'algorithm': REFERENCE['sourceSignature']['algorithm'],
                  'objectsFnv1a64': fnv1a64_signature(object_rows), 'meshesFnv1a64': mesh_signatures,
                  'materialsFnv1a64': material_signatures}
    assert signatures == REFERENCE['sourceSignature'], 'Copy differs from own source after normalizing deliberate copied ID names.'
    assert corner_signatures == REFERENCE['cornerNormals'], 'Copied raw corner normals differ; no recalculation or setter is allowed.'
    assert len(object_map) == 55 and len(mesh_map) == 51 and len(material_map) == 51, 'Copy cardinality differs.'
    assert sum(row.get('actualTriangles', 0) for row in lineage) == 48384, 'Copied triangle total differs.'
    return {'copyPassed': True, 'sourceNameNormalizedSignatures': signatures,
            'rawCornerNormalSignatures': corner_signatures, 'objectLineage': lineage,
            'materialLineage': [{'sourceMaterial': original.name, 'copiedMaterial': copied.name} for original, copied in material_map.items()],
            'objects': 55, 'uniqueMeshes': 51, 'materials': 51, 'actualTriangles': 48384,
            'scope': 'Exact measured source geometry/topology/UV/slot/material/transform/hierarchy and raw corner-normal FNV parity after only copied ID names are normalized. Not every undocumented Blender property or raw file bytes.'}


def verify_owned_snapshot(snapshot, owned):
    restore_original_context(snapshot)
    changed_scenes = [scene.name for scene, previous in snapshot['scenes'].items() if scene_record(scene) != previous]
    changed_collections = [collection.name for collection, previous in snapshot['collections'].items() if collection_record(collection) != previous]
    current = datablock_sets()
    mismatched_sets = [name for name, previous in snapshot['sets'].items() if current[name] != previous.union(set(owned[name]))]
    result = {'contextRestored': context_record(snapshot['window']) == snapshot['context'],
              'changedPreexistingScenes': changed_scenes, 'changedPreexistingCollections': changed_collections,
              'mismatchedDatablockSets': mismatched_sets,
              'allPreexistingSceneSettingsAndMembershipsPreserved': not changed_scenes,
              'allPreexistingCollectionMembershipsPreserved': not changed_collections,
              'onlyOwnedDatablocksAddedNoPreexistingRemoved': not mismatched_sets,
              'ownedAddedCounts': {name: len(values) for name, values in owned.items()}}
    assert result['contextRestored'] and not changed_scenes and not changed_collections and not mismatched_sets, 'Original context/global state not preserved within owned additions.'
    return result


def rollback_owned(snapshot, owned):
    restore_original_context(snapshot)
    for ob in reversed(owned['objects']):
        assert ob not in snapshot['sets']['objects'], 'Rollback refuses a preexisting object.'
        bpy.data.objects.remove(ob, do_unlink=True)
    owned['objects'].clear()
    for scene in reversed(owned['scenes']):
        assert scene not in snapshot['sets']['scenes'], 'Rollback refuses a preexisting scene.'
        bpy.data.scenes.remove(scene, do_unlink=True)
    owned['scenes'].clear()
    for mesh in reversed(owned['meshes']):
        assert mesh not in snapshot['sets']['meshes'], 'Rollback refuses a preexisting mesh.'
        bpy.data.meshes.remove(mesh, do_unlink=True)
    owned['meshes'].clear()
    for material in reversed(owned['materials']):
        assert material not in snapshot['sets']['materials'], 'Rollback refuses a preexisting material.'
        bpy.data.materials.remove(material, do_unlink=True)
    owned['materials'].clear()


snapshot = fresh_snapshot()
owned = {name: [] for name in snapshot['sets']}
source = None
before = None
report = {'stage': 'IVORY_UNCHANGED_ISOLATED_SOURCE_COPY_V1', 'status': 'STARTED', 'copyPassed': False,
          'sourceUid': REFERENCE['sourceUid'], 'sourceScene': REFERENCE['sourceScene'],
          'targetScene': REFERENCE['targetScene'], 'sourceGlbSha256': REFERENCE['sourceGlbSha256'],
          'auditReceiptSha256': REFERENCE['auditReceiptSha256'], 'normalSampleReceiptSha256': REFERENCE['normalSampleReceiptSha256'],
          'originalContext': snapshot['context'],
          'freshAllSceneSnapshot': [row for scene, row in snapshot['scenes'].items()],
          'freshAllCollectionSnapshot': [row for collection, row in snapshot['collections'].items()],
          'actualPreexistingDatablockCounts': {name: len(values) for name, values in snapshot['sets'].items()},
          'scope': 'One unchanged Ivory source copy only; no cleanup, masks, fitting, paint, normal setter/recalculation, import, render, export, save or runtime admission.',
          'semanticMasksAssigned': False, 'runtimeReady': False}
try:
    assert bpy.context.mode == 'OBJECT', 'Object mode required.'
    assert not bpy.app.is_job_running('RENDER'), 'Separate render owner must release Blender first.'
    assert bpy.data.scenes.get(REFERENCE['targetScene']) is None, 'Target copy scene already exists; never overwrite it.'
    source = bpy.data.scenes.get(REFERENCE['sourceScene'])
    assert source is not None, 'Exact existing Ivory source scene missing.'
    require_source(source)
    before = source_signature(source)
    report['directSourcePolygonBridge'] = direct_polygon_bridge(source)
    source_materials = set(slot.material for ob in source.objects if ob.type == 'MESH' for slot in ob.material_slots)
    source_meshes = set(ob.data for ob in source.objects if ob.type == 'MESH')
    assert len(source_materials) == 51 and len(source_meshes) == 51
    for ob in source.objects:
        assert bpy.data.objects.get(REFERENCE['objectPrefix'] + ob.name) is None, ('Copied object name already exists', ob.name)
    for mesh in source_meshes:
        assert bpy.data.meshes.get(REFERENCE['objectPrefix'] + mesh.name) is None, ('Copied mesh name already exists', mesh.name)
    for material in source_materials:
        assert bpy.data.materials.get(REFERENCE['objectPrefix'] + material.name) is None, ('Copied material name already exists', material.name)
    stage = bpy.data.scenes.new(REFERENCE['targetScene'])
    owned['scenes'].append(stage)
    assert stage.name == REFERENCE['targetScene'], 'Target scene name differs.'
    object_map = {}
    mesh_map = {}
    material_map = {}
    for original in sorted(source_materials, key=name_key):
        copied = original.copy()
        owned['materials'].append(copied)
        copied.name = REFERENCE['objectPrefix'] + original.name
        material_map[original] = copied
    for original in sorted(source_meshes, key=name_key):
        copied = original.copy()
        owned['meshes'].append(copied)
        copied.name = REFERENCE['objectPrefix'] + original.name
        assert copied.name == REFERENCE['objectPrefix'] + original.name, ('Copied mesh name differs', original.name)
        for index, material in enumerate(original.materials):
            copied.materials[index] = material_map[material]
        mesh_map[original] = copied
    for original in sorted(source.objects, key=name_key):
        copied = original.copy()
        owned['objects'].append(copied)
        copied.name = REFERENCE['objectPrefix'] + original.name
        if original.type == 'MESH':
            copied.data = mesh_map[original.data]
        stage.collection.objects.link(copied)
        object_map[original] = copied
    for original, copied in object_map.items():
        copied.parent = object_map[original.parent] if original.parent else None
    stage.view_layers[0].update()
    report['copyAudit'] = copy_parity(source, stage, object_map, mesh_map, material_map)
    require_source(source)
    assert source_signature(source) == before, 'Original Ivory source changed during copy.'
    report['sourcePreserved'] = True
    report['sourceCornerNormalsPreserved'] = normal_signatures(source) == REFERENCE['cornerNormals']
    report['globalPreservation'] = verify_owned_snapshot(snapshot, owned)
    report['copyPassed'] = True
    report['status'] = 'COPIED_AND_AUDITED'
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
            report['sourceCornerNormalsPreserved'] = normal_signatures(source) == REFERENCE['cornerNormals']
        report['globalPreservation'] = verify_owned_snapshot(snapshot, owned)
        if not report.get('sourcePreserved', False) or not report.get('sourceCornerNormalsPreserved', False):
            report['copyPassed'] = False
            report['status'] = 'FAILED'
    except Exception as final_error:
        report['copyPassed'] = False
        report['status'] = 'FAILED'
        report['finalPreservationError'] = str(final_error)
    print('IVORY_SOURCE_COPY_RECEIPT_BEGIN')
    print(json.dumps(report, sort_keys=True, separators=(',', ':'), allow_nan=False))
    print('IVORY_SOURCE_COPY_RECEIPT_END')
assert report['copyPassed'], 'Ivory copy-only audit failed; no cleanup or masks may proceed.'
