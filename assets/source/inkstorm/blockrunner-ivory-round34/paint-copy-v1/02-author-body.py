def attribute_values(attribute):
    rows=[]
    for item in attribute.data:
        if hasattr(item, 'vector'):
            rows.append(list(item.vector))
        elif hasattr(item, 'color'):
            rows.append(list(item.color))
        elif hasattr(item, 'value'):
            value=item.value
            if isinstance(value, (int,float,bool,str)):
                rows.append(value)
            else:
                rows.append(list(value))
        else:
            raise AssertionError('Unsupported existing attribute value type: '+attribute.name)
    return rows

def geometry_record(mesh):
    return fnv1a64_signature({
        'vertices':[list(v.co) for v in mesh.vertices],
        'edges':[list(e.vertices) for e in mesh.edges],
        'polygons':[(list(p.vertices),p.use_smooth) for p in mesh.polygons],
        'loops':[(l.vertex_index,l.edge_index) for l in mesh.loops],
        'uv':[(a.name,[list(d.uv) for d in a.data]) for a in mesh.uv_layers],
        'attributes':[(a.name,a.data_type,a.domain,attribute_values(a)) for a in mesh.attributes
                      if a.name not in ('material_index','ivorySourcePolygon','ivoryPaintRole')],
        'shapeKeys':mesh.shape_keys.name if mesh.shape_keys else None,
        'normals':[list(n.vector) for n in mesh.corner_normals],
        'hasCustomNormals':mesh.has_custom_normals})

def require_histories():
    for name, expected in INPUT['reference'].items():
        scene=bpy.data.scenes.get(name)
        assert scene is not None, 'Missing preserved source history: '+name
        assert source_signature(scene)==expected['structure'], 'Source structure/material drift: '+name
        assert normal_signatures(scene)==expected['rawNormals'], 'Source raw corner-normal drift: '+name

def srgb_channel(v):
    return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4

def new_role_material(name, role):
    material=bpy.data.materials.new(INPUT['prefix']+name)
    material.use_nodes=True
    rgb=[srgb_channel(int(role['hex'][i:i+2],16)/255) for i in (0,2,4)]
    material.diffuse_color=rgb+[1]
    material.roughness=role['roughness']
    material.metallic=role['metallic']
    material.use_backface_culling=False
    node=material.node_tree.nodes.get('Principled BSDF')
    assert node is not None
    node.inputs['Base Color'].default_value=rgb+[1]
    node.inputs['Roughness'].default_value=role['roughness']
    node.inputs['Metallic'].default_value=role['metallic']
    material['ivoryRole']=name
    material['sourcePaletteHex']=role['hex']
    material['stage']='source-only palette trial; no atlas'
    return material

def preserved_global(snapshot):
    restore_original_context(snapshot)
    sets=datablock_sets()
    removed={k:sorted(v.name for v in previous-sets[k]) for k,previous in snapshot['sets'].items()}
    additions={k:sorted(v.name for v in sets[k]-previous) for k,previous in snapshot['sets'].items()}
    scenes=[s.name for s,old in snapshot['scenes'].items() if scene_record(s)!=old]
    collections_changed=[c.name for c,old in snapshot['collections'].items() if collection_record(c)!=old]
    assert not scenes and not collections_changed and not any(removed.values()), 'Global history/context mutation'
    return {'contextRestored':True,'allPreexistingSceneSettingsMembershipsPreserved':True,
            'allPreexistingCollectionSettingsMembershipsPreserved':True,
            'preexistingSceneCount':len(snapshot['sets']['scenes']),'removedIds':removed,'addedIds':additions}

def rollback_new_ids(snapshot):
    # Explicit collection APIs, no dynamic bpy namespace access or source deletion.
    for ob in list(set(bpy.data.objects)-snapshot['sets']['objects']): bpy.data.objects.remove(ob,do_unlink=True)
    for scene in list(set(bpy.data.scenes)-snapshot['sets']['scenes']): bpy.data.scenes.remove(scene)
    for mesh in list(set(bpy.data.meshes)-snapshot['sets']['meshes']): bpy.data.meshes.remove(mesh)
    for material in list(set(bpy.data.materials)-snapshot['sets']['materials']): bpy.data.materials.remove(material)

