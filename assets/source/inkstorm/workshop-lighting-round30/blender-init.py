# Execute through Blender MCP after root GO. No file reads or full-blend save.
import bpy, json
assert 'Inkstorm_Workshop_Round30_PitBake' not in bpy.data.scenes, 'Existing round30 scene must be inspected, not overwritten'
window = bpy.context.window
original_scene = window.scene
original_layer = window.view_layer
original_active = original_layer.objects.active
original_selected = [o for o in original_layer.objects if o.select_get(view_layer=original_layer)]
original_mode = bpy.context.mode
assert original_mode == 'OBJECT', 'Preserve non-object editing context; do not proceed'
snapshot = {s.name: sorted(o.name for o in s.objects) for s in bpy.data.scenes}
state = {'original_scene':original_scene, 'original_layer':original_layer,
 'original_active':original_active,'original_selected':original_selected,
 'original_mode':original_mode,'original_memberships':snapshot,'temporary_scenes':[]}
assert len(snapshot)==94, 'Expected 94 pre-existing scenes' 
try:
    scene=bpy.data.scenes.new('Inkstorm_Workshop_Round30_PitBake')
    state['temporary_scenes'].append(scene)
    scene['original_memberships_json']=json.dumps(snapshot)
    scene['original_context_json']=json.dumps({'scene':original_scene.name,'layer':original_layer.name,'active':original_active.name if original_active else None,'selected':[o.name for o in original_selected],'mode':original_mode})
    window.scene=scene
    bpy.ops.import_scene.gltf(filepath='/Users/amir/Projects/PodRacing/assets/source/inkstorm/workshop-lighting-round30/inputs/pit-complex-id.glb',merge_vertices=False,import_shading='NORMALS')
    meshes=[o for o in scene.objects if o.type=='MESH']
    assert len(meshes)==1
    obj=meshes[0]
    obj.name='Round30_Pit_ExactSource_UVReceiver'
    state['pit_scene']=scene
    state['pit_object']=obj
    assert '_SOURCE_ID' in obj.data.attributes
    assert len(obj.data.polygons)==12012
    assert all(len(p.vertices)==3 for p in obj.data.polygons)
    for o in scene.objects:o.select_set(o==obj)
    window.view_layer.objects.active=obj
    image=bpy.data.images.new('Round30_Pit_DirectWhite_128s',width=2048,height=1024,alpha=False,float_buffer=True)
    image.colorspace_settings.name='Linear Rec.709'
    state['pit_image']=image
    material=bpy.data.materials.new('Round30_White_Diffuse_BakeOnly')
    material.use_nodes=True
    material.node_tree.nodes.clear()
    nodes=material.node_tree.nodes
    output=nodes.new('ShaderNodeOutputMaterial')
    diffuse=nodes.new('ShaderNodeBsdfDiffuse')
    diffuse.inputs['Color'].default_value=(1,1,1,1)
    diffuse.inputs['Roughness'].default_value=0
    material.node_tree.links.new(diffuse.outputs['BSDF'],output.inputs['Surface'])
    target=nodes.new('ShaderNodeTexImage');target.image=image
    nodes.active=target
    obj.data.materials.clear();obj.data.materials.append(material)
    for p in obj.data.polygons:p.material_index=0
    state['white_material']=material
    uv=obj.data.uv_layers.new(name='WorkshopDirectUV')
    obj.data.uv_layers.active=uv
    uv.active_render=True
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.1519173063162575,island_margin=0.017,area_weight=0.0,correct_aspect=True,scale_to_bounds=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.export_scene.gltf(filepath='/Users/amir/Projects/PodRacing/assets/source/inkstorm/workshop-lighting-round30/pit-complex-uv-export.glb',export_format='GLB',use_selection=True,use_active_scene=True,export_texcoords=True,export_normals=True,export_attributes=True,export_materials='NONE',export_animations=False,export_cameras=False,export_lights=False)
    print(json.dumps({'status':'PIT_IMPORTED_AND_INITIAL_UV_EXPORTED_NOT_BAKED','preExistingSceneCount':len(snapshot),'newScene':scene.name,'vertices':len(obj.data.vertices),'triangles':len(obj.data.polygons),'attributes':[a.name for a in obj.data.attributes],'originalScene':original_scene.name,'originalViewLayer':original_layer.name,'originalSelected':len(original_selected)}))
finally:
    if bpy.context.mode!='OBJECT':bpy.ops.object.mode_set(mode='OBJECT')
    window.scene=original_scene
    window.view_layer=original_layer
    original_layer.objects.active=original_active
    for o in original_layer.objects:o.select_set(o in original_selected,view_layer=original_layer)
    assert {s.name: sorted(o.name for o in s.objects) for s in bpy.data.scenes if s.name in snapshot}==snapshot
    assert window.scene==original_scene and window.view_layer==original_layer
    assert sorted(o.name for o in original_layer.objects if o.select_get(view_layer=original_layer))==sorted(o.name for o in original_selected)
