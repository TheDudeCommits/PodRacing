def source_evidence(mesh, polygons):
    colors = mesh.color_attributes.active_color
    assert colors is not None and colors.domain in {'CORNER','POINT'}
    result = []
    for index in polygons:
        polygon = mesh.polygons[index]
        loops = list(polygon.loop_indices)
        result.append((tuple(tuple(mesh.vertices[mesh.loops[i].vertex_index].co) for i in loops),
                       tuple(tuple(mesh.corner_normals[i].vector) for i in loops),
                       tuple(tuple(colors.data[i if colors.domain=='CORNER' else mesh.loops[i].vertex_index].color) for i in loops),
                       polygon.use_smooth))
    return result


def validate_source_terminal(mesh, center, axis, radius, expected_triangles):
    """Attribute the actual retained terminal disk before covering a free end."""
    ids = []
    for polygon in mesh.polygons:
        points = [tuple(mesh.vertices[i].co) for i in polygon.vertices]
        if all(abs(dot(sub(p,center),axis))<2e-4 and dot(sub(p,center),sub(p,center))<=(radius+.0002)**2 for p in points):
            ids.append(polygon.index)
    assert len(ids)==expected_triangles, ('Terminal attribution drift',center,len(ids),expected_triangles)
    return {'centerBlender':center,'outwardBlender':axis,'radius':radius,'retainedDiskTriangles':len(ids)}


