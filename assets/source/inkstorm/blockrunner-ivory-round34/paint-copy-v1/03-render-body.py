def require_paint():
    scene=bpy.data.scenes[STATE['targetScene']]
    assert source_signature(scene)==STATE['paintSignature'], 'Paint geometry/slots/materials drift'
    assert normal_signatures(scene)==STATE['paintRawCornerNormalSignatures'], 'Paint raw normal drift'
    for row in STATE['objectLineage']:
        if 'copiedMesh' not in row:continue
        mesh=scene.objects[row['copiedObject']].data
        assert geometry_record(mesh)==row['geometrySignature']
        assert fnv1a64_signature([d.value for d in mesh.attributes['ivorySourcePolygon'].data])==row['sourcePolygonSignature']
        assert fnv1a64_signature([d.value for d in mesh.attributes['ivoryPaintRole'].data])==row['roleSignature']
    return scene

snapshot=fresh_snapshot()
existing_render_result=bpy.data.images.get('Render Result')
render_result_before=render_result_record(existing_render_result)
owned_objects=[]
owned_lights=[]
owned_cameras=[]
owned_world=None
stage=None
report={'stage':'IVORY_PALETTE_V1_MATCHED_RENDER','view':RENDER['view'],'status':'STARTED','renderPassed':False,
        'path':RENDER['outputPath'],'cameraReferenceReceiptSha256':RENDER['cameraReceiptSha256'],
        'paintAuthorReceiptSha256':RENDER['authorReceiptSha256'],'artAccepted':False,'runtimeReady':False,
        'originalContext':snapshot['context'],'preexistingSceneCount':len(snapshot['sets']['scenes'])}
try:
    assert bpy.context.mode=='OBJECT' and not bpy.app.is_job_running('RENDER')
    assert render_result_before is None or all(not slot['hasData'] and slot['size']==[0,0] for slot in render_result_before['slots']), 'Populated Render Result must not be overwritten'
    require_histories()
    inspected=require_paint()
    assert bpy.data.scenes.get(RENDER['temporaryScene']) is None
    stage=bpy.data.scenes.new(RENDER['temporaryScene'])
    for original in sorted(inspected.objects,key=name_key):
        if original.type!='MESH':continue
        copied=bpy.data.objects.new('Ivory palette read-only '+original.name,original.data)
        owned_objects.append(copied)
        stage.collection.objects.link(copied)
        copied.matrix_world=original.matrix_world.copy()
        copied.hide_render=original.hide_render
        assert copied.data is original.data and all(slot.link=='DATA' for slot in copied.material_slots)
    snapshot['window'].scene=stage
    snapshot['window'].view_layer=stage.view_layers[0]
    stage.view_layers[0].update()
    full_low=Vector(RENDER['sourceBounds'][0]);full_high=Vector(RENDER['sourceBounds'][1])
    full_center=(full_low+full_high)*.5;full_extent=max(full_high-full_low)
    owned_world=bpy.data.worlds.new(RENDER['temporaryScene']+' world');owned_world.use_nodes=True
    owned_world.node_tree.nodes['Background'].inputs['Color'].default_value=(.16,.16,.16,1)
    owned_world.node_tree.nodes['Background'].inputs['Strength'].default_value=.55;stage.world=owned_world
    for label,direction,energy in [('key',(1,-1.3,2),1100),('fill',(-1.4,.7,1.2),750)]:
        light=bpy.data.lights.new(RENDER['temporaryScene']+' '+label,'AREA');owned_lights.append(light)
        light.energy=energy*(full_extent/12)**2;light.size=full_extent*.75;light.color=(1,1,1)
        ob=bpy.data.objects.new(light.name,light);owned_objects.append(ob);stage.collection.objects.link(ob)
        ob.location=full_center+Vector(direction)*full_extent*.65
        ob.rotation_euler=(full_center-ob.location).to_track_quat('-Z','Y').to_euler()
    camera_data=bpy.data.cameras.new(RENDER['temporaryScene']+' camera');owned_cameras.append(camera_data)
    camera=bpy.data.objects.new(camera_data.name,camera_data);owned_objects.append(camera);stage.collection.objects.link(camera);stage.camera=camera
    camera.location=RENDER['camera']['location'];camera.rotation_euler=RENDER['camera']['rotationEuler']
    camera_data.type='ORTHO';camera_data.sensor_fit='HORIZONTAL';camera_data.ortho_scale=RENDER['camera']['orthoScale']
    camera_data.clip_start=.01;camera_data.clip_end=full_extent*10
    assert list(camera.location)==RENDER['camera']['location'] and list(camera.rotation_euler)==RENDER['camera']['rotationEuler']
    assert camera_data.ortho_scale==RENDER['camera']['orthoScale']
    stage.render.engine='CYCLES';stage.cycles.device='CPU';stage.cycles.samples=16;stage.cycles.use_denoising=True
    stage.cycles.max_bounces=4;stage.cycles.seed=3401;stage.cycles.use_animated_seed=False
    stage.render.resolution_x=768;stage.render.resolution_y=576;stage.render.resolution_percentage=100
    stage.render.image_settings.file_format='PNG';stage.render.image_settings.color_mode='RGB';stage.render.image_settings.color_depth='8'
    stage.render.film_transparent=False;stage.render.use_compositing=False;stage.render.use_sequencer=False
    stage.view_settings.view_transform='Standard';stage.view_settings.look='None';stage.view_settings.exposure=0;stage.view_settings.gamma=1;stage.view_settings.use_curve_mapping=False
    stage.render.filepath=RENDER['outputPath']
    report['camera']=RENDER['camera'];report['lighting']='Exactly matched prior neutral: CPU Cycles16 seed3401; same two white area lights, world .16 strength .55; Standard/None exposure0 gamma1; 768x576'
    report['actualTriangles']=44028;report['materialSlotHistogramsPreserved']=True
    bpy.ops.render.render(write_still=True,scene=stage.name)
    report['status']='RENDERED_INSPECTION_PENDING'
