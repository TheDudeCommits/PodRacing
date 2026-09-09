"""Add the forward deck closure found necessary in the isolated asset inspection."""
import bpy
import json
stage=bpy.data.scenes['PodRacing — Teemto open cockpit round31']
assert not any(o.name=='teemto-cockpit-nose-deck-cap' for o in stage.objects)
window=bpy.context.window;original=window.scene;layer=window.view_layer
active=layer.objects.active;selected=list(bpy.context.selected_objects)
memberships={s:set(s.objects) for s in bpy.data.scenes if s!=stage}
try:
    window.scene=stage;window.view_layer=stage.view_layers[0]
    bpy.context.view_layer.active_layer_collection=bpy.context.view_layer.layer_collection
    bpy.ops.mesh.primitive_cube_add(size=1,location=(.025,3.775,2.79))
    obj=bpy.context.object;obj.name='teemto-cockpit-nose-deck-cap';obj.data.name=obj.name
    obj.scale=(.72,.69,.10)
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    bevel=obj.modifiers.new('Forward deck edge radius','BEVEL');bevel.width=.018;bevel.segments=2
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    bpy.ops.object.select_all(action='DESELECT')
    names=['teemto-open-cockpit-hull','teemto-cockpit-coaming-graphite',
           'teemto-cockpit-bone-return','teemto-cockpit-rear-mount-cap','teemto-cockpit-nose-deck-cap']
    for name in names:stage.objects[name].select_set(True)
    bpy.context.view_layer.objects.active=stage.objects[names[0]]
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
    print(json.dumps({'changedScene':stage.name,'change':'Closed forward upper-hull cut edge with beveled opaque structural nose deck',
                      'allOtherSceneMembershipsExact':unchanged,'otherSceneCount':len(memberships),
                      'restoredScene':original.name,'restoredSelected':len(bpy.context.selected_objects)}))
