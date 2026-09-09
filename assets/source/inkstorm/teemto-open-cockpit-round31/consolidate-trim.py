"""Blender MCP: consolidate identical opaque graphite coaming and deck caps."""
import bpy
import json
stage=bpy.data.scenes['PodRacing — Teemto open cockpit round31']
window=bpy.context.window;original=window.scene;layer=window.view_layer
active=layer.objects.active;selected=list(bpy.context.selected_objects)
memberships={s:set(s.objects) for s in bpy.data.scenes if s!=stage}
try:
    window.scene=stage;window.view_layer=stage.view_layers[0]
    bpy.ops.object.select_all(action='DESELECT')
    for name in ['teemto-cockpit-coaming-graphite','teemto-cockpit-rear-mount-cap','teemto-cockpit-nose-deck-cap']:
        stage.objects[name].select_set(True)
    bpy.context.view_layer.objects.active=stage.objects['teemto-cockpit-coaming-graphite']
    bpy.ops.object.join()
    bpy.ops.object.select_all(action='DESELECT')
    for name in ['teemto-open-cockpit-hull','teemto-cockpit-coaming-graphite','teemto-cockpit-bone-return']:
        stage.objects[name].select_set(True)
    bpy.context.view_layer.objects.active=stage.objects['teemto-open-cockpit-hull']
    bpy.ops.export_scene.gltf(filepath='/Users/amir/Projects/PodRacing/assets/source/inkstorm/teemto-open-cockpit-round31/teemto-open-cockpit-round31-geometry.glb',
        export_format='GLB',use_selection=True,use_active_scene=True,export_extras=False,
        export_animations=False,export_cameras=False,export_lights=False,export_yup=True,export_materials='NONE')
finally:
    window.scene=original;window.view_layer=layer
    bpy.ops.object.select_all(action='DESELECT')
    for obj in selected:obj.select_set(True)
    layer.objects.active=active
    unchanged=all(set(s.objects)==items for s,items in memberships.items())
    assert unchanged
    print(json.dumps({'changedScene':stage.name,'change':'Graphite coaming and both deck caps consolidated into one opaque primitive',
                      'allOtherSceneMembershipsExact':unchanged,'otherSceneCount':len(memberships),
                      'restoredScene':original.name,'restoredSelected':len(bpy.context.selected_objects)}))
