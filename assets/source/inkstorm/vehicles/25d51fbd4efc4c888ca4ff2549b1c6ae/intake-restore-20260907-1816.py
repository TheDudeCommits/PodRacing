import bpy, json
intake=bpy.data.scenes['PodRacing — source 25d51fbd intake 1815']
intake_count=len(intake.objects)
intake.blendermcp_sketchfab_api_key=''
intake.blendermcp_use_sketchfab=False
original=bpy.data.scenes['Cruise — Going Merry source 4b2cb678']
bpy.context.window.scene=original
bpy.context.window.view_layer=original.view_layers['ViewLayer']
for obj in bpy.context.view_layer.objects:
    obj.select_set(False)
for name in ["Sketchfab_model.001","cd32016bfac44aaea241abaa77bd8b56.fbx","RootNode","Object016","Object_4","Object016_02 - Default_0","Plane038","Object_7","Plane038_02 - Default_0","Plane045","Object_10","Plane045_02 - Default_0","Plane056","Object_13","Plane056_02 - Default_0"]:
    bpy.data.objects[name].select_set(True)
bpy.context.view_layer.objects.active=bpy.data.objects['Sketchfab_model.001']
print(json.dumps({'scene':bpy.context.scene.name,'viewLayer':bpy.context.view_layer.name,'active':bpy.context.view_layer.objects.active.name,'selected':[o.name for o in bpy.context.selected_objects],'objects':len(original.objects),'intakeObjects':intake_count,'temporaryConfigurationEmpty':not bool(intake.blendermcp_sketchfab_api_key) and not intake.blendermcp_use_sketchfab,'quarryObjects':len(bpy.data.scenes['Korostyshiv Fractured Quarry Revision'].objects),'sceneObjects':{s.name:sorted(o.name for o in s.objects) for s in bpy.data.scenes}}))
