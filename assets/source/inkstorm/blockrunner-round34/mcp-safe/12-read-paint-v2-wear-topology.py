"""PREPARED READ-ONLY: exact V2 point/triangle indices for external wear masks.
Prefix safe00+01. No image read, geometry edit, new scene, render or save.
Root saves the returned receipt externally as paint-v2-wear-topology-receipt.json.
"""
snapshot = global_snapshot()
paint = None
before = None
normal_before = None
report = {'stage': 'read-only-paint-v2-wear-topology', 'status': 'executing',
          'sourceUid': REFERENCE['uid'], 'meshes': [],
          'scope': 'Actual V2 indices and positions for external geometry-mask analysis. No attribute authoring or paint edits.'}
try:
    assert bpy.context.mode == 'OBJECT'
    assert not bpy.app.is_job_running('RENDER')
    paint = bpy.data.scenes.get('PodRacing — Blockrunner Inkstorm atlas paint round34 V2')
    assert paint is not None
    activate_source(snapshot, paint)
    before = source_signature(paint)
    assert fnv1a64_signature(before) == '9e45fb9bc1a499ab', 'Exact post-four-bake V2 expected.'
    normal_before = {ob.name: fnv1a64_signature([list(n.vector) for n in ob.data.corner_normals])
                     for ob in paint.objects if ob.type == 'MESH'}
    assert len(paint.objects) == 2
    for ob in sorted(paint.objects, key=name_key):
        assert ob.type == 'MESH' and ob.parent is None and not ob.modifiers
        assert all(len(poly.vertices) == 3 for poly in ob.data.polygons)
        vertices = [list(vertex.co) for vertex in ob.data.vertices]
        polygons = [list(poly.vertices) + [poly.material_index, int(poly.use_smooth)]
                    for poly in ob.data.polygons]
        report['meshes'].append({'name': ob.name, 'mesh': ob.data.name,
            'matrixWorld': matrix_rows(ob.matrix_world),
            'vertices': vertices, 'polygons': polygons,
            'polygonLayout': '[vertex0, vertex1, vertex2, materialIndex, smoothFlag]',
            'vertexFnv1a64': fnv1a64_signature(vertices),
            'polygonFnv1a64': fnv1a64_signature(polygons),
            'meshSignature': mesh_signature(ob.data),
            'cornerNormalsFnv1a64': normal_before[ob.name],
            'materials': [slot.material.name for slot in ob.material_slots]})
    report['paintSignature'] = before
    report['paintCornerNormalSignature'] = normal_before
    report['targetScene'] = paint.name
    report['status'] = 'actual V2 point and polygon topology recorded without changes'
finally:
    if before is not None:
        report['paintPreserved'] = source_signature(paint) == before
        report['paintCornerNormalsPreserved'] = {
            ob.name: fnv1a64_signature([list(n.vector) for n in ob.data.corner_normals])
            for ob in paint.objects if ob.type == 'MESH'} == normal_before
    report['globalPreservation'] = verify_global(snapshot)
    print_receipt(report)
    if before is not None:
        assert report['paintPreserved'] and report['paintCornerNormalsPreserved']