snapshot=fresh_snapshot()
result={'stage':INPUT['stage'],'status':'FAILED','artAccepted':False,'runtimeReady':False}
passed=False
try:
    assert bpy.context.mode=='OBJECT', 'Require unchanged existing object mode'
    assert bpy.data.scenes.get(INPUT['targetScene']) is None, 'Immutable target already exists'
    require_histories()
    fit=bpy.data.scenes[INPUT['fitScene']]
    assert len(fit.objects)==57 and len(fit.collection.objects)==57 and len(fit.collection.children)==0
    role_inputs={row['fitObject']:row for row in INPUT['objects']}
    assert len(role_inputs)==53
    before_geometry={ob.name:geometry_record(ob.data) for ob in fit.objects if ob.type=='MESH'}
    assert set(before_geometry)==set(role_inputs)
    for ob in fit.objects:
        if ob.type=='MESH':
            assert len(ob.data.polygons)==role_inputs[ob.name]['polygons']
            assert len(ob.material_slots)==1 and ob.material_slots[0].link=='DATA'
            assert not ob.modifiers and not ob.constraints and ob.data.shape_keys is None
            assert ob.data.attributes.get('ivorySourcePolygon') is None and ob.data.attributes.get('ivoryPaintRole') is None
    target=bpy.data.scenes.new(INPUT['targetScene'])
    target['sourceUid']=INPUT['sourceUid']
    target['sourceGlbSha256']=INPUT['sourceGlbSha256']
    target['fitReceiptSha256']=INPUT['fitReceiptSha256']
    target['artAccepted']=False
    target['stage']='Ivory own source polygon palette; geometry unchanged; no atlas/export'
    copied={}
    for ob in sorted(fit.objects,key=name_key):
        clone=ob.copy()
        tail=ob.name[len('Blockrunner Ivory fitted V1 '):]
        clone.name=INPUT['prefix']+tail
        if ob.type=='MESH':
            clone.data=ob.data.copy()
            clone.data.name=clone.name
        target.collection.objects.link(clone)
        copied[ob]=clone
    for ob,clone in copied.items():
        clone.parent=copied[ob.parent] if ob.parent else None
    target.view_layers[0].update()
    for ob,clone in copied.items():
        assert matrix_rows(clone.matrix_parent_inverse)==matrix_rows(ob.matrix_parent_inverse)
        assert matrix_rows(clone.matrix_basis)==matrix_rows(ob.matrix_basis)
        assert matrix_rows(clone.matrix_local)==matrix_rows(ob.matrix_local)
        assert matrix_rows(clone.matrix_world)==matrix_rows(ob.matrix_world)
        if ob.type=='MESH':assert geometry_record(clone.data)==before_geometry[ob.name]
    role_names=list(INPUT['roles'])
    materials={name:new_role_material(name,INPUT['roles'][name]) for name in role_names}
    lineage=[]
    histogram={name:0 for name in role_names}
    for original,clone in copied.items():
        if original.type!='MESH':
            lineage.append({'fitObject':original.name,'copiedObject':clone.name,'type':clone.type})
            continue
        row=role_inputs[original.name]
        mesh=clone.data
        assigned=[row['defaultRole']]*len(mesh.polygons)
        for name,indices in row['overrides'].items():
            for polygon_index in indices:
                assert assigned[polygon_index]==row['defaultRole'], 'Overlapping role masks'
                assigned[polygon_index]=name
        used=[row['defaultRole']]+[name for name in role_names if name!=row['defaultRole'] and name in assigned]
        mesh.materials[0]=materials[used[0]]
        for name in used[1:]:mesh.materials.append(materials[name])
        for polygon,name in zip(mesh.polygons,assigned):polygon.material_index=used.index(name)
        source_attr=mesh.attributes.new(name='ivorySourcePolygon',type='INT',domain='FACE')
        role_attr=mesh.attributes.new(name='ivoryPaintRole',type='INT',domain='FACE')
        source_indices=row['sourcePolygonIndices']
        for index,name in enumerate(assigned):
            source_attr.data[index].value=(source_indices[index] if source_indices is not None else index) if row['sourceObject'] is not None else -1
            role_attr.data[index].value=role_names.index(name)
            histogram[name]+=1
        assert geometry_record(mesh)==before_geometry[original.name], 'Copied geometry/UV/attributes/raw corner normals changed'
        actual_hist={name:assigned.count(name) for name in used}
        assert actual_hist==row['histogram'], 'Incorrect face role count'
        assert all(mesh.materials[p.material_index]==materials[assigned[p.index]] for p in mesh.polygons)
        lineage.append({'sourceObject':row['sourceObject'],'fitObject':original.name,'copiedObject':clone.name,
            'copiedMesh':mesh.name,'polygons':len(mesh.polygons),'fitPolygonOrder':'identity',
            'sourcePolygonAttribute':'ivorySourcePolygon','sourcePolygonSignature':fnv1a64_signature([d.value for d in source_attr.data]),
            'roleAttribute':'ivoryPaintRole','roleSignature':fnv1a64_signature([d.value for d in role_attr.data]),
            'roleSlots':used,'roleHistogram':actual_hist,'geometrySignature':before_geometry[original.name],
            'basis':row['basis']})
    assert sum(histogram.values())==44028
    assert len(target.objects)==57 and len([o for o in target.objects if o.type=='MESH'])==53
    require_histories()
    preservation=preserved_global(snapshot)
    expected_additions={'scenes':1,'objects':57,'meshes':53,'materials':len(materials)}
    for key,values in preservation['addedIds'].items():assert len(values)==expected_additions.get(key,0),(key,len(values))
    result.update({'status':'PASS','blenderVersion':list(bpy.app.version),'sourceUid':INPUT['sourceUid'],
        'sourceGlbSha256':INPUT['sourceGlbSha256'],'fitReceiptSha256':INPUT['fitReceiptSha256'],
        'targetScene':target.name,'actualCounts':{'objects':57,'meshes':53,'triangles':44028,'materials':len(materials)},
        'globalPreservation':preservation,'originalContext':snapshot['context'],
        'allFourOriginalSourceHistoriesExact':True,'copiedGeometryUvAttributesAndRawCornerNormalsExact':True,
        'objectLineage':lineage,'roleNames':role_names,'roleDefinitions':INPUT['roles'],'roleHistogram':histogram,
        'paintSignature':source_signature(target),'paintRawCornerNormalSignatures':normal_signatures(target),
        'scope':'Material assignment and two explicit FACE lineage/role attributes on a deep mesh/object copy only. Original source/fitted scenes and materials unchanged. No normalization, consolidation, UV edit, atlas, export, render or shared blend save.'})
    passed=True
finally:
    restore_original_context(snapshot)
    if not passed:rollback_new_ids(snapshot)
    final_preservation=preserved_global(snapshot)
    require_histories()
    result['finallyPreservation']=final_preservation
print(json.dumps(result,sort_keys=True,allow_nan=False))
