"""PREPARED, NOT EXECUTED. Run through Blender MCP after root's timing release.

Requires the successful authoring stage and its source preflight marker. Exports
that one source object, then renders three neutral technical views using a copied
mesh in a disposable review scene. All pre-existing scene/view-layer/selection
and memberships are restored. No bake, shared blend save, runtime copy or file
API is used. Caller must reserve the versioned output paths before execution;
MCP deliberately does not read paths or compute file hashes.
"""
import bpy
import json
import math
from mathutils import Vector, Matrix

SOURCE_STAGE = 'PodRacing — Foundry service gantry round33 hoist V3'
REVIEW_STAGE = 'PodRacing — Foundry service gantry round33 technical hoist V3'
FAMILY = 'foundry-service-gantry-v3'
OUT = '/Users/amir/Projects/PodRacing/assets/source/inkstorm/foundry-service-round33/v3-hoist/'
EXPECTED_SOURCE_SHA256 = '58fc12d837039eb73111886b1b91c294516c51fc47a4a0d00200717161fd39ba'
TRIANGLE_CAP = 20000
RETAINED_TRIANGLES = 18324
RENDER_RESOLUTION = (1400,1000)
CAMERAS = [
    ('approach-three-quarter',(1.05,1.60,.80)),
    ('rear-three-quarter',(-1.10,-1.60,.80)),
    ('side-depth',(1.00,0,.12)),
]


def evidence(obj):
    mesh = obj.data
    color = mesh.color_attributes.active_color
    return (tuple(tuple(v.co) for v in mesh.vertices),
            tuple((tuple(p.vertices),p.material_index,p.use_smooth) for p in mesh.polygons),
            tuple(tuple(n.vector) for n in mesh.corner_normals),
            (color.name,color.domain,tuple(tuple(v.color) for v in color.data)),
            tuple(tuple(row) for row in obj.matrix_world),tuple(mesh.materials))


