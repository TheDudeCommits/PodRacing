import bpy, json
expected=bpy.data.scenes['Cruise — Going Merry source 4b2cb678']
assert bpy.context.scene == expected
assert len(expected.objects)==17
assert bpy.context.view_layer.objects.active.name=='Sketchfab_model.001'
assert len(bpy.context.selected_objects)==15
scene_name='PodRacing — source 25d51fbd intake 1815'
assert bpy.data.scenes.get(scene_name) is None
context_snapshot={'scene':bpy.context.scene.name,'viewLayer':bpy.context.view_layer.name,'active':bpy.context.view_layer.objects.active.name,'selected':[o.name for o in bpy.context.selected_objects],'sceneObjects':{s.name:sorted(o.name for o in s.objects) for s in bpy.data.scenes}}
intake=bpy.data.scenes.new(scene_name)
try:
    intake.blendermcp_use_sketchfab=expected.blendermcp_use_sketchfab
    intake.blendermcp_sketchfab_api_key=expected.blendermcp_sketchfab_api_key
    bpy.context.window.scene=intake
    assert len(intake.objects)==0
    assert bool(intake.blendermcp_use_sketchfab) and bool(intake.blendermcp_sketchfab_api_key)
    print(json.dumps({'activeScene':bpy.context.scene.name,'objects':len(intake.objects),'configured':bool(intake.blendermcp_use_sketchfab) and bool(intake.blendermcp_sketchfab_api_key),'contextBefore':context_snapshot}))
except Exception:
    intake.blendermcp_sketchfab_api_key=''
    intake.blendermcp_use_sketchfab=False
    bpy.context.window.scene=expected
    raise
