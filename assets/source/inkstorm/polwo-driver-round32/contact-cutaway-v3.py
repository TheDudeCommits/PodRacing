"""Create an isolated original-seat/controls cutaway for driver contact inspection."""
import bpy,json
from mathutils import Matrix
NAME='PodRacing — Polwo fit V3 contact cutaway'
assert NAME not in bpy.data.scenes
old=bpy.context.window.scene;layer=bpy.context.window.view_layer
active=layer.objects.active;selected=list(bpy.context.selected_objects)
memberships={s:set(s.objects) for s in bpy.data.scenes}
scene=bpy.data.scenes.new(NAME)
try:
 for o in bpy.data.scenes['PodRacing — Polwo driver fit round32 V3'].objects:
  if 'pilot' in o.name:scene.collection.objects.link(o)
 source=bpy.data.scenes['PodRacing — source 5a3422df6f894b48b846d590cdc2bf4c retry 20260908']
 bpy.context.window.scene=source;bpy.context.view_layer.update()
 transform=Matrix.Translation((0,-11.9,1.6775319933891297))@Matrix.Scale(2.5,4)
 for o in source.objects:
  if o.type=='MESH' and any(x in o.name for x in ['siege_low','leviers_low','tableau_']):
   data=o.data.copy();data.transform(transform@o.matrix_world)
   copy=bpy.data.objects.new('Polwo contact cutaway '+o.name,data);scene.collection.objects.link(copy)
 print(json.dumps({'scene':NAME,'objects':[o.name for o in scene.objects],'scope':'Debug cutaway only; original exterior omitted to reveal support. No body modification or runtime use.'}))
finally:
 bpy.context.window.scene=old;bpy.context.window.view_layer=layer
 for o in layer.objects:o.select_set(False)
 for o in selected:o.select_set(True)
 layer.objects.active=active
 print(json.dumps({'contextRestored':bpy.context.window.scene==old and bpy.context.view_layer.objects.active==active and set(bpy.context.selected_objects)==set(selected),'changedExistingScenes':[s.name for s,v in memberships.items() if set(s.objects)!=v]}))