def execute_export_and_review():
    assert bpy.context.mode=='OBJECT', 'Do not change the shared editing mode.'
    assert SOURCE_STAGE in bpy.data.scenes and REVIEW_STAGE not in bpy.data.scenes
    source_scene = bpy.data.scenes[SOURCE_STAGE]
    source_layer = source_scene.view_layers[0]
    source_objects = [o for o in source_scene.objects if o.type=='MESH']
    assert len(source_objects)==1
    source = source_objects[0]
    assert source.name==FAMILY and source.get('sourcePreflightPassed') is True
    assert source.get('sourceSha256')==EXPECTED_SOURCE_SHA256
    assert source.get('retainedTriangles')==18324 and source.get('replacedV2HoistTriangles')==1632 and source.get('preservedV2UnrelatedTriangles')==18324
    assert source.get('supportsAndFootprintsUnchanged') is True
    assert source.get('localCorridorClearanceZ',0)>=39.66998
    assert source.get('retainedNormalMaximumDelta',1)<3e-5
    assert source.get('retainedNormalStorage')=='FLOAT_VECTOR/CORNER custom_normal'
    normal_attribute = source.data.attributes.get('custom_normal')
    assert normal_attribute is not None and normal_attribute.data_type=='FLOAT_VECTOR' and normal_attribute.domain=='CORNER'
    source.data.calc_loop_triangles()
    triangle_count = len(source.data.loop_triangles)
    recorded_count = source.get('candidateTriangles')
    assert isinstance(recorded_count,int) and not isinstance(recorded_count,bool)
    assert RETAINED_TRIANGLES < triangle_count <= TRIANGLE_CAP and recorded_count==triangle_count, ('Source triangle count drift',triangle_count,recorded_count)
    assert len(source.data.materials)==1 and source.matrix_world==Matrix.Identity(4)
    material = source.data.materials[0]
    assert material.name.startswith('Inkstorm_Industrial_Revision_Paint') and material.use_nodes
    assert not any(node.type=='TEX_IMAGE' for node in material.node_tree.nodes), 'Unexpected texture contract.'
    source_bounds = [[min(v.co[k] for v in source.data.vertices),max(v.co[k] for v in source.data.vertices)] for k in range(3)]
    expected_horizontal = [[-52,52],[-7,7]]
    assert all(abs(source_bounds[k][j]-expected_horizontal[k][j])<2e-4 for k in range(2) for j in range(2)), ('Source horizontal bounds drift before export',source_bounds)
    assert abs(source_bounds[2][0]+25)<2e-4 and 54.30417251586914<=source_bounds[2][1]<=61.4502, ('Source vertical envelope drift before export',source_bounds)
    source_before = evidence(source)
    window = bpy.context.window
    old_scene,old_layer = window.scene,window.view_layer
    old_active,old_selected = old_layer.objects.active,list(bpy.context.selected_objects)
    old_layer_collection = old_layer.active_layer_collection
    source_selected = [o for o in source_layer.objects if o.select_get(view_layer=source_layer)]
    source_active,source_layer_collection = source_layer.objects.active,source_layer.active_layer_collection
    scene_members = {s:(set(s.objects),set(s.collection.children)) for s in bpy.data.scenes}
    collection_members = {c:(set(c.objects),set(c.children)) for c in bpy.data.collections}
    stage = None; owned_objects = []; owned_meshes = []; owned_lights = []
    camera_data = None; floor_material = None; world = None
    report = {'sourceScene':SOURCE_STAGE,'scope':'Neutral source construction inspection; not gameplay, art acceptance or FPS evidence.',
              'targetReferences':['docs/inkstorm-overhaul/concepts/11-foundry-construction-round33.png',
                                  'docs/inkstorm-overhaul/concepts/06-foundry.png'],
              'sourceGeometryDraws':1,'sourceMaterialSlots':1,'sourceImages':0,'sourceTriangles':triangle_count,'sourceTriangleCap':TRIANGLE_CAP,
              'retainedSourceTriangles':RETAINED_TRIANGLES,'addedConstructionTriangles':triangle_count-RETAINED_TRIANGLES,
              'runtimeInstalled':False,'images':[],'renderer':'CPU Cycles16samples / Standard color management',
              'neutralLighting':'All lights white; no palette replacement, compositor, tint, bloom or fog.',
              'foundationView':'The original buried foundation volume is fully exposed for technical footprint review.'}
    try:
        # Export only the successful authored object, preserving its exact node
        # name and one-draw material. Restore that stage's selection immediately.
        try:
            window.scene = source_scene; window.view_layer = source_layer
            source_layer.active_layer_collection = source_layer.layer_collection
            for obj in source_layer.objects: obj.select_set(False,view_layer=source_layer)
            source.select_set(True,view_layer=source_layer); source_layer.objects.active = source
            result = bpy.ops.export_scene.gltf(filepath=OUT+FAMILY+'-native.glb',export_format='GLB',
                use_selection=True,use_active_scene=True,export_animations=False,export_materials='EXPORT',
                export_cameras=False,export_lights=False,export_extras=True,export_yup=True)
            assert 'FINISHED' in result
            report['sourceExport'] = OUT+FAMILY+'-native.glb'
        finally:
            for obj in source_layer.objects: obj.select_set(obj in source_selected,view_layer=source_layer)
            source_layer.objects.active = source_active
            source_layer.active_layer_collection = source_layer_collection
        assert evidence(source)==source_before, 'Export changed the authored source evidence.'
        stage = bpy.data.scenes.new(REVIEW_STAGE)
        window.scene = stage; window.view_layer = stage.view_layers[0]
        window.view_layer.active_layer_collection = window.view_layer.layer_collection
        reviewed = source.copy(); reviewed.data = source.data.copy()
        reviewed.name = FAMILY+'-neutral-review-copy'
        stage.collection.objects.link(reviewed); owned_objects.append(reviewed); owned_meshes.append(reviewed.data)
        # Same material object, read-only. No texture/paint/shader substitution.
        assert tuple(reviewed.data.materials)==tuple(source.data.materials)
        bpy.context.view_layer.update()
        corners = [reviewed.matrix_world@Vector(p) for p in reviewed.bound_box]
        low = Vector([min(p[k] for p in corners) for k in range(3)])
        high = Vector([max(p[k] for p in corners) for k in range(3)])
        center = (low+high)*.5
        assert abs(low.x+52)<2e-4 and abs(high.x-52)<2e-4
        assert abs(low.y+7)<2e-4 and abs(high.y-7)<2e-4
        assert abs(low.z+25)<2e-4 and abs(high.z-source_bounds[2][1])<2e-4 and high.z<=61.4502
        report['boundsBlender'] = [list(low),list(high)]
        world = bpy.data.worlds.new(REVIEW_STAGE+' world'); world.use_nodes = True
        world.node_tree.nodes['Background'].inputs['Color'].default_value = (.10,.10,.10,1)
        world.node_tree.nodes['Background'].inputs['Strength'].default_value = .55
        stage.world = world
        # Neutral floor receives actual geometric shadows. It is never exported.
        floor_mesh = bpy.data.meshes.new(REVIEW_STAGE+' floor')
        floor_mesh.from_pydata([(-160,-140,-25.04),(160,-140,-25.04),(160,140,-25.04),(-160,140,-25.04)],[],[(0,1,2,3)])
        floor_mesh.update(); owned_meshes.append(floor_mesh)
        floor_material = bpy.data.materials.new(REVIEW_STAGE+' neutral floor'); floor_material.use_nodes = True
        floor_shader = floor_material.node_tree.nodes.get('Principled BSDF')
        floor_shader.inputs['Base Color'].default_value = (.12,.12,.12,1)
        floor_shader.inputs['Roughness'].default_value = .92
        floor_mesh.materials.append(floor_material)
        floor = bpy.data.objects.new(floor_mesh.name,floor_mesh); stage.collection.objects.link(floor); owned_objects.append(floor)
        def aim(obj): obj.rotation_euler = (center-obj.location).to_track_quat('-Z','Y').to_euler()
        for label,offset,power,size in [
            ('key',(80,100,135),180000,95),('fill',(-100,45,80),110000,110),('rear',(10,-120,120),140000,100)]:
            data = bpy.data.lights.new(REVIEW_STAGE+' '+label,'AREA')
            data.energy = power; data.size = size; data.color = (1,1,1)
            obj = bpy.data.objects.new(data.name,data); stage.collection.objects.link(obj)
            owned_objects.append(obj); owned_lights.append(data)
            obj.location = center+Vector(offset); aim(obj)
        camera_data = bpy.data.cameras.new(REVIEW_STAGE+' camera'); camera_data.type = 'ORTHO'
        camera_data.sensor_fit = 'HORIZONTAL'
        camera_data.clip_start = .1; camera_data.clip_end = 1500
        camera = bpy.data.objects.new(camera_data.name,camera_data); stage.collection.objects.link(camera); owned_objects.append(camera)
        stage.camera = camera
        stage.render.engine = 'CYCLES'; stage.cycles.device = 'CPU'
        stage.cycles.samples = 16; stage.cycles.use_denoising = True
        stage.cycles.max_bounces = 4; stage.cycles.diffuse_bounces = 2; stage.cycles.glossy_bounces = 2
        stage.render.threads_mode = 'FIXED'; stage.render.threads = 4
        stage.render.resolution_x,stage.render.resolution_y = RENDER_RESOLUTION
        stage.render.resolution_percentage = 100
        stage.render.image_settings.file_format = 'PNG'; stage.render.image_settings.color_mode = 'RGB'
        stage.render.image_settings.color_depth = '8'; stage.render.film_transparent = False
        stage.view_settings.view_transform = 'Standard'; stage.view_settings.look = 'None'
        stage.view_settings.exposure = 0; stage.view_settings.gamma = 1
        # Fit the full preserved feet and taller main, with common scale across
        # all views. No crop can silently hide an unfurnished face or support.
        fits = []
        aspect = RENDER_RESOLUTION[0]/RENDER_RESOLUTION[1]
        for label,direction in CAMERAS:
            camera.location = center+Vector(direction).normalized()*270; aim(camera)
            bpy.context.view_layer.update()
            local = [camera.matrix_world.inverted()@p for p in corners]
            width = max(p.x for p in local)-min(p.x for p in local)
            height = max(p.y for p in local)-min(p.y for p in local)
            fits.append(max(width,height*aspect)*1.14)
        camera_data.ortho_scale = max(fits)
        for label,direction in CAMERAS:
            camera.location = center+Vector(direction).normalized()*270; aim(camera)
            bpy.context.view_layer.update()
            stage.render.filepath = OUT+FAMILY+'-'+label+'.png'
            result = bpy.ops.render.render(write_still=True)
            assert 'FINISHED' in result
            report['images'].append({'view':label,'path':stage.render.filepath,'eyeBlender':list(camera.location),
                                     'targetBlender':list(center),'orthographicScale':camera_data.ortho_scale,
                                     'orthographicScaleAxis':'horizontal','sensorFit':camera_data.sensor_fit,
                                     'resolution':list(RENDER_RESOLUTION)})
        assert evidence(source)==source_before
        report['status'] = 'Source GLB and three neutral technical views written; actual-world/critic acceptance pending'
    finally:
        window.scene = old_scene; window.view_layer = old_layer
        old_layer.active_layer_collection = old_layer_collection
        if stage is not None:
            for obj in owned_objects: bpy.data.objects.remove(obj,do_unlink=True)
            bpy.data.scenes.remove(stage)
        for mesh in owned_meshes:
            if mesh.users==0: bpy.data.meshes.remove(mesh)
        for light in owned_lights:
            if light.users==0: bpy.data.lights.remove(light)
        if camera_data is not None and camera_data.users==0: bpy.data.cameras.remove(camera_data)
        if floor_material is not None and floor_material.users==0: bpy.data.materials.remove(floor_material)
        if world is not None and world.users==0: bpy.data.worlds.remove(world)
        for obj in old_layer.objects: obj.select_set(obj in old_selected,view_layer=old_layer)
        old_layer.objects.active = old_active
        scenes_exact = all((set(s.objects),set(s.collection.children))==members for s,members in scene_members.items())
        collections_exact = all((set(c.objects),set(c.children))==members for c,members in collection_members.items())
        context_exact = window.scene==old_scene and window.view_layer==old_layer and old_layer.objects.active==old_active and set(bpy.context.selected_objects)==set(old_selected)
        source_selection_exact = source_layer.objects.active==source_active and {o for o in source_layer.objects if o.select_get(view_layer=source_layer)}==set(source_selected)
        source_exact = evidence(source)==source_before
        assert scenes_exact and collections_exact and context_exact and source_selection_exact and source_exact
        report['preservation'] = {'allExistingSceneMembershipsExact':scenes_exact,'allExistingCollectionMembershipsExact':collections_exact,
                                  'sharedContextRestored':context_exact,'authoredStageSelectionRestored':source_selection_exact,
                                  'authoredSourceEvidenceExact':source_exact,'temporaryReviewSceneRemoved':stage is not None,
                                  'existingScenes':len(scene_members),'scene':old_scene.name,'viewLayer':old_layer.name,
                                  'active':old_active.name if old_active else None,'selectedCount':len(old_selected)}
        print(json.dumps(report,sort_keys=True))


execute_export_and_review()
