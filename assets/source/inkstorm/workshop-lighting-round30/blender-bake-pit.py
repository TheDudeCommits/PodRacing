# Run via Blender MCP; target isolated scene only, synchronous bake, no timers.
import bpy, json
scene=bpy.data.scenes['Inkstorm_Workshop_Round30_PitBake']
obj=bpy.data.objects['Round30_Pit_ExactSource_UVReceiver']
image=bpy.data.images['Round30_Pit_DirectWhite_128s']
window=bpy.context.window
original_scene=window.scene
original_layer=window.view_layer
active=original_layer.objects.active
selected=[o for o in original_layer.objects if o.select_get(view_layer=original_layer)]

try:
    window.scene=scene
    for o in scene.objects:o.select_set(o==obj)
    window.view_layer.objects.active=obj
    scene.cycles.device='CPU'
    assert scene.cycles.samples==128
    bpy.ops.object.bake(type='DIFFUSE')
    scene.render.image_settings.file_format='OPEN_EXR'
    scene.render.image_settings.color_mode='RGB'
    scene.render.image_settings.color_depth='16'
    scene.render.image_settings.exr_codec='ZIP'
    image.save_render('/Users/amir/Projects/PodRacing/assets/source/inkstorm/workshop-lighting-round30/pit-complex-direct-600w-128s.exr',scene=scene)
    scene['bake_complete']=True
    print(json.dumps({'status':'DIRECT_WHITE_PIT_BAKE_COMPLETE_NOT_RUNTIME_ACCEPTANCE','samples':128,'device':scene.cycles.device,'width':image.size[0],'height':image.size[1]}))
finally:
    window.scene=original_scene
    window.view_layer=original_layer
    original_layer.objects.active=active
    for o in original_layer.objects:o.select_set(o in selected,view_layer=original_layer)
    snapshot=json.loads(scene['original_memberships_json'])
    assert {s.name:sorted(o.name for o in s.objects) for s in bpy.data.scenes if s.name in snapshot}==snapshot
    assert window.scene==original_scene and window.view_layer==original_layer
    assert sorted(o.name for o in original_layer.objects if o.select_get(view_layer=original_layer))==sorted(o.name for o in selected)