def execute_source_authoring():
    assert STAGE not in bpy.data.scenes, 'Version already exists; choose a new version.'
    assert bpy.context.mode=='OBJECT', 'Leave shared editing mode untouched.'
    window = bpy.context.window
    old_scene,old_layer = window.scene,window.view_layer
    old_active,old_selected = old_layer.objects.active,list(bpy.context.selected_objects)
    old_layer_collection = old_layer.active_layer_collection
    scene_members = {s:(set(s.objects),set(s.collection.children)) for s in bpy.data.scenes}
    collection_members = {c:(set(c.objects),set(c.children)) for c in bpy.data.collections}
    old_objects,old_meshes = set(bpy.data.objects),set(bpy.data.meshes)
    old_materials,old_images = set(bpy.data.materials),set(bpy.data.images)
    stage = None; success = False
    owned_meshes = set(); owned_materials = set(); owned_images = set(); owned_collections = set()
    report = {'status':'executing source authoring','source':SOURCE,'expectedSourceSha256':SOURCE_SHA256,
              'sourceHashVerification':'External receipt required; no filesystem/hash API in MCP.',
              'newScene':STAGE,'family':FAMILY,'runtimeInstalled':False,'exported':False,'renderedAcceptance':False}
    try:
        stage = bpy.data.scenes.new(STAGE)
        window.scene = stage; window.view_layer = stage.view_layers[0]
        window.view_layer.active_layer_collection = window.view_layer.layer_collection
        try:
            result = bpy.ops.import_scene.gltf(filepath=SOURCE)
        finally:
            owned_meshes.update(set(bpy.data.meshes)-old_meshes)
            owned_materials.update(set(bpy.data.materials)-old_materials)
            owned_images.update(set(bpy.data.images)-old_images)
            owned_collections.update(set(bpy.data.collections)-set(collection_members))
        assert 'FINISHED' in result
        objects = [o for o in stage.objects if o.type=='MESH']
        assert len(objects)==1, 'Expected one original pipe-bank mesh.'
        source = objects[0]
        assert source not in old_objects and source.data not in old_meshes
        assert len(source.data.materials)==1 and source.data.materials[0] not in old_materials
        material = source.data.materials[0]
        assert material.use_nodes and not any(n.type=='TEX_IMAGE' for n in material.node_tree.nodes)
        source.data.transform(source.matrix_world)
        source.parent = None; source.matrix_world = Matrix.Identity(4)
        mesh = source.data; mesh.update(); mesh.calc_loop_triangles()
        assert len(mesh.loop_triangles)==RETAINED_TRIANGLES and all(len(p.vertices)==3 for p in mesh.polygons)
        bounds = [[min(v.co[k] for v in mesh.vertices),max(v.co[k] for v in mesh.vertices)] for k in range(3)]
        assert all(abs(bounds[k][j]-BOUNDS[k][j])<2e-4 for k in range(3) for j in range(2)), bounds
        free_receipts = []
        for (center,axis,radius),count in zip(TERMINALS,[14,10,12]):
            free_receipts.append(validate_source_terminal(mesh,center,axis,radius,count))
        socket_receipts = []
        for (center,axis,radius),count in zip(SOCKETS,[14,10,12]):
            socket_receipts.append(validate_source_terminal(mesh,center,axis,radius,count))
        retained = list(range(len(mesh.polygons)))
        before = source_evidence(mesh,retained)
        data = build_pipe_detail_geometry(); summary = geometry_summary(data)
        clearance = detail_clearance_receipt(data)
        assert summary['candidateTriangles']<=TRIANGLE_CAP, summary
        assert all(BOUNDS[k][0]<=p[k]<=BOUNDS[k][1] for p in data['vertices'] for k in range(3))
        assert min(p[2] for p in data['vertices'])>=1.2, 'Existing platform floor must remain unobstructed.'
        vertices = [tuple(v.co) for v in mesh.vertices]
        faces = [tuple(p.vertices) for p in mesh.polygons]
        source_vertex_count = len(vertices)
        vertices.extend(data['vertices'])
        faces.extend(tuple(source_vertex_count+i for i in f) for f in data['faces'])
        replacement = bpy.data.meshes.new(FAMILY+'-source'); owned_meshes.add(replacement)
        replacement.from_pydata(vertices,[],faces); replacement.update()
        replacement.materials.append(material)
        colors = replacement.color_attributes.new(name=mesh.color_attributes.active_color.name,type='FLOAT_COLOR',domain='CORNER')
        normals = []
        for polygon,evidence in zip(replacement.polygons,before):
            _,source_normals,source_colors,smooth = evidence
            polygon.use_smooth = smooth
            for loop,normal,color in zip(polygon.loop_indices,source_normals,source_colors):
                normals.append(normal); colors.data[loop].color = color
        for i,polygon in enumerate(list(replacement.polygons)[len(retained):]):
            polygon.use_smooth = data['smooth'][i]
            for loop in polygon.loop_indices:
                colors.data[loop].color = data['colors'][i]; normals.append((0,0,0))
        replacement.color_attributes.active_color = colors; replacement.update()
        # FLOAT_VECTOR/CORNER bypasses the Blender5.2 packed short2 setter drift.
        # New corners need actual computed vectors; zero is not an auto sentinel.
        retained_loops = sum(len(p.vertices) for p in mesh.polygons)
        calculated = [tuple(n.vector) for n in replacement.corner_normals]
        assert len(calculated)==len(normals)
        for i in range(retained_loops,len(normals)): normals[i]=calculated[i]
        assert all(sum(c*c for c in n)>.99 for n in normals), 'Invalid corner normal.'
        explicit_normals = replacement.attributes.new(name='custom_normal',type='FLOAT_VECTOR',domain='CORNER')
        assert explicit_normals.name=='custom_normal' and explicit_normals.data_type=='FLOAT_VECTOR'
        explicit_normals.data.foreach_set('vector',[c for normal in normals for c in normal])
        replacement.update(); replacement.calc_loop_triangles()
        after = source_evidence(replacement,retained)
        assert all(a[0]==b[0] and a[2]==b[2] and a[3]==b[3] for a,b in zip(before,after)), 'Retained position/color/winding/smoothing drift.'
        normal_error = max(abs(x-y) for a,b in zip(before,after) for n,m in zip(a[1],b[1]) for x,y in zip(n,m))
        assert normal_error<3e-5, ('Retained normal drift',normal_error)
        assert len(replacement.loop_triangles)==summary['candidateTriangles']
        final_bounds = [[min(v.co[k] for v in replacement.vertices),max(v.co[k] for v in replacement.vertices)] for k in range(3)]
        assert final_bounds==bounds, 'AABB changed.'
        source.data = replacement; source.name = FAMILY
        if mesh.users==0: owned_meshes.discard(mesh); bpy.data.meshes.remove(mesh)
        source['sourceSha256'] = SOURCE_SHA256
        source['provenance'] = 'Original authored Inkstorm pipe-bank; additive pressure-vessel detail round33. All7160 original triangles retained.'
        source['sourcePreflightPassed'] = True
        source['retainedTriangles'] = RETAINED_TRIANGLES
        source['candidateTriangles'] = summary['candidateTriangles']
        source['retainedNormalMaximumDelta'] = normal_error
        source['retainedNormalStorage'] = 'FLOAT_VECTOR/CORNER custom_normal'
        source['supportsAndFootprintsUnchanged'] = True
        source['connectedMouthsUnchanged'] = True
        source['runtimeInstalled'] = False
        source['front_axis'] = '-Y'
        report.update({'status':'isolated source scene authored; export/review pending','retainedTriangles':RETAINED_TRIANGLES,
                       'retainedPositionColorAndWindingExact':True,'retainedNormalMaximumDelta':normal_error,
                       'retainedNormalStorage':'FLOAT_VECTOR/CORNER custom_normal','sourceBoundsBlender':bounds,
                       'finalBoundsBlender':final_bounds,'newGeometry':summary,'freeTerminalAttribution':free_receipts,
                       'newGeometryClearance':clearance,
                       'untouchedConnectedMouths':socket_receipts,'meshes':1,'materials':1,'textures':0,'animations':0,
                       'materialReadOnly':True,'platformFloorUnchanged':True,'collisionUnchanged':True,
                       'tradeoffs':['Static triangle count increases; actual visible instances and FPS must be measured later.',
                                    'Existing three connected mouth disks remain exact and are covered by the established runtime tube links.',
                                    'Free-end dishes are pressure-vessel closures only; they do not claim new fluid-network connectivity.',
                                    'Original vertex-color paint remains; source and gameplay visual criticism are still required.']})
        success = True
    finally:
        window.scene = old_scene; window.view_layer = old_layer
        old_layer.active_layer_collection = old_layer_collection
        if not success and stage is not None:
            for obj in list(stage.objects):
                assert obj not in old_objects
                bpy.data.objects.remove(obj,do_unlink=True)
            bpy.data.scenes.remove(stage)
            for mesh in owned_meshes:
                if mesh.users==0: bpy.data.meshes.remove(mesh)
            for material in owned_materials:
                if material.users==0: bpy.data.materials.remove(material)
            for image in owned_images:
                if image.users==0: bpy.data.images.remove(image)
            for collection in owned_collections:
                if collection.users==0: bpy.data.collections.remove(collection)
        for obj in old_layer.objects: obj.select_set(obj in old_selected,view_layer=old_layer)
        old_layer.objects.active = old_active
        scenes_exact = all((set(s.objects),set(s.collection.children))==members for s,members in scene_members.items())
        collections_exact = all((set(c.objects),set(c.children))==members for c,members in collection_members.items())
        restored = window.scene==old_scene and window.view_layer==old_layer and old_layer.objects.active==old_active and set(bpy.context.selected_objects)==set(old_selected)
        assert scenes_exact and collections_exact and restored
        report['preservation'] = {'allExistingSceneMembershipsExact':scenes_exact,'allExistingCollectionMembershipsExact':collections_exact,
                                  'contextRestored':restored,'scene':old_scene.name,'viewLayer':old_layer.name,
                                  'active':old_active.name if old_active else None,'selectedCount':len(old_selected),
                                  'noExistingObjectsOrMaterialsEdited':True}
        print(json.dumps(report,sort_keys=True))


execute_source_authoring()
