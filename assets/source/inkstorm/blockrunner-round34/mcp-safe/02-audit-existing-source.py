"""STAGED, NOT EXECUTED. Prefix 00-source-reference.py + 01-source-guard.py.

Reads the exact existing source scene, evaluates it at its existing frame,
prints one JSON receipt, restores context. No scene/data creation or file I/O.
"""


def components(mesh, matrix):
    # Topology only; no weld/repair. Seam-split components remain separate.
    parent = list(range(len(mesh.vertices)))
    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    def join(a, b):
        a, b = find(a), find(b)
        if a != b:
            parent[b] = a
    for edge in mesh.edges:
        join(edge.vertices[0], edge.vertices[1])
    groups = collections.defaultdict(list)
    for vertex in mesh.vertices:
        groups[find(vertex.index)].append(vertex.index)
    polygon_groups = collections.defaultdict(list)
    for polygon in mesh.polygons:
        if polygon.vertices:
            polygon_groups[find(polygon.vertices[0])].append(polygon)
    result = []
    for key, vertices in sorted(groups.items(), key=first_component_vertex_key):
        polygons = polygon_groups[key]
        result.append({'componentFirstVertex': min(vertices), 'vertices': len(vertices),
                       'polygons': len(polygons),
                       'triangleCount': sum(len(p.vertices) - 2 for p in polygons),
                       'materialSlots': sorted({p.material_index for p in polygons}),
                       'bounds': bounds(matrix @ mesh.vertices[i].co for i in vertices)})
    return result


snapshot = global_snapshot()
source = None
before = None
report = {'stage': 'audit', 'status': 'executing', 'sourceUid': REFERENCE['uid'],
          'sourceReference': REFERENCE['provenance'], 'runtimeReady': False,
          'signatureAlgorithm': 'FNV-1a-64 over canonical ASCII JSON; non-cryptographic',
          'scope': 'Named-source guard, evaluated scene occurrences and topology; no authoring or anchor acceptance.'}
try:
    source = source_guard()
    activate_source(snapshot, source)
    before = source_signature(source)
    reference_rows = measure_reference_match(source)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    object_rows = []
    unique_meshes = {}
    for ob in sorted(source.objects, key=name_key):
        row = {'name': ob.name, 'parent': ob.parent.name if ob.parent else None,
               'type': ob.type, 'dataName': ob.data.name if ob.data else None,
               'matrixLocal': matrix_rows(ob.matrix_local),
               'matrixWorld': matrix_rows(ob.matrix_world),
               'usersCollections': sorted(c.name for c in ob.users_collection),
               'semanticRole': 'unassigned'}
        if ob.type == 'MESH':
            evaluated = ob.evaluated_get(depsgraph)
            mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
            try:
                mesh.calc_loop_triangles()
                edge_uses = collections.Counter()
                for polygon in mesh.polygons:
                    for edge in polygon.edge_keys:
                        edge_uses[tuple(sorted(edge))] += 1
                row.update({'vertices': len(mesh.vertices), 'edges': len(mesh.edges),
                            'polygons': len(mesh.polygons), 'triangles': len(mesh.loop_triangles),
                            'materialSlots': [{'slot': i, 'link': slot.link,
                                               'name': slot.material.name if slot.material else None}
                                              for i, slot in enumerate(ob.material_slots)],
                            'polygonMaterials': dict(collections.Counter(p.material_index for p in mesh.polygons)),
                            'bounds': bounds(evaluated.matrix_world @ v.co for v in mesh.vertices),
                            'boundaryEdges': sum(n == 1 for n in edge_uses.values()),
                            'nonManifoldEdgesOverTwoFaces': sum(n > 2 for n in edge_uses.values()),
                            'uvLayers': [layer.name for layer in mesh.uv_layers],
                            'colorAttributes': [(a.name, a.domain, a.data_type) for a in mesh.color_attributes],
                            'components': components(mesh, evaluated.matrix_world)})
                unique_meshes[ob.data.name] = len(mesh.loop_triangles)
            finally:
                evaluated.to_mesh_clear()
        object_rows.append(row)
    occurrences = []
    for instance in depsgraph.object_instances:
        ob = instance.object
        if ob.type != 'MESH':
            continue
        original = ob.original
        assert original.name in source.objects, ('Dependency escaped source scene', original.name)
        evaluated = ob.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
        try:
            evaluated.calc_loop_triangles()
            occurrences.append({'sourceObject': original.name, 'isInstance': instance.is_instance,
                                'persistentId': list(instance.persistent_id),
                                'triangles': len(evaluated.loop_triangles),
                                'matrixWorld': matrix_rows(instance.matrix_world),
                                'bounds': bounds(instance.matrix_world @ v.co for v in evaluated.vertices)})
        finally:
            ob.to_mesh_clear()
    all_bounds = [Vector(point) for row in occurrences for point in row['bounds']]
    materials = {slot.material.name: material_record(slot.material)
                 for ob in source.objects if ob.type == 'MESH'
                 for slot in ob.material_slots if slot.material}
    report.update({'status': 'measured', 'sourceScene': source.name, 'sourceFrame': source.frame_current,
                   'objects': object_rows, 'sourceSignature': before,
                   'referenceGeometryChecks': reference_rows,
                   'referenceGuardScope': 'Pinned source GLB SHA plus exact names/parents/types and per-object bounds/counts/material slots. Not full Blender-versus-GLB byte equivalence.',
                   'materialPalette': materials, 'occurrences': occurrences,
                   'metrics': {'sceneObjects': len(object_rows), 'meshObjects': len(reference_rows),
                               'uniqueMeshDatablocks': len(unique_meshes),
                               'uniqueMeshTriangles': sum(unique_meshes.values()),
                               'evaluatedMeshOccurrences': len(occurrences),
                               'actualSceneOccurrenceTriangles': sum(r['triangles'] for r in occurrences),
                               'bounds': bounds(all_bounds)},
                   'roleCandidates': REFERENCE['roleCandidates'],
                   'anchorGaps': ['Driver pelvis/eyes/hands/controls and seat surface are unmeasured.',
                                  'Rear exhaust centres, radii and axes are unmeasured.',
                                  'Uniform gameplay scale/root translation and collision-envelope fit are unaccepted.',
                                  'Role candidates are evidence-led inspection targets, not assigned anatomy or anchors.']})
finally:
    if before is not None:
        report['sourcePreservation'] = source_signature(source) == before
        report['sourcePreservationScope'] = 'Matching FNV-1a-64 structural signatures; not byte equality or a cryptographic proof.'
    report['globalPreservation'] = verify_global(snapshot)
    print_receipt(report)
    if before is not None:
        assert report['sourcePreservation'], 'Source data changed during audit.'
