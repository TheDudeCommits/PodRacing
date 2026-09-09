"""Export the isolated V4 scene with explicit tangent frames, then restore context."""
import bpy
import json
saved_scene=bpy.context.window.scene
saved_layer=bpy.context.window.view_layer
saved_active=saved_layer.objects.active
saved_selected=list(bpy.context.selected_objects)
try:
    scene=bpy.data.scenes['PodRacing — Teemto pilot material v4 normalized']
    bpy.context.window.scene=scene
    for obj in scene.objects:obj.select_set(True)
    meshes=[o for o in scene.objects if o.type=='MESH']
    bpy.context.view_layer.objects.active=meshes[0]
    path='/Users/amir/Projects/PodRacing/assets/source/inkstorm/vehicles/4eff45899ada40bb920c5c744663db90/processed/pilot-v4/teemto-pilot-v4-runtime-native.glb'
    bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,
        use_active_scene=True,export_extras=False,export_animations=False,
        export_cameras=False,export_lights=False,export_yup=True,export_tangents=True)
    result={'path':path,'scene':scene.name,'meshCount':len(meshes),'explicitTangents':True,
        'publicModified':False,'sourceModified':False,'extras':False}
finally:
    bpy.context.window.scene=saved_scene
    bpy.context.window.view_layer=saved_layer
    for obj in saved_layer.objects:
        if obj.select_get() and obj not in saved_selected:obj.select_set(False)
    for obj in saved_selected:obj.select_set(True)
    saved_layer.objects.active=saved_active
result['restoredContext']={'scene':saved_scene.name,'viewLayer':saved_layer.name,
    'active':saved_active.name if saved_active else None,'selectedCount':len(bpy.context.selected_objects),
    'exactSelectionRestored':set(bpy.context.selected_objects)==set(saved_selected),
    'sceneObjectCount':len(saved_scene.objects)}
print(json.dumps(result))