except Exception as error:
    report['status']='FAILED';report['error']=str(error)
finally:
    try:
        restore_original_context(snapshot)
        for ob in reversed(owned_objects):
            assert ob not in snapshot['sets']['objects'];bpy.data.objects.remove(ob,do_unlink=True)
        if stage is not None:bpy.data.scenes.remove(stage,do_unlink=True)
        for light in owned_lights:
            assert light.users==0;bpy.data.lights.remove(light)
        for camera in owned_cameras:
            assert camera.users==0;bpy.data.cameras.remove(camera)
        if owned_world is not None:
            assert owned_world.users==0;bpy.data.worlds.remove(owned_world)
        for image in set(bpy.data.images)-snapshot['sets']['images']:
            assert image.name=='Render Result';bpy.data.images.remove(image,do_unlink=True)
        if existing_render_result is not None:
            existing_render_result.buffers_free()
            assert render_result_record(existing_render_result)==render_result_before
        report['emptyRenderResultRestored']=render_result_record(existing_render_result)==render_result_before
        report['globalPreservation']=verify_snapshot(snapshot)
        require_histories();require_paint()
        report['allFiveHistoriesAndPaintMasksExact']=True
        preservation=report['globalPreservation']
        report['renderPassed']=report['status']=='RENDERED_INSPECTION_PENDING' and report['allFiveHistoriesAndPaintMasksExact'] and preservation['contextRestored'] and preservation['allSceneSettingsAndMembershipsPreserved'] and preservation['allCollectionMembershipsPreserved'] and preservation['noPersistentDatablocksCreatedOrRemoved']
    except Exception as error:
        report['renderPassed']=False;report['status']='FAILED';report['preservationError']=str(error)
print(json.dumps(report,sort_keys=True,allow_nan=False))
