def require_palette():
    scene=bpy.data.scenes[INPUT['paletteScene']]
    assert source_signature(scene)==INPUT['paletteSignature'], 'Palette source drift'
    assert normal_signatures(scene)==INPUT['paletteNormals'], 'Palette original raw normals drift'
    for row in INPUT['objects']:
        mesh=scene.objects[row['paletteObject']].data
        assert geometry_record(mesh)==row['geometrySignature']
        assert fnv1a64_signature([d.value for d in mesh.attributes['ivorySourcePolygon'].data])==row['sourcePolygonSignature']
        assert fnv1a64_signature([d.value for d in mesh.attributes['ivoryPaintRole'].data])==row['roleSignature']
    return scene

snapshot=fresh_snapshot()
result={'stage':'IVORY_ORIGINAL_SURFACE_FINISH_V1','status':'FAILED','artAccepted':False,'runtimeReady':False}
passed=False
try:
    assert bpy.context.mode=='OBJECT' and not bpy.app.is_job_running('RENDER')
    assert len(snapshot['sets']['scenes'])==164, 'Reconcile current histories before authoring'
    assert bpy.data.scenes.get(INPUT['targetScene']) is None
    require_histories();palette=require_palette()
    original_materials={m:fnv1a64_signature(material_record(m)) for m in bpy.data.materials}
    assert len(palette.objects)==57 and len(palette.collection.objects)==57 and not palette.collection.children
    target=bpy.data.scenes.new(INPUT['targetScene'])
    target['sourceUid']=INPUT['sourceUid'];target['sourceGlbSha256']=INPUT['sourceGlbSha256']
    target['paletteReceiptSha256']=INPUT['paletteReceiptSha256'];target['targetImageSha256']=INPUT['targetImageSha256']
    target['stage']='Own source surface finish trial, unchanged geometry/UV/normals, no bake/export'
    target['artAccepted']=False
    copied={};materials={};material_details={}
    for original in sorted(palette.objects,key=name_key):
        clone=original.copy();clone.name=INPUT['prefix']+original.name[len(INPUT['palettePrefix']):]
        if original.type=='MESH':
            assert not original.modifiers and not original.constraints and original.data.shape_keys is None
            clone.data=original.data.copy();clone.data.name=clone.name
            for attr in ('ivoryFinishEdgeDistance','ivoryFinishRegion'):assert clone.data.attributes.get(attr) is None
            indices=[p.material_index for p in clone.data.polygons]
            for i,slot in enumerate(original.material_slots):
                assert slot.link=='DATA' and slot.material is not None
                if slot.material not in materials:
                    mat=slot.material.copy();role=slot.material['ivoryRole'];mat.name=INPUT['prefix']+role
                    materials[slot.material]=mat;material_details[role]=author_finish_graph(mat,role)
                clone.data.materials[i]=materials[slot.material]
            assert indices==[p.material_index for p in clone.data.polygons], 'Material role slots changed'
        target.collection.objects.link(clone);copied[original]=clone
    for original,clone in copied.items():clone.parent=copied[original.parent] if original.parent else None
    target.view_layers[0].update()
    source_rows={r['paletteObject']:r for r in INPUT['objects']};lineage=[];totals={'engineShell':0,'rearSlope':0,'originalShoulderSuit':0}
    for original,clone in copied.items():
        for a,b in [(clone.matrix_parent_inverse,original.matrix_parent_inverse),(clone.matrix_basis,original.matrix_basis),(clone.matrix_local,original.matrix_local),(clone.matrix_world,original.matrix_world)]:assert matrix_rows(a)==matrix_rows(b)
        if original.type!='MESH':
            lineage.append({'paletteObject':original.name,'copiedObject':clone.name,'type':clone.type});continue
        row=source_rows[original.name]
        assert geometry_record(clone.data)==row['geometrySignature']
        details=own_edge_and_region_attributes(original,clone,row)
        assert geometry_record(clone.data)==row['geometrySignature'], 'Original surface/UV/normal/attribute mutation'
        source_sig=fnv1a64_signature([d.value for d in clone.data.attributes['ivorySourcePolygon'].data])
        role_sig=fnv1a64_signature([d.value for d in clone.data.attributes['ivoryPaintRole'].data])
        assert source_sig==row['sourcePolygonSignature'] and role_sig==row['roleSignature']
        for k,v in details['eligibleFaces'].items():totals[k]+=v
        lineage.append({'sourceObject':row['sourceObject'],'fitObject':row['fitObject'],'paletteObject':original.name,
            'copiedObject':clone.name,'copiedMesh':clone.data.name,'polygons':len(clone.data.polygons),
            'sourcePolygonAttribute':'ivorySourcePolygon','sourcePolygonSignature':source_sig,
            'roleAttribute':'ivoryPaintRole','roleSignature':role_sig,'roleSlots':row['roleSlots'],'roleHistogram':row['roleHistogram'],
            'geometrySignature':row['geometrySignature'],'palettePolygonOrder':'identity','finishMasks':details})
    assert len(materials)==9 and len(target.objects)==57
    assert sum(len(o.data.polygons) for o in target.objects if o.type=='MESH')==44028
    assert totals==INPUT['expectedEligibleFaces'], 'Own geometry semantic mask totals differ'
    require_histories();require_palette()
    for mat,old in original_materials.items():assert fnv1a64_signature(material_record(mat))==old
    preservation=preserved_global(snapshot)
    expected={'scenes':1,'objects':57,'meshes':53,'materials':9}
    for k,v in preservation['addedIds'].items():assert len(v)==expected.get(k,0),(k,len(v))
    result.update({'status':'PASS','blenderVersion':list(bpy.app.version),'targetScene':target.name,
        'sourceUid':INPUT['sourceUid'],'sourceGlbSha256':INPUT['sourceGlbSha256'],'paletteReceiptSha256':INPUT['paletteReceiptSha256'],
        'targetImageSha256':INPUT['targetImageSha256'],'actualCounts':{'objects':57,'meshes':53,'triangles':44028,'materials':9},
        'objectLineage':lineage,'roleNames':INPUT['roleNames'],'roleHistogram':INPUT['roleHistogram'],
        'ownMarkingEligibleFaces':totals,'materialDetails':material_details,'finishGraphSignatures':{m.name:finish_graph_record(m) for m in materials.values()},
        'paintSignature':source_signature(target),'paintRawCornerNormalSignatures':normal_signatures(target),
        'allFivePreexistingIvoryHistoriesExact':True,'allPreexistingMaterialsExact':True,'copiedGeometryUvAttributesAndRawCornerNormalsExact':True,
        'globalPreservation':preservation,'originalContext':snapshot['context'],
        'scope':'Nine copied material graphs plus two new CORNER FLOAT_COLOR distance/semantic attributes. All ordered source faces, UVs, normals, hierarchy, transforms and existing source/role masks exact; no geometry/UV/normal edits, bake/export/public copy or shared save.'})
    passed=True
finally:
    restore_original_context(snapshot)
    if not passed:rollback_new_ids(snapshot)
    result['finallyPreservation']=preserved_global(snapshot)
    require_histories();require_palette()
print(json.dumps(result,sort_keys=True,allow_nan=False))
